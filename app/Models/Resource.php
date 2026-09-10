<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class Resource extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'field_id',
        'name',
        'category',
        'unit',
        'quantity',
        'minimum_stock',
        'unit_cost',
        'expiry_date',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'minimum_stock' => 'decimal:2',
            'unit_cost' => 'decimal:2',
            'expiry_date' => 'date',
        ];
    }

    public function farm()
    {
        return $this->belongsTo(Farm::class);
    }

    public function field()
    {
        return $this->belongsTo(Field::class);
    }

    public function transactions()
    {
        return $this->hasMany(ResourceTransaction::class);
    }

    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereColumn('quantity', '<=', 'minimum_stock');
    }

    public function scopeExpired(Builder $query): Builder
    {
        return $query->whereNotNull('expiry_date')->whereDate('expiry_date', '<', now()->toDateString());
    }

    public function scopeExpiringSoon(Builder $query, int $days = 14): Builder
    {
        return $query->whereNotNull('expiry_date')
            ->whereDate('expiry_date', '>=', now()->toDateString())
            ->whereDate('expiry_date', '<=', now()->addDays($days)->toDateString());
    }
}
