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
    public function index(Request $request): JsonResponse
    {
        $transactions = FinancialTransaction::with(['farm:id,name', 'field:id,name', 'employee:id,user_id', 'recordedBy:id,name'])
            ->when($request->filled('farm_id'), fn ($q) => $q->where('farm_id', $request->integer('farm_id')))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('transaction_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('transaction_date', '<=', $request->date('to')))
            ->latest('transaction_date')
            ->paginate(25);

        return response()->json($transactions);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatedPayload($request);

        $transaction = FinancialTransaction::create([
            ...$validated,
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
            'farm_id' => [$req, 'exists:farms,id'],
            'field_id' => ['nullable', 'exists:fields,id'],
            'employee_id' => ['nullable', 'exists:employees,id'],
            'livestock_id' => ['nullable', 'exists:livestock,id'],
            'resource_transaction_id' => ['nullable', 'exists:resource_transactions,id'],
            'type' => [$req, Rule::in(['income', 'expense'])],
            'category' => [$req, 'string'],
            'description' => ['nullable', 'string', 'max:255'],
            'amount' => [$req, 'numeric', 'min:0.01'],
            'transaction_date' => [$req, 'date', 'before_or_equal:today'],
        ];

        $validated = $request->validate($rules);

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

        // Cross-farm ownership checks: every optional reference on this
        // transaction must belong to the SAME farm as the transaction itself,
        // not just exist somewhere in the database. On update, any reference
        // not present in this request falls back to what's already stored.
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

        // Assumes the livestock table has a farm_id column, per the confirmed
        // "Livestock belongs to Farm through farm_id" relationship.
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

        // A resource_transaction has no farm_id of its own - it belongs to a
        // resource, which belongs to a farm. Join through resources to check.
        $belongs = DB::table('resource_transactions')
            ->join('resources', 'resources.id', '=', 'resource_transactions.resource_id')
            ->where('resource_transactions.id', $resourceTransactionId)
            ->where('resources.farm_id', $farmId)
            ->exists();

        if (! $belongs) {
            throw ValidationException::withMessages([
                'resource_transaction_id' => ['The selected resource transaction does not belong to the selected farm.'],
            ]);
        }
    }
}
