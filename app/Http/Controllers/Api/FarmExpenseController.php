<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FarmExpense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FarmExpenseController extends Controller
{
    public function index(): JsonResponse
    {
        $expenses = FarmExpense::with('farm')
            ->latest('expense_date')
            ->paginate(25);

        return response()->json($expenses);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'farm_id' => ['required', 'exists:farms,id'],
            'category' => ['required', 'string', 'max:100'],
            'amount' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:255'],
            'expense_date' => ['required', 'date'],
        ]);

        $expense = FarmExpense::create($validated);

        return response()->json([
            'message' => 'Expense recorded successfully.',
            'data' => $expense->load('farm'),
        ], 201);
    }

    public function show(FarmExpense $farmExpense): JsonResponse
    {
        return response()->json([
            'data' => $farmExpense->load('farm'),
        ]);
    }

    public function update(Request $request, FarmExpense $farmExpense): JsonResponse
    {
        $validated = $request->validate([
            'farm_id' => ['sometimes', 'required', 'exists:farms,id'],
            'category' => ['sometimes', 'required', 'string', 'max:100'],
            'amount' => ['sometimes', 'required', 'numeric', 'min:0'],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'expense_date' => ['sometimes', 'required', 'date'],
        ]);

        $farmExpense->update($validated);

        return response()->json([
            'message' => 'Expense updated successfully.',
            'data' => $farmExpense->fresh('farm'),
        ]);
    }

    public function destroy(FarmExpense $farmExpense): JsonResponse
    {
        $farmExpense->delete();

        return response()->json([
            'message' => 'Expense deleted successfully.',
        ]);
    }
}
