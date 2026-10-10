<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crop_monitorings', function (Blueprint $table) {
            $table->id();

            $table->foreignId('planting_id')
                ->constrained('plantings')
                ->cascadeOnDelete();

            $table->date('monitoring_date');
            $table->string('growth_stage')->nullable();
            $table->decimal('plant_height', 10, 2)->nullable();
            $table->string('health_status')->nullable();
            $table->decimal('estimated_yield', 12, 2)->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crop_monitorings');
    }
};
