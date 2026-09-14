<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StorageFacility;
use Illuminate\Http\Request;

class StorageFacilityController extends Controller
{
    public function index(Request $request)
    {
        $query = StorageFacility::query();

        if ($request->has('farm_id')) {
            $query->where('farm_id', $request->input('farm_id'));
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'farm_id' => 'required|exists:farms,id',
            'name' => 'required|string|max:255',
            'facility_type' => 'nullable|in:Warehouse,Cold Storage',
            'capacity' => 'nullable|numeric',
            'capacity_unit' => 'nullable|string|max:255',
            'current_temperature_c' => 'nullable|numeric',
        ]);

        $storageFacility = StorageFacility::create($validated);

        return response()->json($storageFacility, 201);
    }

    public function show(StorageFacility $storageFacility)
    {
        return response()->json($storageFacility->load('storedProduce'));
    }

    public function update(Request $request, StorageFacility $storageFacility)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'facility_type' => 'nullable|in:Warehouse,Cold Storage',
            'capacity' => 'nullable|numeric',
            'capacity_unit' => 'nullable|string|max:255',
            'current_temperature_c' => 'nullable|numeric',
        ]);

        $storageFacility->update($validated);

        return response()->json($storageFacility);
    }

    public function destroy(StorageFacility $storageFacility)
    {
        $storageFacility->delete();

        return response()->json(null, 204);
    }
}