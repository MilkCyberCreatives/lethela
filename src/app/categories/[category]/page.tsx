import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import MainHeader from "@/components/MainHeader";
import Footer from "@/components/Footer";
import AgeGate from "@/components/AgeGate";
import HomeProductCard from "@/components/HomeProductCard";
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

function optionsLabel(category: TownshipCategory, count: number) {
  const noun = category === "Groceries" ? "grocery option" : `${category.toLowerCase()} option`;
  return `Showing ${count} ${noun}${count === 1 ? "" : "s"} on ${SITE_NAME}.`;
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
  if (categoryToSlug(category) === "alcohol") {
    redirect("/categories/liquor");
  }
  const resolvedCategory = slugToCategory(category);
  if (!resolvedCategory) return notFound();
  const isLiquorCategory = resolvedCategory === "Liquor";

  const sqliteItems =
    !isLiquorCategory && canReadSqliteCatalog()
      ? await getSqliteCatalogProducts({ category: resolvedCategory, take: 120, alcohol: "false" })
      : null;

  const dbItems =
    isLiquorCategory || sqliteItems
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
    : isLiquorCategory
      ? []
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
      {isLiquorCategory ? <AgeGate /> : null}
      <MainHeader />

      <section className="container py-10">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold md:text-4xl">{titleForCategory(resolvedCategory)}</h1>
          {isLiquorCategory ? (
            <span className="rounded-full border border-lethela-primary/40 px-2 py-1 text-xs font-semibold text-lethela-primary">
              18+
            </span>
          ) : null}
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">{content.intro}</p>
        {isLiquorCategory ? (
          <p className="mt-3 rounded-lg border border-amber-200/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
            You must be 18 years or older to view liquor products. Liquor is sold by licensed
            vendors only. Lethela provides marketplace and delivery support. Valid ID may be
            required on delivery.
          </p>
        ) : null}

        {items.length === 0 ? (
          <p className="mt-6 rounded-lg border border-white/15 bg-white/5 p-4 text-sm leading-6 text-white/75">
            {isLiquorCategory
              ? "No approved licensed liquor vendors are live in this area yet."
              : "No approved live listings are available in this category yet."}
          </p>
        ) : null}

        <p className="mt-8 text-sm text-white/65">{optionsLabel(resolvedCategory, items.length)}</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((product) => (
            <HomeProductCard
              key={product.id}
              product={{
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
