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
use App\Models\YieldRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Support\Authorization\FarmAccess;

class DashboardController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $farmIds = FarmAccess::farmIds();
        $role = $request->user()->role;

        // 1. Basic Infrastructure Counts
        $farmsCount = Farm::whereIn('id', $farmIds)->count();
        $fieldsCount = Field::whereIn('farm_id', $farmIds)->count();
        $activeUsersCount = User::whereHas('tokens')
            ->where(function ($query) use ($farmIds) {
                $query->whereIn('id', function ($employees) use ($farmIds) {
                    $employees->from('employees')
                        ->select('user_id')
                        ->whereIn('farm_id', $farmIds);
                })->orWhereIn('id', function ($owners) use ($farmIds) {
                    $owners->from('farms')
                        ->select('owner_id')
                        ->whereIn('id', $farmIds)
                        ->whereNotNull('owner_id');
                });
            })
            ->count();
        $totalAcreage = Farm::whereIn('id', $farmIds)->sum('total_acreage');

        // 2. Financials: Total Expenses
        $totalExpenses = FarmExpense::whereIn('farm_id', $farmIds)->sum('amount');

        // 3. Labour: Total Labour Cost
        // Calculation: Sum of (hours_worked * hourly_rate)
        $totalLaborCost = DB::table('daily_tasks')
            ->join('employees', 'daily_tasks.employee_id', '=', 'employees.id')
            ->whereIn('employees.farm_id', $farmIds)
            ->sum(DB::raw('daily_tasks.hours_worked * employees.hourly_rate'));

        // 4. Production: Total Quantity (Generic sum)
        $totalProduction = CropProduction::whereHas('field', function ($query) use ($farmIds) {
            $query->whereIn('farm_id', $farmIds);
        })->sum('quantity');
        $yieldRecords = YieldRecord::whereHas('field', function ($query) use ($farmIds) {
            $query->whereIn('farm_id', $farmIds);
        })->count();

        // 5. Simplified Profit Estimate
        // Profit = (Estimated Production Value -’ Expenses - Labor)
        // Since we don't have a "Market Price" integrated into the summary yet,
        // we provide the raw cost vs production metrics.

        $response = [
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
                    'yield_records' => $yieldRecords,
                ],
            ],
        ];

        if (! in_array($role, ['Farm-owner', 'Manager', 'Accountant'], true)) {
            unset($response['data']['financials']);
        }

        return response()->json($response);
    }
}
