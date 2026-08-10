# Vercel deployment status

As of 10 August 2026, the Lethela production domain was still serving commit `9d836ad456ba48727292749ebe1d10618e4060b7`, while the validated `main` branch had advanced through the launch-readiness, SEO/performance, dashboard, mobile and customer-profile repair releases.

The earlier one-time prebuilt production deployment could not run because the repository did not have a `VERCEL_TOKEN` Actions secret, and the normal Vercel Git deployment was previously rejected by the account build-rate limit.

A documentation-only main-branch update is being used to request a fresh native Vercel production build now that Vercel preview builds are completing successfully again. This update does not change the website design, application logic, database schema or any user record.

Production must be considered aligned only after `www.lethela.co.za` resolves to a deployment built from the current `main` branch and the live smoke checks pass.
