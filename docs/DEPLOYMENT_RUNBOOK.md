# Lethela Deployment Runbook

This runbook is for taking the current application live without changing the product design, look and feel, or user-facing flows.

## Hosting Requirements

- Beginner-simple launch path: use SQLite on one persistent server with automated backups.
- PostgreSQL is still recommended once traffic grows or the app runs on multiple instances.
- Do not use relative SQLite paths in production.
- Going forward, dashboard and backend operations should move toward Laravel as documented in `docs/LARAVEL_BACKEND_DIRECTION.md`.

Relevant code:

- `prisma/schema.prisma`
- `src/lib/db.ts`

## Required Production Environment

Copy `.env.production.example` to your real production secret store and replace every placeholder.

### Core

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXTAUTH_URL=https://your-domain.example
```

### Auth and Sessions

```env
NEXTAUTH_SECRET=replace-with-a-long-random-secret
VENDOR_SESSION_SECRET=replace-with-a-long-random-secret
RIDER_CONSOLE_SECRET=replace-with-a-long-random-secret
ADMIN_APPROVAL_KEY=replace-with-a-long-random-secret
```

Notes:

- `VENDOR_SESSION_SECRET` can fall back to `NEXTAUTH_SECRET`, but a dedicated secret is better.
- `RIDER_CONSOLE_SECRET` can fall back to `NEXTAUTH_SECRET`, but a dedicated secret is better.
- `ADMIN_APPROVAL_KEY` is used for browser-level admin enablement and first-admin bootstrap through `/owner-access`.

Relevant code:

- `src/lib/vendor-session.ts`
- `src/lib/rider-console.ts`
- `src/app/api/admin/access/route.ts`

### Database

```env
DATABASE_PROVIDER=sqlite
DATABASE_URL=file:/var/lethela/data/lethela.db
```

Notes:

- SQLite is simplest for a beginner launch, but only on a single persistent server.
- Use an absolute path and back it up daily.
- If you deploy on Vercel/serverless or need multiple app instances, use PostgreSQL.

Relevant code:

- `src/lib/db.ts`

### Maps

```env
GOOGLE_MAPS_API_KEY=replace-with-your-server-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=replace-with-your-browser-key
```

Notes:

- Server-side geocoding and delivery quote resolution use `GOOGLE_MAPS_API_KEY`.
- Live map rendering uses `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

Relevant code:

- `src/lib/geo.ts`
- `src/components/OrderMap.tsx`

### Storage

```env
UPLOAD_STORAGE=local
STORAGE_LOCAL_DIR=/var/lethela/public/uploads
STORAGE_PUBLIC_PATH=/uploads
```

Notes:

- Local uploads are the simplest option on one persistent server.
- If you deploy on Vercel/serverless, local uploads are not durable; use managed object storage.
- Supabase remains supported but is optional.

Relevant code:

- `src/server/supabase.ts`
- `src/app/api/upload/route.ts`

### Payments

```env
OZOW_SITE_CODE=replace-with-live-site-code
OZOW_PRIVATE_KEY=replace-with-live-private-key
OZOW_IS_TEST=false
NEXT_PUBLIC_OZOW_IS_TEST=false
```

Notes:

- Use live Ozow credentials for launch.
- Both `OZOW_IS_TEST` and `NEXT_PUBLIC_OZOW_IS_TEST` should be `false` in production.

Relevant code:

- `src/app/api/payments/ozow/create/route.ts`
- `src/app/api/payments/ozow/notify/route.ts`
- `src/app/checkout/page.tsx`

## Recommended Production Environment

### Admin and Password Reset Notifications

```env
ADMIN_NOTIFICATION_EMAILS=ops@example.com
ADMIN_NOTIFICATION_EMAIL_FROM=alerts@example.com
RESEND_API_KEY=replace-with-resend-key
PASSWORD_RESET_EMAIL_FROM=support@example.com
PASSWORD_RESET_SECRET=replace-with-a-long-random-secret
ADMIN_NOTIFICATION_WHATSAPP_TO=27720000000
TWILIO_ACCOUNT_SID=replace-with-twilio-sid
TWILIO_AUTH_TOKEN=replace-with-twilio-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

Relevant code:

- `src/lib/admin-notifications.ts`
- `src/lib/password-reset.ts`

### Realtime and Push

```env
PUSHER_APP_ID=replace-with-pusher-app-id
PUSHER_KEY=replace-with-pusher-key
PUSHER_SECRET=replace-with-pusher-secret
PUSHER_CLUSTER=mt1
NEXT_PUBLIC_PUSHER_KEY=replace-with-pusher-key
NEXT_PUBLIC_PUSHER_CLUSTER=mt1
NEXT_PUBLIC_VAPID_PUBLIC_KEY=replace-with-vapid-public-key
WEB_PUSH_VAPID_PRIVATE_KEY=replace-with-vapid-private-key
WEB_PUSH_SUBJECT=mailto:support@example.com
```

Relevant code:

- `src/lib/pusher-server.ts`
- `src/lib/pusher-client.ts`
- `src/lib/web-push.ts`

### Observability

```env
SENTRY_DSN=replace-with-sentry-dsn
SENTRY_ENVIRONMENT=production
```

### Marketing and SEO

```env
NEXT_PUBLIC_GA4_ID=
NEXT_PUBLIC_GTM_ID=
NEXT_PUBLIC_META_PIXEL_ID=
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
NEXT_PUBLIC_BING_SITE_VERIFICATION=
NEXT_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION=
```

Relevant code:

- `src/app/layout.tsx`
- `src/components/MarketingScripts.tsx`

### Public Legal and Contact Metadata

```env
NEXT_PUBLIC_SUPPORT_EMAIL=support@example.com
NEXT_PUBLIC_LEGAL_ENTITY_NAME=Lethela Pty Ltd
NEXT_PUBLIC_INFO_OFFICER_NAME=Your Name
NEXT_PUBLIC_FACEBOOK_URL=
NEXT_PUBLIC_INSTAGRAM_URL=
NEXT_PUBLIC_TIKTOK_URL=
NEXT_PUBLIC_X_URL=
NEXT_PUBLIC_YOUTUBE_URL=
NEXT_PUBLIC_LINKEDIN_URL=
NEXT_PUBLIC_WHATSAPP_ORDER_PHONE=27723908919
```

Relevant code:

- `src/lib/legal.ts`
- `src/lib/whatsapp-order.ts`

### Optional AI Features

```env
OPENAI_API_KEY=replace-with-openai-key
```

Relevant code:

- `src/lib/ai.ts`
- `src/lib/embeddings.ts`

## Production Bootstrap

1. Provision a production PostgreSQL database.
2. Set all required production environment variables.
3. Install dependencies with Node `24.x`.
4. Generate Prisma client:

```powershell
npm run prisma:generate
```

5. Push the database schema to the production DB file:

```powershell
npm run db:push
```

6. Start the production build:

```powershell
npm run build
npm run start
```

## First Admin Setup

1. Open `/signin` and sign in with your normal account.
2. Open `/owner-access`.
3. Enter `ADMIN_APPROVAL_KEY`.
4. If this is the first admin in the database, the app will promote the signed-in user to `ADMIN`.
5. Sign out and sign back in once if you were promoted during step 4.
6. Open `/admin`.

Relevant code:

- `src/app/api/admin/access/route.ts`
- `src/lib/admin-auth.ts`

## Operating Verification

Run these commands against the production configuration before opening traffic:

```powershell
npm run check:production-env -- .env.production
npm run check:operating-readiness -- .env.production https://www.lethela.co.za
npm test
npx tsc --noEmit --incremental false
npm run build
```

Then verify the live deployment:

1. Open `/api/ops/health` as an admin user.
2. Confirm `services.db.ok` is `true`.
3. Confirm `services.storage` is `true`.
4. Confirm `services.maps` is `true`.
5. Confirm `services.ozow` is `true`.
6. Confirm `catalog.mode` is `live`.
7. Confirm `catalog.activeVendors` and `catalog.activeProducts` are sensible for your operating state.

Relevant code:

- `src/app/api/ops/health/route.ts`

## Operating Smoke Test

Run this exact flow on the live site:

1. Sign in as admin.
2. Open `/admin`.
3. Approve one pending vendor.
4. Sign in as that vendor.
5. Upload a logo or product image.
6. Confirm the uploaded image resolves from durable storage.
7. Create a customer order with a real delivery suburb.
8. Complete an Ozow payment.
9. Confirm the order reaches paid state.
10. Open the order tracking page and confirm maps/realtime status work.
11. Run a password reset request and confirm the email arrives if email is enabled.

## Operational Notes

- Treat order reference links as secrets. The tracking route is intentionally bearer-token-like and exposes destination and rider coordinates to whoever has the order reference.
- `serverActions.allowedOrigins` now follows your configured site origins, so make sure `NEXT_PUBLIC_SITE_URL` and `NEXTAUTH_URL` are correct before deployment.
- `NEXT_PUBLIC_SITE_URL` and `NEXTAUTH_URL` should match the public canonical domain exactly.
- Avoid relying on fallback defaults for production analytics or public legal metadata.
- Production operating checks intentionally reject demo catalog mode and public demo orders.

Relevant code:

- `src/app/api/orders/[ref]/route.ts`
- `next.config.mjs`
- `src/lib/site.ts`

## Rollback Guidance

If operating validation fails:

1. Keep traffic closed.
2. Fix the missing env or infrastructure issue.
3. Re-run `/api/ops/health`.
4. Re-run the operating smoke test.
5. Only open traffic after all operating-critical checks pass.
