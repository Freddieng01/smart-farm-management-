<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ResourceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $resources = Resource::with(['farm:id,name', 'field:id,name'])
            ->when($request->filled('farm_id'), fn ($q) => $q->where('farm_id', $request->integer('farm_id')))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')))
            ->latest()
            ->paginate(25);

        return response()->json($resources);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'farm_id' => ['required', 'exists:farms,id'],
            'field_id' => ['nullable', 'exists:fields,id'],
            'name' => ['required', 'string', 'max:255', Rule::unique('resources', 'name')->where('farm_id', $request->integer('farm_id'))],
            'category' => ['required', 'string', Rule::in(['seeds', 'fertilizer', 'chemical', 'feed', 'medicine', 'packaging', 'fuel', 'tool'])],
            'unit' => ['required', 'string', 'max:20'],
            'quantity' => ['sometimes', 'numeric', 'min:0'],
            'minimum_stock' => ['sometimes', 'numeric', 'min:0'],
            'unit_cost' => ['sometimes', 'numeric', 'min:0'],
            'expiry_date' => ['nullable', 'date'],
        ]);

        $this->assertFieldBelongsToFarm($validated['field_id'] ?? null, $validated['farm_id']);

        $resource = Resource::create($validated);

        return response()->json([
            'message' => 'Resource created successfully.',
            'data' => $resource->load(['farm:id,name', 'field:id,name']),
        ], 201);
    }

    public function show(Resource $resource): JsonResponse
    {
        return response()->json([
            'data' => $resource->load(['farm:id,name', 'field:id,name', 'transactions' => fn ($q) => $q->latest()->limit(20)]),
        ]);
    }

    public function update(Request $request, Resource $resource): JsonResponse
    {
        $validated = $request->validate([
            'farm_id' => ['sometimes', 'required', 'exists:farms,id'],
            'field_id' => ['sometimes', 'nullable', 'exists:fields,id'],
            'name' => [
                'sometimes', 'required', 'string', 'max:255',
                Rule::unique('resources', 'name')
                    ->where('farm_id', $request->integer('farm_id') ?: $resource->farm_id)
                    ->ignore($resource),
            ],
            'category' => ['sometimes', 'required', 'string', Rule::in(['seeds', 'fertilizer', 'chemical', 'feed', 'medicine', 'packaging', 'fuel', 'tool'])],
            'unit' => ['sometimes', 'required', 'string', 'max:20'],
            'minimum_stock' => ['sometimes', 'numeric', 'min:0'],
            'unit_cost' => ['sometimes', 'numeric', 'min:0'],
            'expiry_date' => ['sometimes', 'nullable', 'date'],
        ]);

        $farmId = $validated['farm_id'] ?? $resource->farm_id;
        $fieldId = array_key_exists('field_id', $validated) ? $validated['field_id'] : $resource->field_id;
        $this->assertFieldBelongsToFarm($fieldId, $farmId);

        // quantity is intentionally NOT editable here - it only changes via stock-in/stock-out
        // so the resources.quantity value always matches the resource_transactions ledger.
        $resource->update($validated);

        return response()->json([
            'message' => 'Resource updated successfully.',
            'data' => $resource->fresh(['farm:id,name', 'field:id,name']),
        ]);
    }

    public function destroy(Resource $resource): JsonResponse
    {
        $resource->delete();

        return response()->json([
            'message' => 'Resource deleted successfully.',
        ]);
    }

    public function stockIn(Request $request, Resource $resource): JsonResponse
    {
        $validated = $request->validate([
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'reason' => ['nullable', 'string', 'max:255'],
            'livestock_id' => ['nullable', 'exists:livestock,id'],
        ]);

        $this->assertLivestockBelongsToFarm($validated['livestock_id'] ?? null, $resource->farm_id);

        $transaction = DB::transaction(function () use ($validated, $resource, $request) {
            $txn = $resource->transactions()->create([
                'livestock_id' => $validated['livestock_id'] ?? null,
                'type' => 'stock_in',
                'quantity' => $validated['quantity'],
                'unit_cost' => $validated['unit_cost'] ?? $resource->unit_cost,
                'reason' => $validated['reason'] ?? null,
                'recorded_by' => $request->user()->id,
            ]);

            $resource->increment('quantity', $validated['quantity']);

            if (array_key_exists('unit_cost', $validated) && $validated['unit_cost'] !== null) {
                $resource->update(['unit_cost' => $validated['unit_cost']]);
            }

            return $txn;
        });

        return response()->json([
            'message' => 'Stock-in recorded successfully.',
            'data' => [
                'transaction' => $transaction,
                'resource' => $resource->fresh(),
            ],
        ], 201);
    }

    public function stockOut(Request $request, Resource $resource): JsonResponse
    {
        $validated = $request->validate([
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['nullable', 'string', 'max:255'],
            'livestock_id' => ['nullable', 'exists:livestock,id'],
        ]);

        $this->assertLivestockBelongsToFarm($validated['livestock_id'] ?? null, $resource->farm_id);

        if ($validated['quantity'] > $resource->quantity) {
            throw ValidationException::withMessages([
                'quantity' => ["Cannot remove {$validated['quantity']} {$resource->unit} - only {$resource->quantity} {$resource->unit} in stock."],
            ]);
        }

        $transaction = DB::transaction(function () use ($validated, $resource, $request) {
            $txn = $resource->transactions()->create([
                'livestock_id' => $validated['livestock_id'] ?? null,
                'type' => 'stock_out',
                'quantity' => $validated['quantity'],
                'unit_cost' => null,
                'reason' => $validated['reason'] ?? null,
                'recorded_by' => $request->user()->id,
            ]);

            $resource->decrement('quantity', $validated['quantity']);

            return $txn;
        });

        return response()->json([
            'message' => 'Stock-out recorded successfully.',
            'data' => [
                'transaction' => $transaction,
                'resource' => $resource->fresh(),
            ],
        ], 201);
    }

    public function lowStock(Request $request): JsonResponse
    {
        $resources = Resource::lowStock()
            ->with(['farm:id,name', 'field:id,name'])
            ->when($request->filled('farm_id'), fn ($q) => $q->where('farm_id', $request->integer('farm_id')))
            ->get();

        return response()->json(['data' => $resources]);
    }

    public function expiring(Request $request): JsonResponse
    {
        $days = $request->integer('days') ?: 14;

        $expired = Resource::expired()
            ->with(['farm:id,name', 'field:id,name'])
            ->when($request->filled('farm_id'), fn ($q) => $q->where('farm_id', $request->integer('farm_id')))
            ->get();

        $expiringSoon = Resource::expiringSoon($days)
            ->with(['farm:id,name', 'field:id,name'])
            ->when($request->filled('farm_id'), fn ($q) => $q->where('farm_id', $request->integer('farm_id')))
            ->get();

        return response()->json([
            'data' => [
                'expired' => $expired,
                'expiring_soon' => $expiringSoon,
                'window_days' => $days,
            ],
        ]);
    }

    /**
     * A field, if supplied, must belong to the same farm as the resource.
     * Mirrors the scoped-validation style already used in FieldController/EmployeeController.
     */
    private function assertFieldBelongsToFarm(?int $fieldId, int $farmId): void
    {
        if ($fieldId === null) {
            return;
        }

        $belongs = DB::table('fields')->where('id', $fieldId)->where('farm_id', $farmId)->exists();

        if (! $belongs) {
            throw ValidationException::withMessages([
                'field_id' => ['The selected field does not belong to the selected farm.'],
            ]);
        }
    }

    /**
     * A livestock reference on a stock-in/stock-out must belong to the same
     * farm as the resource itself - prevents logging feed/medicine usage
     * against an animal on a different farm.
     */
    private function assertLivestockBelongsToFarm(?int $livestockId, int $farmId): void
    {
        if ($livestockId === null) {
            return;
        }

        $belongs = DB::table('livestock')->where('id', $livestockId)->where('farm_id', $farmId)->exists();

        if (! $belongs) {
            throw ValidationException::withMessages([
                'livestock_id' => ['The selected livestock record does not belong to the selected farm.'],
            ]);
        }
    }
}
