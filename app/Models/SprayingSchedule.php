<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SprayingSchedule extends Model
{
    protected $fillable = [
        'field_id',
        'planting_id',
        'pest_disease_name',
        'treatment',
        'spraying_date',
        'start_time',
        'duration_minutes',
        'status',
        'notes',
    ];

    protected $casts = [
        'spraying_date' => 'date',
    ];

    public function field(): BelongsTo
    {
        return $this->belongsTo(Field::class);
    }

    public function planting(): BelongsTo
    {
        return $this->belongsTo(Planting::class);
    }
}
