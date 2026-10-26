import { useEffect } from 'react';

/* Same soft shadow the dashboard cards use */
export const softShadow = 'shadow-[0_2px_16px_rgba(15,60,35,0.07)]';

/* ---------- Class strings reused across modules ---------- */

export const inputClass =
    'mt-1 w-full rounded-xl border border-farm-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20';

export const thClass = 'px-6 py-3 text-xs font-semibold text-farm-700';

export const tdClass = 'px-6 py-4 text-slate-600';

/* ---------- Button ---------- */

const buttonStyles = {
    primary: 'bg-farm-700 text-white hover:bg-farm-800',
    accent: 'bg-harvest-400 text-farm-900 hover:bg-harvest-500',
    secondary: `bg-white text-slate-600 hover:text-farm-800 ring-1 ring-farm-200`,
    danger: 'bg-red-600 text-white hover:bg-red-700',
};

export function Button({ variant = 'primary', className = '', type = 'button', ...props }) {
    return (
        <button
            type={type}
            className={`rounded-full px-5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonStyles[variant]} ${className}`}
            {...props}
        />
    );
}

/* Small text-style buttons for table rows */
export function RowAction({ tone = 'default', className = '', ...props }) {
    const tones = {
        default: 'text-farm-700 hover:text-farm-900',
        danger: 'text-red-600 hover:text-red-800',
    };
    return (
        <button
            type="button"
            className={`rounded px-1 text-sm font-medium underline-offset-2 hover:underline ${tones[tone]} ${className}`}
            {...props}
        />
    );
}

/* ---------- Card (same look as the dashboard panels) ---------- */

export function Card({ title, className = '', children }) {
    return (
        <section className={`overflow-hidden rounded-3xl bg-white ${softShadow} ${className}`}>
            {title && <h2 className="px-6 pt-5 text-base font-semibold text-farm-900">{title}</h2>}
            {children}
        </section>
    );
}

/* ---------- Alert (errors / info) ---------- */

export function Alert({ tone = 'error', children }) {
    const tones = {
        error: 'bg-red-50 text-red-800',
        info: 'bg-farm-100 text-farm-800',
        warning: 'bg-harvest-50 text-harvest-600',
    };
    return (
        <p role="alert" className={`mb-6 rounded-2xl px-4 py-3 text-sm ${tones[tone]}`}>
            {children}
        </p>
    );
}

/* ---------- Status badge ---------- */

const badgeTones = {
    green: 'bg-farm-100 text-farm-800',
    amber: 'bg-harvest-100 text-harvest-600',
    blue: 'bg-sky-100 text-sky-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-slate-100 text-slate-700',
};

export function Badge({ tone = 'gray', children }) {
    return (
        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${badgeTones[tone]}`}>
            {children}
        </span>
    );
}

/* ---------- Form field (label + control) ---------- */

export function Field({ label, children }) {
    return (
        <label className="block">
            <span className="text-sm font-medium text-farm-900">{label}</span>
            {children}
        </label>
    );
}

/* ---------- Table message row (loading / empty) ---------- */

export function TableMessage({ colSpan, children }) {
    return (
        <tr>
            <td colSpan={colSpan} className="px-6 py-12 text-center text-sm text-slate-500">
                {children}
            </td>
        </tr>
    );
}

/* ---------- Modal ---------- */

export function Modal({ title, onClose, children }) {
    useEffect(() => {
        function onKey(e) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-farm-900/50 px-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"
            >
                <h2 className="mb-5 text-xl font-semibold text-farm-900">{title}</h2>
                {children}
            </div>
        </div>
    );
}
