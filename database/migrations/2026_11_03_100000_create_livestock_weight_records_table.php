<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('livestock_weight_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('livestock_id')->constrained('livestock')->cascadeOnDelete();
            $table->decimal('weight_kg', 8, 2);
            $table->date('date_recorded');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('livestock_weight_records');
    }
};
