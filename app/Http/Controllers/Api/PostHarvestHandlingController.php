<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PostHarvestHandling;
use Illuminate\Http\Request;

class PostHarvestHandlingController extends Controller
{
    public function index()
    {
        return response()->json(
            PostHarvestHandling::with('field')->latest()->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'field_id' => 'required|exists:fields,id',
            'handling_date' => 'required|date',
            'storage_method' => 'required|string|max:100',
            'storage_location' => 'nullable|string|max:255',
            'quantity' => 'required|numeric|min:0',
            'unit' => 'required|string|max:50',
            'condition' => 'nullable|string|max:100',
            'loss_quantity' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $handling = PostHarvestHandling::create($validated);

        return response()->json([
            'message' => 'Post-harvest handling record created successfully.',
            'data' => $handling->load('field'),
        ], 201);
    }

    public function show(PostHarvestHandling $postHarvestHandling)
    {
        return response()->json(
            $postHarvestHandling->load('field')
        );
    }

    public function update(
        Request $request,
        PostHarvestHandling $postHarvestHandling
    ) {
        $validated = $request->validate([
            'field_id' => 'sometimes|exists:fields,id',
            'handling_date' => 'sometimes|date',
            'storage_method' => 'sometimes|string|max:100',
            'storage_location' => 'nullable|string|max:255',
            'quantity' => 'sometimes|numeric|min:0',
            'unit' => 'sometimes|string|max:50',
            'condition' => 'nullable|string|max:100',
            'loss_quantity' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $postHarvestHandling->update($validated);

        return response()->json([
            'message' => 'Post-harvest handling record updated successfully.',
            'data' => $postHarvestHandling->load('field'),
        ]);
    }

    public function destroy(PostHarvestHandling $postHarvestHandling)
    {
        $postHarvestHandling->delete();

        return response()->json([
            'message' => 'Post-harvest handling record deleted successfully.',
        ]);
    }
}