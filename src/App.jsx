import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

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
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import InventoryManagement from './pages/InventoryManagement.jsx';
import EquipmentManagement from './pages/EquipmentManagement.jsx';
import FinancialManagement from './pages/FinancialManagement.jsx';
import ReportsAnalytics from './pages/ReportsAnalytics.jsx';

function Unauthorized() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    403
                </h1>

                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                    Access Denied
                </h2>

                <p className="text-gray-600 mb-8">
                    You do not have permission to access this page.
                </p>

                <a
                    href="/dashboard"
                    className="inline-block bg-[#315f2b] text-white px-6 py-2 rounded-md font-medium hover:bg-[#264b22] transition"
                >
                    Back to Dashboard
                </a>
            </div>
        </main>
    );
}

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
                            'Agronomist',
                            'Accountant',
                            'Worker',
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
                            'Worker',
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

            {/* Crop Management */}
            <Route
                path="/crops"
                element={
                    <ProtectedRoute>
                        <CropManagement />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/plantings"
                element={
                    <ProtectedRoute>
                        <PlantingManagement />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/crop-monitoring"
                element={
                    <ProtectedRoute>
                        <CropMonitoring />
                    </ProtectedRoute>
                }
            />

            {/* Irrigation and Water Management */}
            <Route
                path="/water-sources"
                element={
                    <ProtectedRoute>
                        <WaterSourceManagement />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/irrigation-schedules"
                element={
                    <ProtectedRoute>
                        <IrrigationScheduleManagement />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/pump-monitoring"
                element={
                    <ProtectedRoute>
                        <PumpMonitoring />
                    </ProtectedRoute>
                }
            />

            {/* Pest and Disease Management */}
            <Route
                path="/pest-disease"
                element={
                    <ProtectedRoute>
                        <PestDiseaseManagement />
                    </ProtectedRoute>
                }
            />

            {/* Weather Management */}
            <Route
                path="/weather"
                element={
                    <ProtectedRoute>
                        <WeatherManagement />
                    </ProtectedRoute>
                }
            />

            {/* Harvest Management */}
            <Route
                path="/harvest"
                element={
                    <ProtectedRoute>
                        <HarvestManagement />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/yield-records"
                element={
                    <ProtectedRoute>
                        <YieldRecords />
                    </ProtectedRoute>
                }
            />

            {/* Post-Harvest Handling */}
            <Route
                path="/post-harvest-handling"
                element={
                    <ProtectedRoute>
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
                            'Admin',
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
                            'Worker',
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
                            'Worker',
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
                            'Admin',
                            'Farm-owner',
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
                            'Admin',
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
                path="/unauthorized"
                element={<Unauthorized />}
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
                <AppRoutes />
            </AuthProvider>
        </Router>
    );
}