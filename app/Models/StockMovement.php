<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    protected $fillable = [
        'stored_produce_id',
        'movement_type',
        'quantity',
        'movement_date',
        'notes',
    ];

    protected $casts = [
        'movement_date' => 'date',
        'quantity' => 'decimal:2',
    ];

    public function storedProduce(): BelongsTo
    {
        return $this->belongsTo(StoredProduce::class);
    }
}