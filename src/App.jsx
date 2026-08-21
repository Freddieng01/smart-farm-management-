import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Dashboard from './components/Dashboard.jsx';
import Login from './components/Login.jsx';

function AppShell() {
    const { isAuthenticated } = useAuth();

    return isAuthenticated ? <Dashboard /> : <Login />;
}

export default function App() {
    return (
        <AuthProvider>
            <AppShell />
        </AuthProvider>
    );
}
