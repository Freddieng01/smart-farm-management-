<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HarvestSchedule;
use Illuminate\Http\Request;

class HarvestScheduleController extends Controller
{
    public function index()
    {
        return response()->json(
            HarvestSchedule::with('field')->latest()->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'field_id' => 'required|exists:fields,id',
            'harvest_date' => 'required|date',
            'start_time' => 'nullable|date_format:H:i',
            'estimated_quantity' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'status' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        $harvestSchedule = HarvestSchedule::create($validated);

        return response()->json([
            'message' => 'Harvest schedule created successfully.',
            'data' => $harvestSchedule->load('field'),
        ], 201);
    }

    public function show(HarvestSchedule $harvestSchedule)
    {
        return response()->json(
            $harvestSchedule->load('field')
        );
    }

    public function update(Request $request, HarvestSchedule $harvestSchedule)
    {
        $validated = $request->validate([
            'field_id' => 'sometimes|exists:fields,id',
            'harvest_date' => 'sometimes|date',
            'start_time' => 'nullable|date_format:H:i',
            'estimated_quantity' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'status' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        $harvestSchedule->update($validated);

        return response()->json([
            'message' => 'Harvest schedule updated successfully.',
            'data' => $harvestSchedule->load('field'),
        ]);
    }

    public function destroy(HarvestSchedule $harvestSchedule)
    {
        $harvestSchedule->delete();

        return response()->json([
            'message' => 'Harvest schedule deleted successfully.',
        ]);
    }
}