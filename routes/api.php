<?php


use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\FarmController;
use App\Http\Controllers\Api\FieldController;
use App\Http\Controllers\Api\DailyTaskController;
use App\Http\Controllers\Api\CropProductionController;
use App\Http\Controllers\Api\FarmExpenseController;
use App\Http\Controllers\Api\LivestockController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\SupplierQuotationController;
use App\Http\Controllers\Api\PurchaseOrderController;
use App\Http\Controllers\Api\PurchaseOrderItemController;
use App\Http\Controllers\Api\PurchasePaymentController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\MarketPriceController;
use App\Http\Controllers\Api\SalesOrderController;
use App\Http\Controllers\Api\SalesOrderItemController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\FinanceReportController;
use App\Http\Controllers\Api\FinancialTransactionController;
use App\Http\Controllers\Api\ResourceController;
use App\Http\Controllers\Api\BudgetController;
use App\Http\Controllers\Api\CropController;
use App\Http\Controllers\Api\PlantingController;
use App\Http\Controllers\Api\CropMonitoringController;
use App\Http\Controllers\Api\WaterSourceController;
use App\Http\Controllers\Api\IrrigationScheduleController;
use App\Http\Controllers\Api\PumpMonitoringController;
use App\Http\Controllers\Api\ScoutingRecordController;
use App\Http\Controllers\Api\SprayingScheduleController;
use App\Http\Controllers\Api\OutbreakAlertController;
use App\Http\Controllers\Api\WeatherController;
use App\Http\Controllers\Api\HarvestScheduleController;
use App\Http\Controllers\Api\YieldRecordController;
use App\Http\Controllers\Api\PostHarvestHandlingController;
use App\Http\Controllers\Api\StorageFacilityController;
use App\Http\Controllers\Api\StoredProduceController;
use App\Http\Controllers\Api\StockMovementController;
use App\Http\Controllers\Api\DispatchRecordController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\AlertRuleController;
use Illuminate\Support\Facades\Route;
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);

    Route::apiResource('daily-tasks', DailyTaskController::class);
    Route::apiResource('crop-productions', CropProductionController::class);
    Route::apiResource('crops', CropController::class);
    Route::apiResource('plantings', PlantingController::class);
    Route::apiResource('crop-monitoring', CropMonitoringController::class);
    Route::apiResource('water-sources', WaterSourceController::class);
    Route::apiResource('irrigation-schedules', IrrigationScheduleController::class);
    Route::apiResource('pump-monitoring', PumpMonitoringController::class);
    Route::apiResource('scouting-records', ScoutingRecordController::class);
    Route::apiResource('spraying-schedules', SprayingScheduleController::class);
    Route::apiResource('outbreak-alerts', OutbreakAlertController::class);
    Route::apiResource('harvest-schedules', HarvestScheduleController::class);
    Route::apiResource('yield-records', YieldRecordController::class);
    Route::apiResource('post-harvest-handlings', PostHarvestHandlingController::class);


    Route::apiResource('farm-expenses', FarmExpenseController::class);

    // Farm Management
    Route::apiResource('farms', FarmController::class);
    Route::apiResource('farms.fields', FieldController::class)->shallow();
    Route::apiResource('employees', EmployeeController::class);
    Route::apiResource('livestock', LivestockController::class);

    // Supplier & Procurement
    Route::apiResource('suppliers', SupplierController::class);
    Route::apiResource('suppliers.quotations', SupplierQuotationController::class)->shallow();
    Route::apiResource('purchase-orders', PurchaseOrderController::class);
    Route::apiResource('purchase-orders.items', PurchaseOrderItemController::class)->shallow();
    Route::apiResource('purchase-orders.payments', PurchasePaymentController::class)->shallow();

    // Sales & Market
    Route::apiResource('customers', CustomerController::class);
    Route::apiResource('market-prices', MarketPriceController::class);
    Route::apiResource('sales-orders', SalesOrderController::class);
    Route::apiResource('sales-orders.items', SalesOrderItemController::class)->shallow();
    Route::apiResource('invoices', InvoiceController::class);
    Route::apiResource('invoices.payments', PaymentController::class)->shallow();

    // Resource / Inventory module
    Route::get('resources/low-stock', [ResourceController::class, 'lowStock']);
    Route::get('resources/expiring', [ResourceController::class, 'expiring']);
    Route::apiResource('resources', ResourceController::class);
    Route::post('resources/{resource}/stock-in', [ResourceController::class, 'stockIn']);
    Route::post('resources/{resource}/stock-out', [ResourceController::class, 'stockOut']);

    // Finance module
    Route::apiResource('financial-transactions', FinancialTransactionController::class);
    Route::apiResource('budgets', BudgetController::class);

    Route::get('finance/summary', [FinanceReportController::class, 'summary']);
    Route::get('finance/profit-loss', [FinanceReportController::class, 'profitLoss']);
    Route::get('finance/cost-per-hectare', [FinanceReportController::class, 'costPerHectare']);
    Route::get('finance/cost-per-kilogram', [FinanceReportController::class, 'costPerKilogram']);
    Route::get('finance/budget-vs-actual', [FinanceReportController::class, 'budgetVsActual']);


    // Weather & Environmental Monitoring
    Route::get('weather/current', [WeatherController::class, 'current']);
    Route::get('weather/forecast', [WeatherController::class, 'forecast']);
    Route::get('weather/alerts', [WeatherController::class, 'alerts']);

    // Storage & Post-Harvest
    Route::apiResource('storage-facilities', StorageFacilityController::class);
    Route::apiResource('stored-produce', StoredProduceController::class);
    Route::apiResource('stored-produce.stock-movements', StockMovementController::class)->shallow();
    Route::apiResource('stored-produce.dispatch-records', DispatchRecordController::class)->shallow();

    // Notifications & Alerts
    Route::apiResource('notifications', NotificationController::class);
    Route::post('notifications/{notification}/mark-as-read', [NotificationController::class, 'markAsRead']);
    Route::apiResource('alert-rules', AlertRuleController::class);
});