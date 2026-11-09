import ModuleHub from '../components/ModuleHub.jsx';

import CropManagement from './CropManagement.jsx';
import PlantingManagement from './PlantingManagement.jsx';

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

export function CropsHub() {
    return (
        <ModuleHub
            title="Crops & Planting"
            subtitle="The crop catalogue and what is planted where. Open a crop to monitor it and track its pests and diseases."
            tabs={[
                { key: 'crops', label: 'Crops', path: '/crops', adminViewOnly: true, element: <CropManagement /> },
                { key: 'plantings', label: 'Plantings', path: '/plantings', adminViewOnly: true, element: <PlantingManagement /> },
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
