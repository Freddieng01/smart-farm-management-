<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WaterSource extends Model
{
    protected $fillable = [
        'farm_id',
        'name',
        'type',
        'location',
        'capacity',
        'status',
        'notes',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function irrigationSchedules(): HasMany
    {
        return $this->hasMany(IrrigationSchedule::class);
    }

    public function pumpMonitorings(): HasMany
    {
        return $this->hasMany(PumpMonitoring::class);
    }
}