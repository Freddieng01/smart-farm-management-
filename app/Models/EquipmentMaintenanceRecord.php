<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EquipmentMaintenanceRecord extends Model
{
    use HasFactory;

    protected $table = 'equipment_maintenance_records';

    protected $fillable = [
        'equipment_id',
        'type',
        'description',
        'cost',
        'maintenance_date',
        'next_service_date',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'cost' => 'decimal:2',
            'maintenance_date' => 'date',
            'next_service_date' => 'date',
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