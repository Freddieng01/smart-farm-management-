<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment_fuel_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_id')->constrained('equipment')->cascadeOnDelete();
            $table->date('log_date');
            $table->decimal('litres', 10, 2);
            $table->decimal('cost', 12, 2)->default(0);
            $table->decimal('hours_reading', 10, 1)->nullable();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['equipment_id', 'log_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment_fuel_logs');
    }
};