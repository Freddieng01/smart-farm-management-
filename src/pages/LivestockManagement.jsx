import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';
import LivestockProduction from '../components/LivestockProduction.jsx';
import LivestockOverview from '../components/LivestockOverview.jsx';
import {
    Alert,
    Badge,
    Button,
    Card,
    Field,
    Modal,
    RowAction,
    TableMessage,
    inputClass,
    tdClass,
    thClass,
} from '../components/ModuleUI.jsx';

const emptyForm = {
    farm_id: '',
    tag_number: '',
    species: '',
    breed: '',
    sex: 'Male',
    birth_date: '',
    status: 'Active',
    current_weight_kg: '',
    head_count: 1,
    sire_id: '',
    dam_id: '',
};

// Typical gestation in days, used to suggest an expected birth date.
const GESTATION_DAYS = { cattle: 283, cow: 283, goat: 150, sheep: 147, pig: 114, rabbit: 31, horse: 340 };

function statusTone(status) {
    if (status === 'Active') return 'green';
    if (status === 'Sold') return 'blue';
    return 'gray';
}

const day = (v) => (v ? String(v).slice(0, 10) : '');
const pad = (n) => String(n).padStart(2, '0');
const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => localISO(new Date());
function addDays(dateStr, n) {
    const d = new Date(`${dateStr}T00:00:00`);
    d.setDate(d.getDate() + Number(n));
    return localISO(d);
}

function daysUntil(value) {
    if (!value) return null;
    const target = new Date(`${day(value)}T00:00:00`);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((target - now) / 86400000);
}

function dueInfo(value) {
    const n = daysUntil(value);
    if (n === null) return null;
    if (n < 0) return { text: `Overdue by ${-n} day${n === -1 ? '' : 's'}`, cls: 'font-medium text-red-700' };
    if (n === 0) return { text: 'Due today', cls: 'font-medium text-amber-700' };
    if (n <= 14) return { text: `Due in ${n} day${n === 1 ? '' : 's'}`, cls: 'font-medium text-amber-700' };
    return { text: `Due ${day(value)}`, cls: 'text-slate-500' };
}

// Latest shot of each vaccine; it is "overdue" if that shot's next due date has passed.
function overdueVaccines(animal) {
    const latest = {};
    (animal.vaccinations || []).forEach((v) => {
        const key = (v.vaccine_name || '').toLowerCase();
        if (!latest[key] || day(v.date_administered) > day(latest[key].date_administered)) latest[key] = v;
    });
    return Object.values(latest).filter((v) => v.next_due_date && daysUntil(v.next_due_date) < 0);
}

function ageLabel(birthDate) {
    if (!birthDate) return '—';
    const born = new Date(day(birthDate));
    if (Number.isNaN(born.getTime())) return '—';
    const now = new Date();
    let months = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth());
    if (now.getDate() < born.getDate()) months -= 1;
    if (months < 1) return `${Math.max(0, Math.floor((now - born) / 86400000))}d`;
    const years = Math.floor(months / 12);
    const rest = months % 12;
    if (years === 0) return `${rest}m`;
    return rest ? `${years}y ${rest}m` : `${years}y`;
}

function defaultProduct(species) {
    const s = (species || '').toLowerCase();
    if (/chicken|poultry|hen|duck|turkey|quail|layer/.test(s)) return { product: 'Eggs', unit: 'eggs' };
    if (/cattle|cow|goat|dairy/.test(s)) return { product: 'Milk', unit: 'litres' };
    if (/sheep/.test(s)) return { product: 'Wool', unit: 'kg' };
    return { product: '', unit: '' };
}

const KNOWN_UNITS = { eggs: 'eggs', milk: 'litres', wool: 'kg', honey: 'kg' };

function Sparkline({ points }) {
    if (points.length < 2) return null;
    const w = 320;
    const h = 70;
    const vals = points.map((p) => p.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const coords = points.map((p, i) => {
        const x = 8 + (i * (w - 16)) / (points.length - 1);
        const y = h - 8 - ((p.value - min) / span) * (h - 16);
        return `${x},${y}`;
    });
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" role="img" aria-label="Weight over time">
            <polyline points={coords.join(' ')} fill="none" stroke="currentColor" strokeWidth="2" className="text-farm-600" />
            {coords.map((c, i) => (
                <circle key={i} cx={c.split(',')[0]} cy={c.split(',')[1]} r="3" className="fill-farm-700" />
            ))}
        </svg>
    );
}

const tabs = [
    ['vaccinations', 'Vaccinations'],
    ['health', 'Health'],
    ['breeding', 'Breeding'],
    ['weight', 'Weight'],
    ['production', 'Production'],
    ['family', 'Family'],
];

function RecordsModal({ animal, herd, api, onChanged, onOpen, onClose }) {
    const [tab, setTab] = useState('vaccinations');
    const [busy, setBusy] = useState(false);
    const [vax, setVax] = useState({ vaccine_name: '', date_administered: today(), next_due_date: '' });
    const [health, setHealth] = useState({ condition: '', treatment: '', date_recorded: today(), withdrawal_days: '' });
    const [breed, setBreed] = useState({ breeding_date: today(), expected_birth_date: '', offspring_count: '' });
    const [weigh, setWeigh] = useState({ weight_kg: '', date_recorded: today() });
    const [prod, setProd] = useState(() => ({
        ...defaultProduct(animal.species),
        quantity: '',
        date_recorded: today(),
    }));

    function gestationDays() {
        const s = (animal.species || '').toLowerCase();
        const key = Object.keys(GESTATION_DAYS).find((k) => s.includes(k));
        return key ? GESTATION_DAYS[key] : null;
    }

    function suggestBirth(dateStr) {
        const g = gestationDays();
        if (!g || !dateStr) return '';
        const d = new Date(`${dateStr}T00:00:00`);
        d.setDate(d.getDate() + g);
        return localISO(d);
    }

    async function run(request, after) {
        setBusy(true);
        try {
            await request();
            if (after) after();
            await onChanged(animal.id);
        } catch (err) {
            const errors = err.response?.data?.errors;
            const first = errors ? Object.values(errors)[0]?.[0] : null;
            alert(first || err.response?.data?.message || 'Could not save this record.');
        } finally {
            setBusy(false);
        }
    }

    const remove = (path) => {
        if (window.confirm('Delete this record?')) run(() => api.delete(path));
    };

    const byDateDesc = (rows, key) => [...(rows || [])].sort((a, b) => day(b[key]).localeCompare(day(a[key])));
    const overdue = overdueVaccines(animal);
    const weights = byDateDesc(animal.weightRecords, 'date_recorded');
    const weightPoints = [...weights].reverse().map((w) => ({ value: parseFloat(w.weight_kg) }));
    const first = weights.length ? parseFloat(weights[weights.length - 1].weight_kg) : null;
    const last = weights.length ? parseFloat(weights[0].weight_kg) : null;
    let adg = null;
    if (weights.length >= 2) {
        const span = (new Date(day(weights[0].date_recorded)) - new Date(day(weights[weights.length - 1].date_recorded))) / 86400000;
        if (span > 0) adg = (last - first) / span;
    }

    const prodRecords = byDateDesc(animal.productionRecords, 'date_recorded');
    const activeProduct = prod.product || (prodRecords[0] && prodRecords[0].product) || '';
    const productKey = activeProduct.toLowerCase();
    const sumByDay = {};
    prodRecords
        .filter((r) => (r.product || '').toLowerCase() === productKey)
        .forEach((r) => {
            const k = day(r.date_recorded);
            sumByDay[k] = (sumByDay[k] || 0) + parseFloat(r.quantity);
        });
    const series = [];
    for (let i = 13; i >= 0; i -= 1) {
        const dt = new Date();
        dt.setDate(dt.getDate() - i);
        const k = localISO(dt);
        series.push({ value: sumByDay[k] || 0 });
    }
    const last7 = series.slice(-7).reduce((sum, pt) => sum + pt.value, 0);
    const avgPerDay = last7 / 7;
    const heads = animal.head_count || 1;
    const layingRate = productKey === 'eggs' && heads > 1 ? (avgPerDay / heads) * 100 : null;

    const rowClass = 'flex items-start justify-between gap-3 py-3';
    const delBtn = (path) => (
        <RowAction tone="danger" onClick={() => remove(path)}>Delete</RowAction>
    );

    return (
        <Modal title={`Animal ${animal.tag_number}`} onClose={onClose}>
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    <Badge tone={statusTone(animal.status)}>{animal.status}</Badge>
                    <span>
                        {animal.species}
                        {animal.breed ? ` · ${animal.breed}` : ''} · {animal.sex} · Age {ageLabel(animal.birth_date)}
                        {animal.current_weight_kg ? ` · ${animal.current_weight_kg} kg` : ''}
                        {(animal.head_count || 1) > 1 ? ` · ${animal.head_count} animals` : ''}
                    </span>
                </div>

                {overdue.length > 0 && (
                    <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
                        Overdue: {overdue.map((v) => v.vaccine_name).join(', ')}
                    </p>
                )}

                <div className="flex flex-wrap gap-2">
                    {tabs.map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setTab(key)}
                            className={`rounded-full px-3 py-1 text-sm transition ${
                                tab === key ? 'bg-farm-700 text-white' : 'bg-farm-50 text-farm-800 hover:bg-farm-100'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {tab === 'vaccinations' && (
                    <div className="space-y-4">
                        <form
                            className="space-y-3"
                            onSubmit={(e) => {
                                e.preventDefault();
                                run(
                                    () => api.post(`/api/livestock/${animal.id}/vaccinations`, {
                                        ...vax,
                                        next_due_date: vax.next_due_date || null,
                                    }),
                                    () => setVax({ vaccine_name: '', date_administered: today(), next_due_date: '' })
                                );
                            }}
                        >
                            <Field label="Vaccine">
                                <input className={inputClass} value={vax.vaccine_name} required
                                    placeholder="e.g. Foot and mouth, Newcastle"
                                    onChange={(e) => setVax({ ...vax, vaccine_name: e.target.value })} />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Given on">
                                    <input type="date" className={inputClass} value={vax.date_administered} required
                                        onChange={(e) => setVax({ ...vax, date_administered: e.target.value })} />
                                </Field>
                                <Field label="Next due">
                                    <input type="date" className={inputClass} value={vax.next_due_date}
                                        onChange={(e) => setVax({ ...vax, next_due_date: e.target.value })} />
                                </Field>
                            </div>
                            <Button type="submit" disabled={busy}>Add vaccination</Button>
                        </form>
                        <div className="divide-y divide-farm-100">
                            {byDateDesc(animal.vaccinations, 'date_administered').map((v) => {
                                const info = dueInfo(v.next_due_date);
                                return (
                                    <div key={v.id} className={rowClass}>
                                        <div>
                                            <p className="text-sm font-medium text-farm-900">{v.vaccine_name}</p>
                                            <p className="text-xs text-slate-500">Given {day(v.date_administered)}</p>
                                            {info && <p className={`text-xs ${info.cls}`}>{info.text}</p>}
                                        </div>
                                        {delBtn(`/api/livestock-vaccinations/${v.id}`)}
                                    </div>
                                );
                            })}
                            {(animal.vaccinations || []).length === 0 && (
                                <p className="py-3 text-sm text-slate-500">No vaccinations recorded yet.</p>
                            )}
                        </div>
                    </div>
                )}

                {tab === 'health' && (
                    <div className="space-y-4">
                        <form
                            className="space-y-3"
                            onSubmit={(e) => {
                                e.preventDefault();
                                run(
                                    () => api.post(`/api/livestock/${animal.id}/health-records`, {
                                        ...health,
                                        withdrawal_days: health.withdrawal_days === '' ? null : health.withdrawal_days,
                                    }),
                                    () => setHealth({ condition: '', treatment: '', date_recorded: today(), withdrawal_days: '' })
                                );
                            }}
                        >
                            <Field label="Condition or symptom">
                                <input className={inputClass} value={health.condition} required
                                    placeholder="e.g. Limping, mastitis, diarrhoea"
                                    onChange={(e) => setHealth({ ...health, condition: e.target.value })} />
                            </Field>
                            <Field label="Treatment given">
                                <input className={inputClass} value={health.treatment}
                                    placeholder="Medicine, dose, who treated it"
                                    onChange={(e) => setHealth({ ...health, treatment: e.target.value })} />
                            </Field>
                            <Field label="Date">
                                <input type="date" className={inputClass} value={health.date_recorded} required
                                    onChange={(e) => setHealth({ ...health, date_recorded: e.target.value })} />
                            </Field>
                            <Field label="Withdrawal period (days)">
                                <input type="number" min="0" max="365" className={inputClass} value={health.withdrawal_days}
                                    placeholder="Days before milk or meat can be sold, if any"
                                    onChange={(e) => setHealth({ ...health, withdrawal_days: e.target.value })} />
                            </Field>
                            <Button type="submit" disabled={busy}>Add health record</Button>
                        </form>
                        <div className="divide-y divide-farm-100">
                            {byDateDesc(animal.healthRecords, 'date_recorded').map((h) => (
                                <div key={h.id} className={rowClass}>
                                    <div>
                                        <p className="text-sm font-medium text-farm-900">{h.condition}</p>
                                        <p className="text-xs text-slate-500">{day(h.date_recorded)}</p>
                                        {h.treatment && <p className="text-sm text-slate-700">{h.treatment}</p>}
                                        {h.withdrawal_days > 0 && (() => {
                                            const end = addDays(day(h.date_recorded), h.withdrawal_days);
                                            return daysUntil(end) >= 0 ? (
                                                <p className="text-xs font-medium text-red-700">Withdrawal: do not sell milk or meat until {end}</p>
                                            ) : (
                                                <p className="text-xs text-slate-500">Withdrawal ended {end}</p>
                                            );
                                        })()}
                                    </div>
                                    {delBtn(`/api/livestock-health-records/${h.id}`)}
                                </div>
                            ))}
                            {(animal.healthRecords || []).length === 0 && (
                                <p className="py-3 text-sm text-slate-500">No health records yet.</p>
                            )}
                        </div>
                    </div>
                )}

                {tab === 'breeding' && (
                    <div className="space-y-4">
                        {animal.sex !== 'Female' ? (
                            <p className="text-sm text-slate-500">Breeding records can only be added to female animals.</p>
                        ) : (
                            <form
                                className="space-y-3"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    run(
                                        () => api.post(`/api/livestock/${animal.id}/breeding-records`, {
                                            breeding_date: breed.breeding_date,
                                            expected_birth_date: breed.expected_birth_date || null,
                                            offspring_count: breed.offspring_count === '' ? null : breed.offspring_count,
                                        }),
                                        () => setBreed({ breeding_date: today(), expected_birth_date: '', offspring_count: '' })
                                    );
                                }}
                            >
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Bred on">
                                        <input type="date" className={inputClass} value={breed.breeding_date} required
                                            onChange={(e) => setBreed({
                                                ...breed,
                                                breeding_date: e.target.value,
                                                expected_birth_date: suggestBirth(e.target.value),
                                            })} />
                                    </Field>
                                    <Field label="Expected birth">
                                        <input type="date" className={inputClass}
                                            value={breed.expected_birth_date || suggestBirth(breed.breeding_date)}
                                            onChange={(e) => setBreed({ ...breed, expected_birth_date: e.target.value })} />
                                    </Field>
                                </div>
                                {gestationDays() && (
                                    <p className="text-xs text-slate-500">
                                        Expected date is calculated from a typical {gestationDays()}-day gestation. You can change it.
                                    </p>
                                )}
                                <Button type="submit" disabled={busy}>Add breeding record</Button>
                            </form>
                        )}
                        <div className="divide-y divide-farm-100">
                            {byDateDesc(animal.breedingRecords, 'breeding_date').map((b) => {
                                const waiting = b.offspring_count === null || b.offspring_count === undefined;
                                const info = waiting ? dueInfo(b.expected_birth_date) : null;
                                return (
                                    <div key={b.id} className={rowClass}>
                                        <div>
                                            <p className="text-sm font-medium text-farm-900">Bred {day(b.breeding_date)}</p>
                                            <p className="text-xs text-slate-500">
                                                Expected birth {day(b.expected_birth_date) || 'not set'}
                                            </p>
                                            {waiting ? (
                                                info && <p className={`text-xs ${info.cls}`}>{info.text.replace('Due', 'Birth due')}</p>
                                            ) : (
                                                <p className="text-sm text-slate-700">Born: {b.offspring_count}</p>
                                            )}
                                        </div>
                                        <div className="space-x-3 whitespace-nowrap">
                                            {waiting && (
                                                <RowAction
                                                    onClick={() => {
                                                        const n = window.prompt('How many offspring were born?');
                                                        if (n === null || n.trim() === '') return;
                                                        run(() => api.put(`/api/livestock-breeding-records/${b.id}`, { offspring_count: n }));
                                                    }}
                                                >
                                                    Record birth
                                                </RowAction>
                                            )}
                                            {delBtn(`/api/livestock-breeding-records/${b.id}`)}
                                        </div>
                                    </div>
                                );
                            })}
                            {(animal.breedingRecords || []).length === 0 && (
                                <p className="py-3 text-sm text-slate-500">No breeding records yet.</p>
                            )}
                        </div>
                    </div>
                )}

                {tab === 'weight' && (
                    <div className="space-y-4">
                        <form
                            className="space-y-3"
                            onSubmit={(e) => {
                                e.preventDefault();
                                run(
                                    () => api.post(`/api/livestock/${animal.id}/weight-records`, weigh),
                                    () => setWeigh({ weight_kg: '', date_recorded: today() })
                                );
                            }}
                        >
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Weight (kg)">
                                    <input type="number" step="0.01" min="0" className={inputClass} value={weigh.weight_kg} required
                                        onChange={(e) => setWeigh({ ...weigh, weight_kg: e.target.value })} />
                                </Field>
                                <Field label="Weighed on">
                                    <input type="date" className={inputClass} value={weigh.date_recorded} required
                                        onChange={(e) => setWeigh({ ...weigh, date_recorded: e.target.value })} />
                                </Field>
                            </div>
                            <Button type="submit" disabled={busy}>Log weight</Button>
                        </form>
                        <Sparkline points={weightPoints} />
                        {weights.length >= 2 && (
                            <p className="text-sm text-slate-700">
                                {last >= first ? 'Gained' : 'Lost'} {Math.abs(last - first).toFixed(1)} kg since {day(weights[weights.length - 1].date_recorded)}.
                                {adg !== null && ` Average daily gain: ${adg.toFixed(2)} kg/day.`}
                            </p>
                        )}
                        <div className="divide-y divide-farm-100">
                            {weights.map((w) => (
                                <div key={w.id} className={rowClass}>
                                    <p className="text-sm text-farm-900">
                                        <span className="font-medium">{w.weight_kg} kg</span>
                                        <span className="ml-3 text-xs text-slate-500">{day(w.date_recorded)}</span>
                                    </p>
                                    {delBtn(`/api/livestock-weight-records/${w.id}`)}
                                </div>
                            ))}
                            {weights.length === 0 && <p className="py-3 text-sm text-slate-500">No weigh-ins yet.</p>}
                        </div>
                    </div>
                )}

                {tab === 'production' && (
                    <div className="space-y-4">
                        <form
                            className="space-y-3"
                            onSubmit={(e) => {
                                e.preventDefault();
                                run(
                                    () => api.post(`/api/livestock/${animal.id}/production-records`, prod),
                                    () => setProd({ ...prod, quantity: '' })
                                );
                            }}
                        >
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Product">
                                    <input className={inputClass} list="livestock-products" value={prod.product} required
                                        placeholder="Eggs, Milk, Wool..."
                                        onChange={(e) => {
                                            const product = e.target.value;
                                            const unit = KNOWN_UNITS[product.trim().toLowerCase()];
                                            setProd({ ...prod, product, unit: unit || prod.unit });
                                        }} />
                                    <datalist id="livestock-products">
                                        <option value="Eggs" />
                                        <option value="Milk" />
                                        <option value="Wool" />
                                        <option value="Honey" />
                                    </datalist>
                                </Field>
                                <Field label="Unit">
                                    <input className={inputClass} value={prod.unit}
                                        placeholder="eggs, litres, kg"
                                        onChange={(e) => setProd({ ...prod, unit: e.target.value })} />
                                </Field>
                                <Field label="Quantity">
                                    <input type="number" step="0.01" min="0" className={inputClass} value={prod.quantity} required
                                        onChange={(e) => setProd({ ...prod, quantity: e.target.value })} />
                                </Field>
                                <Field label="Collected on">
                                    <input type="date" className={inputClass} value={prod.date_recorded} required
                                        onChange={(e) => setProd({ ...prod, date_recorded: e.target.value })} />
                                </Field>
                            </div>
                            <Button type="submit" disabled={busy}>Log production</Button>
                        </form>

                        {activeProduct && last7 > 0 && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl bg-farm-50 px-4 py-3">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">Last 7 days</p>
                                    <p className="mt-1 text-lg font-semibold text-farm-900">
                                        {Number(last7.toFixed(1))} {prod.unit || ''}
                                    </p>
                                    <p className="text-xs text-slate-500">{avgPerDay.toFixed(1)} per day</p>
                                </div>
                                {layingRate !== null && (
                                    <div className="rounded-xl bg-farm-50 px-4 py-3">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Laying rate</p>
                                        <p className="mt-1 text-lg font-semibold text-farm-900">{layingRate.toFixed(0)}%</p>
                                        <p className="text-xs text-slate-500">of {heads} birds, per day</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {last7 > 0 && <Sparkline points={series} />}

                        <div className="divide-y divide-farm-100">
                            {prodRecords.map((r) => (
                                <div key={r.id} className={rowClass}>
                                    <p className="text-sm text-farm-900">
                                        <span className="font-medium">{Number(r.quantity)} {r.unit || ''}</span>
                                        <span className="ml-2 text-slate-700">{r.product}</span>
                                        <span className="ml-3 text-xs text-slate-500">{day(r.date_recorded)}</span>
                                    </p>
                                    {delBtn(`/api/livestock-production-records/${r.id}`)}
                                </div>
                            ))}
                            {prodRecords.length === 0 && (
                                <p className="py-3 text-sm text-slate-500">Nothing logged yet.</p>
                            )}
                        </div>
                    </div>
                )}

                {tab === 'family' && (() => {
                    const sire = herd.find((a) => a.id === animal.sire_id);
                    const dam = herd.find((a) => a.id === animal.dam_id);
                    const offspring = herd.filter((a) => a.sire_id === animal.id || a.dam_id === animal.id);
                    const parent = (label, p) => (
                        <div className="flex items-center justify-between rounded-xl bg-farm-50 px-4 py-3">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                                <p className="mt-1 text-sm font-medium text-farm-900">
                                    {p ? `${p.tag_number} · ${p.breed || p.species}` : 'Not recorded'}
                                </p>
                            </div>
                            {p && <RowAction onClick={() => onOpen(p.id)}>Open</RowAction>}
                        </div>
                    );
                    return (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {parent('Sire (father)', sire)}
                                {parent('Dam (mother)', dam)}
                            </div>
                            <p className="text-xs text-slate-500">Set parents from Edit on the main list.</p>
                            <p className="text-sm font-medium text-farm-900">Offspring ({offspring.length})</p>
                            <div className="divide-y divide-farm-100">
                                {offspring.map((o) => (
                                    <div key={o.id} className={rowClass}>
                                        <div>
                                            <p className="text-sm font-medium text-farm-900">{o.tag_number}</p>
                                            <p className="text-xs text-slate-500">
                                                {o.species}{o.breed ? ` · ${o.breed}` : ''} · {o.sex} · Age {ageLabel(o.birth_date)} · {o.status}
                                            </p>
                                        </div>
                                        <RowAction onClick={() => onOpen(o.id)}>Open</RowAction>
                                    </div>
                                ))}
                                {offspring.length === 0 && <p className="py-3 text-sm text-slate-500">No offspring recorded for this animal.</p>}
                            </div>
                        </div>
                    );
                })()}

                <div className="mt-6 flex justify-end">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            </div>
        </Modal>
    );
}

export default function LivestockManagement() {
    const { api } = useAuth();
    const [livestock, setLivestock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAnimal, setEditingAnimal] = useState(null);
    const [recordsId, setRecordsId] = useState(null);
    const [view, setView] = useState('animals');
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        fetchLivestock();
    }, []);

    async function fetchLivestock() {
        setLoading(true);
        try {
            const response = await api.get('/api/livestock');
            setLivestock(response.data.data ?? response.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch livestock records.');
        } finally {
            setLoading(false);
        }
    }

    // Reload one animal (with its records) after a record is added or removed.
    async function refreshAnimal(id) {
        try {
            const response = await api.get(`/api/livestock/${id}`);
            const fresh = response.data.data ?? response.data;
            setLivestock((list) => list.map((a) => (a.id === id ? fresh : a)));
        } catch (err) {
            fetchLivestock();
        }
    }

    function handleOpenModal(animal = null) {
        if (animal) {
            setEditingAnimal(animal);
            setForm({
                farm_id: animal.farm_id,
                tag_number: animal.tag_number,
                species: animal.species,
                breed: animal.breed || '',
                sex: animal.sex,
                birth_date: day(animal.birth_date),
                status: animal.status,
                current_weight_kg: animal.current_weight_kg || '',
                head_count: animal.head_count || 1,
                sire_id: animal.sire_id || '',
                dam_id: animal.dam_id || '',
            });
        } else {
            setEditingAnimal(null);
            setForm(emptyForm);
        }
        setIsModalOpen(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const payload = { ...form, sire_id: form.sire_id || null, dam_id: form.dam_id || null };
        try {
            if (editingAnimal) {
                await api.put(`/api/livestock/${editingAnimal.id}`, payload);
            } else {
                await api.post('/api/livestock', payload);
            }
            setIsModalOpen(false);
            fetchLivestock();
        } catch (err) {
            alert(err.response?.data?.message || 'An error occurred while saving the animal.');
        }
    }

    async function handleDelete(id) {
        if (window.confirm('Are you sure you want to delete this animal record? This will also remove its vaccination, health, and breeding history.')) {
            try {
                await api.delete(`/api/livestock/${id}`);
                fetchLivestock();
            } catch (err) {
                alert('Failed to delete livestock record.');
            }
        }
    }

    const recordsAnimal = livestock.find((a) => a.id === recordsId);
    const needAttention = livestock.filter((a) => a.status === 'Active' && overdueVaccines(a).length > 0);

    return (
        <ModuleLayout
            title="Livestock"
            subtitle="Register animals and keep track of their vaccinations, health and breeding."
            actions={
                <div className="flex flex-wrap items-center gap-3">
                    {[['animals', 'Animals'], ['overview', 'Herd overview'], ['production', 'Production']].map(([key, label]) => (
                        <Button key={key} variant={view === key ? undefined : 'secondary'} onClick={() => setView(key)}>
                            {label}
                        </Button>
                    ))}
                    <Button variant="accent" onClick={() => handleOpenModal()}>
                        Add animal
                    </Button>
                </div>
            }
        >
            {error && <Alert>{error}</Alert>}

            {view === 'overview' && <LivestockOverview livestock={livestock} onOpen={setRecordsId} />}

            {view === 'production' && (
                <LivestockProduction livestock={livestock} api={api} onRefresh={() => fetchLivestock()} />
            )}

            {view === 'animals' && (
                <>
            {needAttention.length > 0 && (
                <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Overdue vaccinations: {needAttention.map((a) => a.tag_number).join(', ')}. Open an animal's Records to see which.
                </p>
            )}

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-farm-100 bg-farm-50">
                            <tr>
                                <th className={thClass}>Tag number</th>
                                <th className={thClass}>Species</th>
                                <th className={thClass}>Breed</th>
                                <th className={thClass}>Sex</th>
                                <th className={thClass}>Status</th>
                                <th className={thClass}>Weight (kg)</th>
                                <th className={`${thClass} text-right`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-farm-100">
                            {loading ? (
                                <TableMessage colSpan={7}>Loading livestock...</TableMessage>
                            ) : livestock.length === 0 ? (
                                <TableMessage colSpan={7}>
                                    No animals yet. Select "Add animal" to register your first one.
                                </TableMessage>
                            ) : (
                                livestock.map((animal) => (
                                    <tr key={animal.id} className="transition hover:bg-farm-50">
                                        <td className="px-5 py-4 font-medium text-farm-900">
                                            {animal.tag_number}
                                            {(animal.head_count || 1) > 1 && (
                                                <span className="ml-2 text-xs font-normal text-slate-500">×{animal.head_count}</span>
                                            )}
                                        </td>
                                        <td className={tdClass}>{animal.species}</td>
                                        <td className={tdClass}>{animal.breed || 'Not set'}</td>
                                        <td className={tdClass}>{animal.sex}</td>
                                        <td className="px-5 py-4">
                                            <Badge tone={statusTone(animal.status)}>{animal.status}</Badge>
                                        </td>
                                        <td className={tdClass}>{animal.current_weight_kg || '—'}</td>
                                        <td className="space-x-3 px-5 py-4 text-right">
                                            <RowAction onClick={() => setRecordsId(animal.id)}>Records</RowAction>
                                            <RowAction onClick={() => handleOpenModal(animal)}>Edit</RowAction>
                                            <RowAction tone="danger" onClick={() => handleDelete(animal.id)}>
                                                Delete
                                            </RowAction>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

                </>
            )}

            {recordsAnimal && (
                <RecordsModal
                    key={recordsAnimal.id}
                    animal={recordsAnimal}
                    herd={livestock}
                    api={api}
                    onChanged={refreshAnimal}
                    onOpen={setRecordsId}
                    onClose={() => setRecordsId(null)}
                />
            )}

            {isModalOpen && (
                <Modal
                    title={editingAnimal ? 'Edit animal' : 'Register new animal'}
                    onClose={() => setIsModalOpen(false)}
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Field label="Farm ID">
                            <input
                                type="number"
                                className={inputClass}
                                value={form.farm_id}
                                onChange={(e) => setForm({ ...form, farm_id: e.target.value })}
                                required
                            />
                        </Field>
                        <Field label="Tag number">
                            <input
                                className={inputClass}
                                value={form.tag_number}
                                onChange={(e) => setForm({ ...form, tag_number: e.target.value })}
                                required
                            />
                        </Field>
                        <Field label="Species">
                            <input
                                className={inputClass}
                                placeholder="e.g. Cattle, Goat, Poultry"
                                value={form.species}
                                onChange={(e) => setForm({ ...form, species: e.target.value })}
                                required
                            />
                        </Field>
                        <Field label="Breed">
                            <input
                                className={inputClass}
                                value={form.breed}
                                onChange={(e) => setForm({ ...form, breed: e.target.value })}
                            />
                        </Field>
                        <Field label="Sex">
                            <select
                                className={inputClass}
                                value={form.sex}
                                onChange={(e) => setForm({ ...form, sex: e.target.value })}
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </Field>
                        <Field label="Birth date">
                            <input
                                type="date"
                                className={inputClass}
                                value={form.birth_date}
                                onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                            />
                        </Field>
                        <Field label="Status">
                            <select
                                className={inputClass}
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                            >
                                <option value="Active">Active</option>
                                <option value="Sold">Sold</option>
                                <option value="Deceased">Deceased</option>
                            </select>
                        </Field>
                        <Field label="Current weight (kg)">
                            <input
                                type="number"
                                step="0.01"
                                className={inputClass}
                                value={form.current_weight_kg}
                                onChange={(e) => setForm({ ...form, current_weight_kg: e.target.value })}
                            />
                        </Field>

                        <Field label="Sire (father)">
                            <select
                                className={inputClass}
                                value={form.sire_id}
                                onChange={(e) => setForm({ ...form, sire_id: e.target.value })}
                            >
                                <option value="">Not recorded</option>
                                {livestock
                                    .filter((a) => a.sex === 'Male' && (!editingAnimal || a.id !== editingAnimal.id))
                                    .map((a) => (
                                        <option key={a.id} value={a.id}>{a.tag_number} · {a.species}</option>
                                    ))}
                            </select>
                        </Field>
                        <Field label="Dam (mother)">
                            <select
                                className={inputClass}
                                value={form.dam_id}
                                onChange={(e) => setForm({ ...form, dam_id: e.target.value })}
                            >
                                <option value="">Not recorded</option>
                                {livestock
                                    .filter((a) => a.sex === 'Female' && (!editingAnimal || a.id !== editingAnimal.id))
                                    .map((a) => (
                                        <option key={a.id} value={a.id}>{a.tag_number} · {a.species}</option>
                                    ))}
                            </select>
                        </Field>
                        <Field label="Number of animals">
                            <input
                                type="number"
                                min="1"
                                className={inputClass}
                                value={form.head_count}
                                onChange={(e) => setForm({ ...form, head_count: e.target.value })}
                                required
                            />
                            <p className="mt-1 text-xs text-slate-500">
                                Leave as 1 for a single animal. For a flock, e.g. 200 chickens under one tag, enter the total.
                            </p>
                        </Field>

                        <div className="mt-6 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                {editingAnimal ? 'Save changes' : 'Register animal'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </ModuleLayout>
    );
}
