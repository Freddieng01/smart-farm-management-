
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';

const emptyForm = {
  field_id: '',
  handling_date: '',
  storage_method: '',
  storage_location: '',
  quantity: '',
  unit: 'kg',
  condition: '',
  loss_quantity: '',
  notes: '',
};

export default function PostHarvestHandling() {
  const { api } = useAuth();

  const [records, setRecords] = useState([]);
  const [farms, setFarms] = useState([]);
  const [fields, setFields] = useState([]);
  const [farmId, setFarmId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [recordResponse, farmResponse] = await Promise.all([
        api.get('/api/post-harvest-handlings'),
        api.get('/api/farms'),
      ]);

      const recordData = recordResponse.data;
      const farmData = farmResponse.data;

      const recordList = Array.isArray(recordData)
        ? recordData
        : recordData.data || [];

      const farmList = Array.isArray(farmData)
        ? farmData
        : farmData.data || [];

      setRecords(recordList);
      setFarms(farmList);

      const fieldResponses = await Promise.all(
        farmList.map((farm) =>
          api
            .get(`/api/farms/${farm.id}/fields`)
            .then((response) => response.data)
            .catch(() => [])
        )
      );

      setFields(
        fieldResponses.flatMap((result) =>
          Array.isArray(result) ? result : result.data || []
        )
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to load post-harvest records. Please try refreshing.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function changeForm(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function createRecord() {
    setForm(emptyForm);
    setFarmId('');
    setEditingId(null);
    setError('');
    setSuccess('');
    setShowForm(true);
  }

  function editRecord(record) {
    const fieldId = String(record.field_id ?? record.field?.id ?? '');
    const field = fields.find(
      (item) => String(item.id) === fieldId
    );

    setEditingId(record.id);
    setFarmId(
      field?.farm_id ? String(field.farm_id) : ''
    );

    setForm({
      field_id: fieldId,
      handling_date: record.handling_date?.slice(0, 10) || '',
      storage_method: record.storage_method || '',
      storage_location: record.storage_location || '',
      quantity: record.quantity ?? '',
      unit: record.unit || 'kg',
      condition: record.condition || '',
      loss_quantity: record.loss_quantity ?? '',
      notes: record.notes || '',
    });

    setError('');
    setSuccess('');
    setShowForm(true);
  }

  async function submitForm(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const quantity = Number(form.quantity);
    const loss =
      form.loss_quantity === ''
        ? null
        : Number(form.loss_quantity);

    if (loss !== null && loss > quantity) {
      setError(
        'Loss quantity cannot exceed the total quantity handled.'
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        field_id: Number(form.field_id),
        handling_date: form.handling_date,
        storage_method: form.storage_method.trim(),
        storage_location: form.storage_location.trim() || null,
        quantity,
        unit: form.unit,
        condition: form.condition || null,
        loss_quantity: loss,
        notes: form.notes.trim() || null,
      };

      const response = editingId
        ? await api.put(
            `/api/post-harvest-handlings/${editingId}`,
            payload
          )
        : await api.post(
            '/api/post-harvest-handlings',
            payload
          );

      const savedRecord = response.data.data ?? response.data;

      if (editingId) {
        setRecords((current) =>
          current.map((item) =>
            item.id === editingId ? savedRecord : item
          )
        );
        setSuccess('Post-harvest record updated successfully.');
      } else {
        setRecords((current) => [savedRecord, ...current]);
        setSuccess('Post-harvest record created successfully.');
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      const validationErrors = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(' ')
        : '';

      setError(
        validationErrors ||
          err.response?.data?.message ||
          'Unable to save the post-harvest record.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(record) {
    const fieldName = record.field?.name || 'this field';

    if (
      !window.confirm(
        `Delete the post-harvest record for ${fieldName}?`
      )
    ) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await api.delete(
        `/api/post-harvest-handlings/${record.id}`
      );

      setRecords((current) =>
        current.filter((item) => item.id !== record.id)
      );

      setSuccess('Post-harvest record deleted successfully.');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to delete the post-harvest record.'
      );
    }
  }

  const availableFields = fields.filter(
    (field) =>
      !farmId || String(field.farm_id) === farmId
  );

  const filteredRecords = records.filter((record) => {
    const term = search.toLowerCase();

    return (
      (record.field?.name || '').toLowerCase().includes(term) ||
      (record.storage_method || '').toLowerCase().includes(term) ||
      (record.storage_location || '').toLowerCase().includes(term) ||
      (record.condition || '').toLowerCase().includes(term) ||
      (record.handling_date || '').toLowerCase().includes(term) ||
      (record.notes || '').toLowerCase().includes(term)
    );
  });

  const totalHandled = records.reduce(
    (total, record) => total + Number(record.quantity || 0),
    0
  );

  const totalLoss = records.reduce(
    (total, record) => total + Number(record.loss_quantity || 0),
    0
  );

  return (
    <ModuleLayout
      title="Post-Harvest Handling"
      subtitle="Record produce handling, storage conditions, and losses after harvest."
      actions={<>
<div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="rounded-full bg-white/15 px-5 py-2 text-sm font-medium text-white ring-1 ring-white/30 transition hover:bg-white/25 disabled:opacity-60"
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={createRecord}
              className="rounded-full bg-harvest-400 px-5 py-2 text-sm font-medium text-farm-900 transition hover:bg-harvest-500 disabled:opacity-60"
            >
              + Add Handling Record
            </button>
          </div>
      </>}
    >
      <div className="mx-auto max-w-7xl">

        {error && (
          <div role="alert" className="mb-4 rounded-2xl bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div role="status" className="mb-4 rounded-2xl bg-farm-50 p-3 text-farm-700">
            {success}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
            <p className="text-sm text-slate-500">Handling Records</p>
            <p className="mt-2 text-3xl font-bold text-farm-900">
              {records.length}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
            <p className="text-sm text-slate-500">Total Quantity Handled</p>
            <p className="mt-2 text-3xl font-bold text-farm-900">
              {totalHandled.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Combined quantity; units may differ.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
            <p className="text-sm text-slate-500">Recorded Post-Harvest Loss</p>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {totalLoss.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Combined quantity; units may differ.
            </p>
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={submitForm}
            className="mb-6 rounded-3xl bg-white p-5 shadow-[0_2px_16px_rgba(15,60,35,0.07)]"
          >
            <h2 className="mb-4 text-xl font-semibold text-farm-900">
              {editingId
                ? 'Edit Handling Record'
                : 'New Handling Record'}
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Farm
                </label>
                <select
                  value={farmId}
                  onChange={(event) => {
                    setFarmId(event.target.value);
                    setForm((current) => ({
                      ...current,
                      field_id: '',
                    }));
                  }}
                  className="w-full rounded-xl border p-2"
                  required
                >
                  <option value="">Select farm</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Field
                </label>
                <select
                  name="field_id"
                  value={form.field_id}
                  onChange={changeForm}
                  className="w-full rounded-xl border p-2"
                  required
                >
                  <option value="">Select field</option>
                  {availableFields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Handling Date
                </label>
                <input
                  type="date"
                  name="handling_date"
                  value={form.handling_date}
                  onChange={changeForm}
                  className="w-full rounded-xl border p-2"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Storage Method
                </label>
                <select
                  name="storage_method"
                  value={form.storage_method}
                  onChange={changeForm}
                  className="w-full rounded-xl border p-2"
                  required
                >
                  <option value="">Select storage method</option>
                  <option value="Dry storage">Dry storage</option>
                  <option value="Cold storage">Cold storage</option>
                  <option value="Refrigeration">Refrigeration</option>
                  <option value="Crates">Crates</option>
                  <option value="Silo">Silo</option>
                  <option value="Warehouse">Warehouse</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Storage Location
                </label>
                <input
                  type="text"
                  name="storage_location"
                  value={form.storage_location}
                  onChange={changeForm}
                  maxLength="255"
                  className="w-full rounded-xl border p-2"
                  placeholder="e.g. Main warehouse"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Quantity Handled
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={changeForm}
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border p-2"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Unit
                </label>
                <select
                  name="unit"
                  value={form.unit}
                  onChange={changeForm}
                  className="w-full rounded-xl border p-2"
                  required
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="tonnes">Tonnes</option>
                  <option value="bags">Bags</option>
                  <option value="crates">Crates</option>
                  <option value="pieces">Pieces</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Produce Condition
                </label>
                <select
                  name="condition"
                  value={form.condition}
                  onChange={changeForm}
                  className="w-full rounded-xl border p-2"
                >
                  <option value="">Not recorded</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                  <option value="Damaged">Damaged</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Loss Quantity
                </label>
                <input
                  type="number"
                  name="loss_quantity"
                  value={form.loss_quantity}
                  onChange={changeForm}
                  min="0"
                  max={form.quantity === '' ? undefined : form.quantity}
                  step="0.01"
                  className="w-full rounded-xl border p-2"
                  placeholder="Optional"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Cannot exceed the quantity handled.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={changeForm}
                  rows="3"
                  className="w-full rounded-xl border p-2"
                  placeholder="Optional handling observations..."
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-farm-700 px-5 py-2 text-white hover:bg-farm-800 disabled:opacity-50"
              >
                {saving
                  ? 'Saving...'
                  : editingId
                    ? 'Update Record'
                    : 'Save Record'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setError('');
                }}
                className="rounded-full border px-5 py-2 hover:bg-farm-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="rounded-3xl bg-white p-5 shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row">
            <h2 className="text-xl font-semibold text-farm-900">
              Handling Records
            </h2>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search field, storage, condition..."
              className="w-full rounded-xl border p-2 sm:max-w-sm"
            />
          </div>

          {loading ? (
            <p className="py-8 text-center text-slate-500">
              Loading post-harvest records...
            </p>
          ) : filteredRecords.length === 0 ? (
            <p className="py-8 text-center text-slate-500">
              No post-harvest records found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead>
                  <tr className="border-b bg-farm-50 text-sm text-slate-600">
                    <th className="p-3">Field</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Storage Method</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Condition</th>
                    <th className="p-3">Loss</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b last:border-0"
                    >
                      <td className="p-3 font-medium">
                        {record.field?.name || 'Unknown field'}
                      </td>
                      <td className="p-3">
                        {record.handling_date?.slice(0, 10) || '—'}
                      </td>
                      <td className="p-3">
                        {record.storage_method}
                      </td>
                      <td className="p-3">
                        {record.storage_location || '—'}
                      </td>
                      <td className="p-3">
                        {record.quantity} {record.unit}
                      </td>
                      <td className="p-3">
                        {record.condition || 'Not recorded'}
                      </td>
                      <td className="p-3">
                        {record.loss_quantity == null
                          ? '—'
                          : `${record.loss_quantity} ${record.unit}`}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => editRecord(record)}
                            className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRecord(record)}
                            className="rounded bg-red-100 px-3 py-1 text-sm text-red-700"
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
    </ModuleLayout>
  );
}
