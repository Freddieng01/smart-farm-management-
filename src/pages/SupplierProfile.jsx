import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';
import { Alert, Badge, Card, TableMessage, thClass, tdClass } from '../components/ModuleUI.jsx';
import { DetailList, Insights, MonthlyBars, StatTile, formatDate } from '../components/ProfileParts.jsx';
import { money } from '../utils/currency.js';

const approvalTone = { Pending: 'amber', Approved: 'green', Rejected: 'red' };
const deliveryTone = { Pending: 'gray', Received: 'green', Cancelled: 'red' };

export default function SupplierProfile() {
    const { supplierId } = useParams();
    const { api } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const res = await api.get(`/api/suppliers/${supplierId}/profile`);
                if (!cancelled) setProfile(res.data);
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.response?.status === 404
                            ? 'This supplier no longer exists.'
                            : err.response?.data?.message || 'Could not load this supplier. Please try again.'
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [api, supplierId]);

    const supplier = profile?.supplier;
    const stats = profile?.stats;

    const insights = stats
        ? [
              stats.total_orders === 0 ? 'No purchase orders with this supplier yet.' : null,
              stats.delivery_rate !== null
                  ? `${stats.delivery_rate}% of approved orders have been delivered (${stats.received} of ${stats.approved}).`
                  : null,
              profile.top_items[0]
                  ? `Most of your spend here goes on ${profile.top_items[0].item_name} (${money(profile.top_items[0].spend)}).`
                  : null,
              stats.still_owed > 0 ? `You still owe this supplier ${money(stats.still_owed)} on approved orders.` : null,
              stats.awaiting_delivery > 0
                  ? `${stats.awaiting_delivery} approved ${stats.awaiting_delivery === 1 ? 'order is' : 'orders are'} still waiting to arrive.`
                  : null,
          ]
        : [];

    return (
        <ModuleLayout
            title={supplier?.name || 'Supplier profile'}
            subtitle="Contact details, order history and payments for this supplier."
        >
            <div className="mx-auto max-w-7xl space-y-6">
                <Link to="/suppliers" className="inline-flex text-sm font-medium text-farm-700 hover:underline">
                    Back to suppliers
                </Link>

                {error && <Alert>{error}</Alert>}
                {loading && <p className="py-10 text-center text-sm text-slate-500">Loading supplier...</p>}

                {profile && (
                    <>
                        <Card>
                            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h2 className="text-xl font-semibold text-farm-900">{supplier.name}</h2>
                                        {supplier.supplies_category && <Badge tone="green">{supplier.supplies_category}</Badge>}
                                    </div>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Added {formatDate(supplier.created_at)}
                                        {supplier.performance_rating !== null
                                            ? ` - rated ${supplier.performance_rating} out of 5`
                                            : ' - not rated yet'}
                                    </p>
                                </div>
                                <div className="sm:w-1/2">
                                    <DetailList
                                        items={[
                                            ['Phone', supplier.contact_phone],
                                            ['Email', supplier.contact_email],
                                            ['Address', supplier.address],
                                        ]}
                                    />
                                </div>
                            </div>
                        </Card>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatTile label="Purchase orders" value={stats.total_orders} hint={`${stats.pending_approval} awaiting approval`} />
                            <StatTile label="Total ordered" value={money(stats.total_ordered)} hint="Approved orders, not cancelled" />
                            <StatTile label="Paid so far" value={money(stats.total_paid)} />
                            <StatTile label="Still owed" value={money(stats.still_owed)} />
                            <StatTile
                                label="Delivery rate"
                                value={stats.delivery_rate !== null ? `${stats.delivery_rate}%` : 'No data'}
                                hint="Approved orders that arrived"
                            />
                            <StatTile label="Average order" value={money(stats.average_order_value)} />
                            <StatTile label="First order" value={formatDate(stats.first_order_date)} />
                            <StatTile label="Latest order" value={formatDate(stats.last_order_date)} />
                        </div>

                        <Insights lines={insights} />

                        <div className="grid gap-6 lg:grid-cols-2">
                            <MonthlyBars
                                title="Spend per month (last 12 months)"
                                data={profile.monthly_spend}
                                format={money}
                                emptyText="No approved orders in the last 12 months."
                            />
                            <Card title="What you buy here">
                                <table className="mt-3 w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-farm-50">
                                            <th className={thClass}>Item</th>
                                            <th className={thClass}>Quantity</th>
                                            <th className={`${thClass} text-right`}>Spend</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-farm-100">
                                        {profile.top_items.length === 0 ? (
                                            <TableMessage colSpan={3}>Nothing bought yet.</TableMessage>
                                        ) : (
                                            profile.top_items.map((item) => (
                                                <tr key={`${item.item_name}-${item.unit}`}>
                                                    <td className={`${tdClass} font-medium text-farm-900`}>{item.item_name}</td>
                                                    <td className={tdClass}>
                                                        {item.quantity} {item.unit}
                                                    </td>
                                                    <td className={`${tdClass} text-right`}>{money(item.spend)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </Card>
                        </div>

                        <Card title="Purchase orders">
                            <div className="mt-3 overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-farm-50">
                                            <th className={thClass}>Order</th>
                                            <th className={thClass}>Date</th>
                                            <th className={thClass}>Items</th>
                                            <th className={thClass}>Total</th>
                                            <th className={thClass}>Paid</th>
                                            <th className={thClass}>Approval</th>
                                            <th className={thClass}>Delivery</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-farm-100">
                                        {profile.orders.length === 0 ? (
                                            <TableMessage colSpan={7}>No purchase orders with this supplier yet.</TableMessage>
                                        ) : (
                                            profile.orders.map((o) => (
                                                <tr key={o.id} className="transition hover:bg-farm-50">
                                                    <td className={`${tdClass} font-medium text-farm-900`}>{o.order_number}</td>
                                                    <td className={tdClass}>{formatDate(o.order_date)}</td>
                                                    <td className={tdClass}>{o.item_count}</td>
                                                    <td className={tdClass}>{money(o.total)}</td>
                                                    <td className={tdClass}>{money(o.paid)}</td>
                                                    <td className={tdClass}>
                                                        <Badge tone={approvalTone[o.approval_status] || 'gray'}>{o.approval_status}</Badge>
                                                    </td>
                                                    <td className={tdClass}>
                                                        <Badge tone={deliveryTone[o.fulfillment_status] || 'gray'}>{o.fulfillment_status}</Badge>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        <Card title="Price quotations">
                            <div className="mt-3 overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-farm-50">
                                            <th className={thClass}>Item</th>
                                            <th className={thClass}>Quoted price</th>
                                            <th className={thClass}>Quoted on</th>
                                            <th className={thClass}>Valid until</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-farm-100">
                                        {profile.quotations.length === 0 ? (
                                            <TableMessage colSpan={4}>No quotations recorded for this supplier.</TableMessage>
                                        ) : (
                                            profile.quotations.map((q) => (
                                                <tr key={q.id}>
                                                    <td className={`${tdClass} font-medium text-farm-900`}>{q.item_name}</td>
                                                    <td className={tdClass}>
                                                        {money(q.quoted_price)} per {q.unit}
                                                    </td>
                                                    <td className={tdClass}>{formatDate(q.quotation_date)}</td>
                                                    <td className={tdClass}>
                                                        {formatDate(q.valid_until)} {q.expired && <Badge tone="red">Expired</Badge>}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </>
                )}
            </div>
        </ModuleLayout>
    );
}
