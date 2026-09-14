<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierQuotation extends Model
{
    protected $fillable = [
        'supplier_id',
        'item_name',
        'quoted_price',
        'unit',
        'quotation_date',
        'valid_until',
    ];

    protected $casts = [
        'quotation_date' => 'date',
        'valid_until' => 'date',
        'quoted_price' => 'decimal:2',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}