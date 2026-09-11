<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OutbreakAlert;
use Illuminate\Http\Request;

class OutbreakAlertController extends Controller
{
    public function index()
    {
        $alerts = OutbreakAlert::with('field')
            ->latest('alert_date')
            ->paginate(25);

        return response()->json($alerts);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'field_id' => 'required|exists:fields,id',
            'pest_disease_name' => 'required|string|max:255',
            'alert_date' => 'required|date',
            'severity' => 'nullable|string|max:50',
            'description' => 'required|string',
            'status' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        $alert = OutbreakAlert::create($validated);

        return response()->json([
            'message' => 'Outbreak alert created successfully',
            'data' => $alert->load('field'),
        ], 201);
    }

    public function show(OutbreakAlert $outbreakAlert)
    {
        return response()->json(
            $outbreakAlert->load('field')
        );
    }

    public function update(
        Request $request,
        OutbreakAlert $outbreakAlert
    ) {
        $validated = $request->validate([
            'field_id' => 'sometimes|required|exists:fields,id',
            'pest_disease_name' => 'sometimes|required|string|max:255',
            'alert_date' => 'sometimes|required|date',
            'severity' => 'nullable|string|max:50',
            'description' => 'sometimes|required|string',
            'status' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        $outbreakAlert->update($validated);

        return response()->json([
            'message' => 'Outbreak alert updated successfully',
            'data' => $outbreakAlert->load('field'),
        ]);
    }

    public function destroy(OutbreakAlert $outbreakAlert)
    {
        $outbreakAlert->delete();

        return response()->json([
            'message' => 'Outbreak alert deleted successfully',
        ]);
    }
}