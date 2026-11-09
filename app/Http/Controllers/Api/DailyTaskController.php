<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyTask;
use App\Models\Employee;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DailyTaskController extends Controller
{
    public function index(): JsonResponse
    {
        $tasks = DailyTask::with(['employee.user', 'employee.farm:id,name', 'field.farm:id,name'])
            ->latest('date')
            ->paginate(25);

        return response()->json($tasks);
    }

    public function store(Request $request): JsonResponse
    {
        $this->abortUnlessManager($request);

        $validated = $request->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'field_id' => ['nullable', 'exists:fields,id'],
            'task_description' => ['required', 'string', 'max:255'],
            'hours_worked' => ['required', 'numeric', 'min:0'],
            'status' => ['required', 'in:pending,in_progress,completed'],
            'date' => ['required', 'date'],
        ]);

        $task = DailyTask::create($validated);

        return response()->json([
            'message' => 'Task logged successfully.',
            'data' => $task,
        ], 201);
    }

    public function show(DailyTask $dailyTask): JsonResponse
    {
        return response()->json([
            'data' => $dailyTask->load(['employee.user', 'employee.farm:id,name', 'field.farm:id,name']),
        ]);
    }

    public function update(Request $request, DailyTask $dailyTask): JsonResponse
    {
        $this->abortUnlessManager($request);

        $validated = $request->validate([
            'employee_id' => ['sometimes', 'required', 'exists:employees,id'],
            'field_id' => ['sometimes', 'nullable', 'exists:fields,id'],
            'task_description' => ['sometimes', 'required', 'string', 'max:255'],
            'hours_worked' => ['sometimes', 'required', 'numeric', 'min:0'],
            'status' => ['sometimes', 'required', 'in:pending,in_progress,completed'],
            'date' => ['sometimes', 'required', 'date'],
        ]);

        // keep the clock in step when a manager edits by hand
        if (($validated['status'] ?? null) === 'completed' && $dailyTask->running_since) {
            $validated['worked_seconds'] = $dailyTask->elapsed_seconds;
            $validated['running_since'] = null;
            $validated['completed_at'] = now();
        }
        if (array_key_exists('hours_worked', $validated) && ! $dailyTask->running_since) {
            $validated['worked_seconds'] = (int) round($validated['hours_worked'] * 3600);
        }

        $dailyTask->update($validated);

        return response()->json([
            'message' => 'Task updated successfully.',
            'data' => $dailyTask->fresh(['employee.user', 'employee.farm:id,name', 'field.farm:id,name']),
        ]);
    }

    public function destroy(Request $request, DailyTask $dailyTask): JsonResponse
    {
        $this->abortUnlessManager($request);

        $dailyTask->delete();

        return response()->json([
            'message' => 'Task deleted successfully.',
        ]);
    }

    // ---- The employee's clock: Start, Pause, Finish ----------------------------------

    /** Start a task, or resume it after a pause. Moves the job to "in progress". */
    public function start(Request $request, DailyTask $dailyTask): JsonResponse
    {
        return $this->clock($request, $dailyTask, function (DailyTask $task) {
            if ($task->status === 'completed') {
                $this->fail('This task is already finished.');
            }
            if ($task->running_since) {
                $this->fail('This task is already running.');
            }

            $another = DailyTask::where('employee_id', $task->employee_id)
                ->whereNotNull('running_since')
                ->where('id', '!=', $task->id)
                ->first();
            if ($another) {
                // one clock at a time, so the same hour is never paid twice
                $this->fail("Pause or finish \"{$another->task_description}\" first. Only one task can run at a time.");
            }

            $task->forceFill([
                'status' => 'in_progress',
                'started_at' => $task->started_at ?? now(),
                'running_since' => now(),
            ])->save();
        });
    }

    /** Stop the clock for a break. The time so far is kept. */
    public function pause(Request $request, DailyTask $dailyTask): JsonResponse
    {
        return $this->clock($request, $dailyTask, function (DailyTask $task) {
            if (! $task->running_since) {
                $this->fail('This task is not running.');
            }

            $this->bank($task);
            $task->save();
        });
    }

    /** Stop the clock and close the job. Hours worked are set from the clock. */
    public function finish(Request $request, DailyTask $dailyTask): JsonResponse
    {
        return $this->clock($request, $dailyTask, function (DailyTask $task) {
            if ($task->status === 'completed') {
                $this->fail('This task is already finished.');
            }
            if (! $task->started_at) {
                $this->fail('Start the task before finishing it.');
            }

            $this->bank($task);
            $task->forceFill(['status' => 'completed', 'completed_at' => now()])->save();
        });
    }

    /**
     * Runs one clock action on a locked row so a double click can never count
     * the same minutes twice. Workers can only work their own tasks.
     */
    private function clock(Request $request, DailyTask $dailyTask, callable $action): JsonResponse
    {
        $user = $request->user();
        $isManager = in_array($user->role, ['Farm-owner', 'Manager'], true);

        if (! $isManager) {
            $mine = Employee::where('user_id', $user->id)->pluck('id');
            abort_unless($mine->contains($dailyTask->employee_id), 403, 'You can only start, pause or finish tasks assigned to you.');
        }

        $task = DB::transaction(function () use ($dailyTask, $action) {
            $locked = DailyTask::whereKey($dailyTask->id)->lockForUpdate()->firstOrFail();
            $action($locked);

            return $locked;
        });

        return response()->json([
            'message' => 'Task updated.',
            'data' => $task->fresh(['employee.user', 'employee.farm:id,name', 'field.farm:id,name']),
        ]);
    }

    /** Move the running time into worked_seconds and keep hours_worked (used for pay) up to date. */
    private function bank(DailyTask $task): void
    {
        $task->worked_seconds = $task->elapsed_seconds;
        $task->running_since = null;
        $task->hours_worked = round($task->worked_seconds / 3600, 2);
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['task' => [$message]]);
    }

    /** Assigning and editing tasks (and so hours and pay) is for the people who run the farm. */
    private function abortUnlessManager(Request $request): void
    {
        abort_unless(
            in_array($request->user()->role, ['Farm-owner', 'Manager'], true),
            403,
            'Only the Farm Owner or a Manager can assign or edit tasks. Use Start, Pause and Finish on your own tasks.'
        );
    }
}
