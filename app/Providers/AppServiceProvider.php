<?php

namespace App\Providers;

use App\Models\AlertRule;
use App\Models\Budget;
use App\Models\CropMonitoring;
use App\Models\CropProduction;
use App\Models\Customer;
use App\Models\DailyTask;
use App\Models\DispatchRecord;
use App\Models\Employee;
use App\Models\Farm;
use App\Models\FarmExpense;
use App\Models\Field;
use App\Models\FinancialTransaction;
use App\Models\HarvestSchedule;
use App\Models\Invoice;
use App\Models\IrrigationSchedule;
use App\Models\Livestock;
use App\Models\LivestockBreedingRecord;
use App\Models\LivestockHealthRecord;
use App\Models\LivestockVaccination;
use App\Models\MarketPrice;
use App\Models\Notification;
use App\Models\OutbreakAlert;
use App\Models\Payment;
use App\Models\Planting;
use App\Models\PostHarvestHandling;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\PurchasePayment;
use App\Models\PumpMonitoring;
use App\Models\Resource;
use App\Models\ResourceTransaction;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\ScoutingRecord;
use App\Models\SprayingSchedule;
use App\Models\StockMovement;
use App\Models\StorageFacility;
use App\Models\StoredProduce;
use App\Models\Supplier;
use App\Models\SupplierQuotation;
use App\Models\WaterSource;
use App\Models\YieldRecord;
use App\Support\Authorization\FarmAccess;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        foreach ([
            Farm::class,
            Field::class,
            Employee::class,
            Livestock::class,
            Budget::class,
            Customer::class,
            FinancialTransaction::class,
            FarmExpense::class,
            MarketPrice::class,
            Notification::class,
            Resource::class,
            StorageFacility::class,
            Supplier::class,
            SalesOrder::class,
            WaterSource::class,
            AlertRule::class,
            PurchaseOrder::class,
            CropProduction::class,
            Planting::class,
            CropMonitoring::class,
            DailyTask::class,
            ScoutingRecord::class,
            SprayingSchedule::class,
            OutbreakAlert::class,
            HarvestSchedule::class,
            YieldRecord::class,
            PostHarvestHandling::class,
            IrrigationSchedule::class,
            PumpMonitoring::class,
            StoredProduce::class,
            StockMovement::class,
            DispatchRecord::class,
            SupplierQuotation::class,
            PurchaseOrderItem::class,
            PurchasePayment::class,
            SalesOrderItem::class,
            Invoice::class,
            Payment::class,
            LivestockVaccination::class,
            LivestockHealthRecord::class,
            LivestockBreedingRecord::class,
            ResourceTransaction::class,
        ] as $modelClass) {
            $modelClass::addGlobalScope('farm-access', function ($query): void {
                FarmAccess::scopeModel($query);
            });
        }
    }
}
