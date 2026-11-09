import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';
import { Alert, Badge, Card, Modal, TableMessage, thClass, tdClass } from '../components/ModuleUI.jsx';
import { DetailList, Insights, StatTile, formatDate } from '../components/ProfileParts.jsx';
import {
    RecordForm,
    RecordTable,
    SECTIONS,
    errorText,
    rowsOf,
    statusTone,
    toForm,
    toPayload,
} from './PlantingProfile.jsx';

const capital = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : '');

/**
 * One registered crop's own page: every place it is planted, and the monitoring,
 * pests and diseases recorded on all of those plantings.
 */
export default function CropProfile() {
    const { cropId } = useParams();
    const { api, user } = useAuth();
    const navigate = useNavigate();
    const canEdit = ['Farm-owner', 'Manager', 'Agronomist'].includes(user?.role);

    const [crop, setCrop] = useState(null);
    const [plantings, setPlantings] = useState([]);
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
            const params = { crop_id: cropId, per_page: 100 };
            const [c, p, monitoring, scouting, spraying, alerts] = await Promise.all([
                api.get(`/api/crops/${cropId}`),
                api.get('/api/plantings', { params }),
                api.get(SECTIONS.monitoring.endpoint, { params }),
                api.get(SECTIONS.scouting.endpoint, { params }),
                api.get(SECTIONS.spraying.endpoint, { params }),
                api.get(SECTIONS.alerts.endpoint, { params }),
            ]);
            setCrop(c.data?.data || c.data);
            setPlantings(rowsOf(p));
            setData({
                monitoring: rowsOf(monitoring),
                scouting: rowsOf(scouting),
                spraying: rowsOf(spraying),
                alerts: rowsOf(alerts),
            });
        } catch (err) {
            setError(err.response?.status === 404 ? 'This crop no longer exists.' : errorText(err));
        } finally {
            setLoading(false);
        }
    }, [api, cropId]);

    useEffect(() => {
        setLoading(true);
        load();
    }, [load]);

    // The choices in the "where it is planted" box of every form
    const plantingOptions = useMemo(
        () =>
            plantings.map((p) => ({
                id: p.id,
                label: `${p.field?.name || 'Field'}${p.field?.farm?.name ? ` (${p.field.farm.name})` : ''} - planted ${formatDate(p.planting_date)}`,
            })),
        [plantings]
    );

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
            const payload = toPayload(section, form);
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

    const activePlantings = plantings.filter((p) => ['planned', 'planted', 'growing'].includes(p.status));
    const fieldCount = new Set(plantings.map((p) => p.field_id)).size;
    const latest = data.monitoring[0]; // newest first
    const openAlerts = data.alerts.filter((a) => a.status !== 'Resolved');
    const issueCount = data.scouting.length + data.alerts.length;
    const poorChecks = data.monitoring.filter((m) =>
        ['poor', 'critical'].includes(String(m.health_status).toLowerCase())
    ).length;

    const insights = crop
        ? [
              plantings.length === 0
                  ? 'This crop is registered but has not been planted in any field yet.'
                  : null,
              plantings.length > 0 && data.monitoring.length === 0 && canEdit
                  ? 'None of the plantings of this crop has a monitoring record yet.'
                  : null,
              openAlerts.length > 0
                  ? `${openAlerts.length} outbreak ${openAlerts.length === 1 ? 'alert is' : 'alerts are'} still unresolved on this crop.`
                  : null,
              poorChecks > 0
                  ? `${poorChecks} ${poorChecks === 1 ? 'check-up rated' : 'check-ups rated'} this crop's health as Poor or Critical.`
                  : null,
              data.scouting.length > 0
                  ? (() => {
                        const counts = {};
                        data.scouting.forEach((s) => {
                            counts[s.pest_disease_name] = (counts[s.pest_disease_name] || 0) + 1;
                        });
                        const [name, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
                        return `The most reported problem is ${name} (${n} ${n === 1 ? 'sighting' : 'sightings'}).`;
                    })()
                  : null,
          ]
        : [];

    // Which planting a record belongs to, shown first in every table
    const plantedIn = [
        'Planted in',
        (r) => {
            const planting = plantings.find((p) => p.id === r.planting_id) || r.planting;
            if (!planting) return '-';
            return (
                <Link
                    to={`/plantings/${planting.id}`}
                    className="font-medium text-farm-700 hover:underline"
                >
                    {planting.field?.name || r.field?.name || 'Field'}
                </Link>
            );
        },
    ];

    const formFor = (dialog) =>
        dialog.record
            ? { ...toForm(dialog.section, dialog.record), planting_id: String(dialog.record.planting_id ?? '') }
            : {
                  ...SECTIONS[dialog.section].blank(),
                  planting_id: plantingOptions.length === 1 ? String(plantingOptions[0].id) : '',
              };

    const canAdd = canEdit && plantings.length > 0;
    const pestTotal = issueCount + data.spraying.length;

    return (
        <ModuleLayout
            title={crop?.name || 'Crop profile'}
            subtitle="Where this crop is planted, how it is growing, and its pests and diseases."
        >
            <div className="mx-auto max-w-7xl space-y-6">
                <Link to="/crops" className="inline-flex text-sm font-medium text-farm-700 hover:underline">
                    Back to crops
                </Link>

                {error && <Alert>{error}</Alert>}
                {success && <Alert tone="info">{success}</Alert>}
                {loading && <p className="py-10 text-center text-sm text-slate-500">Loading this crop...</p>}

                {crop && (
                    <>
                        <Card>
                            <div className="space-y-4 p-6">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="text-xl font-semibold text-farm-900">{crop.name}</h2>
                                    {crop.category && <Badge tone="blue">{crop.category}</Badge>}
                                </div>
                                <DetailList
                                    items={[
                                        ['Days to maturity', crop.maturity_days ? `${crop.maturity_days} days` : null],
                                        ['Description', crop.description],
                                    ]}
                                />
                            </div>
                        </Card>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatTile
                                label="Plantings"
                                value={plantings.length}
                                hint={`${activePlantings.length} still active`}
                            />
                            <StatTile
                                label="Fields"
                                value={fieldCount}
                                hint={fieldCount === 1 ? 'Planted in 1 field' : `Planted across ${fieldCount} fields`}
                            />
                            <StatTile
                                label="Latest health"
                                value={latest?.health_status || 'Not checked'}
                                hint={latest ? `On ${formatDate(latest.monitoring_date)}` : 'No check-ups yet'}
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

                        <Card title="Where it is planted">
                            <div className="mt-3 overflow-x-auto">
                                <table className="w-full min-w-[640px] text-left text-sm">
                                    <thead>
                                        <tr className="bg-farm-50">
                                            <th className={thClass}>Field</th>
                                            <th className={thClass}>Farm</th>
                                            <th className={thClass}>Planted</th>
                                            <th className={thClass}>Expected harvest</th>
                                            <th className={thClass}>Quantity</th>
                                            <th className={thClass}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-farm-100">
                                        {plantings.length === 0 ? (
                                            <TableMessage colSpan={6}>
                                                Not planted anywhere yet. Add a planting from the Plantings tab and it will
                                                appear here.
                                            </TableMessage>
                                        ) : (
                                            plantings.map((p) => (
                                                <tr
                                                    key={p.id}
                                                    onClick={() => navigate(`/plantings/${p.id}`)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') navigate(`/plantings/${p.id}`);
                                                    }}
                                                    tabIndex={0}
                                                    title="Open this planting"
                                                    className="cursor-pointer transition hover:bg-farm-50 focus:bg-farm-50 focus:outline-none"
                                                >
                                                    <td className={`${tdClass} font-medium text-farm-900`}>
                                                        {p.field?.name || '-'}
                                                    </td>
                                                    <td className={tdClass}>{p.field?.farm?.name || '-'}</td>
                                                    <td className={tdClass}>{formatDate(p.planting_date)}</td>
                                                    <td className={tdClass}>{formatDate(p.expected_harvest_date)}</td>
                                                    <td className={tdClass}>
                                                        {p.quantity_planted !== null && p.quantity_planted !== undefined
                                                            ? `${p.quantity_planted} ${p.unit || ''}`.trim()
                                                            : '-'}
                                                    </td>
                                                    <td className={tdClass}>
                                                        <Badge tone={statusTone[p.status] || 'gray'}>
                                                            {capital(p.status || 'planned')}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="h-3" />
                        </Card>

                        <div className="flex gap-2 border-b border-farm-200" role="tablist">
                            {[
                                ['monitoring', `Monitoring (${data.monitoring.length})`],
                                ['pests', `Pests & Diseases (${pestTotal})`],
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

                        {canEdit && plantings.length === 0 && (
                            <Alert tone="warning">
                                Plant this crop in a field first. Monitoring and pest records are kept for each planting.
                            </Alert>
                        )}

                        {tab === 'monitoring' && (
                            <RecordTable
                                title="Crop monitoring"
                                hint="Check-ups on every planting of this crop, newest first."
                                section="monitoring"
                                rows={data.monitoring}
                                canEdit={canEdit}
                                canAdd={canAdd}
                                extraColumn={plantedIn}
                                onAdd={openAdd}
                                onEdit={openEdit}
                                onDelete={remove}
                            />
                        )}

                        {tab === 'pests' && (
                            <div className="space-y-6">
                                <RecordTable
                                    title="Pest and disease sightings"
                                    hint="What was found on this crop, and where."
                                    section="scouting"
                                    rows={data.scouting}
                                    canEdit={canEdit}
                                    canAdd={canAdd}
                                    extraColumn={plantedIn}
                                    onAdd={openAdd}
                                    onEdit={openEdit}
                                    onDelete={remove}
                                />
                                <RecordTable
                                    title="Spraying and treatment"
                                    hint="Treatments planned or done on this crop."
                                    section="spraying"
                                    rows={data.spraying}
                                    canEdit={canEdit}
                                    canAdd={canAdd}
                                    extraColumn={plantedIn}
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
                                    canAdd={canAdd}
                                    extraColumn={plantedIn}
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
                        initial={formFor(dialog)}
                        plantingOptions={plantingOptions}
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
