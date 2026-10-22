<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Farm;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Support\Authorization\FarmAccess;

class FarmController extends Controller
{
    public function owners(): JsonResponse
    {
        return response()->json([
            'data' => User::query()
                ->where('role', 'Farm-owner')
                ->orderBy('name')
                ->get(['id', 'name', 'email']),
        ]);
    }

    public function index(): JsonResponse
    {
        $farms = Farm::with(['owner:id,name,email'])
            ->withCount(['fields', 'employees'])
            ->latest()
            ->paginate(25);

        return response()->json($farms);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless(in_array($request->user()->role, ['Admin', 'Farm-owner'], true), 403, 'Only an Admin or Farm-owner may create farms.');

        $validated = $request->validate([
            'owner_id' => ['sometimes', 'integer', 'exists:users,id'],
            'name' => ['required', 'string', 'max:255', Rule::unique('farms', 'name')],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'total_acreage' => ['nullable', 'numeric', 'min:0'],
        ]);

        $validated['owner_id'] ??= $request->user()->id;
        if ($request->user()->role === 'Farm-owner') {
            abort_unless((int) $validated['owner_id'] === (int) $request->user()->id, 403, 'A Farm-owner may only assign farms to themselves.');
        }
        $this->ensureFarmOwner($validated['owner_id']);
        $validated['total_acreage'] ??= 0;
        $validated['location_gps'] = $this->locationGps($validated['latitude'], $validated['longitude']);

        $farm = Farm::create($validated);

        return response()->json([
            'message' => 'Farm created successfully.',
            'data' => $farm,
        ], 201);
    }

    public function show(Farm $farm): JsonResponse
    {
        return response()->json([
            'data' => $farm->load(['owner:id,name,email', 'fields', 'employees.user']),
        ]);
    }

    public function update(Request $request, Farm $farm): JsonResponse
    {
        FarmAccess::authorizeModel($farm);
        abort_unless(in_array($request->user()->role, ['Admin', 'Farm-owner', 'Manager'], true), 403, 'You may only view farms.');

        $validated = $request->validate([
            'owner_id' => ['sometimes', 'required', 'integer', 'exists:users,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('farms', 'name')->ignore($farm)],
            'latitude' => ['sometimes', 'required_with:longitude', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'required_with:latitude', 'numeric', 'between:-180,180'],
            'total_acreage' => ['sometimes', 'required', 'numeric', 'min:0'],
        ]);

        if (array_key_exists('owner_id', $validated)) {
            abort_unless($request->user()->role === 'Admin', 403, 'Only an Admin may transfer farm ownership.');
            $this->ensureFarmOwner($validated['owner_id']);
        }

        if (array_key_exists('latitude', $validated) && array_key_exists('longitude', $validated)) {
            $validated['location_gps'] = $this->locationGps($validated['latitude'], $validated['longitude']);
        }

        $farm->update($validated);

        return response()->json([
            'message' => 'Farm updated successfully.',
            'data' => $farm->fresh(['owner:id,name,email', 'fields', 'employees.user']),
        ]);
    }

    public function destroy(Farm $farm): JsonResponse
    {
        FarmAccess::authorizeModel($farm);
        abort_unless($this->isAdmin(request()), 403, 'Only an Admin may delete farms.');

        $farm->delete();

        return response()->json([
            'message' => 'Farm deleted successfully.',
        ]);
    }

    private function locationGps(float $latitude, float $longitude): string
    {
        return sprintf('%.8F,%.8F', $latitude, $longitude);
    }

    private function ensureFarmOwner(int $ownerId): void
    {
        abort_unless(User::whereKey($ownerId)->where('role', 'Farm-owner')->exists(), 422, 'The selected user must have the Farm-owner role.');
    }

    private function isAdmin(Request $request): bool
    {
        return $request->user()?->role === 'Admin';
    }
}
