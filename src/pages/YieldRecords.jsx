
import { useEffect, useState } from 'react';

const emptyForm = {
  field_id: '',
  harvest_date: '',
  quantity: '',
  unit: 'kg',
  quality_grade: '',
  moisture_percentage: '',
  loss_quantity: '',
  notes: '',
};

const statusStyle = {
  A: 'bg-green-100 text-green-700',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-yellow-100 text-yellow-700',
};

export default function YieldRecords() {
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

  async function api(url, options = {}) {
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
      const validationErrors = data.errors
        ? Object.values(data.errors).flat().join(' ')
        : '';

      throw new Error(
        validationErrors ||
          data.message ||
          `Request failed (${response.status})`
      );
    }

    return data;
  }

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [recordData, farmData] = await Promise.all([
        api('/api/yield-records'),
        api('/api/farms'),
      ]);

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
          api(`/api/farms/${farm.id}/fields`).catch(() => [])
        )
      );

      setFields(
        fieldResponses.flatMap((result) =>
          Array.isArray(result) ? result : result.data || []
        )
      );
    } catch (err) {
      setError(err.message || 'Unable to load yield records.');
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
    setEditingId(null);
    setForm(emptyForm);
    setFarmId('');
    setError('');
    setSuccess('');
    setShowForm(true);
  }

  function editRecord(record) {
    const fieldId = String(record.field_id ?? record.field?.id ?? '');
    const field = fields.find((item) => String(item.id) === fieldId);

    setEditingId(record.id);
    setFarmId(field?.farm_id ? String(field.farm_id) : '');

    setForm({
      field_id: fieldId,
      harvest_date: record.harvest_date?.slice(0, 10) || '',
      quantity: record.quantity ?? '',
      unit: record.unit || 'kg',
      quality_grade: record.quality_grade || '',
      moisture_percentage: record.moisture_percentage ?? '',
      loss_quantity: record.loss_quantity ?? '',
      notes: record.notes || '',
    });

    setError('');
    setSuccess('');
    setShowForm(true);
  }

  async function submitForm(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        field_id: Number(form.field_id),
        harvest_date: form.harvest_date,
        quantity: Number(form.quantity),
        unit: form.unit,
        quality_grade: form.quality_grade || null,
        moisture_percentage:
          form.moisture_percentage === ''
            ? null
            : Number(form.moisture_percentage),
        loss_quantity:
          form.loss_quantity === '' ? null : Number(form.loss_quantity),
        notes: form.notes.trim() || null,
      };

      const url = editingId
        ? `/api/yield-records/${editingId}`
        : '/api/yield-records';

      const result = await api(url, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });

      const savedRecord = result.data ?? result;

      if (editingId) {
        setRecords((current) =>
          current.map((item) =>
            item.id === editingId ? savedRecord : item
          )
        );
        setSuccess('Yield record updated successfully.');
      } else {
        setRecords((current) => [savedRecord, ...current]);
        setSuccess('Yield record created successfully.');
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      setError(err.message || 'Unable to save yield record.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(record) {
    if (
      !window.confirm(
        `Delete the yield record for ${record.field?.name || 'this field'}?`
      )
    ) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await api(`/api/yield-records/${record.id}`, {
        method: 'DELETE',
      });

      setRecords((current) =>
        current.filter((item) => item.id !== record.id)
      );

      setSuccess('Yield record deleted successfully.');
    } catch (err) {
      setError(err.message || 'Unable to delete yield record.');
    }
  }

  const availableFields = fields.filter(
    (field) => !farmId || String(field.farm_id) === farmId
  );

  const filteredRecords = records.filter((record) => {
    const term = search.toLowerCase();

    return (
      (record.field?.name || '').toLowerCase().includes(term) ||
      (record.quality_grade || '').toLowerCase().includes(term) ||
      (record.harvest_date || '').toLowerCase().includes(term) ||
      (record.notes || '').toLowerCase().includes(term)
    );
  });

  const totalQuantity = records.reduce(
    (total, record) => total + Number(record.quantity || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Yield Records
            </h1>
            <p className="mt-1 text-gray-600">
              Record and monitor actual harvested quantities.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="rounded-lg border bg-white px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={createRecord}
              className="rounded-lg bg-green-700 px-4 py-2 text-white hover:bg-green-800"
            >
              + Add Yield Record
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg bg-green-50 p-3 text-green-700">
            {success}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Yield Records</p>
            <p className="mt-2 text-3xl font-bold text-gray-800">
              {records.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Total Quantity Recorded
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-800">
              {totalQuantity.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Combined quantity; units may differ.
            </p>
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={submitForm}
            className="mb-6 rounded-xl bg-white p-5 shadow-sm"
          >
            <h2 className="mb-4 text-xl font-semibold text-gray-800">
              {editingId ? 'Edit Yield Record' : 'New Yield Record'}
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
                  className="w-full rounded-lg border p-2"
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
                  className="w-full rounded-lg border p-2"
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
                  Harvest Date
                </label>
                <input
                  type="date"
                  name="harvest_date"
                  value={form.harvest_date}
                  onChange={changeForm}
                  className="w-full rounded-lg border p-2"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Actual Quantity
                </label>
                <input
                  type="number"
                  name="quantity"
                  min="0"
                  step="any"
                  value={form.quantity}
                  onChange={changeForm}
                  className="w-full rounded-lg border p-2"
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
                  className="w-full rounded-lg border p-2"
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
                  Quality Grade
                </label>
                <select
                  name="quality_grade"
                  value={form.quality_grade}
                  onChange={changeForm}
                  className="w-full rounded-lg border p-2"
                >
                  <option value="">Not graded</option>
                  <option value="A">A - Excellent</option>
                  <option value="B">B - Good</option>
                  <option value="C">C - Fair</option>
                  <option value="Reject">Reject</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Moisture Percentage (%)
                </label>
                <input
                  type="number"
                  name="moisture_percentage"
                  min="0"
                  max="100"
                  step="any"
                  value={form.moisture_percentage}
                  onChange={changeForm}
                  className="w-full rounded-lg border p-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Loss Quantity
                </label>
                <input
                  type="number"
                  name="loss_quantity"
                  min="0"
                  step="any"
                  value={form.loss_quantity}
                  onChange={changeForm}
                  className="w-full rounded-lg border p-2"
                />
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
                  className="w-full rounded-lg border p-2"
                  placeholder="Optional observations..."
                />
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-green-700 px-5 py-2 text-white hover:bg-green-800 disabled:opacity-50"
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
                className="rounded-lg border px-5 py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row">
            <h2 className="text-xl font-semibold text-gray-800">
              Recorded Yields
            </h2>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search field, date, grade, notes..."
              className="w-full rounded-lg border p-2 sm:max-w-sm"
            />
          </div>

          {loading ? (
            <p className="py-8 text-center text-gray-500">
              Loading yield records...
            </p>
          ) : filteredRecords.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No yield records found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">
                <thead>
                  <tr className="border-b bg-gray-50 text-sm text-gray-600">
                    <th className="p-3">Field</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Quality</th>
                    <th className="p-3">Moisture</th>
                    <th className="p-3">Loss</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">
                        {record.field?.name || 'Unknown field'}
                      </td>
                      <td className="p-3">
                        {record.harvest_date?.slice(0, 10) || '—'}
                      </td>
                      <td className="p-3">
                        {record.quantity} {record.unit}
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            statusStyle[record.quality_grade] ||
                            'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {record.quality_grade || 'Not graded'}
                        </span>
                      </td>
                      <td className="p-3">
                        {record.moisture_percentage == null
                          ? '—'
                          : `${record.moisture_percentage}%`}
                      </td>
                      <td className="p-3">
                        {record.loss_quantity ?? '—'}
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
    </div>
  );
}
