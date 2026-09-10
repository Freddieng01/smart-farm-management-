<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DispatchRecord extends Model
{
    protected $fillable = [
        'stored_produce_id',
        'quantity_dispatched',
        'destination',
        'dispatch_date',
        'status',
    ];

    protected $casts = [
        'dispatch_date' => 'date',
        'quantity_dispatched' => 'decimal:2',
    ];

    public function storedProduce(): BelongsTo
    {
        return $this->belongsTo(StoredProduce::class);
    }
}