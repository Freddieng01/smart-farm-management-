import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const initialSummary = {
    farms: 0,
    fields: 0,
    active_users: 0,
};

export default function Dashboard() {
    const { api, user, role, logout } = useAuth();
    const [summary, setSummary] = useState(initialSummary);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let ignore = false;

        async function loadSummary() {
            setLoading(true);
            setError(null);

            try {
                const response = await api.get('/dashboard/summary');

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
        { label: 'Farms', value: summary.farms },
        { label: 'Fields', value: summary.fields },
        { label: 'Active Users', value: summary.active_users },
    ];

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
                            <p className="text-xs text-[#647260]">{role}</p>
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

                <div className="mt-8 rounded-lg border border-[#dfe9de] bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-[#172316]">Phase 1 Modules</h2>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-md border border-[#e3ebe2] p-4">
                            <p className="font-medium text-[#243322]">Security & User Management</p>
                            <p className="mt-1 text-sm text-[#647260]">Sanctum authentication and role-aware sessions are active.</p>
                        </div>
                        <div className="rounded-md border border-[#e3ebe2] p-4">
                            <p className="font-medium text-[#243322]">Farm & Field Management</p>
                            <p className="mt-1 text-sm text-[#647260]">Farms contain GPS, acreage, and nested field records.</p>
                        </div>
                        <div className="rounded-md border border-[#e3ebe2] p-4">
                            <p className="font-medium text-[#243322]">Labour & Employee Management</p>
                            <p className="mt-1 text-sm text-[#647260]">Employees link user accounts to farms, rates, and assignments.</p>
                        </div>
                        <div className="rounded-md border border-[#e3ebe2] p-4">
                            <p className="font-medium text-[#243322]">Farm Dashboard</p>
                            <p className="mt-1 text-sm text-[#647260]">Operational counts are served by the protected API summary endpoint.</p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
