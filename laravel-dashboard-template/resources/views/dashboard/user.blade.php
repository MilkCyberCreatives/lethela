@extends('layouts.lethela-dashboard')

@section('content')
    <section class="dashboard-hero">
        <p class="eyebrow">User workspace</p>
        <h2>Customer profile dashboard</h2>
        <p>Orders, saved addresses, support requests, loyalty status and communication preferences.</p>
    </section>

    <section class="dashboard-grid">
        <article class="panel"><h3>Recent orders</h3><p>Order history and reorder actions.</p></article>
        <article class="panel"><h3>Addresses</h3><p>Saved delivery locations and default selection.</p></article>
        <article class="panel"><h3>Support</h3><p>Refunds, messages and open cases.</p></article>
        <article class="panel"><h3>Loyalty</h3><p>Rewards, preferences and personalised offers.</p></article>
    </section>
@endsection

