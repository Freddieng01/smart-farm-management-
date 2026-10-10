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

    // --- Added for Pest & Disease Management ---

    public function scoutingRecords(): HasMany
    {
        return $this->hasMany(ScoutingRecord::class);
    }

    public function sprayingSchedules(): HasMany
    {
        return $this->hasMany(SprayingSchedule::class);
    }

    public function outbreakAlerts(): HasMany
    {
        return $this->hasMany(OutbreakAlert::class);
    }

    // --- Added for Harvest Management ---

    public function harvestSchedules(): HasMany
    {
        return $this->hasMany(HarvestSchedule::class);
    }

    public function yieldRecords(): HasMany
    {
        return $this->hasMany(YieldRecord::class);
    }

    public function postHarvestHandlings(): HasMany
    {
        return $this->hasMany(PostHarvestHandling::class);
    }
}