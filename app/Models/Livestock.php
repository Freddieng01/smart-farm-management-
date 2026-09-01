<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Livestock extends Model
{
    protected $fillable = [
        'farm_id',
        'tag_number',
        'species',
        'breed',
        'sex',
        'birth_date',
        'death_date',
        'status',
        'current_weight_kg',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'death_date' => 'date',
        'current_weight_kg' => 'decimal:2',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function vaccinations(): HasMany
    {
        return $this->hasMany(LivestockVaccination::class);
    }

    public function healthRecords(): HasMany
    {
        return $this->hasMany(LivestockHealthRecord::class);
    }

    public function breedingRecords(): HasMany
    {
        return $this->hasMany(LivestockBreedingRecord::class);
    }
}