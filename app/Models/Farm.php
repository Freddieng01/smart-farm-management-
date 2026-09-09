<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Farm extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'location_gps',
        'total_acreage',
    ];

    protected function casts(): array
    {
        return [
            'total_acreage' => 'decimal:2',
        ];
    }

    public function fields()
    {
        return $this->hasMany(Field::class);
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
}
