<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyTask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DailyTaskController extends Controller
{
    public function index(): JsonResponse
    {
        $tasks = DailyTask::with(['employee.user', 'field'])
            ->latest('date')
            ->paginate(25);

        return response()->json($tasks);
    }

    public function store(Request $request): JsonResponse
    {
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
            'data' => $dailyTask->load(['employee.user', 'field']),
        ]);
    }

    public function update(Request $request, DailyTask $dailyTask): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => ['sometimes', 'required', 'exists:employees,id'],
            'field_id' => ['sometimes', 'nullable', 'exists:fields,id'],
            'task_description' => ['sometimes', 'required', 'string', 'max:255'],
            'hours_worked' => ['sometimes', 'required', 'numeric', 'min:0'],
            'status' => ['sometimes', 'required', 'in:pending,in_progress,completed'],
            'date' => ['sometimes', 'required', 'date'],
        ]);

        $dailyTask->update($validated);

        return response()->json([
            'message' => 'Task updated successfully.',
            'data' => $dailyTask->fresh(['employee.user', 'field']),
        ]);
    }

    public function destroy(DailyTask $dailyTask): JsonResponse
    {
        $dailyTask->delete();

        return response()->json([
            'message' => 'Task deleted successfully.',
        ]);
    }
}
