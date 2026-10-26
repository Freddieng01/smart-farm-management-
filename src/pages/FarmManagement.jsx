import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import FarmLocationPicker from '../components/FarmLocationPicker.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';

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
                user?.role === 'Admin' ? api.get('/api/farm-owners') : Promise.resolve({ data: { data: [] } }),
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
                latitude: form.latitude,
                longitude: form.longitude,
                ...(form.total_acreage !== '' && form.total_acreage !== null
                    ? { total_acreage: form.total_acreage }
                    : {}),
                ...(user?.role === 'Admin' ? { owner_id: form.owner_id } : {}),
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
        <ModuleLayout
          title="Farm Management"
          subtitle="Register and manage your farm locations and profiles."
          actions={<>
{['Admin', 'Farm-owner'].includes(user?.role) && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="rounded-full bg-harvest-400 px-5 py-2 text-sm font-medium text-farm-900 transition hover:bg-harvest-500 disabled:opacity-60"
                        >
                            + Add New Farm
                        </button>
                    )}
          </>}
        >
            <div className="mx-auto max-w-7xl">

                {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

                <div className="overflow-hidden rounded-3xl bg-white shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-farm-50 text-farm-700 text-xs">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Farm Name</th>
                                <th className="px-6 py-3 font-semibold">Farm Owner</th>
                                <th className="px-6 py-3 font-semibold">Mapped Location</th>
                                <th className="px-6 py-3 font-semibold">Acreage</th>
                                <th className="px-6 py-3 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-farm-100">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500">Loading farms...</td></tr>
                            ) : farms.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500">No farms registered yet.</td></tr>
                            ) : (
                                farms.map((farm) => (
                                    <tr key={farm.id} className="hover:bg-farm-50 transition">
                                        <td className="px-6 py-4 font-medium text-farm-900">{farm.name}</td>
                                        <td className="px-6 py-4 text-slate-500">{farm.owner?.name || 'Not assigned'}</td>
                                        <td className="px-6 py-4 text-slate-500">{hasFarmLocation(farm) ? 'Mapped' : 'Not mapped'}</td>
                                        <td className="px-6 py-4 text-slate-500">{farm.total_acreage} ac</td>
                                        <td className="px-6 py-4 text-right space-x-3">
                                            <button
                                                onClick={() => navigate(`/farms/${farm.id}/fields`)}
                                                className="text-farm-700 hover:underline"
                                            >
                                                Manage Fields
                                            </button>
                                            {['Admin', 'Farm-owner', 'Manager'].includes(user?.role) && (
                                                <button
                                                    onClick={() => handleOpenModal(farm)}
                                                    className="text-farm-700 hover:underline"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                            {user?.role === 'Admin' && (
                                                <button
                                                    onClick={() => handleDelete(farm.id)}
                                                    className="text-red-600 hover:underline"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                        <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl">
                            <h2 className="mb-6 text-xl font-semibold text-farm-900">
                                {editingFarm ? 'Edit Farm' : 'Register New Farm'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Farm Name</label>
                                    <input
                                        className="mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                </div>
                                {user?.role === 'Admin' && <div>
                                    <label className="block text-sm font-medium text-farm-900">Farm Owner</label>
                                    <select
                                        className="mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20"
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
                                </div>}
                                <FarmLocationPicker
                                    latitude={form.latitude}
                                    longitude={form.longitude}
                                    onLocationChange={([latitude, longitude]) => setForm({ ...form, latitude, longitude })}
                                />
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Total Acreage (Optional)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20"
                                        value={form.total_acreage}
                                        onChange={(e) => setForm({ ...form, total_acreage: e.target.value })}
                                    />
                                    <p className="mt-1 text-[10px] text-slate-500">Leave blank to calculate acreage from field polygons drawn on the map.</p>
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
                                        {editingFarm ? 'Update Farm' : 'Register Farm'}
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

function parseLegacyCoordinate(locationGps, index) {
    const coordinate = Number(locationGps?.split(',')[index]);

    return Number.isFinite(coordinate) ? coordinate : null;
}

function hasFarmLocation(farm) {
    return Number.isFinite(Number(farm.latitude ?? parseLegacyCoordinate(farm.location_gps, 0)))
        && Number.isFinite(Number(farm.longitude ?? parseLegacyCoordinate(farm.location_gps, 1)));
}
