<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\FinancialTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BudgetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $budgets = Budget::with('farm:id,name')
            ->when($request->filled('farm_id'), fn ($q) => $q->where('farm_id', $request->integer('farm_id')))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')))
            ->latest('period_start')
            ->paginate(25);

        return response()->json($budgets);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'farm_id' => ['required', 'exists:farms,id'],
            // A budget is a planned spend, so its category must be one of the
            // same expense categories a financial_transactions expense can use -
            // keeps budget-vs-actual comparisons meaningful (matching categories).
            'category' => ['required', 'string', Rule::in(FinancialTransaction::EXPENSE_CATEGORIES)],
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after:period_start'],
            'planned_amount' => ['required', 'numeric', 'min:0'],
        ]);

        $budget = Budget::create($validated);

        return response()->json([
            'message' => 'Budget created successfully.',
            'data' => $budget->load('farm:id,name'),
        ], 201);
    }

    public function show(Budget $budget): JsonResponse
    {
        return response()->json([
            'data' => $budget->load('farm:id,name'),
        ]);
    }

    public function update(Request $request, Budget $budget): JsonResponse
    {
        $validated = $request->validate([
            'farm_id' => ['sometimes', 'required', 'exists:farms,id'],
            'category' => ['sometimes', 'required', 'string', Rule::in(FinancialTransaction::EXPENSE_CATEGORIES)],
            'period_start' => ['sometimes', 'required', 'date'],
            'period_end' => ['sometimes', 'required', 'date', 'after:period_start'],
            'planned_amount' => ['sometimes', 'required', 'numeric', 'min:0'],
        ]);

        // If only one of the two dates was sent, re-check against the stored value
        // so "after:period_start" still compares against the real final range.
        $start = $validated['period_start'] ?? $budget->period_start->toDateString();
        $end = $validated['period_end'] ?? $budget->period_end->toDateString();

        if (strtotime($end) <= strtotime($start)) {
            return response()->json([
                'message' => 'The given data was invalid.',
                'errors' => ['period_end' => ['period_end must be after period_start.']],
            ], 422);
        }

        $budget->update($validated);

        return response()->json([
            'message' => 'Budget updated successfully.',
            'data' => $budget->fresh('farm:id,name'),
        ]);
    }

    public function destroy(Budget $budget): JsonResponse
    {
        $budget->delete();

        return response()->json([
            'message' => 'Budget deleted successfully.',
        ]);
    }
}
