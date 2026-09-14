<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StorageFacility extends Model
{
    protected $fillable = [
        'farm_id',
        'name',
        'facility_type',
        'capacity',
        'capacity_unit',
        'current_temperature_c',
    ];

    protected $casts = [
        'capacity' => 'decimal:2',
        'current_temperature_c' => 'decimal:2',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function storedProduce(): HasMany
    {
        return $this->hasMany(StoredProduce::class);
    }
}