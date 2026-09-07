import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, allowedRoles = null }) {
    const { isAuthenticated, hasRole } = useAuth();

    if (!isAuthenticated) {
        window.location.href = '/login';
        return null;
    }

    if (allowedRoles && !hasRole(allowedRoles)) {
        window.location.href = '/unauthorized';
        return null;
    }

    return children;
}
