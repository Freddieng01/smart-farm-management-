<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Farm;
use App\Models\Field;
use App\Models\User;
use App\Models\FarmExpense;
use App\Models\DailyTask;
use App\Models\Employee;
use App\Models\CropProduction;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function summary(): JsonResponse
    {
        // 1. Basic Infrastructure Counts
        $farmsCount = Farm::count();
        $fieldsCount = Field::count();
        $activeUsersCount = User::whereHas('tokens')->count();
        $totalAcreage = Farm::sum('total_acreage');

        // 2. Financials: Total Expenses
        $totalExpenses = FarmExpense::sum('amount');

        // 3. Labour: Total Labour Cost
        // Calculation: Sum of (hours_worked * hourly_rate)
        $totalLaborCost = DB::table('daily_tasks')
            ->join('employees', 'daily_tasks.employee_id', '=', 'employees.id')
            ->sum(DB::raw('daily_tasks.hours_worked * employees.hourly_rate'));

        // 4. Production: Total Quantity (Generic sum)
        $totalProduction = CropProduction::sum('quantity');

        // 5. Simplified Profit Estimate
        // Profit = (Estimated Production Value -’ Expenses - Labor)
        // Since we don't have a "Market Price" integrated into the summary yet,
        // we provide the raw cost vs production metrics.

        return response()->json([
            'data' => [
                'infrastructure' => [
                    'farms' => $farmsCount,
                    'fields' => $fieldsCount,
                    'active_users' => $activeUsersCount,
                    'total_acreage' => (float) $totalAcreage,
                ],
                'financials' => [
                    'total_expenses' => (float) $totalExpenses,
                    'total_labor_cost' => (float) $totalLaborCost,
                    'total_outflow' => (float) ($totalExpenses + $totalLaborCost),
                ],
                'production' => [
                    'total_quantity' => (float) $totalProduction,
                ],
            ],
        ]);
    }
}
