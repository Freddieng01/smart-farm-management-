<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StockMovement;
use App\Models\StoredProduce;
use Illuminate\Http\Request;

class StockMovementController extends Controller
{
    public function index(StoredProduce $storedProduce)
    {
        return response()->json($storedProduce->stockMovements);
    }

    public function store(Request $request, StoredProduce $storedProduce)
    {
        $validated = $request->validate([
            'movement_type' => 'required|in:Stock In,Stock Out,Transfer',
            'quantity' => 'required|numeric',
            'movement_date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        $movement = $storedProduce->stockMovements()->create($validated);

        return response()->json($movement, 201);
    }

    public function show(StockMovement $stockMovement)
    {
        return response()->json($stockMovement);
    }

    public function update(Request $request, StockMovement $stockMovement)
    {
        $validated = $request->validate([
            'movement_type' => 'sometimes|in:Stock In,Stock Out,Transfer',
            'quantity' => 'sometimes|numeric',
            'movement_date' => 'sometimes|date',
            'notes' => 'nullable|string',
        ]);

        $stockMovement->update($validated);

        return response()->json($stockMovement);
    }

    public function destroy(StockMovement $stockMovement)
    {
        $stockMovement->delete();

        return response()->json(null, 204);
    }
}