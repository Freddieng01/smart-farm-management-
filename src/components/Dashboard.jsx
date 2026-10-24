import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import WeatherWidget from './WeatherWidget.jsx';
import MapWidget from './MapWidget.jsx';

const initialSummary = {
    infrastructure: {
        farms: 0,
        fields: 0,
        active_users: 0,
        total_acreage: 0,
    },
    financials: {
        total_expenses: 0,
        total_labor_cost: 0,
        total_outflow: 0,
    },
    production: {
        total_quantity: 0,
        yield_records: 0,
    },
};

export default function Dashboard() {
    const { api, user, logout } = useAuth();
    const navigate = useNavigate();

    const [summary, setSummary] = useState(initialSummary);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [farmId, setFarmId] = useState(null);

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
                        infrastructure: {
                            ...initialSummary.infrastructure,
                            ...(data.infrastructure || {}),
                        },
                        financials: {
                            ...initialSummary.financials,
                            ...(data.financials || {}),
                        },
                        production: {
                            ...initialSummary.production,
                            ...(data.production || {}),
                        },
                    });

                    if (data.infrastructure?.farms > 0) {
                        const farmRes = await api.get('/api/farms');
                        setFarmId(
                            farmRes.data.data?.[0]?.id || null
                        );
                    }
                }
            } catch {
                if (!ignore) {
                    setError(
                        'Dashboard summary could not be loaded.'
                    );
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

    const cards = [
        {
            label: 'Total Farms',
            value: summary.infrastructure.farms,
            roles: [
                'Admin',
                'Farm-owner',
                'Manager',
                'Accountant',
                'Agronomist',
                'Worker',
            ],
        },
        {
            label: 'Total Fields',
            value: summary.infrastructure.fields,
            roles: [
                'Admin',
                'Farm-owner',
                'Manager',
                'Accountant',
                'Agronomist',
                'Worker',
            ],
        },
        {
            label: 'Total Acreage',
            value: summary.infrastructure.total_acreage,
            roles: [
                'Admin',
                'Farm-owner',
                'Manager',
                'Accountant',
                'Agronomist',
                'Worker',
            ],
        },
        {
            label: 'Active Users',
            value: summary.infrastructure.active_users,
            roles: [
                'Admin',
                'Farm-owner',
                'Manager',
                'Accountant',
            ],
        },
        {
            label: 'Total Expenses',
            value: summary.financials.total_expenses,
            roles: ['Admin', 'Accountant'],
        },
        {
            label: 'Labour Costs',
            value: summary.financials.total_labor_cost,
            roles: ['Admin', 'Manager', 'Accountant'],
        },
        {
            label: 'Total Production',
            value: summary.production.total_quantity,
            roles: [
                'Admin',
                'Farm-owner',
                'Manager',
                'Agronomist',
                'Worker',
            ],
        },
        {
            label: 'Yield Records',
            value: summary.production.yield_records,
            roles: [
                'Admin',
                'Farm-owner',
                'Manager',
                'Agronomist',
                'Worker',
            ],
        },
    ].filter((card) => card.roles.includes(user?.role));

    const actions = [
        {
            label: 'Manage Farms',
            path: '/farms',
            roles: [
                'Admin',
                'Farm-owner',
                'Manager',
                'Agronomist',
            ],
        },
        {
            label: 'Livestock Management',
            path: '/livestock',
            roles: [
                'Admin',
                'Manager',
                'Agronomist',
                'Worker',
            ],
        },
        {
            label: 'Notifications',
            path: '/notifications',
            roles: [
                'Admin',
                'Manager',
                'Accountant',
                'Agronomist',
                'Worker',
            ],
        },
        {
            label: 'Suppliers & Procurement',
            path: '/suppliers',
            roles: [
                'Admin',
                'Farm-owner',
                'Manager',
                'Accountant',
            ],
        },
        {
            label: 'Market & Sales',
            path: '/sales',
            roles: [
                'Admin',
                'Farm-owner',
                'Manager',
                'Accountant',
            ],
        },
        {
            label: 'Manage Employees',
            path: '/employees',
            roles: [
                'Admin',
                'Farm-owner',
                'Manager',
            ],
        },
        {
            label: 'Task Tracking',
            path: '/tasks',
            roles: [
                'Admin',
                'Farm-owner',
                'Manager',
                'Agronomist',
                'Worker',
            ],
        },
        {
            label: 'Production Logs',
            path: '/production',
            roles: [
                'Admin',
                'Farm-owner',
                'Manager',
                'Agronomist',
            ],
        },
        {
            label: 'Crop Management',
            path: '/crops',
            roles: [
                'Admin',
                'Manager',
                'Agronomist',
                'Worker',
            ],
        },
        {
            label: 'Planting Management',
            path: '/plantings',
            roles: [
                'Admin',
                'Manager',
                'Agronomist',
                'Worker',
            ],
        },
        {
            label: 'Crop Monitoring',
            path: '/crop-monitoring',
            roles: [
                'Admin',
                'Manager',
                'Agronomist',
                'Worker',
            ],
        },
        {
            label: 'Irrigation Schedules',
            path: '/irrigation-schedules',
            roles: [
                'Admin',
                'Manager',
                'Agronomist',
                'Worker',
            ],
        },
        {
            label: 'Pest & Disease',
            path: '/pest-disease',
            roles: [
                'Admin',
                'Manager',
                'Agronomist',
                'Worker',
            ],
        },
        {
            label: 'Weather',
            path: '/weather',
            roles: [
                'Admin',
                'Manager',
                'Agronomist',
                'Worker',
            ],
        },
        {
            label: 'Harvest Management',
            path: '/harvest',
            roles: [
                'Admin',
                'Manager',
                'Agronomist',
                'Worker',
            ],
        },
        {
            label: 'Yield Records',
            path: '/yield-records',
            roles: [
                'Admin',
                'Manager',
                'Agronomist',
                'Worker',
            ],
        },
        {
            label: 'Post-Harvest Handling',
            path: '/post-harvest-handling',
            roles: [
                'Admin',
                'Manager',
                'Agronomist',
                'Worker',
            ],
        },
        {
            label: 'Expense Tracking',
            path: '/expenses',
            roles: [
                'Admin',
                'Farm-owner',
                'Manager',
                'Accountant',
            ],
        },
        {
            label: 'Inventory & Inputs',
            path: '/inventory',
            roles: [
                'Admin',
                'Farm-owner',
                'Manager',
                'Agronomist',
                'Worker',
            ],
        },
        {
            label: 'Equipment & Machinery',
            path: '/equipment',
            roles: [
                'Admin',
                'Farm-owner',
                'Manager',
                'Worker',
            ],
        },
        {
            label: 'Financial Management',
            path: '/finance',
            roles: [
                'Admin',
                'Farm-owner',
                'Accountant',
            ],
        },
        {
            label: 'Reports & Analytics',
            path: '/reports',
            roles: [
                'Admin',
                'Farm-owner',
                'Manager',
                'Accountant',
            ],
        },
        {
            label: 'Manage Users',
            path: '/users',
            roles: ['Admin'],
        },
    ].filter((action) => action.roles.includes(user?.role));

    return (
        <main className="min-h-screen bg-[#f7faf7]">
            {/* Dashboard header */}
            <header className="border-b border-[#dfe9de] bg-white">
                <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#4d7a39]">
                            AgriCore Intelligence Core Dashboard
                        </p>

                        <h1 className="mt-1 text-xl font-semibold text-[#172316]">
                            Farm Operations
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-medium text-[#172316]">
                                {user?.name}
                            </p>

                            <p className="text-xs text-[#647260]">
                                {user?.role}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={logout}
                            className="rounded-md border border-[#cbd8ca] px-3 py-2 text-sm font-medium text-[#243322] transition hover:bg-[#eef5ee]"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Dashboard content */}
            <section className="px-4 py-6 sm:px-6 lg:py-8">
                {error && (
                    <p
                        role="alert"
                        className="mb-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800"
                    >
                        {error}
                    </p>
                )}

                {/* Summary cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {cards.map((card) => (
                        <article
                            key={card.label}
                            className="rounded-lg border border-[#dfe9de] bg-white p-5 shadow-sm"
                        >
                            <p className="text-sm font-medium text-[#647260]">
                                {card.label}
                            </p>

                            <p className="mt-3 text-3xl font-semibold text-[#172316]">
                                {loading
                                    ? '...'
                                    : Number(
                                          card.value ?? 0
                                      ).toLocaleString()}
                            </p>
                        </article>
                    ))}
                </div>

                {/* Dashboard tools */}
                <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">

                    {/* Quick Actions */}
                    <section className="rounded-lg border border-[#dfe9de] bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
                        <h2 className="mb-4 text-lg font-semibold text-[#172316]">
                            Quick Actions
                        </h2>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {actions.map((action) => (
                                <button
                                    key={action.path}
                                    type="button"
                                    onClick={() =>
                                        navigate(action.path)
                                    }
                                    className="flex items-center justify-between rounded-md border border-[#e3ebe2] p-3 text-left text-sm font-medium text-[#243322] transition hover:border-[#4d7a39] hover:bg-[#fcfdfc]"
                                >
                                    <span>{action.label}</span>

                                    <span
                                        aria-hidden="true"
                                        className="ml-3 text-xs text-[#647260]"
                                    >
                                        →
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* System Status */}
                    <section className="rounded-lg border border-[#dfe9de] bg-white p-5 shadow-sm sm:p-6">
                        <h2 className="mb-4 text-lg font-semibold text-[#172316]">
                            System Status
                        </h2>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-[#647260]">
                                    System Health
                                </span>

                                <span className="flex items-center gap-2 font-medium text-green-600">
                                    <span className="h-2 w-2 rounded-full bg-green-600" />
                                    Online
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-[#647260]">
                                    Logged-in Role
                                </span>

                                <span className="font-medium text-[#172316]">
                                    {user?.role || 'Unknown'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-[#647260]">
                                    Farm Selected
                                </span>

                                <span className="font-medium text-[#172316]">
                                    {farmId
                                        ? `Farm #${farmId}`
                                        : 'None'}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Geographic Overview */}
                    <section className="rounded-lg border border-[#dfe9de] bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
                        <h2 className="mb-4 text-lg font-semibold text-[#172316]">
                            Farm Geographic Overview
                        </h2>

                        <MapWidget farmId={farmId} />
                    </section>

                    {/* Weather Intelligence */}
                    <section className="rounded-lg border border-[#dfe9de] bg-white p-5 shadow-sm sm:p-6">
                        <h2 className="mb-4 text-lg font-semibold text-[#172316]">
                            Intelligence
                        </h2>

                        <WeatherWidget farmId={farmId} />
                    </section>
                </div>
            </section>
        </main>
    );
}