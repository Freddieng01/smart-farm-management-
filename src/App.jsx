import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { LEGACY_REDIRECTS } from './config/permissions.js';

import Dashboard from './components/Dashboard.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/Login.jsx';
import AcceptInvitation from './pages/AcceptInvitation.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';

import UserManagement from './pages/UserManagement.jsx';
import FarmProfile from './pages/FarmProfile.jsx';
import TaskDetail from './pages/TaskDetail.jsx';
import PlantingProfile from './pages/PlantingProfile.jsx';
import CropProfile from './pages/CropProfile.jsx';
import EmployeeProfile from './pages/EmployeeProfile.jsx';
import NotificationsManagement from './pages/NotificationsManagement.jsx';
import { LandHub, CropsHub, WaterHub, HarvestHub, OperationsHub, ResourcesHub, MoneyHub } from './pages/Hubs.jsx';

const ALL_ROLES = ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker', 'Accountant'];

// Old address of a farm's fields page -> the Fields tab of the farm's profile.
function FarmFieldsRedirect() {
    const { farmId } = useParams();
    return <Navigate to={`/farms/${farmId}?tab=fields`} replace />;
}

function AppRoutes() {
    const { user } = useAuth();

    // `roles` is only a fallback: the real list for each page comes from
    // config/permissions.js (ProtectedRoute reads it from the address).
    const page = (_roles, element) => <ProtectedRoute>{element}</ProtectedRoute>;

    return (
        <Routes>
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" replace />} />
            <Route path="/accept-invite" element={<AcceptInvitation />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

            {/* Farms & Weather on one page, then each farm's own profile (overview, fields, tasks, finance) */}
            <Route path="/farms" element={page(ALL_ROLES, <LandHub />)} />
            <Route path="/farms/:farmId" element={page(['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Accountant'], <FarmProfile />)} />
            <Route path="/farms/:farmId/fields" element={page(['Admin', 'Farm-owner', 'Manager', 'Agronomist'], <FarmFieldsRedirect />)} />

            {/* Pages that group related modules as tabs */}
            <Route path="/crops" element={page(['Admin', 'Farm-owner', 'Manager', 'Agronomist'], <CropsHub />)} />
            <Route path="/water" element={page(['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'], <WaterHub />)} />
            <Route path="/harvest" element={page(['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Accountant', 'Worker'], <HarvestHub />)} />
            <Route path="/tasks" element={page(['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'], <OperationsHub />)} />
            <Route path="/inventory" element={page(['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Accountant'], <ResourcesHub />)} />
            <Route path="/finance" element={page(['Farm-owner', 'Manager', 'Accountant'], <MoneyHub />)} />

            {/* One employee's profile */}
            <Route path="/employees/:employeeId" element={page(['Farm-owner', 'Manager'], <EmployeeProfile />)} />

            {/* One registered crop's profile: where it is planted, monitoring, pests and diseases */}
            <Route path="/crops/:cropId" element={page(['Admin', 'Farm-owner', 'Manager', 'Agronomist'], <CropProfile />)} />

            {/* One planted crop's profile: monitoring, pests and diseases */}
            <Route path="/plantings/:plantingId" element={page(['Admin', 'Farm-owner', 'Manager', 'Agronomist'], <PlantingProfile />)} />

            {/* One task's own page */}
            <Route path="/tasks/:taskId" element={page(['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'], <TaskDetail />)} />

            {/* Stand-alone modules */}
            <Route path="/notifications" element={page(ALL_ROLES, <NotificationsManagement />)} />
            <Route path="/users" element={page(['Admin'], <UserManagement />)} />

            {/* Old addresses (bookmarks, notification links) open the matching tab */}
            {Object.entries(LEGACY_REDIRECTS).map(([from, to]) => (
                <Route key={from} path={from} element={<Navigate to={to} replace />} />
            ))}

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <Router>
            <AuthProvider>
                <NotificationProvider>
                    <AppRoutes />
                </NotificationProvider>
            </AuthProvider>
        </Router>
    );
}
