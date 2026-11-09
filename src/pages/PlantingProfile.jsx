import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';
import {
    Alert,
    Badge,
    Button,
    Card,
    Field,
    Modal,
    RowAction,
    TableMessage,
    inputClass,
    thClass,
    tdClass,
} from '../components/ModuleUI.jsx';
import { DetailList, Insights, StatTile, formatDate } from '../components/ProfileParts.jsx';

/* ------------------------------------------------------------------ */
/* Small helpers                                                        */
/* ------------------------------------------------------------------ */

export const today = () => new Date().toISOString().slice(0, 10);

export const rowsOf = (response) => {
    const body = response.data;
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.data)) return body.data;
    return [];
};

export const errorText = (err) => {
    const errors = err.response?.data?.errors;
    if (errors) return Object.values(errors).flat().join(' ');
    return err.response?.data?.message || 'Something went wrong. Please try again.';
};

export const daysBetween = (from, to) => Math.round((to - from) / 86400000);

export const asDate = (value) => (value ? new Date(`${String(value).slice(0, 10)}T00:00:00`) : null);

export const statusTone = { planned: 'gray', planted: 'blue', growing: 'green', harvested: 'green', failed: 'red' };
export const healthTone = { healthy: 'green', fair: 'amber', poor: 'red', critical: 'red' };
export const severityTone = { low: 'green', medium: 'amber', high: 'red', critical: 'red' };
export const workTone = { scheduled: 'blue', completed: 'green', cancelled: 'gray' };
export const alertTone = { open: 'red', investigating: 'amber', resolved: 'green' };

export const toneBadge = (map, value) =>
    value ? <Badge tone={map[String(value).toLowerCase()] || 'gray'}>{value}</Badge> : '-';

/* ------------------------------------------------------------------ */
/* What each kind of record looks like (form fields and table columns)  */
/* ------------------------------------------------------------------ */

export const SECTIONS = {
    monitoring: {
        endpoint: '/api/crop-monitoring',
        noun: 'monitoring record',
        blank: () => ({
            monitoring_date: today(),
            growth_stage: '',
            plant_height: '',
            health_status: 'Healthy',
            estimated_yield: '',
            notes: '',
        }),
        fields: [
            { name: 'monitoring_date', label: 'Date checked', type: 'date', required: true },
            {
                name: 'growth_stage',
                label: 'Growth stage',
                type: 'select',
                options: ['Germination', 'Seedling', 'Vegetative', 'Flowering', 'Fruiting', 'Maturity'],
            },
            { name: 'plant_height', label: 'Plant height (cm)', type: 'number', step: 'any', placeholder: 'e.g. 35' },
            { name: 'health_status', label: 'Health', type: 'select', options: ['Healthy', 'Fair', 'Poor', 'Critical'] },
            { name: 'estimated_yield', label: 'Estimated yield', type: 'number', step: 'any' },
            { name: 'notes', label: 'Notes', type: 'textarea' },
        ],
        columns: [
            ['Date', (r) => formatDate(r.monitoring_date)],
            ['Growth stage', (r) => r.growth_stage || '-'],
            ['Height (cm)', (r) => r.plant_height ?? '-'],
            ['Health', (r) => toneBadge(healthTone, r.health_status)],
            ['Est. yield', (r) => r.estimated_yield ?? '-'],
            ['Notes', (r) => r.notes || '-'],
        ],
        empty: 'No check-ups recorded yet. Add the first one to start tracking this crop.',
    },
    scouting: {
        endpoint: '/api/scouting-records',
        noun: 'pest or disease sighting',
        blank: () => ({
            scouting_date: today(),
            pest_disease_name: '',
            type: 'Pest',
            severity: 'Medium',
            affected_area: '',
            notes: '',
        }),
        fields: [
            { name: 'scouting_date', label: 'Date seen', type: 'date', required: true },
            { name: 'pest_disease_name', label: 'Pest or disease name', type: 'text', required: true, placeholder: 'e.g. Fall armyworm' },
            { name: 'type', label: 'Type', type: 'select', options: ['Pest', 'Disease'] },
            { name: 'severity', label: 'Severity', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
            { name: 'affected_area', label: 'Affected area (hectares)', type: 'number', step: 'any' },
            { name: 'notes', label: 'Notes', type: 'textarea' },
        ],
        columns: [
            ['Date', (r) => formatDate(r.scouting_date)],
            ['Pest / disease', (r) => <span className="font-medium text-farm-900">{r.pest_disease_name}</span>],
            ['Type', (r) => r.type || '-'],
            ['Severity', (r) => toneBadge(severityTone, r.severity)],
            ['Area (ha)', (r) => r.affected_area ?? '-'],
            ['Notes', (r) => r.notes || '-'],
        ],
        empty: 'No pests or diseases seen on this crop yet.',
    },
    spraying: {
        endpoint: '/api/spraying-schedules',
        noun: 'spraying job',
        blank: () => ({
            pest_disease_name: '',
            treatment: '',
            spraying_date: today(),
            start_time: '',
            duration_minutes: '',
            status: 'Scheduled',
            notes: '',
        }),
        fields: [
            { name: 'pest_disease_name', label: 'Target pest or disease', type: 'text', required: true },
            { name: 'treatment', label: 'Treatment / product', type: 'text', required: true, placeholder: 'e.g. Neem oil' },
            { name: 'spraying_date', label: 'Spraying date', type: 'date', required: true },
            { name: 'start_time', label: 'Start time', type: 'time' },
            { name: 'duration_minutes', label: 'Duration (minutes)', type: 'number', step: '1' },
            { name: 'status', label: 'Status', type: 'select', options: ['Scheduled', 'Completed', 'Cancelled'] },
            { name: 'notes', label: 'Notes', type: 'textarea' },
        ],
        columns: [
            ['Date', (r) => `${formatDate(r.spraying_date)}${r.start_time ? ` ${String(r.start_time).slice(0, 5)}` : ''}`],
            ['Target', (r) => <span className="font-medium text-farm-900">{r.pest_disease_name}</span>],
            ['Treatment', (r) => r.treatment || '-'],
            ['Minutes', (r) => r.duration_minutes ?? '-'],
            ['Status', (r) => toneBadge(workTone, r.status)],
            ['Notes', (r) => r.notes || '-'],
        ],
        empty: 'No spraying planned or done for this crop yet.',
    },
    alerts: {
        endpoint: '/api/outbreak-alerts',
        noun: 'outbreak alert',
        blank: () => ({
            pest_disease_name: '',
            alert_date: today(),
            severity: 'Medium',
            description: '',
            status: 'Open',
            notes: '',
        }),
        fields: [
            { name: 'pest_disease_name', label: 'Pest or disease name', type: 'text', required: true },
            { name: 'alert_date', label: 'Alert date', type: 'date', required: true },
            { name: 'severity', label: 'Severity', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
            { name: 'status', label: 'Status', type: 'select', options: ['Open', 'Investigating', 'Resolved'] },
            { name: 'description', label: 'What is happening?', type: 'textarea', required: true },
            { name: 'notes', label: 'Notes', type: 'textarea' },
        ],
        columns: [
            ['Date', (r) => formatDate(r.alert_date)],
            ['Pest / disease', (r) => <span className="font-medium text-farm-900">{r.pest_disease_name}</span>],
            ['Severity', (r) => toneBadge(severityTone, r.severity)],
            ['Status', (r) => toneBadge(alertTone, r.status)],
            ['Description', (r) => r.description || '-'],
        ],
        empty: 'No outbreak alerts for this crop.',
    },
};

// Turn a saved record back into form values (dates and times need trimming).
export function toForm(section, record) {
    const values = {};
    SECTIONS[section].fields.forEach((f) => {
        let v = record[f.name];
        if (v === null || v === undefined) v = '';
        if (f.type === 'date') v = String(v).slice(0, 10);
        if (f.type === 'time') v = String(v).slice(0, 5);
        values[f.name] = v;
    });
    return values;
}

// Empty optional boxes are sent as null, numbers as numbers.
export function toPayload(section, form, plantingId) {
    const payload = { planting_id: Number(plantingId ?? form.planting_id) };
    SECTIONS[section].fields.forEach((f) => {
        const v = form[f.name];
        if (v === '' || v === undefined) {
            payload[f.name] = f.required ? v : null;
        } else if (f.type === 'number') {
            payload[f.name] = Number(v);
        } else {
            payload[f.name] = v;
        }
    });
    return payload;
}

/* ------------------------------------------------------------------ */
/* One add / edit form, built from the field list above                 */
/* ------------------------------------------------------------------ */

export function RecordForm({ section, initial, saving, error, onSubmit, onCancel, plantingOptions }) {
    const config = SECTIONS[section];
    const [form, setForm] = useState(initial);

    const change = (e) => setForm((cur) => ({ ...cur, [e.target.name]: e.target.value }));

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit(form);
            }}
            className="space-y-4"
        >
            {error && <Alert>{error}</Alert>}

            {plantingOptions && (
                <Field label="Where it is planted *">
                    <select
                        name="planting_id"
                        value={form.planting_id ?? ''}
                        onChange={change}
                        required
                        className={inputClass}
                    >
                        <option value="">Select a planting</option>
                        {plantingOptions.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </Field>
            )}

            {config.fields.map((f) => (
                <Field key={f.name} label={`${f.label}${f.required ? ' *' : ''}`}>
                    {f.type === 'select' ? (
                        <select name={f.name} value={form[f.name]} onChange={change} className={inputClass}>
                            {f.name === 'growth_stage' && <option value="">Select growth stage</option>}
                            {f.options.map((o) => (
                                <option key={o} value={o}>
                                    {o}
                                </option>
                            ))}
                        </select>
                    ) : f.type === 'textarea' ? (
                        <textarea
                            name={f.name}
                            value={form[f.name]}
                            onChange={change}
                            required={f.required}
                            rows={3}
                            className={inputClass}
                        />
                    ) : (
                        <input
                            name={f.name}
                            type={f.type}
                            value={form[f.name]}
                            onChange={change}
                            required={f.required}
                            min={f.type === 'number' ? '0' : undefined}
                            step={f.step}
                            placeholder={f.placeholder}
                            className={inputClass}
                        />
                    )}
                </Field>
            ))}

            <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                </Button>
            </div>
        </form>
    );
}

/* ------------------------------------------------------------------ */
/* A table of one kind of record, with Add / Edit / Delete              */
/* ------------------------------------------------------------------ */

export function RecordTable({ title, hint, section, rows, canEdit, canAdd = canEdit, extraColumn, onAdd, onEdit, onDelete }) {
    const config = SECTIONS[section];
    const columns = extraColumn ? [extraColumn, ...config.columns] : config.columns;
    const colSpan = columns.length + (canEdit ? 1 : 0);

    return (
        <Card>
            <div className="flex flex-col gap-3 px-6 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-base font-semibold text-farm-900">{title}</h2>
                    {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
                </div>
                {canAdd && (
                    <Button variant="accent" onClick={() => onAdd(section)}>
                        + Add
                    </Button>
                )}
            </div>

            <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                        <tr className="bg-farm-50">
                            {columns.map(([label]) => (
                                <th key={label} className={thClass}>
                                    {label}
                                </th>
                            ))}
                            {canEdit && <th className={thClass}>Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-farm-100">
                        {rows.length === 0 ? (
                            <TableMessage colSpan={colSpan}>{config.empty}</TableMessage>
                        ) : (
                            rows.map((row) => (
                                <tr key={row.id} className="transition hover:bg-farm-50">
                                    {columns.map(([label, render]) => (
                                        <td key={label} className={tdClass}>
                                            {render(row)}
                                        </td>
                                    ))}
                                    {canEdit && (
                                        <td className={tdClass}>
                                            <div className="flex gap-3">
                                                <RowAction onClick={() => onEdit(section, row)}>Edit</RowAction>
                                                <RowAction tone="danger" onClick={() => onDelete(section, row)}>
                                                    Delete
                                                </RowAction>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <div className="h-3" />
        </Card>
    );
}

/* ------------------------------------------------------------------ */
/* The page                                                             */
/* ------------------------------------------------------------------ */

export default function PlantingProfile() {
    const { plantingId } = useParams();
    const { api, user } = useAuth();
    // Same people who may change agronomy data on the server
    const canEdit = ['Farm-owner', 'Manager', 'Agronomist'].includes(user?.role);

    const [planting, setPlanting] = useState(null);
    const [data, setData] = useState({ monitoring: [], scouting: [], spraying: [], alerts: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [tab, setTab] = useState('monitoring');
    const [dialog, setDialog] = useState(null); // { section, record }
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const load = useCallback(async () => {
        setError('');
        try {
            const params = { planting_id: plantingId, per_page: 100 };
            const [p, monitoring, scouting, spraying, alerts] = await Promise.all([
                api.get(`/api/plantings/${plantingId}`),
                api.get(SECTIONS.monitoring.endpoint, { params }),
                api.get(SECTIONS.scouting.endpoint, { params }),
                api.get(SECTIONS.spraying.endpoint, { params }),
                api.get(SECTIONS.alerts.endpoint, { params }),
            ]);
            setPlanting(p.data?.data || p.data);
            setData({
                monitoring: rowsOf(monitoring),
                scouting: rowsOf(scouting),
                spraying: rowsOf(spraying),
                alerts: rowsOf(alerts),
            });
        } catch (err) {
            setError(
                err.response?.status === 404
                    ? 'This planting no longer exists.'
                    : errorText(err)
            );
        } finally {
            setLoading(false);
        }
    }, [api, plantingId]);

    useEffect(() => {
        setLoading(true);
        load();
    }, [load]);

    const openAdd = (section) => {
        setFormError('');
        setDialog({ section, record: null });
    };
    const openEdit = (section, record) => {
        setFormError('');
        setDialog({ section, record });
    };

    async function save(form) {
        const { section, record } = dialog;
        setSaving(true);
        setFormError('');
        try {
            const payload = toPayload(section, form, plantingId);
            const res = record
                ? await api.put(`${SECTIONS[section].endpoint}/${record.id}`, payload)
                : await api.post(SECTIONS[section].endpoint, payload);
            setDialog(null);
            setSuccess(res.data?.message || `The ${SECTIONS[section].noun} was saved.`);
            await load();
        } catch (err) {
            setFormError(errorText(err));
        } finally {
            setSaving(false);
        }
    }

    async function remove(section, record) {
        if (!window.confirm(`Delete this ${SECTIONS[section].noun}?`)) return;
        setError('');
        setSuccess('');
        try {
            await api.delete(`${SECTIONS[section].endpoint}/${record.id}`);
            setSuccess(`The ${SECTIONS[section].noun} was deleted.`);
            await load();
        } catch (err) {
            setError(errorText(err));
        }
    }

    /* ---- numbers shown at the top ---- */

    const latest = data.monitoring[0]; // the API sends newest first
    const openAlerts = data.alerts.filter((a) => a.status !== 'Resolved');
    const pendingSprays = data.spraying.filter((s) => s.status === 'Scheduled');
    const issueCount = data.scouting.length + data.alerts.length;

    const planted = asDate(planting?.planting_date);
    const harvest = asDate(planting?.expected_harvest_date);
    const now = new Date();
    let progress = null;
    if (planted && harvest && harvest > planted) {
        progress = planting.status === 'harvested'
            ? 100
            : Math.max(0, Math.min(100, Math.round(((now - planted) / (harvest - planted)) * 100)));
    }
    const daysSincePlanting = planted ? Math.max(0, daysBetween(planted, now)) : null;
    const daysToHarvest = harvest ? daysBetween(now, harvest) : null;
    const daysSinceCheck = latest ? Math.max(0, daysBetween(asDate(latest.monitoring_date), now)) : null;

    const insights = planting
        ? [
              data.monitoring.length === 0 && canEdit
                  ? 'No check-up has been recorded for this crop yet.'
                  : null,
              daysSinceCheck !== null && daysSinceCheck > 7 && !['harvested', 'failed'].includes(planting.status)
                  ? `It has been ${daysSinceCheck} days since this crop was last checked.`
                  : null,
              latest && ['poor', 'critical'].includes(String(latest.health_status).toLowerCase())
                  ? `The last check rated this crop's health as ${latest.health_status}.`
                  : null,
              openAlerts.length > 0
                  ? `${openAlerts.length} outbreak ${openAlerts.length === 1 ? 'alert is' : 'alerts are'} still unresolved.`
                  : null,
              pendingSprays.length > 0
                  ? `${pendingSprays.length} spraying ${pendingSprays.length === 1 ? 'job is' : 'jobs are'} scheduled.`
                  : null,
              daysToHarvest !== null && daysToHarvest >= 0 && daysToHarvest <= 14 && planting.status !== 'harvested'
                  ? `Harvest is expected in ${daysToHarvest} ${daysToHarvest === 1 ? 'day' : 'days'}.`
                  : null,
          ]
        : [];

    const cropName = planting?.crop?.name || 'Planted crop';

    return (
        <ModuleLayout
            title={planting ? `${cropName}${planting.field?.name ? ` - ${planting.field.name}` : ''}` : 'Planting profile'}
            subtitle="Growth, monitoring, pests and diseases for this planted crop."
        >
            <div className="mx-auto max-w-7xl space-y-6">
                <Link to="/crops?tab=plantings" className="inline-flex text-sm font-medium text-farm-700 hover:underline">
                    Back to plantings
                </Link>

                {error && <Alert>{error}</Alert>}
                {success && <Alert tone="info">{success}</Alert>}
                {loading && <p className="py-10 text-center text-sm text-slate-500">Loading this planting...</p>}

                {planting && (
                    <>
                        <Card>
                            <div className="space-y-5 p-6">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="text-xl font-semibold text-farm-900">{cropName}</h2>
                                    <Badge tone={statusTone[planting.status] || 'gray'}>
                                        {(planting.status || 'planned').charAt(0).toUpperCase() +
                                            (planting.status || 'planned').slice(1)}
                                    </Badge>
                                    {planting.crop?.category && <Badge tone="blue">{planting.crop.category}</Badge>}
                                </div>

                                <DetailList
                                    items={[
                                        ['Field', planting.field?.name],
                                        ['Farm', planting.field?.farm?.name],
                                        ['Planted on', formatDate(planting.planting_date)],
                                        ['Expected harvest', formatDate(planting.expected_harvest_date)],
                                        [
                                            'Quantity planted',
                                            planting.quantity_planted !== null && planting.quantity_planted !== undefined
                                                ? `${planting.quantity_planted} ${planting.unit || ''}`.trim()
                                                : null,
                                        ],
                                        [
                                            'Days to maturity',
                                            planting.crop?.maturity_days ? `${planting.crop.maturity_days} days` : null,
                                        ],
                                        ['Notes', planting.notes],
                                    ]}
                                />

                                {progress !== null && (
                                    <div>
                                        <div className="mb-1 flex justify-between text-xs text-slate-500">
                                            <span>
                                                {daysSincePlanting !== null ? `Day ${daysSincePlanting} since planting` : ''}
                                            </span>
                                            <span>
                                                {planting.status === 'harvested'
                                                    ? 'Harvested'
                                                    : daysToHarvest >= 0
                                                      ? `${daysToHarvest} ${daysToHarvest === 1 ? 'day' : 'days'} to harvest`
                                                      : `${Math.abs(daysToHarvest)} days past expected harvest`}
                                            </span>
                                        </div>
                                        <div
                                            className="h-2.5 overflow-hidden rounded-full bg-farm-100"
                                            role="progressbar"
                                            aria-valuenow={progress}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-label="Progress from planting to expected harvest"
                                        >
                                            <div className="h-full rounded-full bg-farm-500" style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatTile
                                label="Latest health"
                                value={latest?.health_status || 'Not checked'}
                                hint={latest ? `On ${formatDate(latest.monitoring_date)}` : 'No check-ups yet'}
                            />
                            <StatTile
                                label="Plant height"
                                value={latest?.plant_height !== null && latest?.plant_height !== undefined ? `${latest.plant_height} cm` : '-'}
                                hint={latest?.growth_stage || 'Growth stage not recorded'}
                            />
                            <StatTile
                                label="Estimated yield"
                                value={latest?.estimated_yield ?? '-'}
                                hint="From the latest check-up"
                            />
                            <StatTile
                                label="Pest & disease issues"
                                value={issueCount}
                                hint={
                                    openAlerts.length > 0
                                        ? `${openAlerts.length} unresolved ${openAlerts.length === 1 ? 'alert' : 'alerts'}`
                                        : 'No unresolved alerts'
                                }
                            />
                        </div>

                        <Insights lines={insights} />

                        {latest?.advice && (
                            <Card
                                title={
                                    latest.advice.stage
                                        ? `What to do now: ${latest.advice.stage} stage`
                                        : 'What to do now'
                                }
                            >
                                <div className="px-6 pb-6 pt-3">
                                    <p className="text-xs text-slate-500">
                                        Based on the check-up of {formatDate(latest.monitoring_date)}. The same guidance was sent to
                                        notifications.
                                    </p>
                                    <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
                                        {latest.advice.steps.map((step) => (
                                            <li key={step}>{step}</li>
                                        ))}
                                    </ol>
                                    {latest.advice.next_stage && (
                                        <p className="mt-4 text-xs font-medium text-farm-700">
                                            Next stage: {latest.advice.next_stage}
                                        </p>
                                    )}
                                </div>
                            </Card>
                        )}

                        <div className="flex gap-2 border-b border-farm-200" role="tablist">
                            {[
                                ['monitoring', `Monitoring (${data.monitoring.length})`],
                                ['pests', `Pests & Diseases (${issueCount + data.spraying.length})`],
                            ].map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === key}
                                    onClick={() => setTab(key)}
                                    className={`-mb-px rounded-t-xl border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                                        tab === key
                                            ? 'border-farm-700 text-farm-900'
                                            : 'border-transparent text-slate-500 hover:text-farm-800'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {tab === 'monitoring' && (
                            <RecordTable
                                title="Crop monitoring"
                                hint="Growth stage, height, health and expected yield at each check-up."
                                section="monitoring"
                                rows={data.monitoring}
                                canEdit={canEdit}
                                onAdd={openAdd}
                                onEdit={openEdit}
                                onDelete={remove}
                            />
                        )}

                        {tab === 'pests' && (
                            <div className="space-y-6">
                                <RecordTable
                                    title="Pest and disease sightings"
                                    hint="What was found on this crop, how bad it is and how much area it covers."
                                    section="scouting"
                                    rows={data.scouting}
                                    canEdit={canEdit}
                                    onAdd={openAdd}
                                    onEdit={openEdit}
                                    onDelete={remove}
                                />
                                <RecordTable
                                    title="Spraying and treatment"
                                    hint="Treatments planned or done against these pests and diseases."
                                    section="spraying"
                                    rows={data.spraying}
                                    canEdit={canEdit}
                                    onAdd={openAdd}
                                    onEdit={openEdit}
                                    onDelete={remove}
                                />
                                <RecordTable
                                    title="Outbreak alerts"
                                    hint="Serious or fast-spreading problems that need follow-up."
                                    section="alerts"
                                    rows={data.alerts}
                                    canEdit={canEdit}
                                    onAdd={openAdd}
                                    onEdit={openEdit}
                                    onDelete={remove}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            {dialog && (
                <Modal
                    title={`${dialog.record ? 'Edit' : 'Add'} ${SECTIONS[dialog.section].noun}`}
                    onClose={() => setDialog(null)}
                >
                    <RecordForm
                        section={dialog.section}
                        initial={dialog.record ? toForm(dialog.section, dialog.record) : SECTIONS[dialog.section].blank()}
                        saving={saving}
                        error={formError}
                        onSubmit={save}
                        onCancel={() => setDialog(null)}
                    />
                </Modal>
            )}
        </ModuleLayout>
    );
}
