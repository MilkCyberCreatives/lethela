import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MainHeader from "@/components/MainHeader";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import StructuredData from "@/components/StructuredData";
import { prisma } from "@/lib/db";
import { getFallbackCategoryProducts } from "@/lib/catalog-fallback";
import { shouldPreferCatalogFallback } from "@/lib/catalog-runtime";
import { withQueryTimeout } from "@/lib/query-timeout";
import {
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
  return `${category} delivery near you`;
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
    description: `Order ${resolvedCategory.toLowerCase()} from local vendors on ${SITE_NAME}.`,
    path: `/categories/${categoryToSlug(resolvedCategory)}`,
  });
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  const resolvedCategory = slugToCategory(category);
  if (!resolvedCategory) return notFound();

  const dbItems = shouldPreferCatalogFallback()
    ? []
    : await withQueryTimeout(
        prisma.product.findMany({
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
        []
      );

  const items =
    dbItems.length > 0
      ? dbItems.filter(
          (item) =>
            inferProductCategory({
              name: item.name,
              description: item.description,
              isAlcohol: item.isAlcohol,
            }) === resolvedCategory
        )
      : getFallbackCategoryProducts(resolvedCategory);

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
        <p className="mt-2 text-sm text-white/75">
          Browse local {resolvedCategory.toLowerCase()} listings, specials and fast delivery options.
        </p>

        {items.length === 0 ? (
          <p className="mt-6 text-white/70">No {resolvedCategory.toLowerCase()} items found yet.</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        )}
      </section>

      <Footer />
    </main>
  );
}
