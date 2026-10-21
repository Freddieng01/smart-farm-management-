import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import BackButton from '../components/BackButton.jsx';

export default function EmployeeManagement() {
    const { api } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [users, setUsers] = useState([]);
    const [farms, setFarms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [form, setForm] = useState({
        user_id: '',
        farm_id: '',
        task_assignment: '',
        hourly_rate: '',
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    async function fetchAllData() {
        setLoading(true);
        try {
            const [empRes, userRes, farmRes] = await Promise.all([
                api.get('/api/employees'),
                api.get('/api/employees/assignable-users'),
                api.get('/api/farms'),
            ]);
            setEmployees(empRes.data.data);
            setUsers(userRes.data.data);
            setFarms(farmRes.data.data);
        } catch (err) {
            setError('Failed to load employee data.');
        } finally {
            setLoading(false);
        }
    }

    function handleOpenModal(employee = null) {
        if (employee) {
            setEditingEmployee(employee);
            setForm({
                user_id: employee.user_id,
                farm_id: employee.farm_id,
                task_assignment: employee.task_assignment || '',
                hourly_rate: employee.hourly_rate,
            });
        } else {
            setEditingEmployee(null);
            setForm({ user_id: '', farm_id: '', task_assignment: '', hourly_rate: '' });
        }
        setIsModalOpen(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (editingEmployee) {
                await api.put(`/api/employees/${editingEmployee.id}`, form);
            } else {
                await api.post('/api/employees', form);
            }
            setIsModalOpen(false);
            fetchAllData();
        } catch (err) {
            alert(err.response?.data?.message || 'An error occurred while saving the employee.');
        }
    }

    async function handleDelete(id) {
        if (window.confirm('Are you sure you want to remove this employee assignment?')) {
            try {
                await api.delete(`/api/employees/${id}`);
                fetchAllData();
            } catch (err) {
                alert('Failed to delete employee.');
            }
        }
    }

    return (
        <main className="min-h-screen bg-[#f7faf7] px-6 py-8">
            <div className="mx-auto max-w-7xl">
                <BackButton />
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-[#172316]">Employee Management</h1>
                        <p className="text-sm text-[#647260]">Assign users to farms, define roles, and manage hourly rates.</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="rounded-md bg-[#315f2b] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#264b22]"
                    >
                        + Assign Employee
                    </button>
                </div>

                {error && <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

                <div className="overflow-hidden rounded-lg border border-[#dfe9de] bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#fcfdfc] text-[#647260] uppercase">
                            <tr>
                                <th className="px-6 py-3 font-medium">Worker Name</th>
                                <th className="px-6 py-3 font-medium">Farm</th>
                                <th className="px-6 py-3 font-medium">Assignment</th>
                                <th className="px-6 py-3 font-medium">Rate</th>
                                <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#dfe9de]">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-10 text-center text-[#647260]">Loading employees...</td></tr>
                            ) : employees.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-10 text-center text-[#647260]">No employees assigned yet.</td></tr>
                            ) : (
                                employees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-[#fcfdfc] transition">
                                        <td className="px-6 py-4 font-medium text-[#172316]">
                                            {emp.user?.name}
                                            <span className="ml-2 text-xs font-normal text-[#647260]">({emp.user?.role})</span>
                                        </td>
                                        <td className="px-6 py-4 text-[#647260]">{emp.farm?.name}</td>
                                        <td className="px-6 py-4 text-[#647260]">{emp.task_assignment || 'Not assigned'}</td>
                                        <td className="px-6 py-4 text-[#647260]">${emp.hourly_rate}/hr</td>
                                        <td className="px-6 py-4 text-right space-x-3">
                                            <button
                                                onClick={() => handleOpenModal(emp)}
                                                className="text-blue-600 hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(emp.id)}
                                                className="text-red-600 hover:underline"
                                            >
                                                Remove
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
                                {editingEmployee ? 'Edit Employee' : 'Assign Employee to Farm'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Select User</label>
                                    <select
                                        className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                        value={form.user_id}
                                        onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Choose a user...</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Assign to Farm</label>
                                    <select
                                        className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                        value={form.farm_id}
                                        onChange={(e) => setForm({ ...form, farm_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Choose a farm...</option>
                                        {farms.map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Task Assignment</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                        placeholder="e.g. Irrigation Operator, Harvester"
                                        value={form.task_assignment}
                                        onChange={(e) => setForm({ ...form, task_assignment: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Hourly Rate ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                        value={form.hourly_rate}
                                        onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
                                        required
                                    />
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
                                        {editingEmployee ? 'Update Employee' : 'Assign Employee'}
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
