<?php

namespace Tests\Feature;

use App\Models\Farm;
use App\Models\Field;
use App\Models\Resource;
use App\Models\ResourceTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ResourceManagementTest extends TestCase
{
    use RefreshDatabase;

    private Farm $farm;

    private Farm $otherFarm;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->farm = $this->makeFarm('Test Farm');
        $this->otherFarm = $this->makeFarm('Other Farm', 20);
        $this->user = $this->makeUser();
    }

    /** Call at the top of any test that needs a logged-in user. */
    private function actingAsUser(): void
    {
        Sanctum::actingAs($this->user);
    }

    /** Creates a resource directly in the database (no ledger row). */
    private function makeResource(array $overrides = []): Resource
    {
        return Resource::create(array_merge([
            'farm_id' => $this->farm->id,
            'name' => 'Urea ' . uniqid(),
            'category' => 'fertilizer',
            'unit' => 'kg',
            'quantity' => 50,
        ], $overrides));
    }

    // ------------------------------------------------------------------
    // Create / read / update / delete
    // ------------------------------------------------------------------

    public function test_can_create_a_resource_and_it_gets_an_opening_balance_ledger_row(): void
    {
        $this->actingAsUser();

        $response = $this->postJson('/api/resources', [
            'farm_id' => $this->farm->id,
            'name' => 'NPK Fertilizer',
            'category' => 'fertilizer',
            'unit' => 'kg',
            'quantity' => 100,
            'minimum_stock' => 20,
            'unit_cost' => 5.50,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'NPK Fertilizer')
            ->assertJsonPath('data.quantity', '100.00');

        $this->assertDatabaseHas('resources', ['farm_id' => $this->farm->id, 'name' => 'NPK Fertilizer']);

        $resource = Resource::where('name', 'NPK Fertilizer')->firstOrFail();
        $this->assertDatabaseHas('resource_transactions', [
            'resource_id' => $resource->id,
            'type' => 'stock_in',
            'quantity' => '100.00',
            'reason' => 'Opening balance',
            'recorded_by' => $this->user->id,
        ]);
    }

    public function test_creating_a_resource_with_no_quantity_creates_no_ledger_row(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/resources', [
            'farm_id' => $this->farm->id,
            'name' => 'Empty Item',
            'category' => 'tool',
            'unit' => 'unit',
        ])->assertCreated();

        $this->assertDatabaseCount('resource_transactions', 0);
    }

    public function test_create_requires_the_mandatory_fields(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/resources', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['farm_id', 'name', 'category', 'unit']);
    }

    public function test_create_rejects_negative_numbers(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/resources', [
            'farm_id' => $this->farm->id,
            'name' => 'Bad Numbers',
            'category' => 'tool',
            'unit' => 'unit',
            'quantity' => -1,
            'minimum_stock' => -1,
            'unit_cost' => -1,
        ])->assertStatus(422)->assertJsonValidationErrors(['quantity', 'minimum_stock', 'unit_cost']);
    }

    public function test_create_rejects_more_than_two_decimal_places_and_huge_numbers(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/resources', [
            'farm_id' => $this->farm->id,
            'name' => 'Too Precise',
            'category' => 'tool',
            'unit' => 'unit',
            'quantity' => 1.234,
            'unit_cost' => 999999999,
        ])->assertStatus(422)->assertJsonValidationErrors(['quantity', 'unit_cost']);
    }

    public function test_create_rejects_an_unknown_category(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/resources', [
            'farm_id' => $this->farm->id,
            'name' => 'Mystery',
            'category' => 'spaceship',
            'unit' => 'unit',
        ])->assertStatus(422)->assertJsonValidationErrors('category');
    }

    public function test_create_rejects_an_unknown_farm(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/resources', [
            'farm_id' => 999999,
            'name' => 'Orphan',
            'category' => 'tool',
            'unit' => 'unit',
        ])->assertStatus(422)->assertJsonValidationErrors('farm_id');
    }

    public function test_duplicate_resource_name_on_the_same_farm_is_rejected_but_allowed_on_another_farm(): void
    {
        $this->actingAsUser();
        $this->makeResource(['name' => 'Diesel', 'category' => 'fuel', 'unit' => 'litre']);

        $this->postJson('/api/resources', [
            'farm_id' => $this->farm->id, 'name' => 'Diesel', 'category' => 'fuel', 'unit' => 'litre',
        ])->assertStatus(422)->assertJsonValidationErrors('name');

        $this->postJson('/api/resources', [
            'farm_id' => $this->otherFarm->id, 'name' => 'Diesel', 'category' => 'fuel', 'unit' => 'litre',
        ])->assertCreated();
    }

    public function test_field_must_belong_to_the_selected_farm(): void
    {
        $this->actingAsUser();

        $otherFarmField = Field::create(['farm_id' => $this->otherFarm->id, 'name' => 'North Plot', 'size_hectares' => 5]);
        $ownField = Field::create(['farm_id' => $this->farm->id, 'name' => 'Own Plot', 'size_hectares' => 3]);

        $this->postJson('/api/resources', [
            'farm_id' => $this->farm->id, 'field_id' => $otherFarmField->id,
            'name' => 'Maize Seeds', 'category' => 'seeds', 'unit' => 'kg',
        ])->assertStatus(422)->assertJsonValidationErrors('field_id');

        // positive control: a field from the SAME farm is accepted
        $this->postJson('/api/resources', [
            'farm_id' => $this->farm->id, 'field_id' => $ownField->id,
            'name' => 'Maize Seeds', 'category' => 'seeds', 'unit' => 'kg',
        ])->assertCreated()->assertJsonPath('data.field_id', $ownField->id);
    }

    public function test_can_show_a_resource_and_a_missing_one_returns_404(): void
    {
        $this->actingAsUser();
        $resource = $this->makeResource(['name' => 'Showable']);

        $this->getJson("/api/resources/{$resource->id}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Showable');

        $this->getJson('/api/resources/999999')->assertNotFound();
    }

    public function test_can_update_a_resource(): void
    {
        $this->actingAsUser();
        $resource = $this->makeResource(['name' => 'Old Name']);

        $this->putJson("/api/resources/{$resource->id}", [
            'name' => 'New Name',
            'minimum_stock' => 12.5,
            'unit_cost' => 4.25,
        ])->assertOk()->assertJsonPath('data.name', 'New Name');

        $this->assertDatabaseHas('resources', ['id' => $resource->id, 'name' => 'New Name', 'minimum_stock' => '12.50']);
    }

    public function test_update_cannot_change_quantity_or_farm(): void
    {
        $this->actingAsUser();
        $resource = $this->makeResource(['quantity' => 50]);

        $this->putJson("/api/resources/{$resource->id}", ['quantity' => 999])
            ->assertStatus(422)->assertJsonValidationErrors('quantity');

        $this->putJson("/api/resources/{$resource->id}", ['farm_id' => $this->otherFarm->id])
            ->assertStatus(422)->assertJsonValidationErrors('farm_id');

        $this->assertEquals(50, (float) $resource->fresh()->quantity);
        $this->assertEquals($this->farm->id, $resource->fresh()->farm_id);
    }

    public function test_update_rejects_a_name_used_by_another_resource_on_the_same_farm(): void
    {
        $this->actingAsUser();
        $this->makeResource(['name' => 'Taken']);
        $mine = $this->makeResource(['name' => 'Mine']);

        $this->putJson("/api/resources/{$mine->id}", ['name' => 'Taken'])
            ->assertStatus(422)->assertJsonValidationErrors('name');

        // keeping its own name is fine
        $this->putJson("/api/resources/{$mine->id}", ['name' => 'Mine', 'unit' => 'bag'])->assertOk();
    }

    public function test_update_checks_the_field_belongs_to_the_resources_farm(): void
    {
        $this->actingAsUser();
        $resource = $this->makeResource();
        $otherFarmField = Field::create(['farm_id' => $this->otherFarm->id, 'name' => 'Far Plot', 'size_hectares' => 2]);

        $this->putJson("/api/resources/{$resource->id}", ['field_id' => $otherFarmField->id])
            ->assertStatus(422)->assertJsonValidationErrors('field_id');
    }

    public function test_a_resource_without_history_can_be_deleted(): void
    {
        $this->actingAsUser();
        $resource = $this->makeResource();

        $this->deleteJson("/api/resources/{$resource->id}")->assertOk();

        $this->assertDatabaseMissing('resources', ['id' => $resource->id]);
    }

    public function test_a_resource_with_stock_history_cannot_be_deleted(): void
    {
        $this->actingAsUser();
        $resource = $this->makeResource(['quantity' => 10]);

        $this->postJson("/api/resources/{$resource->id}/stock-out", ['quantity' => 2])->assertCreated();

        $this->deleteJson("/api/resources/{$resource->id}")->assertStatus(409);

        $this->assertDatabaseHas('resources', ['id' => $resource->id]);
        $this->assertDatabaseCount('resource_transactions', 1);
    }

    // ------------------------------------------------------------------
    // Stock-in / stock-out
    // ------------------------------------------------------------------

    public function test_stock_in_increases_quantity_and_records_the_ledger_row(): void
    {
        $this->actingAsUser();
        $resource = $this->makeResource(['quantity' => 50, 'unit_cost' => 1]);

        $this->postJson("/api/resources/{$resource->id}/stock-in", [
            'quantity' => 25,
            'unit_cost' => 3.20,
            'reason' => 'Purchased from supplier',
        ])->assertCreated();

        $this->assertDatabaseHas('resource_transactions', [
            'resource_id' => $resource->id,
            'type' => 'stock_in',
            'quantity' => '25.00',
            'unit_cost' => '3.20',
            'recorded_by' => $this->user->id,
        ]);

        $fresh = $resource->fresh();
        $this->assertEquals(75, (float) $fresh->quantity);
        $this->assertEquals(3.2, (float) $fresh->unit_cost);
    }

    public function test_stock_out_decreases_quantity_and_records_the_ledger_row(): void
    {
        $this->actingAsUser();
        $resource = $this->makeResource(['quantity' => 50]);

        $this->postJson("/api/resources/{$resource->id}/stock-out", [
            'quantity' => 20,
            'reason' => 'Applied to Field A',
        ])->assertCreated();

        $this->assertDatabaseHas('resource_transactions', [
            'resource_id' => $resource->id,
            'type' => 'stock_out',
            'quantity' => '20.00',
            'recorded_by' => $this->user->id,
        ]);

        $this->assertEquals(30, (float) $resource->fresh()->quantity);
    }

    public function test_stock_out_that_exceeds_stock_is_rejected_and_changes_nothing(): void
    {
        $this->actingAsUser();
        $resource = $this->makeResource(['quantity' => 10]);

        $this->postJson("/api/resources/{$resource->id}/stock-out", ['quantity' => 50])
            ->assertStatus(422)->assertJsonValidationErrors('quantity');

        $this->assertEquals(10, (float) $resource->fresh()->quantity);
        $this->assertDatabaseCount('resource_transactions', 0);
    }

    public function test_stock_out_of_the_exact_balance_is_allowed_and_one_more_unit_is_not(): void
    {
        $this->actingAsUser();
        $resource = $this->makeResource(['quantity' => 10]);

        $this->postJson("/api/resources/{$resource->id}/stock-out", ['quantity' => 10])->assertCreated();
        $this->assertEquals(0, (float) $resource->fresh()->quantity);

        $this->postJson("/api/resources/{$resource->id}/stock-out", ['quantity' => 0.01])
            ->assertStatus(422)->assertJsonValidationErrors('quantity');

        $this->assertEquals(0, (float) $resource->fresh()->quantity);
        $this->assertDatabaseCount('resource_transactions', 1);
    }

    public function test_stock_movements_must_be_positive_numbers_with_at_most_two_decimals(): void
    {
        $this->actingAsUser();
        $resource = $this->makeResource(['quantity' => 10]);

        foreach (['stock-in', 'stock-out'] as $action) {
            foreach ([0, -5, 'abc', 1.234] as $bad) {
                $this->postJson("/api/resources/{$resource->id}/{$action}", ['quantity' => $bad])
                    ->assertStatus(422)->assertJsonValidationErrors('quantity');
            }
        }

        $this->assertEquals(10, (float) $resource->fresh()->quantity);
        $this->assertDatabaseCount('resource_transactions', 0);
    }

    public function test_stock_operations_on_a_missing_resource_return_404(): void
    {
        $this->actingAsUser();

        $this->postJson('/api/resources/999999/stock-in', ['quantity' => 1])->assertNotFound();
        $this->postJson('/api/resources/999999/stock-out', ['quantity' => 1])->assertNotFound();
    }

    public function test_decimal_quantities_add_up_exactly(): void
    {
        $this->actingAsUser();
        $resource = $this->makeResource(['quantity' => 1.00]);

        foreach ([0.30, 0.30, 0.30, 0.10] as $take) {
            $this->postJson("/api/resources/{$resource->id}/stock-out", ['quantity' => $take])->assertCreated();
        }

        $this->assertEquals(0, (float) $resource->fresh()->quantity);
    }

    public function test_stock_balance_always_matches_the_ledger(): void
    {
        $this->actingAsUser();

        $id = $this->postJson('/api/resources', [
            'farm_id' => $this->farm->id, 'name' => 'Ledger Check', 'category' => 'feed', 'unit' => 'kg',
            'quantity' => 100,
        ])->assertCreated()->json('data.id');

        $this->postJson("/api/resources/{$id}/stock-in", ['quantity' => 25.50])->assertCreated();
        $this->postJson("/api/resources/{$id}/stock-out", ['quantity' => 10.25])->assertCreated();
        $this->postJson("/api/resources/{$id}/stock-out", ['quantity' => 5])->assertCreated();
        $this->postJson("/api/resources/{$id}/stock-in", ['quantity' => 1.75])->assertCreated();

        $in = (float) ResourceTransaction::where('resource_id', $id)->where('type', 'stock_in')->sum('quantity');
        $out = (float) ResourceTransaction::where('resource_id', $id)->where('type', 'stock_out')->sum('quantity');

        $this->assertEqualsWithDelta(112.00, (float) Resource::findOrFail($id)->quantity, 0.001);
        $this->assertEqualsWithDelta($in - $out, (float) Resource::findOrFail($id)->quantity, 0.001);
    }

    public function test_a_failure_while_recording_the_ledger_rolls_the_quantity_back(): void
    {
        $this->actingAsUser();
        $resource = $this->makeResource(['quantity' => 10]);

        // Simulate the ledger insert failing AFTER the quantity was already reduced.
        ResourceTransaction::creating(function () {
            throw new \RuntimeException('Simulated ledger failure');
        });

        $this->postJson("/api/resources/{$resource->id}/stock-out", ['quantity' => 4])
            ->assertStatus(500);

        $this->assertEquals(10, (float) $resource->fresh()->quantity);
        $this->assertDatabaseCount('resource_transactions', 0);
    }

    public function test_recorded_by_is_always_the_logged_in_user_even_if_the_request_tries_to_set_it(): void
    {
        $this->actingAsUser();
        $someoneElse = $this->makeUser();
        $resource = $this->makeResource(['quantity' => 10]);

        $this->postJson("/api/resources/{$resource->id}/stock-out", [
            'quantity' => 1,
            'recorded_by' => $someoneElse->id,
        ])->assertCreated();

        $this->assertDatabaseHas('resource_transactions', ['resource_id' => $resource->id, 'recorded_by' => $this->user->id]);
        $this->assertDatabaseMissing('resource_transactions', ['recorded_by' => $someoneElse->id]);
    }

    // ------------------------------------------------------------------
    // Livestock references
    // ------------------------------------------------------------------

    public function test_livestock_from_another_farm_is_rejected_on_stock_in_and_stock_out(): void
    {
        $this->actingAsUser();
        $resource = $this->makeResource(['name' => 'Feed Concentrate', 'category' => 'feed', 'quantity' => 10]);
        $animalOnOtherFarm = $this->makeLivestock($this->otherFarm);

        $this->postJson("/api/resources/{$resource->id}/stock-in", [
            'quantity' => 5, 'livestock_id' => $animalOnOtherFarm->id,
        ])->assertStatus(422)->assertJsonValidationErrors('livestock_id');

        $this->postJson("/api/resources/{$resource->id}/stock-out", [
            'quantity' => 5, 'livestock_id' => $animalOnOtherFarm->id,
        ])->assertStatus(422)->assertJsonValidationErrors('livestock_id');

        $this->assertEquals(10, (float) $resource->fresh()->quantity);
        $this->assertDatabaseCount('resource_transactions', 0);
    }

    public function test_livestock_from_the_same_farm_is_accepted_and_stored(): void
    {
        $this->actingAsUser();
        $resource = $this->makeResource(['name' => 'Vet Medicine', 'category' => 'medicine', 'quantity' => 10]);
        $animal = $this->makeLivestock($this->farm);

        $this->postJson("/api/resources/{$resource->id}/stock-out", [
            'quantity' => 1, 'livestock_id' => $animal->id, 'reason' => 'Treatment',
        ])->assertCreated();

        $this->assertDatabaseHas('resource_transactions', ['resource_id' => $resource->id, 'livestock_id' => $animal->id]);
    }

    public function test_an_unknown_livestock_id_is_rejected(): void
    {
        $this->actingAsUser();
        $resource = $this->makeResource(['quantity' => 10]);

        $this->postJson("/api/resources/{$resource->id}/stock-out", ['quantity' => 1, 'livestock_id' => 999999])
            ->assertStatus(422)->assertJsonValidationErrors('livestock_id');
    }

    // ------------------------------------------------------------------
    // Low stock / expiry
    // ------------------------------------------------------------------

    public function test_low_stock_returns_resources_at_or_below_their_minimum_only(): void
    {
        $this->actingAsUser();

        $this->makeResource(['name' => 'Below', 'quantity' => 2, 'minimum_stock' => 5]);
        $this->makeResource(['name' => 'Exactly At', 'quantity' => 5, 'minimum_stock' => 5]);
        $this->makeResource(['name' => 'Healthy', 'quantity' => 50, 'minimum_stock' => 5]);
        $this->makeResource(['farm_id' => $this->otherFarm->id, 'name' => 'Other Farm Low', 'quantity' => 1, 'minimum_stock' => 5]);

        $all = collect($this->getJson('/api/resources/low-stock')->assertOk()->json('data'))->pluck('name');
        $this->assertTrue($all->contains('Below'));
        $this->assertTrue($all->contains('Exactly At'));
        $this->assertFalse($all->contains('Healthy'));

        $oneFarm = collect($this->getJson("/api/resources/low-stock?farm_id={$this->farm->id}")->json('data'))->pluck('name');
        $this->assertTrue($oneFarm->contains('Below'));
        $this->assertFalse($oneFarm->contains('Other Farm Low'));
    }

    public function test_expiring_separates_expired_from_expiring_soon_and_ignores_far_future_and_no_expiry(): void
    {
        $this->actingAsUser();

        $this->makeResource(['name' => 'Already Expired', 'expiry_date' => now()->subDays(3)]);
        $this->makeResource(['name' => 'Expires Today', 'expiry_date' => now()]);
        $this->makeResource(['name' => 'Expiring Soon', 'expiry_date' => now()->addDays(5)]);
        $this->makeResource(['name' => 'Far Future', 'expiry_date' => now()->addDays(200)]);
        $this->makeResource(['name' => 'No Expiry', 'expiry_date' => null]);
        $this->makeResource(['farm_id' => $this->otherFarm->id, 'name' => 'Other Farm Expired', 'expiry_date' => now()->subDay()]);

        $json = $this->getJson("/api/resources/expiring?days=14&farm_id={$this->farm->id}")->assertOk()->json('data');

        $expired = collect($json['expired'])->pluck('name');
        $soon = collect($json['expiring_soon'])->pluck('name');

        $this->assertTrue($expired->contains('Already Expired'));
        $this->assertFalse($expired->contains('Expires Today'));
        $this->assertFalse($expired->contains('Other Farm Expired'));

        $this->assertTrue($soon->contains('Expires Today'));
        $this->assertTrue($soon->contains('Expiring Soon'));
        $this->assertFalse($soon->contains('Far Future'));
        $this->assertFalse($soon->contains('No Expiry'));
        $this->assertEquals(14, $json['window_days']);
    }

    public function test_expiring_rejects_an_invalid_days_window(): void
    {
        $this->actingAsUser();

        $this->getJson('/api/resources/expiring?days=0')->assertStatus(422)->assertJsonValidationErrors('days');
        $this->getJson('/api/resources/expiring?days=abc')->assertStatus(422)->assertJsonValidationErrors('days');
    }

    // ------------------------------------------------------------------
    // Authentication
    // ------------------------------------------------------------------

    public function test_unauthenticated_requests_are_rejected_on_every_resource_route(): void
    {
        // No actingAsUser() here on purpose.
        $routes = [
            ['getJson', '/api/resources'],
            ['postJson', '/api/resources'],
            ['getJson', '/api/resources/1'],
            ['putJson', '/api/resources/1'],
            ['deleteJson', '/api/resources/1'],
            ['postJson', '/api/resources/1/stock-in'],
            ['postJson', '/api/resources/1/stock-out'],
            ['getJson', '/api/resources/low-stock'],
            ['getJson', '/api/resources/expiring'],
        ];

        foreach ($routes as [$method, $uri]) {
            $this->{$method}($uri)->assertStatus(401);
        }
    }
}
