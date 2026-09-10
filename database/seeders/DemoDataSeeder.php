<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Farm;
use App\Models\Field;
use App\Models\Employee;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create Demo Admin User
        $admin = User::updateOrCreate(
            ['email' => 'admin@ffms.com'],
            [
                'name' => 'System Admin',
                'password' => Hash::make('password123'),
                'role' => 'Admin',
            ]
        );

        // 2. Create Sample Farm
        $farm = Farm::updateOrCreate(
            ['name' => 'Green Valley Estate'],
            [
                'location_gps' => '-15.4167, 28.2833',
                'total_acreage' => 150.50,
            ]
        );

        // 3. Create Sample Fields
        Field::updateOrCreate(
            ['farm_id' => $farm->id, 'name' => 'North Field - Maize'],
            [
                'soil_type' => 'Clay Loam',
                'size_hectares' => 50.00,
            ]
        );

        Field::updateOrCreate(
            ['farm_id' => $farm->id, 'name' => 'South Field - Soybeans'],
            [
                'soil_type' => 'Sandy Loam',
                'size_hectares' => 35.25,
            ]
        );

        // 4. Create Demo Worker Account & Employee Record
        $workerUser = User::updateOrCreate(
            ['email' => 'john@ffms.com'],
            [
                'name' => 'John Banda',
                'password' => Hash::make('password123'),
                'role' => 'Worker',
            ]
        );

        Employee::updateOrCreate(
            ['user_id' => $workerUser->id],
            [
                'farm_id' => $farm->id,
                'task_assignment' => 'Irrigation Operator',
                'hourly_rate' => 25.00,
            ]
        );
    }
}
