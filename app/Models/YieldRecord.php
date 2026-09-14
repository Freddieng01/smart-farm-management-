<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class YieldRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'field_id',
        'harvest_date',
        'quantity',
        'unit',
        'quality_grade',
        'moisture_percentage',
        'loss_quantity',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'harvest_date' => 'date',
            'quantity' => 'decimal:2',
            'moisture_percentage' => 'decimal:2',
            'loss_quantity' => 'decimal:2',
        ];
    }

    public function field()
    {
        return $this->belongsTo(Field::class);
    }
}