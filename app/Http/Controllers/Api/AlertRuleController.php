<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AlertRule;
use Illuminate\Http\Request;

class AlertRuleController extends Controller
{
    public function index(Request $request)
    {
        $query = AlertRule::query();

        if ($request->has('farm_id')) {
            $query->where('farm_id', $request->input('farm_id'));
        }
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'farm_id' => 'required|exists:farms,id',
            'type' => 'required|string|max:255',
            'trigger_condition' => 'required|string|max:255',
            'is_active' => 'nullable|boolean',
        ]);

        $alertRule = AlertRule::create($validated);

        return response()->json($alertRule, 201);
    }

    public function show(AlertRule $alertRule)
    {
        return response()->json($alertRule);
    }

    public function update(Request $request, AlertRule $alertRule)
    {
        $validated = $request->validate([
            'type' => 'sometimes|string|max:255',
            'trigger_condition' => 'sometimes|string|max:255',
            'is_active' => 'nullable|boolean',
        ]);

        $alertRule->update($validated);

        return response()->json($alertRule);
    }

    public function destroy(AlertRule $alertRule)
    {
        $alertRule->delete();

        return response()->json(null, 204);
    }
}