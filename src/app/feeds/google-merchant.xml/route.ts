import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFallbackProducts } from "@/lib/catalog-fallback";
import { shouldPreferCatalogFallback } from "@/lib/catalog-runtime";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

export const revalidate = 900;
export const dynamic = "force-dynamic";

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function imageUrl(value: string | null) {
  if (!value) return absoluteUrl("/hero.jpg");
  return /^https?:\/\//i.test(value) ? value : absoluteUrl(value);
}

export async function GET() {
  const dbProducts = shouldPreferCatalogFallback()
    ? []
    : await prisma.product
        .findMany({
          where: {
            inStock: true,
            vendor: {
              isActive: true,
              status: "ACTIVE",
            },
          },
          include: {
            vendor: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 5000,
        })
        .catch(() => []);

  const products =
    dbProducts.length > 0
      ? dbProducts
      : getFallbackProducts().slice(0, 5000).map((product) => ({
          ...product,
          inStock: true,
          vendor: {
            name: product.vendor.name,
            slug: product.vendor.slug,
          },
        }));

  const itemsXml = products
    .map((product) => {
      const url = product.vendor?.slug ? absoluteUrl(`/vendors/${product.vendor.slug}`) : absoluteUrl("/");
      const title = xmlEscape(product.name);
      const description = xmlEscape(product.description || `${product.name} from ${product.vendor?.name || SITE_NAME}`);
      const brand = xmlEscape(product.vendor?.name || SITE_NAME);
      const availability = product.inStock ? "in stock" : "out of stock";
      const condition = "new";
      const price = `${(product.priceCents / 100).toFixed(2)} ZAR`;

      return [
        "<item>",
        `<g:id>${xmlEscape(product.id)}</g:id>`,
        `<title>${title}</title>`,
        `<description>${description}</description>`,
        `<link>${xmlEscape(url)}</link>`,
        `<g:image_link>${xmlEscape(imageUrl(product.image || null))}</g:image_link>`,
        `<g:brand>${brand}</g:brand>`,
        `<g:condition>${condition}</g:condition>`,
        `<g:availability>${availability}</g:availability>`,
        `<g:price>${price}</g:price>`,
        `<g:identifier_exists>false</g:identifier_exists>`,
        "</item>",
      ].join("");
    })
    .join("");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "<channel>",
    `<title>${xmlEscape(`${SITE_NAME} Product Feed`)}</title>`,
    `<link>${xmlEscape(absoluteUrl("/"))}</link>`,
    `<description>${xmlEscape("Google Merchant Center product feed for Lethela")}</description>`,
    itemsXml,
    "</channel>",
    "</rss>",
  ].join("");

  return new NextResponse(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=900, s-maxage=900",
    },
  });
}
