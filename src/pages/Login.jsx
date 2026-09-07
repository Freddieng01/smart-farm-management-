import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Login from '../components/Login.jsx';

export default function LoginPage() {
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            window.location.href = '/dashboard';
        }
    }, [isAuthenticated]);

    if (isAuthenticated) {
        return null;
    }

    return <Login />;
}
