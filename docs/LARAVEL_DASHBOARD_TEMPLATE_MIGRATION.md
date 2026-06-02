# Lethela Laravel Dashboard Migration

This migration note converts the uploaded `React-Sego-v1.4-30-April-2023` template from a React admin theme into a Laravel-first backend dashboard direction for Lethela.

## What We Reused From Sego

- Sidebar dashboard shell with role workspaces.
- Food admin modules: orders, products/menu, customers, invoices, calendar, inbox, profile and widgets.
- KPI cards, charts, queues and operational task lists.
- Restaurant/vendor language, but restyled into Lethela navy and red.

## Lethela Role Model

- `owner`: full platform dashboard, approvals, order operations, payout oversight, user support and settings.
- `vendor`: menu, stock, orders, specials, payout, team and operating hours.
- `rider`: shifts, dispatch queue, documents, delivery performance and payout estimates.
- `user`: profile, saved addresses, orders, support and loyalty.

## Laravel Implementation Plan

1. Install Laravel with Breeze or Jetstream for authentication.
2. Add roles through a `role` column or a package such as `spatie/laravel-permission`.
3. Move dashboard routes behind `auth` middleware.
4. Use policies for vendor/rider/customer record access.
5. Convert Sego page patterns into Blade partials and reusable dashboard components.
6. Connect Lethela APIs and database models to dashboard widgets.

## Route Shape

```php
Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/dashboard/vendor', [DashboardController::class, 'vendor'])->name('dashboard.vendor');
    Route::get('/dashboard/rider', [DashboardController::class, 'rider'])->name('dashboard.rider');
    Route::get('/dashboard/user', [DashboardController::class, 'user'])->name('dashboard.user');
});
```

## Data Contracts

- `DashboardMetric`: `label`, `value`, `note`, `icon`.
- `ApprovalItem`: `id`, `type`, `name`, `status`, `created_at`, `summary`.
- `OrderLane`: `accepted`, `preparing`, `dispatch`, `issue_queue`.
- `RiderShift`: `availability`, `zone`, `active_orders`, `earnings`.
- `VendorHealth`: `menu_ready`, `stock_flags`, `open_status`, `payout_status`.

## Starter Files

A lightweight Laravel starter has been added under `laravel-dashboard-template/`. Copy those files into a new Laravel app after authentication is installed, then wire the placeholder arrays to Eloquent models.

