<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\YieldRecord;
use Illuminate\Http\Request;

class YieldRecordController extends Controller
{
    public function index()
    {
        return response()->json(
            YieldRecord::with('field')->latest()->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'field_id' => 'required|exists:fields,id',
            'harvest_date' => 'required|date',
            'quantity' => 'required|numeric|min:0',
            'unit' => 'required|string|max:50',
            'quality_grade' => 'nullable|string|max:50',
            'moisture_percentage' => 'nullable|numeric|min:0|max:100',
            'loss_quantity' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $yieldRecord = YieldRecord::create($validated);

        return response()->json([
            'message' => 'Yield record created successfully.',
            'data' => $yieldRecord->load('field'),
        ], 201);
    }

    public function show(YieldRecord $yieldRecord)
    {
        return response()->json(
            $yieldRecord->load('field')
        );
    }

    public function update(Request $request, YieldRecord $yieldRecord)
    {
        $validated = $request->validate([
            'field_id' => 'sometimes|exists:fields,id',
            'harvest_date' => 'sometimes|date',
            'quantity' => 'sometimes|numeric|min:0',
            'unit' => 'sometimes|string|max:50',
            'quality_grade' => 'nullable|string|max:50',
            'moisture_percentage' => 'nullable|numeric|min:0|max:100',
            'loss_quantity' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $yieldRecord->update($validated);

        return response()->json([
            'message' => 'Yield record updated successfully.',
            'data' => $yieldRecord->load('field'),
        ]);
    }

    public function destroy(YieldRecord $yieldRecord)
    {
        $yieldRecord->delete();

        return response()->json([
            'message' => 'Yield record deleted successfully.',
        ]);
    }
}