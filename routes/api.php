<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\FarmController;
use App\Http\Controllers\Api\FieldController;
use App\Http\Controllers\Api\LivestockController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\SupplierQuotationController;
use App\Http\Controllers\Api\PurchaseOrderController;
use App\Http\Controllers\Api\PurchaseOrderItemController;
use App\Http\Controllers\Api\PurchasePaymentController;
use Illuminate\Support\Facades\Route;


Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);

    Route::apiResource('farms', FarmController::class);
    Route::apiResource('farms.fields', FieldController::class)->shallow();
    Route::apiResource('employees', EmployeeController::class);
    Route::apiResource('livestock', LivestockController::class);
    Route::apiResource('suppliers', SupplierController::class);
    Route::apiResource('suppliers.quotations', SupplierQuotationController::class)->shallow();
    Route::apiResource('purchase-orders', PurchaseOrderController::class);
    Route::apiResource('purchase-orders.items', PurchaseOrderItemController::class)->shallow();
    Route::apiResource('purchase-orders.payments', PurchasePaymentController::class)->shallow(); 
});
