<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Equipment;
use App\Models\FinancialTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EquipmentController extends Controller
{
    // purchase_cost / cost are decimal(12,2)
    private const COST_RULES = ['numeric', 'decimal:0,2', 'min:0', 'max:9999999999.99'];

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'farm_id' => ['sometimes', 'integer'],
            'status' => ['sometimes', Rule::in(Equipment::STATUSES)],
            'type' => ['sometimes', Rule::in(Equipment::TYPES)],
        ]);

        $equipment = Equipment::with('farm:id,name')
            ->withMax('maintenanceRecords', 'next_service_date')
            ->when(isset($filters['farm_id']), fn ($q) => $q->where('farm_id', $filters['farm_id']))
            ->when(isset($filters['status']), fn ($q) => $q->where('status', $filters['status']))
            ->when(isset($filters['type']), fn ($q) => $q->where('type', $filters['type']))
            ->orderBy('name')
            ->paginate(50);

        return response()->json($equipment);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'farm_id' => ['required', 'integer', 'exists:farms,id'],
            'name' => ['required', 'string', 'max:255', Rule::unique('equipment', 'name')->where('farm_id', $request->integer('farm_id'))],
            'type' => ['required', Rule::in(Equipment::TYPES)],
            'serial_number' => ['nullable', 'string', 'max:100'],
            'purchase_date' => ['nullable', 'date', 'before_or_equal:today'],
            'purchase_cost' => ['sometimes', ...self::COST_RULES],
            'status' => ['sometimes', Rule::in(Equipment::STATUSES)],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $equipment = Equipment::create($validated);

        return response()->json([
            'message' => 'Equipment registered successfully.',
            'data' => $equipment->fresh('farm:id,name'),
        ], 201);
    }

    public function show(Equipment $equipment): JsonResponse
    {
        return response()->json([
            'data' => $equipment->load([
                'farm:id,name',
                'maintenanceRecords' => fn ($q) => $q->latest('maintenance_date')->latest('id')->limit(20),
                'fuelLogs' => fn ($q) => $q->latest('log_date')->latest('id')->limit(20),
            ]),
        ]);
    }

    public function update(Request $request, Equipment $equipment): JsonResponse
    {
        $validated = $request->validate([
            // Equipment never moves to another farm (its history and finance links belong to one farm).
            'farm_id' => ['prohibited'],
            'name' => [
                'sometimes', 'required', 'string', 'max:255',
                Rule::unique('equipment', 'name')->where('farm_id', $equipment->farm_id)->ignore($equipment),
            ],
            'type' => ['sometimes', 'required', Rule::in(Equipment::TYPES)],
            'serial_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'purchase_date' => ['sometimes', 'nullable', 'date', 'before_or_equal:today'],
            'purchase_cost' => ['sometimes', ...self::COST_RULES],
            'status' => ['sometimes', 'required', Rule::in(Equipment::STATUSES)],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        $equipment->update($validated);

        return response()->json([
            'message' => 'Equipment updated successfully.',
            'data' => $equipment->fresh('farm:id,name'),
        ]);
    }

    public function destroy(Equipment $equipment): JsonResponse
    {
        // Deleting would also delete the history (database cascade),
        // so equipment with history is retired instead of deleted.
        if ($equipment->maintenanceRecords()->exists() || $equipment->fuelLogs()->exists()) {
            return response()->json([
                'message' => 'This equipment has maintenance or fuel history and cannot be deleted. Set its status to "retired" instead.',
            ], 409);
        }

        $equipment->delete();

        return response()->json([
            'message' => 'Equipment deleted successfully.',
        ]);
    }

    public function storeMaintenance(Request $request, Equipment $equipment): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', Rule::in(['routine', 'repair', 'inspection'])],
            'description' => ['nullable', 'string', 'max:2000'],
            'cost' => ['sometimes', ...self::COST_RULES],
            'maintenance_date' => ['required', 'date', 'before_or_equal:today'],
            'next_service_date' => ['nullable', 'date', 'after:maintenance_date'],
            'record_expense' => ['sometimes', 'boolean'],
        ]);

        $recordExpense = (bool) ($validated['record_expense'] ?? false);
        unset($validated['record_expense']);

        $this->assertExpensePossible($recordExpense, (float) ($validated['cost'] ?? 0));

        $record = DB::transaction(function () use ($validated, $equipment, $request, $recordExpense) {
            $record = $equipment->maintenanceRecords()->create([
                ...$validated,
                'recorded_by' => $request->user()->id,
            ]);

            if ($recordExpense) {
                $this->createExpense(
                    $equipment,
                    'equipment_cost',
                    $validated['cost'],
                    $validated['maintenance_date'],
                    "Maintenance ({$validated['type']}): {$equipment->name}",
                    $request->user()->id,
                );
            }

            return $record;
        });

        return response()->json([
            'message' => 'Maintenance recorded successfully.',
            'data' => $record,
        ], 201);
    }

    public function storeFuel(Request $request, Equipment $equipment): JsonResponse
    {
        $validated = $request->validate([
            'log_date' => ['required', 'date', 'before_or_equal:today'],
            'litres' => ['required', 'numeric', 'decimal:0,2', 'min:0.01', 'max:99999999.99'],
            'cost' => ['sometimes', ...self::COST_RULES],
            'hours_reading' => ['nullable', 'numeric', 'decimal:0,1', 'min:0', 'max:99999999.9'],
            'record_expense' => ['sometimes', 'boolean'],
        ]);

        $recordExpense = (bool) ($validated['record_expense'] ?? false);
        unset($validated['record_expense']);

        $this->assertExpensePossible($recordExpense, (float) ($validated['cost'] ?? 0));

        $log = DB::transaction(function () use ($validated, $equipment, $request, $recordExpense) {
            $log = $equipment->fuelLogs()->create([
                ...$validated,
                'recorded_by' => $request->user()->id,
            ]);

            if ($recordExpense) {
                $this->createExpense(
                    $equipment,
                    'fuel_cost',
                    $validated['cost'],
                    $validated['log_date'],
                    "Fuel ({$validated['litres']} L): {$equipment->name}",
                    $request->user()->id,
                );
            }

            return $log;
        });

        return response()->json([
            'message' => 'Fuel recorded successfully.',
            'data' => $log,
        ], 201);
    }

    /**
     * Equipment whose next service date is overdue or within the next N days.
     */
    public function dueForService(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'farm_id' => ['sometimes', 'integer', 'exists:farms,id'],
            'days' => ['sometimes', 'integer', 'min:1', 'max:365'],
        ]);

        $days = $filters['days'] ?? 14;
        $limit = now()->addDays($days)->toDateString();

        $equipment = Equipment::with('farm:id,name')
            ->withMax('maintenanceRecords', 'next_service_date')
            ->where('status', '!=', 'retired')
            ->when(isset($filters['farm_id']), fn ($q) => $q->where('farm_id', $filters['farm_id']))
            ->get()
            ->filter(fn ($e) => $e->maintenance_records_max_next_service_date !== null
                && $e->maintenance_records_max_next_service_date <= $limit)
            ->values();

        return response()->json([
            'data' => $equipment,
            'window_days' => $days,
        ]);
    }

    private function assertExpensePossible(bool $recordExpense, float $cost): void
    {
        if ($recordExpense && $cost <= 0) {
            throw ValidationException::withMessages([
                'cost' => ['Enter a cost above 0 to record this as a finance expense.'],
            ]);
        }
    }

    private function createExpense(Equipment $equipment, string $category, $amount, string $date, string $description, int $userId): void
    {
        FinancialTransaction::create([
            'farm_id' => $equipment->farm_id,
            'type' => 'expense',
            'category' => $category,
            'description' => mb_substr($description, 0, 255),
            'amount' => $amount,
            'transaction_date' => $date,
            'recorded_by' => $userId,
        ]);
    }
}