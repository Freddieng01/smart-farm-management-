<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IrrigationSchedule;
use Illuminate\Http\Request;

class IrrigationScheduleController extends Controller
{
    public function index()
    {
        $schedules = IrrigationSchedule::with(['field', 'waterSource'])
            ->latest('irrigation_date')
            ->paginate(25);

        return response()->json($schedules);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'field_id' => 'required|exists:fields,id',
            'water_source_id' => 'required|exists:water_sources,id',
            'irrigation_date' => 'required|date',
            'start_time' => 'nullable|date_format:H:i',
            'duration_minutes' => 'nullable|numeric|min:0',
            'water_quantity' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'status' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        $schedule = IrrigationSchedule::create($validated);

        return response()->json([
            'message' => 'Irrigation schedule created successfully',
            'data' => $schedule->load(['field', 'waterSource']),
        ], 201);
    }

    public function show(IrrigationSchedule $irrigationSchedule)
    {
        return response()->json(
            $irrigationSchedule->load(['field', 'waterSource'])
        );
    }

    public function update(
        Request $request,
        IrrigationSchedule $irrigationSchedule
    ) {
        $validated = $request->validate([
            'field_id' => 'sometimes|required|exists:fields,id',
            'water_source_id' => 'sometimes|required|exists:water_sources,id',
            'irrigation_date' => 'sometimes|required|date',
            'start_time' => 'nullable|date_format:H:i',
            'duration_minutes' => 'nullable|numeric|min:0',
            'water_quantity' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'status' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        $irrigationSchedule->update($validated);

        return response()->json([
            'message' => 'Irrigation schedule updated successfully',
            'data' => $irrigationSchedule->load(['field', 'waterSource']),
        ]);
    }

    public function destroy(IrrigationSchedule $irrigationSchedule)
    {
        $irrigationSchedule->delete();

        return response()->json([
            'message' => 'Irrigation schedule deleted successfully',
        ]);
    }
}