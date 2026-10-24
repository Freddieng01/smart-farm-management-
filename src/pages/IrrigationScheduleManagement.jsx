
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = {
  field_id: '',
  water_source_id: '',
  irrigation_date: '',
  start_time: '',
  duration_minutes: '',
  water_quantity: '',
  unit: 'litres',
  status: 'scheduled',
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

function StatCard({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 break-words text-2xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function StatusLabel({ status }) {
  const styles = {
    scheduled: 'bg-blue-50 text-blue-700',
    completed: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-red-50 text-red-700',
  };

  const label = status || 'unknown';

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[label] || 'bg-slate-100 text-slate-700'
      }`}
    >
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  );
}

function getErrorMessage(err, fallback) {
  const validationErrors = err?.response?.data?.errors;

  if (validationErrors) {
    return Object.values(validationErrors).flat().join(' ');
  }

  return err?.response?.data?.message || fallback;
}

export default function IrrigationScheduleManagement() {
  const { api } = useAuth();

  const [schedules, setSchedules] = useState([]);
  const [waterSources, setWaterSources] = useState([]);
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [scheduleResponse, sourceResponse, fieldResponse] =
        await Promise.all([
          api.get('/api/irrigation-schedules'),
          api.get('/api/water-sources'),
          api.get('/api/fields'),
        ]);

      setSchedules(getRows(scheduleResponse));
      setWaterSources(getRows(sourceResponse));
      setFields(getRows(fieldResponse));
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Could not load irrigation data. Check your connection and try again.'
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

  function startEdit(schedule) {
    setEditingId(schedule.id);

    setForm({
      field_id: String(schedule.field_id ?? schedule.field?.id ?? ''),
      water_source_id: String(
        schedule.water_source_id ?? schedule.water_source?.id ?? ''
      ),
      irrigation_date: String(schedule.irrigation_date ?? '').slice(0, 10),
      start_time: String(schedule.start_time ?? '').slice(0, 5),
      duration_minutes: schedule.duration_minutes ?? '',
      water_quantity: schedule.water_quantity ?? '',
      unit: schedule.unit ?? 'litres',
      status: schedule.status ?? 'scheduled',
      notes: schedule.notes ?? '',
    });

    setError('');
    setNotice('');
    setShowForm(true);
  }

  async function saveSchedule(event) {
    event.preventDefault();

    if (saving) return;

    if (!form.field_id || !form.water_source_id || !form.irrigation_date) {
      setError('Please select a field and water source and enter an irrigation date.');
      return;
    }

    if (
      form.duration_minutes !== '' &&
      (!Number.isFinite(Number(form.duration_minutes)) ||
        Number(form.duration_minutes) < 0)
    ) {
      setError('Duration must be a non-negative number.');
      return;
    }

    if (
      form.water_quantity !== '' &&
      (!Number.isFinite(Number(form.water_quantity)) ||
        Number(form.water_quantity) < 0)
    ) {
      setError('Water quantity must be a non-negative number.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    const payload = {
      field_id: Number(form.field_id),
      water_source_id: Number(form.water_source_id),
      irrigation_date: form.irrigation_date,
      start_time: form.start_time || null,
      duration_minutes:
        form.duration_minutes === ''
          ? null
          : Number(form.duration_minutes),
      water_quantity:
        form.water_quantity === ''
          ? null
          : Number(form.water_quantity),
      unit: form.unit || null,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    try {
      if (editingId !== null) {
        await api.put(`/api/irrigation-schedules/${editingId}`, payload);
        setNotice('Irrigation schedule updated successfully.');
      } else {
        await api.post('/api/irrigation-schedules', payload);
        setNotice('Irrigation schedule created successfully.');
      }

      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });

      await loadData();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Could not save the schedule. Check the details and try again.'
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSchedule(schedule) {
    const confirmed = window.confirm(
      `Delete the irrigation schedule for ${
        schedule.field?.name || `field #${schedule.field_id}`
      } on ${formatDate(schedule.irrigation_date)}?`
    );

    if (!confirmed) return;

    setError('');
    setNotice('');

    try {
      await api.delete(`/api/irrigation-schedules/${schedule.id}`);

      if (editingId === schedule.id) {
        setEditingId(null);
        setForm({ ...emptyForm });
        setShowForm(false);
      }

      setNotice('Irrigation schedule deleted successfully.');
      await loadData();
    } catch (err) {
      setError(
        getErrorMessage(err, 'Could not delete this schedule.')
      );
    }
  }

  const completedCount = schedules.filter(
    (item) => item.status === 'completed'
  ).length;

  const scheduledCount = schedules.filter(
    (item) => item.status === 'scheduled'
  ).length;

  // Keep quantities separate because litres, m3, and gallons
  // cannot be added together as if they were the same unit.
  const waterTotals = schedules.reduce((totals, item) => {
    if (
      item.water_quantity === null ||
      item.water_quantity === undefined ||
      item.water_quantity === ''
    ) {
      return totals;
    }

    const quantity = Number(item.water_quantity);

    if (!Number.isFinite(quantity)) return totals;

    const unit = item.unit || 'unspecified';
    totals[unit] = (totals[unit] || 0) + quantity;

    return totals;
  }, {});

  const totalWater =
    Object.entries(waterTotals)
      .map(([unit, quantity]) => {
        const formatted = Number(quantity.toFixed(2)).toLocaleString();
        return `${formatted} ${unit}`;
      })
      .join(', ') || '0';

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Irrigation &amp; Water Management
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Irrigation Schedules
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Plan watering activities and track water use across your fields.
            </p>
          </div>

          <button
            type="button"
            onClick={startCreate}
            className="rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white hover:bg-emerald-800"
          >
            + New schedule
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

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Schedules loaded" value={schedules.length} />
          <StatCard label="Scheduled" value={scheduledCount} />
          <StatCard label="Completed" value={completedCount} />
          <StatCard label="Water recorded" value={totalWater} />
        </section>

        {showForm && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId !== null
                  ? 'Edit irrigation schedule'
                  : 'Create irrigation schedule'}
              </h2>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            {fields.length === 0 && (
              <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                No fields are available. Check the field API and ensure a farm
                has at least one registered field.
              </p>
            )}

            {waterSources.length === 0 && (
              <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                No water sources are available. Register a water source first.
              </p>
            )}

            <form onSubmit={saveSchedule} className="grid gap-4 md:grid-cols-2">
              <Field label="Field *">
                <select
                  name="field_id"
                  value={form.field_id}
                  onChange={updateForm}
                  required
                  className={inputClass}
                >
                  <option value="">Select field</option>

                  {fields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name || `Field #${field.id}`}
                      {field.farm?.name ? ` — ${field.farm.name}` : ''}
                    </option>
                  ))}

                  {form.field_id &&
                    !fields.some(
                      (field) => String(field.id) === form.field_id
                    ) && (
                      <option value={form.field_id}>
                        Current field #{form.field_id}
                      </option>
                    )}
                </select>
              </Field>

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
                      {source.farm?.name ? ` — ${source.farm.name}` : ''}
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

              <Field label="Irrigation date *">
                <input
                  type="date"
                  name="irrigation_date"
                  value={form.irrigation_date}
                  onChange={updateForm}
                  required
                  className={inputClass}
                />
              </Field>

              <Field label="Start time">
                <input
                  type="time"
                  name="start_time"
                  value={form.start_time}
                  onChange={updateForm}
                  className={inputClass}
                />
              </Field>

              <Field label="Duration (minutes)">
                <input
                  type="number"
                  name="duration_minutes"
                  value={form.duration_minutes}
                  onChange={updateForm}
                  min="0"
                  step="1"
                  className={inputClass}
                  placeholder="e.g. 45"
                />
              </Field>

              <Field label="Water quantity">
                <input
                  type="number"
                  name="water_quantity"
                  value={form.water_quantity}
                  onChange={updateForm}
                  min="0"
                  step="any"
                  className={inputClass}
                  placeholder="e.g. 500"
                />
              </Field>

              <Field label="Quantity unit">
                <select
                  name="unit"
                  value={form.unit}
                  onChange={updateForm}
                  className={inputClass}
                >
                  <option value="litres">Litres</option>
                  <option value="m3">Cubic metres (m3)</option>
                  <option value="gallons">Gallons</option>
                  <option value="other">Other</option>
                </select>
              </Field>

              <Field label="Status *">
                <select
                  name="status"
                  value={form.status}
                  onChange={updateForm}
                  required
                  className={inputClass}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </Field>

              <div className="md:col-span-2">
                <Field label="Notes">
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={updateForm}
                    rows="3"
                    className={inputClass}
                    placeholder="Add irrigation instructions or observations..."
                  />
                </Field>
              </div>

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <button
                  type="submit"
                  disabled={
                    saving || fields.length === 0 || waterSources.length === 0
                  }
                  className="rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : editingId !== null
                      ? 'Save changes'
                      : 'Create schedule'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setForm({ ...emptyForm });
                    setError('');
                  }}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-900">
              All irrigation schedules
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Showing the schedules returned by the API, up to 25 records.
            </p>
          </div>

          {loading ? (
            <p className="p-6 text-sm text-slate-500">
              Loading irrigation schedules...
            </p>
          ) : schedules.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-semibold">No irrigation schedules yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Create a schedule to start tracking irrigation.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date &amp; time</th>
                    <th className="px-4 py-3">Field</th>
                    <th className="px-4 py-3">Water source</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Water quantity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {schedules.map((schedule) => (
                    <tr key={schedule.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="font-medium">
                          {formatDate(schedule.irrigation_date)}
                        </div>
                        <div className="text-slate-500">
                          {String(schedule.start_time || '').slice(0, 5) ||
                            'No time set'}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {schedule.field?.name || `Field #${schedule.field_id}`}
                      </td>

                      <td className="px-4 py-3">
                        {schedule.water_source?.name ||
                          `Source #${schedule.water_source_id}`}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {schedule.duration_minutes == null
                          ? 'N/A'
                          : `${schedule.duration_minutes} min`}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {schedule.water_quantity == null
                          ? 'N/A'
                          : `${Number(
                              schedule.water_quantity
                            ).toLocaleString()} ${schedule.unit || ''}`}
                      </td>

                      <td className="px-4 py-3">
                        <StatusLabel status={schedule.status} />
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <button
                          type="button"
                          onClick={() => startEdit(schedule)}
                          className="mr-3 font-semibold text-emerald-700 hover:text-emerald-900"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteSchedule(schedule)}
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
