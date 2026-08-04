# Lethela SEO, social sharing and performance release — 4 August 2026

This release preserves the existing Lethela design, colours, layouts and customer journeys while improving how public pages are indexed, shared and loaded.

## Search and social sharing

- Generated Lethela browser and Apple icons.
- Branded 1200 × 630 Open Graph and Twitter cards.
- Consistent branded previews for homepage, content, product and vendor links.
- Improved canonical, crawler, manifest, publisher and image-preview metadata.
- Cached public sitemap with private and utility routes excluded.

## Performance

- Removed a hidden hero vendor request and unused hidden-panel code.
- Optimised the unchanged hero image through Next.js image delivery.
- Deferred the location picker until it is opened.
- Deferred consented analytics and marketing scripts.
- Disabled unnecessary session refetching on window focus.
- Enabled AVIF/WebP delivery and longer image cache reuse.

## User data protection

Public marketplace and crawler queries do not select vendor KYC-document URLs, bank-account values, owner identifiers or review-only fields. Vendor readiness is enforced through database filters and server-side boolean flags.

No database migration, reset, seed, deletion or production-record mutation is part of this release.
