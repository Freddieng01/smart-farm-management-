
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = {
    farm_id: '',
    name: '',
    type: 'Borehole',
    location: '',
    capacity: '',
    status: 'Active',
    notes: '',
};

export default function WaterSourceManagement() {
    const { api } = useAuth();

    const [waterSources, setWaterSources] = useState([]);
    const [farms, setFarms] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    async function loadData() {
        setLoading(true);
        setError('');

        try {
            const [sourcesResponse, farmsResponse] = await Promise.all([
                api.get('/api/water-sources'),
                api.get('/api/farms'),
            ]);

            const sourcesData = sourcesResponse.data;
            const farmsData = farmsResponse.data;

            setWaterSources(
                Array.isArray(sourcesData)
                    ? sourcesData
                    : sourcesData.data || []
            );

            setFarms(
                Array.isArray(farmsData)
                    ? farmsData
                    : farmsData.data || []
            );
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to load water sources or farms. Check your API connection.'
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    function resetForm() {
        setForm(emptyForm);
        setEditingId(null);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        const payload = {
            ...form,
            farm_id: Number(form.farm_id),
            capacity: form.capacity === '' ? null : Number(form.capacity),
        };

        try {
            if (editingId) {
                await api.put(`/api/water-sources/${editingId}`, payload);
                setSuccess('Water source updated successfully.');
            } else {
                await api.post('/api/water-sources', payload);
                setSuccess('Water source registered successfully.');
            }

            resetForm();
            await loadData();
        } catch (err) {
            const validationErrors = err.response?.data?.errors;

            setError(
                validationErrors
                    ? Object.values(validationErrors).flat().join(' ')
                    : err.response?.data?.message ||
                      'Unable to save the water source.'
            );
        } finally {
            setSaving(false);
        }
    }

    function handleEdit(source) {
        setEditingId(source.id);

        setForm({
            farm_id: String(source.farm_id),
            name: source.name || '',
            type: source.type || 'Other',
            location: source.location || '',
            capacity: source.capacity ?? '',
            status: source.status || 'Active',
            notes: source.notes || '',
        });

        setError('');
        setSuccess('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function handleDelete(source) {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${source.name}"?`
        );

        if (!confirmed) return;

        setError('');
        setSuccess('');

        try {
            await api.delete(`/api/water-sources/${source.id}`);

            if (editingId === source.id) {
                resetForm();
            }

            setSuccess('Water source deleted successfully.');
            await loadData();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to delete this water source.'
            );
        }
    }

    function statusClass(status) {
        switch ((status || '').toLowerCase()) {
            case 'active':
                return 'bg-green-100 text-green-800';
            case 'inactive':
                return 'bg-gray-100 text-gray-700';
            case 'maintenance':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-blue-100 text-blue-800';
        }
    }

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Water Source Management
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                    Register and manage water sources available to your farms.
                </p>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {success && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                    {success}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Total Sources</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">
                        {waterSources.length}
                    </p>
                </div>

                <div className="rounded-xl border bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Active Sources</p>
                    <p className="mt-2 text-2xl font-bold text-green-700">
                        {waterSources.filter(
                            (source) =>
                                (source.status || '').toLowerCase() === 'active'
                        ).length}
                    </p>
                </div>

                <div className="rounded-xl border bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Registered Farms</p>
                    <p className="mt-2 text-2xl font-bold text-blue-700">
                        {farms.length}
                    </p>
                </div>
            </div>

            <form
                onSubmit={handleSubmit}
                className="space-y-4 rounded-xl border bg-white p-5 shadow-sm"
            >
                <h2 className="text-lg font-semibold text-gray-900">
                    {editingId ? 'Edit Water Source' : 'Register Water Source'}
                </h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Farm *
                        </label>
                        <select
                            name="farm_id"
                            value={form.farm_id}
                            onChange={handleChange}
                            required
                            className="w-full rounded-lg border border-gray-300 p-2.5"
                        >
                            <option value="">Select a farm</option>
                            {farms.map((farm) => (
                                <option key={farm.id} value={farm.id}>
                                    {farm.name}
                                </option>
                            ))}
                        </select>

                        {farms.length === 0 && !loading && (
                            <p className="mt-1 text-xs text-amber-700">
                                Register a farm before adding a water source.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Water Source Name *
                        </label>
                        <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                            maxLength={255}
                            placeholder="e.g. North Farm Borehole"
                            className="w-full rounded-lg border border-gray-300 p-2.5"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Source Type *
                        </label>
                        <select
                            name="type"
                            value={form.type}
                            onChange={handleChange}
                            required
                            className="w-full rounded-lg border border-gray-300 p-2.5"
                        >
                            <option value="Borehole">Borehole</option>
                            <option value="Well">Well</option>
                            <option value="River">River</option>
                            <option value="Dam">Dam</option>
                            <option value="Lake">Lake</option>
                            <option value="Reservoir">Reservoir</option>
                            <option value="Municipal">Municipal Supply</option>
                            <option value="Rainwater">Rainwater Harvesting</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Location
                        </label>
                        <input
                            name="location"
                            value={form.location}
                            onChange={handleChange}
                            maxLength={255}
                            placeholder="e.g. Northern boundary"
                            className="w-full rounded-lg border border-gray-300 p-2.5"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Capacity
                        </label>
                        <input
                            type="number"
                            name="capacity"
                            value={form.capacity}
                            onChange={handleChange}
                            min="0"
                            step="any"
                            placeholder="Enter capacity"
                            className="w-full rounded-lg border border-gray-300 p-2.5"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Use the same unit consistently, such as litres or m³.
                        </p>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Status
                        </label>
                        <select
                            name="status"
                            value={form.status}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 p-2.5"
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Maintenance">Maintenance</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Notes
                        </label>
                        <textarea
                            name="notes"
                            value={form.notes}
                            onChange={handleChange}
                            rows="3"
                            placeholder="Add details about water availability, quality, or maintenance."
                            className="w-full rounded-lg border border-gray-300 p-2.5"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="submit"
                        disabled={saving || farms.length === 0}
                        className="rounded-lg bg-green-700 px-5 py-2.5 font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving
                            ? 'Saving...'
                            : editingId
                                ? 'Update Water Source'
                                : 'Save Water Source'}
                    </button>

                    {editingId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                <div className="border-b p-5">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Registered Water Sources
                    </h2>
                </div>

                {loading ? (
                    <p className="p-6 text-gray-500">
                        Loading water sources...
                    </p>
                ) : waterSources.length === 0 ? (
                    <p className="p-6 text-gray-500">
                        No water sources registered yet.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {[
                                        'Name',
                                        'Farm',
                                        'Type',
                                        'Location',
                                        'Capacity',
                                        'Status',
                                        'Actions',
                                    ].map((heading) => (
                                        <th
                                            key={heading}
                                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-200">
                                {waterSources.map((source) => (
                                    <tr key={source.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                            {source.name}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {source.farm?.name || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {source.type}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {source.location || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {source.capacity ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(source.status)}`}
                                            >
                                                {source.status || 'Unspecified'}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                                            <button
                                                type="button"
                                                onClick={() => handleEdit(source)}
                                                className="mr-3 font-medium text-blue-700 hover:text-blue-900"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(source)}
                                                className="font-medium text-red-700 hover:text-red-900"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
