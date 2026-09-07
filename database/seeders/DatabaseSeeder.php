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
    }
}
