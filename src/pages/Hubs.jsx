import ModuleHub from '../components/ModuleHub.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { canAccessModule } from '../config/permissions.js';

import FarmManagement from './FarmManagement.jsx';
import WeatherManagement from './WeatherManagement.jsx';

import CropManagement from './CropManagement.jsx';
import PlantingManagement from './PlantingManagement.jsx';
import CropMonitoring from './CropMonitoring.jsx';
import PestDiseaseManagement from './PestDiseaseManagement.jsx';
import LivestockManagement from './LivestockManagement.jsx';

import SalesManagement from './SalesManagement.jsx';
import { LedgerView } from './FinancialManagement.jsx';
import ReportsAnalytics from './ReportsAnalytics.jsx';

import WaterSourceManagement from './WaterSourceManagement.jsx';
import IrrigationScheduleManagement from './IrrigationScheduleManagement.jsx';
import PumpMonitoring from './PumpMonitoring.jsx';

import HarvestManagement from './HarvestManagement.jsx';
import YieldRecords from './YieldRecords.jsx';
import PostHarvestHandling from './PostHarvestHandling.jsx';
import StorageManagement from './StorageManagement.jsx';

import TaskTracking from './TaskTracking.jsx';
import ProductionLogging from './ProductionLogging.jsx';
import EmployeeManagement from './EmployeeManagement.jsx';

import InventoryManagement from './InventoryManagement.jsx';
import EquipmentManagement from './EquipmentManagement.jsx';
import SupplierManagement from './SupplierManagement.jsx';

// Each hub puts related modules on one page as tabs. Tabs a role may not use
// are left out automatically (see MODULE_ROLES in config/permissions.js).

// A role that can only open one tab of a combined page sees that tab's own
// name as the page title (a Worker opens "Livestock", not "Crops & Livestock").
export function LandHub() {
    const { user } = useAuth();
    const farms = canAccessModule(user?.role, '/farms');
    const subtitleByRole = {
        Admin: 'Review the farm registry and system weather information.',
        'Farm-owner': 'Manage your farms, fields and weather information.',
        Manager: 'Review assigned farms, fields and weather information.',
        Agronomist: 'Review farm fields, agronomy work and weather conditions.',
        Accountant: 'Review farm context and weather for financial planning.',
    };

    return (
        <ModuleHub
            title={farms ? 'Farms & Weather' : 'Weather'}
            subtitle={
                subtitleByRole[user?.role] || 'Current conditions and the forecast for your farms.'
            }
            tabs={[
                { key: 'farms', label: 'Farms', path: '/farms', element: <FarmManagement /> },
                { key: 'weather', label: 'Weather', path: '/weather', adminViewOnly: true, element: <WeatherManagement /> },
            ]}
        />
    );
}

export function CropsHub() {
    const { user } = useAuth();
    const crops = canAccessModule(user?.role, '/crops');

    return (
        <ModuleHub
            title={crops ? 'Crops & Livestock' : 'Livestock'}
            subtitle={
                crops
                    ? 'The crop catalogue, what is planted where, how it is growing, its pests and diseases, and your animals.'
                    : 'Vaccinations, health, breeding and weight records for your animals.'
            }
            tabs={[
                { key: 'crops', label: 'Crops', path: '/crops', adminViewOnly: true, element: <CropManagement /> },
                { key: 'plantings', label: 'Plantings', path: '/plantings', adminViewOnly: true, element: <PlantingManagement /> },
                { key: 'monitoring', label: 'Crop monitoring', path: '/crop-monitoring', adminViewOnly: true, element: <CropMonitoring /> },
                { key: 'pests', label: 'Pests & diseases', path: '/pest-disease', adminViewOnly: true, element: <PestDiseaseManagement /> },
                { key: 'livestock', label: 'Livestock', path: '/livestock', adminViewOnly: true, element: <LivestockManagement /> },
            ]}
        />
    );
}

export function WaterHub() {
    return (
        <ModuleHub
            title="Water & Irrigation"
            subtitle="Water sources, irrigation schedules and pump performance."
            tabs={[
                { key: 'sources', label: 'Water sources', path: '/water-sources', adminViewOnly: true, element: <WaterSourceManagement /> },
                { key: 'irrigation', label: 'Irrigation schedules', path: '/irrigation-schedules', adminViewOnly: true, element: <IrrigationScheduleManagement /> },
                { key: 'pumps', label: 'Pump monitoring', path: '/pump-monitoring', adminViewOnly: true, element: <PumpMonitoring /> },
            ]}
        />
    );
}

export function HarvestHub() {
    return (
        <ModuleHub
            title="Harvest & Storage"
            subtitle="Harvest plans, yields, post-harvest handling and what is in store."
            tabs={[
                { key: 'harvest', label: 'Harvest schedule', path: '/harvest', adminViewOnly: true, element: <HarvestManagement /> },
                { key: 'yield', label: 'Yield records', path: '/yield-records', adminViewOnly: true, element: <YieldRecords /> },
                { key: 'post-harvest', label: 'Post-harvest handling', path: '/post-harvest-handling', adminViewOnly: true, element: <PostHarvestHandling /> },
                { key: 'storage', label: 'Storage', path: '/storage', adminViewOnly: true, element: <StorageManagement /> },
            ]}
        />
    );
}

export function OperationsHub() {
    return (
        <ModuleHub
            title="Tasks & Workforce"
            subtitle="Daily work, production logs and the people doing it."
            tabs={[
                { key: 'tasks', label: 'Tasks', path: '/tasks', adminViewOnly: true, element: <TaskTracking /> },
                { key: 'production', label: 'Production logs', path: '/production', adminViewOnly: true, element: <ProductionLogging /> },
                { key: 'employees', label: 'Employees', path: '/employees', element: <EmployeeManagement /> },
            ]}
        />
    );
}

export function ResourcesHub() {
    return (
        <ModuleHub
            title="Inventory & Equipment"
            subtitle="Inputs in stock, machinery, and the suppliers you buy from."
            tabs={[
                { key: 'inventory', label: 'Inventory & inputs', path: '/inventory', adminViewOnly: true, element: <InventoryManagement /> },
                { key: 'equipment', label: 'Equipment', path: '/equipment', adminViewOnly: true, element: <EquipmentManagement /> },
                { key: 'suppliers', label: 'Suppliers', path: '/suppliers', element: <SupplierManagement /> },
            ]}
        />
    );
}

export function MoneyHub() {
    return (
        <ModuleHub
            title="Sales, Finance & Reports"
            subtitle="Orders and customers, every kwacha in and out, budgets, and the reports that pull it together."
            defaultTab="transactions"
            tabs={[
                { key: 'sales', label: 'Sales & customers', path: '/sales', element: <SalesManagement /> },
                { key: 'transactions', label: 'All transactions', path: '/finance', element: <LedgerView view="transactions" /> },
                { key: 'expenses', label: 'Expenses', path: '/finance', element: <LedgerView view="expenses" /> },
                { key: 'budgets', label: 'Budgets', path: '/finance', element: <LedgerView view="budgets" /> },
                { key: 'reports', label: 'Reports & analytics', path: '/reports', element: <ReportsAnalytics /> },
            ]}
        />
    );
}
