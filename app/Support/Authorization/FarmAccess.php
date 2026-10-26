<?php

namespace App\Support\Authorization;

use App\Models\Farm;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class FarmAccess
{
    /**
     * Return the farms visible to the current user. Admins retain the
     * existing unrestricted behaviour.
     */
    public static function farmIds(): Builder
    {
        $user = Auth::user();

        $query = Farm::withoutGlobalScopes()->select('farms.id');

        if (! $user || $user->role === 'Admin') {
            return $query;
        }

        if ($user->role === 'Farm-owner') {
            return $query->where('owner_id', $user->id);
        }

        return $query->whereHas('employees', fn (Builder $employees) => $employees->where('user_id', $user->id));
    }

    public static function canAccessFarm(?int $farmId): bool
    {
        if (! $farmId) {
            return false;
        }

        $user = Auth::user();

        return (bool) ($user && (
            $user->role === 'Admin'
            || self::farmIds()->whereKey($farmId)->exists()
        ));
    }

    public static function authorizeFarm(?int $farmId): void
    {
        abort_unless(self::canAccessFarm($farmId), 403, 'You do not have access to this farm.');
    }

    public static function authorizeModel(Model $model): void
    {
        if (! Auth::user() || Auth::user()->role === 'Admin') {
            return;
        }

        $farmId = self::farmIdFor($model);
        abort_unless(self::canAccessFarm($farmId), 403, 'You do not have access to this farm record.');
    }

    public static function farmIdFor(Model $model): ?int
    {
        // A Farm record IS the farm, so its own id is the farm id. Without this,
        // opening a farm (or its fields) returned null and every non-Admin got a 403.
        if ($model instanceof Farm) {
            return (int) $model->getKey();
        }

        if ($model->getAttribute('farm_id')) {
            return (int) $model->getAttribute('farm_id');
        }

        $relations = [
            \App\Models\CropProduction::class => 'field.farm_id',
            \App\Models\Planting::class => 'field.farm_id',
            \App\Models\CropMonitoring::class => 'planting.field.farm_id',
            \App\Models\DailyTask::class => 'employee.farm_id',
            \App\Models\ScoutingRecord::class => 'field.farm_id',
            \App\Models\SprayingSchedule::class => 'field.farm_id',
            \App\Models\OutbreakAlert::class => 'field.farm_id',
            \App\Models\HarvestSchedule::class => 'field.farm_id',
            \App\Models\YieldRecord::class => 'field.farm_id',
            \App\Models\PostHarvestHandling::class => 'field.farm_id',
            \App\Models\IrrigationSchedule::class => 'field.farm_id',
            \App\Models\PumpMonitoring::class => 'waterSource.farm_id',
            \App\Models\StoredProduce::class => 'storageFacility.farm_id',
            \App\Models\StockMovement::class => 'storedProduce.storageFacility.farm_id',
            \App\Models\DispatchRecord::class => 'storedProduce.storageFacility.farm_id',
            \App\Models\SupplierQuotation::class => 'supplier.farm_id',
            \App\Models\PurchaseOrderItem::class => 'purchaseOrder.farm_id',
            \App\Models\PurchasePayment::class => 'purchaseOrder.farm_id',
            \App\Models\SalesOrderItem::class => 'salesOrder.farm_id',
            \App\Models\Invoice::class => 'salesOrder.farm_id',
            \App\Models\Payment::class => 'invoice.salesOrder.farm_id',
            \App\Models\LivestockVaccination::class => 'livestock.farm_id',
            \App\Models\LivestockHealthRecord::class => 'livestock.farm_id',
            \App\Models\LivestockBreedingRecord::class => 'livestock.farm_id',
            \App\Models\ResourceTransaction::class => 'resource.farm_id',
        ];

        $path = $relations[get_class($model)] ?? null;
        if (! $path) {
            return null;
        }

        $related = $model;
        foreach (explode('.', $path) as $segment) {
            if (! $related) {
                break;
            }

            if ($related instanceof Model) {
                if ($segment === 'farm_id') {
                    $related = $related->getAttribute('farm_id');
                    continue;
                }
                if (! $related->relationLoaded($segment)) {
                    $related->load($segment);
                }
                $related = $related->getRelation($segment);
            } else {
                $related = $related->{$segment};
            }
        }

        if ($related !== null && ! $related instanceof Model) {
            return (int) $related;
        }

        return null;
    }

    /**
     * Apply row filtering to any model used by the API.
     */
    public static function scopeModel(Builder $query): void
    {
        $user = Auth::user();
        if (! $user || $user->role === 'Admin') {
            return;
        }

        $model = $query->getModel();
        $modelClass = $model::class;

        if ($modelClass === Farm::class) {
            $query->whereIn($model->getTable().'.id', self::farmIds());
            return;
        }

        $directFarmModels = [
            \App\Models\Field::class,
            \App\Models\Employee::class,
            \App\Models\Livestock::class,
            \App\Models\Budget::class,
            \App\Models\Customer::class,
            \App\Models\FinancialTransaction::class,
            \App\Models\FarmExpense::class,
            \App\Models\MarketPrice::class,
            \App\Models\Notification::class,
            \App\Models\Resource::class,
            \App\Models\StorageFacility::class,
            \App\Models\Supplier::class,
            \App\Models\SalesOrder::class,
            \App\Models\WaterSource::class,
            \App\Models\AlertRule::class,
            \App\Models\PurchaseOrder::class,
        ];

        if (in_array($modelClass, $directFarmModels, true)) {
            $query->whereIn($model->getTable().'.farm_id', self::farmIds());
            return;
        }

        $farmRelations = [
            \App\Models\CropProduction::class => 'field.farm',
            \App\Models\Planting::class => 'field.farm',
            \App\Models\CropMonitoring::class => 'planting.field.farm',
            \App\Models\DailyTask::class => 'employee.farm',
            \App\Models\ScoutingRecord::class => 'field.farm',
            \App\Models\SprayingSchedule::class => 'field.farm',
            \App\Models\OutbreakAlert::class => 'field.farm',
            \App\Models\HarvestSchedule::class => 'field.farm',
            \App\Models\YieldRecord::class => 'field.farm',
            \App\Models\PostHarvestHandling::class => 'field.farm',
            \App\Models\IrrigationSchedule::class => 'field.farm',
            \App\Models\PumpMonitoring::class => 'waterSource.farm',
            \App\Models\StoredProduce::class => 'storageFacility.farm',
            \App\Models\StockMovement::class => 'storedProduce.storageFacility.farm',
            \App\Models\DispatchRecord::class => 'storedProduce.storageFacility.farm',
            \App\Models\SupplierQuotation::class => 'supplier.farm',
            \App\Models\PurchaseOrderItem::class => 'purchaseOrder.farm',
            \App\Models\PurchasePayment::class => 'purchaseOrder.farm',
            \App\Models\SalesOrderItem::class => 'salesOrder.farm',
            \App\Models\Invoice::class => 'salesOrder.farm',
            \App\Models\Payment::class => 'invoice.salesOrder.farm',
            \App\Models\LivestockVaccination::class => 'livestock.farm',
            \App\Models\LivestockHealthRecord::class => 'livestock.farm',
            \App\Models\LivestockBreedingRecord::class => 'livestock.farm',
            \App\Models\ResourceTransaction::class => 'resource.farm',
        ];

        if (isset($farmRelations[$modelClass])) {
            $query->whereHas($farmRelations[$modelClass]);
        }
    }
}
