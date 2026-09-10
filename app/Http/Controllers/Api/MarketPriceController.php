<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MarketPrice;
use Illuminate\Http\Request;

class MarketPriceController extends Controller
{
    public function index(Request $request)
    {
        $query = MarketPrice::query();

        if ($request->has('farm_id')) {
            $query->where('farm_id', $request->input('farm_id'));
        }
        if ($request->has('crop_name')) {
            $query->where('crop_name', $request->input('crop_name'));
        }

        return response()->json($query->orderByDesc('recorded_date')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'farm_id' => 'required|exists:farms,id',
            'crop_name' => 'required|string|max:255',
            'price_per_unit' => 'required|numeric',
            'unit' => 'nullable|string|max:255',
            'market_destination' => 'nullable|string|max:255',
            'recorded_date' => 'required|date',
        ]);

        $marketPrice = MarketPrice::create($validated);

        return response()->json($marketPrice, 201);
    }

    public function show(MarketPrice $marketPrice)
    {
        return response()->json($marketPrice);
    }

    public function update(Request $request, MarketPrice $marketPrice)
    {
        $validated = $request->validate([
            'crop_name' => 'sometimes|string|max:255',
            'price_per_unit' => 'sometimes|numeric',
            'unit' => 'nullable|string|max:255',
            'market_destination' => 'nullable|string|max:255',
            'recorded_date' => 'sometimes|date',
        ]);

        $marketPrice->update($validated);

        return response()->json($marketPrice);
    }

    public function destroy(MarketPrice $marketPrice)
    {
        $marketPrice->delete();

        return response()->json(null, 204);
    }
}