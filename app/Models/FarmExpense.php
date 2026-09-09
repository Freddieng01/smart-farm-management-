<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FarmExpense extends Model
{
    protected $fillable = [
        'farm_id',
        'category',
        'amount',
        'description',
        'expense_date',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }
}
