import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MainHeader from "@/components/MainHeader";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import StructuredData from "@/components/StructuredData";
import { getFallbackCategoryProducts } from "@/lib/catalog-fallback";
import { shouldPreferCatalogFallback } from "@/lib/catalog-runtime";
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
    ? await getSqliteCatalogProducts({ category: resolvedCategory, take: 120 })
    : null;

  const dbItems = sqliteItems
    ? []
    : shouldPreferCatalogFallback()
      ? []
      : await runBoundedDbQuery((db) =>
          db.product.findMany({
            where: {
              inStock: true,
              vendor: {
                isActive: true,
                status: "ACTIVE",
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
            inferProductCategory({
              name: item.name,
              description: item.description,
              isAlcohol: item.isAlcohol,
            }) === resolvedCategory,
        )
      : shouldPreferCatalogFallback()
        ? getFallbackCategoryProducts(resolvedCategory)
        : [];
  const items =
    liveItems.length > 0 ? liveItems : getFallbackCategoryProducts(resolvedCategory).slice(0, 9);
  const content = CATEGORY_CONTENT[resolvedCategory];

  const categorySchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${resolvedCategory} on ${SITE_NAME}`,
    url: absoluteUrl(`/categories/${categoryToSlug(resolvedCategory)}`),
    about: resolvedCategory,
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

        {liveItems.length === 0 ? (
          <p className="mt-6 rounded-lg border border-amber-200/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
            Launch sample listings are shown while approved vendors finish loading this category.
            Availability, prices and operating hours are confirmed at checkout.
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
