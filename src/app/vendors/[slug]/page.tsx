import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import MainHeader from "@/components/MainHeader";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import StructuredData from "@/components/StructuredData";
import { getFallbackVendorProfile } from "@/lib/catalog-fallback";
import { prisma } from "@/lib/db";
import { withQueryTimeout } from "@/lib/query-timeout";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const getVendorBySlug = cache(async (slug: string) =>
  {
    const vendorQuery = prisma.vendor.findFirst({
      where: { slug, isActive: true, status: "ACTIVE" },
      include: {
        products: {
          where: { inStock: true },
          orderBy: { updatedAt: "desc" },
          take: 80,
        },
        specials: {
          where: { endsAt: { gte: new Date() } },
          orderBy: { startsAt: "asc" },
          take: 4,
        },
      },
    });

    type VendorRecord = Awaited<typeof vendorQuery>;

    return withQueryTimeout(vendorQuery, getFallbackVendorProfile(slug) as unknown as VendorRecord);
  }
);

function normalizeCuisine(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value || "[]");
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return [];
    }
  }

  return [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);

  if (!vendor) {
    return {
      title: "Vendor not found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const location = [vendor.suburb, vendor.city].filter(Boolean).join(", ");
  const description = location
    ? `${vendor.name} on ${SITE_NAME}. Order fast delivery in ${location}.`
    : `${vendor.name} on ${SITE_NAME}. Order fast delivery from local favourites.`;

  return {
    title: vendor.name,
    description,
    alternates: {
      canonical: `/vendors/${vendor.slug}`,
    },
    openGraph: {
      type: "website",
      title: `${vendor.name} | ${SITE_NAME}`,
      description,
      url: absoluteUrl(`/vendors/${vendor.slug}`),
      images: [absoluteUrl(vendor.products.some((item) => item.isAlcohol) ? "/vendors/vegan.jpg" : "/vendors/grill.jpg")],
    },
  };
}

export default async function VendorProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);

  if (!vendor) return notFound();

  const location = [vendor.suburb, vendor.city].filter(Boolean).join(", ");
  const isAlcoholVendor = vendor.products.some((item) => item.isAlcohol);
  const vendorUrl = absoluteUrl(`/vendors/${vendor.slug}`);
  const cuisines = normalizeCuisine(vendor.cuisine);

  const vendorSchema = {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    name: vendor.name,
    url: vendorUrl,
    image: absoluteUrl(isAlcoholVendor ? "/vendors/vegan.jpg" : "/vendors/grill.jpg"),
    telephone: vendor.phone || undefined,
    priceRange: "R",
    servesCuisine: cuisines,
    address: {
      "@type": "PostalAddress",
      streetAddress: vendor.address || undefined,
      addressLocality: vendor.city || undefined,
      addressRegion: vendor.province || undefined,
      addressCountry: "ZA",
    },
    hasMenu: vendorUrl,
  };

  const menuSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${vendor.name} menu`,
    itemListElement: vendor.products.slice(0, 30).map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: product.name,
        description: product.description || undefined,
        image: product.image ? absoluteUrl(product.image) : undefined,
        offers: {
          "@type": "Offer",
          priceCurrency: "ZAR",
          price: (product.priceCents / 100).toFixed(2),
          availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        },
      },
    })),
  };

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <StructuredData data={vendorSchema} />
      <StructuredData data={menuSchema} />
      <MainHeader />

      <section className="border-b border-white/10 bg-black/25">
        <div className="container grid gap-6 py-8 md:grid-cols-[1fr,320px] md:py-10">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/65">Vendor profile</p>
              <h1 className="mt-1 text-3xl font-semibold leading-tight md:text-4xl">{vendor.name}</h1>
              <p className="mt-3 max-w-2xl text-sm text-white/78">
                Fast local delivery with AI-assisted ordering and live availability updates.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {location ? <span className="rounded-full border border-white/20 px-3 py-1">{location}</span> : null}
              <span className="rounded-full border border-white/20 px-3 py-1">{vendor.isActive ? "Open for orders" : "Temporarily offline"}</span>
              {vendor.phone ? <span className="rounded-full border border-white/20 px-3 py-1">{vendor.phone}</span> : null}
            </div>

            {vendor.specials.length > 0 ? (
              <div className="rounded-2xl border border-lethela-primary/40 bg-lethela-primary/10 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-white/70">Live specials</div>
                <ul className="mt-2 space-y-1 text-sm text-white">
                  {vendor.specials.map((special) => (
                    <li key={special.id}>
                      {special.title} ({special.discountPct}% off)
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-white/30 px-4 py-2 text-xs font-medium transition-colors hover:border-lethela-primary hover:text-lethela-primary"
              >
                Back to home
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <Image
              src={isAlcoholVendor ? "/vendors/vegan.jpg" : "/vendors/grill.jpg"}
              alt={`${vendor.name} cover`}
              fill
              sizes="(max-width: 768px) 100vw, 320px"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
          </div>
        </div>
      </section>

      <section className="container py-8 md:py-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Menu</h2>
          <span className="text-xs text-white/65">{vendor.products.length} products</span>
        </div>

        {vendor.products.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            No products listed yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vendor.products.map((product) => (
              <ProductCard
                key={product.id}
                p={{
                  id: product.id,
                  name: product.name,
                  description: product.description,
                  image: product.image,
                  isAlcohol: product.isAlcohol,
                  priceCents: product.priceCents,
                  vendor: { id: vendor.id, name: vendor.name, slug: vendor.slug },
                }}
              />
            ))}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
