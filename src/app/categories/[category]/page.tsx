import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MainHeader from "@/components/MainHeader";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import StructuredData from "@/components/StructuredData";
import { runBoundedDbQuery } from "@/lib/query-timeout";
import { canReadSqliteCatalog, getSqliteCatalogProducts } from "@/lib/sqlite-catalog";
import {
  CATEGORY_CONTENT,
  categoryToSlug,
  inferProductCategory,
  slugToCategory,
  type TownshipCategory,
} from "@/lib/categories";
import { SITE_NAME, absoluteUrl } from "@/lib/site";
import { buildPageMetadata } from "@/lib/seo";
import { isPublicCatalogProduct, isPublicMarketplaceVendor } from "@/lib/public-catalog";

type PageProps = {
  params: Promise<{ category: string }>;
};

export const revalidate = 300;

function titleForCategory(category: TownshipCategory) {
  return CATEGORY_CONTENT[category].headline;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const resolvedCategory = slugToCategory(category);
  if (!resolvedCategory) {
    return {
      title: "Category not found",
      robots: { index: false, follow: false },
    };
  }

  return buildPageMetadata({
    title: titleForCategory(resolvedCategory),
    description: CATEGORY_CONTENT[resolvedCategory].intro,
    path: `/categories/${categoryToSlug(resolvedCategory)}`,
  });
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  const resolvedCategory = slugToCategory(category);
  if (!resolvedCategory) return notFound();

  const sqliteItems = canReadSqliteCatalog()
    ? await getSqliteCatalogProducts({ category: resolvedCategory, take: 120, alcohol: "false" })
    : null;

  const dbItems = sqliteItems
    ? []
    : await runBoundedDbQuery((db) =>
        db.product.findMany({
          where: {
            inStock: true,
            isAlcohol: false,
            vendor: {
              isActive: true,
              status: { in: ["ACTIVE", "APPROVED"] },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 120,
          select: {
            id: true,
            name: true,
            description: true,
            priceCents: true,
            image: true,
            isAlcohol: true,
            vendor: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                isActive: true,
                phone: true,
                address: true,
                suburb: true,
                city: true,
                province: true,
                municipality: true,
                township: true,
                sectionArea: true,
                storeType: true,
                cuisine: true,
                etaMins: true,
                deliveryFee: true,
                kycIdUrl: true,
                kycProofUrl: true,
                bankName: true,
                bankAccountName: true,
                bankAccountNumber: true,
                bankBranchCode: true,
                _count: { select: { products: true, items: true, hours: true } },
              },
            },
          },
        }),
      ).catch(() => []);

  const liveItems = sqliteItems
    ? sqliteItems
    : dbItems.length > 0
      ? dbItems.filter(
          (item) =>
            isPublicCatalogProduct(item) &&
            isPublicMarketplaceVendor(item.vendor) &&
            inferProductCategory({
              name: item.name,
              description: item.description,
              isAlcohol: item.isAlcohol,
            }) === resolvedCategory,
        )
      : [];
  const items = liveItems;
  const content = CATEGORY_CONTENT[resolvedCategory];

  const categorySchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `${resolvedCategory} on ${SITE_NAME}`,
        url: absoluteUrl(`/categories/${categoryToSlug(resolvedCategory)}`),
        about: resolvedCategory,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: absoluteUrl("/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: resolvedCategory,
            item: absoluteUrl(`/categories/${categoryToSlug(resolvedCategory)}`),
          },
        ],
      },
      {
        "@type": "ItemList",
        name: `${resolvedCategory} products`,
        itemListElement: items.slice(0, 12).map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Product",
            name: item.name,
            image: item.image || undefined,
            description: item.description || content.intro,
            offers: {
              "@type": "Offer",
              priceCurrency: "ZAR",
              price: (item.priceCents / 100).toFixed(2),
              availability: "https://schema.org/InStock",
              url: absoluteUrl(`/vendors/${item.vendor?.slug || ""}`),
            },
            brand: {
              "@type": "Brand",
              name: item.vendor?.name || SITE_NAME,
            },
          },
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <StructuredData data={categorySchema} />
      <MainHeader />

      <section className="container py-10">
        <h1 className="text-3xl font-bold md:text-4xl">{titleForCategory(resolvedCategory)}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/75 md:text-base">
          {content.intro}
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/62">{content.guidance}</p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            "Approved local vendors",
            "Live menu and stock status",
            "Clear delivery fees before checkout",
          ].map((item) => (
            <div key={item} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <p className="text-sm font-semibold text-white">{item}</p>
            </div>
          ))}
        </div>

        {items.length === 0 ? (
          <p className="mt-6 rounded-lg border border-white/15 bg-white/5 p-4 text-sm leading-6 text-white/75">
            No approved live listings are available in this category yet. Lethela only shows vendors
            with complete profiles, products, trading hours and approval.
          </p>
        ) : null}

        <p className="mt-8 text-sm text-white/65">
          Showing {items.length} {resolvedCategory.toLowerCase()} option
          {items.length === 1 ? "" : "s"} on {SITE_NAME}.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((product) => (
            <ProductCard
              key={product.id}
              p={{
                id: product.id,
                name: product.name,
                description: product.description,
                image: product.image,
                isAlcohol: product.isAlcohol,
                priceCents: product.priceCents,
                vendor: product.vendor,
                category: resolvedCategory,
              }}
            />
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
