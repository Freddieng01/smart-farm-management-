<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SalesOrder;
use Illuminate\Http\Request;

class SalesOrderController extends Controller
{
    public function index(Request $request)
    {
        $query = SalesOrder::query();

        if ($request->has('farm_id')) {
            $query->where('farm_id', $request->input('farm_id'));
        }
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json($query->with(['customer', 'items'])->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'farm_id' => 'required|exists:farms,id',
            'customer_id' => 'required|exists:customers,id',
            'order_number' => 'required|string|max:255|unique:sales_orders,order_number',
            'order_date' => 'required|date',
            'status' => 'nullable|in:Pending,Fulfilled,Cancelled',
            'is_contract_farming' => 'nullable|boolean',
            'agreement_notes' => 'nullable|string',
        ]);

        $salesOrder = SalesOrder::create($validated);

        return response()->json($salesOrder, 201);
    }

    public function show(SalesOrder $salesOrder)
    {
        return response()->json($salesOrder->load(['customer', 'items', 'invoice']));
    }

    public function update(Request $request, SalesOrder $salesOrder)
    {
        $validated = $request->validate([
            'customer_id' => 'sometimes|exists:customers,id',
            'order_date' => 'sometimes|date',
            'status' => 'sometimes|in:Pending,Fulfilled,Cancelled',
            'is_contract_farming' => 'nullable|boolean',
            'agreement_notes' => 'nullable|string',
        ]);

        $salesOrder->update($validated);

        return response()->json($salesOrder);
    }

    public function destroy(SalesOrder $salesOrder)
    {
        $salesOrder->delete();

        return response()->json(null, 204);
    }
}