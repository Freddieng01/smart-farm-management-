<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\FinancialTransaction;
use App\Models\Resource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FinanceReportController extends Controller
{
    /**
     * Expense categories counted as "production cost" for cost per hectare.
     * Loan repayments and "other" expenses are NOT production costs.
     * (Business decision - confirm with your team.)
     */
    private const PRODUCTION_COST_CATEGORIES = ['input_cost', 'labour_cost', 'fuel_cost', 'equipment_cost'];

    /**
     * Dashboard overview for ONE farm: income, expenses, profit, inventory value,
     * low-stock / expiry counts and the latest transactions.
     */
    public function summary(Request $request): JsonResponse
    {
        $filters = $this->validatedFilters($request);
        $transactions = $this->transactionQuery($filters);

        $totalIncome = (clone $transactions)->where('type', 'income')->sum('amount');
        $totalExpenses = (clone $transactions)->where('type', 'expense')->sum('amount');

        // Inventory figures describe the stock held right now (date filters do not apply).
        $resources = Resource::where('farm_id', $filters['farm_id']);

        $inventoryValue = (clone $resources)->sum(DB::raw('quantity * unit_cost'));

        $recent = (clone $transactions)
            ->latest('transaction_date')
            ->latest('id')
            ->limit(10)
            ->get(['id', 'farm_id', 'type', 'category', 'amount', 'transaction_date']);

        return response()->json([
            'data' => [
                'total_income' => round((float) $totalIncome, 2),
                'total_expenses' => round((float) $totalExpenses, 2),
                'net_profit' => round((float) $totalIncome - (float) $totalExpenses, 2),
                'inventory_value' => round((float) $inventoryValue, 2),
                'low_stock_count' => (clone $resources)->lowStock()->count(),
                'expiring_soon_count' => (clone $resources)->expiringSoon()->count(),
                'expired_count' => (clone $resources)->expired()->count(),
                'recent_transactions' => $recent,
            ],
        ]);
    }

    /**
     * Profit and loss for ONE farm, broken down by category, over an optional date range.
     */
    public function profitLoss(Request $request): JsonResponse
    {
        $filters = $this->validatedFilters($request);
        $base = $this->transactionQuery($filters);

        $incomeByCategory = (clone $base)->where('type', 'income')
            ->groupBy('category')
            ->select('category', DB::raw('SUM(amount) as total'))
            ->pluck('total', 'category')
            ->map(fn ($v) => round((float) $v, 2));

        $expenseByCategory = (clone $base)->where('type', 'expense')
            ->groupBy('category')
            ->select('category', DB::raw('SUM(amount) as total'))
            ->pluck('total', 'category')
            ->map(fn ($v) => round((float) $v, 2));

        $totalIncome = $incomeByCategory->sum();
        $totalExpenses = $expenseByCategory->sum();

        return response()->json([
            'data' => [
                'farm_id' => $filters['farm_id'],
                'period' => ['from' => $filters['from'] ?? null, 'to' => $filters['to'] ?? null],
                'income_by_category' => $incomeByCategory,
                'expense_by_category' => $expenseByCategory,
                'total_income' => round((float) $totalIncome, 2),
                'total_expenses' => round((float) $totalExpenses, 2),
                'net_profit' => round((float) $totalIncome - (float) $totalExpenses, 2),
            ],
        ]);
    }

    /**
     * Production cost per hectare.
     *  - with field_id: costs recorded against that field / that field's size_hectares
     *  - with only farm_id: all production costs of the farm / total hectares of its fields
     */
    public function costPerHectare(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'field_id' => ['required_without:farm_id', 'nullable', 'integer', 'exists:fields,id'],
            'farm_id' => ['required_without:field_id', 'nullable', 'integer', 'exists:farms,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $query = FinancialTransaction::where('type', 'expense')
            ->whereIn('category', self::PRODUCTION_COST_CATEGORIES)
            ->when(! empty($validated['from']), fn ($q) => $q->where('transaction_date', '>=', Carbon::parse($validated['from'])->toDateString()))
            ->when(! empty($validated['to']), fn ($q) => $q->where('transaction_date', '<=', Carbon::parse($validated['to'])->toDateString()));

        $data = [];

        if (! empty($validated['field_id'])) {
            $field = DB::table('fields')->where('id', $validated['field_id'])->first();

            if (! empty($validated['farm_id']) && (int) $validated['farm_id'] !== (int) $field->farm_id) {
                throw ValidationException::withMessages([
                    'field_id' => ['The selected field does not belong to the selected farm.'],
                ]);
            }

            $cost = (clone $query)->where('field_id', $field->id)->sum('amount');
            $hectares = (float) $field->size_hectares;

            $data = [
                'basis' => 'field',
                'field_id' => $field->id,
                'field_name' => $field->name,
            ];
        } else {
            $cost = (clone $query)->where('farm_id', $validated['farm_id'])->sum('amount');
            $hectares = (float) DB::table('fields')->where('farm_id', $validated['farm_id'])->sum('size_hectares');

            $data = [
                'basis' => 'farm',
                'farm_id' => (int) $validated['farm_id'],
            ];
        }

        $perHectare = $hectares > 0 ? round((float) $cost / $hectares, 2) : null;

        return response()->json([
            'data' => $data + [
                'categories_included' => self::PRODUCTION_COST_CATEGORIES,
                'total_cost' => round((float) $cost, 2),
                'size_hectares' => $hectares,
                'cost_per_hectare' => $perHectare,
            ],
            'message' => $perHectare === null
                ? 'Cost per hectare cannot be calculated because the area (size_hectares) is missing or zero.'
                : null,
        ]);
    }

    /**
     * Cost per kilogram needs real production (yield) data in kilograms.
     * No such data is used yet, so this honestly reports it as unavailable
     * instead of inventing a number.
     */
    public function costPerKilogram(Request $request): JsonResponse
    {
        return response()->json([
            'data' => null,
            'message' => 'Cost per kilogram is not available yet: it needs actual production quantity (kg) '
                . 'from the crop production records before it can be computed.',
        ], 200);
    }

    /**
     * Each budget's planned_amount vs the actual EXPENSES recorded for the same
     * farm, category and period (both dates inclusive).
     */
    public function budgetVsActual(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'farm_id' => ['required', 'integer', 'exists:farms,id'],
        ]);

        $rows = Budget::where('farm_id', $validated['farm_id'])
            ->orderBy('period_start')
            ->get()
            ->map(function (Budget $budget) {
                $actual = FinancialTransaction::where('farm_id', $budget->farm_id)
                    ->where('type', 'expense')
                    ->where('category', $budget->category)
                    ->where('transaction_date', '>=', $budget->period_start->toDateString())
                    ->where('transaction_date', '<=', $budget->period_end->toDateString())
                    ->sum('amount');

                return [
                    'budget_id' => $budget->id,
                    'farm_id' => $budget->farm_id,
                    'category' => $budget->category,
                    'period_start' => $budget->period_start->toDateString(),
                    'period_end' => $budget->period_end->toDateString(),
                    'planned_amount' => round((float) $budget->planned_amount, 2),
                    'actual_amount' => round((float) $actual, 2),
                    // positive = still under budget, negative = over budget
                    'variance' => round((float) $budget->planned_amount - (float) $actual, 2),
                ];
            });

        return response()->json(['data' => $rows]);
    }

    private function validatedFilters(Request $request): array
    {
        return $request->validate([
            'farm_id' => ['required', 'integer', 'exists:farms,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);
    }

    private function transactionQuery(array $filters)
    {
        return FinancialTransaction::where('farm_id', $filters['farm_id'])
            ->when(! empty($filters['from']), fn ($q) => $q->where('transaction_date', '>=', Carbon::parse($filters['from'])->toDateString()))
            ->when(! empty($filters['to']), fn ($q) => $q->where('transaction_date', '<=', Carbon::parse($filters['to'])->toDateString()));
    }
}
