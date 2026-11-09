import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleHub from '../components/ModuleHub.jsx';
import MapWidget from '../components/MapWidget.jsx';
import FieldManagement from './FieldManagement.jsx';
import { money } from '../utils/currency.js';

const card = 'rounded-3xl bg-white shadow-[0_2px_16px_rgba(15,60,35,0.07)]';
const label = (s) => String(s || '').replace(/_/g, ' ');

function Stat({ title, value }) {
    return (
        <div className={`${card} p-4`}>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-farm-900 tabular-nums">{value}</p>
        </div>
    );
}

function hasLocation(farm) {
    return Number.isFinite(Number(farm.latitude)) && farm.latitude !== null
        && Number.isFinite(Number(farm.longitude)) && farm.longitude !== null;
}

/* ---------- Overview ---------- */

function Overview({ farm }) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat title="Acreage" value={`${Number(farm.total_acreage || 0).toLocaleString()} ac`} />
                <Stat title="Fields" value={farm.fields?.length ?? 0} />
                <Stat title="Employees" value={farm.employees?.length ?? 0} />
                <Stat title="Location" value={hasLocation(farm) ? 'Mapped' : 'Not mapped'} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <section className={`${card} p-6 lg:col-span-1`}>
                    <h2 className="text-base font-semibold text-farm-900">Farm details</h2>
                    <dl className="mt-4 space-y-3 text-sm">
                        <div className="flex justify-between gap-3">
                            <dt className="text-slate-500">Owner</dt>
                            <dd className="text-right font-medium text-slate-800">{farm.owner?.name || 'Not assigned'}</dd>
                        </div>
                        {farm.owner?.email && (
                            <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Owner email</dt>
                                <dd className="text-right text-slate-800">{farm.owner.email}</dd>
                            </div>
                        )}
                        <div className="flex justify-between gap-3">
                            <dt className="text-slate-500">Coordinates</dt>
                            <dd className="text-right text-slate-800">
                                {hasLocation(farm) ? `${Number(farm.latitude).toFixed(4)}, ${Number(farm.longitude).toFixed(4)}` : '—'}
                            </dd>
                        </div>
                    </dl>

                    <h3 className="mt-6 text-sm font-semibold text-farm-900">Fields</h3>
                    {farm.fields?.length ? (
                        <ul className="mt-2 divide-y divide-farm-100 text-sm">
                            {farm.fields.map((field) => (
                                <li key={field.id} className="flex justify-between gap-3 py-2">
                                    <span className="font-medium text-slate-800">{field.name}</span>
                                    <span className="text-slate-500">{field.size_hectares} ha</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-2 text-sm text-slate-500">No fields yet. Add one in the Fields tab.</p>
                    )}
                </section>

                <section className={`${card} overflow-hidden lg:col-span-2`}>
                    <h2 className="px-6 pt-5 text-base font-semibold text-farm-900">Location and fields</h2>
                    <div className="p-6 pt-4">
                        <MapWidget farmId={farm.id} />
                    </div>
                </section>
            </div>
        </div>
    );
}

/* ---------- Fields: the GPS map above the list, kept in step ---------- */

function FarmFields({ farmId }) {
    // bumping the key reloads the list when a field is drawn on the map
    const [version, setVersion] = useState(0);

    return (
        <div className="space-y-6">
            <section className={`${card} overflow-hidden`}>
                <h2 className="px-6 pt-5 text-base font-semibold text-farm-900">Field map</h2>
                <p className="px-6 text-sm text-slate-500">Each green shape is a field. Farm-owners and Managers can plot a new one on the map.</p>
                <div className="p-6 pt-4">
                    <MapWidget farmId={farmId} onFieldsChanged={() => setVersion((v) => v + 1)} />
                </div>
            </section>
            <FieldManagement key={version} />
        </div>
    );
}

/* ---------- Livestock kept on this farm ---------- */

function FarmLivestock({ farmId }) {
    const { api } = useAuth();
    const [animals, setAnimals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let ignore = false;
        setLoading(true);
        api.get('/api/livestock', { params: { farm_id: farmId } })
            .then((res) => { if (!ignore) setAnimals(Array.isArray(res.data) ? res.data : (res.data.data ?? [])); })
            .catch((err) => { if (!ignore) setError(err.response?.data?.message || 'Failed to load livestock.'); })
            .finally(() => { if (!ignore) setLoading(false); });
        return () => { ignore = true; };
    }, [api, farmId]);

    const heads = (animal) => Number(animal.head_count || 1);
    const total = animals.reduce((sum, animal) => sum + heads(animal), 0);
    const bySpecies = animals.reduce((acc, animal) => {
        acc[animal.species] = (acc[animal.species] || 0) + heads(animal);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat title="Total animals" value={loading ? '–' : total} />
                <Stat title="Records" value={loading ? '–' : animals.length} />
                {Object.entries(bySpecies).slice(0, 2).map(([species, count]) => (
                    <Stat key={species} title={species} value={count} />
                ))}
            </div>

            <div className={`${card} overflow-x-auto`}>
                <div className="flex items-center justify-between px-6 pt-5">
                    <h2 className="text-base font-semibold text-farm-900">Animals on this farm</h2>
                    <Link to="/crops?tab=livestock" className="text-sm font-medium text-farm-700 hover:underline">Open Livestock</Link>
                </div>
                <table className="mt-3 w-full text-left text-sm">
                    <thead className="bg-farm-50 text-xs text-farm-700">
                        <tr>
                            <th className="px-6 py-3 font-semibold">Tag</th>
                            <th className="px-6 py-3 font-semibold">Species</th>
                            <th className="px-6 py-3 font-semibold">Breed</th>
                            <th className="px-6 py-3 font-semibold">Sex</th>
                            <th className="px-6 py-3 font-semibold">Head count</th>
                            <th className="px-6 py-3 font-semibold">Weight</th>
                            <th className="px-6 py-3 font-semibold">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-farm-100">
                        {loading ? (
                            <tr><td colSpan="7" className="px-6 py-10 text-center text-slate-500">Loading livestock...</td></tr>
                        ) : animals.length === 0 ? (
                            <tr><td colSpan="7" className="px-6 py-10 text-center text-slate-500">No livestock recorded on this farm yet.</td></tr>
                        ) : animals.map((animal) => (
                            <tr key={animal.id} className="hover:bg-farm-50">
                                <td className="px-6 py-3 font-medium text-farm-900">{animal.tag_number}</td>
                                <td className="px-6 py-3 text-slate-500">{animal.species}</td>
                                <td className="px-6 py-3 text-slate-500">{animal.breed || '—'}</td>
                                <td className="px-6 py-3 text-slate-500">{animal.sex}</td>
                                <td className="px-6 py-3 text-slate-500">{heads(animal)}</td>
                                <td className="px-6 py-3 text-slate-500">{animal.current_weight_kg ? `${animal.current_weight_kg} kg` : '—'}</td>
                                <td className="px-6 py-3 capitalize text-slate-500">{animal.status || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ---------- Tasks on this farm ---------- */

function FarmTasks({ farmId }) {
    const { api } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let ignore = false;
        (async () => {
            setLoading(true);
            try {
                const res = await api.get('/api/daily-tasks');
                const all = res.data.data ?? [];
                const onThisFarm = all.filter(
                    (task) => String(task.field?.farm_id ?? task.employee?.farm_id) === String(farmId)
                );
                if (!ignore) setTasks(onThisFarm);
            } catch (err) {
                if (!ignore) setError(err.response?.data?.message || 'Failed to load tasks.');
            } finally {
                if (!ignore) setLoading(false);
            }
        })();
        return () => { ignore = true; };
    }, [api, farmId]);

    return (
        <div>
            {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
            <div className={`${card} overflow-x-auto`}>
                <table className="w-full text-left text-sm">
                    <thead className="bg-farm-50 text-xs text-farm-700">
                        <tr>
                            <th className="px-6 py-3 font-semibold">Date</th>
                            <th className="px-6 py-3 font-semibold">Task</th>
                            <th className="px-6 py-3 font-semibold">Employee</th>
                            <th className="px-6 py-3 font-semibold">Field</th>
                            <th className="px-6 py-3 font-semibold">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-farm-100">
                        {loading ? (
                            <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500">Loading tasks...</td></tr>
                        ) : tasks.length === 0 ? (
                            <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500">No tasks logged on this farm yet.</td></tr>
                        ) : tasks.map((task) => (
                            <tr key={task.id} className="transition hover:bg-farm-50">
                                <td className="px-6 py-4 text-slate-500">{task.date}</td>
                                <td className="px-6 py-4 font-medium">
                                    <Link to={`/tasks/${task.id}`} className="text-farm-900 hover:underline">{task.task_description}</Link>
                                </td>
                                <td className="px-6 py-4 text-slate-500">{task.employee?.user?.name}</td>
                                <td className="px-6 py-4 text-slate-500">{task.field?.name || 'General'}</td>
                                <td className="px-6 py-4 capitalize text-slate-500">{label(task.status)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ---------- Money for this farm (same ledger as Financial Management) ---------- */

function FarmFinance({ farmId }) {
    const { api } = useAuth();
    const [summary, setSummary] = useState(null);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let ignore = false;
        (async () => {
            setLoading(true);
            try {
                const [summaryRes, rowsRes] = await Promise.all([
                    api.get('/api/finance/summary', { params: { farm_id: farmId } }),
                    api.get('/api/financial-transactions', { params: { farm_id: farmId } }),
                ]);
                if (!ignore) {
                    setSummary(summaryRes.data.data);
                    setRows(rowsRes.data.data ?? []);
                }
            } catch (err) {
                if (!ignore) setError(err.response?.data?.message || 'Failed to load finance data.');
            } finally {
                if (!ignore) setLoading(false);
            }
        })();
        return () => { ignore = true; };
    }, [api, farmId]);

    return (
        <div className="space-y-6">
            {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Stat title="Income" value={loading || !summary ? '–' : money(summary.total_income)} />
                <Stat title="Expenses" value={loading || !summary ? '–' : money(summary.total_expenses)} />
                <Stat title="Net profit" value={loading || !summary ? '–' : money(summary.net_profit)} />
            </div>

            <div className={`${card} overflow-x-auto`}>
                <div className="flex items-center justify-between px-6 pt-5">
                    <h2 className="text-base font-semibold text-farm-900">Recent transactions</h2>
                    <Link to="/finance" className="text-sm font-medium text-farm-700 hover:underline">Open Financial Management</Link>
                </div>
                <table className="mt-3 w-full text-left text-sm">
                    <thead className="bg-farm-50 text-xs text-farm-700">
                        <tr>
                            <th className="px-6 py-3 font-semibold">Date</th>
                            <th className="px-6 py-3 font-semibold">Type</th>
                            <th className="px-6 py-3 font-semibold">Category</th>
                            <th className="px-6 py-3 font-semibold">Description</th>
                            <th className="px-6 py-3 font-semibold">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-farm-100">
                        {loading ? (
                            <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500">Loading...</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500">Nothing recorded for this farm yet.</td></tr>
                        ) : rows.slice(0, 10).map((t) => (
                            <tr key={t.id} className="hover:bg-farm-50">
                                <td className="px-6 py-3 text-slate-500">{String(t.transaction_date).slice(0, 10)}</td>
                                <td className={`px-6 py-3 capitalize ${t.type === 'income' ? 'text-farm-700' : 'text-red-700'}`}>{t.type}</td>
                                <td className="px-6 py-3 capitalize text-slate-500">{label(t.category)}</td>
                                <td className="px-6 py-3 text-slate-500">{t.description || '—'}</td>
                                <td className="px-6 py-3 font-medium text-farm-900">{money(t.amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ---------- The farm's own page ---------- */

export default function FarmProfile() {
    const { farmId } = useParams();
    const { api } = useAuth();
    const [farm, setFarm] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let ignore = false;
        setFarm(null);
        setError(null);
        api.get(`/api/farms/${farmId}`)
            .then((res) => { if (!ignore) setFarm(res.data.data); })
            .catch((err) => { if (!ignore) setError(err.response?.status === 404 ? 'This farm could not be found.' : 'Failed to load this farm.'); });
        return () => { ignore = true; };
    }, [api, farmId]);

    return (
        <ModuleHub
            title={farm?.name || (error ? 'Farm' : 'Loading farm...')}
            subtitle="Everything about this farm in one place."
            backTo={{ to: '/farms', label: 'All farms' }}
            tabs={[
                {
                    key: 'overview',
                    label: 'Overview',
                    roles: ['Admin', 'Farm-owner', 'Manager'],
                    element: error
                        ? <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
                        : farm
                            ? <Overview farm={farm} />
                            : <p className="py-10 text-center text-sm text-slate-500">Loading farm...</p>,
                },
                { key: 'fields', label: 'Fields & map', path: '/farms/:farmId/fields', adminViewOnly: true, element: <FarmFields farmId={farmId} /> },
                { key: 'livestock', label: 'Livestock', path: '/livestock', element: <FarmLivestock farmId={farmId} /> },
                { key: 'tasks', label: 'Tasks', path: '/tasks', element: <FarmTasks farmId={farmId} /> },
                { key: 'finance', label: 'Finance', path: '/finance', element: <FarmFinance farmId={farmId} /> },
            ]}
        />
    );
}
