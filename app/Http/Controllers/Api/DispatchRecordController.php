<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DispatchRecord;
use App\Models\StoredProduce;
use Illuminate\Http\Request;

class DispatchRecordController extends Controller
{
    public function index(StoredProduce $storedProduce)
    {
        return response()->json($storedProduce->dispatchRecords);
    }

    public function store(Request $request, StoredProduce $storedProduce)
    {
        $validated = $request->validate([
            'quantity_dispatched' => 'required|numeric',
            'destination' => 'nullable|string|max:255',
            'dispatch_date' => 'required|date',
            'status' => 'nullable|in:Dispatched,Delivered',
        ]);

        $dispatch = $storedProduce->dispatchRecords()->create($validated);

        return response()->json($dispatch, 201);
    }

    public function show(DispatchRecord $dispatchRecord)
    {
        return response()->json($dispatchRecord);
    }

    public function update(Request $request, DispatchRecord $dispatchRecord)
    {
        $validated = $request->validate([
            'quantity_dispatched' => 'sometimes|numeric',
            'destination' => 'nullable|string|max:255',
            'dispatch_date' => 'sometimes|date',
            'status' => 'sometimes|in:Dispatched,Delivered',
        ]);

        $dispatchRecord->update($validated);

        return response()->json($dispatchRecord);
    }

    public function destroy(DispatchRecord $dispatchRecord)
    {
        $dispatchRecord->delete();

        return response()->json(null, 204);
    }
}