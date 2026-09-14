<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\PurchasePayment;
use Illuminate\Http\Request;

class PurchasePaymentController extends Controller
{
    public function index(PurchaseOrder $purchaseOrder)
    {
        return response()->json($purchaseOrder->payments);
    }

    public function store(Request $request, PurchaseOrder $purchaseOrder)
    {
        $validated = $request->validate([
            'amount_paid' => 'required|numeric',
            'payment_date' => 'required|date',
            'payment_method' => 'nullable|in:Cash,Bank Transfer,Mobile Money',
        ]);

        $payment = $purchaseOrder->payments()->create($validated);

        return response()->json($payment, 201);
    }

    public function show(PurchasePayment $purchasePayment)
    {
        return response()->json($purchasePayment);
    }

    public function update(Request $request, PurchasePayment $purchasePayment)
    {
        $validated = $request->validate([
            'amount_paid' => 'sometimes|numeric',
            'payment_date' => 'sometimes|date',
            'payment_method' => 'sometimes|in:Cash,Bank Transfer,Mobile Money',
        ]);

        $purchasePayment->update($validated);

        return response()->json($purchasePayment);
    }

    public function destroy(PurchasePayment $purchasePayment)
    {
        $purchasePayment->delete();

        return response()->json(null, 204);
    }
}