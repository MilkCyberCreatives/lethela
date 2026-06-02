@extends('layouts.lethela-dashboard')

@section('content')
    <section class="dashboard-hero">
        <p class="eyebrow">Rider workspace</p>
        <h2>Shift and dispatch dashboard</h2>
        <p>Give riders visibility over active assignments, readiness, documents, performance and payout estimates.</p>
    </section>

    <section class="dashboard-grid">
        <article class="panel"><h3>Active deliveries</h3><p>Pickup, drop-off, order state and support escalation.</p></article>
        <article class="panel"><h3>Availability</h3><p>Shift schedule, zone selection and pause status.</p></article>
        <article class="panel"><h3>Documents</h3><p>ID, licence, bank and emergency-contact verification.</p></article>
        <article class="panel"><h3>Earnings</h3><p>Weekly payout estimate and completed delivery history.</p></article>
    </section>
@endsection

