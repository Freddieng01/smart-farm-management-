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
}
