<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LivestockHealthRecord extends Model
{
    protected $fillable = [
        'livestock_id',
        'condition',
        'treatment',
        'date_recorded',
        'withdrawal_days',
    ];

    protected $casts = [
        'date_recorded' => 'date',
        'withdrawal_days' => 'integer',
    ];

    public function livestock(): BelongsTo
    {
        return $this->belongsTo(Livestock::class);
    }
}