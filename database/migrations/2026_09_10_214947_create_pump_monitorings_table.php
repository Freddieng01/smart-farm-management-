<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pump_monitorings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('water_source_id')->constrained('water_sources')->cascadeOnDelete();
            $table->date('monitoring_date');
            $table->string('status')->default('operational');
            $table->decimal('operating_hours', 10, 2)->nullable();
            $table->decimal('flow_rate', 12, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pump_monitorings');
    }
};