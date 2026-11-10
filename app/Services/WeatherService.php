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
        if ($this->apiKey === '') {
            return [
                'error' => true,
                'message' => 'Weather service is not configured. Set OPENWEATHER_API_KEY in the .env file.',
            ];
        }

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
        if ($this->apiKey === '') {
            return [
                'error' => true,
                'message' => 'Weather service is not configured. Set OPENWEATHER_API_KEY in the .env file.',
            ];
        }

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

    /** Forecast values at or beyond these count as a hazard. */
    public const HEAT_C = 35;          // temperature at or above
    public const COLD_C = 3;           // temperature at or below (frost risk)
    public const WIND_MS = 15;         // wind speed in m/s at or above
    public const HEAVY_RAIN_MM = 20;   // rain in a 3-hour slot at or above
    public const RAIN_LIKELY_PERCENT = 60;

    /**
     * Weather alerts for a location. This is what the Weather page shows, and
     * it is the same list the notifications are built from (see hazards()).
     */
    public function getAlerts(float $latitude, float $longitude): array
    {
        $forecast = $this->getForecast($latitude, $longitude);

        if (isset($forecast['error']) && $forecast['error']) {
            return [
                'error' => true,
                'message' => $forecast['message']
            ];
        }

        return ['alerts' => $this->hazards($forecast), 'error' => false];
    }

    /**
     * Scan a forecast and return one alert per kind of hazard (the worst slot of
     * each kind). Severity "high" is what also becomes a notification; "medium"
     * (rain likely) is shown on the Weather page only.
     *
     * Every alert: type, severity, title, message (with advice), date_time, priority.
     */
    public function hazards(array $forecast): array
    {
        $worst = [];

        foreach ($forecast['list'] ?? [] as $slot) {
            $dateTime = $slot['dt_txt'] ?? null;
            $temp = $slot['main']['temp'] ?? null;
            $min = $slot['main']['temp_min'] ?? $temp;
            $wind = $slot['wind']['speed'] ?? null;
            $rain = $slot['rain']['3h'] ?? 0;
            $code = (int) ($slot['weather'][0]['id'] ?? 0);
            $pop = (float) ($slot['pop'] ?? 0);

            if ($temp !== null && $temp >= self::HEAT_C && $temp > ($worst['heat']['value'] ?? -INF)) {
                $worst['heat'] = ['value' => $temp, 'at' => $dateTime];
            }
            if ($min !== null && $min <= self::COLD_C && $min < ($worst['cold']['value'] ?? INF)) {
                $worst['cold'] = ['value' => $min, 'at' => $dateTime];
            }
            if ($wind !== null && $wind >= self::WIND_MS && $wind > ($worst['wind']['value'] ?? -INF)) {
                $worst['wind'] = ['value' => $wind, 'at' => $dateTime];
            }
            if ($rain >= self::HEAVY_RAIN_MM && $rain > ($worst['rain']['value'] ?? -INF)) {
                $worst['rain'] = ['value' => $rain, 'at' => $dateTime];
            }
            if ($code >= 200 && $code <= 232 && $pop >= 0.5 && ! isset($worst['storm'])) {
                $worst['storm'] = ['value' => 0, 'at' => $dateTime];
            }
            if ($pop * 100 >= self::RAIN_LIKELY_PERCENT && $pop > ($worst['likely']['value'] ?? -INF)) {
                $worst['likely'] = ['value' => $pop, 'at' => $dateTime];
            }
        }

        $when = function (?string $at): string {
            try {
                return \Carbon\Carbon::parse($at ?? 'now')->format('D j M');
            } catch (\Throwable $e) {
                return 'soon';
            }
        };

        $out = [];
        $add = function (string $kind, string $type, string $severity, string $title, string $message, string $priority) use (&$out, $worst) {
            $out[] = [
                'type' => $type,
                'severity' => $severity,
                'title' => $title,
                'message' => $message,
                'date_time' => $worst[$kind]['at'] ?? null,
                'priority' => $priority,
            ];
        };

        if (isset($worst['heat'])) {
            $add('heat', 'high_temperature', 'high', 'Extreme heat expected',
                'Temperatures up to '.round($worst['heat']['value']).'°C expected around '.$when($worst['heat']['at']).'. Check irrigation and shade for livestock.', 'Urgent');
        }
        if (isset($worst['cold'])) {
            $add('cold', 'frost_risk', 'high', 'Frost risk',
                'Temperatures as low as '.round($worst['cold']['value']).'°C expected around '.$when($worst['cold']['at']).'. Protect sensitive crops and young animals.', 'Urgent');
        }
        if (isset($worst['wind'])) {
            $add('wind', 'strong_wind', 'high', 'Strong winds expected',
                'Winds up to '.round($worst['wind']['value']).' m/s expected around '.$when($worst['wind']['at']).'. Secure equipment and avoid spraying.', 'Urgent');
        }
        if (isset($worst['rain'])) {
            $add('rain', 'heavy_rain', 'high', 'Heavy rain expected',
                'About '.round($worst['rain']['value']).' mm of rain in 3 hours expected around '.$when($worst['rain']['at']).'. Watch for flooding and delay spraying or harvest.', 'Urgent');
        }
        if (isset($worst['storm'])) {
            $add('storm', 'thunderstorm', 'high', 'Thunderstorm expected',
                'Thunderstorms are likely around '.$when($worst['storm']['at']).'. Keep workers and animals safe.', 'Urgent');
        }
        if (isset($worst['likely'])) {
            $add('likely', 'rain_expected', 'medium', 'Rain likely',
                'Rain is likely ('.round($worst['likely']['value'] * 100).'% chance) around '.$when($worst['likely']['at']).'. Plan spraying and harvest around it.', 'Normal');
        }

        return $out;
    }
}
