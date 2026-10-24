import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const input = 'rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20';
const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const label = (s) => s.replace(/_/g, ' ');

function Card({ title, value, tone }) {
    return (
        <article className="rounded-lg border border-[#dfe9de] bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-[#647260]">{title}</p>
            <p className={`mt-2 text-2xl font-semibold ${tone || 'text-[#172316]'}`}>{value}</p>
        </article>
    );
}

function Breakdown({ title, data }) {
    const entries = Object.entries(data || {});
    return (
        <div className="rounded-lg border border-[#dfe9de] bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-base font-semibold text-[#172316]">{title}</h3>
            {entries.length === 0 ? <p className="text-sm text-[#647260]">No records.</p> : (
                <ul className="divide-y divide-[#dfe9de] text-sm">
                    {entries.map(([k, v]) => (
                        <li key={k} className="flex justify-between py-2">
                            <span className="capitalize text-[#647260]">{label(k)}</span>
                            <span className="font-medium text-[#172316]">{money(v)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function ReportsAnalytics() {
    const { api } = useAuth();
    const [farms, setFarms] = useState([]);
    const [farmId, setFarmId] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [summary, setSummary] = useState(null);
    const [pl, setPl] = useState(null);
    const [perHa, setPerHa] = useState(null);
    const [bva, setBva] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.get('/api/farms')
            .then((r) => {
                setFarms(r.data.data);
                if (r.data.data.length) setFarmId(String(r.data.data[0].id));
            })
            .catch(() => setError('Failed to load farms.'));
    }, [api]);

    const load = useCallback(async () => {
        if (!farmId) return;
        setLoading(true);
        setError(null);
        const params = { farm_id: farmId };
        if (from) params.from = from;
        if (to) params.to = to;
        try {
            const [s, p, h, b] = await Promise.all([
                api.get('/api/finance/summary', { params }),
                api.get('/api/finance/profit-loss', { params }),
                api.get('/api/finance/cost-per-hectare', { params }),
                api.get('/api/finance/budget-vs-actual', { params: { farm_id: farmId } }),
            ]);
            setSummary(s.data.data);
            setPl(p.data.data);
            setPerHa(h.data);
            setBva(b.data.data);
        } catch (err) {
            const errors = err.response?.data?.errors;
            setError(errors ? Object.values(errors).flat().join(' ') : 'Failed to load reports.');
        } finally {
            setLoading(false);
        }
    }, [api, farmId, from, to]);

    useEffect(() => { load(); }, [load]);

    return (
        <main className="min-h-screen bg-[#f7faf7] px-6 py-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-[#172316]">Reports &amp; Analytics</h1>
                    <p className="text-sm text-[#647260]">Profit and loss, cost per hectare, inventory value and budget performance.</p>
                </div>

                <div className="mb-6 flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs font-medium text-[#647260]">Farm</label>
                        <select className={input} value={farmId} onChange={(e) => setFarmId(e.target.value)}>
                            {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[#647260]">From</label>
                        <input type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[#647260]">To</label>
                        <input type="date" className={input} value={to} onChange={(e) => setTo(e.target.value)} />
                    </div>
                    <button className="rounded-md border border-[#cbd8ca] px-3 py-2 text-sm text-[#647260] hover:bg-white"
                        onClick={() => { setFrom(''); setTo(''); }}>Clear dates</button>
                </div>

                {error && <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
                {loading && <p className="mb-4 text-sm text-[#647260]">Loading reports...</p>}

                {summary && (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <Card title="Total income" value={money(summary.total_income)} />
                            <Card title="Total expenses" value={money(summary.total_expenses)} />
                            <Card title="Net profit" value={money(summary.net_profit)}
                                tone={summary.net_profit < 0 ? 'text-red-700' : 'text-green-700'} />
                            <Card title="Inventory value" value={money(summary.inventory_value)} />
                        </div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                            <Card title="Low-stock items" value={summary.low_stock_count} />
                            <Card title="Expiring soon" value={summary.expiring_soon_count} />
                            <Card title="Expired" value={summary.expired_count} />
                        </div>
                    </>
                )}

                {pl && (
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <Breakdown title="Income by category" data={pl.income_by_category} />
                        <Breakdown title="Expenses by category" data={pl.expense_by_category} />
                    </div>
                )}

                {perHa && (
                    <div className="mt-6 rounded-lg border border-[#dfe9de] bg-white p-5 shadow-sm">
                        <h3 className="mb-2 text-base font-semibold text-[#172316]">Production cost per hectare</h3>
                        {perHa.data?.cost_per_hectare != null ? (
                            <p className="text-sm text-[#647260]">
                                <span className="text-2xl font-semibold text-[#172316]">{money(perHa.data.cost_per_hectare)}</span> per ha
                                {' '}({money(perHa.data.total_cost)} over {perHa.data.size_hectares} ha)
                            </p>
                        ) : (
                            <p className="text-sm text-[#647260]">{perHa.message || 'Not available.'}</p>
                        )}
                    </div>
                )}

                <div className="mt-6 overflow-x-auto rounded-lg border border-[#dfe9de] bg-white shadow-sm">
                    <h3 className="px-5 pt-5 text-base font-semibold text-[#172316]">Budget vs actual</h3>
                    <table className="mt-3 w-full text-left text-sm">
                        <thead className="bg-[#fcfdfc] uppercase text-[#647260]"><tr>
                            <th className="px-5 py-3 font-medium">Category</th>
                            <th className="px-5 py-3 font-medium">Period</th>
                            <th className="px-5 py-3 font-medium">Planned</th>
                            <th className="px-5 py-3 font-medium">Actual</th>
                            <th className="px-5 py-3 font-medium">Variance</th>
                        </tr></thead>
                        <tbody className="divide-y divide-[#dfe9de]">
                            {bva.length === 0 ? (
                                <tr><td colSpan="5" className="px-5 py-8 text-center text-[#647260]">No budgets for this farm.</td></tr>
                            ) : bva.map((r) => (
                                <tr key={r.budget_id}>
                                    <td className="px-5 py-3 capitalize text-[#172316]">{label(r.category)}</td>
                                    <td className="px-5 py-3 text-[#647260]">{r.period_start} → {r.period_end}</td>
                                    <td className="px-5 py-3">{money(r.planned_amount)}</td>
                                    <td className="px-5 py-3">{money(r.actual_amount)}</td>
                                    <td className={`px-5 py-3 font-medium ${r.variance < 0 ? 'text-red-700' : 'text-green-700'}`}>
                                        {money(r.variance)} {r.variance < 0 ? '(over)' : '(under)'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}
