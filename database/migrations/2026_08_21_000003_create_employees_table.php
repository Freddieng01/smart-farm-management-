<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->string('task_assignment')->nullable();
            $table->decimal('hourly_rate', 10, 2)->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'farm_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
