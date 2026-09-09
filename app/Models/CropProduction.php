<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CropProduction extends Model
{
    protected $fillable = [
        'field_id',
        'crop_type',
        'quantity',
        'unit',
        'harvest_date',
        'quality_grade',
    ];

    public function field(): BelongsTo
    {
        return $this->belongsTo(Field::class);
    }
}
