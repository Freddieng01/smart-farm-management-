<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ResourceTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'resource_id',
        'livestock_id',
        'type',
        'quantity',
        'unit_cost',
        'reason',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'unit_cost' => 'decimal:2',
        ];
    }

    public function resource()
    {
        return $this->belongsTo(Resource::class);
    }

    public function livestock()
    {
        return $this->belongsTo(Livestock::class);
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function financialTransaction()
    {
        return $this->hasOne(FinancialTransaction::class);
    }
}
