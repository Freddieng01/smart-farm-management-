<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plantings', function (Blueprint $table) {
            $table->id();

            $table->foreignId('field_id')
                ->constrained('fields')
                ->cascadeOnDelete();

            $table->foreignId('crop_id')
                ->constrained('crops')
                ->cascadeOnDelete();

            $table->date('planting_date');
            $table->date('expected_harvest_date')->nullable();

            $table->decimal('quantity_planted', 12, 2)->nullable();
            $table->string('unit')->nullable();

            $table->enum('status', [
                'planned',
                'planted',
                'growing',
                'harvested',
                'failed'
            ])->default('planned');

            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plantings');
    }
};