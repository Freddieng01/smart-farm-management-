import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessPath, rolesForPath } from '../config/permissions.js';

// Pages an Admin must not open: they hold the farm owner's private business data.
const ADMIN_BLOCKED = ['/employees', '/expenses', '/finance', '/reports', '/suppliers', '/sales'];

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading, hasRole } = useAuth();
    const { pathname } = useLocation();

    if (loading) return <div>Loading...</div>;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role === 'Admin' && ADMIN_BLOCKED.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
        return <Navigate to="/dashboard" replace />;
    }

    const configuredRoles = rolesForPath(pathname);
    const authorized = configuredRoles.length > 0
        ? canAccessPath(user.role, pathname)
        : !allowedRoles || hasRole(allowedRoles);

    if (!authorized) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default ProtectedRoute;
