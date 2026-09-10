<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@ffms.com'],
            [
                'name' => 'System Admin',
                'password' => Hash::make('password123'),
                'role' => 'Admin',
            ]
        );

        User::updateOrCreate(
            ['email' => 'worker@ffms.com'],
            [
                'name' => 'Demo Worker',
                'password' => Hash::make('password123'),
                'role' => 'Worker',
            ]
        );

        User::updateOrCreate(
            ['email' => 'accountant@ffms.com'],
            [
                'name' => 'Financial Accountant',
                'password' => Hash::make('password123'),
                'role' => 'Accountant',
            ]
        );

        User::updateOrCreate(
            ['email' => 'manager@ffms.com'],
            [
                'name' => 'Farm Manager',
                'password' => Hash::make('password123'),
                'role' => 'Manager',
            ]
        );

        User::updateOrCreate(
            ['email' => 'agronomist@ffms.com'],
            [
                'name' => 'Lead Agronomist',
                'password' => Hash::make('password123'),
                'role' => 'Agronomist',
            ]
        );

        User::updateOrCreate(
            ['email' => 'owner@ffms.com'],
            [
                'name' => 'Farm Owner',
                'password' => Hash::make('password123'),
                'role' => 'Farm-owner',
            ]
        );
    }
}
