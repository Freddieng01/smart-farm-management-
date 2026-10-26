import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate, useParams } from 'react-router-dom';
import ModuleLayout from '../components/ModuleLayout.jsx';

export default function FieldManagement() {
    const { api } = useAuth();
    const navigate = useNavigate();
    const { farmId } = useParams();
    const [farm, setFarm] = useState(null);
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [form, setForm] = useState({
        name: '',
        soil_type: '',
        size_hectares: '',
    });

    useEffect(() => {
        fetchFarmAndFields();
    }, [farmId]);

    async function fetchFarmAndFields() {
        setLoading(true);
        try {
            const [farmRes, fieldsRes] = await Promise.all([
                api.get(`/api/farms/${farmId}`),
                api.get(`/api/farms/${farmId}/fields`),
            ]);
            setFarm(farmRes.data.data);
            setFields(fieldsRes.data.data);
        } catch (err) {
            setError('Failed to load farm or field data.');
        } finally {
            setLoading(false);
        }
    }

    function handleOpenModal(field = null) {
        if (field) {
            setEditingField(field);
            setForm({
                name: field.name,
                soil_type: field.soil_type || '',
                size_hectares: field.size_hectares,
            });
        } else {
            setEditingField(null);
            setForm({ name: '', soil_type: '', size_hectares: '' });
        }
        setIsModalOpen(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (editingField) {
                await api.put(`/api/fields/${editingField.id}`, form);
            } else {
                await api.post(`/api/farms/${farmId}/fields`, form);
            }
            setIsModalOpen(false);
            fetchFarmAndFields();
        } catch (err) {
            alert(err.response?.data?.message || 'An error occurred while saving the field.');
        }
    }

    async function handleDelete(id) {
        if (window.confirm('Are you sure you want to delete this field?')) {
            try {
                await api.delete(`/api/fields/${id}`);
                fetchFarmAndFields();
            } catch (err) {
                alert('Failed to delete field.');
            }
        }
    }

    return (
        <ModuleLayout
          title={<>{farm?.name || 'Loading...'} Fields</>}
          subtitle="Manage plots, soil types, and sizes for this farm."
          actions={<>
<button type="button" onClick={() => navigate('/farms')} className="rounded-full bg-white/15 px-5 py-2 text-sm font-medium text-white ring-1 ring-white/30 transition hover:bg-white/25 disabled:opacity-60">Back to Farms</button>
<button type="button" onClick={() => handleOpenModal()} className="rounded-full bg-harvest-400 px-5 py-2 text-sm font-medium text-farm-900 transition hover:bg-harvest-500 disabled:opacity-60">+ Add New Field</button>
          </>}
        >
            <div className="mx-auto max-w-7xl">

                {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

                <div className="overflow-hidden rounded-3xl bg-white shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-farm-50 text-farm-700 text-xs">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Field Name</th>
                                <th className="px-6 py-3 font-semibold">Soil Type</th>
                                <th className="px-6 py-3 font-semibold">Size (Hectares)</th>
                                <th className="px-6 py-3 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-farm-100">
                            {loading ? (
                                <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-500">Loading fields...</td></tr>
                            ) : fields.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-500">No fields registered for this farm.</td></tr>
                            ) : (
                                fields.map((field) => (
                                    <tr key={field.id} className="hover:bg-farm-50 transition">
                                        <td className="px-6 py-4 font-medium text-farm-900">{field.name}</td>
                                        <td className="px-6 py-4 text-slate-500">{field.soil_type || 'Not specified'}</td>
                                        <td className="px-6 py-4 text-slate-500">{field.size_hectares} ha</td>
                                        <td className="px-6 py-4 text-right space-x-3">
                                            <button
                                                onClick={() => handleOpenModal(field)}
                                                className="text-farm-700 hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(field.id)}
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
                        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
                            <h2 className="mb-6 text-xl font-semibold text-farm-900">
                                {editingField ? 'Edit Field' : 'Register New Field'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Field Name</label>
                                    <input
                                        className="mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Soil Type</label>
                                    <input
                                        className="mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20"
                                        placeholder="e.g. Clay Loam, Sandy Loam"
                                        value={form.soil_type}
                                        onChange={(e) => setForm({ ...form, soil_type: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Size (Hectares)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20"
                                        value={form.size_hectares}
                                        onChange={(e) => setForm({ ...form, size_hectares: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="rounded-full border border-farm-200 px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-farm-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-full bg-farm-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-farm-800"
                                    >
                                        {editingField ? 'Update Field' : 'Register Field'}
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
