<?php

namespace Tests\Feature;

use App\Models\DailyTask;
use App\Models\Employee;
use App\Models\Farm;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Employees are paid per hour, so the hours must come from a real, single clock. */
class TaskClockTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private User $workerUser;

    private Employee $worker;

    private Farm $farm;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = $this->makeUser(['role' => 'Farm-owner']);
        $this->farm = Farm::create(['name' => 'Owner Farm', 'total_acreage' => 10, 'owner_id' => $this->owner->id]);
        $this->workerUser = $this->makeUser(['role' => 'Worker', 'name' => 'Wanga']);
        $this->worker = Employee::create(['user_id' => $this->workerUser->id, 'farm_id' => $this->farm->id, 'hourly_rate' => 20]);
    }

    private function task(array $overrides = []): DailyTask
    {
        return DailyTask::create(array_merge([
            'employee_id' => $this->worker->id,
            'task_description' => 'Weed the maize',
            'hours_worked' => 0,
            'status' => 'pending',
            'date' => now()->toDateString(),
        ], $overrides));
    }

    public function test_pressing_start_moves_the_job_to_in_progress_and_starts_the_clock(): void
    {
        $task = $this->task();
        Sanctum::actingAs($this->workerUser);

        $this->postJson("/api/daily-tasks/{$task->id}/start")->assertOk()
            ->assertJsonPath('data.status', 'in_progress')
            ->assertJsonPath('data.is_running', true);

        $this->assertNotNull($task->fresh()->started_at);
    }

    public function test_finish_saves_the_hours_from_the_clock(): void
    {
        $task = $this->task();
        Sanctum::actingAs($this->workerUser);
        $this->postJson("/api/daily-tasks/{$task->id}/start")->assertOk();

        // pretend the worker has been going for 90 minutes
        $task->refresh()->forceFill(['running_since' => now()->subMinutes(90)])->save();

        $this->postJson("/api/daily-tasks/{$task->id}/finish")->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.is_running', false);

        $this->assertEquals(1.5, (float) $task->fresh()->hours_worked);
    }

    public function test_pause_keeps_the_time_so_far_and_resume_carries_on(): void
    {
        $task = $this->task();
        Sanctum::actingAs($this->workerUser);
        $this->postJson("/api/daily-tasks/{$task->id}/start")->assertOk();
        $task->refresh()->forceFill(['running_since' => now()->subHour()])->save();

        $this->postJson("/api/daily-tasks/{$task->id}/pause")->assertOk()->assertJsonPath('data.is_running', false);
        $this->assertEquals(1.0, (float) $task->fresh()->hours_worked);

        $this->postJson("/api/daily-tasks/{$task->id}/start")->assertOk()->assertJsonPath('data.is_running', true);
    }

    public function test_only_one_task_per_employee_can_run_at_a_time(): void
    {
        $first = $this->task();
        $second = $this->task(['task_description' => 'Spray the beans']);
        Sanctum::actingAs($this->workerUser);

        $this->postJson("/api/daily-tasks/{$first->id}/start")->assertOk();
        $this->postJson("/api/daily-tasks/{$second->id}/start")->assertUnprocessable();
    }

    public function test_a_task_cannot_be_started_twice_or_finished_without_starting(): void
    {
        $task = $this->task();
        Sanctum::actingAs($this->workerUser);

        $this->postJson("/api/daily-tasks/{$task->id}/finish")->assertUnprocessable();
        $this->postJson("/api/daily-tasks/{$task->id}/start")->assertOk();
        $this->postJson("/api/daily-tasks/{$task->id}/start")->assertUnprocessable();
    }

    public function test_a_worker_cannot_run_someone_elses_clock(): void
    {
        $otherUser = $this->makeUser(['role' => 'Worker', 'name' => 'Other']);
        Employee::create(['user_id' => $otherUser->id, 'farm_id' => $this->farm->id, 'hourly_rate' => 15]);
        $task = $this->task();

        Sanctum::actingAs($otherUser);
        $this->postJson("/api/daily-tasks/{$task->id}/start")->assertForbidden();
    }

    public function test_workers_cannot_assign_or_edit_tasks_or_their_hours(): void
    {
        $task = $this->task();
        Sanctum::actingAs($this->workerUser);

        $this->putJson("/api/daily-tasks/{$task->id}", ['hours_worked' => 99])->assertForbidden();
        $this->postJson('/api/daily-tasks', [
            'employee_id' => $this->worker->id,
            'task_description' => 'Self assigned',
            'hours_worked' => 8,
            'status' => 'completed',
            'date' => now()->toDateString(),
        ])->assertForbidden();
    }

    public function test_the_owner_can_assign_a_task_and_see_the_employee_profile(): void
    {
        Sanctum::actingAs($this->owner);

        $this->postJson('/api/daily-tasks', [
            'employee_id' => $this->worker->id,
            'task_description' => 'Irrigate block A',
            'hours_worked' => 0,
            'status' => 'pending',
            'date' => now()->toDateString(),
        ])->assertCreated();

        $this->task(['hours_worked' => 3, 'status' => 'completed', 'worked_seconds' => 10800]);

        $this->getJson("/api/employees/{$this->worker->id}")->assertOk()
            ->assertJsonPath('stats.hours_total', 3)
            ->assertJsonPath('stats.earned_total', 60)
            ->assertJsonPath('stats.tasks_open', 1);
    }
}
