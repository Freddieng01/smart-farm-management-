<?php

namespace Tests;

use App\Models\Farm;
use App\Models\Livestock;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        // SAFETY RAIL: RefreshDatabase wipes and rebuilds every table.
        // This check runs BEFORE the framework boots, so if phpunit.xml is
        // missing or edited and the real database would be used, we stop here.
        $database = (string) (getenv('DB_DATABASE') ?: ($_ENV['DB_DATABASE'] ?? ''));

        if (! str_ends_with($database, '_test')) {
            throw new RuntimeException(
                "Refusing to run tests: DB_DATABASE is '{$database}'. "
                . "Tests may only run on a database whose name ends in '_test' (see phpunit.xml)."
            );
        }

        parent::setUp();
    }

    protected function makeFarm(string $name = 'Test Farm', float $acreage = 100): Farm
    {
        return Farm::create([
            'name' => $name,
            'total_acreage' => $acreage,
        ]);
    }

    /**
     * NOTE: the 'role' value is the one thing here that depends on the
     * team's roles migration. If tests fail with a role/enum error,
     * this is the single place to change.
     */
    protected function makeUser(array $overrides = []): User
    {
        return User::create(array_merge([
            'name' => 'Test User',
            'email' => 'user' . uniqid() . '@example.com',
            'password' => bcrypt('password'),
            'role' => 'Manager',
        ], $overrides));
    }

    protected function makeLivestock(Farm $farm, array $overrides = []): Livestock
    {
        return Livestock::create(array_merge([
            'farm_id' => $farm->id,
            'tag_number' => 'TAG-' . uniqid(),
            'species' => 'Cattle',
            'sex' => 'Female',
        ], $overrides));
    }
}
