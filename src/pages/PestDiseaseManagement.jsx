
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';

const sections = [
  { id: 'scouting', label: 'Scouting Records' },
  { id: 'spraying', label: 'Spraying Schedules' },
  { id: 'alerts', label: 'Outbreak Alerts' },
];

const emptyForms = {
  scouting: {
    field_id: '',
    scouting_date: new Date().toISOString().slice(0, 10),
    pest_disease_name: '',
    type: 'Pest',
    severity: 'Medium',
    affected_area: '',
    notes: '',
  },
  spraying: {
    field_id: '',
    pest_disease_name: '',
    treatment: '',
    spraying_date: new Date().toISOString().slice(0, 10),
    start_time: '',
    duration_minutes: '',
    status: 'Scheduled',
    notes: '',
  },
  alerts: {
    field_id: '',
    pest_disease_name: '',
    alert_date: new Date().toISOString().slice(0, 10),
    severity: 'Medium',
    description: '',
    status: 'Open',
    notes: '',
  },
};

const endpoints = {
  scouting: '/api/scouting-records',
  spraying: '/api/spraying-schedules',
  alerts: '/api/outbreak-alerts',
};

function getRows(response) {
  const body = response.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

function getError(error) {
  const errors = error.response?.data?.errors;
  if (errors) {
    return Object.values(errors).flat().join(' ');
  }

  return error.response?.data?.message || 'Something went wrong.';
}

function PestDiseaseManagement() {
  const { api } = useAuth();

  const [activeTab, setActiveTab] = useState('scouting');
  const [records, setRecords] = useState({
    scouting: [],
    spraying: [],
    alerts: [],
  });
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState({ ...emptyForms.scouting });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  const loadRecords = async () => {
    setLoading(true);
    setError('');

    try {
      const [scouting, spraying, alerts] = await Promise.all([
        api.get(endpoints.scouting),
        api.get(endpoints.spraying),
        api.get(endpoints.alerts),
      ]);

      setRecords({
        scouting: getRows(scouting),
        spraying: getRows(spraying),
        alerts: getRows(alerts),
      });
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const loadInitialData = async () => {
      setLoading(true);
      setError('');

      try {
        const [scouting, spraying, alerts, fieldResponse] =
          await Promise.all([
            api.get(endpoints.scouting),
            api.get(endpoints.spraying),
            api.get(endpoints.alerts),
            api.get('/api/fields'),
          ]);

        if (!active) return;

        setRecords({
          scouting: getRows(scouting),
          spraying: getRows(spraying),
          alerts: getRows(alerts),
        });

        setFields(getRows(fieldResponse));
      } catch (err) {
        if (active) {
          setError(
            `${getError(err)} Check that the API routes and field endpoint exist.`
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      active = false;
    };
  }, [api]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return records[activeTab];

    return records[activeTab].filter((record) =>
      [
        record.pest_disease_name,
        record.type,
        record.severity,
        record.status,
        record.treatment,
        record.description,
        record.field?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [records, activeTab, search]);

  const updateForm = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setForm({ ...emptyForms[tab] });
    setEditingId(null);
    setSearch('');
    setError('');
    setSuccess('');
  };

  const startEditing = (record) => {
    const initial = { ...emptyForms[activeTab] };

    Object.keys(initial).forEach((key) => {
      if (record[key] !== null && record[key] !== undefined) {
        initial[key] =
          key === 'start_time'
            ? String(record[key]).slice(0, 5)
            : String(record[key]);
      }
    });

    if (record.field_id) initial.field_id = String(record.field_id);

    setForm(initial);
    setEditingId(record.id);
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setForm({ ...emptyForms[activeTab] });
    setEditingId(null);
    setError('');
  };

  const saveRecord = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const payload = { ...form };

    // Empty optional numeric values must be null, not an empty string.
    if (activeTab === 'scouting') {
      payload.affected_area = payload.affected_area || null;
    }

    if (activeTab === 'spraying') {
      payload.duration_minutes = payload.duration_minutes || null;
      payload.start_time = payload.start_time || null;
    }

    try {
      if (editingId) {
        await api.put(`${endpoints[activeTab]}/${editingId}`, payload);
        setSuccess('Record updated successfully.');
      } else {
        await api.post(endpoints[activeTab], payload);
        setSuccess('Record created successfully.');
      }

      setForm({ ...emptyForms[activeTab] });
      setEditingId(null);
      await loadRecords();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await api.delete(`${endpoints[activeTab]}/${id}`);
      setSuccess('Record deleted successfully.');
      await loadRecords();
    } catch (err) {
      setError(getError(err));
    }
  };

  const formatDate = (value) => {
    if (!value) return '—';
    return String(value).slice(0, 10);
  };

  const fieldName = (record) =>
    record.field?.name ||
    fields.find((field) => String(field.id) === String(record.field_id))
      ?.name ||
    `Field #${record.field_id}`;

  const renderFields = () => (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">Field *</span>
      <select
        name="field_id"
        value={form.field_id}
        onChange={updateForm}
        required
        className="w-full rounded-xl border border-farm-200 px-3 py-2"
      >
        <option value="">Select a field</option>
        {fields.map((field) => (
          <option key={field.id} value={field.id}>
            {field.name}
          </option>
        ))}
      </select>
    </label>
  );

  const renderInput = (
    name,
    label,
    { type = 'text', required = false, min, step, placeholder } = {}
  ) => (
    <label key={name} className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        value={form[name] ?? ''}
        onChange={updateForm}
        required={required}
        min={min}
        step={step}
        placeholder={placeholder}
        className="w-full rounded-xl border border-farm-200 px-3 py-2"
      />
    </label>
  );

  const renderSelect = (name, label, options, required = false) => (
    <label key={name} className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <select
        name={name}
        value={form[name] ?? ''}
        onChange={updateForm}
        required={required}
        className="w-full rounded-xl border border-farm-200 px-3 py-2"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );

  const renderTextarea = (name, label, required = false) => (
    <label key={name} className="block md:col-span-2">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <textarea
        name={name}
        value={form[name] ?? ''}
        onChange={updateForm}
        required={required}
        rows={3}
        className="w-full rounded-xl border border-farm-200 px-3 py-2"
      />
    </label>
  );

  const renderFormFields = () => {
    if (activeTab === 'scouting') {
      return (
        <>
          {renderFields()}
          {renderInput('scouting_date', 'Scouting date *', {
            type: 'date',
            required: true,
          })}
          {renderInput('pest_disease_name', 'Pest or disease name *', {
            required: true,
            placeholder: 'e.g. Fall armyworm',
          })}
          {renderSelect('type', 'Type *', ['Pest', 'Disease'], true)}
          {renderSelect(
            'severity',
            'Severity',
            ['Low', 'Medium', 'High', 'Critical']
          )}
          {renderInput('affected_area', 'Affected area (hectares)', {
            type: 'number',
            min: 0,
            step: 'any',
          })}
          {renderTextarea('notes', 'Observations')}
        </>
      );
    }

    if (activeTab === 'spraying') {
      return (
        <>
          {renderFields()}
          {renderInput('pest_disease_name', 'Pest or disease name *', {
            required: true,
          })}
          {renderInput('treatment', 'Treatment *', {
            required: true,
            placeholder: 'Treatment or product name',
          })}
          {renderInput('spraying_date', 'Spraying date *', {
            type: 'date',
            required: true,
          })}
          {renderInput('start_time', 'Start time', { type: 'time' })}
          {renderInput('duration_minutes', 'Duration (minutes)', {
            type: 'number',
            min: 0,
            step: 1,
          })}
          {renderSelect(
            'status',
            'Status',
            ['Scheduled', 'Completed', 'Cancelled']
          )}
          {renderTextarea('notes', 'Treatment notes')}
        </>
      );
    }

    return (
      <>
        {renderFields()}
        {renderInput('pest_disease_name', 'Pest or disease name *', {
          required: true,
        })}
        {renderInput('alert_date', 'Alert date *', {
          type: 'date',
          required: true,
        })}
        {renderSelect(
          'severity',
          'Severity',
          ['Low', 'Medium', 'High', 'Critical']
        )}
        {renderSelect('status', 'Status', ['Open', 'Investigating', 'Resolved'])}
        {renderTextarea('description', 'Description *', true)}
        {renderTextarea('notes', 'Additional notes')}
      </>
    );
  };

  const columns = {
    scouting: [
      ['scouting_date', 'Date'],
      ['pest_disease_name', 'Pest / disease'],
      ['type', 'Type'],
      ['severity', 'Severity'],
      ['affected_area', 'Affected area (ha)'],
    ],
    spraying: [
      ['spraying_date', 'Date'],
      ['pest_disease_name', 'Pest / disease'],
      ['treatment', 'Treatment'],
      ['start_time', 'Start time'],
      ['status', 'Status'],
    ],
    alerts: [
      ['alert_date', 'Date'],
      ['pest_disease_name', 'Pest / disease'],
      ['severity', 'Severity'],
      ['status', 'Status'],
      ['description', 'Description'],
    ],
  };

  const dateKeys = {
    scouting: 'scouting_date',
    spraying: 'spraying_date',
    alerts: 'alert_date',
  };

  return (
    <ModuleLayout
      title="Pest & Disease Management"
      subtitle="Monitor crop health, plan treatments, and manage outbreak alerts."
    >
      <div className="space-y-6">

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => switchTab(section.id)}
            className={`rounded-xl border p-4 text-left font-semibold ${
              activeTab === section.id
                ? 'border-farm-700 bg-farm-50 text-farm-800'
                : 'border-farm-100 bg-white text-slate-700 hover:bg-farm-50'
            }`}
          >
            {section.label}
            <span className="mt-2 block text-sm font-normal text-slate-500">
              {records[section.id].length} loaded records
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-2xl border border-farm-200 bg-farm-50 p-3 text-sm text-farm-700"
        >
          {success}
        </div>
      )}

      <section className="rounded-3xl bg-white p-4 shadow-[0_2px_16px_rgba(15,60,35,0.07)] md:p-6">
        <h2 className="mb-4 text-lg font-semibold text-farm-900">
          {editingId ? 'Edit record' : `Add ${sections.find((s) => s.id === activeTab)?.label}`}
        </h2>

        <form onSubmit={saveRecord} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {renderFormFields()}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || fields.length === 0}
              className="rounded-full bg-farm-700 px-5 py-2 font-medium text-white hover:bg-farm-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? 'Saving...'
                : editingId
                  ? 'Save changes'
                  : 'Add record'}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded-full border border-farm-200 px-5 py-2 text-slate-700 hover:bg-farm-50"
              >
                Cancel
              </button>
            )}
          </div>

          {fields.length === 0 && (
            <p className="text-sm text-amber-700">
              No fields are available. Check the fields API endpoint and create
              a field before adding records.
            </p>
          )}
        </form>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-[0_2px_16px_rgba(15,60,35,0.07)] md:p-6">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-lg font-semibold text-farm-900">
            {sections.find((s) => s.id === activeTab)?.label}
          </h2>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search records..."
            className="rounded-full border border-farm-200 px-3 py-2"
          />
        </div>

        {loading ? (
          <p className="py-8 text-center text-slate-500">Loading records...</p>
        ) : filteredRecords.length === 0 ? (
          <p className="py-8 text-center text-slate-500">
            No records found. Add your first record using the form above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="bg-farm-50 text-slate-600">
                <tr>
                  <th className="p-3">Field</th>
                  {columns[activeTab].map(([, label]) => (
                    <th key={label} className="p-3">
                      {label}
                    </th>
                  ))}
                  <th className="p-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-farm-100">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-farm-50">
                    <td className="p-3">{fieldName(record)}</td>

                    {columns[activeTab].map(([key]) => (
                      <td
                        key={key}
                        className="max-w-xs truncate p-3"
                        title={record[key] ?? ''}
                      >
                        {key === dateKeys[activeTab]
                          ? formatDate(record[key])
                          : record[key] ?? '—'}
                      </td>
                    ))}

                    <td className="whitespace-nowrap p-3">
                      <button
                        type="button"
                        onClick={() => startEditing(record)}
                        className="mr-3 font-medium text-blue-700 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRecord(record.id)}
                        className="font-medium text-red-700 hover:underline"
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

        <p className="mt-3 text-xs text-slate-500">
          The API currently returns up to 25 records per category.
        </p>
      </section>
      </div>
    </ModuleLayout>
  );
}

export default PestDiseaseManagement;
