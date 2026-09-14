<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StoredProduce extends Model
{
    protected $fillable = [
        'storage_facility_id',
        'crop_name',
        'quantity',
        'unit',
        'grade',
        'quality_status',
        'date_stored',
        'valuation_amount',
    ];

    protected $casts = [
        'date_stored' => 'date',
        'quantity' => 'decimal:2',
        'valuation_amount' => 'decimal:2',
    ];

    public function storageFacility(): BelongsTo
    {
        return $this->belongsTo(StorageFacility::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function dispatchRecords(): HasMany
    {
        return $this->hasMany(DispatchRecord::class);
    }
}