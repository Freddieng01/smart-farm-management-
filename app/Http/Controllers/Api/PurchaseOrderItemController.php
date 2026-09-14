<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use Illuminate\Http\Request;

class PurchaseOrderItemController extends Controller
{
    public function index(PurchaseOrder $purchaseOrder)
    {
        return response()->json($purchaseOrder->items);
    }

    public function store(Request $request, PurchaseOrder $purchaseOrder)
    {
        $validated = $request->validate([
            'item_name' => 'required|string|max:255',
            'quantity' => 'required|numeric',
            'unit' => 'nullable|string|max:255',
            'unit_price' => 'required|numeric',
        ]);

        $item = $purchaseOrder->items()->create($validated);

        return response()->json($item, 201);
    }

    public function show(PurchaseOrderItem $purchaseOrderItem)
    {
        return response()->json($purchaseOrderItem);
    }

    public function update(Request $request, PurchaseOrderItem $purchaseOrderItem)
    {
        $validated = $request->validate([
            'item_name' => 'sometimes|string|max:255',
            'quantity' => 'sometimes|numeric',
            'unit' => 'nullable|string|max:255',
            'unit_price' => 'sometimes|numeric',
        ]);

        $purchaseOrderItem->update($validated);

        return response()->json($purchaseOrderItem);
    }

    public function destroy(PurchaseOrderItem $purchaseOrderItem)
    {
        $purchaseOrderItem->delete();

        return response()->json(null, 204);
    }
}