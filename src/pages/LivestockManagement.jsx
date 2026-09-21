import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function LivestockManagement() {
    const { api } = useAuth();
    const [livestock, setLivestock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAnimal, setEditingAnimal] = useState(null);
    const [form, setForm] = useState({
        farm_id: '',
        tag_number: '',
        species: '',
        breed: '',
        sex: 'Male',
        birth_date: '',
        status: 'Active',
        current_weight_kg: '',
    });

    useEffect(() => {
        fetchLivestock();
    }, []);

    async function fetchLivestock() {
        setLoading(true);
        try {
            const response = await api.get('/api/livestock');
            setLivestock(response.data.data ?? response.data);
        } catch (err) {
            setError('Failed to fetch livestock records.');
        } finally {
            setLoading(false);
        }
    }

    function handleOpenModal(animal = null) {
        if (animal) {
            setEditingAnimal(animal);
            setForm({
                farm_id: animal.farm_id,
                tag_number: animal.tag_number,
                species: animal.species,
                breed: animal.breed || '',
                sex: animal.sex,
                birth_date: animal.birth_date || '',
                status: animal.status,
                current_weight_kg: animal.current_weight_kg || '',
            });
        } else {
            setEditingAnimal(null);
            setForm({
                farm_id: '',
                tag_number: '',
                species: '',
                breed: '',
                sex: 'Male',
                birth_date: '',
                status: 'Active',
                current_weight_kg: '',
            });
        }
        setIsModalOpen(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (editingAnimal) {
                await api.put(`/api/livestock/${editingAnimal.id}`, form);
            } else {
                await api.post('/api/livestock', form);
            }
            setIsModalOpen(false);
            fetchLivestock();
        } catch (err) {
            alert(err.response?.data?.message || 'An error occurred while saving the animal.');
        }
    }

    async function handleDelete(id) {
        if (window.confirm('Are you sure you want to delete this animal record? This will also remove its vaccination, health, and breeding history.')) {
            try {
                await api.delete(`/api/livestock/${id}`);
                fetchLivestock();
            } catch (err) {
                alert('Failed to delete livestock record.');
            }
        }
    }

    return (
        <main className="min-h-screen bg-[#f7faf7] px-6 py-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-[#172316]">Livestock Management</h1>
                        <p className="text-sm text-[#647260]">Register and track animals, vaccinations, and health records.</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="rounded-md bg-[#315f2b] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#264b22]"
                    >
                        + Add New Animal
                    </button>
                </div>

                {error && <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

                <div className="overflow-hidden rounded-lg border border-[#dfe9de] bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#fcfdfc] text-[#647260] uppercase">
                            <tr>
                                <th className="px-6 py-3 font-medium">Tag Number</th>
                                <th className="px-6 py-3 font-medium">Species</th>
                                <th className="px-6 py-3 font-medium">Breed</th>
                                <th className="px-6 py-3 font-medium">Sex</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium">Weight (kg)</th>
                                <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#dfe9de]">
                            {loading ? (
                                <tr><td colSpan="7" className="px-6 py-10 text-center text-[#647260]">Loading livestock...</td></tr>
                            ) : livestock.length === 0 ? (
                                <tr><td colSpan="7" className="px-6 py-10 text-center text-[#647260]">No animals registered yet.</td></tr>
                            ) : (
                                livestock.map((animal) => (
                                    <tr key={animal.id} className="hover:bg-[#fcfdfc] transition">
                                        <td className="px-6 py-4 font-medium text-[#172316]">{animal.tag_number}</td>
                                        <td className="px-6 py-4 text-[#647260]">{animal.species}</td>
                                        <td className="px-6 py-4 text-[#647260]">{animal.breed || 'Not set'}</td>
                                        <td className="px-6 py-4 text-[#647260]">{animal.sex}</td>
                                        <td className="px-6 py-4">
                                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                                                animal.status === 'Active' ? 'bg-green-100 text-green-800' :
                                                animal.status === 'Sold' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {animal.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-[#647260]">{animal.current_weight_kg || '—'}</td>
                                        <td className="px-6 py-4 text-right space-x-3">
                                            <button
                                                onClick={() => handleOpenModal(animal)}
                                                className="text-blue-600 hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(animal.id)}
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
                        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                            <h2 className="mb-6 text-xl font-semibold text-[#172316]">
                                {editingAnimal ? 'Edit Animal' : 'Register New Animal'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Farm ID</label>
                                    <input
                                        type="number"
                                        className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                        value={form.farm_id}
                                        onChange={(e) => setForm({ ...form, farm_id: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Tag Number</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                        value={form.tag_number}
                                        onChange={(e) => setForm({ ...form, tag_number: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Species</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                        placeholder="e.g. Cattle, Goat, Poultry"
                                        value={form.species}
                                        onChange={(e) => setForm({ ...form, species: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Breed</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                        value={form.breed}
                                        onChange={(e) => setForm({ ...form, breed: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Sex</label>
                                    <select
                                        className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                        value={form.sex}
                                        onChange={(e) => setForm({ ...form, sex: e.target.value })}
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Birth Date</label>
                                    <input
                                        type="date"
                                        className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                        value={form.birth_date}
                                        onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Status</label>
                                    <select
                                        className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                        value={form.status}
                                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Sold">Sold</option>
                                        <option value="Deceased">Deceased</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Current Weight (kg)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                        value={form.current_weight_kg}
                                        onChange={(e) => setForm({ ...form, current_weight_kg: e.target.value })}
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
                                        {editingAnimal ? 'Update Animal' : 'Register Animal'}
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
