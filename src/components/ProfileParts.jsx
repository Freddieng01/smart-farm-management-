import React from 'react';
import { Card } from './ModuleUI.jsx';

/* Small building blocks shared by the supplier, customer and task detail views. */

export function StatTile({ label, value, hint }) {
    return (
        <article className="rounded-3xl bg-white p-5 shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-farm-900">{value}</p>
            {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </article>
    );
}

/* Label / value pairs for contact details and similar facts. */
export function DetailList({ items }) {
    return (
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {items.map(([label, value]) => (
                <div key={label}>
                    <dt className="text-xs font-medium text-slate-500">{label}</dt>
                    <dd className="mt-0.5 text-sm text-farm-900">{value || '-'}</dd>
                </div>
            ))}
        </dl>
    );
}

/* Twelve-month bar chart drawn with plain CSS, so no chart library is needed. */
export function MonthlyBars({ data, format, title, emptyText }) {
    const max = Math.max(0, ...data.map((d) => d.total));

    return (
        <Card title={title}>
            <div className="px-6 pb-6 pt-4">
                {max === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-500">{emptyText}</p>
                ) : (
                    <div className="flex h-40 items-end gap-2" role="img" aria-label={title}>
                        {data.map((d) => (
                            <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                                <div
                                    title={`${d.label} ${d.key.slice(0, 4)}: ${format(d.total)}`}
                                    className={`w-full rounded-t-lg ${d.total > 0 ? 'bg-farm-500' : 'bg-farm-100'}`}
                                    style={{ height: `${d.total > 0 ? Math.max(6, (d.total / max) * 100) : 3}%` }}
                                />
                                <span className="text-[10px] text-slate-500">{d.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
}

/* Plain-language findings, written from the numbers. Shown only when there are any. */
export function Insights({ lines }) {
    const shown = lines.filter(Boolean);
    if (shown.length === 0) return null;

    return (
        <Card title="What the numbers say">
            <ul className="space-y-2 px-6 pb-6 pt-3 text-sm text-slate-700">
                {shown.map((line) => (
                    <li key={line} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-farm-500" aria-hidden="true" />
                        <span>{line}</span>
                    </li>
                ))}
            </ul>
        </Card>
    );
}

export const formatDate = (value) => {
    if (!value) return '-';
    const d = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
    return Number.isNaN(d.getTime())
        ? '-'
        : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime())
        ? null
        : d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
