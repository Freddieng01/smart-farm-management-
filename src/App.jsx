import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';

import Dashboard from './components/Dashboard.jsx';
import LoginPage from './pages/Login.jsx';
import UserManagement from './pages/UserManagement.jsx';
import FarmManagement from './pages/FarmManagement.jsx';
import FieldManagement from './pages/FieldManagement.jsx';
import EmployeeManagement from './pages/EmployeeManagement.jsx';
import TaskTracking from './pages/TaskTracking.jsx';
import ProductionLogging from './pages/ProductionLogging.jsx';
import ExpenseTracking from './pages/ExpenseTracking.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import HarvestManagement from './pages/HarvestManagement.jsx';
import YieldRecords from './pages/YieldRecords.jsx';
import PostHarvestHandling from './pages/PostHarvestHandling.jsx';
import CropManagement from './pages/CropManagement.jsx';
import PlantingManagement from './pages/PlantingManagement.jsx';
import CropMonitoring from './pages/CropMonitoring.jsx';
import WaterSourceManagement from './pages/WaterSourceManagement.jsx';
import IrrigationScheduleManagement from './pages/IrrigationScheduleManagement.jsx';
import PumpMonitoring from './pages/PumpMonitoring.jsx';
import PestDiseaseManagement from './pages/PestDiseaseManagement.jsx';
import WeatherManagement from './pages/WeatherManagement.jsx';

import LivestockManagement from './pages/LivestockManagement.jsx';
import AcceptInvitation from './pages/AcceptInvitation.jsx';
import NotificationsManagement from './pages/NotificationsManagement.jsx';
import SupplierManagement from './pages/SupplierManagement.jsx';
import SalesManagement from './pages/SalesManagement.jsx';
import StorageManagement from './pages/StorageManagement.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import InventoryManagement from './pages/InventoryManagement.jsx';
import EquipmentManagement from './pages/EquipmentManagement.jsx';
import FinancialManagement from './pages/FinancialManagement.jsx';
import ReportsAnalytics from './pages/ReportsAnalytics.jsx';

function AppRoutes() {
    const { user } = useAuth();

    return (
        <Routes>
            <Route
                path="/login"
                element={
                    !user
                        ? <LoginPage />
                        : <Navigate to="/dashboard" replace />
                }
            />

            <Route
                path="/accept-invite"
                element={<AcceptInvitation />}
            />

            <Route
                path="/forgot-password"
                element={<ForgotPassword />}
            />

            <Route
                path="/reset-password"
                element={<ResetPassword />}
            />

            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/farms"
                element={
                    <ProtectedRoute
                        allowedRoles={[
                            'Admin',
                            'Farm-owner',
                            'Manager',
                        ]}
                    >
                        <FarmManagement />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/livestock"
                element={
                    <ProtectedRoute
                        allowedRoles={[
                            'Admin',
                            'Farm-owner',
                            'Manager',
                            'Agronomist',
                            'Worker',
                        ]}
                    >
                        <LivestockManagement />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/notifications"
                element={
                    <ProtectedRoute
                        allowedRoles={[
                            'Admin',
                            'Farm-owner',
                            'Manager',
                            'Accountant',
                            'Agronomist',
                            'Worker',
                        ]}
                    >
                        <NotificationsManagement />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/suppliers"
                element={
                    <ProtectedRoute
                        allowedRoles={[
                            'Admin',
                            'Farm-owner',
                            'Manager',
                            'Accountant',
                        ]}
                    >
                        <SupplierManagement />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/sales"
                element={
                    <ProtectedRoute
                        allowedRoles={[
                            'Admin',
                            'Farm-owner',
                            'Manager',
                            'Accountant',
                        ]}
                    >
                        <SalesManagement />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/farms/:farmId/fields"
                element={
                    <ProtectedRoute
                        allowedRoles={[
                            'Admin',
                            'Farm-owner',
                            'Manager',
                            'Agronomist',
                        ]}
                    >
                        <FieldManagement />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/employees"
                element={
                    <ProtectedRoute
                        allowedRoles={[
                            'Admin',
                            'Farm-owner',
                            'Manager',
                        ]}
                    >
                        <EmployeeManagement />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/tasks"
                element={
                    <ProtectedRoute
                        allowedRoles={[
                            'Admin',
                            'Farm-owner',
                            'Manager',
                            'Agronomist',
                            'Worker',
                        ]}
                    >
                        <TaskTracking />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/tasks/:taskId"
                element={
                    <ProtectedRoute
                        allowedRoles={[
                            'Admin',
                            'Farm-owner',
                            'Manager',
                            'Agronomist',
                            'Worker',
                        ]}
                    >
                        <TaskTracking />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/production"
                element={
                    <ProtectedRoute
                        allowedRoles={[
                            'Admin',
                            'Farm-owner',
                            'Manager',
                            'Agronomist',
                        ]}
                    >
                        <ProductionLogging />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/storage"
                element={
                    <ProtectedRoute allowedRoles={['Admin', 'Farm-owner', 'Manager', 'Accountant', 'Worker']}>
                        <StorageManagement />
                    </ProtectedRoute>
                }
            />

            {/* Crop Management */}
            <Route
                path="/crops"
                element={
                    <ProtectedRoute allowedRoles={['Admin', 'Farm-owner', 'Manager', 'Agronomist']}>
                        <CropManagement />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/plantings"
                element={
                    <ProtectedRoute allowedRoles={['Admin', 'Farm-owner', 'Manager', 'Agronomist']}>
                        <PlantingManagement />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/crop-monitoring"
                element={
                    <ProtectedRoute allowedRoles={['Admin', 'Farm-owner', 'Manager', 'Agronomist']}>
                        <CropMonitoring />
                    </ProtectedRoute>
                }
            />

            {/* Irrigation and Water Management */}
            <Route
                path="/water-sources"
                element={
                    <ProtectedRoute allowedRoles={['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker']}>
                        <WaterSourceManagement />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/irrigation-schedules"
                element={
                    <ProtectedRoute allowedRoles={['Admin', 'Farm-owner', 'Manager', 'Agronomist']}>
                        <IrrigationScheduleManagement />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/pump-monitoring"
                element={
                    <ProtectedRoute allowedRoles={['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker']}>
                        <PumpMonitoring />
                    </ProtectedRoute>
                }
            />

            {/* Pest and Disease Management */}
            <Route
                path="/pest-disease"
                element={
                    <ProtectedRoute allowedRoles={['Admin', 'Farm-owner', 'Manager', 'Agronomist']}>
                        <PestDiseaseManagement />
                    </ProtectedRoute>
                }
            />

            {/* Weather Management */}
            <Route
                path="/weather"
                element={
                    <ProtectedRoute allowedRoles={['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker', 'Accountant']}>
                        <WeatherManagement />
                    </ProtectedRoute>
                }
            />

            {/* Harvest Management */}
            <Route
                path="/harvest"
                element={
                    <ProtectedRoute allowedRoles={['Admin', 'Farm-owner', 'Manager', 'Agronomist']}>
                        <HarvestManagement />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/yield-records"
                element={
                    <ProtectedRoute allowedRoles={['Admin', 'Farm-owner', 'Manager', 'Agronomist']}>
                        <YieldRecords />
                    </ProtectedRoute>
                }
            />

            {/* Post-Harvest Handling */}
            <Route
                path="/post-harvest-handling"
                element={
                    <ProtectedRoute allowedRoles={['Admin', 'Farm-owner', 'Manager', 'Agronomist']}>
                        <PostHarvestHandling />
                    </ProtectedRoute>
                }
            />

            {/* Expenses */}
            <Route
                path="/expenses"
                element={
                    <ProtectedRoute
                        allowedRoles={[
                            'Farm-owner',
                            'Manager',
                            'Accountant',
                        ]}
                    >
                        <ExpenseTracking />
                    </ProtectedRoute>
                }
            />

            {/* User Management */}
            <Route
                path="/users"
                element={
                    <ProtectedRoute allowedRoles={['Admin']}>
                        <UserManagement />
                    </ProtectedRoute>
                }
            />

            {/* Inventory */}
            <Route
                path="/inventory"
                element={
                    <ProtectedRoute
                        allowedRoles={[
                            'Admin',
                            'Farm-owner',
                            'Manager',
                            'Agronomist',
                        ]}
                    >
                        <InventoryManagement />
                    </ProtectedRoute>
                }
            />

            {/* Equipment */}
            <Route
                path="/equipment"
                element={
                    <ProtectedRoute
                        allowedRoles={[
                            'Admin',
                            'Farm-owner',
                            'Manager',
                        ]}
                    >
                        <EquipmentManagement />
                    </ProtectedRoute>
                }
            />

            {/* Financial Management */}
            <Route
                path="/finance"
                element={
                    <ProtectedRoute
                        allowedRoles={[
                            'Farm-owner',
                            'Manager',
                            'Accountant',
                        ]}
                    >
                        <FinancialManagement />
                    </ProtectedRoute>
                }
            />

            {/* Reports and Analytics */}
            <Route
                path="/reports"
                element={
                    <ProtectedRoute
                        allowedRoles={[
                            'Farm-owner',
                            'Manager',
                            'Accountant',
                        ]}
                    >
                        <ReportsAnalytics />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/"
                element={<Navigate to="/dashboard" replace />}
            />

            <Route
                path="*"
                element={<Navigate to="/dashboard" replace />}
            />
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