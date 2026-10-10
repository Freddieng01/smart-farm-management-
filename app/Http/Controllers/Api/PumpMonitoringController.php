<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PumpMonitoring;
use Illuminate\Http\Request;

class PumpMonitoringController extends Controller
{
    public function index()
    {
        $monitorings = PumpMonitoring::with('waterSource')
            ->latest('monitoring_date')
            ->paginate(25);

        return response()->json($monitorings);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'water_source_id' => 'required|exists:water_sources,id',
            'monitoring_date' => 'required|date',
            'status' => 'nullable|string|max:50',
            'operating_hours' => 'nullable|numeric|min:0',
            'flow_rate' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $monitoring = PumpMonitoring::create($validated);

        return response()->json([
            'message' => 'Pump monitoring record created successfully',
            'data' => $monitoring->load('waterSource'),
        ], 201);
    }

    public function show(PumpMonitoring $pumpMonitoring)
    {
        return response()->json(
            $pumpMonitoring->load('waterSource')
        );
    }

    public function update(
        Request $request,
        PumpMonitoring $pumpMonitoring
    ) {
        $validated = $request->validate([
            'water_source_id' => 'sometimes|required|exists:water_sources,id',
            'monitoring_date' => 'sometimes|required|date',
            'status' => 'nullable|string|max:50',
            'operating_hours' => 'nullable|numeric|min:0',
            'flow_rate' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $pumpMonitoring->update($validated);

        return response()->json([
            'message' => 'Pump monitoring record updated successfully',
            'data' => $pumpMonitoring->load('waterSource'),
        ]);
    }

    public function destroy(PumpMonitoring $pumpMonitoring)
    {
        $pumpMonitoring->delete();

        return response()->json([
            'message' => 'Pump monitoring record deleted successfully',
        ]);
    }
}