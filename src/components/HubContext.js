import { createContext, useContext } from 'react';

/**
 * Lets a page know it is being shown inside a hub (a page with tabs).
 * Inside a hub, ModuleLayout skips its own header and only renders the
 * page's action buttons and content, so the hub's header is the only one.
 */
export const HubContext = createContext(null);

export function useHub() {
    return useContext(HubContext);
}
