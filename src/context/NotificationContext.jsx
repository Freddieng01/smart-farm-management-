import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { MODULE_ROLES } from '../config/permissions.js';

const POLL_MS = 30000; // how often to look for new notifications
const TOAST_MS = 9000; // how long a pop-up stays on screen
const MAX_TOASTS = 3; // pop-ups shown at once; extras are folded into one summary

// The page each kind of notification belongs to, and who is allowed to open it
// (same rules as the module list on the dashboard).
const PAGES = {
    storage: { path: '/storage', label: 'Open storage', roles: MODULE_ROLES['/storage'] },
    equipment: { path: '/equipment', label: 'Open equipment', roles: MODULE_ROLES['/equipment'] },
    livestock: { path: '/livestock', label: 'Open livestock', roles: MODULE_ROLES['/livestock'] },
    harvest: { path: '/harvest', label: 'Open harvests', roles: MODULE_ROLES['/harvest'] },
    tasks: { path: '/tasks', label: 'Open tasks', roles: MODULE_ROLES['/tasks'] },
    weather: { path: '/weather', label: 'Open weather', roles: MODULE_ROLES['/weather'] },
    irrigation: { path: '/irrigation-schedules', label: 'Open irrigation', roles: MODULE_ROLES['/irrigation-schedules'] },
    crops: { path: '/crops', label: 'Open crops', roles: MODULE_ROLES['/crops'] },
    pests: { path: '/crops', label: 'Open crops', roles: MODULE_ROLES['/pest-disease'] },
    inventory: { path: '/inventory', label: 'Open inventory', roles: MODULE_ROLES['/inventory'] },
    sales: { path: '/sales', label: 'Open sales', roles: MODULE_ROLES['/sales'] },
    finance: { path: '/finance', label: 'Open finance', roles: MODULE_ROLES['/finance'] },
    reports: { path: '/reports', label: 'Open reports', roles: MODULE_ROLES['/reports'] },
    employees: { path: '/employees', label: 'Open employees', roles: MODULE_ROLES['/employees'] },
};

// Types created by alert rules map exactly; anything else is matched by keyword.
const BY_TYPE = {
    low_stock: 'storage',
    maintenance_due: 'equipment',
    vaccination_due: 'livestock',
    harvest_due: 'harvest',
    task_overdue: 'tasks',
    weather: 'weather',
    crop_stage: 'crops',
};

const BY_KEYWORD = [
    [/weather|frost|rain|storm|wind|heat|temperature/, 'weather'],
    [/livestock|vaccin|animal|cattle/, 'livestock'],
    [/harvest/, 'harvest'],
    [/irrigat|pump|water/, 'irrigation'],
    [/pest|disease|outbreak|scout/, 'pests'],
    [/maintenance|equipment|machine/, 'equipment'],
    [/task/, 'tasks'],
    [/stock|storage|produce/, 'storage'],
    [/inventory|input|supply/, 'inventory'],
    [/sale|order|invoice|payment/, 'sales'],
    [/expense|budget|financ/, 'finance'],
    [/report/, 'reports'],
    [/employee|staff/, 'employees'],
];

/** The page a notification should open for this role, or null if there isn't one. */
export function targetFor(notification, role) {
    const type = String(notification?.type || '').toLowerCase().replace(/[\s-]+/g, '_');
    let key = BY_TYPE[type];

    if (!key) {
        const text = `${type} ${notification?.title || ''}`.toLowerCase();
        key = BY_KEYWORD.find(([pattern]) => pattern.test(text))?.[1];
    }

    const page = key ? PAGES[key] : null;

    return page && page.roles.includes(role) ? page : null;
}

const NotificationContext = createContext({
    notifications: [],
    unreadCount: 0,
    refresh: () => {},
    openNotification: () => {},
    targetFor: () => null,
});

export const useNotifications = () => useContext(NotificationContext);

const accent = {
    Urgent: 'border-red-500',
    High: 'border-amber-500',
    Normal: 'border-farm-500',
    Low: 'border-slate-300',
};

export function NotificationProvider({ children }) {
    const { user, api } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const [notifications, setNotifications] = useState([]);
    const [toasts, setToasts] = useState([]);
    const seen = useRef(null); // ids we've already seen; null until the first load
    const timers = useRef({});

    const dismiss = useCallback((id) => {
        clearTimeout(timers.current[id]);
        delete timers.current[id];
        setToasts((current) => current.filter((t) => t.id !== id));
    }, []);

    const pushToasts = useCallback(
        (items) => {
            items.forEach((item) => {
                setToasts((current) => [...current.filter((t) => t.id !== item.id), item].slice(-MAX_TOASTS - 1));
                timers.current[item.id] = setTimeout(() => dismiss(item.id), TOAST_MS);
            });
        },
        [dismiss]
    );

    const refresh = useCallback(async () => {
        if (!user) return;

        try {
            const res = await api.get('/api/notifications');
            const list = res.data.data ?? res.data;
            setNotifications(list);

            if (seen.current === null) {
                // First load: don't pop up everything that was already waiting.
                seen.current = new Set(list.map((n) => n.id));
                return;
            }

            const fresh = list.filter((n) => !seen.current.has(n.id) && !n.read_at);
            list.forEach((n) => seen.current.add(n.id));

            if (fresh.length === 0) return;

            const shown = fresh.slice(0, MAX_TOASTS).map((n) => ({ id: `n${n.id}`, notification: n }));

            if (fresh.length > MAX_TOASTS) {
                shown.push({
                    id: `more${Date.now()}`,
                    summary: `${fresh.length - MAX_TOASTS} more new notifications`,
                });
            }

            pushToasts(shown);
        } catch (err) {
            // Not allowed or offline: stay quiet and try again on the next check.
        }
    }, [user, api, pushToasts]);

    // Start fresh whenever someone logs in or out.
    useEffect(() => {
        seen.current = null;
        setNotifications([]);
        setToasts([]);
    }, [user?.id]);

    // Check on a timer, on every page change, when the tab regains focus,
    // and whenever the notifications page changes something.
    useEffect(() => {
        if (!user) return undefined;

        refresh();
        const timer = setInterval(refresh, POLL_MS);
        const onFocus = () => document.visibilityState === 'visible' && refresh();

        window.addEventListener('notifications:changed', refresh);
        document.addEventListener('visibilitychange', onFocus);

        return () => {
            clearInterval(timer);
            window.removeEventListener('notifications:changed', refresh);
            document.removeEventListener('visibilitychange', onFocus);
        };
    }, [user?.id, refresh]);

    useEffect(() => {
        refresh();
    }, [pathname]);

    const openNotification = useCallback(
        async (notification) => {
            const page = targetFor(notification, user?.role);
            let targetPath = page ? page.path : '/notifications';

            // Special handling for tasks: if the notification has a related task ID,
            // navigate to that specific task.
            if (page?.path === '/tasks' && notification.task_id) {
                targetPath = `/tasks/${notification.task_id}`;
            }

            if (!notification.read_at) {
                try {
                    await api.post(`/api/notifications/${notification.id}/mark-as-read`);
                } catch (err) {
                    // Opening the page matters more than the read flag.
                }
            }

            dismiss(`n${notification.id}`);
            navigate(targetPath);
            refresh();
        },
        [api, user?.role, dismiss, navigate, refresh]
    );

    const value = useMemo(
        () => ({
            notifications,
            unreadCount: notifications.filter((n) => !n.read_at).length,
            refresh,
            openNotification,
            targetFor: (n) => targetFor(n, user?.role),
        }),
        [notifications, refresh, openNotification, user?.role]
    );

    return (
        <NotificationContext.Provider value={value}>
            {children}

            <div
                className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3"
                aria-live="polite"
            >
                {toasts.map((toast) => {
                    const n = toast.notification;
                    const page = n ? targetFor(n, user?.role) : null;

                    return (
                        <div
                            key={toast.id}
                            role="status"
                            className={`pointer-events-auto rounded-2xl border-l-4 bg-white p-4 shadow-xl ring-1 ring-black/5 ${
                                accent[n?.priority] || accent.Normal
                            }`}
                        >
                            {n ? (
                                <>
                                    <p className="text-sm font-semibold text-farm-900">{n.title}</p>
                                    <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-slate-500">{n.message}</p>
                                </>
                            ) : (
                                <p className="text-sm font-semibold text-farm-900">{toast.summary}</p>
                            )}
                            <div className="mt-3 flex items-center justify-end gap-3 text-xs font-medium">
                                <button type="button" onClick={() => dismiss(toast.id)} className="text-slate-500 hover:underline">
                                    Dismiss
                                </button>
                                <button
                                    type="button"
                                    onClick={() => (n ? openNotification(n) : (dismiss(toast.id), navigate('/notifications')))}
                                    className="rounded-full bg-farm-700 px-3 py-1.5 text-white transition hover:bg-farm-800"
                                >
                                    {page ? page.label : 'View'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </NotificationContext.Provider>
    );
}
