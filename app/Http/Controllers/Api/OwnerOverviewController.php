<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\Employee;
use App\Models\Farm;
use App\Models\Field;
use App\Models\FinancialTransaction;
use App\Models\Invoice;
use App\Models\Livestock;
use App\Models\PurchaseOrder;
use App\Models\Resource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * The farm owner's "business at a glance".
 *
 * Everything here is an accumulated figure (totals, trends, per-farm results).
 * It deliberately contains NO day-to-day operational records (who fed which
 * animal, which feed, who did which task): that detail belongs to the managers.
 *
 * Row visibility is handled by the same farm-access global scopes as the rest
 * of the API, so an owner only ever sees the farms they own.
 */
class OwnerOverviewController extends Controller
{
    /**
     * Money that is borrowed or paid back is not business income or cost.
     * Taking a loan does not make the farm richer and repaying one does not
     * make it less profitable, so both are kept out of profit and reported
     * separately under "financing".
     * (Business decision - confirm with your team.)
     */
    private const FINANCING_CATEGORIES = ['loan_received', 'loan_repayment'];

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'year' => ['nullable', 'integer', 'between:2000,2100'],
            'farm_id' => ['nullable', 'integer', 'exists:farms,id'],
        ]);

        $year = (int) ($validated['year'] ?? now()->year);
        $farmId = isset($validated['farm_id']) ? (int) $validated['farm_id'] : null;

        $farms = Farm::orderBy('name')->get(['id', 'name', 'total_acreage']);

        // ---- Profit and loss for the chosen year -------------------------
        $rows = $this->ledgerRows($year, $farmId);
        $current = $this->totals($rows);

        $previousRows = $this->ledgerRows($year - 1, $farmId);
        $previous = $this->totals($previousRows);

        $operating = $this->operating($rows);

        return response()->json([
            'data' => [
                'period' => [
                    'year' => $year,
                    'from' => "{$year}-01-01",
                    'to' => "{$year}-12-31",
                    'is_current_year' => $year === (int) now()->year,
                ],
                'farm' => $farmId ? $farms->firstWhere('id', $farmId)?->only(['id', 'name']) : null,
                'summary' => [
                    'income' => $current['income'],
                    'expenses' => $current['expenses'],
                    'net_profit' => $current['profit'],
                    'profit_margin' => $current['income'] > 0
                        ? round($current['profit'] / $current['income'] * 100, 1)
                        : null,
                    'status' => $this->status($rows->isNotEmpty(), $current['profit']),
                ],
                'previous' => [
                    'year' => $year - 1,
                    'has_data' => $previousRows->isNotEmpty(),
                    'income' => $previous['income'],
                    'expenses' => $previous['expenses'],
                    'net_profit' => $previous['profit'],
                    'income_change_pct' => $this->changePct($current['income'], $previous['income']),
                    'expenses_change_pct' => $this->changePct($current['expenses'], $previous['expenses']),
                    'profit_change' => round($current['profit'] - $previous['profit'], 2),
                ],
                'financing' => $this->financing($rows),
                'monthly' => $this->monthly($operating),
                'income_by_category' => $this->byCategory($operating, 'income'),
                'expense_by_category' => $this->byCategory($operating, 'expense'),
                'farms' => $this->farmResults($farms, $operating, $farmId),
                'owed' => $this->owed($farmId),
                'budget' => $this->budget($year, $farmId),
                'at_a_glance' => $this->atAGlance($farms, $farmId),
                'available_years' => $this->availableYears(),
            ],
        ]);
    }

    // ------------------------------------------------------------------
    // Ledger helpers
    // ------------------------------------------------------------------

    private function ledgerRows(int $year, ?int $farmId): Collection
    {
        $from = "{$year}-01-01";
        $before = ($year + 1) . '-01-01';

        return FinancialTransaction::query()
            ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
            ->where('transaction_date', '>=', $from)
            ->where('transaction_date', '<', $before)
            ->get(['farm_id', 'type', 'category', 'amount', 'transaction_date']);
    }

    /** Ledger rows that count towards profit (loans excluded). */
    private function operating(Collection $rows): Collection
    {
        return $rows->reject(fn ($r) => in_array($r->category, self::FINANCING_CATEGORIES, true));
    }

    private function totals(Collection $rows): array
    {
        $operating = $this->operating($rows);
        $income = $this->sum($operating->where('type', 'income'));
        $expenses = $this->sum($operating->where('type', 'expense'));

        return [
            'income' => $income,
            'expenses' => $expenses,
            'profit' => round($income - $expenses, 2),
        ];
    }

    private function sum(Collection $rows): float
    {
        return round((float) $rows->sum(fn ($r) => (float) $r->amount), 2);
    }

    private function status(bool $hasData, float $profit): string
    {
        if (! $hasData) {
            return 'no_data';
        }

        return match (true) {
            $profit > 0 => 'profit',
            $profit < 0 => 'loss',
            default => 'break_even',
        };
    }

    /** Percentage change versus the previous period; null when there is nothing to compare with. */
    private function changePct(float $now, float $before): ?float
    {
        if ($before == 0.0) {
            return null;
        }

        return round(($now - $before) / abs($before) * 100, 1);
    }

    private function financing(Collection $rows): array
    {
        $received = $this->sum($rows->where('category', 'loan_received'));
        $repaid = $this->sum($rows->where('category', 'loan_repayment'));

        return [
            'loans_received' => $received,
            'loan_repayments' => $repaid,
            'net' => round($received - $repaid, 2),
        ];
    }

    private function monthly(Collection $operating): array
    {
        $labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        $byMonth = $operating->groupBy(fn ($r) => (int) $r->transaction_date->month);

        return collect(range(1, 12))->map(function (int $month) use ($byMonth, $labels) {
            $rows = $byMonth->get($month, collect());
            $income = $this->sum($rows->where('type', 'income'));
            $expenses = $this->sum($rows->where('type', 'expense'));

            return [
                'month' => $month,
                'label' => $labels[$month - 1],
                'income' => $income,
                'expenses' => $expenses,
                'profit' => round($income - $expenses, 2),
            ];
        })->all();
    }

    private function byCategory(Collection $operating, string $type): array
    {
        $rows = $operating->where('type', $type);
        $total = $this->sum($rows);

        return $rows->groupBy('category')
            ->map(fn ($group, $category) => [
                'category' => $category,
                'amount' => $this->sum($group),
            ])
            ->sortByDesc('amount')
            ->values()
            ->map(fn ($row) => $row + [
                'share' => $total > 0 ? round($row['amount'] / $total * 100, 1) : 0,
            ])
            ->all();
    }

    // ------------------------------------------------------------------
    // Per-farm results
    // ------------------------------------------------------------------

    private function farmResults(Collection $farms, Collection $operating, ?int $farmId): array
    {
        $hectares = Field::query()
            ->selectRaw('farm_id, SUM(size_hectares) as hectares')
            ->groupBy('farm_id')
            ->pluck('hectares', 'farm_id');

        $byFarm = $operating->groupBy('farm_id');

        return $farms
            ->when($farmId, fn ($c) => $c->where('id', $farmId))
            ->map(function (Farm $farm) use ($byFarm, $hectares) {
                $rows = $byFarm->get($farm->id, collect());
                $income = $this->sum($rows->where('type', 'income'));
                $expenses = $this->sum($rows->where('type', 'expense'));
                $ha = (float) ($hectares[$farm->id] ?? 0);

                return [
                    'id' => $farm->id,
                    'name' => $farm->name,
                    'hectares' => round($ha, 2),
                    'income' => $income,
                    'expenses' => $expenses,
                    'profit' => round($income - $expenses, 2),
                    'cost_per_hectare' => $ha > 0 ? round($expenses / $ha, 2) : null,
                ];
            })
            ->sortByDesc('profit')
            ->values()
            ->all();
    }

    // ------------------------------------------------------------------
    // What is owed, and what is held (a snapshot of today, not of the year)
    // ------------------------------------------------------------------

    private function owed(?int $farmId): array
    {
        $today = Carbon::today();

        // Customers who have been invoiced but have not paid in full.
        $invoices = Invoice::query()
            ->with('payments:id,invoice_id,amount_paid')
            ->where('status', '!=', 'Paid')
            ->whereHas('salesOrder', function ($q) use ($farmId) {
                $q->where('status', '!=', 'Cancelled')
                    ->when($farmId, fn ($s) => $s->where('farm_id', $farmId));
            })
            ->get(['id', 'sales_order_id', 'total_amount', 'due_date']);

        $receivable = 0.0;
        $overdue = 0.0;
        foreach ($invoices as $invoice) {
            $outstanding = max(0.0, (float) $invoice->total_amount - (float) $invoice->payments->sum('amount_paid'));
            $receivable += $outstanding;
            if ($outstanding > 0 && $invoice->due_date && $invoice->due_date->isBefore($today)) {
                $overdue += $outstanding;
            }
        }

        // Suppliers whose delivered goods have not been paid for in full.
        $orders = PurchaseOrder::query()
            ->with([
                'items:id,purchase_order_id,quantity,unit_price',
                'payments:id,purchase_order_id,amount_paid',
            ])
            ->where('fulfillment_status', 'Received')
            ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
            ->get(['id', 'farm_id']);

        $payable = 0.0;
        foreach ($orders as $order) {
            $value = (float) $order->items->sum(fn ($i) => (float) $i->quantity * (float) $i->unit_price);
            $payable += max(0.0, $value - (float) $order->payments->sum('amount_paid'));
        }

        $inventoryValue = Resource::query()
            ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
            ->sum(DB::raw('quantity * unit_cost'));

        return [
            'receivable' => round($receivable, 2),
            'receivable_overdue' => round($overdue, 2),
            'payable' => round($payable, 2),
            'inventory_value' => round((float) $inventoryValue, 2),
        ];
    }

    // ------------------------------------------------------------------
    // Budget: did we stay within plan?
    // ------------------------------------------------------------------

    private function budget(int $year, ?int $farmId): ?array
    {
        $from = "{$year}-01-01";
        $to = "{$year}-12-31";

        $budgets = Budget::query()
            ->with('farm:id,name')
            ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
            ->where('period_start', '<=', $to)
            ->where('period_end', '>=', $from)
            ->get();

        if ($budgets->isEmpty()) {
            return null;
        }

        $planned = 0.0;
        $actual = 0.0;
        $over = [];

        foreach ($budgets as $budget) {
            $spent = (float) FinancialTransaction::query()
                ->where('farm_id', $budget->farm_id)
                ->where('type', 'expense')
                ->where('category', $budget->category)
                ->where('transaction_date', '>=', $budget->period_start->toDateString())
                ->where('transaction_date', '<=', $budget->period_end->toDateString())
                ->sum('amount');

            $plan = (float) $budget->planned_amount;
            $planned += $plan;
            $actual += $spent;

            if ($spent > $plan) {
                $over[] = [
                    'category' => $budget->category,
                    'farm' => $budget->farm?->name,
                    'planned' => round($plan, 2),
                    'actual' => round($spent, 2),
                    'overspend' => round($spent - $plan, 2),
                ];
            }
        }

        usort($over, fn ($a, $b) => $b['overspend'] <=> $a['overspend']);

        return [
            'planned' => round($planned, 2),
            'actual' => round($actual, 2),
            'variance' => round($planned - $actual, 2), // positive = under budget
            'over_budget' => array_slice($over, 0, 3),
        ];
    }

    // ------------------------------------------------------------------
    // Size of the business (counts only, never individual records)
    // ------------------------------------------------------------------

    private function atAGlance(Collection $farms, ?int $farmId): array
    {
        $scoped = $farms->when($farmId, fn ($c) => $c->where('id', $farmId));

        $herd = Livestock::query()
            ->where('status', 'Active')
            ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
            ->pluck('species')
            ->countBy()
            ->sortDesc();

        return [
            'farms' => $scoped->count(),
            'acres' => round((float) $scoped->sum(fn ($f) => (float) $f->total_acreage), 2),
            'employees' => Employee::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->count(),
            'livestock_total' => $herd->sum(),
            'livestock_by_species' => $herd->all(),
        ];
    }

    private function availableYears(): array
    {
        $thisYear = (int) now()->year;
        $earliest = FinancialTransaction::query()->min('transaction_date');
        $first = $earliest ? min((int) Carbon::parse($earliest)->year, $thisYear) : $thisYear;

        return range($thisYear, $first); // newest first
    }
}
