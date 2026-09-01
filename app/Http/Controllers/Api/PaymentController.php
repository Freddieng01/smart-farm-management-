<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(Invoice $invoice)
    {
        return response()->json($invoice->payments);
    }

    public function store(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
            'amount_paid' => 'required|numeric',
            'payment_date' => 'required|date',
            'payment_method' => 'nullable|in:Cash,Bank Transfer,Mobile Money',
        ]);

        $payment = $invoice->payments()->create($validated);

        return response()->json($payment, 201);
    }

    public function show(Payment $payment)
    {
        return response()->json($payment);
    }

    public function update(Request $request, Payment $payment)
    {
        $validated = $request->validate([
            'amount_paid' => 'sometimes|numeric',
            'payment_date' => 'sometimes|date',
            'payment_method' => 'sometimes|in:Cash,Bank Transfer,Mobile Money',
        ]);

        $payment->update($validated);

        return response()->json($payment);
    }

    public function destroy(Payment $payment)
    {
        $payment->delete();

        return response()->json(null, 204);
    }
}