<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LivestockProductionRecord extends Model
{
    protected $fillable = [
        'livestock_id',
        'product',
        'quantity',
        'unit',
        'date_recorded',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'date_recorded' => 'date',
    ];

    public function livestock(): BelongsTo
    {
        return $this->belongsTo(Livestock::class);
    }
}
