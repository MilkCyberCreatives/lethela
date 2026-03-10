import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import MainHeader from "@/components/MainHeader";
import MenuSectionList from "@/components/MenuSectionList";
import TopBar from "@/components/TopBar";
import { formatZAR } from "@/lib/format";
import { getVendorBySlug } from "@/server/queries";

type Props = { params: Promise<{ slug: string }> };

export default async function RestaurantPage({ params }: Props) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) return notFound();

  const cuisine = Array.isArray(vendor.cuisine) ? vendor.cuisine : [];

  return (
    <main className="flex min-h-dvh flex-col">
      <TopBar />
      <MainHeader />

      <section className="border-b border-white/10 bg-black/20">
        <div className="container grid gap-6 py-8 md:grid-cols-[1fr,320px]">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{vendor.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/70">
              <span>{vendor.rating.toFixed(1)}*</span>
              <span>-</span>
              <span>{cuisine.join(" - ")}</span>
              <span>-</span>
              <span>
                {vendor.suburb}, {vendor.city}
              </span>
              <span>-</span>
              <span>{vendor.halaal ? "Halaal" : "Non-halaal"}</span>
              <span>-</span>
              <span>Delivery {formatZAR(1000)} per item</span>
              <span>-</span>
              <span>
                ETA {vendor.etaMins}-{vendor.etaMins + 10} min
              </span>
            </div>
          </div>
          <div className="relative h-40 overflow-hidden rounded-lg bg-white/10">
            {vendor.image ? <Image src={vendor.image} alt={vendor.name} fill sizes="320px" className="object-cover" /> : null}
          </div>
        </div>
      </section>

      <section className="container py-8">
        {vendor.sections.length === 0 ? (
          <p className="text-white/70">Menu coming soon.</p>
        ) : (
          <MenuSectionList
            vendorId={vendor.id}
            vendorSlug={vendor.slug}
            deliveryFeeCents={vendor.deliveryFee}
            sections={vendor.sections}
          />
        )}

        <div className="mt-10 text-sm text-white/60">
          <Link href="/">{"<-"} Back to home</Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
