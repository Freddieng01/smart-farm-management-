<?php 
 
namespace App\Models; 
 
use Illuminate\Database\Eloquent\Factories\HasFactory; 
use Illuminate\Database\Eloquent\Model; 
use Illuminate\Database\Eloquent\Relations\HasMany; 
 
class Field extends Model 
{ 
    use HasFactory; 
 
    protected $fillable = [ 
        'farm_id', 
        'name', 
        'soil_type', 
        'size_hectares', 
    ]; 
 
    protected function casts(): array 
    { 
        return [ 
            'size_hectares' => 'decimal:2', 
        ]; 
    } 
 
    public function farm() 
    { 
        return $this->belongsTo(Farm::class); 
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
 
    public function plantings(): HasMany 
    { 
        return $this->hasMany(Planting::class); 
    }

    // --- Added for Irrigation & Water Management ---

    public function irrigationSchedules(): HasMany
    {
        return $this->hasMany(IrrigationSchedule::class);
    }
} 