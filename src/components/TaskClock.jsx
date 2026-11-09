import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

/** 3725 -> "1:02:05" */
export function formatDuration(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** Can this person start, pause or finish this task? Managers any; everyone else only their own. */
export function canWorkTask(user, task) {
    if (!user || !task || user.role === 'Admin') return false;
    if (['Farm-owner', 'Manager'].includes(user.role)) return true;
    return Boolean(task.employee?.user?.id) && task.employee.user.id === user.id;
}

/** Seconds on this task right now, counting up while the clock runs. */
export function useElapsed(task) {
    const received = useRef(Date.now());
    const [, tick] = useState(0);

    // remember when the server told us the elapsed time, so we can count on from there
    useEffect(() => {
        received.current = Date.now();
    }, [task?.elapsed_seconds, task?.is_running, task?.id]);

    useEffect(() => {
        if (!task?.is_running) return undefined;
        const timer = setInterval(() => tick((n) => n + 1), 1000);
        return () => clearInterval(timer);
    }, [task?.is_running]);

    if (!task) return 0;
    const base = Number(task.elapsed_seconds || 0);
    return task.is_running ? base + (Date.now() - received.current) / 1000 : base;
}

export function clockState(task) {
    if (task.status === 'completed') return 'finished';
    if (task.is_running) return 'running';
    if (task.started_at) return 'paused';
    return 'not_started';
}

export const CLOCK_LABEL = {
    not_started: { text: 'Not started', tone: 'bg-slate-100 text-slate-700' },
    running: { text: 'Running', tone: 'bg-blue-100 text-blue-700' },
    paused: { text: 'Paused', tone: 'bg-harvest-100 text-harvest-600' },
    finished: { text: 'Finished', tone: 'bg-farm-100 text-farm-700' },
};

const btn = 'rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-60';

/**
 * Start / Pause / Finish for one task. The server keeps the clock, so hours
 * are real even if the page is closed. `onChange` receives the updated task.
 */
export default function TaskClock({ task, onChange, compact = false }) {
    const { api, user } = useAuth();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const elapsed = useElapsed(task);
    const state = clockState(task);
    const allowed = canWorkTask(user, task);

    async function act(action) {
        setBusy(true);
        setError(null);
        try {
            const res = await api.post(`/api/daily-tasks/${task.id}/${action}`);
            onChange?.(res.data.data);
        } catch (err) {
            const errors = err.response?.data?.errors;
            setError(errors ? Object.values(errors).flat()[0] : (err.response?.data?.message || 'Could not update the task.'));
        } finally {
            setBusy(false);
        }
    }

    const buttons = !allowed || state === 'finished' ? null : (
        <div className={`flex flex-wrap gap-2 ${compact ? '' : 'mt-4'}`}>
            {(state === 'not_started' || state === 'paused') && (
                <button type="button" disabled={busy} onClick={() => act('start')}
                    className={`${btn} bg-farm-700 text-white hover:bg-farm-800`}>
                    {state === 'paused' ? 'Resume' : 'Start'}
                </button>
            )}
            {state === 'running' && (
                <button type="button" disabled={busy} onClick={() => act('pause')}
                    className={`${btn} bg-white text-slate-700 ring-1 ring-farm-200 hover:bg-farm-50`}>
                    Pause
                </button>
            )}
            {(state === 'running' || state === 'paused') && (
                <button type="button" disabled={busy}
                    onClick={() => { if (window.confirm('Finish this task? The hours will be saved for pay.')) act('finish'); }}
                    className={`${btn} bg-harvest-400 text-farm-900 hover:bg-harvest-500`}>
                    Finish
                </button>
            )}
        </div>
    );

    if (compact) {
        return (
            <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-3">
                <span className={`tabular-nums text-sm ${state === 'running' ? 'font-medium text-blue-700' : 'text-slate-500'}`}>
                    {state === 'not_started' ? '–' : formatDuration(elapsed)}
                </span>
                {buttons}
                {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between gap-3">
                <p className={`text-4xl font-semibold tracking-tight tabular-nums ${state === 'running' ? 'text-blue-700' : 'text-farm-900'}`}>
                    {formatDuration(elapsed)}
                </p>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${CLOCK_LABEL[state].tone}`}>{CLOCK_LABEL[state].text}</span>
            </div>
            {task.started_at && (
                <p className="mt-2 text-sm text-slate-500">
                    Started {new Date(task.started_at).toLocaleString()}
                    {task.completed_at ? `, finished ${new Date(task.completed_at).toLocaleString()}` : ''}
                </p>
            )}
            {buttons}
            {!allowed && state !== 'finished' && (
                <p className="mt-3 text-sm text-slate-500">Only {task.employee?.user?.name || 'the assigned employee'} or a manager can run this clock.</p>
            )}
            {error && <p role="alert" className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        </div>
    );
}
