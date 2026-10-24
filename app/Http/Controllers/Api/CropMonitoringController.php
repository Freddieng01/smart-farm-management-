<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CropMonitoring;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CropMonitoringController extends Controller
{
    /**
     * Display all crop monitoring records.
     */
    public function index(): JsonResponse
    {
        $monitoring = CropMonitoring::with([
            'planting.crop',
            'planting.field',
        ])
            ->latest('monitoring_date')
            ->paginate(25);

        return response()->json($monitoring);
    }

    /**
     * Create a new crop monitoring record.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'planting_id' => ['required', 'exists:plantings,id'],
            'monitoring_date' => ['required', 'date'],
            'growth_stage' => ['nullable', 'string', 'max:100'],
            'plant_height' => ['nullable', 'numeric', 'min:0'],
            'health_status' => ['nullable', 'string', 'max:100'],
            'estimated_yield' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $monitoring = CropMonitoring::create($validated);

        return response()->json([
            'message' => 'Crop monitoring record created successfully.',
            'data' => $monitoring->load([
                'planting.crop',
                'planting.field',
            ]),
        ], 201);
    }

    /**
     * Display a specific crop monitoring record.
     */
    public function show(CropMonitoring $cropMonitoring): JsonResponse
    {
        return response()->json([
            'data' => $cropMonitoring->load([
                'planting.crop',
                'planting.field',
            ]),
        ]);
    }

    /**
     * Update an existing crop monitoring record.
     */
    public function update(
        Request $request,
        CropMonitoring $cropMonitoring
    ): JsonResponse {
        $validated = $request->validate([
            'planting_id' => ['sometimes', 'required', 'exists:plantings,id'],
            'monitoring_date' => ['sometimes', 'required', 'date'],
            'growth_stage' => ['nullable', 'string', 'max:100'],
            'plant_height' => ['nullable', 'numeric', 'min:0'],
            'health_status' => ['nullable', 'string', 'max:100'],
            'estimated_yield' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $cropMonitoring->update($validated);

        return response()->json([
            'message' => 'Crop monitoring record updated successfully.',
            'data' => $cropMonitoring->fresh()->load([
                'planting.crop',
                'planting.field',
            ]),
        ]);
    }

    /**
     * Delete a crop monitoring record.
     */
    public function destroy(CropMonitoring $cropMonitoring): JsonResponse
    {
        $cropMonitoring->delete();

        return response()->json([
            'message' => 'Crop monitoring record deleted successfully.',
        ]);
    }
}
