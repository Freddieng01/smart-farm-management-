<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Equipment extends Model
{
    use HasFactory;

    protected $table = 'equipment';

    public const TYPES = ['tractor', 'harvester', 'sprayer', 'pump', 'vehicle', 'implement', 'generator', 'other'];

    public const STATUSES = ['available', 'in_use', 'maintenance', 'retired'];

    protected $fillable = [
        'farm_id',
        'name',
        'type',
        'serial_number',
        'purchase_date',
        'purchase_cost',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'purchase_date' => 'date',
            'purchase_cost' => 'decimal:2',
        ];
    }

    public function farm()
    {
        return $this->belongsTo(Farm::class);
    }

    public function maintenanceRecords()
    {
        return $this->hasMany(EquipmentMaintenanceRecord::class, 'equipment_id');
    }

    public function fuelLogs()
    {
        return $this->hasMany(EquipmentFuelLog::class, 'equipment_id');
    }
}