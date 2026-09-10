import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate, useParams } from 'react-router-dom';

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
        <main className="min-h-screen bg-[#f7faf7] px-6 py-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/farms')}
                            className="rounded-md border border-[#cbd8ca] bg-white px-3 py-1 text-sm font-medium text-[#647260] transition hover:bg-[#fcfdfc]"
                        >
                            ← Back to Farms
                        </button>
                        <div>
                            <h1 className="text-2xl font-semibold text-[#172316]">
                                {farm?.name || 'Loading...'} Fields
                            </h1>
                            <p className="text-sm text-[#647260]">Manage plots, soil types, and sizes for this farm.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="rounded-md bg-[#315f2b] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#264b22]"
                    >
                        + Add New Field
                    </button>
                </div>

                {error && <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

                <div className="overflow-hidden rounded-lg border border-[#dfe9de] bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#fcfdfc] text-[#647260] uppercase">
                            <tr>
                                <th className="px-6 py-3 font-medium">Field Name</th>
                                <th className="px-6 py-3 font-medium">Soil Type</th>
                                <th className="px-6 py-3 font-medium">Size (Hectares)</th>
                                <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#dfe9de]">
                            {loading ? (
                                <tr><td colSpan="4" className="px-6 py-10 text-center text-[#647260]">Loading fields...</td></tr>
                            ) : fields.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-10 text-center text-[#647260]">No fields registered for this farm.</td></tr>
                            ) : (
                                fields.map((field) => (
                                    <tr key={field.id} className="hover:bg-[#fcfdfc] transition">
                                        <td className="px-6 py-4 font-medium text-[#172316]">{field.name}</td>
                                        <td className="px-6 py-4 text-[#647260]">{field.soil_type || 'Not specified'}</td>
                                        <td className="px-6 py-4 text-[#647260]">{field.size_hectares} ha</td>
                                        <td className="px-6 py-4 text-right space-x-3">
                                            <button
                                                onClick={() => handleOpenModal(field)}
                                                className="text-blue-600 hover:underline"
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
                        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                            <h2 className="mb-6 text-xl font-semibold text-[#172316]">
                                {editingField ? 'Edit Field' : 'Register New Field'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Field Name</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Soil Type</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                        placeholder="e.g. Clay Loam, Sandy Loam"
                                        value={form.soil_type}
                                        onChange={(e) => setForm({ ...form, soil_type: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Size (Hectares)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                        value={form.size_hectares}
                                        onChange={(e) => setForm({ ...form, size_hectares: e.target.value })}
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
                                        {editingField ? 'Update Field' : 'Register Field'}
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
