<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SprayingSchedule;
use Illuminate\Http\Request;

class SprayingScheduleController extends Controller
{
    public function index()
    {
        $schedules = SprayingSchedule::with('field')
            ->latest('spraying_date')
            ->paginate(25);

        return response()->json($schedules);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'field_id' => 'required|exists:fields,id',
            'pest_disease_name' => 'required|string|max:255',
            'treatment' => 'required|string|max:255',
            'spraying_date' => 'required|date',
            'start_time' => 'nullable|date_format:H:i',
            'duration_minutes' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        $schedule = SprayingSchedule::create($validated);

        return response()->json([
            'message' => 'Spraying schedule created successfully',
            'data' => $schedule->load('field'),
        ], 201);
    }

    public function show(SprayingSchedule $sprayingSchedule)
    {
        return response()->json(
            $sprayingSchedule->load('field')
        );
    }

    public function update(
        Request $request,
        SprayingSchedule $sprayingSchedule
    ) {
        $validated = $request->validate([
            'field_id' => 'sometimes|required|exists:fields,id',
            'pest_disease_name' => 'sometimes|required|string|max:255',
            'treatment' => 'sometimes|required|string|max:255',
            'spraying_date' => 'sometimes|required|date',
            'start_time' => 'nullable|date_format:H:i',
            'duration_minutes' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        $sprayingSchedule->update($validated);

        return response()->json([
            'message' => 'Spraying schedule updated successfully',
            'data' => $sprayingSchedule->load('field'),
        ]);
    }

    public function destroy(SprayingSchedule $sprayingSchedule)
    {
        $sprayingSchedule->delete();

        return response()->json([
            'message' => 'Spraying schedule deleted successfully',
        ]);
    }
}