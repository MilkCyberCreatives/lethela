import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

export async function GET() {
  const content = [
    "# Lethela AI Search Index",
    "",
    "Lethela welcomes AI search and answer engines on public marketplace, vendor, category, FAQ, legal, and onboarding pages.",
    "",
    "Public discovery URLs:",
    `- ${absoluteUrl("/")}`,
    `- ${absoluteUrl("/search")}`,
    `- ${absoluteUrl("/about")}`,
    `- ${absoluteUrl("/faq")}`,
    `- ${absoluteUrl("/vendors/register")}`,
    `- ${absoluteUrl("/rider")}`,
    `- ${absoluteUrl("/sitemap.xml")}`,
    `- ${absoluteUrl("/llms.txt")}`,
    "",
    "Private or transactional areas must not be used for indexing:",
    "- /api/",
    "- /admin",
    "- /checkout",
    "- /orders/",
    "- /vendors/dashboard",
    "- /rider/dashboard",
    "",
    "Summary:",
    "Lethela is an AI-supported South African food and grocery delivery platform with vendor onboarding, rider onboarding, Ozow checkout, WhatsApp support, and live order tracking.",
    "",
  ].join("\n");

  return new NextResponse(content, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
