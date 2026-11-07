export const ROLES = ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker', 'Accountant'];

export const MODULE_ROLES = {
    '/farms': ['Admin', 'Farm-owner', 'Manager'],
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

export function rolesForPath(path) {
    if (path.startsWith('/farms/') && path.endsWith('/fields')) {
        return MODULE_ROLES['/farms/:farmId/fields'];
    }

    return MODULE_ROLES[path] || [];
}

export function canAccessPath(role, path) {
    return rolesForPath(path).includes(role);
}
