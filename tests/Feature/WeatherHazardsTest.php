<?php

namespace Tests\Feature;

use App\Services\WeatherService;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

/** The Weather page and the notifications use this one list, so they cannot disagree. */
class WeatherHazardsTest extends TestCase
{
    private function service(): WeatherService
    {
        return (new ReflectionClass(WeatherService::class))->newInstanceWithoutConstructor();
    }

    public function test_extreme_conditions_are_reported_once_each_as_high_severity(): void
    {
        $forecast = ['list' => [
            ['dt_txt' => '2026-11-10 12:00:00', 'main' => ['temp' => 37, 'temp_min' => 30], 'wind' => ['speed' => 5], 'pop' => 0.1, 'weather' => [['id' => 800]]],
            ['dt_txt' => '2026-11-11 03:00:00', 'main' => ['temp' => 2, 'temp_min' => 1], 'wind' => ['speed' => 16], 'pop' => 0.7, 'rain' => ['3h' => 25], 'weather' => [['id' => 211]]],
        ]];

        $byType = collect($this->service()->hazards($forecast))->keyBy('type');

        foreach (['high_temperature', 'frost_risk', 'strong_wind', 'heavy_rain', 'thunderstorm'] as $type) {
            $this->assertSame('high', $byType[$type]['severity'], $type);
        }
        $this->assertSame('medium', $byType['rain_expected']['severity']);
        $this->assertCount(6, $byType);
    }

    public function test_a_calm_forecast_has_no_alerts(): void
    {
        $forecast = ['list' => [
            ['dt_txt' => '2026-11-12 03:00:00', 'main' => ['temp' => 20, 'temp_min' => 18], 'wind' => ['speed' => 3], 'pop' => 0.1, 'weather' => [['id' => 800]]],
        ]];

        $this->assertSame([], $this->service()->hazards($forecast));
    }
}
