
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  field_id: '',
  harvest_date: '',
  estimated_quantity: '',
  unit: 'kg',
  status: 'scheduled',
  notes: '',
};

const statusStyles = {
  scheduled: 'bg-blue-100 text-blue-700',
  'in progress': 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

function getList(response) {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

export default function HarvestManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [harvests, setHarvests] = useState([]);
  const [farms, setFarms] = useState([]);
  const [fields, setFields] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [harvestResponse, farmsResponse] = await Promise.all([
        fetchData('/api/harvest-schedules'),
        fetchData('/api/farms'),
      ]);

      const harvestList = getList(harvestResponse);
      const farmList = getList(farmsResponse);

      setHarvests(harvestList);
      setFarms(farmList);

      const fieldResponses = await Promise.all(
        farmList.map((farm) =>
          fetchData(`/api/farms/${farm.id}/fields`).catch(() => ({
            data: [],
          }))
        )
      );

      const allFields = fieldResponses.flatMap((response) =>
        getList(response)
      );

      setFields(allFields);
    } catch (err) {
      setError(
        err?.message ||
          'Unable to load harvest data. Check that the backend is running.'
      );
    } finally {
      setLoading(false);
    }
  }

  // Use the configured Axios client from AuthContext when available.
  async function fetchData(url, options = {}) {
    const token = localStorage.getItem('token');

    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const validationMessage = data?.errors
        ? Object.values(data.errors).flat().join(' ')
        : '';

      throw new Error(
        validationMessage ||
          data?.message ||
          `Request failed with status ${response.status}`
      );
    }

    return { data };
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setSelectedFarm('');
    setShowForm(true);
    setError('');
    setSuccess('');
  }

  function openEditForm(harvest) {
    const fieldId = String(harvest.field_id ?? harvest.field?.id ?? '');
    const field = fields.find((item) => String(item.id) === fieldId);

    setEditingId(harvest.id);
    setSelectedFarm(field?.farm_id ? String(field.farm_id) : '');
    setForm({
      field_id: fieldId,
      harvest_date: harvest.harvest_date?.slice(0, 10) || '',
      estimated_quantity: harvest.estimated_quantity ?? '',
      unit: harvest.unit || 'kg',
      status: harvest.status || 'scheduled',
      notes: harvest.notes || '',
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        field_id: Number(form.field_id),
        harvest_date: form.harvest_date,
        estimated_quantity:
          form.estimated_quantity === ''
            ? null
            : Number(form.estimated_quantity),
        unit: form.unit,
        status: form.status,
        notes: form.notes.trim() || null,
      };

      const url = editingId
        ? `/api/harvest-schedules/${editingId}`
        : '/api/harvest-schedules';

      const response = await fetchData(url, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });

      const savedHarvest = response.data?.data ?? response.data;

      if (editingId) {
        setHarvests((current) =>
          current.map((item) =>
            item.id === editingId ? savedHarvest : item
          )
        );
        setSuccess('Harvest schedule updated successfully.');
      } else {
        setHarvests((current) => [savedHarvest, ...current]);
        setSuccess('Harvest schedule created successfully.');
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      setError(err.message || 'Unable to save harvest schedule.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(harvest) {
    const confirmed = window.confirm(
      `Delete the harvest schedule for ${
        harvest.field?.name || 'this field'
      }? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError('');
    setSuccess('');

    try {
      await fetchData(`/api/harvest-schedules/${harvest.id}`, {
        method: 'DELETE',
      });

      setHarvests((current) =>
        current.filter((item) => item.id !== harvest.id)
      );
      setSuccess('Harvest schedule deleted successfully.');
    } catch (err) {
      setError(err.message || 'Unable to delete harvest schedule.');
    }
  }

  const availableFields = fields.filter(
    (field) =>
      !selectedFarm || String(field.farm_id) === String(selectedFarm)
  );

  const filteredHarvests = harvests.filter((harvest) => {
    const searchText = search.toLowerCase();

    return (
      (harvest.field?.name || '').toLowerCase().includes(searchText) ||
      (harvest.status || '').toLowerCase().includes(searchText) ||
      (harvest.notes || '').toLowerCase().includes(searchText) ||
      (harvest.harvest_date || '').toLowerCase().includes(searchText)
    );
  });

  const total = harvests.length;
  const pending = harvests.filter(
    (item) => item.status === 'scheduled'
  ).length;
  const inProgress = harvests.filter(
    (item) => item.status === 'in progress'
  ).length;
  const completed = harvests.filter(
    (item) => item.status === 'completed'
  ).length;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Harvest Management
            </h1>
            <p className="mt-1 text-gray-600">
              Schedule, monitor, and manage farm harvests.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className="rounded-lg bg-green-700 px-4 py-2 font-medium text-white hover:bg-green-800"
            >
              + New Harvest
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
            {success}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total Schedules', value: total },
            { label: 'Scheduled', value: pending },
            { label: 'In Progress', value: inProgress },
            { label: 'Completed', value: completed },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-800">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 rounded-xl bg-white p-5 shadow-sm"
          >
            <h2 className="mb-4 text-xl font-semibold text-gray-800">
              {editingId ? 'Edit Harvest Schedule' : 'Create Harvest Schedule'}
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Farm
                </label>
                <select
                  value={selectedFarm}
                  onChange={(event) => {
                    setSelectedFarm(event.target.value);
                    setForm((current) => ({ ...current, field_id: '' }));
                  }}
                  className="w-full rounded-lg border border-gray-300 p-2"
                  required
                >
                  <option value="">Select a farm</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Field
                </label>
                <select
                  name="field_id"
                  value={form.field_id}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 p-2"
                  required
                >
                  <option value="">Select a field</option>
                  {availableFields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Harvest Date
                </label>
                <input
                  type="date"
                  name="harvest_date"
                  value={form.harvest_date}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 p-2"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Estimated Quantity
                </label>
                <input
                  type="number"
                  name="estimated_quantity"
                  value={form.estimated_quantity}
                  onChange={handleChange}
                  min="0"
                  step="any"
                  placeholder="Enter expected quantity"
                  className="w-full rounded-lg border border-gray-300 p-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Unit
                </label>
                <select
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 p-2"
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="tonnes">Tonnes</option>
                  <option value="bags">Bags</option>
                  <option value="crates">Crates</option>
                  <option value="pieces">Pieces</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 p-2"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
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
                  placeholder="Optional harvest notes"
                  className="w-full rounded-lg border border-gray-300 p-2"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-green-700 px-5 py-2 font-medium text-white hover:bg-green-800 disabled:opacity-50"
              >
                {saving
                  ? 'Saving...'
                  : editingId
                    ? 'Update Schedule'
                    : 'Save Schedule'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm(emptyForm);
                  setError('');
                }}
                className="rounded-lg border border-gray-300 px-5 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              Harvest Schedules
            </h2>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search field, status, date, or notes..."
              className="w-full rounded-lg border border-gray-300 p-2 sm:max-w-sm"
            />
          </div>

          {loading ? (
            <p className="py-8 text-center text-gray-500">
              Loading harvest schedules...
            </p>
          ) : filteredHarvests.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No harvest schedules found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead>
                  <tr className="border-b bg-gray-50 text-sm text-gray-600">
                    <th className="p-3">Field</th>
                    <th className="p-3">Harvest Date</th>
                    <th className="p-3">Estimated Quantity</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Notes</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredHarvests.map((harvest) => (
                    <tr
                      key={harvest.id}
                      className="border-b last:border-0 hover:bg-gray-50"
                    >
                      <td className="p-3 font-medium text-gray-800">
                        {harvest.field?.name || 'Unknown field'}
                      </td>

                      <td className="p-3 text-gray-600">
                        {harvest.harvest_date
                          ? harvest.harvest_date.slice(0, 10)
                          : '—'}
                      </td>

                      <td className="p-3 text-gray-600">
                        {harvest.estimated_quantity ?? '—'}{' '}
                        {harvest.unit || ''}
                      </td>

                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            statusStyles[harvest.status] ||
                            'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {harvest.status || 'Unknown'}
                        </span>
                      </td>

                      <td className="max-w-xs truncate p-3 text-gray-600">
                        {harvest.notes || '—'}
                      </td>

                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(harvest)}
                            className="rounded-md bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(harvest)}
                            className="rounded-md bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200"
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
        </div>
      </div>
    </div>
  );
}
