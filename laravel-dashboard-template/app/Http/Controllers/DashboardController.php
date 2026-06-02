<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): View
    {
        return view('dashboard.admin', [
            'title' => 'Owner dashboard',
            'metrics' => [
                ['label' => 'Pending approvals', 'value' => 0, 'note' => 'Vendor and rider onboarding queue'],
                ['label' => 'Live vendors', 'value' => 0, 'note' => 'Approved marketplace partners'],
                ['label' => 'Rider bench', 'value' => 0, 'note' => 'Approved delivery capacity'],
                ['label' => 'Alert health', 'value' => 'Setup', 'note' => 'Email, WhatsApp and browser alerts'],
            ],
            'workspaces' => $this->workspaces(),
        ]);
    }

    public function vendor(Request $request): View
    {
        return view('dashboard.vendor', [
            'title' => 'Vendor dashboard',
            'workspaces' => $this->workspaces(),
        ]);
    }

    public function rider(Request $request): View
    {
        return view('dashboard.rider', [
            'title' => 'Rider dashboard',
            'workspaces' => $this->workspaces(),
        ]);
    }

    public function user(Request $request): View
    {
        return view('dashboard.user', [
            'title' => 'User dashboard',
            'workspaces' => $this->workspaces(),
        ]);
    }

    private function workspaces(): array
    {
        return [
            ['label' => 'Owner', 'route' => 'dashboard'],
            ['label' => 'Vendor', 'route' => 'dashboard.vendor'],
            ['label' => 'Rider', 'route' => 'dashboard.rider'],
            ['label' => 'User', 'route' => 'dashboard.user'],
        ];
    }
}

