<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Crop;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CropController extends Controller
{
    public function index(): JsonResponse
    {
        $crops = Crop::latest()->paginate(25);

        return response()->json($crops);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:crops,name'],
            'category' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'maturity_days' => ['nullable', 'integer', 'min:1'],
        ]);

        $crop = Crop::create($validated);

        return response()->json([
            'message' => 'Crop created successfully.',
            'data' => $crop,
        ], 201);
    }

    public function show(Crop $crop): JsonResponse
    {
        return response()->json([
            'data' => $crop->load('plantings'),
        ]);
    }

    public function update(Request $request, Crop $crop): JsonResponse
    {
        $validated = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('crops', 'name')->ignore($crop),
            ],
            'category' => ['sometimes', 'nullable', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string'],
            'maturity_days' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ]);

        $crop->update($validated);

        return response()->json([
            'message' => 'Crop updated successfully.',
            'data' => $crop->fresh(),
        ]);
    }

    public function destroy(Crop $crop): JsonResponse
    {
        $crop->delete();

        return response()->json([
            'message' => 'Crop deleted successfully.',
        ]);
    }
}
