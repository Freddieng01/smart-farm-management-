<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('storage_facilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->string('name');
            $table->string('facility_type')->default('Warehouse'); // Warehouse, Cold Storage
            $table->decimal('capacity', 12, 2)->nullable();
            $table->string('capacity_unit')->default('kg');
            $table->decimal('current_temperature_c', 5, 2)->nullable(); // relevant for cold storage
            $table->timestamps();

            $table->unique(['farm_id', 'name']);
        });

        Schema::create('stored_produce', function (Blueprint $table) {
            $table->id();
            $table->foreignId('storage_facility_id')->constrained('storage_facilities')->cascadeOnDelete();
            $table->string('crop_name');
            $table->decimal('quantity', 10, 2);
            $table->string('unit')->default('kg');
            $table->string('grade')->nullable(); // e.g. Grade A, B, C
            $table->string('quality_status')->default('Good'); // Good, Fair, Spoiled
            $table->date('date_stored');
            $table->decimal('valuation_amount', 12, 2)->nullable(); // inventory valuation
            $table->timestamps();
        });

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stored_produce_id')->constrained('stored_produce')->cascadeOnDelete();
            $table->string('movement_type'); // Stock In, Stock Out, Transfer
            $table->decimal('quantity', 10, 2);
            $table->date('movement_date');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('dispatch_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stored_produce_id')->constrained('stored_produce')->cascadeOnDelete();
            $table->decimal('quantity_dispatched', 10, 2);
            $table->string('destination')->nullable();
            $table->date('dispatch_date');
            $table->string('status')->default('Dispatched'); // Dispatched, Delivered
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dispatch_records');
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('stored_produce');
        Schema::dropIfExists('storage_facilities');
    }
};