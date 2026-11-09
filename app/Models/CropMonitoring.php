<?php

namespace App\Models;

use App\Services\CropStageAdvisor;
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

    // "What to do now" for this record's growth stage, sent with every record
    protected $appends = ['advice'];

    public function getAdviceAttribute(): ?array
    {
        return CropStageAdvisor::forRecord($this->growth_stage, $this->health_status);
    }

    public function planting(): BelongsTo
    {
        return $this->belongsTo(Planting::class);
    }
}
