<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FinancialTransaction;
use App\Models\PurchaseOrder;
use App\Models\PurchasePayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchasePaymentController extends Controller
{
    public function index(PurchaseOrder $purchaseOrder)
    {
        return response()->json($purchaseOrder->payments);
    }

    /**
     * Paying a supplier also records the expense in the finance ledger.
     */
    public function store(Request $request, PurchaseOrder $purchaseOrder)
    {
        $validated = $request->validate([
            'amount_paid' => 'required|numeric|min:0.01|max:9999999999.99',
            'payment_date' => 'required|date|before_or_equal:today',
            'payment_method' => 'nullable|in:Cash,Bank Transfer,Mobile Money',
        ]);

        $payment = DB::transaction(function () use ($purchaseOrder, $validated, $request) {
            $payment = $purchaseOrder->payments()->create($validated);

            FinancialTransaction::create([
                'farm_id' => $purchaseOrder->farm_id,
                'purchase_payment_id' => $payment->id,
                'type' => 'expense',
                'category' => 'input_cost',
                'description' => mb_substr("Payment for purchase order {$purchaseOrder->order_number}", 0, 255),
                'amount' => $validated['amount_paid'],
                'transaction_date' => $validated['payment_date'],
                'recorded_by' => $request->user()->id,
            ]);

            return $payment;
        });

        return response()->json($payment, 201);
    }

    public function show(PurchasePayment $purchasePayment)
    {
        return response()->json($purchasePayment);
    }

    public function update(Request $request, PurchasePayment $purchasePayment)
    {
        $validated = $request->validate([
            'amount_paid' => 'sometimes|numeric|min:0.01|max:9999999999.99',
            'payment_date' => 'sometimes|date|before_or_equal:today',
            'payment_method' => 'sometimes|in:Cash,Bank Transfer,Mobile Money',
        ]);

        DB::transaction(function () use ($purchasePayment, $validated) {
            $purchasePayment->update($validated);

            $changes = [];
            if (array_key_exists('amount_paid', $validated)) {
                $changes['amount'] = $validated['amount_paid'];
            }
            if (array_key_exists('payment_date', $validated)) {
                $changes['transaction_date'] = $validated['payment_date'];
            }
            if ($changes !== []) {
                FinancialTransaction::where('purchase_payment_id', $purchasePayment->id)->update($changes);
            }
        });

        return response()->json($purchasePayment);
    }

    public function destroy(PurchasePayment $purchasePayment)
    {
        // the linked ledger row is removed by the database (cascade on purchase_payment_id)
        $purchasePayment->delete();

        return response()->json(null, 204);
    }
}
