<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Employees are paid per hour, so the hours on a task come from a real clock:
 * Start begins timing, Pause/Resume stop and restart it, Finish closes the task.
 *
 *  started_at     first time the employee pressed Start
 *  running_since  set while the clock is running, empty while paused or finished
 *  worked_seconds time already banked from earlier runs
 *  completed_at   when the employee pressed Finish
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_tasks', function (Blueprint $table) {
            $table->timestamp('started_at')->nullable()->after('date');
            $table->timestamp('running_since')->nullable()->after('started_at');
            $table->unsignedInteger('worked_seconds')->default(0)->after('running_since');
            $table->timestamp('completed_at')->nullable()->after('worked_seconds');
        });
    }

    public function down(): void
    {
        Schema::table('daily_tasks', function (Blueprint $table) {
            $table->dropColumn(['started_at', 'running_since', 'worked_seconds', 'completed_at']);
        });
    }
};
