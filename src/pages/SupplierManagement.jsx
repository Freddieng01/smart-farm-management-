import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';

const emptySupplier = {
    farm_id: '',
    name: '',
    contact_phone: '',
    contact_email: '',
    address: '',
    supplies_category: '',
    performance_rating: '',
};

const newOrderForm = () => ({
    supplier_id: '',
    order_number: `PO-${Date.now().toString().slice(-6)}`,
    order_date: new Date().toISOString().slice(0, 10),
});

const inputClass =
    'mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20';

const approvalStyles = {
    Pending: 'bg-amber-100 text-amber-800',
    Approved: 'bg-farm-100 text-farm-800',
    Rejected: 'bg-red-100 text-red-800',
};

const fulfillmentStyles = {
    Pending: 'bg-slate-100 text-slate-700',
    Received: 'bg-farm-100 text-farm-800',
    Cancelled: 'bg-red-100 text-red-800',
};

export default function SupplierManagement() {
    const { api } = useAuth();
    const [tab, setTab] = useState('suppliers');
    const [suppliers, setSuppliers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [supplierModal, setSupplierModal] = useState(false);
    const [orderModal, setOrderModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [supplierForm, setSupplierForm] = useState(emptySupplier);
    const [orderForm, setOrderForm] = useState(newOrderForm());

    useEffect(() => {
        fetchAll();
    }, []);

    async function fetchAll() {
        setLoading(true);
        setError(null);
        try {
            const [suppliersRes, ordersRes] = await Promise.all([
                api.get('/api/suppliers'),
                api.get('/api/purchase-orders'),
            ]);
            setSuppliers(suppliersRes.data.data ?? suppliersRes.data);
            setOrders(ordersRes.data.data ?? ordersRes.data);
        } catch (err) {
            setError('Could not load suppliers and purchase orders. Check that the API is running and you are logged in.');
        } finally {
            setLoading(false);
        }
    }

    function openSupplierModal(supplier = null) {
        if (supplier) {
            setEditingSupplier(supplier);
            setSupplierForm({
                farm_id: supplier.farm_id,
                name: supplier.name,
                contact_phone: supplier.contact_phone || '',
                contact_email: supplier.contact_email || '',
                address: supplier.address || '',
                supplies_category: supplier.supplies_category || '',
                performance_rating: supplier.performance_rating ?? '',
            });
        } else {
            setEditingSupplier(null);
            setSupplierForm(emptySupplier);
        }
        setSupplierModal(true);
    }

    async function handleSupplierSubmit(e) {
        e.preventDefault();
        try {
            if (editingSupplier) {
                await api.put(`/api/suppliers/${editingSupplier.id}`, supplierForm);
            } else {
                await api.post('/api/suppliers', supplierForm);
            }
            setSupplierModal(false);
            fetchAll();
        } catch (err) {
            alert(err.response?.data?.message || 'Could not save the supplier.');
        }
    }

    async function handleDeleteSupplier(id) {
        if (!window.confirm('Delete this supplier? Their quotations and purchase orders will be deleted too.')) return;
        try {
            await api.delete(`/api/suppliers/${id}`);
            fetchAll();
        } catch (err) {
            alert('Could not delete the supplier.');
        }
    }

    function openOrderModal() {
        setOrderForm(newOrderForm());
        setOrderModal(true);
    }

    async function handleOrderSubmit(e) {
        e.preventDefault();
        const supplier = suppliers.find((s) => String(s.id) === String(orderForm.supplier_id));
        if (!supplier) {
            alert('Pick a supplier first.');
            return;
        }
        try {
            await api.post('/api/purchase-orders', { ...orderForm, farm_id: supplier.farm_id });
            setOrderModal(false);
            fetchAll();
        } catch (err) {
            alert(err.response?.data?.message || 'Could not create the purchase order.');
        }
    }

    async function updateOrder(id, changes, failMessage) {
        try {
            await api.put(`/api/purchase-orders/${id}`, changes);
            fetchAll();
        } catch (err) {
            alert(err.response?.data?.message || failMessage);
        }
    }

    async function handleDeleteOrder(id) {
        if (!window.confirm('Delete this purchase order?')) return;
        try {
            await api.delete(`/api/purchase-orders/${id}`);
            fetchAll();
        } catch (err) {
            alert('Could not delete the purchase order.');
        }
    }

    const pendingApprovals = orders.filter((o) => o.approval_status === 'Pending').length;

    return (
        <ModuleLayout
          title="Suppliers and procurement"
          subtitle="Keep track of who you buy from, and approve purchase orders before they go out."
          actions={<>
<button
                        onClick={() => (tab === 'suppliers' ? openSupplierModal() : openOrderModal())}
                        className="rounded-full bg-harvest-400 px-5 py-2 text-sm font-medium text-farm-900 transition hover:bg-harvest-500 disabled:opacity-60"
                    >
                        {tab === 'suppliers' ? '+ Add supplier' : '+ New purchase order'}
                    </button>
          </>}
        >
            <div className="mx-auto max-w-7xl">

                <div className="mb-4 flex gap-2 border-b border-farm-100">
                    <button
                        onClick={() => setTab('suppliers')}
                        className={`px-4 py-2 text-sm font-medium transition ${
                            tab === 'suppliers'
                                ? 'border-b-2 border-farm-700 text-farm-900'
                                : 'text-slate-500 hover:text-farm-900'
                        }`}
                    >
                        Suppliers
                    </button>
                    <button
                        onClick={() => setTab('orders')}
                        className={`px-4 py-2 text-sm font-medium transition ${
                            tab === 'orders'
                                ? 'border-b-2 border-farm-700 text-farm-900'
                                : 'text-slate-500 hover:text-farm-900'
                        }`}
                    >
                        Purchase orders{pendingApprovals > 0 ? ` (${pendingApprovals} awaiting approval)` : ''}
                    </button>
                </div>

                {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

                {tab === 'suppliers' && (
                    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-farm-50 text-slate-500">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Name</th>
                                    <th className="px-6 py-3 font-semibold">Supplies</th>
                                    <th className="px-6 py-3 font-semibold">Contact</th>
                                    <th className="px-6 py-3 font-semibold">Rating</th>
                                    <th className="px-6 py-3 text-right font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-farm-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                                            Loading suppliers...
                                        </td>
                                    </tr>
                                ) : suppliers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                                            No suppliers yet. Add your first supplier to start raising purchase orders.
                                        </td>
                                    </tr>
                                ) : (
                                    suppliers.map((s) => (
                                        <tr key={s.id} className="transition hover:bg-farm-50">
                                            <td className="px-6 py-4 font-medium text-farm-900">{s.name}</td>
                                            <td className="px-6 py-4 text-slate-500">{s.supplies_category || '-'}</td>
                                            <td className="px-6 py-4 text-slate-500">
                                                <p>{s.contact_phone || '-'}</p>
                                                <p className="text-xs">{s.contact_email || ''}</p>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {s.performance_rating != null ? `${s.performance_rating} / 5` : 'Not rated'}
                                            </td>
                                            <td className="space-x-3 px-6 py-4 text-right">
                                                <button
                                                    onClick={() => openSupplierModal(s)}
                                                    className="text-farm-700 hover:underline"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSupplier(s.id)}
                                                    className="text-red-600 hover:underline"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {tab === 'orders' && (
                    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-farm-50 text-slate-500">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Order number</th>
                                    <th className="px-6 py-3 font-semibold">Supplier</th>
                                    <th className="px-6 py-3 font-semibold">Order date</th>
                                    <th className="px-6 py-3 font-semibold">Approval</th>
                                    <th className="px-6 py-3 font-semibold">Delivery</th>
                                    <th className="px-6 py-3 text-right font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-farm-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-10 text-center text-slate-500">
                                            Loading purchase orders...
                                        </td>
                                    </tr>
                                ) : orders.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-10 text-center text-slate-500">
                                            No purchase orders yet. Create one once you have a supplier.
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map((o) => (
                                        <tr key={o.id} className="transition hover:bg-farm-50">
                                            <td className="px-6 py-4 font-medium text-farm-900">{o.order_number}</td>
                                            <td className="px-6 py-4 text-slate-500">{o.supplier?.name || `#${o.supplier_id}`}</td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {o.order_date ? String(o.order_date).slice(0, 10) : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                                                        approvalStyles[o.approval_status] || approvalStyles.Pending
                                                    }`}
                                                >
                                                    {o.approval_status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                                                        fulfillmentStyles[o.fulfillment_status] || fulfillmentStyles.Pending
                                                    }`}
                                                >
                                                    {o.fulfillment_status}
                                                </span>
                                            </td>
                                            <td className="space-x-3 px-6 py-4 text-right">
                                                {o.approval_status === 'Pending' && (
                                                    <>
                                                        <button
                                                            onClick={() =>
                                                                updateOrder(o.id, { approval_status: 'Approved' }, 'Could not approve the order.')
                                                            }
                                                            className="text-farm-700 hover:underline"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                updateOrder(o.id, { approval_status: 'Rejected' }, 'Could not reject the order.')
                                                            }
                                                            className="text-amber-700 hover:underline"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                {o.approval_status === 'Approved' && o.fulfillment_status === 'Pending' && (
                                                    <button
                                                        onClick={() =>
                                                            updateOrder(o.id, { fulfillment_status: 'Received' }, 'Could not mark the order as received.')
                                                        }
                                                        className="text-farm-700 hover:underline"
                                                    >
                                                        Mark as received
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteOrder(o.id)}
                                                    className="text-red-600 hover:underline"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {supplierModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                        <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
                            <h2 className="mb-6 text-xl font-semibold text-farm-900">
                                {editingSupplier ? 'Edit supplier' : 'Add supplier'}
                            </h2>
                            <form onSubmit={handleSupplierSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Farm ID</label>
                                    <input
                                        type="number"
                                        className={inputClass}
                                        value={supplierForm.farm_id}
                                        onChange={(e) => setSupplierForm({ ...supplierForm, farm_id: e.target.value })}
                                        disabled={!!editingSupplier}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Supplier name</label>
                                    <input
                                        className={inputClass}
                                        value={supplierForm.name}
                                        onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">What they supply</label>
                                    <input
                                        className={inputClass}
                                        placeholder="e.g. Seeds, Fertilizer, Equipment"
                                        value={supplierForm.supplies_category}
                                        onChange={(e) => setSupplierForm({ ...supplierForm, supplies_category: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Phone</label>
                                    <input
                                        className={inputClass}
                                        value={supplierForm.contact_phone}
                                        onChange={(e) => setSupplierForm({ ...supplierForm, contact_phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Email</label>
                                    <input
                                        type="email"
                                        className={inputClass}
                                        value={supplierForm.contact_email}
                                        onChange={(e) => setSupplierForm({ ...supplierForm, contact_email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Address</label>
                                    <input
                                        className={inputClass}
                                        value={supplierForm.address}
                                        onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Performance rating (0 to 5)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="5"
                                        step="0.1"
                                        className={inputClass}
                                        value={supplierForm.performance_rating}
                                        onChange={(e) => setSupplierForm({ ...supplierForm, performance_rating: e.target.value })}
                                    />
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSupplierModal(false)}
                                        className="rounded-full border border-farm-200 px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-farm-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-full bg-farm-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-farm-800"
                                    >
                                        {editingSupplier ? 'Save changes' : 'Add supplier'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {orderModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                        <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
                            <h2 className="mb-6 text-xl font-semibold text-farm-900">New purchase order</h2>
                            <form onSubmit={handleOrderSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Supplier</label>
                                    <select
                                        className={inputClass}
                                        value={orderForm.supplier_id}
                                        onChange={(e) => setOrderForm({ ...orderForm, supplier_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Choose a supplier...</option>
                                        {suppliers.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Order number</label>
                                    <input
                                        className={inputClass}
                                        value={orderForm.order_number}
                                        onChange={(e) => setOrderForm({ ...orderForm, order_number: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Order date</label>
                                    <input
                                        type="date"
                                        className={inputClass}
                                        value={orderForm.order_date}
                                        onChange={(e) => setOrderForm({ ...orderForm, order_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setOrderModal(false)}
                                        className="rounded-full border border-farm-200 px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-farm-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-full bg-farm-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-farm-800"
                                    >
                                        Create order
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </ModuleLayout>
    );
}
