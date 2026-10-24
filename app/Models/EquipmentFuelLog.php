<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EquipmentFuelLog extends Model
{
    use HasFactory;

    protected $table = 'equipment_fuel_logs';

    protected $fillable = [
        'equipment_id',
        'log_date',
        'litres',
        'cost',
        'hours_reading',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'log_date' => 'date',
            'litres' => 'decimal:2',
            'cost' => 'decimal:2',
            'hours_reading' => 'decimal:1',
        ];
    }

    public function equipment()
    {
        return $this->belongsTo(Equipment::class, 'equipment_id');
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}