<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PostHarvestHandling extends Model
{
    use HasFactory;

    protected $fillable = [
        'field_id',
        'handling_date',
        'storage_method',
        'storage_location',
        'quantity',
        'unit',
        'condition',
        'loss_quantity',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'handling_date' => 'date',
            'quantity' => 'decimal:2',
            'loss_quantity' => 'decimal:2',
        ];
    }

    public function field()
    {
        return $this->belongsTo(Field::class);
    }
}