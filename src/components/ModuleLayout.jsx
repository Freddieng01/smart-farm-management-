import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import FarmScene from './FarmScene.jsx';
import Icon from './Icon.jsx';
import { getSky } from './sky.js';

// Pages an Admin may look at but not change (matches ADMIN_VIEW_ONLY in RoleAccess.php).
const ADMIN_VIEW_ONLY = [
    '/livestock', '/tasks', '/production', '/crops', '/plantings', '/crop-monitoring',
    '/water-sources', '/irrigation-schedules', '/pump-monitoring', '/pest-disease', '/weather',
    '/harvest', '/yield-records', '/post-harvest-handling', '/inventory', '/equipment', '/storage',
];

function isAdminViewOnly(user, pathname) {
    if (user?.role !== 'Admin') return false;
    if (/^\/farms\/[^/]+\/fields/.test(pathname)) return true;
    return ADMIN_VIEW_ONLY.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/**
 * Shared shell for every module page. Same header as the dashboard:
 * time-of-day sky, farm scene, bell, name and role, avatar, logout.
 *
 * <ModuleLayout title="Livestock" subtitle="..." actions={<Button>...</Button>}>
 *   ...page content...
 * </ModuleLayout>
 */
export default function ModuleLayout({ title, subtitle, actions, children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const viewOnly = isAdminViewOnly(user, pathname);
    const [now, setNow] = useState(() => new Date());

    // keep the sky in step with the clock
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(id);
    }, []);

    const sky = getSky(now);
    const initials =
        (user?.name || '?')
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0].toUpperCase())
            .join('') || '?';

    return (
        <main className="min-h-screen bg-farm-50 text-slate-800">
            <header className={`relative bg-gradient-to-b ${sky.gradient} text-white`}>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/25" />
                <FarmScene sky={sky} />

                <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-5">
                    <div className="flex items-center justify-between gap-4">
                        <Link to="/dashboard" className="flex items-center gap-3" aria-label="AgriCore dashboard">
                            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15 ring-1 ring-white/25">
                                <Icon name="leaf" className="h-5 w-5" />
                            </span>
                            <span className="leading-tight">
                                <span className="block text-sm font-semibold">AgriCore</span>
                                <span className="hidden text-xs text-white/70 sm:block">Intelligence Core Dashboard</span>
                            </span>
                        </Link>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/notifications')}
                                className="grid h-10 w-10 place-items-center rounded-full bg-white/15 ring-1 ring-white/25 transition hover:bg-white/25"
                                aria-label="Notifications"
                            >
                                <Icon name="bell" className="h-5 w-5" />
                            </button>
                            <div className="hidden text-right leading-tight sm:block">
                                <p className="text-sm font-medium">{user?.name}</p>
                                <p className="text-xs text-white/70">{user?.role}</p>
                            </div>
                            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20 text-sm font-semibold ring-1 ring-white/30">
                                {initials}
                            </span>
                            <button
                                className="flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                                type="button"
                                onClick={logout}
                                aria-label="Logout"
                            >
                                <Icon name="logout" className="h-4 w-4" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0">
                            <Link
                                to="/dashboard"
                                className="inline-flex items-center gap-1 text-sm text-white/75 transition hover:text-white"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M15 18l-6-6 6-6" />
                                </svg>
                                Dashboard
                            </Link>
                            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
                            {subtitle && <p className="mt-2 max-w-xl text-sm text-white/80">{subtitle}</p>}
                        </div>
                        {actions && !viewOnly && <div className="flex shrink-0 gap-2">{actions}</div>}
                    </div>
                </div>
            </header>

            <section className={`relative z-10 mx-auto -mt-4 max-w-7xl px-6 pb-14 ${viewOnly ? '[&_td_button]:hidden' : ''}`}>
                {viewOnly && (
                    <p role="status" className="mb-6 rounded-2xl bg-white px-4 py-3 text-sm text-farm-800 shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
                        View only. Admins can look at farm records but only the farm owner and their team can change them.
                    </p>
                )}
                {children}
            </section>
        </main>
    );
}
