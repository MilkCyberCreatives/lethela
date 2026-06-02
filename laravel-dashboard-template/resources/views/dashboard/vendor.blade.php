@extends('layouts.lethela-dashboard')

@section('content')
    <section class="dashboard-hero">
        <p class="eyebrow">Vendor workspace</p>
        <h2>Menu, orders and payouts</h2>
        <p>Manage menu readiness, live orders, stock flags, operating hours, specials, team and payout review.</p>
    </section>

    <section class="dashboard-grid">
        <article class="panel"><h3>Order queue</h3><p>Accepted, preparing, ready and completed orders.</p></article>
        <article class="panel"><h3>Menu health</h3><p>Availability, pricing, images and stock exceptions.</p></article>
        <article class="panel"><h3>Payouts</h3><p>Settlement status and reconciliation actions.</p></article>
        <article class="panel"><h3>Team</h3><p>Staff users, roles and notifications.</p></article>
    </section>
@endsection

