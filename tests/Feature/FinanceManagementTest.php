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
use Illuminate\Support\Facades\DB;
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

        $this->farm = Farm::create([
            'name' => 'Test Farm',
            'total_acreage' => 100,
        ]);

        $this->otherFarm = Farm::create([
            'name' => 'A Different Farm',
            'total_acreage' => 50,
        ]);

        $this->user = User::create([
            'name' => 'Test Accountant',
            'email' => 'accountant@example.com',
            'password' => bcrypt('password'),
            'role' => 'Manager',
        ]);
    }

    private function actingAsUser(): void
    {
        Sanctum::actingAs($this->user);
    }

    public function test_can_create_an_income_transaction(): void
    {
        $this->actingAsUser();

        $response = $this->postJson('/api/financial-transactions', [
            'farm_id' => $this->farm->id,
            'type' => 'income',
            'category' => 'sale_income',
            'amount' => 500,
            'transaction_date' => now()->toDateString(),
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('financial_transactions', [
            'farm_id' => $this->farm->id,
            'type' => 'income',
            'category' => 'sale_income',
            'recorded_by' => $this->user->id,
        ]);
    }

    public function test_can_create_an_expense_transaction(): void
    {
        $this->actingAsUser();

        $response = $this->postJson('/api/financial-transactions', [
            'farm_id' => $this->farm->id,
            'type' => 'expense',
            'category' => 'fuel_cost',
            'amount' => 120,
            'transaction_date' => now()->toDateString(),
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('financial_transactions', [
            'type' => 'expense',
            'category' => 'fuel_cost',
        ]);
    }

    public function test_income_category_on_an_expense_transaction_is_rejected(): void
    {
        $this->actingAsUser();

        $response = $this->postJson('/api/financial-transactions', [
            'farm_id' => $this->farm->id,
            'type' => 'expense',
            'category' => 'sale_income', // valid for income, not expense
            'amount' => 100,
            'transaction_date' => now()->toDateString(),
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('category');
    }

    public function test_expense_category_on_an_income_transaction_is_rejected(): void
    {
        $this->actingAsUser();

        $response = $this->postJson('/api/financial-transactions', [
            'farm_id' => $this->farm->id,
            'type' => 'income',
            'category' => 'fuel_cost', // valid for expense, not income
            'amount' => 100,
            'transaction_date' => now()->toDateString(),
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('category');
    }

    public function test_budget_period_end_must_be_after_period_start(): void
    {
        $this->actingAsUser();

        $response = $this->postJson('/api/budgets', [
            'farm_id' => $this->farm->id,
            'category' => 'fuel_cost',
            'period_start' => '2026-06-01',
            'period_end' => '2026-05-01', // before start - invalid
            'planned_amount' => 1000,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('period_end');
    }

    public function test_finance_summary_calculates_totals_and_profit_correctly(): void
    {
        $this->actingAsUser();

        FinancialTransaction::create([
            'farm_id' => $this->farm->id, 'type' => 'income', 'category' => 'sale_income',
            'amount' => 1000, 'transaction_date' => now(), 'recorded_by' => $this->user->id,
        ]);
        FinancialTransaction::create([
            'farm_id' => $this->farm->id, 'type' => 'expense', 'category' => 'fuel_cost',
            'amount' => 300, 'transaction_date' => now(), 'recorded_by' => $this->user->id,
        ]);

        $response = $this->getJson("/api/finance/summary?farm_id={$this->farm->id}");

        $response->assertOk()
            ->assertJsonPath('data.total_income', 1000)
            ->assertJsonPath('data.total_expenses', 300)
            ->assertJsonPath('data.net_profit', 700);
    }

    public function test_budget_vs_actual_calculates_variance_correctly(): void
    {
        $this->actingAsUser();

        Budget::create([
            'farm_id' => $this->farm->id,
            'category' => 'fuel_cost',
            'period_start' => '2026-01-01',
            'period_end' => '2026-12-31',
            'planned_amount' => 1000,
        ]);

        FinancialTransaction::create([
            'farm_id' => $this->farm->id, 'type' => 'expense', 'category' => 'fuel_cost',
            'amount' => 400, 'transaction_date' => '2026-03-15', 'recorded_by' => $this->user->id,
        ]);

        $response = $this->getJson("/api/finance/budget-vs-actual?farm_id={$this->farm->id}");

        $response->assertOk()
            ->assertJsonPath('data.0.planned_amount', 1000)
            ->assertJsonPath('data.0.actual_amount', 400)
            ->assertJsonPath('data.0.variance', 600);
    }

    public function test_cost_per_kilogram_reports_missing_dependency_instead_of_inventing_data(): void
    {
        $this->actingAsUser();

        $response = $this->getJson('/api/finance/cost-per-kilogram');

        $response->assertOk()
            ->assertJsonPath('data', null);

        $this->assertStringContainsString('not available', $response->json('message'));
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $response = $this->getJson('/api/financial-transactions');

        $response->assertStatus(401);
    }

    // --- Cross-farm ownership validation ---

    public function test_field_from_another_farm_is_rejected_on_a_financial_transaction(): void
    {
        $this->actingAsUser();

        $fieldOnOtherFarm = Field::create([
            'farm_id' => $this->otherFarm->id,
            'name' => 'North Plot',
            'size_hectares' => 5,
        ]);

        $response = $this->postJson('/api/financial-transactions', [
            'farm_id' => $this->farm->id, // transaction is on $this->farm...
            'field_id' => $fieldOnOtherFarm->id, // ...but this field is on $this->otherFarm
            'type' => 'expense',
            'category' => 'input_cost',
            'amount' => 100,
            'transaction_date' => now()->toDateString(),
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('field_id');
        $this->assertDatabaseCount('financial_transactions', 0);
    }

    public function test_employee_from_another_farm_is_rejected_on_a_financial_transaction(): void
    {
        $this->actingAsUser();

        $workerOnOtherFarm = User::create([
            'name' => 'Other Farm Worker', 'email' => 'worker@example.com',
            'password' => bcrypt('password'), 'role' => 'Worker',
        ]);
        $employeeOnOtherFarm = Employee::create([
            'user_id' => $workerOnOtherFarm->id,
            'farm_id' => $this->otherFarm->id,
            'hourly_rate' => 15,
        ]);

        $response = $this->postJson('/api/financial-transactions', [
            'farm_id' => $this->farm->id,
            'employee_id' => $employeeOnOtherFarm->id,
            'type' => 'expense',
            'category' => 'labour_cost',
            'amount' => 200,
            'transaction_date' => now()->toDateString(),
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('employee_id');
        $this->assertDatabaseCount('financial_transactions', 0);
    }

    public function test_livestock_from_another_farm_is_rejected_on_a_financial_transaction(): void
    {
        $this->actingAsUser();

        // NOTE: this insert only sets id/farm_id since the real livestock
        // migration was not available when this test was written. If your
        // livestock table has other NOT NULL columns with no default, add
        // them here to match your actual schema before running this test.
        $livestockIdOnOtherFarm = DB::table('livestock')->insertGetId([
            'farm_id' => $this->otherFarm->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->postJson('/api/financial-transactions', [
            'farm_id' => $this->farm->id,
            'livestock_id' => $livestockIdOnOtherFarm,
            'type' => 'expense',
            'category' => 'vet_cost',
            'amount' => 80,
            'transaction_date' => now()->toDateString(),
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('livestock_id');
        $this->assertDatabaseCount('financial_transactions', 0);
    }

    public function test_resource_transaction_from_another_farm_is_rejected_on_a_financial_transaction(): void
    {
        $this->actingAsUser();

        $resourceOnOtherFarm = Resource::create([
            'farm_id' => $this->otherFarm->id,
            'name' => 'Diesel', 'category' => 'fuel', 'unit' => 'litre', 'quantity' => 100,
        ]);
        $resourceTransactionOnOtherFarm = $resourceOnOtherFarm->transactions()->create([
            'type' => 'stock_in', 'quantity' => 50, 'unit_cost' => 2, 'recorded_by' => $this->user->id,
        ]);

        $response = $this->postJson('/api/financial-transactions', [
            'farm_id' => $this->farm->id,
            'resource_transaction_id' => $resourceTransactionOnOtherFarm->id,
            'type' => 'expense',
            'category' => 'input_cost',
            'amount' => 100,
            'transaction_date' => now()->toDateString(),
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('resource_transaction_id');
        $this->assertDatabaseCount('financial_transactions', 0);
    }

    public function test_cross_farm_reference_is_also_rejected_on_update(): void
    {
        $this->actingAsUser();

        $transaction = FinancialTransaction::create([
            'farm_id' => $this->farm->id, 'type' => 'expense', 'category' => 'fuel_cost',
            'amount' => 50, 'transaction_date' => now(), 'recorded_by' => $this->user->id,
        ]);

        $fieldOnOtherFarm = Field::create([
            'farm_id' => $this->otherFarm->id, 'name' => 'South Plot', 'size_hectares' => 3,
        ]);

        $response = $this->putJson("/api/financial-transactions/{$transaction->id}", [
            'field_id' => $fieldOnOtherFarm->id,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('field_id');
        $this->assertNull($transaction->fresh()->field_id);
    }

    // --- Budget category validation ---

    public function test_budget_category_must_be_a_valid_expense_category(): void
    {
        $this->actingAsUser();

        $response = $this->postJson('/api/budgets', [
            'farm_id' => $this->farm->id,
            'category' => 'sale_income', // an income category, not valid for a budget
            'period_start' => '2026-01-01',
            'period_end' => '2026-12-31',
            'planned_amount' => 1000,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('category');
    }

    public function test_budget_accepts_a_valid_expense_category(): void
    {
        $this->actingAsUser();

        $response = $this->postJson('/api/budgets', [
            'farm_id' => $this->farm->id,
            'category' => 'labour_cost',
            'period_start' => '2026-01-01',
            'period_end' => '2026-12-31',
            'planned_amount' => 1000,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('budgets', ['category' => 'labour_cost']);
    }
}
