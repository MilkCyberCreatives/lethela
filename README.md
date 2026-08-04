# Lethela

AI-supported delivery platform for food, groceries, and township-first commerce in South Africa.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Required environment variables

Copy `.env.example` to `.env.local` and fill values you need.

Core:

- `NEXT_PUBLIC_SITE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `VENDOR_SESSION_SECRET`
- `RIDER_CONSOLE_SECRET`
- `ADMIN_APPROVAL_KEY`
- `CRON_SECRET`
- `BANK_DATA_ENCRYPTION_KEY`
- `DATABASE_URL`

Production launch controls:

- `NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE` — `prelaunch`, `pilot`, or `public`
- `EMAIL_VERIFICATION_REQUIRED` — enable only after existing accounts and the email channel are verified
- `DATABASE_RESTORE_TESTED_AT`
- `PRIVATE_STORAGE_VERIFIED_AT`
- `REFUND_FLOW_TESTED_AT`

The public homepage remains in pre-launch or pilot mode until real approved inventory and the configured operating thresholds are available. Public mode must not be used to bypass the owner launch-readiness checks.

SEO + marketing:

- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
- `NEXT_PUBLIC_BING_SITE_VERIFICATION`
- `NEXT_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION`
- `NEXT_PUBLIC_GA4_ID` (optional)
- `NEXT_PUBLIC_GTM_ID` (optional; preferred over GA4 direct script)
- `NEXT_PUBLIC_META_PIXEL_ID` (optional)

## SEO / AEO / GEO stack included

- Canonical metadata + Open Graph + Twitter cards
- Dynamic `robots.txt` via `src/app/robots.ts`
- Dynamic `sitemap.xml` via `src/app/sitemap.ts` (includes active vendor pages)
- JSON-LD schema:
  - `Organization`
  - `WebSite` + `SearchAction`
  - `FoodDeliveryService`
- `FAQPage` (home/about/faq content)
- vendor `FoodEstablishment` + menu `ItemList`
- Internal search page at `/search`
- GEO helper file at `/llms.txt` via `src/app/llms.txt/route.ts`
- Google Merchant feed at `/feeds/google-merchant.xml`

## Connect Google and marketing systems

1. Deploy with `NEXT_PUBLIC_SITE_URL` set to your live domain.
2. In Google Search Console:
   - add your domain property,
   - set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`,
   - submit `https://<your-domain>/sitemap.xml`.
3. In Bing Webmaster Tools:
   - set `NEXT_PUBLIC_BING_SITE_VERIFICATION`,
   - submit the same sitemap URL.
4. For GA4/GTM:
   - set `NEXT_PUBLIC_GTM_ID` (recommended) or `NEXT_PUBLIC_GA4_ID`.
5. For Meta Pixel:
   - set `NEXT_PUBLIC_META_PIXEL_ID`.

## Quality checks

```bash
npm audit --omit=dev --audit-level=high
npm test
npm run check:security-env
npm run typecheck
npm run lint
npm run format:check
npm run build
```

## Operating readiness

Use `/admin/launch-checklist` after deployment to verify the controlled pilot and public marketing gates. The owner runbook is in `docs/OPERATIONS_RUNBOOK.md`.

Public launch additionally requires real approved vendors, products and riders; a controlled Ozow payment and delivery; a refund test; private-storage verification; and a successful provider-side database restore drill.
