<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Livestock;
use App\Models\LivestockBreedingRecord;
use App\Models\LivestockHealthRecord;
use App\Models\LivestockProductionRecord;
use App\Models\LivestockVaccination;
use App\Models\LivestockWeightRecord;
use Illuminate\Http\Request;

/**
 * Vaccination, health, breeding and weight records for one animal.
 */
class LivestockRecordController extends Controller
{
    // ---- Vaccinations ----
    public function storeVaccination(Request $request, Livestock $livestock)
    {
        $data = $request->validate([
            'vaccine_name' => 'required|string|max:255',
            'date_administered' => 'required|date',
            'next_due_date' => 'nullable|date|after_or_equal:date_administered',
        ]);

        return response()->json($livestock->vaccinations()->create($data), 201);
    }

    public function destroyVaccination(LivestockVaccination $vaccination)
    {
        $vaccination->delete();

        return response()->json(null, 204);
    }

    // ---- Health & treatment ----
    public function storeHealth(Request $request, Livestock $livestock)
    {
        $data = $request->validate([
            'condition' => 'required|string|max:255',
            'treatment' => 'nullable|string|max:1000',
            'date_recorded' => 'required|date',
            'withdrawal_days' => 'nullable|integer|min:0|max:365',
        ]);

        return response()->json($livestock->healthRecords()->create($data), 201);
    }

    public function destroyHealth(LivestockHealthRecord $healthRecord)
    {
        $healthRecord->delete();

        return response()->json(null, 204);
    }

    // ---- Breeding ----
    public function storeBreeding(Request $request, Livestock $livestock)
    {
        if ($livestock->sex !== 'Female') {
            return response()->json(['message' => 'Breeding records can only be added to female animals.'], 422);
        }

        $data = $request->validate([
            'breeding_date' => 'required|date',
            'expected_birth_date' => 'nullable|date|after_or_equal:breeding_date',
            'offspring_count' => 'nullable|integer|min:0',
        ]);

        return response()->json($livestock->breedingRecords()->create($data), 201);
    }

    public function updateBreeding(Request $request, LivestockBreedingRecord $breedingRecord)
    {
        $data = $request->validate([
            'expected_birth_date' => 'nullable|date',
            'offspring_count' => 'nullable|integer|min:0',
        ]);

        $breedingRecord->update($data);

        return response()->json($breedingRecord);
    }

    public function destroyBreeding(LivestockBreedingRecord $breedingRecord)
    {
        $breedingRecord->delete();

        return response()->json(null, 204);
    }

    // ---- Weight / growth ----
    public function storeWeight(Request $request, Livestock $livestock)
    {
        $data = $request->validate([
            'weight_kg' => 'required|numeric|min:0',
            'date_recorded' => 'required|date',
        ]);

        $record = $livestock->weightRecords()->create($data);
        $this->syncCurrentWeight($livestock);

        return response()->json($record, 201);
    }

    public function destroyWeight(LivestockWeightRecord $weightRecord)
    {
        $livestock = $weightRecord->livestock;
        $weightRecord->delete();
        $this->syncCurrentWeight($livestock);

        return response()->json(null, 204);
    }

    // ---- Production (eggs, milk, wool...) ----
    public function storeProduction(Request $request, Livestock $livestock)
    {
        $data = $request->validate([
            'product' => 'required|string|max:100',
            'quantity' => 'required|numeric|min:0',
            'unit' => 'nullable|string|max:30',
            'date_recorded' => 'required|date',
        ]);

        return response()->json($livestock->productionRecords()->create($data), 201);
    }

    public function destroyProduction(LivestockProductionRecord $productionRecord)
    {
        $productionRecord->delete();

        return response()->json(null, 204);
    }

    // Keep the animal's "current weight" equal to its most recent weigh-in.
    private function syncCurrentWeight(Livestock $livestock): void
    {
        $latest = $livestock->weightRecords()->orderByDesc('date_recorded')->orderByDesc('id')->first();

        if ($latest) {
            $livestock->update(['current_weight_kg' => $latest->weight_kg]);
        }
    }
}
