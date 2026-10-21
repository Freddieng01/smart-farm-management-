import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const CATEGORIES = ['seeds', 'fertilizer', 'chemical', 'feed', 'medicine', 'packaging', 'fuel', 'tool'];

const input = 'mt-1 w-full rounded-md border border-[#cbd8ca] px-3 py-2 text-sm outline-none focus:border-[#4d7a39] focus:ring-2 focus:ring-[#4d7a39]/20';
const primaryBtn = 'rounded-md bg-[#315f2b] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#264b22]';
const ghostBtn = 'rounded-md border border-[#cbd8ca] px-4 py-2 text-sm font-medium text-[#647260] transition hover:bg-[#fcfdfc]';

function errorText(err, fallback) {
    const errors = err.response?.data?.errors;
    if (errors) return Object.values(errors).flat().join(' ');
    return err.response?.data?.message || fallback;
}

const emptyForm = {
    farm_id: '', name: '', category: 'seeds', unit: '', quantity: '',
    minimum_stock: '', unit_cost: '', expiry_date: '',
};

export default function InventoryManagement() {
    const { api } = useAuth();
    const [resources, setResources] = useState([]);
    const [farms, setFarms] = useState([]);
    const [farmFilter, setFarmFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [alerts, setAlerts] = useState({ low: [], expired: [], soon: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formError, setFormError] = useState(null);

    const [modal, setModal] = useState(null); // 'form' | 'stock' | 'history' | null
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [stockTarget, setStockTarget] = useState(null);
    const [stock, setStock] = useState({ direction: 'in', quantity: '', unit_cost: '', reason: '' });
    const [history, setHistory] = useState([]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const params = {};
        if (farmFilter) params.farm_id = farmFilter;
        if (categoryFilter) params.category = categoryFilter;
        try {
            const [res, farmRes, low, exp] = await Promise.all([
                api.get('/api/resources', { params }),
                api.get('/api/farms'),
                api.get('/api/resources/low-stock', { params: farmFilter ? { farm_id: farmFilter } : {} }),
                api.get('/api/resources/expiring', { params: farmFilter ? { farm_id: farmFilter } : {} }),
            ]);
            setResources(res.data.data);
            setFarms(farmRes.data.data);
            setAlerts({
                low: low.data.data,
                expired: exp.data.data.expired,
                soon: exp.data.data.expiring_soon,
            });
        } catch (err) {
            setError(errorText(err, 'Failed to load inventory.'));
        } finally {
            setLoading(false);
        }
    }, [api, farmFilter, categoryFilter]);

    useEffect(() => { load(); }, [load]);

    function openForm(resource = null) {
        setFormError(null);
        setEditing(resource);
        setForm(resource ? {
            farm_id: resource.farm_id,
            name: resource.name,
            category: resource.category,
            unit: resource.unit,
            quantity: resource.quantity,
            minimum_stock: resource.minimum_stock,
            unit_cost: resource.unit_cost,
            expiry_date: resource.expiry_date ? resource.expiry_date.slice(0, 10) : '',
        } : { ...emptyForm, farm_id: farmFilter });
        setModal('form');
    }

    async function saveResource(e) {
        e.preventDefault();
        setFormError(null);
        try {
            const payload = {
                name: form.name,
                category: form.category,
                unit: form.unit,
                minimum_stock: form.minimum_stock === '' ? 0 : form.minimum_stock,
                unit_cost: form.unit_cost === '' ? 0 : form.unit_cost,
                expiry_date: form.expiry_date || null,
            };
            if (editing) {
                // farm and quantity cannot be changed by the API
                await api.put(`/api/resources/${editing.id}`, payload);
            } else {
                await api.post('/api/resources', {
                    ...payload,
                    farm_id: form.farm_id,
                    quantity: form.quantity === '' ? 0 : form.quantity,
                });
            }
            setModal(null);
            load();
        } catch (err) {
            setFormError(errorText(err, 'Could not save the resource.'));
        }
    }

    async function deleteResource(r) {
        if (!window.confirm(`Delete "${r.name}"?`)) return;
        try {
            await api.delete(`/api/resources/${r.id}`);
            load();
        } catch (err) {
            alert(errorText(err, 'Could not delete the resource.'));
        }
    }

    function openStock(r, direction) {
        setFormError(null);
        setStockTarget(r);
        setStock({ direction, quantity: '', unit_cost: '', reason: '' });
        setModal('stock');
    }

    async function saveStock(e) {
        e.preventDefault();
        setFormError(null);
        try {
            const body = { quantity: stock.quantity, reason: stock.reason || null };
            if (stock.direction === 'in' && stock.unit_cost !== '') body.unit_cost = stock.unit_cost;
            await api.post(`/api/resources/${stockTarget.id}/stock-${stock.direction}`, body);
            setModal(null);
            load();
        } catch (err) {
            setFormError(errorText(err, 'Could not record the stock movement.'));
        }
    }

    async function openHistory(r) {
        setStockTarget(r);
        setHistory([]);
        setModal('history');
        try {
            const res = await api.get(`/api/resources/${r.id}`);
            setHistory(res.data.data.transactions || []);
        } catch {
            setHistory([]);
        }
    }

    const isLow = (r) => Number(r.quantity) <= Number(r.minimum_stock);
    const today = new Date().toISOString().slice(0, 10);
    const expiryBadge = (r) => {
        if (!r.expiry_date) return null;
        const d = r.expiry_date.slice(0, 10);
        if (d < today) return <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">Expired</span>;
        if (alerts.soon.some((s) => s.id === r.id)) return <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Expiring soon</span>;
        return null;
    };

    return (
        <main className="min-h-screen bg-[#f7faf7] px-6 py-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-[#172316]">Inventory &amp; Inputs</h1>
                        <p className="text-sm text-[#647260]">Seeds, fertilizer, chemicals, feed, medicine and other farm resources.</p>
                    </div>
                    <button className={primaryBtn} onClick={() => openForm()}>+ Add Resource</button>
                </div>

                <div className="mb-6 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-[#dfe9de] bg-white p-4 shadow-sm">
                        <p className="text-sm text-[#647260]">Low stock</p>
                        <p className="mt-1 text-2xl font-semibold text-[#172316]">{alerts.low.length}</p>
                    </div>
                    <div className="rounded-lg border border-[#dfe9de] bg-white p-4 shadow-sm">
                        <p className="text-sm text-[#647260]">Expiring soon</p>
                        <p className="mt-1 text-2xl font-semibold text-[#172316]">{alerts.soon.length}</p>
                    </div>
                    <div className="rounded-lg border border-[#dfe9de] bg-white p-4 shadow-sm">
                        <p className="text-sm text-[#647260]">Expired</p>
                        <p className="mt-1 text-2xl font-semibold text-[#172316]">{alerts.expired.length}</p>
                    </div>
                </div>

                <div className="mb-4 flex flex-wrap gap-3">
                    <select className={input + ' !mt-0 !w-auto'} value={farmFilter} onChange={(e) => setFarmFilter(e.target.value)}>
                        <option value="">All farms</option>
                        {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    <select className={input + ' !mt-0 !w-auto'} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                        <option value="">All categories</option>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {error && <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

                <div className="overflow-x-auto rounded-lg border border-[#dfe9de] bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#fcfdfc] uppercase text-[#647260]">
                            <tr>
                                <th className="px-4 py-3 font-medium">Name</th>
                                <th className="px-4 py-3 font-medium">Farm</th>
                                <th className="px-4 py-3 font-medium">Category</th>
                                <th className="px-4 py-3 font-medium">In stock</th>
                                <th className="px-4 py-3 font-medium">Min</th>
                                <th className="px-4 py-3 font-medium">Unit cost</th>
                                <th className="px-4 py-3 font-medium">Expiry</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#dfe9de]">
                            {loading ? (
                                <tr><td colSpan="8" className="px-4 py-10 text-center text-[#647260]">Loading inventory...</td></tr>
                            ) : resources.length === 0 ? (
                                <tr><td colSpan="8" className="px-4 py-10 text-center text-[#647260]">No resources yet.</td></tr>
                            ) : resources.map((r) => (
                                <tr key={r.id} className="hover:bg-[#fcfdfc]">
                                    <td className="px-4 py-3 font-medium text-[#172316]">{r.name}{expiryBadge(r)}</td>
                                    <td className="px-4 py-3 text-[#647260]">{r.farm?.name}</td>
                                    <td className="px-4 py-3 capitalize text-[#647260]">{r.category}</td>
                                    <td className={`px-4 py-3 font-medium ${isLow(r) ? 'text-red-700' : 'text-[#172316]'}`}>
                                        {r.quantity} {r.unit}{isLow(r) && <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs">Low</span>}
                                    </td>
                                    <td className="px-4 py-3 text-[#647260]">{r.minimum_stock}</td>
                                    <td className="px-4 py-3 text-[#647260]">${r.unit_cost}</td>
                                    <td className="px-4 py-3 text-[#647260]">{r.expiry_date ? r.expiry_date.slice(0, 10) : '—'}</td>
                                    <td className="space-x-3 px-4 py-3 text-right whitespace-nowrap">
                                        <button className="text-green-700 hover:underline" onClick={() => openStock(r, 'in')}>Stock in</button>
                                        <button className="text-amber-700 hover:underline" onClick={() => openStock(r, 'out')}>Stock out</button>
                                        <button className="text-[#647260] hover:underline" onClick={() => openHistory(r)}>History</button>
                                        <button className="text-blue-600 hover:underline" onClick={() => openForm(r)}>Edit</button>
                                        <button className="text-red-600 hover:underline" onClick={() => deleteResource(r)}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {modal === 'form' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                        <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
                            <h2 className="mb-4 text-xl font-semibold text-[#172316]">{editing ? 'Edit Resource' : 'Add Resource'}</h2>
                            {formError && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>}
                            <form onSubmit={saveResource} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Farm</label>
                                    <select className={input} value={form.farm_id} disabled={!!editing} required
                                        onChange={(e) => setForm({ ...form, farm_id: e.target.value })}>
                                        <option value="">Choose a farm...</option>
                                        {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Name</label>
                                    <input className={input} value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-[#243322]">Category</label>
                                        <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#243322]">Unit</label>
                                        <input className={input} placeholder="kg, L, bags" value={form.unit} required onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-[#243322]">Opening qty</label>
                                        <input type="number" step="0.01" min="0" className={input} value={form.quantity} disabled={!!editing}
                                            onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#243322]">Min stock</label>
                                        <input type="number" step="0.01" min="0" className={input} value={form.minimum_stock}
                                            onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#243322]">Unit cost</label>
                                        <input type="number" step="0.01" min="0" className={input} value={form.unit_cost}
                                            onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
                                    </div>
                                </div>
                                {editing && <p className="text-xs text-[#647260]">Quantity changes only through Stock in / Stock out so the history stays accurate.</p>}
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Expiry date (optional)</label>
                                    <input type="date" className={input} value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" className={ghostBtn} onClick={() => setModal(null)}>Cancel</button>
                                    <button type="submit" className={primaryBtn}>{editing ? 'Save changes' : 'Add resource'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {modal === 'stock' && stockTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                        <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
                            <h2 className="mb-1 text-xl font-semibold text-[#172316]">
                                {stock.direction === 'in' ? 'Stock in' : 'Stock out'}: {stockTarget.name}
                            </h2>
                            <p className="mb-4 text-sm text-[#647260]">Currently {stockTarget.quantity} {stockTarget.unit}</p>
                            {formError && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>}
                            <form onSubmit={saveStock} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Quantity ({stockTarget.unit})</label>
                                    <input type="number" step="0.01" min="0.01" className={input} value={stock.quantity} required
                                        onChange={(e) => setStock({ ...stock, quantity: e.target.value })} />
                                </div>
                                {stock.direction === 'in' && (
                                    <div>
                                        <label className="block text-sm font-medium text-[#243322]">Unit cost (optional)</label>
                                        <input type="number" step="0.01" min="0" className={input} value={stock.unit_cost}
                                            onChange={(e) => setStock({ ...stock, unit_cost: e.target.value })} />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-[#243322]">Reason (optional)</label>
                                    <input className={input} value={stock.reason} onChange={(e) => setStock({ ...stock, reason: e.target.value })} />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" className={ghostBtn} onClick={() => setModal(null)}>Cancel</button>
                                    <button type="submit" className={primaryBtn}>Record</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {modal === 'history' && stockTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
                            <h2 className="mb-4 text-xl font-semibold text-[#172316]">Stock history: {stockTarget.name}</h2>
                            {history.length === 0 ? (
                                <p className="text-sm text-[#647260]">No movements recorded.</p>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="text-[#647260]"><tr>
                                        <th className="py-2">Date</th><th>Type</th><th>Qty</th><th>Reason</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-[#dfe9de]">
                                        {history.map((t) => (
                                            <tr key={t.id}>
                                                <td className="py-2 text-[#647260]">{t.created_at?.slice(0, 10)}</td>
                                                <td className={t.type === 'stock_in' ? 'text-green-700' : 'text-amber-700'}>{t.type === 'stock_in' ? 'In' : 'Out'}</td>
                                                <td>{t.quantity}</td>
                                                <td className="text-[#647260]">{t.reason || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            <div className="mt-4 flex justify-end">
                                <button className={ghostBtn} onClick={() => setModal(null)}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
