<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\WeatherService;

class TestWeatherService extends Command
{
    protected $signature = 'app:test-weather-service';
    protected $description = 'Test weather service API';

    public function handle(WeatherService $service)
    {
        $lat = -15.4167;
        $lon = 28.2833;

        $this->info("Testing weather for Lat: $lat, Lon: $lon");
        $result = $service->getCurrentWeather($lat, $lon);

        if (isset($result['error']) && $result['error']) {
            $this->error('Weather Service Error: ' . ($result['message'] ?? 'Unknown error'));
        } else {
            $this->info('Weather Service Success!');
            $this->line(json_encode($result, JSON_PRETTY_PRINT));
        }
    }
}
