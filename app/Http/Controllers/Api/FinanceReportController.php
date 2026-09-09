<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\FinancialTransaction;
use App\Models\Resource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinanceReportController extends Controller
{
    /**
     * Dashboard-style overview: income, expenses, profit, inventory value,
     * low-stock/expiring counts, and the most recent transactions.
     */
    public function summary(Request $request): JsonResponse
    {
        $farmId = $request->integer('farm_id');

        $transactions = FinancialTransaction::when($farmId, fn ($q) => $q->where('farm_id', $farmId));

        $totalIncome = (clone $transactions)->where('type', 'income')->sum('amount');
        $totalExpenses = (clone $transactions)->where('type', 'expense')->sum('amount');

        $resources = Resource::when($farmId, fn ($q) => $q->where('farm_id', $farmId));

        $inventoryValue = (clone $resources)->sum(DB::raw('quantity * unit_cost'));
        $lowStockCount = (clone $resources)->lowStock()->count();
        $expiringSoonCount = (clone $resources)->expiringSoon()->count();
        $expiredCount = (clone $resources)->expired()->count();

        $recent = (clone $transactions)->latest('transaction_date')->limit(10)->get(['id', 'farm_id', 'type', 'category', 'amount', 'transaction_date']);

        return response()->json([
            'data' => [
                'total_income' => round((float) $totalIncome, 2),
                'total_expenses' => round((float) $totalExpenses, 2),
                'net_profit' => round((float) $totalIncome - (float) $totalExpenses, 2),
                'inventory_value' => round((float) $inventoryValue, 2),
                'low_stock_count' => $lowStockCount,
                'expiring_soon_count' => $expiringSoonCount,
                'expired_count' => $expiredCount,
                'recent_transactions' => $recent,
            ],
        ]);
    }

    /**
     * Profit and loss, broken down by category, over an optional date range.
     */
    public function profitLoss(Request $request): JsonResponse
    {
        $farmId = $request->integer('farm_id');
        $from = $request->date('from');
        $to = $request->date('to');

        $base = FinancialTransaction::when($farmId, fn ($q) => $q->where('farm_id', $farmId))
            ->when($from, fn ($q) => $q->whereDate('transaction_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('transaction_date', '<=', $to));

        $incomeByCategory = (clone $base)->where('type', 'income')
            ->groupBy('category')
            ->select('category', DB::raw('SUM(amount) as total'))
            ->pluck('total', 'category');

        $expenseByCategory = (clone $base)->where('type', 'expense')
            ->groupBy('category')
            ->select('category', DB::raw('SUM(amount) as total'))
            ->pluck('total', 'category');

        $totalIncome = $incomeByCategory->sum();
        $totalExpenses = $expenseByCategory->sum();

        return response()->json([
            'data' => [
                'period' => ['from' => $from?->toDateString(), 'to' => $to?->toDateString()],
                'income_by_category' => $incomeByCategory,
                'expense_by_category' => $expenseByCategory,
                'total_income' => round((float) $totalIncome, 2),
                'total_expenses' => round((float) $totalExpenses, 2),
                'net_profit' => round((float) $totalIncome - (float) $totalExpenses, 2),
            ],
        ]);
    }

    /**
     * Production cost per hectare for a given field, using expense transactions
     * scoped to that field divided by the field's size_hectares.
     */
    public function costPerHectare(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'field_id' => ['required', 'exists:fields,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $field = DB::table('fields')->where('id', $validated['field_id'])->first();

        $cost = FinancialTransaction::where('field_id', $validated['field_id'])
            ->where('type', 'expense')
            ->when(! empty($validated['from']), fn ($q) => $q->whereDate('transaction_date', '>=', $validated['from']))
            ->when(! empty($validated['to']), fn ($q) => $q->whereDate('transaction_date', '<=', $validated['to']))
            ->sum('amount');

        $hectares = (float) $field->size_hectares;

        return response()->json([
            'data' => [
                'field_id' => $field->id,
                'field_name' => $field->name,
                'total_cost' => round((float) $cost, 2),
                'size_hectares' => $hectares,
                'cost_per_hectare' => $hectares > 0 ? round((float) $cost / $hectares, 2) : null,
            ],
        ]);
    }

    /**
     * Cost per kilogram requires yield/harvest data, which does not exist
     * anywhere in the current schema. Rather than invent a number, this
     * endpoint clearly reports the missing dependency.
     */
    public function costPerKilogram(Request $request): JsonResponse
    {
        return response()->json([
            'data' => null,
            'message' => 'Cost per kilogram is not available yet: no harvest/yield table exists in the current schema. '
                . 'This calculation needs actual production quantity (kg) from whichever module owns crop/harvest output '
                . 'before it can be computed.',
        ], 200);
    }

    /**
     * Compares each budget's planned_amount against the actual sum of
     * matching financial_transactions for that farm/category/period.
     */
    public function budgetVsActual(Request $request): JsonResponse
    {
        $farmId = $request->integer('farm_id');

        $budgets = Budget::when($farmId, fn ($q) => $q->where('farm_id', $farmId))->get();

        $rows = $budgets->map(function (Budget $budget) {
            $actual = FinancialTransaction::where('farm_id', $budget->farm_id)
                ->where('category', $budget->category)
                ->whereDate('transaction_date', '>=', $budget->period_start)
                ->whereDate('transaction_date', '<=', $budget->period_end)
                ->sum('amount');

            return [
                'budget_id' => $budget->id,
                'farm_id' => $budget->farm_id,
                'category' => $budget->category,
                'period_start' => $budget->period_start->toDateString(),
                'period_end' => $budget->period_end->toDateString(),
                'planned_amount' => round((float) $budget->planned_amount, 2),
                'actual_amount' => round((float) $actual, 2),
                'variance' => round((float) $budget->planned_amount - (float) $actual, 2),
            ];
        });

        return response()->json(['data' => $rows]);
    }
}
