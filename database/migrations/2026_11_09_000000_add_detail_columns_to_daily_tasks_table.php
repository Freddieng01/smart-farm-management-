<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Every column is guarded so running this twice (or after a teammate's
        // identical migration) can never fail with "duplicate column".
        Schema::table('daily_tasks', function (Blueprint $table) {
            if (! Schema::hasColumn('daily_tasks', 'priority')) {
                $table->string('priority')->default('normal'); // low, normal, high, urgent
            }
            if (! Schema::hasColumn('daily_tasks', 'due_date')) {
                $table->date('due_date')->nullable();
            }
            if (! Schema::hasColumn('daily_tasks', 'notes')) {
                $table->text('notes')->nullable();
            }
            if (! Schema::hasColumn('daily_tasks', 'started_at')) {
                $table->timestamp('started_at')->nullable();
            }
            if (! Schema::hasColumn('daily_tasks', 'completed_at')) {
                $table->timestamp('completed_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('daily_tasks', function (Blueprint $table) {
            foreach (['priority', 'due_date', 'notes', 'started_at', 'completed_at'] as $column) {
                if (Schema::hasColumn('daily_tasks', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
