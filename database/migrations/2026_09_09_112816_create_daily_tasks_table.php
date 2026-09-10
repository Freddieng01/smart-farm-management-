<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->foreignId('field_id')->nullable()->constrained()->onDelete('set null');
            $table->string('task_description');
            $table->decimal('hours_worked', 5, 2)->default(0);
            $table->enum('status', ['pending', 'in_progress', 'completed'])->default('pending');
            $table->date('date');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_tasks');
    }
};
