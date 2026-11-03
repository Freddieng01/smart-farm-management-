import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, RowAction, TableMessage, tdClass, thClass } from './ModuleUI.jsx';

const day = (v) => (v ? String(v).slice(0, 10) : '');
const pad = (n) => String(n).padStart(2, '0');
const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function daysUntil(value) {
    if (!value) return null;
    const target = new Date(`${day(value)}T00:00:00`);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((target - now) / 86400000);
}

function addDays(dateStr, n) {
    const d = new Date(`${dateStr}T00:00:00`);
    d.setDate(d.getDate() + Number(n));
    return localISO(d);
}

function ageMonths(birthDate) {
    if (!birthDate) return null;
    const born = new Date(day(birthDate));
    if (Number.isNaN(born.getTime())) return null;
    const now = new Date();
    let m = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth());
    if (now.getDate() < born.getDate()) m -= 1;
    return Math.max(0, m);
}

function Tile({ label, value, hint, tone }) {
    return (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-farm-100">
            <p className="text-sm text-slate-500">{label}</p>
            <p className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${tone || 'text-farm-900'}`}>{value}</p>
            {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
        </div>
    );
}

export default function LivestockOverview({ livestock, onOpen }) {
    const data = useMemo(() => {
        const active = livestock.filter((a) => a.status === 'Active');
        const heads = (a) => a.head_count || 1;

        const speciesMap = {};
        active.forEach((a) => {
            speciesMap[a.species] = (speciesMap[a.species] || 0) + heads(a);
        });
        const species = Object.entries(speciesMap)
            .map(([name, count]) => ({ name, count }))
            .sort((x, y) => y.count - x.count);

        const buckets = { 'Under 6m': 0, '6-12m': 0, '1-2y': 0, '2y+': 0, Unknown: 0 };
        active.forEach((a) => {
            const m = ageMonths(a.birth_date);
            const key = m === null ? 'Unknown' : m < 6 ? 'Under 6m' : m < 12 ? '6-12m' : m < 24 ? '1-2y' : '2y+';
            buckets[key] += heads(a);
        });
        const ages = Object.entries(buckets).filter(([, v]) => v > 0).map(([name, count]) => ({ name, count }));

        const items = [];
        active.forEach((a) => {
            // Vaccinations: latest shot of each vaccine, due within 14 days or overdue
            const latest = {};
            (a.vaccinations || []).forEach((v) => {
                const k = (v.vaccine_name || '').toLowerCase();
                if (!latest[k] || day(v.date_administered) > day(latest[k].date_administered)) latest[k] = v;
            });
            Object.values(latest).forEach((v) => {
                const d = daysUntil(v.next_due_date);
                if (v.next_due_date && d <= 14) {
                    items.push({ id: a.id, tag: a.tag_number, type: 'Vaccination', what: v.vaccine_name, date: day(v.next_due_date), days: d });
                }
            });
            // Births due
            (a.breedingRecords || []).forEach((b) => {
                const open = b.offspring_count === null || b.offspring_count === undefined;
                const d = daysUntil(b.expected_birth_date);
                if (open && b.expected_birth_date && d >= -14 && d <= 30) {
                    items.push({ id: a.id, tag: a.tag_number, type: 'Birth due', what: 'Expected birth', date: day(b.expected_birth_date), days: d });
                }
            });
            // Active treatment withdrawals
            (a.healthRecords || []).forEach((h) => {
                if (h.withdrawal_days > 0) {
                    const end = addDays(day(h.date_recorded), h.withdrawal_days);
                    const d = daysUntil(end);
                    if (d >= 0) items.push({ id: a.id, tag: a.tag_number, type: 'Withdrawal', what: `${h.condition}: do not sell milk or meat`, date: end, days: d });
                }
            });
        });
        items.sort((x, y) => x.days - y.days);

        return {
            totalHeads: active.reduce((s, a) => s + heads(a), 0),
            females: active.filter((a) => a.sex === 'Female').reduce((s, a) => s + heads(a), 0),
            speciesCount: species.length,
            species,
            ages,
            items,
            overdue: items.filter((i) => i.type === 'Vaccination' && i.days < 0).length,
            withdrawals: items.filter((i) => i.type === 'Withdrawal').length,
            births: items.filter((i) => i.type === 'Birth due').length,
        };
    }, [livestock]);

    const statusText = (i) => {
        if (i.days < 0) return { t: `Overdue by ${-i.days} day${i.days === -1 ? '' : 's'}`, c: 'font-medium text-red-700' };
        if (i.days === 0) return { t: 'Today', c: 'font-medium text-amber-700' };
        return { t: `In ${i.days} day${i.days === 1 ? '' : 's'}`, c: i.type === 'Withdrawal' ? 'font-medium text-red-700' : 'text-amber-700' };
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <Tile label="Animals" value={data.totalHeads} hint="Active, flocks counted by head" />
                <Tile label="Species" value={data.speciesCount} />
                <Tile label="Females" value={data.females} />
                <Tile label="Overdue shots" value={data.overdue} tone={data.overdue ? 'text-red-700' : ''} />
                <Tile label="Births due" value={data.births} hint="Next 30 days" />
                <Tile label="In withdrawal" value={data.withdrawals} tone={data.withdrawals ? 'text-red-700' : ''} hint="Not for sale" />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <div className="p-5">
                        <h3 className="text-base font-semibold text-farm-900">Herd by species</h3>
                        <p className="mb-3 text-xs text-slate-500">Head count of active animals</p>
                        <div className="h-60">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.species} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Animals" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="p-5">
                        <h3 className="text-base font-semibold text-farm-900">Age groups</h3>
                        <p className="mb-3 text-xs text-slate-500">Active animals by age</p>
                        <div className="h-60">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.ages} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Animals" fill="#95D5B2" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </Card>
            </div>

            <Card>
                <div className="border-b border-farm-100 px-5 py-4">
                    <h3 className="text-base font-semibold text-farm-900">Needs attention</h3>
                    <p className="text-xs text-slate-500">Vaccinations due or overdue, births coming up, and treatment withdrawals</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-farm-100 bg-farm-50">
                            <tr>
                                <th className={thClass}>Animal</th>
                                <th className={thClass}>Type</th>
                                <th className={thClass}>Details</th>
                                <th className={thClass}>Date</th>
                                <th className={thClass}>Status</th>
                                <th className={`${thClass} text-right`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-farm-100">
                            {data.items.length === 0 ? (
                                <TableMessage colSpan={6}>All clear. Nothing needs attention right now.</TableMessage>
                            ) : (
                                data.items.map((i, idx) => {
                                    const st = statusText(i);
                                    return (
                                        <tr key={`${i.id}-${i.type}-${idx}`} className="transition hover:bg-farm-50">
                                            <td className="px-5 py-4 font-medium text-farm-900">{i.tag}</td>
                                            <td className={tdClass}>{i.type}</td>
                                            <td className={tdClass}>{i.what}</td>
                                            <td className={tdClass}>{i.date}</td>
                                            <td className={`px-5 py-4 ${st.c}`}>{st.t}</td>
                                            <td className="px-5 py-4 text-right">
                                                <RowAction onClick={() => onOpen(i.id)}>Open records</RowAction>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
