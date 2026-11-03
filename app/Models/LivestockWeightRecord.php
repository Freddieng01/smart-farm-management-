<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LivestockWeightRecord extends Model
{
    protected $fillable = [
        'livestock_id',
        'weight_kg',
        'date_recorded',
    ];

    protected $casts = [
        'weight_kg' => 'decimal:2',
        'date_recorded' => 'date',
    ];

    public function livestock(): BelongsTo
    {
        return $this->belongsTo(Livestock::class);
    }
}
