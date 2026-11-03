<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Pedigree: each animal can point to its sire (father) and dam (mother).
        Schema::table('livestock', function (Blueprint $table) {
            $table->foreignId('sire_id')->nullable()->after('head_count')->constrained('livestock')->nullOnDelete();
            $table->foreignId('dam_id')->nullable()->after('sire_id')->constrained('livestock')->nullOnDelete();
        });

        // Treatment withdrawal: days after treatment before milk/meat can be sold.
        Schema::table('livestock_health_records', function (Blueprint $table) {
            $table->unsignedSmallInteger('withdrawal_days')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('livestock_health_records', function (Blueprint $table) {
            $table->dropColumn('withdrawal_days');
        });

        Schema::table('livestock', function (Blueprint $table) {
            $table->dropConstrainedForeignId('dam_id');
            $table->dropConstrainedForeignId('sire_id');
        });
    }
};
