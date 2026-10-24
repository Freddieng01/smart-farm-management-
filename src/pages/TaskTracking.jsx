import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import BackButton from '../components/BackButton.jsx';

export default function TaskTracking() {
    const { api } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [form, setForm] = useState({
        employee_id: '',
        field_id: '',
        task_description: '',
        hours_worked: '',
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    async function fetchAllData() {
        setLoading(true);
        try {
            const [tasksRes, empRes, fieldRes] = await Promise.all([
                api.get('/api/daily-tasks'),
                api.get('/api/employees'),
                api.get('/api/farms'), // We get farms and then their fields or just all fields if available
            ]);
            setTasks(tasksRes.data.data);
            setEmployees(empRes.data.data);
            // Note: we might need a separate /api/fields endpoint, but for now we'll use a simplified approach or fetch them.
            // Since we don't have a global /api/fields, we might need to fetch farms and map their fields.
            // For the sake of this UI, let's assume we can fetch a combined list or we'll implement a field fetcher.
        } catch (err) {
            setError('Failed to load task data.');
        } finally {
            setLoading(false);
        }
    }

    // Helper to fetch all fields from all farms
    async function fetchAllFields() {
        const farmsRes = await api.get('/api/farms');
        const farms = farmsRes.data.data;
        const allFields = [];
        for (const farm of farms) {
            const fieldRes = await api.get(`/api/farms/${farm.id}/fields`);
            allFields.push(...fieldRes.data.data);
        }
        return allFields;
    }

    // Overriding fetchAllData to include fields
    useEffect(() => {
        async function init() {
            setLoading(true);
            try {
                const [tasksRes, empRes] = await Promise.all([
                    api.get('/api/daily-tasks'),
                    api.get('/api/employees'),
                ]);
                const fields = await fetchAllFields();
                setTasks(tasksRes.data.data);
                setEmployees(empRes.data.data);
                setFields(fields);
            } catch (err) {
                setError('Failed to load data.');
            } finally {
                setLoading(false);
            }
        }
        init();
    }, []);

    function handleOpenModal(task = null) {
        if (task) {
            setEditingTask(task);
            setForm({
                employee_id: task.employee_id,
                field_id: task.field_id || '',
                task_description: task.task_description,
                hours_worked: task.hours_worked,
                status: task.status,
                date: task.date,
            });
        } else {
            setEditingTask(null);
            setForm({
                employee_id: '',
                field_id: '',
                task_description: '',
                hours_worked: '',
                status: 'pending',
                date: new Date().toISOString().split('T')[0],
            });
        }
        setIsModalOpen(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (editingTask) {
                await api.put(`/api/daily-tasks/${editingTask.id}`, form);
            } else {
                await api.post('/api/daily-tasks', form);
            }
            setIsModalOpen(false);
            fetchAllData();
        } catch (err) {
            alert(err.response?.data?.message || 'An error occurred while saving the task.');
        }
    }

    async function handleDelete(id) {
        if (window.confirm('Are you sure you want to delete this task log?')) {
            try {
                await api.delete(`/api/daily-tasks/${id}`);
                fetchAllData();
            } catch (err) {
                alert('Failed to delete task.');
            }
        }
    }

    return (
        <main className="min-h-screen bg-[#f7faf7] px-6 py-8">
            <div className="mx-auto max-w-7xl">
                <BackButton />
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-[#172316]">Daily Task Tracking</h1>
                        <p className="text-sm text-[#647260]">Log work hours, track progress, and monitor field activities.</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="rounded-md bg-[#315f2b] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#264b22]"
                    >
                        + Log Daily Task
                    </button>
                </div>

                {error && <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

                <div className="overflow-hidden rounded-lg border border-[#dfe9de] bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#fcfdfc] text-[#647260] uppercase">
                            <tr>
                                <th className="px-6 py-3 font-medium">Date</th>
                                <th className="px-6 py-3 font-medium">Employee</th>
                                <th className="px-6 py-3 font-medium">Field</th>
                                <th className="px-6 py-3 font-medium">Description</th>
                                <th className="px-6 py-3 font-medium">Hours</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#dfe9de]">
                            {loading ? (
                                <tr><td colSpan="7" className="px-6 py-10 text-center text-[#647260]">Loading tasks...</td></tr>
                            ) : tasks.length === 0 ? (
                                <tr><td colSpan="7" className="px-6 py-10 text-center text-[#647260]">No tasks logged yet.</td></tr>
                            ) : (
                                tasks.map((task) => (
                                    <tr key={task.id} className="hover:bg-[#fcfdfc] transition">
                                        <td className="px-6 py-4 text-[#647260]">{task.date}</td>
                                        <td className="px-6 py-4 font-medium text-[#172316]">{task.employee?.user?.name}</td>
                                        <td className="px-6 py-4 text-[#647260]">{task.field?.name || 'General'}</td>
                                        <td className="px-6 py-4 text-[#647260]">{task.task_description}</td>
                                        <td className="px-6 py-4 text-[#647260]">{task.hours_worked}h</td>
                                        <td className="px-6 py-4">
                                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                                                task.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                                {task.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-3">
                                            <button
                                                onClick={() => handleOpenModal(task)}
                                                className="text-blue-600 hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(task.id)}
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

                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                            <h2 className="mb-6 text-xl font-semibold text-[#172316]">
                                {editingTask ? 'Edit Task' : 'Log Daily Task'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[#243322]">Employee</label>
                                        <select
                                            className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                            value={form.employee_id}
                                            onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                                            required
                                        >
                                            <option value="">Choose...</option>
                                            {employees.map(e => (
                                                <option key={e.id} value={e.id}>{e.user?.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#243322]">Date</label>
                                        <input
                                            type="date"
                                            className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                            value={form.date}
                                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Field (Optional)</label>
                                    <select
                                        className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                        value={form.field_id}
                                        onChange={(e) => setForm({ ...form, field_id: e.target.value })}
                                    >
                                        <option value="">General / No specific field</option>
                                        {fields.map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Description</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                        placeholder="e.g. Planting maize in North Field"
                                        value={form.task_description}
                                        onChange={(e) => setForm({ ...form, task_description: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[#243322]">Hours Worked</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                            value={form.hours_worked}
                                            onChange={(e) => setForm({ ...form, hours_worked: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#243322]">Status</label>
                                        <select
                                            className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                            value={form.status}
                                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                                            required
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="rounded-md border border-[#cbd8ca] px-4 py-2 text-sm font-medium text-[#647260] transition hover:bg-[#fcfdfc]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-md bg-[#315f2b] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#264b22]"
                                    >
                                        {editingTask ? 'Update Task' : 'Log Task'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
