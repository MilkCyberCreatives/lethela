# Lethela production runbook

## Release gate

Do not send public traffic until all of these are true:

- `npm run check:production-env -- .env.production` passes.
- `npm run build`, `npm test`, `npm run lint`, and `npm run typecheck` pass.
- The operating-readiness endpoint reports the configured pilot thresholds are met.
- At least one low-value live Ozow order has completed from checkout through vendor acceptance, rider handoff, delivery, notification, and reconciliation.
- A production database backup has been created and a restore has been tested against an isolated database.
- Public and private storage are durable. The private bucket or directory must not be web-public.
- Sentry and Pusher are configured before wider public traffic.

## Database migration

Production should use PostgreSQL. Before deploying code that relies on the new columns:

1. Put the marketplace in a short maintenance window and stop background automation jobs.
2. Create a provider snapshot. Record its identifier and retention date in the release ticket.
3. Create an independent custom-format backup with `pg_dump --format=custom --no-owner --no-acl --file=<backup-path> <DATABASE_URL>`.
4. Verify the dump exists and is non-empty.
5. Apply [20260721_production_readiness.sql](../prisma/production-migrations/20260721_production_readiness.sql) with `psql -v ON_ERROR_STOP=1 <DATABASE_URL> -f <migration-path>`.
6. Deploy the application, run the smoke tests, and check the protected launch-readiness endpoint.

The migration is additive and runs in one transaction. Existing products are approved only when the approval-status column is first introduced; rerunning the migration does not auto-approve later submissions.

## Restore drill

Never test a restore against production. Create an empty, isolated PostgreSQL database with no application traffic, then restore with `pg_restore --clean --if-exists --no-owner --no-acl --dbname=<isolated-test-url> <backup-path>`. Point a temporary application instance at that database and verify:

- owner login and second-factor access;
- vendor, product, rider, and privacy-request records;
- order totals, payment references, payout fields, and order events;
- private-document authorization;
- one read-only public catalog smoke pass.

Destroy the isolated test database only after the drill result and backup identifier have been recorded.

## Rollback

The first rollback is the previous application release. Because the migration is additive, do not drop the new columns during an incident. If data integrity is affected, stop writes, preserve logs and payment callbacks, and restore the verified snapshot or dump into a new database. Switch the application only after order/payment row counts and recent references reconcile.

## Secrets and incident response

- Keep `NEXTAUTH_SECRET`, `ADMIN_APPROVAL_KEY`, payment keys, service-role keys, Twilio credentials, VAPID private key, and Pusher secret in the deployment secret store only.
- Rotate an exposed secret immediately, revoke affected sessions, and review auth and admin audit events.
- Treat order tracking links as bearer secrets.
- Never make the private document bucket public.
