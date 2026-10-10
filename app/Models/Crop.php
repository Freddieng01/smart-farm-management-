<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Crop extends Model
{
    protected $fillable = [
        'name',
        'category',
        'description',
        'maturity_days',
    ];

    public function plantings(): HasMany
    {
        return $this->hasMany(Planting::class);
    }
}