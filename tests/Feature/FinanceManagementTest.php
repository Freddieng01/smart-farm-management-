<?php

namespace Tests\Feature;

use App\Models\Budget;
use App\Models\Employee;
use App\Models\Farm;
use App\Models\Field;
use App\Models\FinancialTransaction;
use App\Models\Resource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinanceManagementTest extends TestCase
{
    use RefreshDatabase;

    private Farm $farm;

    private Farm $otherFarm;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->farm = $this->makeFarm('Test Farm');
        $this->otherFarm = $this->makeFarm('A Different Farm', 50);
        $this->user = $this->makeUser();
    }

    private function actingAsUser(): void
    {
        Sanctum::actingAs($this->user);
    }

    /** Creates a financial transaction directly in the database. */
    private function makeTransaction(array $overrides = []): FinancialTransaction
    {
        return FinancialTransaction::create(array_merge([
            'farm_id' => $this->farm->id,
            'type' => 'expense',
            'category' => 'fuel_cost',
            'amount' => 100,
            'transaction_date' => now()->toDateString(),
            'recorded_by' => $this->user->id,
        ], $overrides));
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'farm_id' => $this->farm->id,
            'type' => 'expense',
            'category' => 'fuel_cost',
            'amount' => 120,
            'transaction_date' => now()->toDateString(),
        ], $overrides);
    }

    /** A stock purchase (stock-in ledger row) on the given farm. */
    private function makeStockIn(Farm $farm, string $type = 'stock_in')
    {
        $resource = Resource::create([
            'farm_id' => $farm->id,
            'name' => 'Diesel ' . uniqid(),
            'category' => 'fuel',
            'unit' => 'litre',
            'quantity' => 100,
        ]);

        return $resource->transactions()->create([
            'type' => $type,
            'quantity' => 50,
            'unit_cost' => 2,
            'recorded_by' => $this->user->id,
        ]);
    }

    // ------------------------------------------------------------------
    // Financial transactions - create / validate
    // ------------------------------------------------------------------

    public function test_can_record_income(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/financial-transactions', $this->validPayload([
            'type' => 'income', 'category' => 'sale_income', 'amount' => 500,
        ]))->assertCreated();

        $this->assertDatabaseHas('financial_transactions', [
            'farm_id' => $this->farm->id,
            'type' => 'income',
            'category' => 'sale_income',
            'amount' => '500.00',
            'recorded_by' => $this->user->id,
        ]);
    }

    public function test_can_record_an_expense(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/financial-transactions', $this->validPayload())->assertCreated();

        $this->assertDatabaseHas('financial_transactions', ['type' => 'expense', 'category' => 'fuel_cost', 'amount' => '120.00']);
    }

    public function test_recorded_by_is_always_the_logged_in_user(): void
    {
        $this->actingAsUser();
        $someoneElse = $this->makeUser();

        $this->postJson('/api/financial-transactions', $this->validPayload(['recorded_by' => $someoneElse->id]))
            ->assertCreated();

        $this->assertDatabaseHas('financial_transactions', ['recorded_by' => $this->user->id]);
        $this->assertDatabaseMissing('financial_transactions', ['recorded_by' => $someoneElse->id]);
    }

    public function test_required_fields_are_enforced(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/financial-transactions', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['farm_id', 'type', 'category', 'amount', 'transaction_date']);
    }

    public function test_unknown_farm_is_rejected(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/financial-transactions', $this->validPayload(['farm_id' => 999999]))
            ->assertStatus(422)->assertJsonValidationErrors('farm_id');
    }

    public function test_invalid_type_is_rejected(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/financial-transactions', $this->validPayload(['type' => 'donation']))
            ->assertStatus(422)->assertJsonValidationErrors('type');
    }

    public function test_an_income_category_on_an_expense_is_rejected(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/financial-transactions', $this->validPayload(['type' => 'expense', 'category' => 'sale_income']))
            ->assertStatus(422)->assertJsonValidationErrors('category');
    }

    public function test_an_expense_category_on_income_is_rejected(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/financial-transactions', $this->validPayload(['type' => 'income', 'category' => 'fuel_cost']))
            ->assertStatus(422)->assertJsonValidationErrors('category');
    }

    public function test_an_unknown_category_is_rejected(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/financial-transactions', $this->validPayload(['category' => 'pizza']))
            ->assertStatus(422)->assertJsonValidationErrors('category');
    }

    public function test_amount_must_be_positive_numeric_with_at_most_two_decimals_and_not_huge(): void
    {
        $this->actingAsUser();

        foreach ([0, -5, 'abc', 10.123, 99999999999] as $bad) {
            $this->postJson('/api/financial-transactions', $this->validPayload(['amount' => $bad]))
                ->assertStatus(422)->assertJsonValidationErrors('amount');
        }

        $this->assertDatabaseCount('financial_transactions', 0);
    }

    public function test_a_future_dated_transaction_is_rejected(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/financial-transactions', $this->validPayload(['transaction_date' => now()->addDays(2)->toDateString()]))
            ->assertStatus(422)->assertJsonValidationErrors('transaction_date');
    }

    // ------------------------------------------------------------------
    // Financial transactions - read / update / delete / filter
    // ------------------------------------------------------------------

    public function test_can_show_a_transaction_and_a_missing_one_returns_404(): void
    {
        $this->actingAsUser();
        $transaction = $this->makeTransaction();

        $this->getJson("/api/financial-transactions/{$transaction->id}")->assertOk()->assertJsonPath('data.id', $transaction->id);
        $this->getJson('/api/financial-transactions/999999')->assertNotFound();
    }

    public function test_update_changes_the_amount_and_keeps_the_original_recorder(): void
    {
        $this->actingAsUser();
        $creator = $this->makeUser();
        $transaction = $this->makeTransaction(['recorded_by' => $creator->id]);

        $this->putJson("/api/financial-transactions/{$transaction->id}", ['amount' => 250])->assertOk();

        $this->assertDatabaseHas('financial_transactions', [
            'id' => $transaction->id,
            'amount' => '250.00',
            'recorded_by' => $creator->id,
        ]);
    }

    public function test_update_cannot_create_a_type_and_category_conflict(): void
    {
        $this->actingAsUser();
        $transaction = $this->makeTransaction(['type' => 'expense', 'category' => 'fuel_cost']);

        // switching to income while the stored category is still an expense category
        $this->putJson("/api/financial-transactions/{$transaction->id}", ['type' => 'income'])
            ->assertStatus(422)->assertJsonValidationErrors('category');

        $this->assertEquals('expense', $transaction->fresh()->type);
    }

    public function test_update_on_a_missing_transaction_returns_404(): void
    {
        $this->actingAsUser();

        $this->putJson('/api/financial-transactions/999999', ['amount' => 5])->assertNotFound();
    }

    public function test_can_delete_a_transaction(): void
    {
        $this->actingAsUser();
        $transaction = $this->makeTransaction();

        $this->deleteJson("/api/financial-transactions/{$transaction->id}")->assertOk();

        $this->assertDatabaseMissing('financial_transactions', ['id' => $transaction->id]);
    }

    public function test_index_filters_by_farm_type_and_dates(): void
    {
        $this->actingAsUser();

        $this->makeTransaction(['type' => 'income', 'category' => 'sale_income', 'amount' => 10, 'transaction_date' => '2026-01-10']);
        $this->makeTransaction(['type' => 'expense', 'category' => 'fuel_cost', 'amount' => 20, 'transaction_date' => '2026-02-10']);
        $this->makeTransaction(['type' => 'expense', 'category' => 'fuel_cost', 'amount' => 30, 'transaction_date' => '2026-03-10']);
        $this->makeTransaction(['farm_id' => $this->otherFarm->id, 'type' => 'expense', 'amount' => 999, 'transaction_date' => '2026-02-10']);

        $byFarm = $this->getJson("/api/financial-transactions?farm_id={$this->farm->id}")->assertOk()->json('data');
        $this->assertCount(3, $byFarm);

        $incomeOnly = $this->getJson("/api/financial-transactions?farm_id={$this->farm->id}&type=income")->json('data');
        $this->assertCount(1, $incomeOnly);

        $february = $this->getJson("/api/financial-transactions?farm_id={$this->farm->id}&from=2026-02-01&to=2026-02-28")->json('data');
        $this->assertCount(1, $february);
        $this->assertEquals(20, (float) $february[0]['amount']);

        $this->getJson('/api/financial-transactions?type=bogus')->assertStatus(422)->assertJsonValidationErrors('type');
    }

    // ------------------------------------------------------------------
    // Cross-farm reference validation
    // ------------------------------------------------------------------

    public function test_field_from_another_farm_is_rejected(): void
    {
        $this->actingAsUser();
        $fieldOnOtherFarm = Field::create(['farm_id' => $this->otherFarm->id, 'name' => 'North Plot', 'size_hectares' => 5]);

        $this->postJson('/api/financial-transactions', $this->validPayload(['field_id' => $fieldOnOtherFarm->id]))
            ->assertStatus(422)->assertJsonValidationErrors('field_id');

        $this->assertDatabaseCount('financial_transactions', 0);
    }

    public function test_employee_from_another_farm_is_rejected(): void
    {
        $this->actingAsUser();
        $employeeOnOtherFarm = Employee::create([
            'user_id' => $this->makeUser()->id,
            'farm_id' => $this->otherFarm->id,
            'hourly_rate' => 15,
        ]);

        $this->postJson('/api/financial-transactions', $this->validPayload([
            'category' => 'labour_cost', 'employee_id' => $employeeOnOtherFarm->id,
        ]))->assertStatus(422)->assertJsonValidationErrors('employee_id');

        $this->assertDatabaseCount('financial_transactions', 0);
    }

    public function test_livestock_from_another_farm_is_rejected(): void
    {
        $this->actingAsUser();
        $animalOnOtherFarm = $this->makeLivestock($this->otherFarm);

        $this->postJson('/api/financial-transactions', $this->validPayload([
            'category' => 'vet_cost', 'livestock_id' => $animalOnOtherFarm->id,
        ]))->assertStatus(422)->assertJsonValidationErrors('livestock_id');

        $this->assertDatabaseCount('financial_transactions', 0);
    }

    public function test_resource_transaction_from_another_farm_is_rejected(): void
    {
        $this->actingAsUser();
        $purchaseOnOtherFarm = $this->makeStockIn($this->otherFarm);

        $this->postJson('/api/financial-transactions', $this->validPayload([
            'category' => 'input_cost', 'resource_transaction_id' => $purchaseOnOtherFarm->id,
        ]))->assertStatus(422)->assertJsonValidationErrors('resource_transaction_id');

        $this->assertDatabaseCount('financial_transactions', 0);
    }

    public function test_cross_farm_references_are_also_rejected_on_update(): void
    {
        $this->actingAsUser();
        $transaction = $this->makeTransaction();

        $fieldOnOtherFarm = Field::create(['farm_id' => $this->otherFarm->id, 'name' => 'South Plot', 'size_hectares' => 3]);

        $this->putJson("/api/financial-transactions/{$transaction->id}", ['field_id' => $fieldOnOtherFarm->id])
            ->assertStatus(422)->assertJsonValidationErrors('field_id');

        $this->assertNull($transaction->fresh()->field_id);
    }

    public function test_moving_a_transaction_to_another_farm_rechecks_its_existing_references(): void
    {
        $this->actingAsUser();
        $ownField = Field::create(['farm_id' => $this->farm->id, 'name' => 'Own Plot', 'size_hectares' => 3]);
        $transaction = $this->makeTransaction(['field_id' => $ownField->id]);

        // Changing only the farm would leave the field pointing at a different farm.
        $this->putJson("/api/financial-transactions/{$transaction->id}", ['farm_id' => $this->otherFarm->id])
            ->assertStatus(422)->assertJsonValidationErrors('field_id');

        $this->assertEquals($this->farm->id, $transaction->fresh()->farm_id);
    }

    public function test_references_from_the_same_farm_are_accepted(): void
    {
        $this->actingAsUser();
        $field = Field::create(['farm_id' => $this->farm->id, 'name' => 'Own Plot', 'size_hectares' => 3]);
        $employee = Employee::create(['user_id' => $this->makeUser()->id, 'farm_id' => $this->farm->id, 'hourly_rate' => 10]);
        $animal = $this->makeLivestock($this->farm);
        $purchase = $this->makeStockIn($this->farm);

        $this->postJson('/api/financial-transactions', $this->validPayload([
            'category' => 'input_cost',
            'field_id' => $field->id,
            'employee_id' => $employee->id,
            'livestock_id' => $animal->id,
            'resource_transaction_id' => $purchase->id,
        ]))->assertCreated();

        $this->assertDatabaseHas('financial_transactions', [
            'field_id' => $field->id,
            'employee_id' => $employee->id,
            'livestock_id' => $animal->id,
            'resource_transaction_id' => $purchase->id,
        ]);
    }

    public function test_a_stock_purchase_can_only_be_linked_once_to_avoid_double_counting(): void
    {
        $this->actingAsUser();
        $purchase = $this->makeStockIn($this->farm);

        $this->postJson('/api/financial-transactions', $this->validPayload([
            'category' => 'input_cost', 'resource_transaction_id' => $purchase->id,
        ]))->assertCreated();

        $this->postJson('/api/financial-transactions', $this->validPayload([
            'category' => 'input_cost', 'resource_transaction_id' => $purchase->id,
        ]))->assertStatus(422)->assertJsonValidationErrors('resource_transaction_id');

        $this->assertDatabaseCount('financial_transactions', 1);
    }

    public function test_only_a_stock_in_can_be_linked_not_a_stock_out(): void
    {
        $this->actingAsUser();
        $usage = $this->makeStockIn($this->farm, 'stock_out');

        $this->postJson('/api/financial-transactions', $this->validPayload([
            'category' => 'input_cost', 'resource_transaction_id' => $usage->id,
        ]))->assertStatus(422)->assertJsonValidationErrors('resource_transaction_id');
    }

    // ------------------------------------------------------------------
    // Budgets
    // ------------------------------------------------------------------

    private function budgetPayload(array $overrides = []): array
    {
        return array_merge([
            'farm_id' => $this->farm->id,
            'category' => 'fuel_cost',
            'period_start' => '2026-01-01',
            'period_end' => '2026-12-31',
            'planned_amount' => 1000,
        ], $overrides);
    }

    public function test_can_create_a_budget_with_a_valid_expense_category(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/budgets', $this->budgetPayload(['category' => 'labour_cost']))->assertCreated();

        $this->assertDatabaseHas('budgets', ['farm_id' => $this->farm->id, 'category' => 'labour_cost', 'planned_amount' => '1000.00']);
    }

    public function test_budget_category_must_be_an_expense_category(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/budgets', $this->budgetPayload(['category' => 'sale_income']))
            ->assertStatus(422)->assertJsonValidationErrors('category');

        $this->postJson('/api/budgets', $this->budgetPayload(['category' => 'pizza']))
            ->assertStatus(422)->assertJsonValidationErrors('category');

        $this->assertDatabaseCount('budgets', 0);
    }

    public function test_budget_required_fields_and_amount_rules(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/budgets', [])->assertStatus(422)
            ->assertJsonValidationErrors(['farm_id', 'category', 'period_start', 'period_end', 'planned_amount']);

        $this->postJson('/api/budgets', $this->budgetPayload(['planned_amount' => -1]))
            ->assertStatus(422)->assertJsonValidationErrors('planned_amount');

        $this->postJson('/api/budgets', $this->budgetPayload(['planned_amount' => 'lots']))
            ->assertStatus(422)->assertJsonValidationErrors('planned_amount');
    }

    public function test_budget_period_end_must_be_after_period_start(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/budgets', $this->budgetPayload(['period_start' => '2026-06-01', 'period_end' => '2026-05-01']))
            ->assertStatus(422)->assertJsonValidationErrors('period_end');

        $this->postJson('/api/budgets', $this->budgetPayload(['period_start' => 'not-a-date']))
            ->assertStatus(422)->assertJsonValidationErrors('period_start');
    }

    public function test_overlapping_budgets_for_the_same_farm_and_category_are_rejected(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/budgets', $this->budgetPayload(['period_start' => '2026-01-01', 'period_end' => '2026-03-31']))->assertCreated();

        // overlaps
        $this->postJson('/api/budgets', $this->budgetPayload(['period_start' => '2026-03-01', 'period_end' => '2026-06-30']))
            ->assertStatus(422)->assertJsonValidationErrors('period_start');

        // allowed: adjacent period, different category, different farm
        $this->postJson('/api/budgets', $this->budgetPayload(['period_start' => '2026-04-01', 'period_end' => '2026-06-30']))->assertCreated();
        $this->postJson('/api/budgets', $this->budgetPayload(['category' => 'input_cost', 'period_start' => '2026-01-01', 'period_end' => '2026-03-31']))->assertCreated();
        $this->postJson('/api/budgets', $this->budgetPayload(['farm_id' => $this->otherFarm->id, 'period_start' => '2026-01-01', 'period_end' => '2026-03-31']))->assertCreated();
    }

    public function test_budget_update_rules(): void
    {
        $this->actingAsUser();
        $first = Budget::create($this->budgetPayload(['period_start' => '2026-01-01', 'period_end' => '2026-03-31']));
        $second = Budget::create($this->budgetPayload(['period_start' => '2026-04-01', 'period_end' => '2026-06-30']));

        // changing only the amount is fine (it must not clash with itself)
        $this->putJson("/api/budgets/{$second->id}", ['planned_amount' => 2500])->assertOk();
        $this->assertDatabaseHas('budgets', ['id' => $second->id, 'planned_amount' => '2500.00']);

        // moving the start back into the first budget's period overlaps
        $this->putJson("/api/budgets/{$second->id}", ['period_start' => '2026-03-15'])
            ->assertStatus(422)->assertJsonValidationErrors('period_start');

        // an end date before the STORED start date is rejected even though only one date was sent
        $this->putJson("/api/budgets/{$second->id}", ['period_end' => '2026-03-01'])
            ->assertStatus(422)->assertJsonValidationErrors('period_end');

        // category must still be an expense category on update
        $this->putJson("/api/budgets/{$first->id}", ['category' => 'sale_income'])
            ->assertStatus(422)->assertJsonValidationErrors('category');
    }

    public function test_can_show_and_delete_a_budget_and_missing_ones_return_404(): void
    {
        $this->actingAsUser();
        $budget = Budget::create($this->budgetPayload());

        $this->getJson("/api/budgets/{$budget->id}")->assertOk()->assertJsonPath('data.id', $budget->id);
        $this->deleteJson("/api/budgets/{$budget->id}")->assertOk();
        $this->assertDatabaseMissing('budgets', ['id' => $budget->id]);

        $this->getJson('/api/budgets/999999')->assertNotFound();
    }

    // ------------------------------------------------------------------
    // Reports
    // ------------------------------------------------------------------

    public function test_summary_totals_income_expenses_and_profit_for_one_farm_only(): void
    {
        $this->actingAsUser();

        $this->makeTransaction(['type' => 'income', 'category' => 'sale_income', 'amount' => 1000]);
        $this->makeTransaction(['type' => 'expense', 'category' => 'fuel_cost', 'amount' => 300]);
        // noise from another farm must not leak in
        $this->makeTransaction(['farm_id' => $this->otherFarm->id, 'type' => 'income', 'category' => 'sale_income', 'amount' => 5000]);

        $data = $this->getJson("/api/finance/summary?farm_id={$this->farm->id}")->assertOk()->json('data');

        $this->assertEquals(1000, $data['total_income']);
        $this->assertEquals(300, $data['total_expenses']);
        $this->assertEquals(700, $data['net_profit']);
        $this->assertCount(2, $data['recent_transactions']);
    }

    public function test_summary_with_no_data_returns_zeros(): void
    {
        $this->actingAsUser();

        $data = $this->getJson("/api/finance/summary?farm_id={$this->farm->id}")->assertOk()->json('data');

        $this->assertEquals(0, $data['total_income']);
        $this->assertEquals(0, $data['total_expenses']);
        $this->assertEquals(0, $data['net_profit']);
        $this->assertEquals(0, $data['inventory_value']);
        $this->assertSame([], $data['recent_transactions']);
    }

    public function test_summary_includes_inventory_value_and_stock_alert_counts(): void
    {
        $this->actingAsUser();

        Resource::create(['farm_id' => $this->farm->id, 'name' => 'A', 'category' => 'tool', 'unit' => 'unit', 'quantity' => 10, 'unit_cost' => 5, 'minimum_stock' => 0]);
        Resource::create(['farm_id' => $this->farm->id, 'name' => 'B', 'category' => 'tool', 'unit' => 'unit', 'quantity' => 2, 'unit_cost' => 3.5, 'minimum_stock' => 5, 'expiry_date' => now()->addDays(3)]);
        Resource::create(['farm_id' => $this->farm->id, 'name' => 'C', 'category' => 'tool', 'unit' => 'unit', 'quantity' => 4, 'unit_cost' => 1, 'minimum_stock' => 0, 'expiry_date' => now()->subDays(2)]);
        Resource::create(['farm_id' => $this->otherFarm->id, 'name' => 'Noise', 'category' => 'tool', 'unit' => 'unit', 'quantity' => 100, 'unit_cost' => 100, 'minimum_stock' => 500]);

        $data = $this->getJson("/api/finance/summary?farm_id={$this->farm->id}")->assertOk()->json('data');

        $this->assertEquals(61, $data['inventory_value']); // 10*5 + 2*3.5 + 4*1
        $this->assertEquals(1, $data['low_stock_count']);
        $this->assertEquals(1, $data['expiring_soon_count']);
        $this->assertEquals(1, $data['expired_count']);
    }

    public function test_reports_require_a_valid_farm_and_valid_dates(): void
    {
        $this->actingAsUser();

        foreach (['summary', 'profit-loss', 'budget-vs-actual'] as $report) {
            $this->getJson("/api/finance/{$report}")->assertStatus(422)->assertJsonValidationErrors('farm_id');
            $this->getJson("/api/finance/{$report}?farm_id=999999")->assertStatus(422)->assertJsonValidationErrors('farm_id');
        }

        $this->getJson("/api/finance/profit-loss?farm_id={$this->farm->id}&from=garbage")
            ->assertStatus(422)->assertJsonValidationErrors('from');

        $this->getJson("/api/finance/profit-loss?farm_id={$this->farm->id}&from=2026-05-01&to=2026-04-01")
            ->assertStatus(422)->assertJsonValidationErrors('to');
    }

    public function test_profit_loss_breaks_down_by_category_inside_the_date_range_inclusive(): void
    {
        $this->actingAsUser();

        $this->makeTransaction(['type' => 'income', 'category' => 'sale_income', 'amount' => 500, 'transaction_date' => '2026-01-10']); // before range
        $this->makeTransaction(['type' => 'income', 'category' => 'sale_income', 'amount' => 700, 'transaction_date' => '2026-02-01']); // first day
        $this->makeTransaction(['type' => 'expense', 'category' => 'input_cost', 'amount' => 200, 'transaction_date' => '2026-02-15']);
        $this->makeTransaction(['type' => 'expense', 'category' => 'fuel_cost', 'amount' => 100, 'transaction_date' => '2026-02-28']);   // last day
        $this->makeTransaction(['type' => 'expense', 'category' => 'fuel_cost', 'amount' => 50, 'transaction_date' => '2026-03-01']);    // after range
        $this->makeTransaction(['farm_id' => $this->otherFarm->id, 'type' => 'income', 'category' => 'sale_income', 'amount' => 9999, 'transaction_date' => '2026-02-10']);

        $data = $this->getJson("/api/finance/profit-loss?farm_id={$this->farm->id}&from=2026-02-01&to=2026-02-28")
            ->assertOk()->json('data');

        $this->assertEquals(700, $data['total_income']);
        $this->assertEquals(300, $data['total_expenses']);
        $this->assertEquals(400, $data['net_profit']);
        $this->assertEquals(700, $data['income_by_category']['sale_income']);
        $this->assertEquals(200, $data['expense_by_category']['input_cost']);
        $this->assertEquals(100, $data['expense_by_category']['fuel_cost']);
        $this->assertSame('2026-02-01', $data['period']['from']);
    }

    public function test_a_loss_gives_a_negative_net_profit(): void
    {
        $this->actingAsUser();

        $this->makeTransaction(['type' => 'income', 'category' => 'sale_income', 'amount' => 100]);
        $this->makeTransaction(['type' => 'expense', 'category' => 'fuel_cost', 'amount' => 350]);

        $data = $this->getJson("/api/finance/profit-loss?farm_id={$this->farm->id}")->assertOk()->json('data');

        $this->assertEquals(-250, $data['net_profit']);
    }

    public function test_budget_vs_actual_uses_only_matching_expenses_inside_the_period(): void
    {
        $this->actingAsUser();

        Budget::create($this->budgetPayload(['category' => 'fuel_cost', 'period_start' => '2026-01-01', 'period_end' => '2026-12-31', 'planned_amount' => 1000]));

        $this->makeTransaction(['category' => 'fuel_cost', 'amount' => 400, 'transaction_date' => '2026-03-15']);   // counts
        $this->makeTransaction(['category' => 'fuel_cost', 'amount' => 100, 'transaction_date' => '2026-12-31']);   // last day counts
        $this->makeTransaction(['category' => 'fuel_cost', 'amount' => 250, 'transaction_date' => '2025-12-31']);   // before period
        $this->makeTransaction(['category' => 'input_cost', 'amount' => 77, 'transaction_date' => '2026-03-15']);   // other category
        $this->makeTransaction(['farm_id' => $this->otherFarm->id, 'category' => 'fuel_cost', 'amount' => 999, 'transaction_date' => '2026-03-15']); // other farm

        $rows = $this->getJson("/api/finance/budget-vs-actual?farm_id={$this->farm->id}")->assertOk()->json('data');

        $this->assertCount(1, $rows);
        $this->assertEquals(1000, $rows[0]['planned_amount']);
        $this->assertEquals(500, $rows[0]['actual_amount']);
        $this->assertEquals(500, $rows[0]['variance']);
    }

    public function test_budget_vs_actual_shows_a_negative_variance_when_over_budget(): void
    {
        $this->actingAsUser();

        Budget::create($this->budgetPayload(['planned_amount' => 300]));
        $this->makeTransaction(['category' => 'fuel_cost', 'amount' => 500, 'transaction_date' => '2026-06-01']);

        $rows = $this->getJson("/api/finance/budget-vs-actual?farm_id={$this->farm->id}")->assertOk()->json('data');

        $this->assertEquals(-200, $rows[0]['variance']);
    }

    public function test_cost_per_hectare_for_a_field_counts_only_production_costs(): void
    {
        $this->actingAsUser();
        $field = Field::create(['farm_id' => $this->farm->id, 'name' => 'Big Plot', 'size_hectares' => 10]);

        $this->makeTransaction(['field_id' => $field->id, 'category' => 'input_cost', 'amount' => 400]);
        $this->makeTransaction(['field_id' => $field->id, 'category' => 'labour_cost', 'amount' => 100]);
        $this->makeTransaction(['field_id' => $field->id, 'category' => 'loan_repayment', 'amount' => 300]);   // not a production cost
        $this->makeTransaction(['field_id' => $field->id, 'type' => 'income', 'category' => 'sale_income', 'amount' => 900]); // income

        $data = $this->getJson("/api/finance/cost-per-hectare?field_id={$field->id}")->assertOk()->json('data');

        $this->assertSame('field', $data['basis']);
        $this->assertEquals(500, $data['total_cost']);
        $this->assertEquals(10, $data['size_hectares']);
        $this->assertEquals(50, $data['cost_per_hectare']);
    }

    public function test_cost_per_hectare_with_zero_area_returns_null_and_an_explanation(): void
    {
        $this->actingAsUser();
        $field = Field::create(['farm_id' => $this->farm->id, 'name' => 'No Area', 'size_hectares' => 0]);
        $this->makeTransaction(['field_id' => $field->id, 'category' => 'input_cost', 'amount' => 400]);

        $response = $this->getJson("/api/finance/cost-per-hectare?field_id={$field->id}")->assertOk();

        $this->assertNull($response->json('data.cost_per_hectare'));
        $this->assertStringContainsString('missing or zero', $response->json('message'));
    }

    public function test_cost_per_hectare_for_a_whole_farm_uses_the_total_area_of_its_fields(): void
    {
        $this->actingAsUser();
        $fieldA = Field::create(['farm_id' => $this->farm->id, 'name' => 'A', 'size_hectares' => 10]);
        Field::create(['farm_id' => $this->farm->id, 'name' => 'B', 'size_hectares' => 5]);
        Field::create(['farm_id' => $this->otherFarm->id, 'name' => 'Noise', 'size_hectares' => 100]);

        $this->makeTransaction(['category' => 'input_cost', 'amount' => 300]);                           // farm-level cost, no field
        $this->makeTransaction(['field_id' => $fieldA->id, 'category' => 'labour_cost', 'amount' => 150]);
        $this->makeTransaction(['farm_id' => $this->otherFarm->id, 'category' => 'input_cost', 'amount' => 9999]);

        $data = $this->getJson("/api/finance/cost-per-hectare?farm_id={$this->farm->id}")->assertOk()->json('data');

        $this->assertSame('farm', $data['basis']);
        $this->assertEquals(450, $data['total_cost']);
        $this->assertEquals(15, $data['size_hectares']);
        $this->assertEquals(30, $data['cost_per_hectare']);
    }

    public function test_cost_per_hectare_validates_its_input(): void
    {
        $this->actingAsUser();
        $fieldOnOtherFarm = Field::create(['farm_id' => $this->otherFarm->id, 'name' => 'Far', 'size_hectares' => 4]);

        $this->getJson('/api/finance/cost-per-hectare')->assertStatus(422);
        $this->getJson('/api/finance/cost-per-hectare?field_id=999999')->assertStatus(422)->assertJsonValidationErrors('field_id');
        $this->getJson("/api/finance/cost-per-hectare?field_id={$fieldOnOtherFarm->id}&farm_id={$this->farm->id}")
            ->assertStatus(422)->assertJsonValidationErrors('field_id');
    }

    public function test_cost_per_kilogram_reports_that_it_is_unavailable_instead_of_inventing_a_number(): void
    {
        $this->actingAsUser();

        $response = $this->getJson('/api/finance/cost-per-kilogram')->assertOk();

        $this->assertNull($response->json('data'));
        $this->assertStringContainsString('not available', $response->json('message'));
    }

    // ------------------------------------------------------------------
    // Authentication
    // ------------------------------------------------------------------

    public function test_unauthenticated_requests_are_rejected_on_every_finance_route(): void
    {
        // No actingAsUser() here on purpose.
        $routes = [
            ['getJson', '/api/financial-transactions'],
            ['postJson', '/api/financial-transactions'],
            ['getJson', '/api/financial-transactions/1'],
            ['putJson', '/api/financial-transactions/1'],
            ['deleteJson', '/api/financial-transactions/1'],
            ['getJson', '/api/budgets'],
            ['postJson', '/api/budgets'],
            ['getJson', '/api/budgets/1'],
            ['putJson', '/api/budgets/1'],
            ['deleteJson', '/api/budgets/1'],
            ['getJson', '/api/finance/summary'],
            ['getJson', '/api/finance/profit-loss'],
            ['getJson', '/api/finance/cost-per-hectare'],
            ['getJson', '/api/finance/cost-per-kilogram'],
            ['getJson', '/api/finance/budget-vs-actual'],
        ];

        foreach ($routes as [$method, $uri]) {
            $this->{$method}($uri)->assertStatus(401);
        }
    }
}
