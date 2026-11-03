<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

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
        try {
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
                Log::error('Weather API failed: ' . $response->body());
                return [
                    'error' => true,
                    'message' => 'Weather service is currently unavailable. Please check your connection.'
                ];
            }

            return array_merge($response->json(), ['error' => false]);
        } catch (Exception $e) {
            Log::error('Weather Service Exception: ' . $e->getMessage());
            return [
                'error' => true,
                'message' => 'Unable to connect to weather service. Please try again later.'
            ];
        }
    }

    public function getForecast(float $latitude, float $longitude): array
    {
        try {
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
                Log::error('Weather Forecast API failed: ' . $response->body());
                return [
                    'error' => true,
                    'message' => 'Weather forecast is currently unavailable.'
                ];
            }

            return array_merge($response->json(), ['error' => false]);
        } catch (Exception $e) {
            Log::error('Weather Forecast Exception: ' . $e->getMessage());
            return [
                'error' => true,
                'message' => 'Unable to connect to forecast service.'
            ];
        }
    }

    public function getAlerts(float $latitude, float $longitude): array
    {
        $forecast = $this->getForecast($latitude, $longitude);

        if (isset($forecast['error']) && $forecast['error']) {
            return [
                'error' => true,
                'message' => $forecast['message']
            ];
        }

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

        return array_merge(['alerts' => $alerts], ['error' => false]);
    }
}
