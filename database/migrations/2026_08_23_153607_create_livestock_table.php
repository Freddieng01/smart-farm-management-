<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('livestock', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->onDelete('cascade');
            $table->string('tag_number')->unique(); // animal identification
            $table->string('species'); // e.g. Cattle, Goat, Poultry
            $table->string('breed')->nullable();
            $table->enum('sex', ['Male', 'Female']);
            $table->date('birth_date')->nullable();
            $table->date('death_date')->nullable();
            $table->string('status')->default('Active'); // Active, Sold, Deceased
            $table->decimal('current_weight_kg', 8, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('livestock_vaccinations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('livestock_id')->constrained('livestock')->onDelete('cascade');
            $table->string('vaccine_name');
            $table->date('date_administered');
            $table->date('next_due_date')->nullable();
            $table->timestamps();
        });

        Schema::create('livestock_health_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('livestock_id')->constrained('livestock')->onDelete('cascade');
            $table->string('condition'); // disease/injury name
            $table->text('treatment')->nullable();
            $table->date('date_recorded');
            $table->timestamps();
        });

        Schema::create('livestock_breeding_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('livestock_id')->constrained('livestock')->onDelete('cascade');
            $table->date('breeding_date');
            $table->date('expected_birth_date')->nullable();
            $table->integer('offspring_count')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('livestock_breeding_records');
        Schema::dropIfExists('livestock_health_records');
        Schema::dropIfExists('livestock_vaccinations');
        Schema::dropIfExists('livestock');
    }
};