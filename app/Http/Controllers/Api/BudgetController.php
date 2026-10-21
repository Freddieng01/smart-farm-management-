<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\FinancialTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BudgetController extends Controller
{
    // planned_amount is decimal(12,2)
    private const AMOUNT_RULES = ['numeric', 'decimal:0,2', 'min:0', 'max:9999999999.99'];

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'farm_id' => ['sometimes', 'integer'],
            'category' => ['sometimes', 'string', 'max:50'],
        ]);

        $budgets = Budget::with('farm:id,name')
            ->when(isset($filters['farm_id']), fn ($q) => $q->where('farm_id', $filters['farm_id']))
            ->when(isset($filters['category']), fn ($q) => $q->where('category', $filters['category']))
            ->latest('period_start')
            ->paginate(25);

        return response()->json($budgets);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'farm_id' => ['required', 'integer', 'exists:farms,id'],
            // A budget is planned spending, so it uses the same expense categories
            // as financial_transactions (keeps budget-vs-actual comparable).
            'category' => ['required', 'string', Rule::in(FinancialTransaction::EXPENSE_CATEGORIES)],
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after:period_start'],
            'planned_amount' => ['required', ...self::AMOUNT_RULES],
        ]);

        $this->assertNoOverlap(
            $validated['farm_id'],
            $validated['category'],
            Carbon::parse($validated['period_start'])->toDateString(),
            Carbon::parse($validated['period_end'])->toDateString(),
        );

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
            'farm_id' => ['sometimes', 'required', 'integer', 'exists:farms,id'],
            'category' => ['sometimes', 'required', 'string', Rule::in(FinancialTransaction::EXPENSE_CATEGORIES)],
            'period_start' => ['sometimes', 'required', 'date'],
            'period_end' => ['sometimes', 'required', 'date'],
            'planned_amount' => ['sometimes', 'required', ...self::AMOUNT_RULES],
        ]);

        // Work out the FINAL values (sent value, or the stored one) and check those.
        $farmId = $validated['farm_id'] ?? $budget->farm_id;
        $category = $validated['category'] ?? $budget->category;
        $start = isset($validated['period_start'])
            ? Carbon::parse($validated['period_start'])->toDateString()
            : $budget->period_start->toDateString();
        $end = isset($validated['period_end'])
            ? Carbon::parse($validated['period_end'])->toDateString()
            : $budget->period_end->toDateString();

        if ($end <= $start) {
            throw ValidationException::withMessages([
                'period_end' => ['The period end must be after the period start.'],
            ]);
        }

        $this->assertNoOverlap($farmId, $category, $start, $end, $budget->id);

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

    /**
     * Two budgets for the same farm AND category may not cover the same days.
     * Dates are inclusive, so Jan 1-Jan 31 and Feb 1-Feb 28 do not overlap.
     */
    private function assertNoOverlap(int $farmId, string $category, string $start, string $end, ?int $ignoreId = null): void
    {
        $overlaps = Budget::where('farm_id', $farmId)
            ->where('category', $category)
            ->where('period_start', '<=', $end)
            ->where('period_end', '>=', $start)
            ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
            ->exists();

        if ($overlaps) {
            throw ValidationException::withMessages([
                'period_start' => ['A budget for this farm and category already covers part of this period.'],
            ]);
        }
    }
}
