
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  field_id: '',
  crop_id: '',
  planting_date: '',
  expected_harvest_date: '',
  quantity_planted: '',
  unit: 'kg',
  status: 'planned',
  notes: '',
};

const statuses = [
  'planned',
  'planted',
  'growing',
  'harvested',
  'failed',
];

function formatDate(value) {
  if (!value) return 'Not set';
  return String(value).slice(0, 10);
}

function getErrorMessage(error) {
  const errors = error.response?.data?.errors;

  if (errors) {
    return Object.values(errors).flat().join(' ');
  }

  return error.response?.data?.message || 'Something went wrong.';
}

export default function PlantingManagement() {
  const { api } = useAuth();

  const [plantings, setPlantings] = useState([]);
  const [crops, setCrops] = useState([]);
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [plantingsResponse, cropsResponse, fieldsResponse] =
        await Promise.all([
          api.get('/api/plantings'),
          api.get('/api/crops'),
          api.get('/api/fields'),
        ]);

      const plantingData = plantingsResponse.data;
      const cropData = cropsResponse.data;
      const fieldData = fieldsResponse.data;

      setPlantings(
        Array.isArray(plantingData)
          ? plantingData
          : plantingData.data || []
      );

      setCrops(
        Array.isArray(cropData)
          ? cropData
          : cropData.data || []
      );

      setFields(
        Array.isArray(fieldData)
          ? fieldData
          : fieldData.data || []
      );
    } catch (err) {
      setError(
        'Could not load planting, crop or field records. ' +
        getErrorMessage(err)
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

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
    setSuccess('');
  }

  function handleEdit(planting) {
    setEditingId(planting.id);

    setForm({
      field_id: String(planting.field_id ?? planting.field?.id ?? ''),
      crop_id: String(planting.crop_id ?? planting.crop?.id ?? ''),
      planting_date: formatDate(planting.planting_date),
      expected_harvest_date: planting.expected_harvest_date
        ? formatDate(planting.expected_harvest_date)
        : '',
      quantity_planted: planting.quantity_planted ?? '',
      unit: planting.unit || 'kg',
      status: planting.status || 'planned',
      notes: planting.notes || '',
    });

    setError('');
    setSuccess('');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (
      form.expected_harvest_date &&
      form.expected_harvest_date < form.planting_date
    ) {
      setError('Expected harvest date cannot be before the planting date.');
      return;
    }

    const payload = {
      ...form,
      field_id: Number(form.field_id),
      crop_id: Number(form.crop_id),
      quantity_planted:
        form.quantity_planted === ''
          ? null
          : Number(form.quantity_planted),
      expected_harvest_date: form.expected_harvest_date || null,
      unit: form.unit || null,
      notes: form.notes || null,
    };

    setSaving(true);

    try {
      if (editingId) {
        await api.put(`/api/plantings/${editingId}`, payload);
        setSuccess('Planting schedule updated successfully.');
      } else {
        await api.post('/api/plantings', payload);
        setSuccess('Planting schedule created successfully.');
      }

      setForm(emptyForm);
      setEditingId(null);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(planting) {
    const confirmed = window.confirm(
      `Delete the planting schedule for ${
        planting.crop?.name || 'this crop'
      }?`
    );

    if (!confirmed) return;

    setError('');
    setSuccess('');

    try {
      await api.delete(`/api/plantings/${planting.id}`);

      setSuccess('Planting schedule deleted successfully.');

      if (editingId === planting.id) {
        resetForm();
      }

      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const filteredPlantings = plantings.filter((planting) => {
    const text = [
      planting.crop?.name,
      planting.field?.name,
      planting.status,
      planting.notes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return text.includes(search.toLowerCase());
  });

  const activeCount = plantings.filter(
    (item) => ['planned', 'planted', 'growing'].includes(item.status)
  ).length;

  const harvestedCount = plantings.filter(
    (item) => item.status === 'harvested'
  ).length;

  const failedCount = plantings.filter(
    (item) => item.status === 'failed'
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
            Crop production
          </p>

          <h1 className="mt-1 text-3xl font-bold text-gray-900">
            Planting Management
          </h1>

          <p className="mt-2 text-gray-600">
            Schedule plantings and monitor their progress from planting
            to harvest.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            {success}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total plantings', value: plantings.length },
            { label: 'Active schedules', value: activeCount },
            { label: 'Harvested', value: harvestedCount },
            { label: 'Failed plantings', value: failedCount },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {card.value}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingId ? 'Edit planting schedule' : 'Register a planting'}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Select a crop and field already registered in the system.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="crop_id"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Crop *
                </label>

                <select
                  id="crop_id"
                  name="crop_id"
                  value={form.crop_id}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5"
                >
                  <option value="">Select a crop</option>
                  {crops.map((crop) => (
                    <option key={crop.id} value={crop.id}>
                      {crop.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="field_id"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Field *
                </label>

                <select
                  id="field_id"
                  name="field_id"
                  value={form.field_id}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5"
                >
                  <option value="">Select a field</option>
                  {fields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                      {field.farm?.name ? ` — ${field.farm.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="planting_date"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Planting date *
                </label>

                <input
                  id="planting_date"
                  name="planting_date"
                  type="date"
                  value={form.planting_date}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
                />
              </div>

              <div>
                <label
                  htmlFor="expected_harvest_date"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Expected harvest date
                </label>

                <input
                  id="expected_harvest_date"
                  name="expected_harvest_date"
                  type="date"
                  min={form.planting_date || undefined}
                  value={form.expected_harvest_date}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
                />
              </div>

              <div>
                <label
                  htmlFor="quantity_planted"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Quantity planted
                </label>

                <input
                  id="quantity_planted"
                  name="quantity_planted"
                  type="number"
                  min="0"
                  step="any"
                  value={form.quantity_planted}
                  onChange={handleChange}
                  placeholder="e.g. 25"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
                />
              </div>

              <div>
                <label
                  htmlFor="unit"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Quantity unit
                </label>

                <input
                  id="unit"
                  name="unit"
                  maxLength={50}
                  value={form.unit}
                  onChange={handleChange}
                  placeholder="e.g. kg, seeds, seedlings"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
                />
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Status
                </label>

                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="notes"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Notes
                </label>

                <textarea
                  id="notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Add planting instructions or observations..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving || crops.length === 0 || fields.length === 0}
                className="rounded-lg bg-green-700 px-5 py-2.5 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? 'Saving...'
                  : editingId
                    ? 'Update planting'
                    : 'Save planting'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel edit
                </button>
              )}
            </div>

            {(crops.length === 0 || fields.length === 0) && !loading && (
              <p className="text-sm text-amber-700">
                You need at least one registered crop and one registered
                field before saving a planting.
              </p>
            )}
          </form>
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Planting schedules
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Review and manage recorded planting activities.
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search crop, field or status..."
              aria-label="Search planting schedules"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 sm:max-w-xs"
            />
          </div>

          {loading ? (
            <p className="p-6 text-gray-500">Loading planting records...</p>
          ) : filteredPlantings.length === 0 ? (
            <p className="p-6 text-gray-500">
              No planting schedules found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Crop</th>
                    <th className="px-4 py-3 font-semibold">Field</th>
                    <th className="px-4 py-3 font-semibold">Planted</th>
                    <th className="px-4 py-3 font-semibold">Expected harvest</th>
                    <th className="px-4 py-3 font-semibold">Quantity</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredPlantings.map((planting) => (
                    <tr key={planting.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                        {planting.crop?.name || 'Unknown crop'}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {planting.field?.name || 'Unknown field'}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {formatDate(planting.planting_date)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {formatDate(planting.expected_harvest_date)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {planting.quantity_planted ?? '—'}{' '}
                        {planting.unit || ''}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold capitalize text-gray-700">
                          {planting.status || 'planned'}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => handleEdit(planting)}
                            className="font-semibold text-blue-700 hover:text-blue-900"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(planting)}
                            className="font-semibold text-red-700 hover:text-red-900"
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

          <div className="border-t border-gray-200 px-5 py-3 text-xs text-gray-500">
            The list currently displays the records returned by the first API
            page (up to 25). Pagination controls can be added if needed.
          </div>
        </section>
      </div>
    </div>
  );
}
