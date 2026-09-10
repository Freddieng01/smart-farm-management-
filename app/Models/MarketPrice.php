<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketPrice extends Model
{
    protected $fillable = [
        'farm_id',
        'crop_name',
        'price_per_unit',
        'unit',
        'market_destination',
        'recorded_date',
    ];

    protected $casts = [
        'recorded_date' => 'date',
        'price_per_unit' => 'decimal:2',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }
}