<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'farm_id',
        'task_assignment',
        'hourly_rate',
    ];

    protected function casts(): array
    {
        return [
            'hourly_rate' => 'decimal:2',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function farm()
    {
        return $this->belongsTo(Farm::class);
    }

    // --- Added for Resource/Finance module (additive only, nothing above changed) ---

    public function financialTransactions()
    {
        return $this->hasMany(FinancialTransaction::class);
    }
}
