<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScoutingRecord extends Model
{
    protected $fillable = [
        'field_id',
        'scouting_date',
        'pest_disease_name',
        'type',
        'severity',
        'affected_area',
        'notes',
    ];

    protected $casts = [
        'scouting_date' => 'date',
    ];

    public function field(): BelongsTo
    {
        return $this->belongsTo(Field::class);
    }
}