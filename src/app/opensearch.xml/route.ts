import { NextResponse } from "next/server";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

export const revalidate = 86400;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>${escapeXml(SITE_NAME)}</ShortName>
  <Description>Search approved township vendors, spaza shops, groceries and food on ${escapeXml(SITE_NAME)}.</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image height="32" width="32" type="image/svg+xml">${escapeXml(absoluteUrl("/favicon.svg"))}</Image>
  <Url type="text/html" method="get" template="${escapeXml(`${SITE_URL}/search?q={searchTerms}`)}" />
  <Url type="application/json" method="get" template="${escapeXml(`${SITE_URL}/api/search?q={searchTerms}`)}" />
</OpenSearchDescription>`;

  return new NextResponse(xml, {
    headers: {
      "content-type": "application/opensearchdescription+xml; charset=utf-8",
      "cache-control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
