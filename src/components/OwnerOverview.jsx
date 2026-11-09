import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from './Icon.jsx';
import { money } from '../utils/currency.js';

const softShadow = 'shadow-[0_2px_16px_rgba(15,60,35,0.07)]';
const select =
    'rounded-full border border-farm-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20';

const label = (s) => String(s || '').replace(/_/g, ' ');

// K1.2M, K45k, K980  (used on the chart axis and tight spaces)
function compact(n) {
    const v = Number(n || 0);
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `K${(v / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
    if (abs >= 1_000) return `K${(v / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
    return `K${Math.round(v)}`;
}

function Panel({ title, action, className = '', children }) {
    return (
        <section className={`rounded-3xl bg-white ${softShadow} ${className}`}>
            <div className="flex items-center justify-between gap-3 px-6 pt-5">
                <h2 className="text-base font-semibold text-farm-900">{title}</h2>
                {action}
            </div>
            <div className="p-6 pt-4">{children}</div>
        </section>
    );
}

/** "+12.5% vs 2025". `goodWhenUp` decides whether an increase is green or red. */
function Change({ pct, year, goodWhenUp = true, hasData }) {
    if (!hasData) return <p className="mt-1 text-xs text-slate-400">No {year} figures to compare</p>;
    if (pct == null) return <p className="mt-1 text-xs text-slate-400">Nothing to compare with in {year}</p>;
    if (pct === 0) return <p className="mt-1 text-xs text-slate-500">Same as {year}</p>;

    const up = pct > 0;
    const good = up === goodWhenUp;
    return (
        <p className={`mt-1 text-xs font-medium ${good ? 'text-farm-600' : 'text-red-600'}`}>
            {up ? '▲' : '▼'} {Math.abs(pct).toLocaleString(undefined, { maximumFractionDigits: 1 })}%
            <span className="font-normal text-slate-400"> vs {year}</span>
        </p>
    );
}

function Kpi({ icon, tone, title, value, valueClass = 'text-farm-900', children }) {
    return (
        <div className={`rounded-2xl bg-white p-5 ${softShadow}`}>
            <span className={`grid h-10 w-10 place-items-center rounded-full ${tone}`}>
                <Icon name={icon} className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm text-slate-500">{title}</p>
            <p className={`mt-0.5 text-2xl font-semibold tracking-tight tabular-nums ${valueClass}`}>{value}</p>
            {children}
        </div>
    );
}

/** The one-line answer to "did I make money this year?" */
function Verdict({ data }) {
    const { summary, period } = data;
    const when = period.is_current_year ? `so far in ${period.year}` : `in ${period.year}`;

    if (summary.status === 'no_data') {
        return (
            <div className={`rounded-3xl bg-white p-6 ${softShadow}`}>
                <p className="text-lg font-semibold text-farm-900">No figures for {period.year} yet</p>
                <p className="mt-1 text-sm text-slate-500">
                    Once income and expenses are recorded for {period.year}, your profit or loss will show here.
                </p>
            </div>
        );
    }

    const isLoss = summary.status === 'loss';
    const isEven = summary.status === 'break_even';
    const tone = isLoss ? 'bg-red-50 text-red-900' : 'bg-farm-100 text-farm-900';
    const accent = isLoss ? 'text-red-700' : 'text-farm-700';

    let headline = `You made a profit of ${money(summary.net_profit)} ${when}`;
    let detail = summary.profit_margin != null
        ? `That is about K${Math.round(summary.profit_margin)} profit for every K100 you earned.`
        : '';
    if (isLoss) {
        headline = `You are running at a loss of ${money(Math.abs(summary.net_profit))} ${when}`;
        detail = `Your costs (${money(summary.expenses)}) are higher than your income (${money(summary.income)}).`;
    }
    if (isEven) {
        headline = `You broke even ${when}`;
        detail = 'Income and expenses are exactly equal.';
    }

    return (
        <div className={`rounded-3xl p-6 ${tone} ${softShadow}`}>
            <p className={`text-xl font-semibold tracking-tight sm:text-2xl ${accent}`}>{headline}</p>
            {detail && <p className="mt-1 text-sm opacity-80">{detail}</p>}
        </div>
    );
}

/** Income vs expenses for every month, as plain SVG bars (no chart library needed). */
function MonthlyChart({ months }) {
    const W = 720;
    const H = 260;
    const left = 52;
    const right = 8;
    const top = 12;
    const bottom = 28;
    const plotW = W - left - right;
    const plotH = H - top - bottom;

    const highest = Math.max(1000, ...months.flatMap((m) => [m.income, m.expenses]));
    // four equal steps up to a tidy top value (1, 2, 2.5, 5 or 10 times a power of ten)
    const rawStep = highest / 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep);
    const ceiling = step * 4;
    const y = (v) => top + plotH - (v / ceiling) * plotH;

    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * ceiling);
    const group = plotW / months.length;
    const barW = group * 0.3;

    return (
        <div>
            <div className="mb-3 flex flex-wrap gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-farm-500" />Income</span>
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-harvest-400" />Expenses</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Income and expenses by month">
                {ticks.map((t) => (
                    <g key={t}>
                        <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} stroke="#dcefdc" strokeWidth="1" />
                        <text x={left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">{compact(t)}</text>
                    </g>
                ))}
                {months.map((m, i) => {
                    const x = left + i * group;
                    return (
                        <g key={m.month}>
                            <rect x={x + group * 0.16} y={y(m.income)} width={barW} height={Math.max(0, top + plotH - y(m.income))} rx="3" fill="#3f8541" />
                            <rect x={x + group * 0.54} y={y(m.expenses)} width={barW} height={Math.max(0, top + plotH - y(m.expenses))} rx="3" fill="#f5b932" />
                            <text x={x + group / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#64748b">{m.label}</text>
                            <rect x={x} y={top} width={group} height={plotH} fill="transparent">
                                <title>{`${m.label}: income ${money(m.income)}, expenses ${money(m.expenses)}, ${m.profit < 0 ? 'loss' : 'profit'} ${money(Math.abs(m.profit))}`}</title>
                            </rect>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

function Breakdown({ title, rows, barClass, empty }) {
    return (
        <Panel title={title}>
            {rows.length === 0 ? (
                <p className="text-sm text-slate-500">{empty}</p>
            ) : (
                <ul className="space-y-4">
                    {rows.map((row) => (
                        <li key={row.category}>
                            <div className="flex items-baseline justify-between gap-3 text-sm">
                                <span className="capitalize text-slate-600">{label(row.category)}</span>
                                <span className="font-medium tabular-nums text-farm-900">
                                    {money(row.amount)} <span className="font-normal text-slate-400">({row.share}%)</span>
                                </span>
                            </div>
                            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-farm-50">
                                <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.min(100, row.share)}%` }} />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}

function Stat({ title, value, note, tone = 'text-farm-900' }) {
    return (
        <div className={`rounded-2xl bg-white p-5 ${softShadow}`}>
            <p className="text-sm text-slate-500">{title}</p>
            <p className={`mt-1 text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
            {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
        </div>
    );
}

function BudgetPanel({ budget, year }) {
    if (!budget) {
        return (
            <Panel title="Budget" className="h-full">
                <p className="text-sm text-slate-500">No budgets have been set for {year}.</p>
            </Panel>
        );
    }

    const used = budget.planned > 0 ? (budget.actual / budget.planned) * 100 : 0;
    const over = budget.variance < 0;

    return (
        <Panel title="Spending vs budget" className="h-full">
            <p className="text-sm text-slate-500">
                You planned to spend <span className="font-medium text-farm-900">{money(budget.planned)}</span> and have spent{' '}
                <span className="font-medium text-farm-900">{money(budget.actual)}</span>.
            </p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-farm-50">
                <div
                    className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-farm-500'}`}
                    style={{ width: `${Math.min(100, used)}%` }}
                />
            </div>
            <p className={`mt-2 text-sm font-medium ${over ? 'text-red-700' : 'text-farm-700'}`}>
                {over
                    ? `${money(Math.abs(budget.variance))} over budget`
                    : `${money(budget.variance)} still within budget`}
            </p>

            {budget.over_budget.length > 0 && (
                <div className="mt-4 border-t border-farm-100 pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Biggest overspends</p>
                    <ul className="mt-2 space-y-1.5 text-sm">
                        {budget.over_budget.map((o, i) => (
                            <li key={`${o.category}-${o.farm}-${i}`} className="flex justify-between gap-3">
                                <span className="capitalize text-slate-600">{label(o.category)}</span>
                                <span className="font-medium tabular-nums text-red-700">+{money(o.overspend)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Panel>
    );
}

export default function OwnerOverview({ onOpenDetails }) {
    const { api } = useAuth();
    const [farms, setFarms] = useState([]);
    const [farmId, setFarmId] = useState('');
    const [year, setYear] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.get('/api/farms')
            .then((r) => setFarms(r.data.data || []))
            .catch(() => setFarms([]));
    }, [api]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const params = {};
        if (year) params.year = year;
        if (farmId) params.farm_id = farmId;

        try {
            const res = await api.get('/api/owner/overview', { params });
            setData(res.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Your business overview could not be loaded.');
        } finally {
            setLoading(false);
        }
    }, [api, year, farmId]);

    useEffect(() => { load(); }, [load]);

    const controls = (
        <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-500">
                Year
                <select className={select} value={year || data?.period.year || ''} onChange={(e) => setYear(e.target.value)}>
                    {(data?.available_years || [new Date().getFullYear()]).map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </label>
            {farms.length > 1 && (
                <label className="flex items-center gap-2 text-sm text-slate-500">
                    Farm
                    <select className={select} value={farmId} onChange={(e) => setFarmId(e.target.value)}>
                        <option value="">All my farms</option>
                        {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                </label>
            )}
        </div>
    );

    if (error) {
        return (
            <div className="space-y-4">
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
                <button type="button" onClick={load} className="rounded-full bg-farm-700 px-5 py-2 text-sm font-medium text-white hover:bg-farm-800">
                    Try again
                </button>
            </div>
        );
    }

    if (!data) {
        return <p className={`rounded-3xl bg-white p-6 text-sm text-slate-500 ${softShadow}`}>Loading your business overview…</p>;
    }

    const { summary, previous, financing, owed, at_a_glance: glance, period } = data;
    const profitTone = summary.net_profit < 0 ? 'text-red-700' : 'text-farm-900';
    const moneyTone = 'bg-harvest-50 text-harvest-600';
    const farmTone = 'bg-farm-50 text-farm-700';
    const hasFinancing = financing.loans_received > 0 || financing.loan_repayments > 0;
    const herd = Object.entries(glance.livestock_by_species || {})
        .map(([species, count]) => `${count} ${species}`)
        .join(' · ');

    return (
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-farm-900">
                        Business overview{data.farm ? ` · ${data.farm.name}` : ''}
                    </h2>
                    <p className="text-sm text-slate-500">
                        {period.year} (1 Jan – 31 Dec) · all amounts in kwacha
                    </p>
                </div>
                {controls}
            </div>

            <Verdict data={data} />

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Kpi icon="banknote" tone={farmTone} title="Total income" value={money(summary.income)}>
                    <Change pct={previous.income_change_pct} year={previous.year} hasData={previous.has_data} />
                </Kpi>
                <Kpi icon="receipt" tone={moneyTone} title="Total expenses" value={money(summary.expenses)}>
                    <Change pct={previous.expenses_change_pct} year={previous.year} goodWhenUp={false} hasData={previous.has_data} />
                </Kpi>
                <Kpi
                    icon="trend"
                    tone={summary.net_profit < 0 ? 'bg-red-50 text-red-700' : farmTone}
                    title={summary.net_profit < 0 ? 'Net loss' : 'Net profit'}
                    value={money(summary.net_profit)}
                    valueClass={profitTone}
                >
                    {previous.has_data ? (
                        <p className="mt-1 text-xs text-slate-400">
                            {previous.year}: {money(previous.net_profit)}
                        </p>
                    ) : (
                        <p className="mt-1 text-xs text-slate-400">No {previous.year} figures to compare</p>
                    )}
                </Kpi>
                <Kpi
                    icon="chart"
                    tone={farmTone}
                    title="Profit margin"
                    value={summary.profit_margin == null ? '–' : `${summary.profit_margin}%`}
                    valueClass={summary.profit_margin != null && summary.profit_margin < 0 ? 'text-red-700' : 'text-farm-900'}
                >
                    <p className="mt-1 text-xs text-slate-400">Profit as a share of income</p>
                </Kpi>
            </div>

            <Panel
                title="Income and expenses by month"
                action={onOpenDetails && (
                    <button type="button" onClick={onOpenDetails} className="text-sm font-medium text-farm-700 hover:underline">
                        Detailed reports →
                    </button>
                )}
            >
                <MonthlyChart months={data.monthly} />
            </Panel>

            <div className="grid gap-6 md:grid-cols-2">
                <Breakdown
                    title="Where the money comes from"
                    rows={data.income_by_category}
                    barClass="bg-farm-500"
                    empty="No income recorded for this year."
                />
                <Breakdown
                    title="Where the money goes"
                    rows={data.expense_by_category}
                    barClass="bg-harvest-400"
                    empty="No expenses recorded for this year."
                />
            </div>

            {!data.farm && data.farms.length > 0 && (
                <Panel title="How each farm is doing">
                    <div className="-mx-2 overflow-x-auto px-2">
                        <table className="w-full min-w-[560px] text-left text-sm">
                            <thead className="text-xs text-slate-400">
                                <tr>
                                    <th className="pb-2 font-medium">Farm</th>
                                    <th className="pb-2 text-right font-medium">Income</th>
                                    <th className="pb-2 text-right font-medium">Expenses</th>
                                    <th className="pb-2 text-right font-medium">Profit / loss</th>
                                    <th className="pb-2 text-right font-medium">Cost per hectare</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-farm-100">
                                {data.farms.map((f) => (
                                    <tr key={f.id}>
                                        <td className="py-3 font-medium text-farm-900">{f.name}</td>
                                        <td className="py-3 text-right tabular-nums">{money(f.income)}</td>
                                        <td className="py-3 text-right tabular-nums">{money(f.expenses)}</td>
                                        <td className={`py-3 text-right font-medium tabular-nums ${f.profit < 0 ? 'text-red-700' : 'text-farm-700'}`}>
                                            {money(f.profit)}
                                        </td>
                                        <td className="py-3 text-right tabular-nums text-slate-500">
                                            {f.cost_per_hectare == null ? '–' : money(f.cost_per_hectare)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                    <Stat
                        title="Customers still owe you"
                        value={money(owed.receivable)}
                        tone={owed.receivable_overdue > 0 ? 'text-harvest-600' : 'text-farm-900'}
                        note={owed.receivable_overdue > 0 ? `${money(owed.receivable_overdue)} is past its due date` : 'Unpaid invoices, as of today'}
                    />
                    <Stat
                        title="You owe suppliers"
                        value={money(owed.payable)}
                        note="Delivered orders not yet paid in full"
                    />
                    <Stat
                        title="Stock and inputs on hand"
                        value={money(owed.inventory_value)}
                        note="Value of inventory today"
                    />
                    <Stat
                        title="Loans this year"
                        value={hasFinancing ? money(financing.net) : money(0)}
                        tone={financing.net < 0 ? 'text-harvest-600' : 'text-farm-900'}
                        note={hasFinancing
                            ? `${money(financing.loans_received)} received, ${money(financing.loan_repayments)} repaid. Not counted in profit.`
                            : 'No loans received or repaid'}
                    />
                </div>
                <BudgetPanel budget={data.budget} year={period.year} />
            </div>

            <Panel title="Your farm business at a glance">
                <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    <div>
                        <dt className="flex items-center gap-2 text-slate-500"><Icon name="farm" className="h-4 w-4" />Farms</dt>
                        <dd className="mt-1 text-xl font-semibold tabular-nums text-farm-900">{glance.farms}</dd>
                    </div>
                    <div>
                        <dt className="flex items-center gap-2 text-slate-500"><Icon name="area" className="h-4 w-4" />Land (acres)</dt>
                        <dd className="mt-1 text-xl font-semibold tabular-nums text-farm-900">
                            {Number(glance.acres).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </dd>
                    </div>
                    <div>
                        <dt className="flex items-center gap-2 text-slate-500"><Icon name="users" className="h-4 w-4" />Employees</dt>
                        <dd className="mt-1 text-xl font-semibold tabular-nums text-farm-900">{glance.employees}</dd>
                    </div>
                    <div>
                        <dt className="flex items-center gap-2 text-slate-500"><Icon name="paw" className="h-4 w-4" />Livestock</dt>
                        <dd className="mt-1 text-xl font-semibold tabular-nums text-farm-900">{glance.livestock_total}</dd>
                        {herd && <p className="mt-0.5 text-xs text-slate-400">{herd}</p>}
                    </div>
                </dl>
            </Panel>
        </div>
    );
}
