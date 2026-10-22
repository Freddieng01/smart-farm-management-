<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Farm;
use App\Services\WeatherService;
use Illuminate\Http\Request;
use Throwable;

class WeatherController extends Controller
{
    public function __construct(
        private WeatherService $weatherService
    ) {
    }

    public function current(Request $request)
    {
        $request->validate([
            'farm_id' => ['required', 'integer', 'exists:farms,id'],
        ]);

        try {
            $farm = Farm::findOrFail($request->farm_id);

            $latitude = $farm->latitude ?? $this->getCoordinates($farm->location_gps)[0];
            $longitude = $farm->longitude ?? $this->getCoordinates($farm->location_gps)[1];

            $weather = $this->weatherService->getCurrentWeather(
                $latitude,
                $longitude
            );

            return response()->json([
                'farm' => $farm->name,
                'weather' => $weather,
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'message' => 'Unable to retrieve current weather.',
                'error' => $e->getMessage(),
            ], 502);
        }
    }

    public function forecast(Request $request)
    {
        $request->validate([
            'farm_id' => ['required', 'integer', 'exists:farms,id'],
        ]);

        try {
            $farm = Farm::findOrFail($request->farm_id);

            $latitude = $farm->latitude ?? $this->getCoordinates($farm->location_gps)[0];
            $longitude = $farm->longitude ?? $this->getCoordinates($farm->location_gps)[1];

            $forecast = $this->weatherService->getForecast(
                $latitude,
                $longitude
            );

            return response()->json([
                'farm' => $farm->name,
                'forecast' => $forecast,
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'message' => 'Unable to retrieve weather forecast.',
                'error' => $e->getMessage(),
            ], 502);
        }
    }

    public function alerts(Request $request)
    {
        $request->validate([
            'farm_id' => ['required', 'integer', 'exists:farms,id'],
        ]);

        try {
            $farm = Farm::findOrFail($request->farm_id);

            $latitude = $farm->latitude ?? $this->getCoordinates($farm->location_gps)[0];
            $longitude = $farm->longitude ?? $this->getCoordinates($farm->location_gps)[1];

            $alerts = $this->weatherService->getAlerts(
                $latitude,
                $longitude
            );

            return response()->json([
                'farm' => $farm->name,
                'alerts' => $alerts,
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'message' => 'Unable to retrieve weather alerts.',
                'error' => $e->getMessage(),
            ], 502);
        }
    }

    private function getCoordinates(?string $locationGps): array
    {
        if (!$locationGps) {
            throw new \RuntimeException(
                'Farm does not have GPS coordinates.'
            );
        }

        $coordinates = array_map(
            'trim',
            explode(',', $locationGps)
        );

        if (count($coordinates) !== 2) {
            throw new \RuntimeException(
                'Farm GPS location must be in latitude,longitude format.'
            );
        }

        return [
            (float) $coordinates[0],
            (float) $coordinates[1],
        ];
    }
}