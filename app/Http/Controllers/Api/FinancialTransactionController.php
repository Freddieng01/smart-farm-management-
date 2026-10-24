<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FinancialTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class FinancialTransactionController extends Controller
{
    // amount is decimal(12,2): at least 0.01, max 2 decimals, max 9,999,999,999.99
    private const AMOUNT_RULES = ['numeric', 'decimal:0,2', 'min:0.01', 'max:9999999999.99'];

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'farm_id' => ['sometimes', 'integer'],
            'type' => ['sometimes', Rule::in(['income', 'expense'])],
            'category' => ['sometimes', 'string', 'max:50'],
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date'],
        ]);

        $transactions = FinancialTransaction::with(['farm:id,name', 'field:id,name', 'employee:id,user_id', 'recordedBy:id,name'])
            ->when(isset($filters['farm_id']), fn ($q) => $q->where('farm_id', $filters['farm_id']))
            ->when(isset($filters['type']), fn ($q) => $q->where('type', $filters['type']))
            ->when(isset($filters['category']), fn ($q) => $q->where('category', $filters['category']))
            ->when(isset($filters['from']), fn ($q) => $q->where('transaction_date', '>=', $filters['from']))
            ->when(isset($filters['to']), fn ($q) => $q->where('transaction_date', '<=', $filters['to']))
            ->latest('transaction_date')
            ->paginate(25);

        return response()->json($transactions);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatedPayload($request);

        $transaction = FinancialTransaction::create([
            ...$validated,
            // always the logged-in user - never taken from the request body
            'recorded_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Financial transaction recorded successfully.',
            'data' => $transaction->load(['farm:id,name', 'field:id,name', 'employee:id,user_id']),
        ], 201);
    }

    public function show(FinancialTransaction $financialTransaction): JsonResponse
    {
        return response()->json([
            'data' => $financialTransaction->load(['farm:id,name', 'field:id,name', 'employee:id,user_id', 'livestock', 'resourceTransaction', 'recordedBy:id,name']),
        ]);
    }

    public function update(Request $request, FinancialTransaction $financialTransaction): JsonResponse
    {
        $validated = $this->validatedPayload($request, $financialTransaction, sometimes: true);

        $financialTransaction->update($validated);

        return response()->json([
            'message' => 'Financial transaction updated successfully.',
            'data' => $financialTransaction->fresh(['farm:id,name', 'field:id,name', 'employee:id,user_id']),
        ]);
    }

    public function destroy(FinancialTransaction $financialTransaction): JsonResponse
    {
        $financialTransaction->delete();

        return response()->json([
            'message' => 'Financial transaction deleted successfully.',
        ]);
    }

    private function validatedPayload(Request $request, ?FinancialTransaction $existing = null, bool $sometimes = false): array
    {
        $req = $sometimes ? 'sometimes' : 'required';

        $rules = [
            'farm_id' => [$req, 'integer', 'exists:farms,id'],
            'field_id' => ['nullable', 'integer', 'exists:fields,id'],
            'employee_id' => ['nullable', 'integer', 'exists:employees,id'],
            'livestock_id' => ['nullable', 'integer', 'exists:livestock,id'],
            // One stock purchase can back only ONE financial transaction (prevents double counting).
            'resource_transaction_id' => [
                'nullable', 'integer', 'exists:resource_transactions,id',
                Rule::unique('financial_transactions', 'resource_transaction_id')->ignore($existing?->id),
            ],
            'type' => [$req, Rule::in(['income', 'expense'])],
            'category' => [$req, 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:255'],
            'amount' => [$req, ...self::AMOUNT_RULES],
            'transaction_date' => [$req, 'date', 'before_or_equal:today'],
        ];

        $validated = $request->validate($rules, [
            'resource_transaction_id.unique' => 'This stock purchase is already linked to another financial transaction.',
        ]);

        $type = $validated['type'] ?? $existing?->type;
        $category = $validated['category'] ?? $existing?->category;

        $allowed = $type === 'income'
            ? FinancialTransaction::INCOME_CATEGORIES
            : FinancialTransaction::EXPENSE_CATEGORIES;

        if ($type && $category && ! in_array($category, $allowed, true)) {
            throw ValidationException::withMessages([
                'category' => ["'{$category}' is not a valid category for a {$type} transaction. Allowed: " . implode(', ', $allowed)],
            ]);
        }

        // Cross-farm ownership checks: every optional reference must belong to the
        // SAME farm as the transaction. On update, anything not sent falls back to
        // what is already stored.
        $farmId = $validated['farm_id'] ?? $existing?->farm_id;

        $fieldId = array_key_exists('field_id', $validated) ? $validated['field_id'] : $existing?->field_id;
        $employeeId = array_key_exists('employee_id', $validated) ? $validated['employee_id'] : $existing?->employee_id;
        $livestockId = array_key_exists('livestock_id', $validated) ? $validated['livestock_id'] : $existing?->livestock_id;
        $resourceTransactionId = array_key_exists('resource_transaction_id', $validated) ? $validated['resource_transaction_id'] : $existing?->resource_transaction_id;

        $this->assertFieldBelongsToFarm($fieldId, $farmId);
        $this->assertEmployeeBelongsToFarm($employeeId, $farmId);
        $this->assertLivestockBelongsToFarm($livestockId, $farmId);
        $this->assertResourceTransactionBelongsToFarm($resourceTransactionId, $farmId);

        return $validated;
    }

    private function assertFieldBelongsToFarm(?int $fieldId, ?int $farmId): void
    {
        if ($fieldId === null) {
            return;
        }

        if (! DB::table('fields')->where('id', $fieldId)->where('farm_id', $farmId)->exists()) {
            throw ValidationException::withMessages([
                'field_id' => ['The selected field does not belong to the selected farm.'],
            ]);
        }
    }

    private function assertEmployeeBelongsToFarm(?int $employeeId, ?int $farmId): void
    {
        if ($employeeId === null) {
            return;
        }

        if (! DB::table('employees')->where('id', $employeeId)->where('farm_id', $farmId)->exists()) {
            throw ValidationException::withMessages([
                'employee_id' => ['The selected employee does not belong to the selected farm.'],
            ]);
        }
    }

    private function assertLivestockBelongsToFarm(?int $livestockId, ?int $farmId): void
    {
        if ($livestockId === null) {
            return;
        }

        if (! DB::table('livestock')->where('id', $livestockId)->where('farm_id', $farmId)->exists()) {
            throw ValidationException::withMessages([
                'livestock_id' => ['The selected livestock record does not belong to the selected farm.'],
            ]);
        }
    }

    private function assertResourceTransactionBelongsToFarm(?int $resourceTransactionId, ?int $farmId): void
    {
        if ($resourceTransactionId === null) {
            return;
        }

        // A resource_transaction has no farm_id of its own: it belongs to a resource,
        // which belongs to a farm. Join through resources to check.
        $row = DB::table('resource_transactions')
            ->join('resources', 'resources.id', '=', 'resource_transactions.resource_id')
            ->where('resource_transactions.id', $resourceTransactionId)
            ->where('resources.farm_id', $farmId)
            ->select('resource_transactions.type')
            ->first();

        if ($row === null) {
            throw ValidationException::withMessages([
                'resource_transaction_id' => ['The selected resource transaction does not belong to the selected farm.'],
            ]);
        }

        // Only a purchase (stock-in) can be a cost; a stock-out is just stock being used.
        if ($row->type !== 'stock_in') {
            throw ValidationException::withMessages([
                'resource_transaction_id' => ['Only a stock-in (purchase) can be linked to a financial transaction.'],
            ]);
        }
    }
}
