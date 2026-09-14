<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CropMonitoring extends Model
{
    protected $fillable = [
        'planting_id',
        'monitoring_date',
        'growth_stage',
        'plant_height',
        'health_status',
        'estimated_yield',
        'notes',
    ];

    protected $casts = [
        'monitoring_date' => 'date',
    ];

    public function planting(): BelongsTo
    {
        return $this->belongsTo(Planting::class);
    }
}
