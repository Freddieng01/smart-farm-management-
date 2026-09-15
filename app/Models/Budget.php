<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Budget extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'category',
        'period_start',
        'period_end',
        'planned_amount',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'planned_amount' => 'decimal:2',
        ];
    }

    public function farm()
    {
        return $this->belongsTo(Farm::class);
    }
}
