<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class WeatherService
{
    private string $apiKey;
    private string $baseUrl;

    public function __construct()
    {
        $this->apiKey = config('services.weather.api_key') ?? '';
        $this->baseUrl = config('services.weather.base_url') ?? 'https://api.openweathermap.org/data/2.5';
    }

    public function getCurrentWeather(float $latitude, float $longitude): array
    {
        $response = Http::timeout(10)->get(
            $this->baseUrl . '/weather',
            [
                'lat' => $latitude,
                'lon' => $longitude,
                'appid' => $this->apiKey,
                'units' => 'metric',
            ]
        );

        if ($response->failed()) {
            throw new RuntimeException(
                'Unable to retrieve current weather data.'
            );
        }

        return $response->json();
    }

    public function getForecast(float $latitude, float $longitude): array
    {
        $response = Http::timeout(10)->get(
            $this->baseUrl . '/forecast',
            [
                'lat' => $latitude,
                'lon' => $longitude,
                'appid' => $this->apiKey,
                'units' => 'metric',
            ]
        );

        if ($response->failed()) {
            throw new RuntimeException(
                'Unable to retrieve weather forecast.'
            );
        }

        return $response->json();
    }

    public function getAlerts(float $latitude, float $longitude): array
    {
        $forecast = $this->getForecast($latitude, $longitude);

        $alerts = [];

        foreach ($forecast['list'] ?? [] as $item) {
            $dateTime = $item['dt_txt'] ?? 'Unknown time';

            $temperature = $item['main']['temp'] ?? null;
            $windSpeed = $item['wind']['speed'] ?? null;
            $rainProbability = ($item['pop'] ?? 0) * 100;

            if ($temperature !== null && $temperature >= 35) {
                $alerts[] = [
                    'type' => 'high_temperature',
                    'severity' => 'high',
                    'message' => 'High temperature expected: '
                        . $temperature . '°C',
                    'date_time' => $dateTime,
                ];
            }

            if ($windSpeed !== null && $windSpeed >= 15) {
                $alerts[] = [
                    'type' => 'strong_wind',
                    'severity' => 'high',
                    'message' => 'Strong winds expected: '
                        . $windSpeed . ' m/s',
                    'date_time' => $dateTime,
                ];
            }

            if ($rainProbability >= 60) {
                $alerts[] = [
                    'type' => 'rain_expected',
                    'severity' => 'medium',
                    'message' => 'Rain is likely with a '
                        . $rainProbability . '% probability.',
                    'date_time' => $dateTime,
                ];
            }
        }

        return $alerts;
    }
}