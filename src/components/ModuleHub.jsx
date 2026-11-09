import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { canAccessModule } from '../config/permissions.js';
import ModuleLayout from './ModuleLayout.jsx';
import { HubContext } from './HubContext.js';

const softShadow = 'shadow-[0_2px_16px_rgba(15,60,35,0.07)]';

/**
 * One page that groups several related modules as tabs.
 *
 * tabs: [{ key, label, path, element, adminViewOnly }]
 *   path           the module's route, used to decide which roles see the tab
 *   adminViewOnly  an Admin may look at this tab but not change anything
 *
 * The active tab lives in the URL (?tab=plantings) so it can be linked to and
 * survives a refresh.
 */
export default function ModuleHub({ title, subtitle, tabs, defaultTab, actions, backTo }) {
    const { user } = useAuth();
    const [params, setParams] = useSearchParams();

    const visible = tabs.filter((tab) => (tab.roles ? tab.roles.includes(user?.role) : canAccessModule(user?.role, tab.path)));
    if (visible.length === 0) return <Navigate to="/dashboard" replace />;

    const requested = params.get('tab');
    const active =
        visible.find((tab) => tab.key === requested) ||
        visible.find((tab) => tab.key === defaultTab) ||
        visible[0];

    const select = (key) => {
        const next = new URLSearchParams(params);
        next.set('tab', key);
        setParams(next, { replace: true });
    };

    const adminViewOnly = Boolean(active.adminViewOnly) && user?.role === 'Admin';

    return (
        <ModuleLayout title={title} subtitle={subtitle} actions={actions} backTo={backTo}>
            {visible.length > 1 && (
                <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label={`${typeof title === 'string' ? title : 'Page'} sections`}>
                    {visible.map((tab) => {
                        const isActive = tab.key === active.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => select(tab.key)}
                                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                                    isActive ? 'bg-farm-700 text-white' : `bg-white text-slate-600 hover:text-farm-800 ${softShadow}`
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            )}

            <HubContext.Provider value={{ adminViewOnly }}>
                <div key={active.key} className={adminViewOnly ? '[&_td_button]:hidden' : ''}>
                    {active.element}
                </div>
            </HubContext.Provider>
        </ModuleLayout>
    );
}
