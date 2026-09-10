<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IrrigationSchedule extends Model
{
    protected $fillable = [
        'field_id',
        'water_source_id',
        'irrigation_date',
        'start_time',
        'duration_minutes',
        'water_quantity',
        'unit',
        'status',
        'notes',
    ];

    protected $casts = [
        'irrigation_date' => 'date',
    ];

    public function field(): BelongsTo
    {
        return $this->belongsTo(Field::class);
    }

    public function waterSource(): BelongsTo
    {
        return $this->belongsTo(WaterSource::class);
    }
}