<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Farm;
use App\Models\Field;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class FieldController extends Controller
{
    public function index(Farm $farm): JsonResponse
    {
        $fields = $farm->fields()
            ->with('farm:id,name')
            ->latest()
            ->paginate(25);

        return response()->json($fields);
    }

    public function store(Request $request, Farm $farm): JsonResponse
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('fields', 'name')->where('farm_id', $farm->id),
            ],
            'soil_type' => ['nullable', 'string', 'max:255'],
            'size_hectares' => ['required', 'numeric', 'min:0'],
        ]);

        $field = $farm->fields()->create($validated);

        return response()->json([
            'message' => 'Field created successfully.',
            'data' => $field->load('farm:id,name'),
        ], 201);
    }

    public function show(Field $field): JsonResponse
    {
        return response()->json([
            'data' => $field->load('farm:id,name'),
        ]);
    }

    public function update(Request $request, Field $field): JsonResponse
    {
        $validated = $request->validate([
            'farm_id' => ['sometimes', 'required', 'exists:farms,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'soil_type' => ['sometimes', 'nullable', 'string', 'max:255'],
            'size_hectares' => ['sometimes', 'required', 'numeric', 'min:0'],
        ]);

        if (array_key_exists('name', $validated) || array_key_exists('farm_id', $validated)) {
            $farmId = $validated['farm_id'] ?? $field->farm_id;
            $name = $validated['name'] ?? $field->name;

            $exists = Field::where('farm_id', $farmId)
                ->where('name', $name)
                ->whereKeyNot($field->id)
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages([
                    'name' => ['A field with this name already exists on the selected farm.'],
                ]);
            }

            $validated['name'] = $name;
        }

        $field->update($validated);

        return response()->json([
            'message' => 'Field updated successfully.',
            'data' => $field->fresh('farm:id,name'),
        ]);
    }

    public function destroy(Field $field): JsonResponse
    {
        $field->delete();

        return response()->json([
            'message' => 'Field deleted successfully.',
        ]);
    }
}
