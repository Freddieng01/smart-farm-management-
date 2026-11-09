<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Planting;
use App\Models\ScoutingRecord;
use Illuminate\Http\Request;

class ScoutingRecordController extends Controller
{
    public function index(Request $request)
    {
        // ?planting_id=5 lists only that planting's records (used by the planting profile)
        $records = ScoutingRecord::with(['field', 'planting.crop'])
            ->when($request->query('planting_id'), fn ($q, $id) => $q->where('planting_id', $id))
            ->when($request->query('crop_id'), fn ($q, $id) => $q->whereHas('planting', fn ($p) => $p->where('crop_id', $id)))
            ->latest('scouting_date')
            ->paginate(min((int) $request->query('per_page', 25), 100));

        return response()->json($records);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'planting_id' => 'nullable|exists:plantings,id',
            'field_id' => 'required_without:planting_id|nullable|exists:fields,id',
            'scouting_date' => 'required|date',
            'pest_disease_name' => 'required|string|max:255',
            'type' => 'required|in:Pest,Disease',
            'severity' => 'nullable|in:Low,Medium,High,Critical',
            'affected_area' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        // A record on a planting always sits in that planting's own field.
        if (! empty($validated['planting_id'])) {
            $validated['field_id'] = Planting::findOrFail($validated['planting_id'])->field_id;
        }

        $record = ScoutingRecord::create($validated);

        return response()->json([
            'message' => 'Scouting record created successfully.',
            'data' => $record->load(['field', 'planting.crop']),
        ], 201);
    }

    public function show(ScoutingRecord $scoutingRecord)
    {
        return response()->json(
            $scoutingRecord->load(['field', 'planting.crop'])
        );
    }

    public function update(
        Request $request,
        ScoutingRecord $scoutingRecord
    ) {
        $validated = $request->validate([
            'planting_id' => 'sometimes|nullable|exists:plantings,id',
            'field_id' => 'sometimes|required|exists:fields,id',
            'scouting_date' => 'sometimes|required|date',
            'pest_disease_name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|in:Pest,Disease',
            'severity' => 'nullable|in:Low,Medium,High,Critical',
            'affected_area' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        if (! empty($validated['planting_id'])) {
            $validated['field_id'] = Planting::findOrFail($validated['planting_id'])->field_id;
        }

        $scoutingRecord->update($validated);

        return response()->json([
            'message' => 'Scouting record updated successfully.',
            'data' => $scoutingRecord->load(['field', 'planting.crop']),
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
