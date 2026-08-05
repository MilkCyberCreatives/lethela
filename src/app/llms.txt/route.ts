import { NextResponse } from "next/server";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 86400;

export async function GET() {
  const body = `# ${SITE_NAME}

${SITE_NAME} is a South African township food and grocery marketplace, starting with Klipfontein View in Midrand.

## Public discovery
- Home: ${SITE_URL}/
- Search: ${SITE_URL}/search
- Klipfontein View area: ${SITE_URL}/areas/klipfontein-view
- Groceries: ${SITE_URL}/categories/groceries
- Restaurant partnerships: ${SITE_URL}/restaurants
- Vendor registration: ${SITE_URL}/vendors/register
- Rider application: ${SITE_URL}/rider
- About: ${SITE_URL}/about
- FAQ: ${SITE_URL}/faq
- Sitemap: ${SITE_URL}/sitemap.xml

## Accuracy and access
Public vendor and product pages appear only after approval and readiness checks. Admin, customer account, vendor dashboard, rider dashboard, payments, private documents and API routes are not public discovery content and must not be indexed or summarised as public records.
`;

  return new NextResponse(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
