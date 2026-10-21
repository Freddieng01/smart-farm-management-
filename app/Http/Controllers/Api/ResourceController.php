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
    private const CATEGORIES = ['seeds', 'fertilizer', 'chemical', 'feed', 'medicine', 'packaging', 'fuel', 'tool'];

    // quantity / minimum_stock are decimal(12,2): max 2 decimals, max 9,999,999,999.99
    private const STOCK_RULES = ['numeric', 'decimal:0,2', 'min:0', 'max:9999999999.99'];

    // unit_cost is decimal(10,2)
    private const COST_RULES = ['numeric', 'decimal:0,2', 'min:0', 'max:99999999.99'];

    // a stock movement must move a real amount (at least 0.01)
    private const MOVEMENT_RULES = ['numeric', 'decimal:0,2', 'min:0.01', 'max:9999999999.99'];

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'farm_id' => ['sometimes', 'integer'],
            'category' => ['sometimes', Rule::in(self::CATEGORIES)],
        ]);

        $resources = Resource::with(['farm:id,name', 'field:id,name'])
            ->when(isset($filters['farm_id']), fn ($q) => $q->where('farm_id', $filters['farm_id']))
            ->when(isset($filters['category']), fn ($q) => $q->where('category', $filters['category']))
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
            'category' => ['required', 'string', Rule::in(self::CATEGORIES)],
            'unit' => ['required', 'string', 'max:20'],
            'quantity' => ['sometimes', ...self::STOCK_RULES],
            'minimum_stock' => ['sometimes', ...self::STOCK_RULES],
            'unit_cost' => ['sometimes', ...self::COST_RULES],
            'expiry_date' => ['nullable', 'date'],
        ]);

        $this->assertFieldBelongsToFarm($validated['field_id'] ?? null, $validated['farm_id']);

        // Resource + its opening-balance ledger row are saved together, so the
        // stock balance always has a matching entry in resource_transactions.
        $resource = DB::transaction(function () use ($validated, $request) {
            $resource = Resource::create($validated);

            if ((float) ($validated['quantity'] ?? 0) > 0) {
                $resource->transactions()->create([
                    'type' => 'stock_in',
                    'quantity' => $validated['quantity'],
                    'unit_cost' => $validated['unit_cost'] ?? 0,
                    'reason' => 'Opening balance',
                    'recorded_by' => $request->user()->id,
                ]);
            }

            return $resource;
        });

        return response()->json([
            'message' => 'Resource created successfully.',
            'data' => $resource->fresh(['farm:id,name', 'field:id,name']),
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
            // A resource never moves to another farm (its history and finance links belong to one farm).
            'farm_id' => ['prohibited'],
            // Stock changes ONLY through stock-in / stock-out so the ledger always matches.
            'quantity' => ['prohibited'],
            'field_id' => ['sometimes', 'nullable', 'exists:fields,id'],
            'name' => [
                'sometimes', 'required', 'string', 'max:255',
                Rule::unique('resources', 'name')->where('farm_id', $resource->farm_id)->ignore($resource),
            ],
            'category' => ['sometimes', 'required', 'string', Rule::in(self::CATEGORIES)],
            'unit' => ['sometimes', 'required', 'string', 'max:20'],
            'minimum_stock' => ['sometimes', ...self::STOCK_RULES],
            'unit_cost' => ['sometimes', ...self::COST_RULES],
            'expiry_date' => ['sometimes', 'nullable', 'date'],
        ]);

        if (array_key_exists('field_id', $validated)) {
            $this->assertFieldBelongsToFarm($validated['field_id'], $resource->farm_id);
        }

        $resource->update($validated);

        return response()->json([
            'message' => 'Resource updated successfully.',
            'data' => $resource->fresh(['farm:id,name', 'field:id,name']),
        ]);
    }

    public function destroy(Resource $resource): JsonResponse
    {
        // Deleting would also delete the stock history (database cascade),
        // so a resource that has history cannot be deleted.
        if ($resource->transactions()->exists()) {
            return response()->json([
                'message' => 'This resource has stock history and cannot be deleted.',
            ], 409);
        }

        $resource->delete();

        return response()->json([
            'message' => 'Resource deleted successfully.',
        ]);
    }

    public function stockIn(Request $request, Resource $resource): JsonResponse
    {
        $validated = $request->validate([
            'quantity' => ['required', ...self::MOVEMENT_RULES],
            'unit_cost' => ['nullable', ...self::COST_RULES],
            'reason' => ['nullable', 'string', 'max:255'],
            'livestock_id' => ['nullable', 'integer', 'exists:livestock,id'],
        ]);

        $this->assertLivestockBelongsToFarm($validated['livestock_id'] ?? null, $resource->farm_id);

        $transaction = DB::transaction(function () use ($validated, $resource, $request) {
            // Atomic "quantity = quantity + X" in SQL (never read-then-write in PHP).
            $extra = isset($validated['unit_cost']) ? ['unit_cost' => $validated['unit_cost']] : [];
            Resource::whereKey($resource->id)->increment('quantity', $validated['quantity'], $extra);

            return $resource->transactions()->create([
                'livestock_id' => $validated['livestock_id'] ?? null,
                'type' => 'stock_in',
                'quantity' => $validated['quantity'],
                'unit_cost' => $validated['unit_cost'] ?? $resource->unit_cost,
                'reason' => $validated['reason'] ?? null,
                'recorded_by' => $request->user()->id,
            ]);
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
            'quantity' => ['required', ...self::MOVEMENT_RULES],
            'reason' => ['nullable', 'string', 'max:255'],
            'livestock_id' => ['nullable', 'integer', 'exists:livestock,id'],
        ]);

        $this->assertLivestockBelongsToFarm($validated['livestock_id'] ?? null, $resource->farm_id);

        $transaction = DB::transaction(function () use ($validated, $resource, $request) {
            // ONE atomic statement: "subtract, but only if enough stock is left".
            // Two requests at the same moment cannot both succeed on the last units.
            $updated = Resource::whereKey($resource->id)
                ->where('quantity', '>=', $validated['quantity'])
                ->decrement('quantity', $validated['quantity']);

            if ($updated === 0) {
                return null;
            }

            return $resource->transactions()->create([
                'livestock_id' => $validated['livestock_id'] ?? null,
                'type' => 'stock_out',
                'quantity' => $validated['quantity'],
                'unit_cost' => null,
                'reason' => $validated['reason'] ?? null,
                'recorded_by' => $request->user()->id,
            ]);
        });

        if ($transaction === null) {
            $available = Resource::whereKey($resource->id)->value('quantity');

            throw ValidationException::withMessages([
                'quantity' => ["Cannot remove {$validated['quantity']} {$resource->unit} - only {$available} {$resource->unit} in stock."],
            ]);
        }

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
        $filters = $request->validate([
            'farm_id' => ['sometimes', 'integer', 'exists:farms,id'],
        ]);

        $resources = Resource::lowStock()
            ->with(['farm:id,name', 'field:id,name'])
            ->when(isset($filters['farm_id']), fn ($q) => $q->where('farm_id', $filters['farm_id']))
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $resources]);
    }

    public function expiring(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'farm_id' => ['sometimes', 'integer', 'exists:farms,id'],
            'days' => ['sometimes', 'integer', 'min:1', 'max:365'],
        ]);

        $days = $filters['days'] ?? 14;

        $expired = Resource::expired()
            ->with(['farm:id,name', 'field:id,name'])
            ->when(isset($filters['farm_id']), fn ($q) => $q->where('farm_id', $filters['farm_id']))
            ->get();

        $expiringSoon = Resource::expiringSoon($days)
            ->with(['farm:id,name', 'field:id,name'])
            ->when(isset($filters['farm_id']), fn ($q) => $q->where('farm_id', $filters['farm_id']))
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
     */
    private function assertFieldBelongsToFarm(?int $fieldId, int $farmId): void
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

    /**
     * A livestock reference on a stock movement must belong to the same farm as the resource.
     */
    private function assertLivestockBelongsToFarm(?int $livestockId, int $farmId): void
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
}
