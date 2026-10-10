<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HarvestSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'field_id',
        'harvest_date',
        'start_time',
        'estimated_quantity',
        'unit',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'harvest_date' => 'date',
            'estimated_quantity' => 'decimal:2',
        ];
    }

    public function field()
    {
        return $this->belongsTo(Field::class);
    }
}