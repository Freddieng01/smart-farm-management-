<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Farm;
use App\Models\FinancialTransaction;
use App\Models\Invoice;
use App\Models\PurchaseOrder;
use App\Models\Resource;
use App\Models\SalesOrder;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Money received or paid must land in the finance ledger by itself, exactly once. */
class CashFlowLedgerTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Farm $farm;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = $this->makeUser(['role' => 'Farm-owner', 'name' => 'Owner']);
        $this->farm = Farm::create(['name' => 'Owner Farm', 'total_acreage' => 100, 'owner_id' => $this->owner->id]);
        Sanctum::actingAs($this->owner);
    }

    private function invoice(): Invoice
    {
        $customer = Customer::create(['farm_id' => $this->farm->id, 'name' => 'Buyer']);
        $order = SalesOrder::create([
            'farm_id' => $this->farm->id,
            'customer_id' => $customer->id,
            'order_number' => 'SO-' . uniqid(),
            'order_date' => now()->toDateString(),
            'status' => 'Fulfilled',
        ]);

        return Invoice::create([
            'sales_order_id' => $order->id,
            'invoice_number' => 'INV-1',
            'total_amount' => 1000,
            'due_date' => now()->addDays(14)->toDateString(),
            'status' => 'Unpaid',
        ]);
    }

    private function purchaseOrder(): PurchaseOrder
    {
        $supplier = Supplier::create(['farm_id' => $this->farm->id, 'name' => 'Agro Supplies']);

        return PurchaseOrder::create([
            'farm_id' => $this->farm->id,
            'supplier_id' => $supplier->id,
            'order_number' => 'PO-' . uniqid(),
            'order_date' => now()->toDateString(),
        ]);
    }

    public function test_a_customer_payment_becomes_income_in_the_ledger(): void
    {
        $invoice = $this->invoice();

        $this->postJson("/api/invoices/{$invoice->id}/payments", [
            'amount_paid' => 400,
            'payment_date' => now()->toDateString(),
            'payment_method' => 'Cash',
        ])->assertCreated();

        $this->assertDatabaseHas('financial_transactions', [
            'farm_id' => $this->farm->id,
            'type' => 'income',
            'category' => 'sale_income',
            'amount' => 400,
        ]);
        $this->assertSame(1, FinancialTransaction::whereNotNull('payment_id')->count());
    }

    public function test_changing_or_deleting_the_payment_keeps_the_ledger_in_step(): void
    {
        $invoice = $this->invoice();
        $paymentId = $this->postJson("/api/invoices/{$invoice->id}/payments", [
            'amount_paid' => 400,
            'payment_date' => now()->toDateString(),
        ])->json('id');

        $this->putJson("/api/payments/{$paymentId}", ['amount_paid' => 650])->assertOk();
        $this->assertSame('650.00', FinancialTransaction::where('payment_id', $paymentId)->value('amount'));

        $this->deleteJson("/api/payments/{$paymentId}")->assertNoContent();
        $this->assertSame(0, FinancialTransaction::where('type', 'income')->count());
    }

    public function test_a_supplier_payment_becomes_an_expense_in_the_ledger(): void
    {
        $order = $this->purchaseOrder();

        $this->postJson("/api/purchase-orders/{$order->id}/payments", [
            'amount_paid' => 250,
            'payment_date' => now()->toDateString(),
        ])->assertCreated();

        $this->assertDatabaseHas('financial_transactions', [
            'farm_id' => $this->farm->id,
            'type' => 'expense',
            'category' => 'input_cost',
            'amount' => 250,
        ]);
    }

    public function test_an_invalid_payment_records_nothing(): void
    {
        $invoice = $this->invoice();

        $this->postJson("/api/invoices/{$invoice->id}/payments", [
            'amount_paid' => 0,
            'payment_date' => now()->toDateString(),
        ])->assertUnprocessable();

        $this->assertSame(0, FinancialTransaction::count());
    }

    public function test_ledger_rows_made_by_a_payment_cannot_be_edited_or_deleted_in_the_ledger(): void
    {
        $invoice = $this->invoice();
        $this->postJson("/api/invoices/{$invoice->id}/payments", [
            'amount_paid' => 400,
            'payment_date' => now()->toDateString(),
        ])->assertCreated();

        $row = FinancialTransaction::whereNotNull('payment_id')->firstOrFail();

        $this->deleteJson("/api/financial-transactions/{$row->id}")->assertUnprocessable();
        $this->putJson("/api/financial-transactions/{$row->id}", ['amount' => 1])->assertUnprocessable();
        $this->assertDatabaseHas('financial_transactions', ['id' => $row->id, 'amount' => 400]);
    }

    public function test_a_cash_stock_purchase_can_be_recorded_as_an_expense(): void
    {
        $resource = Resource::create([
            'farm_id' => $this->farm->id,
            'name' => 'Maize seed',
            'category' => 'seed',
            'unit' => 'kg',
            'quantity' => 0,
        ]);

        $this->postJson("/api/resources/{$resource->id}/stock-in", [
            'quantity' => 10,
            'unit_cost' => 5,
            'record_expense' => true,
        ])->assertCreated();

        $this->assertDatabaseHas('financial_transactions', [
            'farm_id' => $this->farm->id,
            'type' => 'expense',
            'amount' => 50,
        ]);
    }

    public function test_stock_in_without_the_flag_does_not_touch_the_ledger(): void
    {
        $resource = Resource::create([
            'farm_id' => $this->farm->id,
            'name' => 'Fertiliser',
            'category' => 'fertilizer',
            'unit' => 'kg',
            'quantity' => 0,
        ]);

        $this->postJson("/api/resources/{$resource->id}/stock-in", ['quantity' => 10, 'unit_cost' => 5])->assertCreated();

        $this->assertSame(0, FinancialTransaction::count());
    }
}
