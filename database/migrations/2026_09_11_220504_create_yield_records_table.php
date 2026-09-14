<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('yield_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('field_id')->constrained('fields')->cascadeOnDelete();
            $table->date('harvest_date');
            $table->decimal('quantity', 12, 2);
            $table->string('unit');
            $table->string('quality_grade')->nullable();
            $table->decimal('moisture_percentage', 5, 2)->nullable();
            $table->decimal('loss_quantity', 12, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('yield_records');
    }
};