<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;
    use HasFactory;
    use Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function employee()
    {
        return $this->hasOne(Employee::class);
    }

    // --- Added for Resource/Finance module (additive only, nothing above changed) ---

    public function resourceTransactions()
    {
        return $this->hasMany(ResourceTransaction::class, 'recorded_by');
    }

    public function financialTransactions()
    {
        return $this->hasMany(FinancialTransaction::class, 'recorded_by');
    }
}
