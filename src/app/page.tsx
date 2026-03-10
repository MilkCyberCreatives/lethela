import type { Metadata } from "next";
import { Suspense } from "react";
import MainHeader from "@/components/MainHeader";
import Hero from "@/components/Hero";
import SmartBanner from "@/components/SmartBanner";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import CategoryCarousel from "@/components/CategoryCarousel";
import VendorGrid from "@/components/VendorGrid";
import ProductsGrid from "@/components/ProductsGrid";
import RecommendationsGrid from "@/components/RecommendationsGrid";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import FloatingWidgets from "@/components/FloatingWidgets";
import StructuredData from "@/components/StructuredData";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";
import { getHomeProducts, getHomeRecommendations, getHomeVendors } from "@/lib/home-data";

export const metadata: Metadata = {
  title: "Food, Grocery and Township Delivery",
  description:
    "Order kota, chips, burgers, alcohol and groceries with Lethela. Fast local delivery for township and city communities.",
  alternates: {
    canonical: "/",
  },
};

export const revalidate = 180;

const homeFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What can I order on Lethela?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can order township favourites like kota, chips, burgers, alcohol and groceries from approved local vendors.",
      },
    },
    {
      "@type": "Question",
      name: "Does Lethela support vendor onboarding?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Vendors can apply online and are approved by admin before their stores go live.",
      },
    },
    {
      "@type": "Question",
      name: "Can I track my order in real time?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Lethela supports realtime order status updates and rider location tracking.",
      },
    },
  ],
};

const homeWebPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: `${SITE_NAME} Home`,
  url: absoluteUrl("/"),
  isPartOf: { "@id": `${SITE_URL}/#website` },
  about: ["Food delivery", "Grocery delivery", "Township delivery"],
};

export default async function HomePage() {
  const address = "Klipfontein View, Midrand 1685";
  const [recommendations, products, vendors] = await Promise.all([
    getHomeRecommendations(address),
    getHomeProducts(address, 24),
    getHomeVendors(address, 18),
  ]);

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <StructuredData data={homeFaqSchema} />
      <StructuredData data={homeWebPageSchema} />
      <MainHeader />

      <Hero />

      <ScrollReveal delay={40}>
        <SmartBanner />
      </ScrollReveal>

      <ScrollReveal delay={80}>
        <section className="container py-10">
          <FeaturedCarousel
            title="Hungry? Choose from top restaurants near you"
            items={[
              { name: "Hello Tomato", img: "/vendors/grill.jpg", cta: "/vendors/hello-tomato" },
              { name: "Bento", img: "/vendors/sushi.jpg", cta: "/vendors/bento" },
              { name: "Afrikoa", img: "/vendors/curry.jpg", cta: "/vendors/spice-route" },
              { name: "Cinnabon", img: "/vendors/vegan.jpg", cta: "/vendors/bottle-co" },
              { name: "Romans Pizza", img: "/vendors/burgers.jpg", cta: "/vendors/romans-pizza" },
            ]}
            autoMs={4000}
          />
        </section>
      </ScrollReveal>

      <ScrollReveal delay={120}>
        <section className="container py-10">
          <CategoryCarousel />
        </section>
      </ScrollReveal>

      <ScrollReveal delay={140}>
        <RecommendationsGrid suburb={address} initialCards={recommendations} />
      </ScrollReveal>

      <ScrollReveal delay={160}>
        <Suspense fallback={<section className="container py-10 text-white/70">Loading products...</section>}>
          <ProductsGrid suburb={address} initialItems={products} />
        </Suspense>
      </ScrollReveal>

      <ScrollReveal delay={190}>
        <VendorGrid suburb={address} initialVendors={vendors} />
      </ScrollReveal>

      <Footer />

      <FloatingWidgets />
    </main>
  );
}
