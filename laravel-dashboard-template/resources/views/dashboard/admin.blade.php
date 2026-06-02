@extends('layouts.lethela-dashboard')

@section('content')
    <section class="dashboard-hero">
        <p class="eyebrow">Owner workspace</p>
        <h2>Platform command centre</h2>
        <p>Approvals, vendors, riders, users, orders, payouts and support in one Laravel backend dashboard.</p>
    </section>

    <section class="metric-grid">
        @foreach ($metrics as $metric)
            <article class="metric-card">
                <span>{{ $metric['label'] }}</span>
                <strong>{{ $metric['value'] }}</strong>
                <p>{{ $metric['note'] }}</p>
            </article>
        @endforeach
    </section>

    <section class="dashboard-grid">
        <article class="panel">
            <h3>Approval queue</h3>
            <p>Connect this panel to vendor and rider application models.</p>
        </article>
        <article class="panel">
            <h3>Order pulse</h3>
            <p>Use Sego-style order lanes for accepted, preparing, dispatch and issue queues.</p>
        </article>
    </section>
@endsection

