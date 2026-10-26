import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';

export default function ProductionLogging() {
    const { api } = useAuth();
    const [productions, setProductions] = useState([]);
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduction, setEditingProduction] = useState(null);
    const [form, setForm] = useState({
        field_id: '',
        crop_type: '',
        quantity: '',
        unit: 'kg',
        harvest_date: new Date().toISOString().split('T')[0],
        quality_grade: '',
    });

    useEffect(() => {
        fetchAllData();
    }, []);

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

    async function fetchAllData() {
        setLoading(true);
        try {
            const [prodRes, fields] = await Promise.all([
                api.get('/api/crop-productions'),
                fetchAllFields(),
            ]);
            setProductions(prodRes.data.data);
            setFields(fields);
        } catch (err) {
            setError('Failed to load production data.');
        } finally {
            setLoading(false);
        }
    }

    function handleOpenModal(prod = null) {
        if (prod) {
            setEditingProduction(prod);
            setForm({
                field_id: prod.field_id,
                crop_type: prod.crop_type,
                quantity: prod.quantity,
                unit: prod.unit,
                harvest_date: prod.harvest_date,
                quality_grade: prod.quality_grade || '',
            });
        } else {
            setEditingProduction(null);
            setForm({
                field_id: '',
                crop_type: '',
                quantity: '',
                unit: 'kg',
                harvest_date: new Date().toISOString().split('T')[0],
                quality_grade: '',
            });
        }
        setIsModalOpen(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (editingProduction) {
                await api.put(`/api/crop-productions/${editingProduction.id}`, form);
            } else {
                await api.post('/api/crop-productions', form);
            }
            setIsModalOpen(false);
            fetchAllData();
        } catch (err) {
            alert(err.response?.data?.message || 'An error occurred while saving production.');
        }
    }

    async function handleDelete(id) {
        if (window.confirm('Are you sure you want to delete this production record?')) {
            try {
                await api.delete(`/api/crop-productions/${id}`);
                fetchAllData();
            } catch (err) {
                alert('Failed to delete record.');
            }
        }
    }

    return (
        <ModuleLayout
          title="Crop Production Logging"
          subtitle="Record actual harvests and production quantities by field."
          actions={<>
<button
                        onClick={() => handleOpenModal()}
                        className="rounded-full bg-harvest-400 px-5 py-2 text-sm font-medium text-farm-900 transition hover:bg-harvest-500 disabled:opacity-60"
                    >
                        + Log Production
                    </button>
          </>}
        >
            <div className="mx-auto max-w-7xl">

                {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

                <div className="overflow-hidden rounded-3xl bg-white shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-farm-50 text-farm-700 text-xs">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Date</th>
                                <th className="px-6 py-3 font-semibold">Field</th>
                                <th className="px-6 py-3 font-semibold">Crop</th>
                                <th className="px-6 py-3 font-semibold">Quantity</th>
                                <th className="px-6 py-3 font-semibold">Grade</th>
                                <th className="px-6 py-3 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-farm-100">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-500">Loading production...</td></tr>
                            ) : productions.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-500">No production records yet.</td></tr>
                            ) : (
                                productions.map((prod) => (
                                    <tr key={prod.id} className="hover:bg-farm-50 transition">
                                        <td className="px-6 py-4 text-slate-500">{prod.harvest_date}</td>
                                        <td className="px-6 py-4 font-medium text-farm-900">{prod.field?.name}</td>
                                        <td className="px-6 py-4 text-slate-500">{prod.crop_type}</td>
                                        <td className="px-6 py-4 text-slate-500">{prod.quantity} {prod.unit}</td>
                                        <td className="px-6 py-4 text-slate-500">{prod.quality_grade || 'N/A'}</td>
                                        <td className="px-6 py-4 text-right space-x-3">
                                            <button
                                                onClick={() => handleOpenModal(prod)}
                                                className="text-farm-700 hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(prod.id)}
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
                                {editingProduction ? 'Edit Production' : 'Log Production'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Field</label>
                                    <select
                                        className="mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20"
                                        value={form.field_id}
                                        onChange={(e) => setForm({ ...form, field_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Choose a field...</option>
                                        {fields.map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Crop Type</label>
                                    <input
                                        className="mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20"
                                        placeholder="e.g. Maize, Soybeans"
                                        value={form.crop_type}
                                        onChange={(e) => setForm({ ...form, crop_type: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-farm-900">Quantity</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20"
                                            value={form.quantity}
                                            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-farm-900">Unit</label>
                                        <select
                                            className="mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20"
                                            value={form.unit}
                                            onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                            required
                                        >
                                            <option value="kg">Kilograms (kg)</option>
                                            <option value="tons">Tons</option>
                                            <option value="bags">Bags</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Harvest Date</label>
                                    <input
                                        type="date"
                                        className="mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20"
                                        value={form.harvest_date}
                                        onChange={(e) => setForm({ ...form, harvest_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Quality Grade</label>
                                    <input
                                        className="mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20"
                                        placeholder="e.g. Grade A, Premium"
                                        value={form.quality_grade}
                                        onChange={(e) => setForm({ ...form, quality_grade: e.target.value })}
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
                                        {editingProduction ? 'Update Record' : 'Log Production'}
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
