<?php

use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/dashboard/vendor', [DashboardController::class, 'vendor'])->name('dashboard.vendor');
    Route::get('/dashboard/rider', [DashboardController::class, 'rider'])->name('dashboard.rider');
    Route::get('/dashboard/user', [DashboardController::class, 'user'])->name('dashboard.user');
});

