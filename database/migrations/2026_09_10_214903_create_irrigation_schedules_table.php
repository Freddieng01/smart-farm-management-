<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('irrigation_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('field_id')->constrained('fields')->cascadeOnDelete();
            $table->foreignId('water_source_id')->constrained('water_sources')->cascadeOnDelete();
            $table->date('irrigation_date');
            $table->time('start_time')->nullable();
            $table->decimal('duration_minutes', 10, 2)->nullable();
            $table->decimal('water_quantity', 12, 2)->nullable();
            $table->string('unit')->nullable();
            $table->string('status')->default('scheduled');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('irrigation_schedules');
    }
};