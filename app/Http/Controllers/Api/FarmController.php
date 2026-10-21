<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Farm;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FarmController extends Controller
{
    public function index(): JsonResponse
    {
        $farms = Farm::withCount(['fields', 'employees'])
            ->latest()
            ->paginate(25);

        return response()->json($farms);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('farms', 'name')],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'total_acreage' => ['nullable', 'numeric', 'min:0'],
        ]);

        $validated['location_gps'] = $this->locationGps($validated['latitude'], $validated['longitude']);

        $farm = Farm::create($validated);

        return response()->json([
            'message' => 'Farm created successfully.',
            'data' => $farm,
        ], 201);
    }

    public function show(Farm $farm): JsonResponse
    {
        return response()->json([
            'data' => $farm->load(['fields', 'employees.user']),
        ]);
    }

    public function update(Request $request, Farm $farm): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('farms', 'name')->ignore($farm)],
            'latitude' => ['sometimes', 'required_with:longitude', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'required_with:latitude', 'numeric', 'between:-180,180'],
            'total_acreage' => ['sometimes', 'required', 'numeric', 'min:0'],
        ]);

        if (array_key_exists('latitude', $validated) && array_key_exists('longitude', $validated)) {
            $validated['location_gps'] = $this->locationGps($validated['latitude'], $validated['longitude']);
        }

        $farm->update($validated);

        return response()->json([
            'message' => 'Farm updated successfully.',
            'data' => $farm->fresh(['fields', 'employees.user']),
        ]);
    }

    public function destroy(Farm $farm): JsonResponse
    {
        $farm->delete();

        return response()->json([
            'message' => 'Farm deleted successfully.',
        ]);
    }

    private function locationGps(float $latitude, float $longitude): string
    {
        return sprintf('%.8F,%.8F', $latitude, $longitude);
    }
}
