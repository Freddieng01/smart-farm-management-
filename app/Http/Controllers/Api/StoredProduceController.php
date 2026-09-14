<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StorageFacility;
use App\Models\StoredProduce;
use Illuminate\Http\Request;

class StoredProduceController extends Controller
{
    public function index(Request $request)
    {
        $query = StoredProduce::query();

        if ($request->has('storage_facility_id')) {
            $query->where('storage_facility_id', $request->input('storage_facility_id'));
        }
        if ($request->has('quality_status')) {
            $query->where('quality_status', $request->input('quality_status'));
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'storage_facility_id' => 'required|exists:storage_facilities,id',
            'crop_name' => 'required|string|max:255',
            'quantity' => 'required|numeric',
            'unit' => 'nullable|string|max:255',
            'grade' => 'nullable|string|max:255',
            'quality_status' => 'nullable|in:Good,Fair,Spoiled',
            'date_stored' => 'required|date',
            'valuation_amount' => 'nullable|numeric',
        ]);

        $storedProduce = StoredProduce::create($validated);

        return response()->json($storedProduce, 201);
    }

    public function show(StoredProduce $storedProduce)
    {
        return response()->json($storedProduce->load(['stockMovements', 'dispatchRecords']));
    }

    public function update(Request $request, StoredProduce $storedProduce)
    {
        $validated = $request->validate([
            'crop_name' => 'sometimes|string|max:255',
            'quantity' => 'sometimes|numeric',
            'unit' => 'nullable|string|max:255',
            'grade' => 'nullable|string|max:255',
            'quality_status' => 'sometimes|in:Good,Fair,Spoiled',
            'date_stored' => 'sometimes|date',
            'valuation_amount' => 'nullable|numeric',
        ]);

        $storedProduce->update($validated);

        return response()->json($storedProduce);
    }

    public function destroy(StoredProduce $storedProduce)
    {
        $storedProduce->delete();

        return response()->json(null, 204);
    }
}