import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { canAccessModule } from '../config/permissions.js';

/**
 * An employee's name that opens their profile page.
 * Only people who may open employee profiles get a link; everyone else sees plain text.
 */
export default function EmployeeLink({ employee, children, className = 'text-farm-900' }) {
    const { user } = useAuth();
    const name = children ?? employee?.user?.name ?? '—';

    if (!employee?.id || !canAccessModule(user?.role, '/employees')) {
        return <span className={className}>{name}</span>;
    }

    return (
        <Link to={`/employees/${employee.id}`} className={`${className} hover:underline`}>
            {name}
        </Link>
    );
}
