import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';
import { Alert, Badge, Card, TableMessage, thClass, tdClass } from '../components/ModuleUI.jsx';
import { DetailList, Insights, MonthlyBars, StatTile, formatDate } from '../components/ProfileParts.jsx';
import { money } from '../utils/currency.js';

const orderTone = { Pending: 'amber', Fulfilled: 'green', Cancelled: 'red' };
const invoiceTone = { Unpaid: 'red', 'Partially Paid': 'amber', Paid: 'green' };

export default function CustomerProfile() {
    const { customerId } = useParams();
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
                const res = await api.get(`/api/customers/${customerId}/profile`);
                if (!cancelled) setProfile(res.data);
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.response?.status === 404
                            ? 'This customer no longer exists.'
                            : err.response?.data?.message || 'Could not load this customer. Please try again.'
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
    }, [api, customerId]);

    const customer = profile?.customer;
    const stats = profile?.stats;

    const insights = stats
        ? [
              stats.total_orders === 0 ? 'This customer has not placed an order yet.' : null,
              stats.average_days_between_orders !== null
                  ? `Orders about every ${stats.average_days_between_orders} days on average.`
                  : null,
              stats.days_since_last_order !== null
                  ? stats.days_since_last_order === 0
                      ? 'Last ordered today.'
                      : `Last ordered ${stats.days_since_last_order} ${stats.days_since_last_order === 1 ? 'day' : 'days'} ago.`
                  : null,
              profile.top_crops[0]
                  ? `Buys mostly ${profile.top_crops[0].crop_name} (${money(profile.top_crops[0].revenue)} so far).`
                  : null,
              stats.on_time_rate !== null
                  ? `Paid ${stats.paid_on_time} of ${stats.paid_invoices} settled invoices on time (${stats.on_time_rate}%).`
                  : null,
              stats.average_days_to_pay !== null
                  ? `Takes about ${stats.average_days_to_pay} ${stats.average_days_to_pay === 1 ? 'day' : 'days'} to pay after an invoice is raised.`
                  : null,
              stats.overdue_invoices > 0
                  ? `${stats.overdue_invoices} overdue ${stats.overdue_invoices === 1 ? 'invoice' : 'invoices'} worth ${money(stats.overdue_amount)}.`
                  : null,
              stats.contract_orders > 0
                  ? `${stats.contract_orders} of their orders ${stats.contract_orders === 1 ? 'is a' : 'are'} contract farming ${stats.contract_orders === 1 ? 'order' : 'orders'}.`
                  : null,
          ]
        : [];

    return (
        <ModuleLayout
            title={customer?.name || 'Customer profile'}
            subtitle="Buying habits, payment record and order history for this customer."
        >
            <div className="mx-auto max-w-7xl space-y-6">
                <Link to="/sales" className="inline-flex text-sm font-medium text-farm-700 hover:underline">
                    Back to market and sales
                </Link>

                {error && <Alert>{error}</Alert>}
                {loading && <p className="py-10 text-center text-sm text-slate-500">Loading customer...</p>}

                {profile && (
                    <>
                        <Card>
                            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h2 className="text-xl font-semibold text-farm-900">{customer.name}</h2>
                                        {customer.customer_type && <Badge tone="blue">{customer.customer_type}</Badge>}
                                    </div>
                                    <p className="mt-1 text-sm text-slate-500">Customer since {formatDate(customer.created_at)}</p>
                                </div>
                                <div className="sm:w-1/2">
                                    <DetailList
                                        items={[
                                            ['Phone', customer.contact_phone],
                                            ['Email', customer.contact_email],
                                            ['Address', customer.address],
                                        ]}
                                    />
                                </div>
                            </div>
                        </Card>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatTile label="Total sales" value={money(stats.total_sales)} hint={`${stats.total_orders} orders, cancelled excluded`} />
                            <StatTile label="Average order" value={money(stats.average_order_value)} />
                            <StatTile label="Paid so far" value={money(stats.total_paid)} />
                            <StatTile label="Still owes you" value={money(stats.still_owed)} hint={stats.overdue_invoices > 0 ? `${stats.overdue_invoices} overdue` : 'Nothing overdue'} />
                            <StatTile
                                label="Orders every"
                                value={stats.average_days_between_orders !== null ? `${stats.average_days_between_orders} days` : 'Not enough data'}
                                hint="Average gap between orders"
                            />
                            <StatTile
                                label="Last order"
                                value={formatDate(stats.last_order_date)}
                                hint={stats.days_since_last_order !== null ? `${stats.days_since_last_order} days ago` : undefined}
                            />
                            <StatTile
                                label="Pays on time"
                                value={stats.on_time_rate !== null ? `${stats.on_time_rate}%` : 'No data'}
                                hint={stats.paid_invoices > 0 ? `${stats.paid_invoices} settled invoices` : 'No settled invoices yet'}
                            />
                            <StatTile
                                label="Days to pay"
                                value={stats.average_days_to_pay !== null ? `${stats.average_days_to_pay}` : 'No data'}
                                hint="Average, invoice to final payment"
                            />
                        </div>

                        <Insights lines={insights} />

                        <div className="grid gap-6 lg:grid-cols-2">
                            <MonthlyBars
                                title="Purchases per month (last 12 months)"
                                data={profile.monthly_sales}
                                format={money}
                                emptyText="No orders in the last 12 months."
                            />
                            <Card title="What they buy">
                                <table className="mt-3 w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-farm-50">
                                            <th className={thClass}>Crop</th>
                                            <th className={thClass}>Quantity</th>
                                            <th className={`${thClass} text-right`}>Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-farm-100">
                                        {profile.top_crops.length === 0 ? (
                                            <TableMessage colSpan={3}>Nothing bought yet.</TableMessage>
                                        ) : (
                                            profile.top_crops.map((crop) => (
                                                <tr key={`${crop.crop_name}-${crop.unit}`}>
                                                    <td className={`${tdClass} font-medium text-farm-900`}>{crop.crop_name}</td>
                                                    <td className={tdClass}>
                                                        {crop.quantity} {crop.unit}
                                                    </td>
                                                    <td className={`${tdClass} text-right`}>{money(crop.revenue)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                                {profile.payment_methods.length > 0 && (
                                    <p className="px-6 pb-5 pt-3 text-xs text-slate-500">
                                        Pays by{' '}
                                        {profile.payment_methods.map((m) => `${m.method} (${m.count})`).join(', ')}
                                    </p>
                                )}
                            </Card>
                        </div>

                        <Card title="Orders">
                            <div className="mt-3 overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-farm-50">
                                            <th className={thClass}>Order</th>
                                            <th className={thClass}>Date</th>
                                            <th className={thClass}>Total</th>
                                            <th className={thClass}>Status</th>
                                            <th className={thClass}>Invoice</th>
                                            <th className={thClass}>Paid</th>
                                            <th className={thClass}>Payment</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-farm-100">
                                        {profile.orders.length === 0 ? (
                                            <TableMessage colSpan={7}>No orders from this customer yet.</TableMessage>
                                        ) : (
                                            profile.orders.map((o) => (
                                                <tr key={o.id} className="transition hover:bg-farm-50">
                                                    <td className={`${tdClass} font-medium text-farm-900`}>
                                                        {o.order_number} {o.is_contract_farming && <Badge tone="blue">Contract</Badge>}
                                                    </td>
                                                    <td className={tdClass}>{formatDate(o.order_date)}</td>
                                                    <td className={tdClass}>{money(o.total)}</td>
                                                    <td className={tdClass}>
                                                        <Badge tone={orderTone[o.status] || 'gray'}>{o.status}</Badge>
                                                    </td>
                                                    <td className={tdClass}>{o.invoice_number || 'Not invoiced'}</td>
                                                    <td className={tdClass}>{o.invoice_number ? money(o.paid) : '-'}</td>
                                                    <td className={tdClass}>
                                                        {o.invoice_status ? (
                                                            <>
                                                                <Badge tone={invoiceTone[o.invoice_status] || 'gray'}>{o.invoice_status}</Badge>{' '}
                                                                {o.overdue && <Badge tone="red">Overdue</Badge>}
                                                                {o.paid_late && <Badge tone="amber">Paid late</Badge>}
                                                            </>
                                                        ) : (
                                                            '-'
                                                        )}
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
