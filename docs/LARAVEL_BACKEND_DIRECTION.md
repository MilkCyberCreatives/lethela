# Laravel Backend Direction

Lethela should move toward Laravel as the backend and dashboard platform for future work.

## Direction

- Use Laravel for admin, vendor, rider, orders, payouts, notifications, queues, and operational dashboards.
- Keep the existing Next.js storefront stable while backend and dashboard APIs move in phases.
- Use PostgreSQL as the shared production database contract.
- Treat Laravel migrations as the future source of truth once the Laravel backend is introduced.
- Avoid adding new dashboard-only business logic to Next.js unless it is part of a short-lived migration bridge.

## Migration Order

1. Stabilize the current database model in PostgreSQL-compatible form.
2. Create the Laravel backend with migrations and Eloquent models that match the current Prisma schema.
3. Move admin approvals and rider operations first.
4. Move vendor dashboard APIs next.
5. Move order, payment, notification, and queue workflows after the operational dashboard is stable.
6. Leave public storefront pages in Next.js until the Laravel APIs are proven in production.

## Immediate Rules

- New dashboard/backend features should be designed as Laravel-owned features.
- New database tables should be planned with Laravel migrations in mind.
- Next.js API routes may continue to support the current app during migration, but should not become the long-term home for new dashboard workflows.
