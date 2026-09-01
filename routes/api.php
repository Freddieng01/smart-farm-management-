<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\FarmController;
use App\Http\Controllers\Api\FieldController;
use App\Http\Controllers\Api\LivestockController;
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
});
