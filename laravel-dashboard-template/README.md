# Lethela Laravel Dashboard Template

This folder is a Laravel conversion starter inspired by the uploaded Sego React template and restyled for Lethela.

It is not a full Laravel installation. It contains the core files to copy into a Laravel app after running:

```bash
composer create-project laravel/laravel lethela-backend
cd lethela-backend
composer require laravel/breeze --dev
php artisan breeze:install blade
php artisan migrate
```

Then copy these starter files into the matching Laravel directories:

- `routes/web.php`
- `app/Http/Controllers/DashboardController.php`
- `resources/views/layouts/lethela-dashboard.blade.php`
- `resources/views/dashboard/*.blade.php`
- `resources/css/lethela-dashboard.css`

Recommended next steps:

- Add a `role` column to users: `owner`, `vendor`, `rider`, `user`.
- Protect each dashboard method with policies or role middleware.
- Replace placeholder arrays in `DashboardController` with Eloquent queries.
- Keep the Lethela navy/red styling as the base theme.

