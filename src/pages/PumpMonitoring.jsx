
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = {
  water_source_id: '',
  monitoring_date: '',
  status: 'operational',
  operating_hours: '',
  flow_rate: '',
  notes: '',
};

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100';

function getRows(response) {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

function getErrorMessage(err, fallback) {
  const validationErrors = err?.response?.data?.errors;

  if (validationErrors) {
    return Object.values(validationErrors).flat().join(' ');
  }

  return err?.response?.data?.message || fallback;
}

function formatDate(value) {
  if (!value) return 'N/A';

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? String(value).slice(0, 10)
    : date.toLocaleDateString();
}

function Field({ label, children }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

function StatCard({ label, value, description }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>

      {description && (
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      )}
    </div>
  );
}

function StatusLabel({ status }) {
  const value = String(status || 'unknown');
  const normalised = value.toLowerCase();

  let style = 'bg-slate-100 text-slate-700';

  if (
    ['operational', 'running', 'active', 'working'].includes(normalised)
  ) {
    style = 'bg-emerald-50 text-emerald-700';
  } else if (
    ['maintenance', 'under maintenance', 'servicing'].includes(normalised)
  ) {
    style = 'bg-amber-50 text-amber-700';
  } else if (
    ['faulty', 'broken', 'not operational', 'stopped', 'inactive'].includes(
      normalised
    )
  ) {
    style = 'bg-red-50 text-red-700';
  }

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}
    >
      {value.charAt(0).toUpperCase() + value.slice(1)}
    </span>
  );
}

export default function PumpMonitoring() {
  const { api } = useAuth();

  const [records, setRecords] = useState([]);
  const [waterSources, setWaterSources] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [monitoringResponse, sourceResponse] = await Promise.all([
        api.get('/api/pump-monitoring'),
        api.get('/api/water-sources'),
      ]);

      setRecords(getRows(monitoringResponse));
      setWaterSources(getRows(sourceResponse));
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to load pump monitoring records. Check your API connection and try again.'
        )
      );
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function startCreate() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError('');
    setNotice('');
    setShowForm(true);
  }

  function startEdit(record) {
    setEditingId(record.id);

    setForm({
      water_source_id: String(
        record.water_source_id ?? record.water_source?.id ?? ''
      ),
      monitoring_date: String(record.monitoring_date ?? '').slice(0, 10),
      status: record.status ?? 'operational',
      operating_hours: record.operating_hours ?? '',
      flow_rate: record.flow_rate ?? '',
      notes: record.notes ?? '',
    });

    setError('');
    setNotice('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
    setError('');
  }

  async function saveRecord(event) {
    event.preventDefault();

    if (saving) return;

    setError('');
    setNotice('');

    if (!form.water_source_id || !form.monitoring_date) {
      setError('Please select a water source and monitoring date.');
      return;
    }

    const numericFields = [
      {
        label: 'Operating hours',
        value: form.operating_hours,
      },
      {
        label: 'Flow rate',
        value: form.flow_rate,
      },
    ];

    for (const field of numericFields) {
      if (field.value === '') continue;

      const number = Number(field.value);

      if (!Number.isFinite(number) || number < 0) {
        setError(
          `${field.label} must be a valid non-negative number.`
        );
        return;
      }
    }

    const payload = {
      water_source_id: Number(form.water_source_id),
      monitoring_date: form.monitoring_date,
      status: form.status || 'operational',
      operating_hours:
        form.operating_hours === '' ? null : Number(form.operating_hours),
      flow_rate: form.flow_rate === '' ? null : Number(form.flow_rate),
      notes: form.notes.trim() || null,
    };

    setSaving(true);

    try {
      if (editingId) {
        await api.put(`/api/pump-monitoring/${editingId}`, payload);
        setNotice('Pump monitoring record updated successfully.');
      } else {
        await api.post('/api/pump-monitoring', payload);
        setNotice('Pump monitoring record created successfully.');
      }

      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });

      await loadData();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to save this record. Check the information and try again.'
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(record) {
    const confirmed = window.confirm(
      `Delete the pump monitoring record for ${
        record.water_source?.name ||
        `water source #${record.water_source_id}`
      } dated ${formatDate(record.monitoring_date)}?`
    );

    if (!confirmed) return;

    setError('');
    setNotice('');

    try {
      await api.delete(`/api/pump-monitoring/${record.id}`);

      if (editingId === record.id) {
        closeForm();
      }

      setNotice('Pump monitoring record deleted successfully.');
      await loadData();
    } catch (err) {
      setError(
        getErrorMessage(err, 'Unable to delete this monitoring record.')
      );
    }
  }

  const operationalCount = records.filter((record) =>
    ['operational', 'running', 'active', 'working'].includes(
      String(record.status || '').toLowerCase()
    )
  ).length;

  const maintenanceCount = records.filter((record) =>
    ['maintenance', 'under maintenance', 'servicing'].includes(
      String(record.status || '').toLowerCase()
    )
  ).length;

  const flowRecords = records.filter(
    (record) =>
      record.flow_rate !== null &&
      record.flow_rate !== undefined &&
      record.flow_rate !== '' &&
      Number.isFinite(Number(record.flow_rate))
  );

  const averageFlowRate = flowRecords.length
    ? flowRecords.reduce(
        (sum, record) => sum + Number(record.flow_rate),
        0
      ) / flowRecords.length
    : null;

  const filteredRecords = records.filter((record) => {
    const query = search.toLowerCase().trim();

    if (!query) return true;

    return [
      record.water_source?.name,
      record.status,
      record.monitoring_date,
      record.notes,
    ].some((value) =>
      String(value || '').toLowerCase().includes(query)
    );
  });

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Irrigation &amp; Water Management
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Pump Monitoring
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Monitor pump condition, operating hours and water flow readings.
            </p>
          </div>

          <button
            type="button"
            onClick={startCreate}
            className="rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white hover:bg-emerald-800"
          >
            + Add monitoring record
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {notice}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Records loaded"
            value={records.length}
            description="Monitoring history returned by the API"
          />

          <StatCard
            label="Operational readings"
            value={operationalCount}
            description="Records marked operational or running"
          />

          <StatCard
            label="Maintenance readings"
            value={maintenanceCount}
            description="Records marked for maintenance"
          />

          <StatCard
            label="Average flow rate"
            value={
              averageFlowRate === null
                ? 'N/A'
                : averageFlowRate.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
            }
            description="Average of available flow-rate readings"
          />
        </section>

        {showForm && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? 'Edit monitoring record' : 'New monitoring record'}
              </h2>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            {waterSources.length === 0 && (
              <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                No water sources were loaded. Create a water source first and
                check that the water-sources API is available.
              </p>
            )}

            <form onSubmit={saveRecord} className="grid gap-4 md:grid-cols-2">
              <Field label="Water source *">
                <select
                  name="water_source_id"
                  value={form.water_source_id}
                  onChange={updateForm}
                  required
                  className={inputClass}
                >
                  <option value="">Select water source</option>

                  {waterSources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                      {source.farm?.name ? ` - ${source.farm.name}` : ''}
                    </option>
                  ))}

                  {form.water_source_id &&
                    !waterSources.some(
                      (source) => String(source.id) === form.water_source_id
                    ) && (
                      <option value={form.water_source_id}>
                        Current source #{form.water_source_id}
                      </option>
                    )}
                </select>
              </Field>

              <Field label="Monitoring date *">
                <input
                  type="date"
                  name="monitoring_date"
                  value={form.monitoring_date}
                  onChange={updateForm}
                  required
                  className={inputClass}
                />
              </Field>

              <Field label="Pump status">
                <select
                  name="status"
                  value={form.status}
                  onChange={updateForm}
                  className={inputClass}
                >
                  <option value="operational">Operational</option>
                  <option value="running">Running</option>
                  <option value="maintenance">Under maintenance</option>
                  <option value="faulty">Faulty</option>
                  <option value="stopped">Stopped</option>
                </select>
              </Field>

              <Field label="Operating hours">
                <input
                  type="number"
                  name="operating_hours"
                  value={form.operating_hours}
                  onChange={updateForm}
                  min="0"
                  step="any"
                  className={inputClass}
                  placeholder="e.g. 4.5"
                />
              </Field>

              <Field label="Flow rate">
                <input
                  type="number"
                  name="flow_rate"
                  value={form.flow_rate}
                  onChange={updateForm}
                  min="0"
                  step="any"
                  className={inputClass}
                  placeholder="Enter measured flow rate"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Notes">
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={updateForm}
                    rows="3"
                    className={inputClass}
                    placeholder="Record pump observations, faults or maintenance required..."
                  />
                </Field>
              </div>

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <button
                  type="submit"
                  disabled={saving || waterSources.length === 0}
                  className="rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : editingId
                      ? 'Save changes'
                      : 'Save monitoring record'}
                </button>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Monitoring history</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review and manage pump monitoring records.
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search records..."
              aria-label="Search monitoring records"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 sm:max-w-xs"
            />
          </div>

          {loading ? (
            <p className="p-6 text-sm text-slate-500">
              Loading pump monitoring records...
            </p>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-semibold text-slate-800">
                No monitoring records found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Add a record or change your search.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Water source</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Operating hours</th>
                    <th className="px-4 py-3">Flow rate</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 font-medium">
                        {formatDate(record.monitoring_date)}
                      </td>

                      <td className="px-4 py-3">
                        {record.water_source?.name ||
                          `Water source #${record.water_source_id}`}
                      </td>

                      <td className="px-4 py-3">
                        <StatusLabel status={record.status} />
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {record.operating_hours == null
                          ? 'N/A'
                          : `${record.operating_hours} hrs`}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {record.flow_rate == null ? 'N/A' : record.flow_rate}
                      </td>

                      <td className="max-w-xs px-4 py-3">
                        <span className="line-clamp-2">
                          {record.notes || 'N/A'}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <button
                          type="button"
                          onClick={() => startEdit(record)}
                          className="mr-3 font-semibold text-emerald-700 hover:text-emerald-900"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteRecord(record)}
                          className="font-semibold text-red-600 hover:text-red-800"
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
        </section>
      </div>
    </main>
  );
}
