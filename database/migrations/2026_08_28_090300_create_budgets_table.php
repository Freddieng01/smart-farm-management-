<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->string('category', 50);
            $table->date('period_start');
            $table->date('period_end');
            $table->decimal('planned_amount', 12, 2);
            $table->timestamps();

            $table->index(['farm_id', 'category', 'period_start']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budgets');
    }
};
