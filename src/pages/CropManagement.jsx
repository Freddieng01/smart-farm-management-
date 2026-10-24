
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function CropManagement() {
    const { api } = useAuth();

    const [crops, setCrops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [search, setSearch] = useState('');
    const [editingCrop, setEditingCrop] = useState(null);

    const emptyForm = {
        name: '',
        category: '',
        description: '',
        maturity_days: '',
    };

    const [form, setForm] = useState(emptyForm);

    // Load crops from the Laravel API.
    const fetchCrops = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await api.get('/api/crops');

            // Laravel paginate() returns the records inside "data".
            setCrops(response.data.data || []);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Failed to load crops. Check that the backend is running.'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCrops();
    }, []);

    // Update form fields.
    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    // Register a new crop or update an existing crop.
    const handleSubmit = async (e) => {
        e.preventDefault();

        setError('');
        setSuccess('');
        setSaving(true);

        const payload = {
            name: form.name.trim(),
            category: form.category.trim() || null,
            description: form.description.trim() || null,
            maturity_days: form.maturity_days
                ? Number(form.maturity_days)
                : null,
        };

        try {
            if (editingCrop) {
                await api.put(`/api/crops/${editingCrop.id}`, payload);
                setSuccess('Crop updated successfully.');
            } else {
                await api.post('/api/crops', payload);
                setSuccess('Crop registered successfully.');
            }

            setForm(emptyForm);
            setEditingCrop(null);

            await fetchCrops();
        } catch (err) {
            const validationErrors = err.response?.data?.errors;

            if (validationErrors) {
                setError(Object.values(validationErrors).flat().join(' '));
            } else {
                setError(
                    err.response?.data?.message ||
                    'Unable to save the crop. Please try again.'
                );
            }
        } finally {
            setSaving(false);
        }
    };

    // Load a crop into the form for editing.
    const handleEdit = (crop) => {
        setEditingCrop(crop);

        setForm({
            name: crop.name || '',
            category: crop.category || '',
            description: crop.description || '',
            maturity_days: crop.maturity_days ?? '',
        });

        setError('');
        setSuccess('');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Cancel editing and clear the form.
    const handleCancelEdit = () => {
        setEditingCrop(null);
        setForm(emptyForm);
        setError('');
        setSuccess('');
    };

    // Delete a crop after confirmation.
    const handleDelete = async (crop) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${crop.name}"?`
        );

        if (!confirmed) return;

        setError('');
        setSuccess('');

        try {
            await api.delete(`/api/crops/${crop.id}`);
            setSuccess('Crop deleted successfully.');
            await fetchCrops();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to delete this crop. It may be linked to existing records.'
            );
        }
    };

    const filteredCrops = crops.filter((crop) => {
        const term = search.toLowerCase();

        return (
            crop.name?.toLowerCase().includes(term) ||
            crop.category?.toLowerCase().includes(term) ||
            crop.description?.toLowerCase().includes(term)
        );
    });

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">
                    Crop Management
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                    Register crops, manage crop information, and track
                    maturity periods.
                </p>
            </div>

            {/* Notifications */}
            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                    {error}
                </div>
            )}

            {success && (
                <div
                    role="status"
                    className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
                >
                    {success}
                </div>
            )}

            {/* Crop registration and editing form */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-800">
                    {editingCrop ? 'Edit Crop' : 'Register New Crop'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label
                                htmlFor="name"
                                className="mb-1 block text-sm font-medium text-gray-700"
                            >
                                Crop Name *
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="e.g. Maize"
                                maxLength={255}
                                required
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="category"
                                className="mb-1 block text-sm font-medium text-gray-700"
                            >
                                Category
                            </label>
                            <input
                                id="category"
                                name="category"
                                type="text"
                                value={form.category}
                                onChange={handleChange}
                                placeholder="e.g. Cereal, Legume, Vegetable"
                                maxLength={100}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="maturity_days"
                                className="mb-1 block text-sm font-medium text-gray-700"
                            >
                                Maturity Period (days)
                            </label>
                            <input
                                id="maturity_days"
                                name="maturity_days"
                                type="number"
                                min="1"
                                step="1"
                                value={form.maturity_days}
                                onChange={handleChange}
                                placeholder="e.g. 120"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label
                                htmlFor="description"
                                className="mb-1 block text-sm font-medium text-gray-700"
                            >
                                Description
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                rows="3"
                                placeholder="Enter details about this crop..."
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-lg bg-green-700 px-5 py-2 font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving
                                ? 'Saving...'
                                : editingCrop
                                  ? 'Update Crop'
                                  : 'Register Crop'}
                        </button>

                        {editingCrop && (
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="rounded-lg border border-gray-300 px-5 py-2 font-medium text-gray-700 hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </section>

            {/* Crop list */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">
                            Registered Crops
                        </h2>
                        <p className="text-sm text-gray-500">
                            Showing {filteredCrops.length} crop(s) on this page
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search crops..."
                            aria-label="Search crops"
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                        />

                        <button
                            type="button"
                            onClick={fetchCrops}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                {loading ? (
                    <p className="py-8 text-center text-gray-500">
                        Loading crops...
                    </p>
                ) : filteredCrops.length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="font-medium text-gray-700">
                            No crops found.
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                            Register a crop or change your search.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[650px] text-left text-sm">
                            <thead className="border-b bg-gray-50 text-gray-600">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">
                                        Crop Name
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Category
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Maturity (days)
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Description
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {filteredCrops.map((crop) => (
                                    <tr
                                        key={crop.id}
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="px-4 py-3 font-medium text-gray-800">
                                            {crop.name}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {crop.category || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {crop.maturity_days ?? '—'}
                                        </td>
                                        <td className="max-w-xs px-4 py-3 text-gray-600">
                                            <span className="line-clamp-2">
                                                {crop.description || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleEdit(crop)
                                                    }
                                                    className="font-medium text-blue-700 hover:underline"
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleDelete(crop)
                                                    }
                                                    className="font-medium text-red-700 hover:underline"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
