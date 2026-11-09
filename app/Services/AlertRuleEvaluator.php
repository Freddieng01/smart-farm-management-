<?php

namespace App\Services;

use App\Models\AlertRule;
use App\Models\Farm;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Turns alert rules into notifications by checking each active rule against the farm's data.
 */
class AlertRuleEvaluator
{
    /** Don't repeat an identical notification to the same user within this many hours. */
    private const DEDUPE_HOURS = 24;

    public function __construct(private WeatherService $weather)
    {
    }

    /**
     * Evaluate every active rule (optionally only one farm's). Returns notifications created.
     */
    public function runAll(?int $farmId = null): int
    {
        $query = AlertRule::query()->where('is_active', true);

        if ($farmId !== null) {
            $query->where('farm_id', $farmId);
        }

        $created = 0;

        foreach ($query->get() as $rule) {
            $created += $this->run($rule);
        }

        return $created;
    }

    /**
     * Evaluate a single rule. Returns notifications created.
     */
    public function run(AlertRule $rule): int
    {
        $type = AlertRule::normalizeType($rule->type);
        $farm = Farm::find($rule->farm_id);

        if ($type === null || $farm === null) {
            return 0;
        }

        try {
            $items = match ($type) {
                'low_stock' => $this->lowStock($rule, $farm),
                'maintenance_due' => $this->maintenanceDue($rule, $farm),
                'vaccination_due' => $this->vaccinationDue($rule, $farm),
                'harvest_due' => $this->harvestDue($rule, $farm),
                'task_overdue' => $this->tasksOverdue($rule, $farm),
                'weather' => $this->weatherWarnings($farm),
            };
        } catch (\Throwable $e) {
            Log::error("Alert rule {$rule->id} ({$type}) failed: ".$e->getMessage());

            return 0;
        }

        $recipients = $this->recipients($rule, $farm);
        $created = 0;

        foreach ($items as $item) {
            foreach ($recipients as $userId) {
                if ($this->notify($userId, $farm, $type, $item['title'], $item['message'], $item['priority'] ?? $this->priority($rule))) {
                    $created++;
                }
            }
        }

        $rule->forceFill(['last_run_at' => now()])->saveQuietly();

        return $created;
    }

    private function threshold(AlertRule $rule, int $fallback): int
    {
        return (int) ($rule->threshold ?? AlertRule::TYPES[AlertRule::normalizeType($rule->type)]['default'] ?? $fallback);
    }

    private function priority(AlertRule $rule): string
    {
        return in_array($rule->priority, ['Low', 'Normal', 'High', 'Urgent'], true) ? $rule->priority : 'Normal';
    }

    /**
     * The rule's creator and the farm owner; falls back to admins so an alert is never lost.
     */
    private function recipients(AlertRule $rule, Farm $farm): array
    {
        $ids = collect([$rule->user_id, $farm->owner_id])->filter()->unique()->values();

        if ($ids->isEmpty()) {
            $ids = User::where('role', 'Admin')->pluck('id');
        }

        return $ids->all();
    }

    private function notify(int $userId, Farm $farm, string $type, string $title, string $message, string $priority): bool
    {
        $duplicate = Notification::where('user_id', $userId)
            ->where('farm_id', $farm->id)
            ->where('type', $type)
            ->where('message', $message)
            ->where('created_at', '>=', now()->subHours(self::DEDUPE_HOURS))
            ->exists();

        if ($duplicate) {
            return false;
        }

        Notification::create([
            'user_id' => $userId,
            'farm_id' => $farm->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'priority' => $priority,
        ]);

        return true;
    }

    // ---- Automatic extreme-weather alerts (no rule needed) ----

    /**
     * Check the forecast of every farm that has coordinates and warn about extreme weather.
     * Farms with their own active "weather" rule are skipped; that rule already covers them.
     * Returns notifications created.
     */
    public function runExtremeWeather(?int $farmId = null): int
    {
        $ruleFarmIds = AlertRule::where('is_active', true)->get()
            ->filter(fn ($r) => AlertRule::normalizeType($r->type) === 'weather')
            ->pluck('farm_id')
            ->all();

        $farms = Farm::query()->whereNotNull('latitude')->whereNotNull('longitude');

        if ($farmId !== null) {
            $farms->where('id', $farmId);
        }

        $created = 0;

        foreach ($farms->get() as $farm) {
            if (in_array($farm->id, $ruleFarmIds, true)) {
                continue;
            }

            try {
                $hazards = $this->extremeHazards($farm);
            } catch (\Throwable $e) {
                Log::error("Extreme weather check failed for farm {$farm->id}: ".$e->getMessage());

                continue;
            }

            $created += $this->notifyHazards($farm, $hazards);
        }

        return $created;
    }

    /**
     * Turn the serious ("high") weather alerts of a farm into notifications for
     * its owner, managers and admins. The alerts are the very ones the Weather
     * page shows (WeatherService::hazards), so both always agree. An identical
     * notification is not repeated within 24 hours. Returns how many were created.
     */
    public function notifyHazards(Farm $farm, array $hazards): int
    {
        $serious = array_values(array_filter($hazards, fn ($hazard) => ($hazard['severity'] ?? '') === 'high'));
        $created = 0;

        foreach ($this->weatherRecipients($farm) as $userId) {
            foreach ($serious as $hazard) {
                if ($this->notify($userId, $farm, 'weather', "{$hazard['title']}: {$farm->name}", $hazard['message'], 'Urgent')) {
                    $created++;
                }
            }
        }

        return $created;
    }

    /**
     * Make sure the notifications for a farm's weather are up to date, without
     * needing the scheduler. At most one forecast lookup per farm every 30 minutes.
     */
    public function syncFarmWeather(Farm $farm): int
    {
        if ($farm->latitude === null || $farm->longitude === null) {
            return 0;
        }
        if (! Cache::add("weather-sync:{$farm->id}", true, now()->addMinutes(30))) {
            return 0;
        }

        try {
            return $this->notifyHazards($farm, $this->extremeHazards($farm));
        } catch (\Throwable $e) {
            Cache::forget("weather-sync:{$farm->id}");
            Log::error("Weather sync failed for farm {$farm->id}: ".$e->getMessage());

            return 0;
        }
    }

    /** All weather alerts for a farm from a (briefly cached) forecast. */
    private function extremeHazards(Farm $farm): array
    {
        $key = "forecast:{$farm->latitude}:{$farm->longitude}";
        $forecast = Cache::get($key);

        if ($forecast === null) {
            $forecast = $this->weather->getForecast($farm->latitude, $farm->longitude);

            // never keep a failed lookup, or one hiccup would hide alerts for 30 minutes
            if (empty($forecast['error'])) {
                Cache::put($key, $forecast, now()->addMinutes(30));
            }
        }

        return $this->weather->hazards($forecast);
    }

    /**
     * Farm owner plus the farm's managers and admins; falls back to all admins.
     */
    private function weatherRecipients(Farm $farm): array
    {
        $staff = DB::table('employees as e')
            ->join('users as u', 'u.id', '=', 'e.user_id')
            ->where('e.farm_id', $farm->id)
            ->whereIn('u.role', ['Admin', 'Manager', 'Farm-owner'])
            ->pluck('u.id');

        $ids = collect([$farm->owner_id])->merge($staff)->filter()->unique()->values();

        if ($ids->isEmpty()) {
            $ids = User::where('role', 'Admin')->pluck('id');
        }

        return $ids->all();
    }

    // ---- Checks. Each returns a list of ['title' => ..., 'message' => ..., 'priority' => optional]. ----

    private function lowStock(AlertRule $rule, Farm $farm): array
    {
        $threshold = $this->threshold($rule, 50);

        $rows = DB::table('stored_produce as sp')
            ->join('storage_facilities as sf', 'sf.id', '=', 'sp.storage_facility_id')
            ->where('sf.farm_id', $farm->id)
            ->groupBy('sp.crop_name', 'sp.unit')
            ->havingRaw('SUM(sp.quantity) <= ?', [$threshold])
            ->select('sp.crop_name', 'sp.unit', DB::raw('SUM(sp.quantity) as total'))
            ->get();

        return $rows->map(fn ($r) => [
            'title' => "Low stock: {$r->crop_name} ({$farm->name})",
            'message' => 'Only '.(float) $r->total." {$r->unit} of {$r->crop_name} left in storage (alert level: {$threshold}).",
        ])->all();
    }

    private function maintenanceDue(AlertRule $rule, Farm $farm): array
    {
        $days = $this->threshold($rule, 7);
        $today = Carbon::today();

        $rows = DB::table('equipment_maintenance_records as m')
            ->join('equipment as e', 'e.id', '=', 'm.equipment_id')
            ->where('e.farm_id', $farm->id)
            ->where('e.status', '!=', 'retired')
            ->whereNotNull('m.next_service_date')
            ->whereDate('m.next_service_date', '<=', $today->copy()->addDays($days))
            ->whereRaw('m.id = (select max(m2.id) from equipment_maintenance_records m2 where m2.equipment_id = m.equipment_id)')
            ->select('e.name', 'm.next_service_date')
            ->get();

        return $rows->map(function ($r) use ($today, $farm) {
            $due = Carbon::parse($r->next_service_date)->startOfDay();
            $overdue = $due->lt($today);

            return [
                'title' => ($overdue ? 'Maintenance overdue: ' : 'Maintenance due: ').$r->name." ({$farm->name})",
                'message' => "{$r->name} service ".($overdue ? 'was due on ' : 'is due on ').$due->toDateString().'.',
                'priority' => $overdue ? 'High' : null,
            ];
        })->all();
    }

    private function vaccinationDue(AlertRule $rule, Farm $farm): array
    {
        $days = $this->threshold($rule, 7);
        $today = Carbon::today();

        $rows = DB::table('livestock_vaccinations as v')
            ->join('livestock as l', 'l.id', '=', 'v.livestock_id')
            ->where('l.farm_id', $farm->id)
            ->where('l.status', 'Active')
            ->whereNotNull('v.next_due_date')
            ->whereDate('v.next_due_date', '<=', $today->copy()->addDays($days))
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))
                    ->from('livestock_vaccinations as v2')
                    ->whereColumn('v2.livestock_id', 'v.livestock_id')
                    ->whereColumn('v2.vaccine_name', 'v.vaccine_name')
                    ->whereColumn('v2.date_administered', '>', 'v.date_administered');
            })
            ->select('l.tag_number', 'l.species', 'v.vaccine_name', 'v.next_due_date')
            ->get();

        return $rows->map(function ($r) use ($today, $farm) {
            $due = Carbon::parse($r->next_due_date)->startOfDay();
            $overdue = $due->lt($today);

            return [
                'title' => ($overdue ? 'Vaccination overdue: ' : 'Vaccination due: ')."{$r->species} #{$r->tag_number} ({$farm->name})",
                'message' => "{$r->vaccine_name} for {$r->species} #{$r->tag_number} ".($overdue ? 'was due on ' : 'is due on ').$due->toDateString().'.',
                'priority' => $overdue ? 'High' : null,
            ];
        })->all();
    }

    private function harvestDue(AlertRule $rule, Farm $farm): array
    {
        $days = $this->threshold($rule, 3);
        $today = Carbon::today();

        $rows = DB::table('harvest_schedules as h')
            ->join('fields as f', 'f.id', '=', 'h.field_id')
            ->where('f.farm_id', $farm->id)
            ->whereDate('h.harvest_date', '<=', $today->copy()->addDays($days))
            ->whereDate('h.harvest_date', '>=', $today->copy()->subDays(7))
            ->whereRaw('LOWER(h.status) not in (?, ?, ?)', ['completed', 'cancelled', 'harvested'])
            ->select('f.name as field_name', 'h.harvest_date')
            ->get();

        return $rows->map(function ($r) use ($today, $farm) {
            $date = Carbon::parse($r->harvest_date)->startOfDay();
            $when = $date->isSameDay($today) ? 'today' : ($date->lt($today) ? 'on '.$date->toDateString().' (past)' : 'on '.$date->toDateString());

            return [
                'title' => "Harvest coming up: {$r->field_name} ({$farm->name})",
                'message' => "Harvest for {$r->field_name} is scheduled {$when}.",
            ];
        })->all();
    }

    private function tasksOverdue(AlertRule $rule, Farm $farm): array
    {
        $days = $this->threshold($rule, 1);

        $query = DB::table('daily_tasks as t')
            ->join('employees as e', 'e.id', '=', 't.employee_id')
            ->where('e.farm_id', $farm->id)
            ->where('t.status', '!=', 'completed')
            ->whereDate('t.date', '<=', Carbon::today()->subDays($days));

        $count = (clone $query)->count();

        if ($count === 0) {
            return [];
        }

        $oldest = Carbon::parse((clone $query)->min('t.date'))->toDateString();

        return [[
            'title' => "Overdue tasks ({$farm->name})",
            'message' => "{$count} task(s) are not completed. The oldest was due on {$oldest}.",
        ]];
    }

    private function weatherWarnings(Farm $farm): array
    {
        if ($farm->latitude === null || $farm->longitude === null) {
            return [];
        }

        $result = $this->weather->getAlerts($farm->latitude, $farm->longitude);

        if (($result['error'] ?? false) || empty($result['alerts'])) {
            return [];
        }

        // Cap at 5 so a long forecast can't flood the user with notifications.
        return collect($result['alerts'])
            ->take(5)
            ->map(fn ($alert) => [
                'title' => "{$alert['title']}: {$farm->name}",
                'message' => $alert['message'],
                'priority' => $alert['priority'],
            ])
            ->all();
    }
}
