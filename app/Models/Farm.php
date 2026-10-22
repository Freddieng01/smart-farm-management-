<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Farm extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'name',
        'location_gps',
        'latitude',
        'longitude',
        'total_acreage',
    ];

    protected function casts(): array
    {
        return [
            'total_acreage' => 'decimal:2',
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }

    public function fields()
    {
        return $this->hasMany(Field::class);
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function employees()
    {
        return $this->hasMany(Employee::class);
    }

    // --- Added for Resource/Finance module (additive only, nothing above changed) ---

    public function resources()
    {
        return $this->hasMany(Resource::class);
    }

    public function financialTransactions()
    {
        return $this->hasMany(FinancialTransaction::class);
    }

    public function budgets()
    {
        return $this->hasMany(Budget::class);
    }

    // --- Added for Irrigation & Water Management ---

    public function waterSources()
    {
        return $this->hasMany(WaterSource::class);
    }
}
