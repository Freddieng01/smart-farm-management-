<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Livestock;
use Illuminate\Http\Request;

class LivestockController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Livestock::query();

        // Allow filtering by farm, e.g. /api/livestock?farm_id=1
        if ($request->has('farm_id')) {
            $query->where('farm_id', $request->input('farm_id'));
        }

        return response()->json($query->with(['vaccinations', 'healthRecords', 'breedingRecords'])->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'farm_id' => 'required|exists:farms,id',
            'tag_number' => 'required|string|max:255',
            'species' => 'required|string|max:255',
            'breed' => 'nullable|string|max:255',
            'sex' => 'required|in:Male,Female',
            'birth_date' => 'nullable|date',
            'death_date' => 'nullable|date',
            'status' => 'nullable|string|max:255',
            'current_weight_kg' => 'nullable|numeric',
        ]);

        $livestock = Livestock::create($validated);

        return response()->json($livestock, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Livestock $livestock)
    {
        return response()->json($livestock->load(['vaccinations', 'healthRecords', 'breedingRecords']));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Livestock $livestock)
    {
        $validated = $request->validate([
            'tag_number' => 'sometimes|string|max:255',
            'species' => 'sometimes|string|max:255',
            'breed' => 'nullable|string|max:255',
            'sex' => 'sometimes|in:Male,Female',
            'birth_date' => 'nullable|date',
            'death_date' => 'nullable|date',
            'status' => 'sometimes|string|max:255',
            'current_weight_kg' => 'nullable|numeric',
        ]);

        $livestock->update($validated);

        return response()->json($livestock);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Livestock $livestock)
    {
        $livestock->delete();

        return response()->json(null, 204);
    }
}