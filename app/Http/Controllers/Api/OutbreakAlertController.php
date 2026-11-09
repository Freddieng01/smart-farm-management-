<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OutbreakAlert;
use App\Models\Planting;
use Illuminate\Http\Request;

class OutbreakAlertController extends Controller
{
    public function index(Request $request)
    {
        $alerts = OutbreakAlert::with(['field', 'planting.crop'])
            ->when($request->query('planting_id'), fn ($q, $id) => $q->where('planting_id', $id))
            ->when($request->query('crop_id'), fn ($q, $id) => $q->whereHas('planting', fn ($p) => $p->where('crop_id', $id)))
            ->latest('alert_date')
            ->paginate(min((int) $request->query('per_page', 25), 100));

        return response()->json($alerts);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'planting_id' => 'nullable|exists:plantings,id',
            'field_id' => 'required_without:planting_id|nullable|exists:fields,id',
            'pest_disease_name' => 'required|string|max:255',
            'alert_date' => 'required|date',
            'severity' => 'nullable|in:Low,Medium,High,Critical',
            'description' => 'required|string',
            'status' => 'nullable|in:Open,Investigating,Resolved',
            'notes' => 'nullable|string',
        ]);

        if (! empty($validated['planting_id'])) {
            $validated['field_id'] = Planting::findOrFail($validated['planting_id'])->field_id;
        }

        $alert = OutbreakAlert::create($validated);

        return response()->json([
            'message' => 'Outbreak alert created successfully.',
            'data' => $alert->load(['field', 'planting.crop']),
        ], 201);
    }

    public function show(OutbreakAlert $outbreakAlert)
    {
        return response()->json(
            $outbreakAlert->load(['field', 'planting.crop'])
        );
    }

    public function update(
        Request $request,
        OutbreakAlert $outbreakAlert
    ) {
        $validated = $request->validate([
            'planting_id' => 'sometimes|nullable|exists:plantings,id',
            'field_id' => 'sometimes|required|exists:fields,id',
            'pest_disease_name' => 'sometimes|required|string|max:255',
            'alert_date' => 'sometimes|required|date',
            'severity' => 'sometimes|nullable|in:Low,Medium,High,Critical',
            'description' => 'sometimes|required|string',
            'status' => 'sometimes|nullable|in:Open,Investigating,Resolved',
            'notes' => 'nullable|string',
        ]);

        if (! empty($validated['planting_id'])) {
            $validated['field_id'] = Planting::findOrFail($validated['planting_id'])->field_id;
        }

        $outbreakAlert->update($validated);

        return response()->json([
            'message' => 'Outbreak alert updated successfully.',
            'data' => $outbreakAlert->load(['field', 'planting.crop']),
        ]);
    }

    public function destroy(OutbreakAlert $outbreakAlert)
    {
        $outbreakAlert->delete();

        return response()->json([
            'message' => 'Outbreak alert deleted successfully.',
        ]);
    }
}
