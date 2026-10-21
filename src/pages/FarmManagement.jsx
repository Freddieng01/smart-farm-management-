import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import FarmLocationPicker from '../components/FarmLocationPicker.jsx';

export default function FarmManagement() {
    const { api, user } = useAuth();
    const navigate = useNavigate();
    const [farms, setFarms] = useState([]);
    const [owners, setOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFarm, setEditingFarm] = useState(null);
    const [form, setForm] = useState({
        name: '',
        latitude: null,
        longitude: null,
        total_acreage: '',
        owner_id: '',
    });

    useEffect(() => {
        fetchFarms();
    }, []);

    async function fetchFarms() {
        setLoading(true);
        try {
            const [farmResponse, ownerResponse] = await Promise.all([
                api.get('/api/farms'),
                api.get('/api/farm-owners'),
            ]);
            setFarms(farmResponse.data.data);
            setOwners(ownerResponse.data.data);
        } catch (err) {
            setError('Failed to fetch farms.');
        } finally {
            setLoading(false);
        }
    }

    function handleOpenModal(farm = null) {
        if (farm) {
            setEditingFarm(farm);
            setForm({
                name: farm.name,
                latitude: farm.latitude ?? parseLegacyCoordinate(farm.location_gps, 0),
                longitude: farm.longitude ?? parseLegacyCoordinate(farm.location_gps, 1),
                total_acreage: farm.total_acreage,
                owner_id: farm.owner_id ?? '',
            });
        } else {
            setEditingFarm(null);
            setForm({ name: '', latitude: null, longitude: null, total_acreage: '', owner_id: '' });
        }
        setIsModalOpen(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (form.latitude === null || form.latitude === undefined
            || form.longitude === null || form.longitude === undefined
            || !Number.isFinite(Number(form.latitude)) || !Number.isFinite(Number(form.longitude))) {
            alert('Place your farm on the map before saving.');
            return;
        }

        try {
            const farmData = {
                name: form.name,
                owner_id: form.owner_id,
                latitude: form.latitude,
                longitude: form.longitude,
                ...(form.total_acreage !== '' && form.total_acreage !== null
                    ? { total_acreage: form.total_acreage }
                    : {}),
            };

            if (editingFarm) {
                await api.put(`/api/farms/${editingFarm.id}`, farmData);
            } else {
                await api.post('/api/farms', farmData);
            }
            setIsModalOpen(false);
            fetchFarms();
        } catch (err) {
            alert(err.response?.data?.message || 'An error occurred while saving the farm.');
        }
    }

    async function handleDelete(id) {
        if (window.confirm('Are you sure you want to delete this farm? This will also remove all associated fields.')) {
            try {
                await api.delete(`/api/farms/${id}`);
                fetchFarms();
            } catch (err) {
                alert('Failed to delete farm.');
            }
        }
    }

    return (
        <main className="min-h-screen bg-[#f7faf7] px-6 py-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-[#172316]">Farm Management</h1>
                        <p className="text-sm text-[#647260]">Register and manage your farm locations and profiles.</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="rounded-md bg-[#315f2b] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#264b22]"
                    >
                        + Add New Farm
                    </button>
                </div>

                {error && <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

                <div className="overflow-hidden rounded-lg border border-[#dfe9de] bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#fcfdfc] text-[#647260] uppercase">
                            <tr>
                                <th className="px-6 py-3 font-medium">Farm Name</th>
                                <th className="px-6 py-3 font-medium">Farm Owner</th>
                                <th className="px-6 py-3 font-medium">Mapped Location</th>
                                <th className="px-6 py-3 font-medium">Acreage</th>
                                <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#dfe9de]">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-10 text-center text-[#647260]">Loading farms...</td></tr>
                            ) : farms.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-10 text-center text-[#647260]">No farms registered yet.</td></tr>
                            ) : (
                                farms.map((farm) => (
                                    <tr key={farm.id} className="hover:bg-[#fcfdfc] transition">
                                        <td className="px-6 py-4 font-medium text-[#172316]">{farm.name}</td>
                                        <td className="px-6 py-4 text-[#647260]">{farm.owner?.name || 'Not assigned'}</td>
                                        <td className="px-6 py-4 text-[#647260]">{hasFarmLocation(farm) ? 'Mapped' : 'Not mapped'}</td>
                                        <td className="px-6 py-4 text-[#647260]">{farm.total_acreage} ac</td>
                                        <td className="px-6 py-4 text-right space-x-3">
                                            <button
                                                onClick={() => navigate(`/farms/${farm.id}/fields`)}
                                                className="text-[#315f2b] hover:underline"
                                            >
                                                Manage Fields
                                            </button>
                                            <button
                                                onClick={() => handleOpenModal(farm)}
                                                className="text-blue-600 hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(farm.id)}
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
                        <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
                            <h2 className="mb-6 text-xl font-semibold text-[#172316]">
                                {editingFarm ? 'Edit Farm' : 'Register New Farm'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Farm Name</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Farm Owner</label>
                                    <select
                                        className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                        value={form.owner_id}
                                        onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Choose a farm owner...</option>
                                        {owners.map(owner => (
                                            <option key={owner.id} value={owner.id}>{owner.name} ({owner.email})</option>
                                        ))}
                                    </select>
                                    {owners.length === 0 && (
                                        <p className="mt-1 text-xs text-red-600">Invite a user with the Farm-owner role before creating a farm.</p>
                                    )}
                                </div>
                                <FarmLocationPicker
                                    latitude={form.latitude}
                                    longitude={form.longitude}
                                    onLocationChange={([latitude, longitude]) => setForm({ ...form, latitude, longitude })}
                                />
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Total Acreage (Optional)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20"
                                        value={form.total_acreage}
                                        onChange={(e) => setForm({ ...form, total_acreage: e.target.value })}
                                    />
                                    <p className="mt-1 text-[10px] text-[#647260]">Leave blank to calculate acreage from field polygons drawn on the map.</p>
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
                                        {editingFarm ? 'Update Farm' : 'Register Farm'}
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

function parseLegacyCoordinate(locationGps, index) {
    const coordinate = Number(locationGps?.split(',')[index]);

    return Number.isFinite(coordinate) ? coordinate : null;
}

function hasFarmLocation(farm) {
    return Number.isFinite(Number(farm.latitude ?? parseLegacyCoordinate(farm.location_gps, 0)))
        && Number.isFinite(Number(farm.longitude ?? parseLegacyCoordinate(farm.location_gps, 1)));
}
