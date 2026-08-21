<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->string('name');
            $table->string('soil_type')->nullable();
            $table->decimal('size_hectares', 12, 2)->default(0);
            $table->timestamps();

            $table->unique(['farm_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fields');
    }
};
