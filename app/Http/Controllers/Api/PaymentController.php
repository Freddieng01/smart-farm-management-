<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FinancialTransaction;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    public function index(Invoice $invoice)
    {
        return response()->json($invoice->payments);
    }

    /**
     * Recording a customer payment also records the income in the finance
     * ledger, in one step, so Sales and Finance can never disagree.
     */
    public function store(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
            'amount_paid' => 'required|numeric|min:0.01|max:9999999999.99',
            'payment_date' => 'required|date|before_or_equal:today',
            'payment_method' => 'nullable|in:Cash,Bank Transfer,Mobile Money',
        ]);

        $payment = DB::transaction(function () use ($invoice, $validated, $request) {
            $payment = $invoice->payments()->create($validated);

            $invoice->loadMissing('salesOrder');
            FinancialTransaction::create([
                'farm_id' => $invoice->salesOrder->farm_id,
                'payment_id' => $payment->id,
                'type' => 'income',
                'category' => 'sale_income',
                'description' => mb_substr("Payment for invoice {$invoice->invoice_number}", 0, 255),
                'amount' => $validated['amount_paid'],
                'transaction_date' => $validated['payment_date'],
                'recorded_by' => $request->user()->id,
            ]);

            return $payment;
        });

        return response()->json($payment, 201);
    }

    public function show(Payment $payment)
    {
        return response()->json($payment);
    }

    public function update(Request $request, Payment $payment)
    {
        $validated = $request->validate([
            'amount_paid' => 'sometimes|numeric|min:0.01|max:9999999999.99',
            'payment_date' => 'sometimes|date|before_or_equal:today',
            'payment_method' => 'sometimes|in:Cash,Bank Transfer,Mobile Money',
        ]);

        DB::transaction(function () use ($payment, $validated) {
            $payment->update($validated);

            $changes = [];
            if (array_key_exists('amount_paid', $validated)) {
                $changes['amount'] = $validated['amount_paid'];
            }
            if (array_key_exists('payment_date', $validated)) {
                $changes['transaction_date'] = $validated['payment_date'];
            }
            if ($changes !== []) {
                FinancialTransaction::where('payment_id', $payment->id)->update($changes);
            }
        });

        return response()->json($payment);
    }

    public function destroy(Payment $payment)
    {
        // the linked ledger row is removed by the database (cascade on payment_id)
        $payment->delete();

        return response()->json(null, 204);
    }
}
