<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EmployeeController extends Controller
{
    public function index(): JsonResponse
    {
        $employees = Employee::with(['user:id,name,email,role', 'farm:id,name'])
            ->latest()
            ->paginate(25);

        return response()->json($employees);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => [
                'required',
                'exists:users,id',
                Rule::unique('employees', 'user_id')->where('farm_id', $request->integer('farm_id')),
            ],
            'farm_id' => ['required', 'exists:farms,id'],
            'task_assignment' => ['nullable', 'string', 'max:255'],
            'hourly_rate' => ['required', 'numeric', 'min:0'],
        ]);

        $employee = Employee::create($validated);

        return response()->json([
            'message' => 'Employee created successfully.',
            'data' => $employee->load(['user:id,name,email,role', 'farm:id,name']),
        ], 201);
    }

    public function show(Employee $employee): JsonResponse
    {
        return response()->json([
            'data' => $employee->load(['user:id,name,email,role', 'farm:id,name']),
        ]);
    }

    public function update(Request $request, Employee $employee): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['sometimes', 'required', 'exists:users,id'],
            'farm_id' => ['sometimes', 'required', 'exists:farms,id'],
            'task_assignment' => ['sometimes', 'nullable', 'string', 'max:255'],
            'hourly_rate' => ['sometimes', 'required', 'numeric', 'min:0'],
        ]);

        if (array_key_exists('user_id', $validated) || array_key_exists('farm_id', $validated)) {
            $userId = $validated['user_id'] ?? $employee->user_id;
            $farmId = $validated['farm_id'] ?? $employee->farm_id;

            $exists = Employee::where('user_id', $userId)
                ->where('farm_id', $farmId)
                ->whereKeyNot($employee->id)
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages([
                    'user_id' => ['This user is already assigned to the selected farm.'],
                ]);
            }

            $validated['user_id'] = $userId;
        }

        $employee->update($validated);

        return response()->json([
            'message' => 'Employee updated successfully.',
            'data' => $employee->fresh(['user:id,name,email,role', 'farm:id,name']),
        ]);
    }

    public function destroy(Employee $employee): JsonResponse
    {
        $employee->delete();

        return response()->json([
            'message' => 'Employee deleted successfully.',
        ]);
    }
}
