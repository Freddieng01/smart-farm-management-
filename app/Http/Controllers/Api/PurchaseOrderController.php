<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use Illuminate\Http\Request;

class PurchaseOrderController extends Controller
{
    public function index(Request $request)
    {
        $query = PurchaseOrder::query();

        if ($request->has('farm_id')) {
            $query->where('farm_id', $request->input('farm_id'));
        }
        if ($request->has('approval_status')) {
            $query->where('approval_status', $request->input('approval_status'));
        }

        return response()->json($query->with(['supplier', 'items'])->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'farm_id' => 'required|exists:farms,id',
            'supplier_id' => 'required|exists:suppliers,id',
            'order_number' => 'required|string|max:255|unique:purchase_orders,order_number',
            'order_date' => 'required|date',
            'approval_status' => 'nullable|in:Pending,Approved,Rejected',
            'fulfillment_status' => 'nullable|in:Pending,Received,Cancelled',
        ]);

        $purchaseOrder = PurchaseOrder::create($validated);

        return response()->json($purchaseOrder, 201);
    }

    public function show(PurchaseOrder $purchaseOrder)
    {
        return response()->json($purchaseOrder->load(['supplier', 'items', 'payments']));
    }

    public function update(Request $request, PurchaseOrder $purchaseOrder)
    {
        $validated = $request->validate([
            'supplier_id' => 'sometimes|exists:suppliers,id',
            'order_date' => 'sometimes|date',
            'approval_status' => 'sometimes|in:Pending,Approved,Rejected',
            'fulfillment_status' => 'sometimes|in:Pending,Received,Cancelled',
        ]);

        $purchaseOrder->update($validated);

        return response()->json($purchaseOrder);
    }

    public function destroy(PurchaseOrder $purchaseOrder)
    {
        $purchaseOrder->delete();

        return response()->json(null, 204);
    }
}