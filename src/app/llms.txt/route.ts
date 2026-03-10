import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

export async function GET() {
  const content = [
    "# Lethela",
    "",
    "> Lethela is a South African AI-supported delivery platform for food, groceries, and township-first commerce.",
    "",
    "## Primary URLs",
    `- Home: ${absoluteUrl("/")}`,
    `- Search: ${absoluteUrl("/search")}`,
    `- About: ${absoluteUrl("/about")}`,
    `- FAQ: ${absoluteUrl("/faq")}`,
    `- Vendor Onboarding: ${absoluteUrl("/vendors/register")}`,
    `- Vendor Sign In: ${absoluteUrl("/vendors/signin")}`,
    `- Vendor Dashboard: ${absoluteUrl("/vendors/dashboard")}`,
    `- Rider Onboarding: ${absoluteUrl("/rider")}`,
    `- Track Order: ${absoluteUrl("/track")}`,
    "",
    "## Core Topics",
    "- Food delivery in South Africa",
    "- Township favourites: kota, chips, burgers",
    "- Grocery and alcohol ordering",
    "- Vendor marketplace onboarding",
    "- Rider delivery operations",
    "- Order tracking with LET-12345 style references",
    "- Ozow checkout and WhatsApp-assisted ordering",
    "- Vendor dashboard operations: menu, orders, analytics, specials, automations",
    "",
    "## Business Facts",
    "- Primary service area focus: Klipfontein View, Midrand and nearby suburbs",
    "- Support channel: WhatsApp support",
    "- Vendors require admin approval before going live",
    "- Riders require operations review before onboarding",
    "- Alcohol is 18+ only and subject to local regulations",
    "",
    "## Machine-readable signals",
    "- JSON-LD Organization/WebSite/SearchAction schema",
    "- JSON-LD FAQPage schema",
    "- Dynamic sitemap.xml",
    "- robots.txt",
    "",
  ].join("\n");

  return new NextResponse(content, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
