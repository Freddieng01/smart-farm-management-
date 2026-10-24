<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ScoutingRecord;
use Illuminate\Http\Request;

class ScoutingRecordController extends Controller
{
    public function index()
    {
        $records = ScoutingRecord::with('field')
            ->latest('scouting_date')
            ->paginate(25);

        return response()->json($records);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'field_id' => 'required|exists:fields,id',
            'scouting_date' => 'required|date',
            'pest_disease_name' => 'required|string|max:255',
            'type' => 'required|in:Pest,Disease',
            'severity' => 'nullable|in:Low,Medium,High,Critical',
            'affected_area' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $record = ScoutingRecord::create($validated);

        return response()->json([
            'message' => 'Scouting record created successfully.',
            'data' => $record->load('field'),
        ], 201);
    }

    public function show(ScoutingRecord $scoutingRecord)
    {
        return response()->json(
            $scoutingRecord->load('field')
        );
    }

    public function update(
        Request $request,
        ScoutingRecord $scoutingRecord
    ) {
        $validated = $request->validate([
            'field_id' => 'sometimes|required|exists:fields,id',
            'scouting_date' => 'sometimes|required|date',
            'pest_disease_name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|in:Pest,Disease',
            'severity' => 'nullable|in:Low,Medium,High,Critical',
            'affected_area' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $scoutingRecord->update($validated);

        return response()->json([
            'message' => 'Scouting record updated successfully.',
            'data' => $scoutingRecord->load('field'),
        ]);
    }

    public function destroy(ScoutingRecord $scoutingRecord)
    {
        $scoutingRecord->delete();

        return response()->json([
            'message' => 'Scouting record deleted successfully.',
        ]);
    }
}
