import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import WeatherWidget from './WeatherWidget.jsx';
import MapWidget from './MapWidget.jsx';
import FarmScene from './FarmScene.jsx';

const initialSummary = {
    infrastructure: { farms: 0, fields: 0, active_users: 0, total_acreage: 0 },
    financials: { total_expenses: 0, total_labor_cost: 0, total_outflow: 0 },
    production: { total_quantity: 0, yield_records: 0 },
};

const actionIcons = {
    '/farms': '🚜',
    '/livestock': '🐄',
    '/notifications': '🔔',
    '/suppliers': '📦',
    '/sales': '🛒',
    '/storage': '🏭',
    '/employees': '🧑‍🌾',
    '/tasks': '✅',
    '/production': '🌽',
    '/expenses': '🧾',
    '/users': '🔐',
    '/crops': '🌿',
    '/plantings': '🌱',
    '/crop-monitoring': '🔍',
    '/irrigation-schedules': '💧',
    '/pest-disease': '🐛',
    '/weather': '⛅',
    '/harvest': '🧺',
    '/yield-records': '📈',
    '/post-harvest-handling': '🍎',
    '/inventory': '🗃️',
    '/equipment': '🔧',
    '/finance': '💰',
    '/reports': '📊',
};

// The hero sky changes with the time of day.
function getSky(hour) {
    if (hour < 5) {
        return { greeting: 'Burning the midnight oil', gradient: 'from-slate-900 via-slate-800 to-farm-900', body: 'moon', night: true };
    }
    if (hour < 8) {
        return { greeting: 'Good morning', gradient: 'from-indigo-900 via-orange-400 to-amber-200', body: 'sun', night: false };
    }
    if (hour < 12) {
        return { greeting: 'Good morning', gradient: 'from-sky-600 via-sky-400 to-sky-200', body: 'sun', night: false };
    }
    if (hour < 17) {
        return { greeting: 'Good afternoon', gradient: 'from-sky-600 via-sky-400 to-sky-200', body: 'sun', night: false };
    }
    if (hour < 20) {
        return { greeting: 'Good evening', gradient: 'from-indigo-900 via-rose-500 to-amber-300', body: 'sun', night: false };
    }
    return { greeting: 'Good evening', gradient: 'from-slate-900 via-slate-800 to-farm-900', body: 'moon', night: true };
}

function AnimatedNumber({ value, loading }) {
    const target = Number(value ?? 0);
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        if (loading || !Number.isFinite(target)) return undefined;

        let frame;
        const start = performance.now();
        const duration = 900;

        const tick = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(target * eased);
            if (t < 1) frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [target, loading]);

    if (loading) return <span className="animate-pulse text-farm-300">···</span>;
    if (!Number.isFinite(target)) return <span>{String(value)}</span>;

    const shown = Number.isInteger(target) ? Math.round(display) : display;
    return <span>{shown.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>;
}

function Panel({ title, className = '', children }) {
    return (
        <div className={`overflow-hidden rounded-2xl border border-farm-100 bg-white shadow-card ${className}`}>
            <div className="h-1 bg-gradient-to-r from-farm-500 via-harvest-400 to-farm-300" />
            <div className="p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-farm-900">
                    <span className="h-2 w-2 rounded-full bg-harvest-500" />
                    {title}
                </h2>
                {children}
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { api, user, logout } = useAuth();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(initialSummary);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [farmId, setFarmId] = useState(null);

    const now = new Date();
    const sky = getSky(now.getHours());
    const today = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    const firstName = (user?.name || 'there').split(' ')[0];

    useEffect(() => {
        let ignore = false;

        async function loadSummary() {
            setLoading(true);
            setError(null);

            try {
                const response = await api.get('/api/dashboard/summary');

                if (!ignore) {
                    const data = response.data.data || {};

                    setSummary({
                        ...initialSummary,
                        ...data,
                        infrastructure: { ...initialSummary.infrastructure, ...(data.infrastructure || {}) },
                        financials: { ...initialSummary.financials, ...(data.financials || {}) },
                        production: { ...initialSummary.production, ...(data.production || {}) },
                    });

                    if (data.infrastructure?.farms > 0) {
                        const farmRes = await api.get('/api/farms');
                        setFarmId(farmRes.data.data?.[0]?.id || null);
                    }
                }
            } catch {
                if (!ignore) {
                    setError('Dashboard summary could not be loaded.');
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        }

        loadSummary();

        return () => {
            ignore = true;
        };
    }, [api]);

    const farmCount = summary.infrastructure?.farms ?? 0;
    const fieldCount = summary.infrastructure?.fields ?? 0;

    let subtitle = 'Checking on the farm…';
    if (!loading) {
        subtitle =
            farmCount > 0
                ? `Keeping an eye on ${farmCount} farm${farmCount === 1 ? '' : 's'} and ${fieldCount} field${fieldCount === 1 ? '' : 's'}.`
                : 'Let’s get your first farm set up.';
    }

    const cards = [
        { label: 'Total Farms', icon: '🏡', tint: 'bg-farm-100', bar: 'bg-farm-500', value: summary.infrastructure?.farms, roles: ['Admin', 'Manager', 'Accountant', 'Agronomist', 'Worker', 'Farm-owner'] },
        { label: 'Total Fields', icon: '🌱', tint: 'bg-farm-100', bar: 'bg-farm-400', value: summary.infrastructure?.fields, roles: ['Admin', 'Manager', 'Accountant', 'Agronomist', 'Worker', 'Farm-owner'] },
        { label: 'Total Acreage', icon: '📐', tint: 'bg-farm-100', bar: 'bg-farm-600', value: summary.infrastructure?.total_acreage, roles: ['Admin', 'Manager', 'Accountant', 'Agronomist', 'Worker', 'Farm-owner'] },
        { label: 'Active Users', icon: '👥', tint: 'bg-farm-100', bar: 'bg-farm-300', value: summary.infrastructure?.active_users, roles: ['Admin', 'Farm-owner', 'Manager', 'Accountant'] },
        { label: 'Total Expenses', icon: '💸', tint: 'bg-harvest-100', bar: 'bg-harvest-500', value: summary.financials?.total_expenses, roles: ['Admin', 'Accountant'] },
        { label: 'Labour Costs', icon: '👷', tint: 'bg-harvest-100', bar: 'bg-harvest-400', value: summary.financials?.total_labor_cost, roles: ['Admin', 'Manager', 'Accountant'] },
        { label: 'Total Production', icon: '🌾', tint: 'bg-harvest-100', bar: 'bg-harvest-600', value: summary.production?.total_quantity, roles: ['Admin', 'Manager', 'Agronomist', 'Worker', 'Farm-owner'] },
        { label: 'Yield Records', icon: '📈', tint: 'bg-harvest-100', bar: 'bg-harvest-500', value: summary.production?.yield_records, roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
    ].filter(card => card.roles.includes(user?.role));

    const actions = [
        { label: 'Manage Farms', path: '/farms', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist'] },
        { label: 'Livestock Management', path: '/livestock', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Notifications', path: '/notifications', roles: ['Admin', 'Farm-owner', 'Manager', 'Accountant', 'Agronomist', 'Worker'] },
        { label: 'Suppliers & Procurement', path: '/suppliers', roles: ['Admin', 'Farm-owner', 'Manager', 'Accountant'] },
        { label: 'Market & Sales', path: '/sales', roles: ['Admin', 'Farm-owner', 'Manager', 'Accountant'] },
        { label: 'Storage & Post-Harvest', path: '/storage', roles: ['Admin', 'Farm-owner', 'Manager', 'Accountant', 'Agronomist', 'Worker'] },
        { label: 'Manage Employees', path: '/employees', roles: ['Admin', 'Farm-owner', 'Manager'] },
        { label: 'Task Tracking', path: '/tasks', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Production Logs', path: '/production', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist'] },
        { label: 'Crop Management', path: '/crops', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Planting Management', path: '/plantings', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Crop Monitoring', path: '/crop-monitoring', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Irrigation Schedules', path: '/irrigation-schedules', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Pest & Disease', path: '/pest-disease', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Weather', path: '/weather', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Harvest Management', path: '/harvest', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Yield Records', path: '/yield-records', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Post-Harvest Handling', path: '/post-harvest-handling', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Expense Tracking', path: '/expenses', roles: ['Admin', 'Farm-owner', 'Manager', 'Accountant'] },
        { label: 'Inventory & Inputs', path: '/inventory', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Equipment & Machinery', path: '/equipment', roles: ['Admin', 'Farm-owner', 'Manager', 'Worker'] },
        { label: 'Financial Management', path: '/finance', roles: ['Admin', 'Farm-owner', 'Accountant'] },
        { label: 'Reports & Analytics', path: '/reports', roles: ['Admin', 'Farm-owner', 'Manager', 'Accountant'] },
        { label: 'Manage Users', path: '/users', roles: ['Admin'] },
    ].filter(action => action.roles.includes(user?.role));

    return (
        <main className="min-h-screen bg-farm-50">
            <header className={`relative overflow-hidden bg-gradient-to-b ${sky.gradient} text-white`}>
                <FarmScene sky={sky} />

                <div className="relative mx-auto max-w-7xl px-6 pb-28 pt-6">
                    <div className="flex items-start justify-between gap-4">
                        <p className="text-sm font-medium tracking-wide text-white/80">
                            AgriCore Intelligence Core Dashboard
                        </p>

                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-sm font-medium">{user?.name}</p>
                                <span className="inline-block rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium backdrop-blur">
                                    {user?.role}
                                </span>
                            </div>
                            <button
                                className="rounded-md border border-white/40 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                                type="button"
                                onClick={logout}
                            >
                                Logout
                            </button>
                        </div>
                    </div>

                    <div className="mt-8">
                        <p className="text-sm text-white/80">{today}</p>
                        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
                            {sky.greeting}, {firstName} 👋
                        </h1>
                        <p className="mt-2 max-w-xl text-white/90">{subtitle}</p>
                    </div>
                </div>
            </header>

            <section className="relative z-10 mx-auto -mt-14 max-w-7xl px-6 pb-12">
                {error && <p className="mb-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {cards.map((card, i) => (
                        <article
                            key={card.label}
                            className="relative animate-rise overflow-hidden rounded-2xl border border-farm-100 bg-white p-5 shadow-card transition duration-200 hover:-translate-y-1 motion-reduce:animate-none"
                            style={{ animationDelay: `${i * 70}ms` }}
                        >
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-farm-600">{card.label}</p>
                                <span className={`grid h-11 w-11 place-items-center rounded-xl text-xl ${card.tint}`} aria-hidden="true">
                                    {card.icon}
                                </span>
                            </div>
                            <p className="mt-3 text-3xl font-bold text-farm-900">
                                <AnimatedNumber value={card.value} loading={loading} />
                            </p>
                            <span className={`absolute inset-x-0 bottom-0 h-1 ${card.bar}`} />
                        </article>
                    ))}
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-3">
                    <Panel title="Farm Geographic Overview" className="lg:col-span-2">
                        <MapWidget farmId={farmId} />
                    </Panel>

                    <div className="space-y-6">
                        <Panel title="Intelligence">
                            <WeatherWidget farmId={farmId} />
                        </Panel>

                        <Panel title="System Status">
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-farm-600">System Health</span>
                                    <span className="flex items-center gap-2 font-medium text-farm-500">
                                        <span className="h-2 w-2 rounded-full bg-farm-500" />
                                        Online
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-farm-600">Logged-in Role</span>
                                    <span className="font-medium text-farm-900">{user?.role || 'Unknown'}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-farm-600">Farm Selected</span>
                                    <span className="font-medium text-farm-900">{farmId ? `Farm #${farmId}` : 'None'}</span>
                                </div>
                            </div>
                        </Panel>
                    </div>
                </div>

                <Panel title="Quick Actions" className="mt-8">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                        {actions.map(action => (
                            <button
                                key={action.path}
                                type="button"
                                onClick={() => navigate(action.path)}
                                className="group flex flex-col items-start gap-3 rounded-xl border border-farm-100 bg-farm-50/60 p-4 text-left transition hover:-translate-y-0.5 hover:border-harvest-400 hover:bg-white hover:shadow-card"
                            >
                                <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-xl shadow-sm transition group-hover:bg-harvest-100">
                                    {actionIcons[action.path] || '📋'}
                                </span>
                                <span className="text-sm font-semibold text-farm-800">{action.label}</span>
                            </button>
                        ))}
                    </div>
                </Panel>
            </section>
        </main>
    );
}
