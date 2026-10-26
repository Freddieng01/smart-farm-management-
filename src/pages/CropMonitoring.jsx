
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';

const emptyForm = {
  planting_id: '',
  monitoring_date: new Date().toISOString().slice(0, 10),
  growth_stage: '',
  plant_height: '',
  health_status: 'Healthy',
  estimated_yield: '',
  notes: '',
};

export default function CropMonitoring() {
  const { api } = useAuth();

  const [records, setRecords] = useState([]);
  const [plantings, setPlantings] = useState([]);
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
      const [monitoringResponse, plantingResponse] = await Promise.all([
        api.get('/api/crop-monitoring'),
        api.get('/api/plantings'),
      ]);

      const monitoringData = monitoringResponse.data;
      const plantingData = plantingResponse.data;

      setRecords(
        Array.isArray(monitoringData)
          ? monitoringData
          : monitoringData.data || []
      );

      setPlantings(
        Array.isArray(plantingData)
          ? plantingData
          : plantingData.data || []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to load crop monitoring records. Please check your API routes and connection.'
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
      planting_id: Number(form.planting_id),
      plant_height:
        form.plant_height === '' ? null : Number(form.plant_height),
      estimated_yield:
        form.estimated_yield === '' ? null : Number(form.estimated_yield),
    };

    try {
      if (editingId) {
        await api.put(`/api/crop-monitoring/${editingId}`, payload);
        setSuccess('Monitoring record updated successfully.');
      } else {
        await api.post('/api/crop-monitoring', payload);
        setSuccess('Monitoring record created successfully.');
      }

      resetForm();
      await loadData();
    } catch (err) {
      const validationErrors = err.response?.data?.errors;

      setError(
        validationErrors
          ? Object.values(validationErrors).flat().join(' ')
          : err.response?.data?.message || 'Failed to save monitoring record.'
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(record) {
    setEditingId(record.id);

    setForm({
      planting_id: String(record.planting_id),
      monitoring_date: String(record.monitoring_date || '').slice(0, 10),
      growth_stage: record.growth_stage || '',
      plant_height: record.plant_height ?? '',
      health_status: record.health_status || 'Healthy',
      estimated_yield: record.estimated_yield ?? '',
      notes: record.notes || '',
    });

    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(record) {
    if (!window.confirm('Delete this crop monitoring record?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await api.delete(`/api/crop-monitoring/${record.id}`);
      setSuccess('Monitoring record deleted successfully.');

      if (editingId === record.id) {
        resetForm();
      }

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to delete monitoring record.'
      );
    }
  }

  function getPlantingLabel(planting) {
    const cropName = planting.crop?.name || planting.crop?.crop_type || 'Crop';
    const fieldName = planting.field?.name || 'Field not specified';

    return `${cropName} — ${fieldName} (Planting #${planting.id})`;
  }

  function getHealthClass(status) {
    switch ((status || '').toLowerCase()) {
      case 'healthy':
        return 'bg-farm-100 text-farm-800';
      case 'poor':
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'fair':
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  return (
    <ModuleLayout
      title="Crop Monitoring"
      subtitle="Monitor crop growth, health, and estimated yield."
    >
      <div className="space-y-6">

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-farm-200 bg-farm-50 p-3 text-sm text-farm-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl bg-white p-5 shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
          <p className="text-sm text-slate-500">Monitoring Records</p>
          <p className="mt-2 text-2xl font-bold text-farm-900">
            {records.length}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
          <p className="text-sm text-slate-500">Healthy Crops</p>
          <p className="mt-2 text-2xl font-bold text-farm-700">
            {records.filter(
              (record) =>
                (record.health_status || '').toLowerCase() === 'healthy'
            ).length}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
          <p className="text-sm text-slate-500">Plantings Available</p>
          <p className="mt-2 text-2xl font-bold text-blue-700">
            {plantings.length}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-3xl bg-white p-5 shadow-[0_2px_16px_rgba(15,60,35,0.07)]"
      >
        <h2 className="text-lg font-semibold text-farm-900">
          {editingId ? 'Edit Monitoring Record' : 'Add Monitoring Record'}
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Planting Record *
            </label>
            <select
              name="planting_id"
              value={form.planting_id}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-farm-200 p-2.5"
            >
              <option value="">Select a planting</option>
              {plantings.map((planting) => (
                <option key={planting.id} value={planting.id}>
                  {getPlantingLabel(planting)}
                </option>
              ))}
            </select>
            {plantings.length === 0 && !loading && (
              <p className="mt-1 text-xs text-amber-700">
                No planting records found. Create a planting record first.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Monitoring Date *
            </label>
            <input
              type="date"
              name="monitoring_date"
              value={form.monitoring_date}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-farm-200 p-2.5"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Growth Stage
            </label>
            <select
              name="growth_stage"
              value={form.growth_stage}
              onChange={handleChange}
              className="w-full rounded-xl border border-farm-200 p-2.5"
            >
              <option value="">Select growth stage</option>
              <option value="Germination">Germination</option>
              <option value="Seedling">Seedling</option>
              <option value="Vegetative">Vegetative</option>
              <option value="Flowering">Flowering</option>
              <option value="Fruiting">Fruiting</option>
              <option value="Maturity">Maturity</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Plant Height (cm)
            </label>
            <input
              type="number"
              name="plant_height"
              value={form.plant_height}
              onChange={handleChange}
              min="0"
              step="any"
              placeholder="e.g. 35"
              className="w-full rounded-xl border border-farm-200 p-2.5"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Health Status
            </label>
            <select
              name="health_status"
              value={form.health_status}
              onChange={handleChange}
              className="w-full rounded-xl border border-farm-200 p-2.5"
            >
              <option value="Healthy">Healthy</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Estimated Yield
            </label>
            <input
              type="number"
              name="estimated_yield"
              value={form.estimated_yield}
              onChange={handleChange}
              min="0"
              step="any"
              placeholder="Enter estimated yield"
              className="w-full rounded-xl border border-farm-200 p-2.5"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Notes and Observations
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Record growth observations, pests, disease symptoms, or other issues..."
              className="w-full rounded-xl border border-farm-200 p-2.5"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || plantings.length === 0}
            className="rounded-full bg-farm-700 px-5 py-2.5 font-medium text-white hover:bg-farm-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? 'Saving...'
              : editingId
                ? 'Update Record'
                : 'Save Monitoring Record'}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-farm-200 px-5 py-2.5 font-medium text-slate-700 hover:bg-farm-50"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div className="overflow-hidden rounded-3xl bg-white shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold text-farm-900">
            Monitoring History
          </h2>
        </div>

        {loading ? (
          <p className="p-6 text-slate-500">Loading monitoring records...</p>
        ) : records.length === 0 ? (
          <p className="p-6 text-slate-500">
            No monitoring records yet. Use the form above to add your first
            record.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-farm-100">
              <thead className="bg-farm-50">
                <tr>
                  {[
                    'Date',
                    'Crop',
                    'Field',
                    'Growth Stage',
                    'Height (cm)',
                    'Health',
                    'Estimated Yield',
                    'Actions',
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-farm-100">
                {records.map((record) => {
                  const planting = record.planting || {};

                  return (
                    <tr key={record.id} className="hover:bg-farm-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                        {String(record.monitoring_date || '').slice(0, 10)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-farm-900">
                        {planting.crop?.name ||
                          planting.crop?.crop_type ||
                          '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {planting.field?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {record.growth_stage || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {record.plant_height ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${getHealthClass(record.health_status)}`}
                        >
                          {record.health_status || 'Not recorded'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {record.estimated_yield ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <button
                          type="button"
                          onClick={() => handleEdit(record)}
                          className="mr-3 font-medium text-blue-700 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(record)}
                          className="font-medium text-red-700 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </ModuleLayout>
  );
}
