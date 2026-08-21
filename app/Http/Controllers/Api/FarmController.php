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
            'name' => ['required', 'string', 'max:255', 'unique:farms,name'],
            'location_gps' => ['nullable', 'string', 'max:255'],
            'total_acreage' => ['required', 'numeric', 'min:0'],
        ]);

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
            'location_gps' => ['sometimes', 'nullable', 'string', 'max:255'],
            'total_acreage' => ['sometimes', 'required', 'numeric', 'min:0'],
        ]);

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
}
