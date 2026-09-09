<?php

namespace Tests\Feature;

use App\Models\Farm;
use App\Models\Field;
use App\Models\Resource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ResourceManagementTest extends TestCase
{
    use RefreshDatabase;

    private Farm $farm;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->farm = Farm::create([
            'name' => 'Test Farm',
            'location_gps' => '0,0',
            'total_acreage' => 100,
        ]);

        $this->user = User::create([
            'name' => 'Test Manager',
            'email' => 'manager@example.com',
            'password' => bcrypt('password'),
            'role' => 'Manager',
        ]);
    }

    /** Call this at the top of any test that needs an authenticated user. */
    private function actingAsUser(): void
    {
        Sanctum::actingAs($this->user);
    }

    public function test_can_create_a_resource(): void
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

        $this->assertDatabaseHas('resources', [
            'farm_id' => $this->farm->id,
            'name' => 'NPK Fertilizer',
        ]);
    }

    public function test_duplicate_resource_name_on_same_farm_is_rejected(): void
    {
        $this->actingAsUser();

        Resource::create([
            'farm_id' => $this->farm->id,
            'name' => 'Diesel',
            'category' => 'fuel',
            'unit' => 'litre',
        ]);

        $response = $this->postJson('/api/resources', [
            'farm_id' => $this->farm->id,
            'name' => 'Diesel',
            'category' => 'fuel',
            'unit' => 'litre',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('name');
    }

    public function test_field_must_belong_to_the_selected_farm(): void
    {
        $this->actingAsUser();

        $otherFarm = Farm::create(['name' => 'Other Farm', 'total_acreage' => 10]);
        $otherFarmField = Field::create([
            'farm_id' => $otherFarm->id,
            'name' => 'North Plot',
            'size_hectares' => 5,
        ]);

        $response = $this->postJson('/api/resources', [
            'farm_id' => $this->farm->id,
            'field_id' => $otherFarmField->id,
            'name' => 'Maize Seeds',
            'category' => 'seeds',
            'unit' => 'kg',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('field_id');
    }

    public function test_stock_in_increases_quantity_and_creates_transaction(): void
    {
        $this->actingAsUser();

        $resource = Resource::create([
            'farm_id' => $this->farm->id,
            'name' => 'Urea',
            'category' => 'fertilizer',
            'unit' => 'kg',
            'quantity' => 50,
        ]);

        $response = $this->postJson("/api/resources/{$resource->id}/stock-in", [
            'quantity' => 25,
            'unit_cost' => 3.20,
            'reason' => 'Purchased from supplier',
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('resource_transactions', [
            'resource_id' => $resource->id,
            'type' => 'stock_in',
            'quantity' => '25.00',
            'recorded_by' => $this->user->id,
        ]);

        $this->assertEquals(75, (float) $resource->fresh()->quantity);
    }

    public function test_stock_out_decreases_quantity_and_creates_transaction(): void
    {
        $this->actingAsUser();

        $resource = Resource::create([
            'farm_id' => $this->farm->id,
            'name' => 'Urea',
            'category' => 'fertilizer',
            'unit' => 'kg',
            'quantity' => 50,
        ]);

        $response = $this->postJson("/api/resources/{$resource->id}/stock-out", [
            'quantity' => 20,
            'reason' => 'Applied to Field A',
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('resource_transactions', [
            'resource_id' => $resource->id,
            'type' => 'stock_out',
            'quantity' => '20.00',
        ]);

        $this->assertEquals(30, (float) $resource->fresh()->quantity);
    }

    public function test_stock_out_is_rejected_when_it_exceeds_current_stock(): void
    {
        $this->actingAsUser();

        $resource = Resource::create([
            'farm_id' => $this->farm->id,
            'name' => 'Urea',
            'category' => 'fertilizer',
            'unit' => 'kg',
            'quantity' => 10,
        ]);

        $response = $this->postJson("/api/resources/{$resource->id}/stock-out", [
            'quantity' => 50,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('quantity');

        // quantity and ledger must remain untouched
        $this->assertEquals(10, (float) $resource->fresh()->quantity);
        $this->assertDatabaseCount('resource_transactions', 0);
    }

    public function test_low_stock_endpoint_returns_only_resources_at_or_below_minimum(): void
    {
        $this->actingAsUser();

        Resource::create([
            'farm_id' => $this->farm->id, 'name' => 'Low Item', 'category' => 'tool',
            'unit' => 'unit', 'quantity' => 2, 'minimum_stock' => 5,
        ]);
        Resource::create([
            'farm_id' => $this->farm->id, 'name' => 'Healthy Item', 'category' => 'tool',
            'unit' => 'unit', 'quantity' => 50, 'minimum_stock' => 5,
        ]);

        $response = $this->getJson('/api/resources/low-stock');

        $response->assertOk();
        $names = collect($response->json('data'))->pluck('name');
        $this->assertTrue($names->contains('Low Item'));
        $this->assertFalse($names->contains('Healthy Item'));
    }

    public function test_expiring_endpoint_separates_expired_from_expiring_soon(): void
    {
        $this->actingAsUser();

        Resource::create([
            'farm_id' => $this->farm->id, 'name' => 'Already Expired', 'category' => 'chemical',
            'unit' => 'litre', 'expiry_date' => now()->subDays(3),
        ]);
        Resource::create([
            'farm_id' => $this->farm->id, 'name' => 'Expiring Soon', 'category' => 'chemical',
            'unit' => 'litre', 'expiry_date' => now()->addDays(5),
        ]);
        Resource::create([
            'farm_id' => $this->farm->id, 'name' => 'Far Future', 'category' => 'chemical',
            'unit' => 'litre', 'expiry_date' => now()->addDays(200),
        ]);

        $response = $this->getJson('/api/resources/expiring?days=14');

        $response->assertOk();
        $expiredNames = collect($response->json('data.expired'))->pluck('name');
        $soonNames = collect($response->json('data.expiring_soon'))->pluck('name');

        $this->assertTrue($expiredNames->contains('Already Expired'));
        $this->assertTrue($soonNames->contains('Expiring Soon'));
        $this->assertFalse($soonNames->contains('Far Future'));
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        // No actingAsUser() call here - this test intentionally stays unauthenticated.
        $response = $this->getJson('/api/resources');

        $response->assertStatus(401);
    }

    public function test_livestock_from_another_farm_is_rejected_on_stock_in(): void
    {
        $this->actingAsUser();

        $resource = Resource::create([
            'farm_id' => $this->farm->id,
            'name' => 'Feed Concentrate', 'category' => 'feed', 'unit' => 'kg', 'quantity' => 10,
        ]);

        $otherFarm = Farm::create(['name' => 'Other Farm', 'total_acreage' => 20]);

        // NOTE: only sets id/farm_id since the real livestock migration was not
        // available when this test was written - adjust to match your actual
        // schema's NOT NULL columns if this insert fails.
        $livestockIdOnOtherFarm = DB::table('livestock')->insertGetId([
            'farm_id' => $otherFarm->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->postJson("/api/resources/{$resource->id}/stock-in", [
            'quantity' => 5,
            'livestock_id' => $livestockIdOnOtherFarm,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('livestock_id');
        $this->assertEquals(10, (float) $resource->fresh()->quantity);
    }
}
