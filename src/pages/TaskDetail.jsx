import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';
import { money } from '../utils/currency.js';
import TaskClock, { clockState, CLOCK_LABEL } from '../components/TaskClock.jsx';

const card = 'rounded-3xl bg-white shadow-[0_2px_16px_rgba(15,60,35,0.07)]';
const input = 'mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20';

const STATUSES = [
    { value: 'pending', label: 'Pending', tone: 'bg-slate-100 text-slate-700' },
    { value: 'in_progress', label: 'In progress', tone: 'bg-blue-100 text-blue-700' },
    { value: 'completed', label: 'Completed', tone: 'bg-farm-100 text-farm-700' },
];
const statusOf = (value) => STATUSES.find((s) => s.value === value) || STATUSES[0];

function Row({ title, children }) {
    return (
        <div className="flex justify-between gap-4 py-3">
            <dt className="text-sm text-slate-500">{title}</dt>
            <dd className="text-right text-sm font-medium text-slate-800">{children}</dd>
        </div>
    );
}

/** One task's own page: who, where, when, how long, and how it is going. */
export default function TaskDetail() {
    const { taskId } = useParams();
    const { api, user } = useAuth();
    const navigate = useNavigate();
    const canEdit = ['Farm-owner', 'Manager'].includes(user?.role);

    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ task_description: '', hours_worked: '', date: '', status: 'pending' });

    useEffect(() => {
        let ignore = false;
        setLoading(true);
        setError(null);
        api.get(`/api/daily-tasks/${taskId}`)
            .then((res) => { if (!ignore) setTask(res.data.data); })
            .catch((err) => {
                if (!ignore) setError(err.response?.status === 404 ? 'This task could not be found.' : (err.response?.data?.message || 'Failed to load this task.'));
            })
            .finally(() => { if (!ignore) setLoading(false); });
        return () => { ignore = true; };
    }, [api, taskId]);

    async function update(changes) {
        setSaving(true);
        setError(null);
        try {
            const res = await api.put(`/api/daily-tasks/${task.id}`, changes);
            // the update response does not carry the farm, so keep what we already loaded
            setTask((current) => ({ ...current, ...res.data.data, field: current.field, employee: current.employee }));
            setEditing(false);
        } catch (err) {
            const errors = err.response?.data?.errors;
            setError(errors ? Object.values(errors).flat().join(' ') : (err.response?.data?.message || 'Could not save the task.'));
        } finally {
            setSaving(false);
        }
    }

    async function remove() {
        if (!window.confirm('Are you sure you want to delete this task log?')) return;
        try {
            await api.delete(`/api/daily-tasks/${task.id}`);
            navigate('/tasks', { replace: true });
        } catch (err) {
            setError('Failed to delete task.');
        }
    }

    function startEditing() {
        setForm({
            task_description: task.task_description,
            hours_worked: task.hours_worked,
            date: String(task.date).slice(0, 10),
            status: task.status,
        });
        setEditing(true);
    }

    const farm = task?.field?.farm || task?.employee?.farm;
    const status = task ? { label: CLOCK_LABEL[clockState(task)].text, tone: CLOCK_LABEL[clockState(task)].tone } : null;

    return (
        <ModuleLayout
            title={task ? task.task_description : (error ? 'Task' : 'Loading task...')}
            subtitle={task ? `Logged for ${String(task.date).slice(0, 10)}` : undefined}
            backTo={{ to: '/tasks', label: 'All tasks' }}
            actions={canEdit && task && !editing ? (
                <>
                    <button type="button" onClick={startEditing}
                        className="rounded-full bg-harvest-400 px-5 py-2 text-sm font-medium text-farm-900 transition hover:bg-harvest-500">
                        Edit task
                    </button>
                </>
            ) : null}
        >
            {error && <p role="alert" className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
            {loading && <p className="py-10 text-center text-sm text-slate-500">Loading task...</p>}

            {task && (
                <div className="grid gap-6 lg:grid-cols-3">
                    <section className={`${card} p-6 lg:col-span-2`}>
                        {editing ? (
                            <form
                                className="space-y-4"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    update(form);
                                }}
                            >
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Description</label>
                                    <input className={input} required value={form.task_description}
                                        onChange={(e) => setForm({ ...form, task_description: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div>
                                        <label className="block text-sm font-medium text-farm-900">Date</label>
                                        <input type="date" className={input} required value={form.date}
                                            onChange={(e) => setForm({ ...form, date: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-farm-900">Hours worked</label>
                                        <input type="number" step="0.1" min="0" className={input} required value={form.hours_worked}
                                            onChange={(e) => setForm({ ...form, hours_worked: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-farm-900">Status</label>
                                        <select className={input} value={form.status}
                                            onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => setEditing(false)}
                                        className="rounded-full border border-farm-200 px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-farm-50">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={saving}
                                        className="rounded-full bg-farm-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-farm-800 disabled:opacity-60">
                                        {saving ? 'Saving...' : 'Save changes'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div className="flex items-center justify-between gap-3">
                                    <h2 className="text-base font-semibold text-farm-900">Task details</h2>
                                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.tone}`}>{status.label}</span>
                                </div>
                                <dl className="mt-3 divide-y divide-farm-100">
                                    <Row title="Description">{task.task_description}</Row>
                                    <Row title="Date">{String(task.date).slice(0, 10)}</Row>
                                    <Row title="Hours worked">{task.hours_worked}h</Row>
                                    <Row title="Employee">
                                        {canEdit && task.employee
                                            ? <Link to={`/employees/${task.employee.id}`} className="text-farm-700 hover:underline">{task.employee.user?.name}</Link>
                                            : (task.employee?.user?.name || '—')}
                                    </Row>
                                    <Row title="Field">{task.field?.name || 'General / no specific field'}</Row>
                                    <Row title="Farm">
                                        {farm
                                            ? (['Admin', 'Farm-owner', 'Manager'].includes(user?.role)
                                                ? <Link to={`/farms/${farm.id}`} className="text-farm-700 hover:underline">{farm.name}</Link>
                                                : farm.name)
                                            : '—'}
                                    </Row>
                                </dl>
                            </>
                        )}
                    </section>

                    <section className={`${card} p-6`}>
                        <h2 className="text-base font-semibold text-farm-900">Time on this task</h2>
                        <p className="mb-4 mt-1 text-sm text-slate-500">
                            {task.employee?.hourly_rate && (canEdit || task.employee?.user?.id === user?.id)
                                ? `Paid per hour at ${money(task.employee.hourly_rate)} per hour.`
                                : 'Timed from Start to Finish.'}
                        </p>
                        <TaskClock task={task} onChange={(updated) => setTask((current) => ({ ...current, ...updated }))} />
                        <p className="mt-4 text-sm text-slate-500">Hours recorded: <strong className="text-farm-900">{Number(task.hours_worked).toFixed(2)}h</strong></p>
                        {canEdit && (
                            <button type="button" onClick={remove} className="mt-6 text-sm font-medium text-red-600 hover:underline">
                                Delete this task
                            </button>
                        )}
                    </section>
                </div>
            )}
        </ModuleLayout>
    );
}
