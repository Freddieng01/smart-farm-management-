import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';
import TaskClock, { clockState, CLOCK_LABEL } from '../components/TaskClock.jsx';
import { money } from '../utils/currency.js';

const card = 'rounded-3xl bg-white shadow-[0_2px_16px_rgba(15,60,35,0.07)]';

function Stat({ title, value, note }) {
    return (
        <div className={`${card} p-4`}>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-farm-900 tabular-nums">{value}</p>
            {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
        </div>
    );
}

/** One employee: where they work, what they are assigned to, and the hours and pay from their clock. */
export default function EmployeeProfile() {
    const { employeeId } = useParams();
    const { api } = useAuth();
    const [employee, setEmployee] = useState(null);
    const [stats, setStats] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        let ignore = false;
        setEmployee(null);
        setError(null);
        api.get(`/api/employees/${employeeId}`)
            .then((res) => {
                if (ignore) return;
                setEmployee(res.data.data);
                setStats(res.data.stats);
                setTasks(res.data.tasks ?? []);
            })
            .catch((err) => {
                if (!ignore) setError(err.response?.status === 404 ? 'This employee could not be found.' : 'Failed to load this employee.');
            });
        return () => { ignore = true; };
    }, [api, employeeId]);

    const running = tasks.find((task) => task.is_running);
    const rate = Number(employee?.hourly_rate || 0);

    return (
        <ModuleLayout
            title={employee?.user?.name || (error ? 'Employee' : 'Loading employee...')}
            subtitle={employee ? `${employee.user?.role || 'Employee'} at ${employee.farm?.name || 'no farm'}` : undefined}
            backTo={{ to: '/tasks?tab=employees', label: 'All employees' }}
        >
            {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

            {employee && stats && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <Stat title="Open tasks" value={stats.tasks_open} note={`${stats.tasks_completed} finished`} />
                        <Stat title="Hours this month" value={`${stats.hours_this_month}h`} note={`${stats.hours_total}h in total`} />
                        <Stat title="Earned this month" value={money(stats.earned_this_month)} note={rate ? `At ${money(rate)} per hour` : 'No hourly rate set'} />
                        <Stat title="Earned in total" value={money(stats.earned_total)} />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        <section className={`${card} p-6`}>
                            <h2 className="text-base font-semibold text-farm-900">Details</h2>
                            <dl className="mt-4 space-y-3 text-sm">
                                <div className="flex justify-between gap-3"><dt className="text-slate-500">Role</dt><dd className="font-medium text-slate-800">{employee.user?.role}</dd></div>
                                <div className="flex justify-between gap-3"><dt className="text-slate-500">Email</dt><dd className="text-right text-slate-800">{employee.user?.email}</dd></div>
                                <div className="flex justify-between gap-3">
                                    <dt className="text-slate-500">Farm</dt>
                                    <dd className="text-right font-medium">
                                        {employee.farm ? <Link to={`/farms/${employee.farm.id}`} className="text-farm-700 hover:underline">{employee.farm.name}</Link> : '—'}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-3"><dt className="text-slate-500">Hourly rate</dt><dd className="font-medium text-slate-800">{rate ? money(rate) : 'Not set'}</dd></div>
                                <div>
                                    <dt className="text-slate-500">Assignment</dt>
                                    <dd className="mt-1 text-slate-800">{employee.task_assignment || 'No standing assignment'}</dd>
                                </div>
                            </dl>
                        </section>

                        <section className={`${card} p-6 lg:col-span-2`}>
                            <h2 className="text-base font-semibold text-farm-900">Right now</h2>
                            {running ? (
                                <div className="mt-3">
                                    <p className="mb-3 text-sm text-slate-600">Working on <Link to={`/tasks/${running.id}`} className="font-medium text-farm-900 hover:underline">{running.task_description}</Link></p>
                                    <TaskClock task={running} onChange={(updated) => setTasks((rows) => rows.map((row) => (row.id === updated.id ? updated : row)))} />
                                </div>
                            ) : (
                                <p className="mt-3 text-sm text-slate-500">No task is running. The clock starts when {employee.user?.name?.split(' ')[0] || 'the employee'} presses Start on a job.</p>
                            )}
                        </section>
                    </div>

                    <section className={`${card} overflow-x-auto`}>
                        <h2 className="px-6 pt-5 text-base font-semibold text-farm-900">Recent tasks</h2>
                        <table className="mt-3 w-full text-left text-sm">
                            <thead className="bg-farm-50 text-xs text-farm-700">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Date</th>
                                    <th className="px-6 py-3 font-semibold">Task</th>
                                    <th className="px-6 py-3 font-semibold">Field</th>
                                    <th className="px-6 py-3 font-semibold">Hours</th>
                                    <th className="px-6 py-3 font-semibold">Pay</th>
                                    <th className="px-6 py-3 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-farm-100">
                                {tasks.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-500">No tasks assigned yet.</td></tr>
                                ) : tasks.map((task) => (
                                    <tr key={task.id} className="transition hover:bg-farm-50">
                                        <td className="px-6 py-3 text-slate-500">{String(task.date).slice(0, 10)}</td>
                                        <td className="px-6 py-3 font-medium">
                                            <Link to={`/tasks/${task.id}`} className="text-farm-900 hover:underline">{task.task_description}</Link>
                                        </td>
                                        <td className="px-6 py-3 text-slate-500">{task.field?.name || 'General'}</td>
                                        <td className="px-6 py-3 text-slate-500">{Number(task.hours_worked).toFixed(2)}h</td>
                                        <td className="px-6 py-3 text-slate-500">{money(Number(task.hours_worked) * rate)}</td>
                                        <td className="px-6 py-3">
                                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${CLOCK_LABEL[clockState(task)].tone}`}>{CLOCK_LABEL[clockState(task)].text}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                </div>
            )}
        </ModuleLayout>
    );
}
