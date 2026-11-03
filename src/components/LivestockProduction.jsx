import React, { useMemo, useState } from 'react';
import {
    Area,
    Bar,
    BarChart,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    Button,
    Card,
    Field,
    Modal,
    RowAction,
    TableMessage,
    inputClass,
    tdClass,
    thClass,
} from './ModuleUI.jsx';

const GREEN = '#2D6A4F';
const DEEP = '#1B4332';
const LIGHT = '#95D5B2';
const AMBER = '#F4A261';

const day = (v) => (v ? String(v).slice(0, 10) : '');
const pad = (n) => String(n).padStart(2, '0');
const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => localISO(new Date());
const fmt = (n) => Number(Number(n).toFixed(1)).toLocaleString();
const KNOWN_UNITS = { eggs: 'eggs', milk: 'litres', wool: 'kg', honey: 'kg' };

function defaultProduct(species) {
    const s = (species || '').toLowerCase();
    if (/chicken|poultry|hen|duck|turkey|quail|layer/.test(s)) return { product: 'Eggs', unit: 'eggs' };
    if (/cattle|cow|goat|dairy/.test(s)) return { product: 'Milk', unit: 'litres' };
    if (/sheep/.test(s)) return { product: 'Wool', unit: 'kg' };
    return { product: '', unit: '' };
}

function Tile({ label, value, hint, tone }) {
    return (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-farm-100">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-farm-900 tabular-nums">{value}</p>
            {hint && <p className={`mt-0.5 text-xs ${tone || 'text-slate-500'}`}>{hint}</p>}
        </div>
    );
}

function ChartCard({ title, subtitle, children }) {
    return (
        <Card>
            <div className="p-5">
                <h3 className="text-base font-semibold text-farm-900">{title}</h3>
                {subtitle && <p className="mb-3 text-xs text-slate-500">{subtitle}</p>}
                <div className="h-64">{children}</div>
            </div>
        </Card>
    );
}

export default function LivestockProduction({ livestock, api, onRefresh }) {
    const [range, setRange] = useState(30);
    const [productKey, setProductKey] = useState('');
    const [logOpen, setLogOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState({ livestock_id: '', product: '', unit: '', quantity: '', date_recorded: today() });

    // Every production record from every animal, flattened into one list.
    const records = useMemo(
        () =>
            livestock.flatMap((a) =>
                (a.productionRecords || []).map((r) => ({
                    id: r.id,
                    animalId: a.id,
                    tag: a.tag_number,
                    species: a.species,
                    heads: a.head_count || 1,
                    product: (r.product || '').trim(),
                    key: (r.product || '').trim().toLowerCase(),
                    unit: r.unit || '',
                    qty: parseFloat(r.quantity) || 0,
                    date: day(r.date_recorded),
                }))
            ),
        [livestock]
    );

    const products = useMemo(() => {
        const m = {};
        records.forEach((r) => {
            if (!m[r.key]) m[r.key] = { key: r.key, label: r.product, unit: r.unit, count: 0 };
            m[r.key].count += 1;
        });
        return Object.values(m).sort((a, b) => b.count - a.count);
    }, [records]);

    const activeKey = productKey && products.some((p) => p.key === productKey) ? productKey : products[0]?.key || '';
    const active = products.find((p) => p.key === activeKey);

    const stats = useMemo(() => {
        if (!activeKey) return null;
        const rows = records.filter((r) => r.key === activeKey);
        const byDay = {};
        rows.forEach((r) => {
            byDay[r.date] = (byDay[r.date] || 0) + r.qty;
        });
        const headMap = {};
        rows.forEach((r) => {
            headMap[r.animalId] = r.heads;
        });
        const heads = Object.values(headMap).reduce((s, h) => s + h, 0);
        const isEggs = activeKey === 'eggs';
        const dayKey = (offset) => {
            const d = new Date();
            d.setDate(d.getDate() - offset);
            return localISO(d);
        };

        const series = [];
        for (let i = range - 1; i >= 0; i -= 1) {
            const k = dayKey(i);
            const v = byDay[k] === undefined ? null : byDay[k];
            const win = [];
            for (let j = 0; j < 7; j += 1) {
                const kk = dayKey(i + j);
                if (byDay[kk] !== undefined) win.push(byDay[kk]);
            }
            const avg = win.length ? win.reduce((s, x) => s + x, 0) / win.length : null;
            series.push({
                date: k,
                label: k.slice(5),
                total: v,
                avg: avg === null ? null : Number(avg.toFixed(1)),
                rate: isEggs && heads > 0 && v !== null ? Number(((v / heads) * 100).toFixed(1)) : null,
            });
        }

        const start = dayKey(range - 1);
        const prevStart = dayKey(2 * range - 1);
        const inRange = rows.filter((r) => r.date >= start);
        const total = inRange.reduce((s, r) => s + r.qty, 0);
        const prevTotal = rows.filter((r) => r.date < start && r.date >= prevStart).reduce((s, r) => s + r.qty, 0);
        const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;
        const loggedDays = new Set(inRange.map((r) => r.date)).size;
        const best = series.reduce((b, p) => (p.total !== null && (!b || p.total > b.total) ? p : b), null);

        const per = {};
        inRange.forEach((r) => {
            const p = per[r.animalId] || (per[r.animalId] = { id: r.animalId, tag: r.tag, species: r.species, heads: r.heads, total: 0, days: new Set(), last: '' });
            p.total += r.qty;
            p.days.add(r.date);
            if (r.date > p.last) p.last = r.date;
        });
        const animals = Object.values(per)
            .map((p) => ({ ...p, days: p.days.size }))
            .sort((a, b) => b.total - a.total);

        const log = [...inRange].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 60);
        return { series, total, prevTotal, change, loggedDays, best, animals, heads, isEggs, log };
    }, [records, activeKey, range]);

    function openLog() {
        const first = livestock.find((a) => a.status === 'Active') || livestock[0];
        setForm({
            livestock_id: first ? first.id : '',
            ...(first ? defaultProduct(first.species) : { product: '', unit: '' }),
            quantity: '',
            date_recorded: today(),
        });
        setLogOpen(true);
    }

    async function submitLog(e) {
        e.preventDefault();
        setBusy(true);
        try {
            await api.post(`/api/livestock/${form.livestock_id}/production-records`, {
                product: form.product,
                quantity: form.quantity,
                unit: form.unit,
                date_recorded: form.date_recorded,
            });
            setLogOpen(false);
            onRefresh();
        } catch (err) {
            const errors = err.response?.data?.errors;
            alert((errors && Object.values(errors)[0]?.[0]) || err.response?.data?.message || 'Could not save this record.');
        } finally {
            setBusy(false);
        }
    }

    async function removeRecord(id) {
        if (!window.confirm('Delete this production record?')) return;
        try {
            await api.delete(`/api/livestock-production-records/${id}`);
            onRefresh();
        } catch (err) {
            alert('Failed to delete the record.');
        }
    }

    const unit = active?.unit || '';
    const up = stats && stats.change !== null && stats.change >= 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                {products.length > 0 && (
                    <select className={inputClass} value={activeKey} onChange={(e) => setProductKey(e.target.value)}>
                        {products.map((p) => (
                            <option key={p.key} value={p.key}>{p.label}</option>
                        ))}
                    </select>
                )}
                <div className="flex gap-2">
                    {[7, 30, 90].map((d) => (
                        <button
                            key={d}
                            type="button"
                            onClick={() => setRange(d)}
                            className={`rounded-full px-3 py-1 text-sm transition ${
                                range === d ? 'bg-farm-700 text-white' : 'bg-farm-50 text-farm-800 hover:bg-farm-100'
                            }`}
                        >
                            {d} days
                        </button>
                    ))}
                </div>
                <div className="ml-auto">
                    <Button variant="accent" onClick={openLog}>Log production</Button>
                </div>
            </div>

            {!stats ? (
                <Card>
                    <div className="p-8 text-center text-sm text-slate-600">
                        No production logged yet. Select "Log production" to record eggs, milk or wool, and the charts will appear here.
                    </div>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <Tile label={`Total (${range} days)`} value={`${fmt(stats.total)} ${unit}`} />
                        <Tile
                            label="Change vs previous period"
                            value={stats.change === null ? 'No data yet' : `${up ? '+' : ''}${stats.change.toFixed(1)}%`}
                            hint={stats.change === null ? 'Needs an earlier period to compare' : `${fmt(stats.prevTotal)} ${unit} before`}
                            tone={stats.change === null ? '' : up ? 'text-green-700' : 'text-red-700'}
                        />
                        <Tile
                            label="Average per logged day"
                            value={stats.loggedDays ? `${fmt(stats.total / stats.loggedDays)} ${unit}` : '—'}
                            hint={`${stats.loggedDays} days logged`}
                        />
                        <Tile
                            label="Best day"
                            value={stats.best ? `${fmt(stats.best.total)} ${unit}` : '—'}
                            hint={stats.best ? stats.best.date : ''}
                        />
                    </div>

                    <ChartCard
                        title={`${active.label} production over time`}
                        subtitle="Bars are daily totals, the dark line is the 7-day average. A rising line means production is growing."
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={stats.series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="total" name={`Daily ${unit}`} fill={LIGHT} radius={[4, 4, 0, 0]} />
                                <Line dataKey="avg" name="7-day average" stroke={DEEP} strokeWidth={2.5} dot={false} connectNulls />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <div className="grid gap-6 lg:grid-cols-2">
                        {stats.isEggs && stats.heads > 0 ? (
                            <ChartCard
                                title="Laying rate"
                                subtitle={`Eggs per day as a % of ${stats.heads} birds. Poultry farmers watch this number.`}
                            >
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={stats.series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                                        <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                                        <Tooltip formatter={(v) => `${v}%`} />
                                        <Line dataKey="rate" name="Laying rate" stroke={AMBER} strokeWidth={2.5} dot={false} connectNulls />
                                    </LineChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        ) : (
                            <ChartCard title="Daily total" subtitle="Area view of the same data.">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={stats.series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Area dataKey="total" name={unit || 'Total'} stroke={GREEN} fill={LIGHT} connectNulls />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        )}

                        <ChartCard title="Top producers" subtitle={`Total ${active.label.toLowerCase()} per animal or flock in the last ${range} days.`}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.animals.slice(0, 8)} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                    <XAxis dataKey="tag" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="total" name={unit || 'Total'} fill={GREEN} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>

                    <Card>
                        <div className="border-b border-farm-100 px-5 py-4">
                            <h3 className="text-base font-semibold text-farm-900">Production by animal</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-farm-100 bg-farm-50">
                                    <tr>
                                        <th className={thClass}>Tag</th>
                                        <th className={thClass}>Species</th>
                                        <th className={thClass}>Animals</th>
                                        <th className={thClass}>Total</th>
                                        <th className={thClass}>Avg / day</th>
                                        <th className={thClass}>Per animal</th>
                                        <th className={thClass}>Last logged</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-farm-100">
                                    {stats.animals.length === 0 ? (
                                        <TableMessage colSpan={7}>Nothing logged in this period.</TableMessage>
                                    ) : (
                                        stats.animals.map((a) => (
                                            <tr key={a.id} className="transition hover:bg-farm-50">
                                                <td className="px-5 py-4 font-medium text-farm-900">{a.tag}</td>
                                                <td className={tdClass}>{a.species}</td>
                                                <td className={tdClass}>{a.heads}</td>
                                                <td className={tdClass}>{fmt(a.total)} {unit}</td>
                                                <td className={tdClass}>{fmt(a.total / a.days)}</td>
                                                <td className={tdClass}>{fmt(a.total / a.heads)}</td>
                                                <td className={tdClass}>{a.last}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card>
                        <div className="border-b border-farm-100 px-5 py-4">
                            <h3 className="text-base font-semibold text-farm-900">Production log</h3>
                            <p className="text-xs text-slate-500">Latest entries in this period</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-farm-100 bg-farm-50">
                                    <tr>
                                        <th className={thClass}>Date</th>
                                        <th className={thClass}>Animal</th>
                                        <th className={thClass}>Product</th>
                                        <th className={thClass}>Quantity</th>
                                        <th className={`${thClass} text-right`}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-farm-100">
                                    {stats.log.map((r) => (
                                        <tr key={r.id} className="transition hover:bg-farm-50">
                                            <td className={tdClass}>{r.date}</td>
                                            <td className="px-5 py-4 font-medium text-farm-900">{r.tag}</td>
                                            <td className={tdClass}>{r.product}</td>
                                            <td className={tdClass}>{fmt(r.qty)} {r.unit}</td>
                                            <td className="px-5 py-4 text-right">
                                                <RowAction tone="danger" onClick={() => removeRecord(r.id)}>Delete</RowAction>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}

            {logOpen && (
                <Modal title="Log production" onClose={() => setLogOpen(false)}>
                    <form onSubmit={submitLog} className="space-y-4">
                        <Field label="Animal or flock">
                            <select
                                className={inputClass}
                                value={form.livestock_id}
                                required
                                onChange={(e) => {
                                    const a = livestock.find((x) => String(x.id) === e.target.value);
                                    setForm({ ...form, livestock_id: e.target.value, ...(a ? defaultProduct(a.species) : {}) });
                                }}
                            >
                                {livestock.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.tag_number} · {a.species}{(a.head_count || 1) > 1 ? ` (${a.head_count})` : ''}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Product">
                                <input
                                    className={inputClass}
                                    list="production-products"
                                    value={form.product}
                                    required
                                    onChange={(e) => {
                                        const product = e.target.value;
                                        const u = KNOWN_UNITS[product.trim().toLowerCase()];
                                        setForm({ ...form, product, unit: u || form.unit });
                                    }}
                                />
                                <datalist id="production-products">
                                    <option value="Eggs" />
                                    <option value="Milk" />
                                    <option value="Wool" />
                                    <option value="Honey" />
                                </datalist>
                            </Field>
                            <Field label="Unit">
                                <input className={inputClass} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                            </Field>
                            <Field label="Quantity">
                                <input type="number" step="0.01" min="0" className={inputClass} value={form.quantity} required
                                    onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                            </Field>
                            <Field label="Collected on">
                                <input type="date" className={inputClass} value={form.date_recorded} required
                                    onChange={(e) => setForm({ ...form, date_recorded: e.target.value })} />
                            </Field>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setLogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={busy}>Save</Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
