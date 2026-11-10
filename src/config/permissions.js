export const ROLES = ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker', 'Accountant'];

export const MODULE_ROLES = {
    '/farms': ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Accountant'],
    '/farms/:farmId': ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Accountant'],
    '/farms/:farmId/fields': ['Admin', 'Farm-owner', 'Manager', 'Agronomist'],
    '/livestock': ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'],
    '/notifications': ['Admin', 'Farm-owner', 'Manager', 'Accountant', 'Agronomist', 'Worker'],
    '/suppliers': ['Farm-owner', 'Manager', 'Accountant'],
    '/sales': ['Farm-owner', 'Manager', 'Accountant'],
    '/employees': ['Farm-owner', 'Manager'],
    '/tasks': ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'],
    '/production': ['Admin', 'Farm-owner', 'Manager', 'Agronomist'],
    '/storage': ['Admin', 'Farm-owner', 'Manager', 'Accountant', 'Worker'],
    '/crops': ['Admin', 'Farm-owner', 'Manager', 'Agronomist'],
    '/plantings': ['Admin', 'Farm-owner', 'Manager', 'Agronomist'],
    '/crop-monitoring': ['Admin', 'Farm-owner', 'Manager', 'Agronomist'],
    '/water-sources': ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'],
    '/irrigation-schedules': ['Admin', 'Farm-owner', 'Manager', 'Agronomist'],
    '/pump-monitoring': ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'],
    '/pest-disease': ['Admin', 'Farm-owner', 'Manager', 'Agronomist'],
    '/weather': ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker', 'Accountant'],
    '/harvest': ['Admin', 'Farm-owner', 'Manager', 'Agronomist'],
    '/yield-records': ['Admin', 'Farm-owner', 'Manager', 'Agronomist'],
    '/post-harvest-handling': ['Admin', 'Farm-owner', 'Manager', 'Agronomist'],
    '/expenses': ['Farm-owner', 'Manager', 'Accountant'],
    '/inventory': ['Admin', 'Farm-owner', 'Manager', 'Agronomist'],
    '/equipment': ['Admin', 'Farm-owner', 'Manager'],
    '/finance': ['Farm-owner', 'Manager', 'Accountant'],
    '/reports': ['Farm-owner', 'Manager', 'Accountant'],
    '/users': ['Admin'],
};

// Related modules are shown together on one page (tabs). Each hub is opened
// from its own path and lists the modules (paths above) that live inside it.
export const HUB_MODULES = {
    '/farms': ['/farms', '/weather'],
    '/crops': ['/crops', '/plantings', '/crop-monitoring', '/pest-disease', '/livestock'],
    '/water': ['/water-sources', '/irrigation-schedules', '/pump-monitoring'],
    '/harvest': ['/harvest', '/yield-records', '/post-harvest-handling', '/storage'],
    '/tasks': ['/tasks', '/production', '/employees'],
    '/inventory': ['/inventory', '/equipment', '/suppliers'],
    '/finance': ['/finance', '/sales', '/reports'],
};

// Old page addresses still work: they open the right tab of the hub.
export const LEGACY_REDIRECTS = {
    '/plantings': '/crops?tab=plantings',
    '/crop-monitoring': '/crops?tab=monitoring',
    '/pest-disease': '/crops?tab=pests',
    '/livestock': '/crops?tab=livestock',
    '/weather': '/farms?tab=weather',
    '/sales': '/finance?tab=sales',
    '/reports': '/finance?tab=reports',
    '/water-sources': '/water?tab=sources',
    '/irrigation-schedules': '/water?tab=irrigation',
    '/pump-monitoring': '/water?tab=pumps',
    '/yield-records': '/harvest?tab=yield',
    '/post-harvest-handling': '/harvest?tab=post-harvest',
    '/storage': '/harvest?tab=storage',
    '/production': '/tasks?tab=production',
    '/employees': '/tasks?tab=employees',
    '/equipment': '/inventory?tab=equipment',
    '/suppliers': '/inventory?tab=suppliers',
    '/expenses': '/finance?tab=expenses',
};

// Roles of one module, exactly as listed in MODULE_ROLES (used to decide which tabs show).
export function canAccessModule(role, path) {
    return (MODULE_ROLES[path] || []).includes(role);
}

// Roles that may open a page. A hub is open to anyone who can use at least one of its modules.
export function rolesForPath(path) {
    if (path.startsWith('/farms/') && path.endsWith('/fields')) {
        return MODULE_ROLES['/farms/:farmId/fields'];
    }

    if (/^\/farms\/[^/]+$/.test(path)) {
        return MODULE_ROLES['/farms/:farmId'];
    }

    const profileModules = ['/crops', '/plantings', '/tasks', '/employees'];
    const profileModule = profileModules.find((module) => path.startsWith(`${module}/`));
    if (profileModule) {
        return MODULE_ROLES[profileModule] || [];
    }

    if (HUB_MODULES[path]) {
        return [...new Set(HUB_MODULES[path].flatMap((module) => MODULE_ROLES[module] || []))];
    }

    return MODULE_ROLES[path] || [];
}

export function canAccessPath(role, path) {
    return rolesForPath(path).includes(role);
}
