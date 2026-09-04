<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LivestockBreedingRecord extends Model
{
    protected $fillable = [
        'livestock_id',
        'breeding_date',
        'expected_birth_date',
        'offspring_count',
    ];

    protected $casts = [
        'breeding_date' => 'date',
        'expected_birth_date' => 'date',
    ];

    public function livestock(): BelongsTo
    {
        return $this->belongsTo(Livestock::class);
    }
}