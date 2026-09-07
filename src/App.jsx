import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Dashboard from './components/Dashboard.jsx';
import LoginPage from './pages/Login.jsx';
import UserManagement from './pages/UserManagement.jsx';

function Unauthorized() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">403</h1>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Access Denied</h2>
                <p className="text-gray-600 mb-8">You do not have permission to access this page.</p>
                <a href="/dashboard" className="inline-block bg-[#315f2b] text-white px-6 py-2 rounded-md font-medium hover:bg-[#264b22] transition">
                    Back to Dashboard
                </a>
            </div>
        </main>
    );
}

function AppRoutes() {
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            {!isAuthenticated ? (
                <>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </>
            ) : (
                <>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/users" element={<UserManagement />} />
                    <Route path="/unauthorized" element={<Unauthorized />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </>
            )}
        </Routes>
    );
}

export default function App() {
    return (
        <Router>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </Router>
    );
}
