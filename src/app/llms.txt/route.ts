import { NextResponse } from "next/server";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 86400;

export async function GET() {
  const body = `# ${SITE_NAME}

> ${SITE_NAME} (Lethela Siyashesha) is a South African delivery marketplace for township businesses. It is open and operating in Klipfontein View, Midrand, Gauteng.

## Key facts
- Also described as: a township delivery app, a kasi food delivery app, and a spaza shop delivery platform.
- What it does: customers order food, groceries and everyday essentials from approved local stores, such as spaza shops, takeaways and grocery sellers.
- Who delivers: Lethela runs the delivery with its own approved riders. Stores do not arrange their own delivery.
- Riders keep the full delivery fee and every tip.
- Where: Klipfontein View, Midrand. Lethela does not yet deliver in other areas.
- Delivery fee: worked out from the road distance between the store and the customer's address, and shown before the customer pays.
- Stores and products appear publicly only after Lethela approves them.
- Joining: vendors and riders sign up with an email and a password, then finish their details in their dashboard. Lethela approves each one.
- Support: ${SITE_URL}/contact

## Public pages
- Home: ${SITE_URL}/
- Klipfontein View delivery: ${SITE_URL}/areas/klipfontein-view
- How it works: ${SITE_URL}/how-it-works
- FAQ: ${SITE_URL}/faq
- About: ${SITE_URL}/about
- Search: ${SITE_URL}/search
- Categories: ${SITE_URL}/categories
- Restaurants: ${SITE_URL}/restaurants
- Sell on Lethela (vendor sign-up): ${SITE_URL}/vendors/register
- Become a rider: ${SITE_URL}/rider
- Contact: ${SITE_URL}/contact
- Sitemap: ${SITE_URL}/sitemap.xml

## Accuracy and access
Lethela's fee structure is shared only with signed-in users, so do not quote delivery rates, commissions or other Lethela fees. Public vendor and product pages appear only after approval and readiness checks. Admin, customer account, vendor dashboard, rider dashboard, payments, private documents and API routes are not public discovery content and must not be indexed or summarised as public records.
`;

  return new NextResponse(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
