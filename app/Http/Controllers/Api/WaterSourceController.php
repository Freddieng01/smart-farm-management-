<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WaterSource;
use Illuminate\Http\Request;

class WaterSourceController extends Controller
{
    public function index()
    {
        $waterSources = WaterSource::with('farm')
            ->latest()
            ->paginate(25);

        return response()->json($waterSources);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'farm_id' => 'required|exists:farms,id',
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:100',
            'location' => 'nullable|string|max:255',
            'capacity' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        $waterSource = WaterSource::create($validated);

        return response()->json([
            'message' => 'Water source created successfully',
            'data' => $waterSource->load('farm'),
        ], 201);
    }

    public function show(WaterSource $waterSource)
    {
        return response()->json(
            $waterSource->load(['farm', 'irrigationSchedules', 'pumpMonitorings'])
        );
    }

    public function update(Request $request, WaterSource $waterSource)
    {
        $validated = $request->validate([
            'farm_id' => 'sometimes|required|exists:farms,id',
            'name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|string|max:100',
            'location' => 'nullable|string|max:255',
            'capacity' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        $waterSource->update($validated);

        return response()->json([
            'message' => 'Water source updated successfully',
            'data' => $waterSource->load('farm'),
        ]);
    }

    public function destroy(WaterSource $waterSource)
    {
        $waterSource->delete();

        return response()->json([
            'message' => 'Water source deleted successfully',
        ]);
    }
}