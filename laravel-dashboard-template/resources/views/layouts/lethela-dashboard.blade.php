<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title ?? 'Lethela Dashboard' }}</title>
    @vite(['resources/css/app.css', 'resources/css/lethela-dashboard.css', 'resources/js/app.js'])
</head>
<body class="lethela-body">
    <div class="dashboard-shell">
        <aside class="dashboard-sidebar">
            <p class="eyebrow">Lethela backend</p>
            <h1>Dashboard</h1>
            <nav>
                @foreach ($workspaces ?? [] as $workspace)
                    <a href="{{ route($workspace['route']) }}">{{ $workspace['label'] }}</a>
                @endforeach
            </nav>
        </aside>

        <main class="dashboard-main">
            @yield('content')
        </main>
    </div>
</body>
</html>

