<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyTask extends Model
{
    protected $fillable = [
        'employee_id',
        'field_id',
        'task_description',
        'hours_worked',
        'status',
        'date',
        'started_at',
        'running_since',
        'worked_seconds',
        'completed_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'running_since' => 'datetime',
        'completed_at' => 'datetime',
        'worked_seconds' => 'integer',
    ];

    // sent with every task so the screen can show a live clock
    protected $appends = ['is_running', 'elapsed_seconds'];

    public function getIsRunningAttribute(): bool
    {
        return $this->running_since !== null;
    }

    /** Banked time plus the current run, if the clock is going. */
    public function getElapsedSecondsAttribute(): int
    {
        $extra = $this->running_since ? max(0, now()->diffInSeconds($this->running_since, true)) : 0;

        return (int) $this->worked_seconds + (int) $extra;
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function field(): BelongsTo
    {
        return $this->belongsTo(Field::class);
    }
}
