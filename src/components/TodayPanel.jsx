import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { canAccessModule } from '../config/permissions.js';
import Icon from './Icon.jsx';

const softShadow = 'shadow-[0_2px_16px_rgba(15,60,35,0.07)]';

const TONES = {
    urgent: 'bg-red-50 text-red-700',
    warn: 'bg-harvest-50 text-harvest-600',
    info: 'bg-farm-50 text-farm-700',
};

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const names = (rows, limit = 3) => {
    const list = rows.slice(0, limit).map((row) => row.name).filter(Boolean);
    return list.join(', ') + (rows.length > limit ? ` and ${rows.length - limit} more` : '');
};

/**
 * "What needs doing" for whoever is signed in. It pulls from the modules the
 * person is allowed to use and links each line to the exact tab where it is
 * fixed, so the dashboard starts the day instead of only listing menus.
 */
export default function TodayPanel() {
    const { api, user } = useAuth();
    const { unreadCount } = useNotifications();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let ignore = false;
        const role = user?.role;

        async function load() {
            const jobs = [];
            const add = (job) => jobs.push(job);

            if (canAccessModule(role, '/tasks')) {
                add(api.get('/api/daily-tasks').then((res) => {
                    const open = (res.data.data ?? []).filter((task) => task.status !== 'completed');
                    if (open.length === 0) return [];
                    const inProgress = open.filter((task) => task.status === 'in_progress').length;
                    return [{
                        key: 'tasks',
                        tone: 'info',
                        icon: 'tasks',
                        title: `${plural(open.length, 'task', 'tasks')} still open`,
                        detail: inProgress ? `${inProgress} in progress. Latest: ${open[0].task_description}` : `Latest: ${open[0].task_description}`,
                        to: open.length === 1 ? `/tasks/${open[0].id}` : '/tasks',
                    }];
                }));
            }

            if (canAccessModule(role, '/inventory')) {
                add(api.get('/api/resources/low-stock').then((res) => {
                    const rows = res.data.data ?? [];
                    if (rows.length === 0) return [];
                    return [{
                        key: 'low-stock',
                        tone: 'warn',
                        icon: 'boxes',
                        title: `${plural(rows.length, 'input is', 'inputs are')} running low`,
                        detail: names(rows),
                        to: '/inventory?tab=inventory',
                    }];
                }));

                add(api.get('/api/resources/expiring').then((res) => {
                    const expired = res.data.data?.expired ?? [];
                    const soon = res.data.data?.expiring_soon ?? [];
                    const out = [];
                    if (expired.length) {
                        out.push({
                            key: 'expired',
                            tone: 'urgent',
                            icon: 'alert',
                            title: `${plural(expired.length, 'input has', 'inputs have')} expired`,
                            detail: names(expired),
                            to: '/inventory?tab=inventory',
                        });
                    }
                    if (soon.length) {
                        out.push({
                            key: 'expiring',
                            tone: 'warn',
                            icon: 'boxes',
                            title: `${plural(soon.length, 'input expires', 'inputs expire')} within ${res.data.data?.window_days ?? 14} days`,
                            detail: names(soon),
                            to: '/inventory?tab=inventory',
                        });
                    }
                    return out;
                }));
            }

            if (canAccessModule(role, '/equipment')) {
                add(api.get('/api/equipment/due-service').then((res) => {
                    const rows = res.data.data ?? [];
                    if (rows.length === 0) return [];
                    return [{
                        key: 'service',
                        tone: 'warn',
                        icon: 'wrench',
                        title: `${plural(rows.length, 'machine is', 'machines are')} due for service`,
                        detail: names(rows),
                        to: '/inventory?tab=equipment',
                    }];
                }));
            }

            // one failing source must not hide the others
            const settled = await Promise.allSettled(jobs);
            if (ignore) return;
            setItems(settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])));
            setLoading(false);
        }

        load();
        return () => { ignore = true; };
    }, [api, user?.role]);

    const all = [
        ...items,
        ...(unreadCount > 0 && canAccessModule(user?.role, '/notifications')
            ? [{
                key: 'unread',
                tone: 'info',
                icon: 'bell',
                title: `${plural(unreadCount, 'unread notification', 'unread notifications')}`,
                detail: 'Alerts from your farms are waiting.',
                to: '/notifications',
            }]
            : []),
    ];
    const rank = { urgent: 0, warn: 1, info: 2 };
    all.sort((a, b) => rank[a.tone] - rank[b.tone]);

    return (
        <section className={`mb-6 rounded-3xl bg-white ${softShadow}`} aria-labelledby="today-heading">
            <div className="flex items-baseline justify-between gap-3 px-6 pt-5">
                <h2 id="today-heading" className="text-base font-semibold text-farm-900">Needs your attention</h2>
                {!loading && all.length > 0 && <span className="text-sm text-slate-500">{plural(all.length, 'item', 'items')}</span>}
            </div>

            <div className="p-6 pt-4">
                {loading ? (
                    <p className="text-sm text-slate-500">Checking your farms…</p>
                ) : all.length === 0 ? (
                    <p className="text-sm text-slate-600">You are all caught up. Nothing is overdue, low or waiting.</p>
                ) : (
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {all.map((item) => (
                            <li key={item.key}>
                                <Link
                                    to={item.to}
                                    className="flex items-start gap-3 rounded-2xl p-3 ring-1 ring-farm-100 transition hover:bg-farm-50 hover:ring-farm-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-farm-500"
                                >
                                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${TONES[item.tone]}`}>
                                        <Icon name={item.icon} className="h-5 w-5" />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-medium text-slate-800">{item.title}</span>
                                        <span className="block truncate text-sm text-slate-500">{item.detail}</span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
