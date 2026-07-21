# Lethela production-readiness inspection

Date: 21 July 2026  
Status: **NO-GO for public production launch until the blocking items below are closed.**

## Executive result

The production-readiness pass covered the public marketplace, authentication, customer, vendor,
rider and admin journeys, checkout and payment integrity, order state management, payouts, private
uploads, database evolution, accessibility, responsive behaviour, SEO and operational readiness.

The high-risk code paths and the core marketplace journeys were materially hardened. The local
application builds and its automated regression suite passes. The deployment is not yet safe to
open publicly because private production storage is not configured and the live provider/database
checks cannot be completed from this workspace.

The original brief also describes a much broader back-office product than the current data model
supports. Full CRUD modules for staff accounts, marketplace categories, townships/delivery zones,
support tickets/complaints, platform settings, promotions and integrations remain product work;
the admin navigation intentionally exposes only controls that are connected to working data.

## What was inspected

- Next.js routes, middleware, headers, client/server boundaries and production build output.
- Registration, sign-in, password reset, session revocation and role-based access.
- Customer browsing, search, categories, product detail, cart, checkout and tracking.
- Vendor registration, profile readiness, secure documents, products, hours, orders and payouts.
- Rider registration, profile readiness, assignment, delivery status, liquor ID check and earnings.
- Admin factor verification, approval queues, dispatch, refund records, payouts and audit logs.
- Prisma SQLite and PostgreSQL schemas, production migration and local database compatibility.
- Ozow request/callback validation, order idempotency and financial allocation.
- File uploads and private-file authorization.
- Legal/support pages, cookies, robots, sitemap and structured product data.
- Desktop and 390 px mobile rendering, overflow, registration semantics and browser console output.

## Main fixes delivered

- Unified account registration and authentication for customers, vendors and riders.
- Added exact platform roles, permission checks, login throttling/lockout, bcrypt cost 12 and
  session-version revocation.
- Required a user-bound, signed admin verification factor for browser admin access and removed
  implicit development bypasses.
- Removed legacy vendor-cookie login and retired unsafe/demo registration and rider-AI endpoints.
- Added vendor and rider readiness gates, review reasons and private document handling.
- Added product submission/review states and prevented unapproved products from leaking into any
  public catalog, search, feed, sitemap or checkout path.
- Added licensed-liquor controls, adult product gating and delivery-time ID verification.
- Enforced trusted server-side product prices, delivery fees, totals, payment references and
  idempotent order creation.
- Added an explicit, validated order lifecycle, rider assignment controls, refund records, payout
  records and sensitive-action audit logging.
- Removed simulated rider locations from buyer and vendor tracking.
- Added product details, working card links, cross-vendor cart protection, mobile cart affordance,
  account/privacy request routes, contact/cookie pages and accessible registration labels.
- Added CSP and security headers, constrained map endpoints, hardened uploads and protected private
  file reads.
- Added a transactional PostgreSQL migration and an operator runbook for backup, restore, deploy
  and rollback.

## Route areas changed

- Public: `/`, `/search`, `/categories/[category]`, `/products/[id]`, `/contact`,
  `/cookie-policy`, `/faq`, `/sitemap.xml`, `/robots.txt` and marketplace feeds.
- Authentication/account: `/signin`, `/signup`, `/account`, `/profile`, password reset and
  `/api/auth/*`, `/api/me/*`.
- Vendor: `/vendors/register`, `/vendors/signin`, `/vendors/dashboard/*` and `/api/vendors/*`.
- Rider: `/rider`, `/rider/dashboard/*`, `/rider/[ref]`, `/api/riders/*` and assigned order APIs.
- Buyer/order: `/checkout`, `/orders/[ref]`, payment, quote, tracking and status APIs.
- Admin: `/admin`, `/admin/launch-checklist`, approval, operations, products, payouts,
  notifications and audit-backed APIs.
- Storage/operations: `/api/files`, upload APIs, `/api/ops/health` and
  `/api/ops/launch-readiness`.

## Database changes

- Expanded user security/session fields and privacy requests.
- Expanded vendor profile, KYC, banking, licence, capacity and readiness fields.
- Added product review state/reason and alcohol metadata.
- Expanded rider identity, documents, availability, service area, banking and readiness fields.
- Expanded orders with checkout/payment idempotency, rider assignment, exact financial splits,
  payout state, status reasons and liquor verification.
- Added supporting indexes and relations in both SQLite and PostgreSQL schemas.

Production migration:
`prisma/production-migrations/20260721_production_readiness.sql`

The migration is additive and transactional. It must be applied only after a provider snapshot and
an isolated restore test. Do not use local `db push` against production.

## Security result

- No credential values were intentionally added to source, logs or client bundles.
- Unauthenticated admin, readiness, upload and private-file requests were rejected in smoke tests.
- The development login endpoint returns 404 and retired legacy routes return 410.
- CSP and `X-Content-Type-Options: nosniff` were present in the production smoke run.
- Payment callbacks validate signature, amount, currency, transaction uniqueness and timing.
- PII documents are kept behind authorized file access rather than public upload URLs.

Rotate credentials only if deployment history or provider logs show they were previously exposed.
Before launch, rotate the admin verification key and payment webhook secret as a normal deployment
precaution, then invalidate prior sessions.

## Tests and verification

- Unit/regression tests: **40/40 passed**.
- TypeScript: passed.
- ESLint: passed.
- Prettier/format check: passed.
- `git diff --check`: passed (Git reports only Windows line-ending notices).
- Production build: passed; 112 routes/pages were emitted.
- Production route smoke test: **10/10 passed**.
- SQLite schema sync: passed.
- PostgreSQL Prisma schema validation: passed.
- Desktop and mobile browser inspection: no horizontal overflow or console errors; the inspection
  directly led to visible registration labels and an accessible mobile-menu name.

No trustworthy Lighthouse score was recorded against a deployed HTTPS production URL. Slow-network,
real-device and full Playwright role journeys also remain to be run on the deployed release.

## Required environment and provider work

Use `.env.example` as the variable inventory and run:

```powershell
npm run check:production-env -- .env.production
```

Current blocking result:

- `SUPABASE_PRIVATE_BUCKET` is missing. Configure a non-public bucket and verified owner/admin read
  policies before accepting identity, banking or licence documents.

Current warnings:

- Pusher server/public credentials are missing, so realtime order updates are not launch-ready.
- `NEXT_PUBLIC_SENTRY_DSN` is missing, so production runtime monitoring is incomplete.

Live credentials are also required to validate Ozow, Google Maps, email, WhatsApp and web-push
delivery. Do not paste those values into tickets, chat, commits or browser-visible configuration.

## Deployment gates that still require operators

1. Take a production PostgreSQL snapshot and prove an isolated restore.
2. Apply the production migration and verify row counts and critical indexes.
3. Configure private Supabase storage and test document upload/read denial across roles.
4. Deploy to the real HTTPS domain and run the protected operating-readiness check.
5. Onboard and approve real vendors, products and riders; the local dataset currently has no live
   approved public catalog to validate at production scale.
6. Run a low-value real Ozow order through callback, vendor acceptance, rider delivery, payout and
   refund reconciliation.
7. Verify real email, WhatsApp, push, Pusher, Sentry and Maps behaviour.
8. Run Playwright/axe/Lighthouse and the supported mobile/browser matrix against the deployed URL.

## Legal confirmation

The privacy, terms, cookie and liquor wording is operational copy, not legal advice. South African
privacy, consumer, payments, independent-contractor and liquor-delivery obligations should be
confirmed by qualified counsel before public launch.

## Final decision

The codebase is substantially safer and the core pilot marketplace is locally buildable and
testable. It is **not accurate to call the entire original brief complete** and it is **not yet
production-ready**. Keep the public launch gate closed until the private-storage error, live
database/provider tests and the required operator proof transaction are completed. Prioritise the
remaining back-office modules according to actual operating need rather than presenting decorative
admin controls.
