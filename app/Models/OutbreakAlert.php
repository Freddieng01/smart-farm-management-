<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OutbreakAlert extends Model
{
    protected $fillable = [
        'field_id',
        'pest_disease_name',
        'alert_date',
        'severity',
        'description',
        'status',
        'notes',
    ];

    protected $casts = [
        'alert_date' => 'date',
    ];

    public function field(): BelongsTo
    {
        return $this->belongsTo(Field::class);
    }
}