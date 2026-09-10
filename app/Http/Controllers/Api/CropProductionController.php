<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CropProduction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CropProductionController extends Controller
{
    public function index(): JsonResponse
    {
        $productions = CropProduction::with('field')
            ->latest('harvest_date')
            ->paginate(25);

        return response()->json($productions);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'field_id' => ['required', 'exists:fields,id'],
            'crop_type' => ['required', 'string', 'max:255'],
            'quantity' => ['required', 'numeric', 'min:0'],
            'unit' => ['required', 'string', 'max:50'],
            'harvest_date' => ['required', 'date'],
            'quality_grade' => ['nullable', 'string', 'max:50'],
        ]);

        $production = CropProduction::create($validated);

        return response()->json([
            'message' => 'Production record created successfully.',
            'data' => $production->load('field'),
        ], 201);
    }

    public function show(CropProduction $cropProduction): JsonResponse
    {
        return response()->json([
            'data' => $cropProduction->load('field'),
        ]);
    }

    public function update(Request $request, CropProduction $cropProduction): JsonResponse
    {
        $validated = $request->validate([
            'field_id' => ['sometimes', 'required', 'exists:fields,id'],
            'crop_type' => ['sometimes', 'required', 'string', 'max:255'],
            'quantity' => ['sometimes', 'required', 'numeric', 'min:0'],
            'unit' => ['sometimes', 'required', 'string', 'max:50'],
            'harvest_date' => ['sometimes', 'required', 'date'],
            'quality_grade' => ['sometimes', 'nullable', 'string', 'max:50'],
        ]);

        $cropProduction->update($validated);

        return response()->json([
            'message' => 'Production record updated successfully.',
            'data' => $cropProduction->fresh('field'),
        ]);
    }

    public function destroy(CropProduction $cropProduction): JsonResponse
    {
        $cropProduction->delete();

        return response()->json([
            'message' => 'Production record deleted successfully.',
        ]);
    }
}
