<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pest and disease records (scouting, spraying, outbreak alerts) used to belong
 * only to a field. They can now also belong to one planted crop, so each
 * planting's profile shows its own pests and diseases.
 *
 * planting_id is optional, so every existing record keeps working untouched.
 * Each column is guarded so running this twice can never fail.
 */
return new class extends Migration
{
    private array $tables = ['scouting_records', 'spraying_schedules', 'outbreak_alerts'];

    public function up(): void
    {
        foreach ($this->tables as $name) {
            if (! Schema::hasTable($name) || Schema::hasColumn($name, 'planting_id')) {
                continue;
            }

            Schema::table($name, function (Blueprint $table) {
                $table->foreignId('planting_id')->nullable()->constrained('plantings')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $name) {
            if (Schema::hasTable($name) && Schema::hasColumn($name, 'planting_id')) {
                Schema::table($name, function (Blueprint $table) {
                    $table->dropConstrainedForeignId('planting_id');
                });
            }
        }
    }
};
