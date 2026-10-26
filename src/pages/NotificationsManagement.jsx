import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';

const emptyNotification = { farm_id: '', type: '', title: '', message: '', priority: 'Normal' };
const emptyRule = { farm_id: '', type: '', trigger_condition: '', is_active: true };

const inputClass =
    'mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20';

const priorityStyles = {
    Urgent: 'bg-red-100 text-red-800',
    High: 'bg-amber-100 text-amber-800',
    Normal: 'bg-farm-100 text-farm-800',
    Low: 'bg-slate-100 text-slate-700',
};

export default function NotificationsManagement() {
    const { api, user } = useAuth();
    const [tab, setTab] = useState('notifications');
    const [notifications, setNotifications] = useState([]);
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [notificationModal, setNotificationModal] = useState(false);
    const [ruleModal, setRuleModal] = useState(false);
    const [notificationForm, setNotificationForm] = useState(emptyNotification);
    const [ruleForm, setRuleForm] = useState(emptyRule);

    useEffect(() => {
        fetchAll();
    }, []);

    async function fetchAll() {
        setLoading(true);
        setError(null);
        try {
            const [notificationsRes, rulesRes] = await Promise.all([
                api.get('/api/notifications'),
                api.get('/api/alert-rules'),
            ]);
            setNotifications(notificationsRes.data.data ?? notificationsRes.data);
            setRules(rulesRes.data.data ?? rulesRes.data);
        } catch (err) {
            setError('Could not load notifications and alert rules. Check that the API is running and you are logged in.');
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateNotification(e) {
        e.preventDefault();
        try {
            await api.post('/api/notifications', {
                ...notificationForm,
                user_id: user.id,
                farm_id: notificationForm.farm_id || null,
            });
            setNotificationModal(false);
            setNotificationForm(emptyNotification);
            fetchAll();
        } catch (err) {
            alert(err.response?.data?.message || 'Could not create the notification.');
        }
    }

    async function handleMarkAsRead(id) {
        try {
            await api.post(`/api/notifications/${id}/mark-as-read`);
            fetchAll();
        } catch (err) {
            alert('Could not mark the notification as read.');
        }
    }

    async function handleDeleteNotification(id) {
        if (!window.confirm('Delete this notification?')) return;
        try {
            await api.delete(`/api/notifications/${id}`);
            fetchAll();
        } catch (err) {
            alert('Could not delete the notification.');
        }
    }

    async function handleCreateRule(e) {
        e.preventDefault();
        try {
            await api.post('/api/alert-rules', ruleForm);
            setRuleModal(false);
            setRuleForm(emptyRule);
            fetchAll();
        } catch (err) {
            alert(err.response?.data?.message || 'Could not create the alert rule.');
        }
    }

    async function handleToggleRule(rule) {
        try {
            await api.put(`/api/alert-rules/${rule.id}`, { is_active: !rule.is_active });
            fetchAll();
        } catch (err) {
            alert('Could not update the alert rule.');
        }
    }

    async function handleDeleteRule(id) {
        if (!window.confirm('Delete this alert rule?')) return;
        try {
            await api.delete(`/api/alert-rules/${id}`);
            fetchAll();
        } catch (err) {
            alert('Could not delete the alert rule.');
        }
    }

    const visibleNotifications = unreadOnly ? notifications.filter((n) => !n.read_at) : notifications;
    const unreadCount = notifications.filter((n) => !n.read_at).length;

    return (
        <ModuleLayout
          title="Notifications and alerts"
          subtitle="See what needs attention, and set the rules that trigger alerts for each farm."
          actions={<>
<button
                        onClick={() => (tab === 'notifications' ? setNotificationModal(true) : setRuleModal(true))}
                        className="rounded-full bg-harvest-400 px-5 py-2 text-sm font-medium text-farm-900 transition hover:bg-harvest-500 disabled:opacity-60"
                    >
                        {tab === 'notifications' ? '+ Add notification' : '+ Add alert rule'}
                    </button>
          </>}
        >
            <div className="mx-auto max-w-7xl">

                <div className="mb-4 flex gap-2 border-b border-farm-100">
                    <button
                        onClick={() => setTab('notifications')}
                        className={`px-4 py-2 text-sm font-medium transition ${
                            tab === 'notifications'
                                ? 'border-b-2 border-farm-700 text-farm-900'
                                : 'text-slate-500 hover:text-farm-900'
                        }`}
                    >
                        My notifications{unreadCount > 0 ? ` (${unreadCount} unread)` : ''}
                    </button>
                    <button
                        onClick={() => setTab('rules')}
                        className={`px-4 py-2 text-sm font-medium transition ${
                            tab === 'rules'
                                ? 'border-b-2 border-farm-700 text-farm-900'
                                : 'text-slate-500 hover:text-farm-900'
                        }`}
                    >
                        Alert rules
                    </button>
                </div>

                {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

                {tab === 'notifications' && (
                    <>
                        <label className="mb-3 flex items-center gap-2 text-sm text-slate-500">
                            <input
                                type="checkbox"
                                checked={unreadOnly}
                                onChange={(e) => setUnreadOnly(e.target.checked)}
                            />
                            Show unread only
                        </label>
                        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-farm-50 text-slate-500">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Title</th>
                                        <th className="px-6 py-3 font-semibold">Type</th>
                                        <th className="px-6 py-3 font-semibold">Priority</th>
                                        <th className="px-6 py-3 font-semibold">Received</th>
                                        <th className="px-6 py-3 text-right font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-farm-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                                                Loading notifications...
                                            </td>
                                        </tr>
                                    ) : visibleNotifications.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                                                {unreadOnly
                                                    ? 'No unread notifications.'
                                                    : 'Nothing here yet. Add a notification to see how alerts will look.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        visibleNotifications.map((n) => (
                                            <tr key={n.id} className={n.read_at ? '' : 'bg-farm-50'}>
                                                <td className="px-6 py-4">
                                                    <p className={`text-farm-900 ${n.read_at ? '' : 'font-semibold'}`}>
                                                        {n.title}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-slate-500">{n.message}</p>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">{n.type}</td>
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                                                            priorityStyles[n.priority] || priorityStyles.Normal
                                                        }`}
                                                    >
                                                        {n.priority}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">
                                                    {n.created_at ? new Date(n.created_at).toLocaleString() : '-'}
                                                </td>
                                                <td className="space-x-3 px-6 py-4 text-right">
                                                    {!n.read_at && (
                                                        <button
                                                            onClick={() => handleMarkAsRead(n.id)}
                                                            className="text-farm-700 hover:underline"
                                                        >
                                                            Mark as read
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteNotification(n.id)}
                                                        className="text-red-600 hover:underline"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {tab === 'rules' && (
                    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-farm-50 text-slate-500">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Alert type</th>
                                    <th className="px-6 py-3 font-semibold">Triggers when</th>
                                    <th className="px-6 py-3 font-semibold">Farm ID</th>
                                    <th className="px-6 py-3 font-semibold">Status</th>
                                    <th className="px-6 py-3 text-right font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-farm-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                                            Loading alert rules...
                                        </td>
                                    </tr>
                                ) : rules.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                                            No alert rules yet. Add one to decide what should raise an alert.
                                        </td>
                                    </tr>
                                ) : (
                                    rules.map((rule) => (
                                        <tr key={rule.id}>
                                            <td className="px-6 py-4 font-medium text-farm-900">{rule.type}</td>
                                            <td className="px-6 py-4 text-slate-500">{rule.trigger_condition}</td>
                                            <td className="px-6 py-4 text-slate-500">{rule.farm_id}</td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                                                        rule.is_active
                                                            ? 'bg-farm-100 text-farm-800'
                                                            : 'bg-slate-100 text-slate-700'
                                                    }`}
                                                >
                                                    {rule.is_active ? 'Active' : 'Paused'}
                                                </span>
                                            </td>
                                            <td className="space-x-3 px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleToggleRule(rule)}
                                                    className="text-farm-700 hover:underline"
                                                >
                                                    {rule.is_active ? 'Pause' : 'Resume'}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRule(rule.id)}
                                                    className="text-red-600 hover:underline"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {notificationModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                        <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
                            <h2 className="mb-6 text-xl font-semibold text-farm-900">Add notification</h2>
                            <form onSubmit={handleCreateNotification} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Farm ID (optional)</label>
                                    <input
                                        type="number"
                                        className={inputClass}
                                        value={notificationForm.farm_id}
                                        onChange={(e) => setNotificationForm({ ...notificationForm, farm_id: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Type</label>
                                    <input
                                        className={inputClass}
                                        placeholder="e.g. vaccination, low_stock, harvest"
                                        value={notificationForm.type}
                                        onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Title</label>
                                    <input
                                        className={inputClass}
                                        value={notificationForm.title}
                                        onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Message</label>
                                    <textarea
                                        rows="3"
                                        className={inputClass}
                                        value={notificationForm.message}
                                        onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Priority</label>
                                    <select
                                        className={inputClass}
                                        value={notificationForm.priority}
                                        onChange={(e) => setNotificationForm({ ...notificationForm, priority: e.target.value })}
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Normal">Normal</option>
                                        <option value="High">High</option>
                                        <option value="Urgent">Urgent</option>
                                    </select>
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setNotificationModal(false)}
                                        className="rounded-full border border-farm-200 px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-farm-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-full bg-farm-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-farm-800"
                                    >
                                        Add notification
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {ruleModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                        <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
                            <h2 className="mb-6 text-xl font-semibold text-farm-900">Add alert rule</h2>
                            <form onSubmit={handleCreateRule} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Farm ID</label>
                                    <input
                                        type="number"
                                        className={inputClass}
                                        value={ruleForm.farm_id}
                                        onChange={(e) => setRuleForm({ ...ruleForm, farm_id: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Alert type</label>
                                    <input
                                        className={inputClass}
                                        placeholder="e.g. low_stock, vaccination_due"
                                        value={ruleForm.type}
                                        onChange={(e) => setRuleForm({ ...ruleForm, type: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Triggers when</label>
                                    <input
                                        className={inputClass}
                                        placeholder="e.g. stock falls below minimum"
                                        value={ruleForm.trigger_condition}
                                        onChange={(e) => setRuleForm({ ...ruleForm, trigger_condition: e.target.value })}
                                        required
                                    />
                                </div>
                                <label className="flex items-center gap-2 text-sm text-farm-900">
                                    <input
                                        type="checkbox"
                                        checked={ruleForm.is_active}
                                        onChange={(e) => setRuleForm({ ...ruleForm, is_active: e.target.checked })}
                                    />
                                    Rule is active
                                </label>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setRuleModal(false)}
                                        className="rounded-full border border-farm-200 px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-farm-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-full bg-farm-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-farm-800"
                                    >
                                        Add alert rule
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </ModuleLayout>
    );
}
