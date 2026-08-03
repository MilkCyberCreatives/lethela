# Lethela dashboard command-centre release

## Scope

This release upgrades the authenticated admin, vendor and rider workspaces without changing the public marketplace design or rewriting production data.

## Dashboard experience

- Branded navy navigation with a clearer light operational workspace.
- Stronger visual hierarchy for metrics, queues, forms, tables and status alerts.
- Responsive dashboard navigation for desktop, tablet and mobile.
- A dedicated rider command-centre shell with real links to overview, profile, marketplace and support.
- Existing admin and vendor actions remain connected to their current pages, tabs and APIs.

## Data protection

- Dashboard and sensitive API responses are private, non-cacheable and excluded from search indexing.
- Owner access uses a secure host-only cookie in production.
- First-owner bootstrap can be restricted to configured email addresses.
- Unauthorised dashboard and API access fails closed.
- No database reset, seed, destructive migration or user-record rewrite is part of this release.

## Release checks

The release must pass the production dependency audit, regression tests, TypeScript, ESLint, Prettier and the complete Next.js production build before deployment.
