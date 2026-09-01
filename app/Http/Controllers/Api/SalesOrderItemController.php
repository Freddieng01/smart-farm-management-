<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use Illuminate\Http\Request;

class SalesOrderItemController extends Controller
{
    public function index(SalesOrder $salesOrder)
    {
        return response()->json($salesOrder->items);
    }

    public function store(Request $request, SalesOrder $salesOrder)
    {
        $validated = $request->validate([
            'crop_name' => 'required|string|max:255',
            'quantity' => 'required|numeric',
            'unit' => 'nullable|string|max:255',
            'unit_price' => 'required|numeric',
            'production_cost' => 'nullable|numeric',
        ]);

        $item = $salesOrder->items()->create($validated);

        return response()->json($item, 201);
    }

    public function show(SalesOrderItem $salesOrderItem)
    {
        return response()->json($salesOrderItem);
    }

    public function update(Request $request, SalesOrderItem $salesOrderItem)
    {
        $validated = $request->validate([
            'crop_name' => 'sometimes|string|max:255',
            'quantity' => 'sometimes|numeric',
            'unit' => 'nullable|string|max:255',
            'unit_price' => 'sometimes|numeric',
            'production_cost' => 'nullable|numeric',
        ]);

        $salesOrderItem->update($validated);

        return response()->json($salesOrderItem);
    }

    public function destroy(SalesOrderItem $salesOrderItem)
    {
        $salesOrderItem->delete();

        return response()->json(null, 204);
    }
}