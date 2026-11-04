<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Farm;
use App\Models\Field;
use App\Models\Employee;
use App\Models\Crop;
use App\Models\Planting;
use App\Models\YieldRecord;
use App\Models\FarmExpense;
use App\Models\Budget;
use App\Models\Livestock;
use App\Models\Equipment;
use App\Models\Customer;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\Supplier;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Notification;
use Carbon\Carbon;

class ComprehensiveDemoSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        $tables = [
            'payments', 'invoices', 'sales_order_items', 'sales_orders', 'market_prices',
            'resource_transactions', 'resources',
            'purchase_payments', 'purchase_order_items', 'purchase_orders', 'supplier_quotations',
            'farm_expenses', 'financial_transactions', 'budgets', 'dispatch_records', 'stock_movements',
            'stored_produce', 'storage_facilities', 'alert_rules', 'notifications',
            'equipment_fuel_logs', 'equipment_maintenance_records', 'equipment',
            'livestock_production_records', 'livestock_weight_records', 'livestock_breeding_records',
            'livestock_health_records', 'livestock_vaccinations', 'yield_records', 'harvest_schedules',
            'post_harvest_handlings', 'outbreak_alerts', 'spraying_schedules', 'scouting_records',
            'irrigation_schedules', 'pump_monitorings', 'water_sources', 'crop_monitorings',
            'crop_productions', 'daily_tasks', 'farm_expenses', 'plantings', 'crops', 'livestock',
            'customers', 'suppliers', 'employees', 'fields', 'farms', 'user_invitations',
            'audit_logs', 'notifications', 'users'
        ];
        foreach ($tables as $table) {
            DB::table($table)->truncate();
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // 1. Users
        $admin = User::create(['name' => 'System Admin', 'email' => 'admin@ffms.com', 'password' => Hash::make('AdminPass123!'), 'role' => 'Admin']);
        $owner = User::create(['name' => 'Farm Owner', 'email' => 'owner@ffms.com', 'password' => Hash::make('OwnerPass123!'), 'role' => 'Farm-owner']);
        $manager = User::create(['name' => 'Farm Manager', 'email' => 'manager@ffms.com', 'password' => Hash::make('ManagerPass123!'), 'role' => 'Manager']);
        $agronomist = User::create(['name' => 'Expert Agronomist', 'email' => 'agronomist@ffms.com', 'password' => Hash::make('AgroPass123!'), 'role' => 'Agronomist']);
        $worker = User::create(['name' => 'Field Worker', 'email' => 'worker@ffms.com', 'password' => Hash::make('WorkerPass123!'), 'role' => 'Worker']);
        $accountant = User::create(['name' => 'Farm Accountant', 'email' => 'accountant@ffms.com', 'password' => Hash::make('AccountPass123!'), 'role' => 'Accountant']);

        // 2. THE ONLY FARM
        $farm = Farm::create([
            'name' => 'Horizon Smart Farm',
            'location_gps' => '-15.4167, 28.2833',
            'latitude' => -15.4167,
            'longitude' => 28.2833,
            'total_acreage' => 500,
            'owner_id' => $owner->id
        ]);

        // 3. Fields
        $fields = [];
        $fieldNames = ['North Sector A', 'North Sector B', 'South Plateau', 'East Valley', 'West Ridge', 'Central Basin', 'Upper Slope', 'Lower Marsh'];
        foreach ($fieldNames as $name) {
            $fields[] = Field::create([
                'farm_id' => $farm->id,
                'name' => $name,
                'soil_type' => 'Loamy',
                'size_hectares' => rand(10, 50),
                'boundary_polygon' => json_encode([
                    [-15.4167 + (count($fields) * 0.001), 28.2833],
                    [-15.4167 + (count($fields) * 0.001), 28.2880],
                    [-15.4125 + (count($fields) * 0.001), 28.2880],
                    [-15.4125 + (count($fields) * 0.001), 28.2833],
                ]),
            ]);
        }

        // 4. Employees
        $employees = [
            Employee::create(['user_id' => $manager->id, 'farm_id' => $farm->id, 'task_assignment' => 'General Operations', 'hourly_rate' => 60]),
            Employee::create(['user_id' => $agronomist->id, 'farm_id' => $farm->id, 'task_assignment' => 'Crop Specialist', 'hourly_rate' => 50]),
            Employee::create(['user_id' => $worker->id, 'farm_id' => $farm->id, 'task_assignment' => 'General Labor', 'hourly_rate' => 15]),
            Employee::create(['user_id' => $accountant->id, 'farm_id' => $farm->id, 'task_assignment' => 'Financial Controller', 'hourly_rate' => 45]),
        ];
        DB::table('user_invitations')->insert([
            'invited_by' => $owner->id, 'name' => 'Seasonal Field Assistant',
            'email' => 'seasonal.assistant@ffms.com', 'role' => 'Worker',
            'token' => hash('sha256', 'demo-seasonal-assistant-invitation'),
            'expires_at' => Carbon::now()->addDays(14), 'created_at' => now(), 'updated_at' => now(),
        ]);

        // 5. Crops
        $crops = [];
        $cropData = [
            ['name' => 'Maize', 'cat' => 'Cereal', 'desc' => 'Hybrid Maize', 'days' => 120],
            ['name' => 'Soybeans', 'cat' => 'Legume', 'desc' => 'High Protein Soy', 'days' => 90],
            ['name' => 'Wheat', 'cat' => 'Cereal', 'desc' => 'Hard Wheat', 'days' => 110],
            ['name' => 'Sunflower', 'cat' => 'Oilseed', 'desc' => 'Oil Sunflower', 'days' => 100],
        ];
        foreach ($cropData as $data) {
            $crops[] = Crop::create([
                'name' => $data['name'], 
                'category' => $data['cat'], 
                'description' => $data['desc'], 
                'maturity_days' => $data['days']
            ]);
        }

        // 6. AGRONOMY DATA
        foreach ($fields as $field) {
            $crop = $crops[array_rand($crops)];
            $planting = Planting::create([
                'field_id' => $field->id,
                'crop_id' => $crop->id,
                'planting_date' => Carbon::now()->subMonths(4),
                'expected_harvest_date' => Carbon::now()->addMonths(2),
            ]);

            DB::table('crop_productions')->insert([
                'field_id' => $field->id, 'crop_type' => $crop->name, 'quantity' => rand(1000, 5000),
                'unit' => 'kg', 'harvest_date' => Carbon::now()->subMonth(), 'quality_grade' => 'A',
                'created_at' => now(), 'updated_at' => now()
            ]);

            DB::table('scouting_records')->insert([
                'field_id' => $field->id, 'scouting_date' => Carbon::now()->subDays(rand(1, 10)),
                'pest_disease_name' => 'Fall Armyworm', 'type' => 'Pest', 'severity' => 'Medium',
                'affected_area' => rand(1, 5), 'notes' => 'Found in North-East corner',
                'created_at' => now(), 'updated_at' => now()
            ]);

            DB::table('spraying_schedules')->insert([
                'field_id' => $field->id, 'pest_disease_name' => 'Fall Armyworm', 'treatment' => 'Chemical Spray A',
                'spraying_date' => Carbon::now()->addDays(2), 'status' => 'scheduled',
                'created_at' => now(), 'updated_at' => now()
            ]);

            YieldRecord::create([
                'field_id' => $field->id, 'harvest_date' => Carbon::now()->subMonth(),
                'quantity' => rand(2000, 8000), 'unit' => 'kg',
            ]);
        }

        // 7. Livestock & Equipment
        $livestock = [];
        $livestockTypes = ['Bovine', 'Caprine', 'Porcine'];
        foreach ($livestockTypes as $type) {
            for ($i = 0; $i < 5; $i++) {
                $livestock[] = Livestock::create([
                    'farm_id' => $farm->id,
                    'tag_number' => $type . '-' . (1000 + count($livestock)),
                    'species' => $type,
                    'breed' => 'Standard',
                    'sex' => $i % 2 ? 'Female' : 'Male',
                    'birth_date' => Carbon::now()->subMonths(rand(12, 60))->toDateString(),
                    'status' => 'Active',
                    'current_weight_kg' => rand(80, 520),
                    'head_count' => $type === 'Porcine' ? rand(1, 3) : 1,
                ]);
            }
        }
        foreach (array_slice($livestock, 0, 6) as $animal) {
            DB::table('livestock_vaccinations')->insert([
                'livestock_id' => $animal->id, 'vaccine_name' => 'Annual Preventive Care',
                'date_administered' => Carbon::now()->subMonths(2)->toDateString(),
                'next_due_date' => Carbon::now()->addMonths(10)->toDateString(),
                'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('livestock_health_records')->insert([
                'livestock_id' => $animal->id, 'condition' => 'Routine check',
                'treatment' => 'Observation and supplements', 'date_recorded' => Carbon::now()->subDays(12)->toDateString(),
                'withdrawal_days' => 0, 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('livestock_weight_records')->insert([
                'livestock_id' => $animal->id, 'weight_kg' => rand(90, 500),
                'date_recorded' => Carbon::now()->subDays(20)->toDateString(), 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('livestock_production_records')->insert([
                'livestock_id' => $animal->id, 'product' => $animal->species === 'Bovine' ? 'Milk' : 'Meat',
                'quantity' => rand(10, 80), 'unit' => 'kg', 'date_recorded' => Carbon::now()->subDays(5)->toDateString(),
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        DB::table('livestock_breeding_records')->insert([
            'livestock_id' => $livestock[1]->id, 'breeding_date' => Carbon::now()->subMonths(2)->toDateString(),
            'expected_birth_date' => Carbon::now()->addMonths(7)->toDateString(), 'offspring_count' => 1,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $equipments = [];
        $equipTypes = ['Tractor', 'Combine Harvester', 'Irrigation Pump', 'Drone'];
        foreach ($equipTypes as $type) {
            $equipments[] = Equipment::create([
                'farm_id' => $farm->id, 'name' => $type, 'type' => strtolower(str_replace(' ', '_', $type)),
                'serial_number' => 'SN-' . strtoupper(substr(md5($type), 0, 8)),
                'purchase_date' => Carbon::now()->subYears(rand(1, 4))->toDateString(),
                'purchase_cost' => rand(15000, 80000), 'status' => 'available', 'notes' => 'Demo equipment record',
            ]);
        }
        foreach ($equipments as $equipment) {
            DB::table('equipment_maintenance_records')->insert([
                'equipment_id' => $equipment->id, 'type' => 'routine', 'description' => 'Scheduled service',
                'cost' => rand(500, 3000), 'maintenance_date' => Carbon::now()->subDays(30)->toDateString(),
                'next_service_date' => Carbon::now()->addMonths(3)->toDateString(), 'recorded_by' => $manager->id,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('equipment_fuel_logs')->insert([
                'equipment_id' => $equipment->id, 'log_date' => Carbon::now()->subDays(4)->toDateString(),
                'litres' => rand(20, 120), 'cost' => rand(400, 2500), 'hours_reading' => rand(100, 900),
                'recorded_by' => $worker->id, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        // 8. FINANCE
        Budget::create(['farm_id' => $farm->id, 'year' => 2026, 'total_amount' => 100000, 'spent_amount' => 45000]);

        $technicalCats = ['input_cost', 'labour_cost', 'fuel_cost', 'equipment_cost'];
        foreach ($technicalCats as $cat) {
            for($i=0; $i<5; $i++) {
                DB::table('financial_transactions')->insert([
                    'farm_id' => $farm->id, 'amount' => rand(1000, 5000), 'type' => 'expense',
                    'category' => $cat, 'transaction_date' => Carbon::now()->subDays(rand(1, 60)),
                    'description' => "Expenditure for $cat", 'created_at' => now(), 'updated_at' => now()
                ]);
            }
        }
        for($i=0; $i<5; $i++) {
            DB::table('financial_transactions')->insert([
                'farm_id' => $farm->id, 'amount' => rand(15000, 25000), 'type' => 'income',
                'category' => 'Sales', 'transaction_date' => Carbon::now()->subDays(rand(1, 30)),
                'description' => "Sale of Harvest", 'created_at' => now(), 'updated_at' => now()
            ]);
        }

        // 9. Procurement
        $suppliers = [];
        $supNames = ['AgriCorp Global', 'FarmSupply Ltd', 'BioSeeds Inc', 'Global Agro'];
        foreach ($supNames as $name) {
            $suppliers[] = Supplier::create(['farm_id' => $farm->id, 'name' => $name, 'contact_email' => 'sales@'.$name.'.com']);
        }
        foreach ($suppliers as $sup) {
            $po = PurchaseOrder::create(['farm_id' => $farm->id, 'supplier_id' => $sup->id, 'order_number' => 'PO-'.rand(1000,9999), 'order_date' => Carbon::now()->subDays(rand(10,90)), 'approval_status' => 'Approved', 'fulfillment_status' => 'Received']);
            PurchaseOrderItem::create(['purchase_order_id' => $po->id, 'item_name' => 'Bulk Fertilizer', 'quantity' => rand(1,20), 'unit_price' => 150]);
            DB::table('supplier_quotations')->insert([
                'supplier_id' => $sup->id, 'item_name' => 'Hybrid seed and fertilizer pack',
                'quoted_price' => rand(120, 450), 'unit' => 'bag',
                'quotation_date' => Carbon::now()->subDays(15)->toDateString(),
                'valid_until' => Carbon::now()->addDays(30)->toDateString(),
                'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('purchase_payments')->insert([
                'purchase_order_id' => $po->id, 'amount_paid' => rand(500, 3000),
                'payment_date' => Carbon::now()->subDays(5)->toDateString(),
                'payment_method' => 'Bank Transfer', 'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        // 10. Sales
        $customers = [];
        $custNames = ['City Markets', 'Regional Export Co', 'Local Coop', 'Prime Foods'];
        foreach ($custNames as $name) {
            $customers[] = Customer::create(['farm_id' => $farm->id, 'name' => $name, 'contact_email' => 'info@'.$name.'.com']);
        }
        foreach ($customers as $cust) {
            $so = SalesOrder::create(['farm_id' => $farm->id, 'customer_id' => $cust->id, 'order_number' => 'SO-'.rand(1000,9999), 'order_date' => Carbon::now()->subDays(rand(1,30)), 'status' => 'Paid']);
            SalesOrderItem::create(['sales_order_id' => $so->id, 'crop_name' => $crops[0]->name, 'quantity' => rand(100,1000), 'unit_price' => 25]);
            $amount = rand(10000, 30000);
            $invoice = DB::table('invoices')->insertGetId([
                'sales_order_id' => $so->id, 'invoice_number' => 'INV-' . $so->id . '-' . rand(100, 999),
                'total_amount' => $amount, 'due_date' => Carbon::now()->addDays(14)->toDateString(),
                'status' => 'Paid', 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('payments')->insert([
                'invoice_id' => $invoice, 'amount_paid' => $amount,
                'payment_date' => Carbon::now()->subDays(2)->toDateString(),
                'payment_method' => 'Mobile Money', 'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        // 11. Market, field operations, irrigation and storage
        foreach ($crops as $crop) {
            DB::table('market_prices')->insert([
                'farm_id' => $farm->id, 'crop_name' => $crop->name, 'price_per_unit' => rand(8, 35),
                'unit' => 'kg', 'market_destination' => 'Lusaka Central Market',
                'recorded_date' => Carbon::now()->subDays(rand(1, 20))->toDateString(),
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        foreach ($fields as $index => $field) {
            $planting = Planting::where('field_id', $field->id)->first();
            DB::table('crop_monitorings')->insert([
                'planting_id' => $planting->id, 'monitoring_date' => Carbon::now()->subDays(3)->toDateString(),
                'growth_stage' => 'Flowering', 'plant_height' => rand(40, 180),
                'health_status' => 'Healthy', 'estimated_yield' => rand(2500, 7000),
                'notes' => 'Routine crop monitoring completed.', 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('outbreak_alerts')->insert([
                'field_id' => $field->id, 'pest_disease_name' => 'Fall Armyworm',
                'alert_date' => Carbon::now()->subDays(8)->toDateString(), 'severity' => $index % 2 ? 'medium' : 'high',
                'description' => 'Routine scouting alert for demonstration data.', 'status' => $index % 2 ? 'resolved' : 'active',
                'notes' => 'Monitor field and follow treatment plan.', 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('harvest_schedules')->insert([
                'field_id' => $field->id, 'harvest_date' => Carbon::now()->addDays(rand(10, 45))->toDateString(),
                'start_time' => '07:00:00', 'estimated_quantity' => rand(1000, 5000), 'unit' => 'kg',
                'status' => 'scheduled', 'notes' => 'Planned harvest window.', 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('post_harvest_handlings')->insert([
                'field_id' => $field->id, 'handling_date' => Carbon::now()->subDays(6)->toDateString(),
                'storage_method' => 'Dry storage', 'storage_location' => 'Main Warehouse',
                'quantity' => rand(500, 2500), 'unit' => 'kg', 'condition' => 'Good',
                'loss_quantity' => rand(0, 40), 'notes' => 'Quality inspection completed.',
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        $waterSources = [];
        foreach (['North Borehole', 'Central Reservoir', 'East River Intake'] as $name) {
            $waterSources[] = DB::table('water_sources')->insertGetId([
                'farm_id' => $farm->id, 'name' => $name, 'type' => 'Borehole',
                'location' => 'Horizon Farm', 'capacity' => rand(50000, 250000),
                'status' => 'active', 'notes' => 'Primary irrigation source.',
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        foreach ($fields as $index => $field) {
            $sourceId = $waterSources[$index % count($waterSources)];
            DB::table('irrigation_schedules')->insert([
                'field_id' => $field->id, 'water_source_id' => $sourceId,
                'irrigation_date' => Carbon::now()->addDays($index + 1)->toDateString(),
                'start_time' => '05:30:00', 'duration_minutes' => 90,
                'water_quantity' => rand(500, 1500), 'unit' => 'litres',
                'status' => 'scheduled', 'notes' => 'Early morning irrigation.',
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        foreach ($waterSources as $sourceId) {
            DB::table('pump_monitorings')->insert([
                'water_source_id' => $sourceId, 'monitoring_date' => Carbon::now()->subDays(2)->toDateString(),
                'status' => 'operational', 'operating_hours' => rand(2, 10),
                'flow_rate' => rand(100, 400), 'notes' => 'Pump operating normally.',
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        $storage = DB::table('storage_facilities')->insertGetId([
            'farm_id' => $farm->id, 'name' => 'Main Grain Warehouse', 'facility_type' => 'Warehouse',
            'capacity' => 50000, 'capacity_unit' => 'kg', 'current_temperature_c' => 22,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $storedProduce = DB::table('stored_produce')->insertGetId([
            'storage_facility_id' => $storage, 'crop_name' => $crops[0]->name,
            'quantity' => 12500, 'unit' => 'kg', 'grade' => 'Grade A', 'quality_status' => 'Good',
            'date_stored' => Carbon::now()->subDays(12)->toDateString(), 'valuation_amount' => 312500,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('stock_movements')->insert([
            'stored_produce_id' => $storedProduce, 'movement_type' => 'Stock In',
            'quantity' => 12500, 'movement_date' => Carbon::now()->subDays(12)->toDateString(),
            'notes' => 'Harvest received into storage.', 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('dispatch_records')->insert([
            'stored_produce_id' => $storedProduce, 'quantity_dispatched' => 500,
            'destination' => 'City Markets', 'dispatch_date' => Carbon::now()->subDays(2)->toDateString(),
            'status' => 'Delivered', 'created_at' => now(), 'updated_at' => now(),
        ]);
        foreach ([
            ['name' => 'Hybrid Maize Seed', 'category' => 'seeds', 'unit' => 'bags', 'quantity' => 80, 'minimum_stock' => 20, 'unit_cost' => 450, 'expiry_date' => Carbon::now()->addMonths(18)],
            ['name' => 'NPK Fertilizer', 'category' => 'fertilizer', 'unit' => 'bags', 'quantity' => 12, 'minimum_stock' => 20, 'unit_cost' => 680, 'expiry_date' => Carbon::now()->addMonths(24)],
            ['name' => 'Crop Protection Spray', 'category' => 'chemical', 'unit' => 'litres', 'quantity' => 35, 'minimum_stock' => 10, 'unit_cost' => 95, 'expiry_date' => Carbon::now()->addMonths(6)],
            ['name' => 'Diesel Fuel', 'category' => 'fuel', 'unit' => 'litres', 'quantity' => 420, 'minimum_stock' => 100, 'unit_cost' => 28, 'expiry_date' => null],
        ] as $resourceData) {
            $resourceId = DB::table('resources')->insertGetId([
                'farm_id' => $farm->id, 'field_id' => $fields[array_rand($fields)]->id,
                ...$resourceData, 'expiry_date' => $resourceData['expiry_date']?->toDateString(),
                'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('resource_transactions')->insert([
                'resource_id' => $resourceId, 'type' => 'stock_in', 'quantity' => $resourceData['quantity'],
                'unit_cost' => $resourceData['unit_cost'], 'reason' => 'Opening balance',
                'recorded_by' => $manager->id, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        foreach ($employees as $index => $employee) {
            DB::table('daily_tasks')->insert([
                'employee_id' => $employee->id, 'field_id' => $fields[$index % count($fields)]->id,
                'task_description' => ['Inspect irrigation lines', 'Apply fertilizer', 'Record crop growth', 'Update expense ledger'][$index],
                'hours_worked' => rand(2, 8), 'status' => ['pending', 'in_progress', 'completed', 'completed'][$index],
                'date' => Carbon::now()->subDays($index)->toDateString(), 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        foreach (['Seeds', 'Fertilizer', 'Fuel', 'Labour', 'Maintenance'] as $category) {
            DB::table('farm_expenses')->insert([
                'farm_id' => $farm->id, 'category' => $category, 'amount' => rand(1200, 18000),
                'description' => "Demo {$category} expense", 'expense_date' => Carbon::now()->subDays(rand(1, 45))->toDateString(),
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        // 12. Notifications and alert rules
        $notificationData = [
            ['user_id' => $admin->id, 'farm_id' => $farm->id, 'type' => 'Alert', 'title' => 'System Alert', 'message' => 'System update completed successfully.', 'priority' => 'Low'],
            ['user_id' => $owner->id, 'farm_id' => $farm->id, 'type' => 'Alert', 'title' => 'Budget Warning', 'message' => 'Monthly expenditure has exceeded 80% of budget.', 'priority' => 'High'],
            ['user_id' => $agronomist->id, 'farm_id' => $farm->id, 'type' => 'Pest', 'title' => 'Outbreak Detected', 'message' => 'Fall Armyworm detected in North Sector A.', 'priority' => 'Urgent'],
            ['user_id' => $worker->id, 'farm_id' => $farm->id, 'type' => 'Task', 'title' => 'New Task', 'message' => 'Spraying schedule for North Sector A started.', 'priority' => 'Normal'],
            ['user_id' => $accountant->id, 'farm_id' => $farm->id, 'type' => 'Payment', 'title' => 'Payment Received', 'message' => 'Payment of ZMW 15,000 received from City Markets.', 'priority' => 'Normal'],
        ];
        foreach ($notificationData as $nd) {
            DB::table('notifications')->insert($nd);
        }
        foreach ([
            [$owner->id, 'farm.viewed', 'GET', '/api/farms', 200],
            [$manager->id, 'task.created', 'POST', '/api/daily-tasks', 201],
            [$agronomist->id, 'crop.monitoring.created', 'POST', '/api/crop-monitoring', 201],
            [$accountant->id, 'expense.viewed', 'GET', '/api/farm-expenses', 200],
        ] as [$userId, $eventType, $method, $route, $statusCode]) {
            DB::table('audit_logs')->insert([
                'user_id' => $userId, 'event_type' => $eventType, 'route' => $route,
                'method' => $method, 'status_code' => $statusCode, 'ip_address' => '127.0.0.1',
                'user_agent' => 'ComprehensiveDemoSeeder', 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        foreach (['low_stock', 'maintenance_due', 'harvest_due', 'task_overdue'] as $type) {
            DB::table('alert_rules')->insert([
                'farm_id' => $farm->id, 'user_id' => $owner->id, 'type' => $type,
                'trigger_condition' => 'automatic', 'threshold' => rand(1, 14),
                'priority' => $type === 'low_stock' ? 'High' : 'Normal',
                'is_active' => true, 'last_run_at' => Carbon::now()->subDay(),
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }
}
