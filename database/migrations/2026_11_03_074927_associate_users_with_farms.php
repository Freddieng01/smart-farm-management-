<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Farm;
use App\Models\Employee;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $farms = Farm::all();
        if ($farms->isEmpty()) {
            return;
        }

        $firstFarmId = $farms->first()->id;

        User::all()->each(function ($user) use ($farms, $firstFarmId) {
            // 1. Check if user already has farm access
            $hasAccess = DB::table('employees')->where('user_id', $user->id)->exists()
                         || DB::table('farms')->where('owner_id', $user->id)->exists();

            if (!$hasAccess) {
                // 2. Associate with a farm based on role
                if ($user->role === 'Farm-owner') {
                    // If they are a Farm-owner but don't own a farm, create one or assign existing
                    // For the sake of this automation, we'll assign them as owner of a new farm
                    // or the first existing farm.
                    DB::table('farms')->where('id', $firstFarmId)->update(['owner_id' => $user->id]);
                } elseif (in_array($user->role, ['Manager', 'Agronomist', 'Accountant', 'Worker'], true)) {
                    // Associate as an employee to the first available farm
                    Employee::create([
                        'user_id' => $user->id,
                        'farm_id' => $firstFarmId,
                        'task_assignment' => 'General',
                        'hourly_rate' => 15.00,
                    ]);
                } else {
                    // Admins don't necessarily need farm association for access,
                    // but we can link them as employees for summary data consistency if desired.
                    // In current logic, Admins see all.
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
