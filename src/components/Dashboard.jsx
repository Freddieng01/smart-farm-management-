import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

const initialSummary = {
    farms: 0,
    fields: 0,
    active_users: 0,
};

export default function Dashboard() {
    const { api, user, logout } = useAuth();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(initialSummary);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let ignore = false;

        async function loadSummary() {
            setLoading(true);
            setError(null);

            try {
                const response = await api.get('/api/dashboard/summary');

                if (!ignore) {
                    setSummary(response.data.data || initialSummary);
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

    const cards = [
        { label: 'Farms', value: summary.farms, roles: ['Admin', 'Manager', 'Accountant', 'Agronomist', 'Worker'] },
        { label: 'Fields', value: summary.fields, roles: ['Admin', 'Manager', 'Accountant', 'Agronomist', 'Worker'] },
        { label: 'Active Users', value: summary.active_users, roles: ['Admin', 'Manager', 'Accountant'] },
    ].filter(card => card.roles.includes(user?.role));

    const actions = [
        { label: 'Manage Farms', path: '/farms', roles: ['Admin', 'Manager', 'Agronomist'] },
        { label: 'Manage Employees', path: '/employees', roles: ['Admin', 'Manager'] },
        { label: 'Task Tracking', path: '/tasks', roles: ['Admin', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Production Logs', path: '/production', roles: ['Admin', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Expense Tracking', path: '/expenses', roles: ['Admin', 'Accountant'] },
        { label: 'Manage Users', path: '/users', roles: ['Admin'] },
    ].filter(action => action.roles.includes(user?.role));

    return (
        <main className="min-h-screen bg-[#f7faf7]">
            <header className="border-b border-[#dfe9de] bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#4d7a39]">FFMS Core Dashboard</p>
                        <h1 className="mt-1 text-xl font-semibold text-[#172316]">Farm Operations</h1>
                    </div>


                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-medium text-[#172316]">{user?.name}</p>
                            <p className="text-xs text-[#647260]">{user?.role}</p>
                        </div>
                        <button
                            className="rounded-md border border-[#cbd8ca] px-3 py-2 text-sm font-medium text-[#243322] transition hover:bg-[#eef5ee]"
                            type="button"
                            onClick={logout}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <section className="mx-auto max-w-7xl px-6 py-8">
                {error && <p className="mb-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

                <div className="grid gap-4 sm:grid-cols-3">
                    {cards.map((card) => (
                        <article className="rounded-lg border border-[#dfe9de] bg-white p-5 shadow-sm" key={card.label}>
                            <p className="text-sm font-medium text-[#647260]">{card.label}</p>
                            <p className="mt-3 text-3xl font-semibold text-[#172316]">
                                {loading ? '...' : card.value.toLocaleString()}
                            </p>
                        </article>
                    ))}
                </div>

                <div className="mt-8 grid gap-6 md:grid-cols-3">
                    <div className="md:col-span-2 rounded-lg border border-[#dfe9de] bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-lg font-semibold text-[#172316]">Quick Actions</h2>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {actions.map(action => (
                                <button
                                    key={action.path}
                                    onClick={() => navigate(action.path)}
                                    className="flex items-center justify-between rounded-md border border-[#e3ebe2] p-3 text-sm font-medium text-[#243322] transition hover:bg-[#fcfdfc] hover:border-[#4d7a39]"
                                >
                                    {action.label}
                                    <span className="text-xs text-[#647260]">→</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-lg border border-[#dfe9de] bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-lg font-semibold text-[#172316]">Status</h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-[#647260]">System Health</span>
                                <span className="flex items-center gap-1.5 font-medium text-green-600">
                                    <span className="h-2 w-2 rounded-full bg-green-600"></span>
                                    Online
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-[#647260]">Role</span>
                                <span className="font-medium text-[#172316]">{user?.role}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
