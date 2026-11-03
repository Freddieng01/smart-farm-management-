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
use App,Models\Budget;
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
            'sales_order_items', 'sales_orders', 'purchase_order_items', 'purchase_orders',
            'farm_expenses', 'budgets', 'yield_records', 'plantings', 'crops', 'livestock',
            'equipment', 'customers', 'suppliers', 'employees', 'fields', 'farms', 'users',
            'crop_productions', 'scouting_records', 'spraying_schedules', 'outbreak_alerts', 'daily_tasks', 'notifications'
        ];
        foreach ($tables as $table) {
            DB::table($table)->truncate();
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // 1. Users
        $admin = User::create(['name' => 'System Admin', 'email' => 'admin@ffms.com', 'password' => Hash::make('AdminPass123!'), 'role' => 'Admin']);
        $owner = User::create(['name' => 'Farm Owner', 'email' => 'owner@ffms.com', 'password' => Hash::make('OwnerPass123!'), 'role' => 'Farm-owner']);
        $agronomist = User::create(['name' => 'Expert Agronomist', 'email' => 'agronomist@ffms.com', 'password' => Hash::make('AgroPass123!'), 'role' => 'Agronomist']);
        $worker = User::create(['name' => 'Field Worker', 'email' => 'worker@ffms.com', 'password' => Hash::make('WorkerPass123!'), 'role' => 'Worker']);
        $accountant = User::create(['name' => 'Farm Accountant', 'email' => 'accountant@ffms.com', 'password' => Hash::make('AccountPass123!'), 'role' => 'Accountant']);

        // 2. THE ONLY FARM
        $farm = Farm::create([
            'name' => 'Horizon Smart Farm',
            'location_gps' => '-15.4167, 28.2833',
            'total_acreage' => 500,
            'owner_id' => $owner->id
        ]);

        // 3. Fields
        $fields = [];
        $fieldNames = ['North Sector A', 'North Sector B', 'South Plateau', 'East Valley'];
        foreach ($fieldNames as $name) {
            $fields[] = Field::create([
                'farm_id' => $farm->id,
                'name' => $name,
                'soil_type' => 'Loamy',
                'size_hectares' => rand(10, 50),
            ]);
        }

        // 4. Employees
        Employee::create(['user_id' => $agronomist->id, 'farm_id' => $farm->id, 'task_assignment' => 'Crop Specialist', 'hourly_rate' => 50]);
        Employee::create(['user_id' => $worker->id, 'farm_id' => $farm->id, 'task_assignment' => 'General Labor', 'hourly_rate' => 15]);
        Employee::create(['user_id' => $accountant->id, 'farm_id' => $farm->id, 'task_assignment' => 'Financial Controller', 'hourly_rate' => 45]);

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
        $livestockTypes = ['Bovine', 'Caprine', 'Porcine'];
        foreach ($livestockTypes as $type) {
            for ($i = 0; $i < 5; $i++) {
                Livestock::create(['farm_id' => $farm->id, 'tag_number' => $type . '-' . rand(1000, 9999), 'species' => $type, 'breed' => 'Standard', 'sex' => 'Male', 'status' => 'Active']);
            }
        }
        $equipTypes = ['Tractor', 'Combine Harvester', 'Irrigation Pump', 'Drone'];
        foreach ($equipTypes as $type) {
            Equipment::create(['farm_id' => $farm->id, 'name' => $type, 'type' => 'Farm Machinery', 'status' => 'available']);
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
        }

        // 10. Sales
        $customers = [];
        $custNames = ['City Markets', 'Regional Export Co', 'Local Coop', 'Prime Foods'];
        foreach ($custNames as $name) {
            $customers[] = Customer::create(['farm_id' => $farm->id, 'name' => $name, 'contact_email' => 'info@'.$name.'.com']);
        }
        foreach ($customers as $cust) {
            $so = SalesOrder::create(['farm_id' => $farm->id, 'customer_id' => $cust->id, 'order_number' => 'SO-'.rand(1000,9999), 'order_date' => Carbon::now()->subDays(rand(1,30)), 'status' => 'Paid']);
            L_OrderItem::create(['sales_order_id' => $so->id, 'crop_name' => $crops[0]->name, 'quantity' => rand(100,1000), 'unit_price' => 25]);
        }

        // 11. NOTIFICATIONS (FIXED: Now populating actual data)
        $notificationData = [
            ['user_id' => $owner->id, 'farm_id' => $farm->id, 'type' => 'Alert', 'title' => 'Budget Warning', 'message' => 'Monthly expenditure has exceeded 80% of budget.', 'priority' => 'High'],
            ['user_id' => $agronomist->id, 'farm_id' => $farm->id, 'type' => 'Pest', 'title' => 'Outbreak Detected', 'message' => 'Fall Armyworm detected in North Sector A.', 'priority' => 'Urgent'],
            ['user_id' => $worker->id, 'farm_id' => $farm->id, 'type' => 'Task', 'title' => 'New Task', 'message' => 'Spraying schedule for North Sector A started.', 'priority' => 'Normal'],
            ['user_id' => $accountant->id, 'farm_id' => $farm->id, 'type' => 'Payment', 'title' => 'Payment Received', 'message' => 'Payment of ZMW 15,000 received from City Markets.', 'priority' => 'Normal'],
        ];
        foreach ($notificationData as $nd) {
            Notification::create($nd);
        }
    }
}
