<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Planting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlantingController extends Controller
{
    public function index(): JsonResponse
    {
        $plantings = Planting::with(['field', 'crop'])
            ->latest()
            ->paginate(25);

        return response()->json($plantings);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'field_id' => ['required', 'exists:fields,id'],
            'crop_id' => ['required', 'exists:crops,id'],
            'planting_date' => ['required', 'date'],
            'expected_harvest_date' => [
                'nullable',
                'date',
                'after_or_equal:planting_date'
            ],
            'quantity_planted' => ['nullable', 'numeric', 'min:0'],
            'unit' => ['nullable', 'string', 'max:50'],
            'status' => [
                'nullable',
                'in:planned,planted,growing,harvested,failed'
            ],
            'notes' => ['nullable', 'string'],
        ]);

        $planting = Planting::create($validated);

        return response()->json([
            'message' => 'Planting schedule created successfully.',
            'data' => $planting->load(['field', 'crop']),
        ], 201);
    }

    public function show(Planting $planting): JsonResponse
    {
        return response()->json([
            'data' => $planting->load([
                'field',
                'crop',
                'monitoring'
            ]),
        ]);
    }

    public function update(
        Request $request,
        Planting $planting
    ): JsonResponse {
        $validated = $request->validate([
            'field_id' => ['sometimes', 'required', 'exists:fields,id'],
            'crop_id' => ['sometimes', 'required', 'exists:crops,id'],
            'planting_date' => ['sometimes', 'required', 'date'],
            'expected_harvest_date' => ['nullable', 'date'],
            'quantity_planted' => ['nullable', 'numeric', 'min:0'],
            'unit' => ['nullable', 'string', 'max:50'],
            'status' => [
                'nullable',
                'in:planned,planted,growing,harvested,failed'
            ],
            'notes' => ['nullable', 'string'],
        ]);

        $planting->update($validated);

        return response()->json([
            'message' => 'Planting schedule updated successfully.',
            'data' => $planting->fresh(['field', 'crop']),
        ]);
    }

    public function destroy(Planting $planting): JsonResponse
    {
        $planting->delete();

        return response()->json([
            'message' => 'Planting schedule deleted successfully.',
        ]);
    }
} 
