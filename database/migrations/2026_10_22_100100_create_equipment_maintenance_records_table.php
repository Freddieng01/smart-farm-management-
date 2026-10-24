<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment_maintenance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_id')->constrained('equipment')->cascadeOnDelete();
            $table->enum('type', ['routine', 'repair', 'inspection']);
            $table->text('description')->nullable();
            $table->decimal('cost', 12, 2)->default(0);
            $table->date('maintenance_date');
            $table->date('next_service_date')->nullable();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['equipment_id', 'maintenance_date'], 'equip_maint_equip_date_idx');
            $table->index('next_service_date', 'equip_maint_next_service_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment_maintenance_records');
    }
};