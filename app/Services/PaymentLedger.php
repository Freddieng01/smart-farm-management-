<?php

namespace App\Services;

use App\Models\FinancialTransaction;
use App\Models\Payment;
use App\Models\PurchasePayment;

/**
 * Posts every customer payment and supplier payment to the finance ledger
 * (financial_transactions), so Financial Management always matches Sales and Suppliers.
 *
 * One payment <-> one ledger row. Calling record*() again updates that row instead of
 * adding a second one, and forget*() removes it.
 */
class PaymentLedger
{
    /** Money received from a customer -> income. */
    public function recordCustomerPayment(Payment $payment, ?int $userId = null): FinancialTransaction
    {
        $payment = $payment->fresh() ?? $payment;
        $invoice = $payment->invoice()->with('salesOrder.customer')->firstOrFail();
        $order = $invoice->salesOrder;

        return $this->save(
            ['payment_id' => $payment->id],
            [
                'farm_id' => $order->farm_id,
                'type' => 'income',
                'category' => 'sale_income',
                'amount' => $payment->amount_paid,
                'transaction_date' => $payment->payment_date,
                'description' => 'Payment from '.($order->customer?->name ?: 'customer')
                    ." - invoice {$invoice->invoice_number} ({$payment->payment_method})",
            ],
            $userId
        );
    }

    /** Money paid to a supplier -> expense. */
    public function recordSupplierPayment(PurchasePayment $payment, ?int $userId = null): FinancialTransaction
    {
        $payment = $payment->fresh() ?? $payment;
        $order = $payment->purchaseOrder()->with('supplier')->firstOrFail();

        return $this->save(
            ['purchase_payment_id' => $payment->id],
            [
                'farm_id' => $order->farm_id,
                'type' => 'expense',
                'category' => 'input_cost',
                'amount' => $payment->amount_paid,
                'transaction_date' => $payment->payment_date,
                'description' => 'Payment to '.($order->supplier?->name ?: 'supplier')
                    ." - order {$order->order_number} ({$payment->payment_method})",
            ],
            $userId
        );
    }

    public function forgetCustomerPayments(iterable $paymentIds): void
    {
        FinancialTransaction::withoutGlobalScopes()->whereIn('payment_id', collect($paymentIds)->all())->delete();
    }

    public function forgetSupplierPayments(iterable $paymentIds): void
    {
        FinancialTransaction::withoutGlobalScopes()->whereIn('purchase_payment_id', collect($paymentIds)->all())->delete();
    }

    private function save(array $link, array $values, ?int $userId): FinancialTransaction
    {
        // Look the row up without the farm-access scope: it is keyed by the payment, not by the viewer.
        $entry = FinancialTransaction::withoutGlobalScopes()->firstOrNew($link);

        $entry->fill($values);
        $entry->description = mb_substr($entry->description, 0, 255);

        if (! $entry->exists) {
            $entry->recorded_by = $userId;
        }

        $entry->save();

        return $entry;
    }
}
