import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AgeGate from "@/components/AgeGate";
import Footer from "@/components/Footer";
import MainHeader from "@/components/MainHeader";
import ProductCard from "@/components/ProductCard";
import StructuredData from "@/components/StructuredData";
import { getFallbackProducts } from "@/lib/catalog-fallback";
import { shouldUseCatalogFallbackBeforeQuery } from "@/lib/catalog-runtime";
import { formatZAR } from "@/lib/format";
import { isPublicCatalogProduct, isPublicMarketplaceVendor } from "@/lib/public-catalog";
import { runBoundedDbQuery } from "@/lib/query-timeout";
import { buildPageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

type PageProps = { params: Promise<{ id: string }> };

const getProduct = cache(async (id: string) => {
  const fallback = getFallbackProducts().find((item) => item.id === id) ?? null;
  if (fallback && shouldUseCatalogFallbackBeforeQuery()) return fallback;

  const product = await runBoundedDbQuery((db) =>
    db.product.findFirst({
      where: {
        id,
        inStock: true,
        status: "APPROVED",
        vendor: {
          isActive: true,
          status: { in: ["ACTIVE", "APPROVED"] },
          temporaryClosed: false,
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        priceCents: true,
        image: true,
        isAlcohol: true,
        status: true,
        vendor: {
          select: {
            id: true,
            name: true,
            slug: true,
            deliveryFee: true,
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
            kycIdUrl: true,
            kycProofUrl: true,
            bankName: true,
            bankAccountName: true,
            bankAccountNumber: true,
            bankBranchCode: true,
            liquorLicenceUrl: true,
            liquorLicenceExpiry: true,
            liquorVerificationStatus: true,
            _count: { select: { products: true, items: true, hours: true } },
          },
        },
      },
    }),
  ).catch(() => null);

  if (!product || !isPublicCatalogProduct(product)) return fallback;
  if (
    !isPublicMarketplaceVendor({
      ...product.vendor,
      _count: { ...product.vendor._count, products: 1 },
    })
  )
    return null;
  if (
    product.isAlcohol &&
    (product.vendor.liquorVerificationStatus !== "APPROVED" ||
      !product.vendor.liquorLicenceUrl ||
      !product.vendor.liquorLicenceExpiry ||
      product.vendor.liquorLicenceExpiry.getTime() <= Date.now())
  )
    return null;
  return product;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: "Product not found", robots: { index: false, follow: false } };
  return buildPageMetadata({
    title: product.name,
    description:
      product.description || `Order ${product.name} from ${product.vendor.name} on Lethela.`,
    path: `/products/${encodeURIComponent(product.id)}`,
    image: product.image || undefined,
  });
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const productUrl = absoluteUrl(`/products/${encodeURIComponent(product.id)}`);
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: product.image ? absoluteUrl(product.image) : undefined,
    brand: { "@type": "Brand", name: product.vendor.name },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "ZAR",
      price: (product.priceCents / 100).toFixed(2),
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <StructuredData data={schema} />
      {product.isAlcohol ? <AgeGate /> : null}
      <MainHeader />
      <section className="container grid gap-8 py-10 md:grid-cols-[minmax(0,1fr),minmax(320px,0.8fr)] md:py-14">
        <div className="relative min-h-72 overflow-hidden rounded-2xl border border-white/10 bg-white/5 md:min-h-[480px]">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              priority
              sizes="(min-width:768px) 55vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full min-h-72 place-items-center text-sm text-white/45">
              Product image coming soon
            </div>
          )}
        </div>
        <div className="self-center">
          <p className="text-xs uppercase tracking-[0.16em] text-lethela-primary">
            {product.isAlcohol ? "Liquor · 18+" : "Local marketplace"}
          </p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">{product.name}</h1>
          <p className="mt-3 text-2xl font-semibold">{formatZAR(product.priceCents)}</p>
          <p className="mt-4 leading-7 text-white/70">
            {product.description || "Available now from this approved local vendor."}
          </p>
          <Link
            href={`/vendors/${product.vendor.slug}`}
            className="mt-5 inline-flex text-sm font-semibold text-lethela-primary hover:underline"
          >
            Sold by {product.vendor.name}
          </Link>
          {product.isAlcohol ? (
            <p className="mt-4 rounded-lg border border-amber-200/20 bg-amber-300/10 p-4 text-sm text-amber-50">
              For adults 18 and older. Valid ID may be required at delivery.
            </p>
          ) : null}
          <div className="mt-6 max-w-md">
            <ProductCard p={product} />
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
