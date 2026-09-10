<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PumpMonitoring extends Model
{
    protected $fillable = [
        'water_source_id',
        'monitoring_date',
        'status',
        'operating_hours',
        'flow_rate',
        'notes',
    ];

    protected $casts = [
        'monitoring_date' => 'date',
    ];

    public function waterSource(): BelongsTo
    {
        return $this->belongsTo(WaterSource::class);
    }
}