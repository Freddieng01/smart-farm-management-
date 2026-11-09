<?php

namespace App\Services;

use App\Models\CropMonitoring;
use App\Models\Employee;
use App\Models\Farm;
use App\Models\Notification;
use App\Models\User;

/**
 * Turns a crop monitoring record into a notification that tells the farm what to
 * do at that stage of growth. Goes to the farm owner and the farm's managers and agronomists.
 */
class CropStageNotifier
{
    private const DEDUPE_HOURS = 12;

    /** Returns how many notifications were created. */
    public function notify(CropMonitoring $record): int
    {
        $advice = $record->advice;
        if (! $advice) {
            return 0;
        }

        $planting = $record->planting()->with(['crop', 'field'])->first();
        $farmId = $planting?->field?->farm_id;
        if (! $farmId) {
            return 0;
        }

        $crop = $planting->crop?->name ?: 'Your crop';
        $field = $planting->field?->name;
        $where = $field ? "{$crop} in {$field}" : $crop;

        $title = $advice['stage']
            ? "{$crop}: {$advice['stage']} stage - what to do"
            : "{$crop}: health check needs attention";

        $lines = [];
        $lines[] = $advice['stage']
            ? "{$where} is at the {$advice['stage']} stage".($record->health_status ? " (health: {$record->health_status})." : '.')
            : "{$where} was checked (health: {$record->health_status}).";
        $lines[] = 'What to do now:';
        foreach ($advice['steps'] as $i => $step) {
            $lines[] = ($i + 1).'. '.$step;
        }
        if ($advice['next_stage']) {
            $lines[] = "Next stage: {$advice['next_stage']}.";
        }
        $message = implode("\n", $lines);

        $created = 0;
        foreach ($this->recipients($farmId) as $userId) {
            $duplicate = Notification::withoutGlobalScopes()
                ->where('user_id', $userId)
                ->where('farm_id', $farmId)
                ->where('type', 'crop_stage')
                ->where('message', $message)
                ->where('created_at', '>=', now()->subHours(self::DEDUPE_HOURS))
                ->exists();

            if ($duplicate) {
                continue;
            }

            Notification::create([
                'user_id' => $userId,
                'farm_id' => $farmId,
                'type' => 'crop_stage',
                'title' => $title,
                'message' => $message,
                'priority' => $advice['priority'],
            ]);
            $created++;
        }

        return $created;
    }

    /** Farm owner, plus the farm's managers and agronomists. */
    private function recipients(int $farmId): array
    {
        $ownerId = Farm::withoutGlobalScopes()->whereKey($farmId)->value('owner_id');

        $staff = User::whereIn('id', Employee::withoutGlobalScopes()->where('farm_id', $farmId)->pluck('user_id'))
            ->whereIn('role', ['Manager', 'Agronomist'])
            ->pluck('id');

        return collect([$ownerId])->merge($staff)->filter()->unique()->values()->all();
    }
}
