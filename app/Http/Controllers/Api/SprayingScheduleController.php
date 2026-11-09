<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Planting;
use App\Models\SprayingSchedule;
use Illuminate\Http\Request;

class SprayingScheduleController extends Controller
{
    public function index(Request $request)
    {
        $schedules = SprayingSchedule::with(['field', 'planting.crop'])
            ->when($request->query('planting_id'), fn ($q, $id) => $q->where('planting_id', $id))
            ->when($request->query('crop_id'), fn ($q, $id) => $q->whereHas('planting', fn ($p) => $p->where('crop_id', $id)))
            ->latest('spraying_date')
            ->paginate(min((int) $request->query('per_page', 25), 100));

        return response()->json($schedules);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'planting_id' => 'nullable|exists:plantings,id',
            'field_id' => 'required_without:planting_id|nullable|exists:fields,id',
            'pest_disease_name' => 'required|string|max:255',
            'treatment' => 'required|string|max:255',
            'spraying_date' => 'required|date',
            'start_time' => 'nullable|date_format:H:i',
            'duration_minutes' => 'nullable|integer|min:0',
            'status' => 'nullable|in:Scheduled,Completed,Cancelled',
            'notes' => 'nullable|string',
        ]);

        if (! empty($validated['planting_id'])) {
            $validated['field_id'] = Planting::findOrFail($validated['planting_id'])->field_id;
        }

        $schedule = SprayingSchedule::create($validated);

        return response()->json([
            'message' => 'Spraying schedule created successfully.',
            'data' => $schedule->load(['field', 'planting.crop']),
        ], 201);
    }

    public function show(SprayingSchedule $sprayingSchedule)
    {
        return response()->json(
            $sprayingSchedule->load(['field', 'planting.crop'])
        );
    }

    public function update(
        Request $request,
        SprayingSchedule $sprayingSchedule
    ) {
        $validated = $request->validate([
            'planting_id' => 'sometimes|nullable|exists:plantings,id',
            'field_id' => 'sometimes|required|exists:fields,id',
            'pest_disease_name' => 'sometimes|required|string|max:255',
            'treatment' => 'sometimes|required|string|max:255',
            'spraying_date' => 'sometimes|required|date',
            'start_time' => 'nullable|date_format:H:i',
            'duration_minutes' => 'nullable|integer|min:0',
            'status' => 'sometimes|nullable|in:Scheduled,Completed,Cancelled',
            'notes' => 'nullable|string',
        ]);

        if (! empty($validated['planting_id'])) {
            $validated['field_id'] = Planting::findOrFail($validated['planting_id'])->field_id;
        }

        $sprayingSchedule->update($validated);

        return response()->json([
            'message' => 'Spraying schedule updated successfully.',
            'data' => $sprayingSchedule->load(['field', 'planting.crop']),
        ]);
    }

    public function destroy(SprayingSchedule $sprayingSchedule)
    {
        $sprayingSchedule->delete();

        return response()->json([
            'message' => 'Spraying schedule deleted successfully.',
        ]);
    }
}
