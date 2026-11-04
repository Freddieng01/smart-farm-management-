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
    public function index(Request $request, ?Farm $farm = null): JsonResponse
    {
        // /farms/{farm}/fields lists one farm's fields. /fields (used by the pest, irrigation and
        // planting pages) lists every field this user may see; the farm-access scope on Field
        // already limits that, and ?farm_id= narrows it further.
        $query = $farm ? $farm->fields() : Field::query();

        if (! $farm && $request->filled('farm_id')) {
            $query->where('farm_id', $request->integer('farm_id'));
        }

        $perPage = $farm ? 25 : min(max($request->integer('per_page', 200), 1), 500);

        $fields = $query
            ->with('farm:id,name')
            ->latest()
            ->paginate($perPage);

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
            'boundary_polygon' => ['nullable', 'json'],
        ]);

        $field = $farm->fields()->create($validated);

        // AUTOMATIC FARM LOCATION UPDATE
        // When the first field is plotted, we set the farm's center coordinates
        if (! empty($validated['boundary_polygon'])) {
            $coords = json_decode($validated['boundary_polygon'], true);
            if (is_array($coords) && count($coords) > 0) {
                // Calculate center of the polygon for the farm's general location
                $lat = array_sum(array_column($coords, 0)) / count($coords);
                $lon = array_sum(array_column($coords, 1)) / count($coords);

                $farm->update([
                    'latitude' => $lat,
                    'longitude' => $lon,
                    'location_gps' => "{$lat},{$lon}"
                ]);
            }
        }

        $this->syncFarmAcreage($farm);

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
        $oldFarm = $field->farm;

        $validated = $request->validate([
            'farm_id' => ['sometimes', 'required', 'exists:farms,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'soil_type' => ['sometimes', 'nullable', 'string', 'max:255'],
            'size_hectares' => ['sometimes', 'required', 'numeric', 'min:0'],
            'boundary_polygon' => ['nullable', 'json'],
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
        if ($oldFarm->id !== $field->farm_id) {
            $this->syncFarmAcreage($oldFarm);
        }
        $this->syncFarmAcreage(Farm::findOrFail($field->farm_id));

        return response()->json([
            'message' => 'Field updated successfully.',
            'data' => $field->fresh('farm:id,name'),
        ]);
    }

    public function destroy(Field $field): JsonResponse
    {
        $farm = $field->farm;
        $field->delete();
        $this->syncFarmAcreage($farm);

        return response()->json([
            'message' => 'Field deleted successfully.',
        ]);
    }

    private function syncFarmAcreage(Farm $farm): void
    {
        $hectares = (float) $farm->fields()->sum('size_hectares');
        $farm->update(['total_acreage' => round($hectares * 2.47105, 2)]);
    }
}
