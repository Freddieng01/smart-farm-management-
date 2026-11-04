<?php

use App\Models\Employee;
use App\Models\Farm;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $farmId = Farm::query()->value('id');

        if (! $farmId) {
            return;
        }

        User::query()
            ->whereIn('role', ['Manager', 'Agronomist', 'Accountant', 'Worker'])
            ->get()
            ->each(function (User $user) use ($farmId): void {
                $hasFarmAccess = DB::table('employees')->where('user_id', $user->id)->exists()
                    || DB::table('farms')->where('owner_id', $user->id)->exists();

                if (! $hasFarmAccess) {
                    Employee::create([
                        'user_id' => $user->id,
                        'farm_id' => $farmId,
                        'task_assignment' => 'General',
                        'hourly_rate' => 0,
                    ]);
                }
            });
    }

    public function down(): void
    {
        // Farm assignments are user data and must not be removed on rollback.
    }
};
