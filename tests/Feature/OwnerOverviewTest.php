<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Farm;
use App\Models\FinancialTransaction;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\SalesOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OwnerOverviewTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Farm $farm;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = $this->makeUser(['role' => 'Farm-owner', 'name' => 'Owner']);
        $this->farm = Farm::create(['name' => 'Owner Farm', 'total_acreage' => 100, 'owner_id' => $this->owner->id]);
    }

    private function actingAsOwner(): void
    {
        Sanctum::actingAs($this->owner);
    }

    private function ledger(string $type, string $category, float $amount, string $date, ?Farm $farm = null): void
    {
        FinancialTransaction::create([
            'farm_id' => ($farm ?? $this->farm)->id,
            'type' => $type,
            'category' => $category,
            'amount' => $amount,
            'transaction_date' => Carbon::parse($date),
            'recorded_by' => $this->owner->id,
        ]);
    }

    private function overview(array $query = [])
    {
        return $this->getJson('/api/owner/overview?' . http_build_query($query));
    }

    public function test_owner_sees_profit_for_the_year(): void
    {
        $this->ledger('income', 'sale_income', 10000, '2025-03-10');
        $this->ledger('expense', 'input_cost', 4000, '2025-04-01');
        $this->ledger('expense', 'labour_cost', 3000, '2025-05-01');

        $this->actingAsOwner();
        $response = $this->overview(['year' => 2025])->assertOk();

        $this->assertEquals(10000, $response->json('data.summary.income'));
        $this->assertEquals(7000, $response->json('data.summary.expenses'));
        $this->assertEquals(3000, $response->json('data.summary.net_profit'));
        $this->assertEquals(30, $response->json('data.summary.profit_margin'));
        $this->assertSame('profit', $response->json('data.summary.status'));
        $this->assertCount(12, $response->json('data.monthly'));
    }

    public function test_a_year_where_costs_exceed_income_is_reported_as_a_loss(): void
    {
        $this->ledger('income', 'sale_income', 2000, '2025-06-01');
        $this->ledger('expense', 'input_cost', 5000, '2025-06-02');

        $this->actingAsOwner();
        $response = $this->overview(['year' => 2025])->assertOk();

        $this->assertEquals(-3000, $response->json('data.summary.net_profit'));
        $this->assertSame('loss', $response->json('data.summary.status'));
    }

    public function test_loans_are_not_counted_as_income_or_expense(): void
    {
        $this->ledger('income', 'sale_income', 1000, '2025-02-01');
        $this->ledger('income', 'loan_received', 50000, '2025-02-02');
        $this->ledger('expense', 'input_cost', 400, '2025-02-03');
        $this->ledger('expense', 'loan_repayment', 8000, '2025-02-04');

        $this->actingAsOwner();
        $response = $this->overview(['year' => 2025])->assertOk();

        $this->assertEquals(1000, $response->json('data.summary.income'));
        $this->assertEquals(400, $response->json('data.summary.expenses'));
        $this->assertEquals(600, $response->json('data.summary.net_profit'));
        $this->assertEquals(50000, $response->json('data.financing.loans_received'));
        $this->assertEquals(8000, $response->json('data.financing.loan_repayments'));
        $this->assertEquals(42000, $response->json('data.financing.net'));
    }

    public function test_year_boundaries_are_respected_and_compared_with_the_previous_year(): void
    {
        $this->ledger('income', 'sale_income', 1000, '2024-12-31');
        $this->ledger('income', 'sale_income', 1500, '2025-01-01');
        $this->ledger('income', 'sale_income', 500, '2025-12-31');
        $this->ledger('income', 'sale_income', 9999, '2026-01-01');

        $this->actingAsOwner();
        $response = $this->overview(['year' => 2025])->assertOk();

        $this->assertEquals(2000, $response->json('data.summary.income'));
        $this->assertEquals(1000, $response->json('data.previous.income'));
        $this->assertEquals(100, $response->json('data.previous.income_change_pct'));
        $this->assertTrue($response->json('data.previous.has_data'));
    }

    public function test_owner_only_sees_their_own_farms(): void
    {
        $otherOwner = $this->makeUser(['role' => 'Farm-owner']);
        $otherFarm = Farm::create(['name' => 'Someone Else', 'total_acreage' => 10, 'owner_id' => $otherOwner->id]);

        $this->ledger('income', 'sale_income', 1000, '2025-03-01');
        $this->ledger('income', 'sale_income', 777000, '2025-03-01', $otherFarm);

        $this->actingAsOwner();
        $response = $this->overview(['year' => 2025])->assertOk();

        $this->assertEquals(1000, $response->json('data.summary.income'));
        $this->assertCount(1, $response->json('data.farms'));
        $this->assertSame('Owner Farm', $response->json('data.farms.0.name'));
    }

    public function test_owner_cannot_request_another_owners_farm(): void
    {
        $otherOwner = $this->makeUser(['role' => 'Farm-owner']);
        $otherFarm = Farm::create(['name' => 'Someone Else', 'total_acreage' => 10, 'owner_id' => $otherOwner->id]);

        $this->actingAsOwner();

        $this->overview(['year' => 2025, 'farm_id' => $otherFarm->id])->assertForbidden();
    }

    public function test_customers_still_owing_money_are_reported(): void
    {
        $customer = Customer::create(['farm_id' => $this->farm->id, 'name' => 'Buyer']);
        $order = SalesOrder::create([
            'farm_id' => $this->farm->id,
            'customer_id' => $customer->id,
            'order_number' => 'SO-1',
            'order_date' => '2025-03-01',
            'status' => 'Fulfilled',
        ]);
        $invoice = Invoice::create([
            'sales_order_id' => $order->id,
            'invoice_number' => 'INV-1',
            'total_amount' => 1000,
            'due_date' => '2020-01-01', // long overdue
            'status' => 'Partially Paid',
        ]);
        Payment::create(['invoice_id' => $invoice->id, 'amount_paid' => 400, 'payment_date' => '2025-03-05']);

        $this->actingAsOwner();
        $response = $this->overview(['year' => 2025])->assertOk();

        $this->assertEquals(600, $response->json('data.owed.receivable'));
        $this->assertEquals(600, $response->json('data.owed.receivable_overdue'));
    }

    public function test_year_with_no_records_says_so_instead_of_reporting_zero_profit(): void
    {
        $this->actingAsOwner();
        $response = $this->overview(['year' => 2025])->assertOk();

        $this->assertSame('no_data', $response->json('data.summary.status'));
        $this->assertNull($response->json('data.summary.profit_margin'));
    }

    public function test_the_overview_contains_no_operational_detail(): void
    {
        $this->makeLivestock($this->farm);
        $this->ledger('income', 'sale_income', 100, '2025-03-01');

        $this->actingAsOwner();
        $data = $this->overview(['year' => 2025])->assertOk()->json('data');

        // headcount only - never tag numbers, feed, tasks or who did what
        $this->assertSame(1, $data['at_a_glance']['livestock_total']);
        $this->assertArrayNotHasKey('livestock', $data);
        $this->assertArrayNotHasKey('recent_transactions', $data);
    }

    public function test_only_farm_owners_can_open_the_overview(): void
    {
        foreach (['Admin', 'Manager', 'Accountant', 'Agronomist', 'Worker'] as $role) {
            Sanctum::actingAs($this->makeUser(['role' => $role]));

            $this->overview()->assertForbidden();
        }
    }
}
