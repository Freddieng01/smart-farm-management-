<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $ownerId = DB::table('users')->where('role', 'Farm-owner')->value('id');

        if ($ownerId) {
            DB::table('farms')->whereNull('owner_id')->update(['owner_id' => $ownerId]);
        }
    }

    public function down(): void
    {
        // Ownership assignments are retained when this data migration is rolled back.
    }
};
