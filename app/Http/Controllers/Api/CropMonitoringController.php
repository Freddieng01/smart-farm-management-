<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CropMonitoring;
use App\Services\CropStageNotifier;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CropMonitoringController extends Controller
{
    /**
     * Display all crop monitoring records.
     */
    public function index(Request $request): JsonResponse
    {
        // ?planting_id=5 lists only that planting's records (used by the planting profile)
        $monitoring = CropMonitoring::with([
            'planting.crop',
            'planting.field',
        ])
            ->when($request->query('planting_id'), fn ($q, $id) => $q->where('planting_id', $id))
            ->when($request->query('crop_id'), fn ($q, $id) => $q->whereHas('planting', fn ($p) => $p->where('crop_id', $id)))
            ->latest('monitoring_date')
            ->paginate(min((int) $request->query('per_page', 25), 100));

        return response()->json($monitoring);
    }

    /**
     * Create a new crop monitoring record.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'planting_id' => ['required', 'exists:plantings,id'],
            'monitoring_date' => ['required', 'date'],
            'growth_stage' => ['nullable', 'string', 'max:100'],
            'plant_height' => ['nullable', 'numeric', 'min:0'],
            'health_status' => ['nullable', 'string', 'max:100'],
            'estimated_yield' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $monitoring = CropMonitoring::create($validated);

        $sent = $this->sendGuidance($monitoring);

        return response()->json([
            'message' => 'Crop monitoring record created successfully.'.$this->guidanceNote($monitoring, $sent),
            'data' => $monitoring->load([
                'planting.crop',
                'planting.field',
            ]),
        ], 201);
    }

    /**
     * Display a specific crop monitoring record.
     */
    public function show(CropMonitoring $cropMonitoring): JsonResponse
    {
        return response()->json([
            'data' => $cropMonitoring->load([
                'planting.crop',
                'planting.field',
            ]),
        ]);
    }

    /**
     * Update an existing crop monitoring record.
     */
    public function update(
        Request $request,
        CropMonitoring $cropMonitoring
    ): JsonResponse {
        $validated = $request->validate([
            'planting_id' => ['sometimes', 'required', 'exists:plantings,id'],
            'monitoring_date' => ['sometimes', 'required', 'date'],
            'growth_stage' => ['nullable', 'string', 'max:100'],
            'plant_height' => ['nullable', 'numeric', 'min:0'],
            'health_status' => ['nullable', 'string', 'max:100'],
            'estimated_yield' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $cropMonitoring->update($validated);

        // only guide the farmer again when the stage or health actually changed
        $sent = $cropMonitoring->wasChanged(['growth_stage', 'health_status'])
            ? $this->sendGuidance($cropMonitoring)
            : 0;

        return response()->json([
            'message' => 'Crop monitoring record updated successfully.'.$this->guidanceNote($cropMonitoring, $sent),
            'data' => $cropMonitoring->fresh()->load([
                'planting.crop',
                'planting.field',
            ]),
        ]);
    }

    /**
     * Delete a crop monitoring record.
     */
    public function destroy(CropMonitoring $cropMonitoring): JsonResponse
    {
        $cropMonitoring->delete();

        return response()->json([
            'message' => 'Crop monitoring record deleted successfully.',
        ]);
    }

    /**
     * Notify the farm what to do at this stage. A problem here must never stop
     * the monitoring record from being saved, so errors are only logged.
     */
    private function sendGuidance(CropMonitoring $record): int
    {
        try {
            return app(CropStageNotifier::class)->notify($record);
        } catch (\Throwable $e) {
            Log::warning('[CROP GUIDANCE] '.$e->getMessage());

            return 0;
        }
    }

    private function guidanceNote(CropMonitoring $record, int $sent): string
    {
        if ($sent === 0 || ! $record->advice) {
            return '';
        }

        $stage = $record->advice['stage'];

        return $stage
            ? " Guidance for the {$stage} stage was sent to notifications."
            : ' A health alert was sent to notifications.';
    }
}
