import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import ConsentAnalytics from "@/components/ConsentAnalytics";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import MarketingScripts from "@/components/MarketingScripts";
import Providers from "@/components/Providers";
import RouteThemeMarker from "@/components/RouteThemeMarker";
import StructuredData from "@/components/StructuredData";
import VisitorTelemetry from "@/components/VisitorTelemetry";
import { getFooterSocialLinks, LEGAL_SUPPORT_EMAIL } from "@/lib/legal";
import { buildSocialCardUrl } from "@/lib/social-card";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";
import "./globals.css";
import "./dashboard.css";

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
const bingVerification = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim();
const facebookDomainVerification = process.env.NEXT_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION?.trim();
const defaultSocialImage = buildSocialCardUrl(`${SITE_NAME} | Siyashesha`, SITE_DESCRIPTION);

const otherVerification: Record<string, string> = {};
if (bingVerification) otherVerification["msvalidate.01"] = bingVerification;
if (facebookDomainVerification) {
  otherVerification["facebook-domain-verification"] = facebookDomainVerification;
}

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} | Siyashesha`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  manifest: "/manifest.webmanifest",
  formatDetection: { email: false, address: false, telephone: false },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
  keywords: [
    "food delivery South Africa",
    "takeaway delivery South Africa",
    "South Africa food ordering",
    "township food delivery",
    "township grocery delivery",
    "township takeaways",
    "kota delivery",
    "mogodu delivery",
    "chips delivery",
    "burger delivery",
    "pizza delivery",
    "wings delivery",
    "braai delivery",
    "fast food delivery",
    "grocery delivery",
    "township delivery South Africa",
    "spaza shop delivery",
    "delivery platform for spaza shops",
    "restaurant delivery Midrand",
    "Midrand delivery",
    "Midrand food delivery",
    "Klipfontein View food delivery",
    "Klipfontein View delivery",
    "delivery near me",
    "groceries near me delivery",
    "burgers near me delivery",
    "South African meals delivery",
    "AI food ordering",
  ],
  applicationName: SITE_NAME,
  metadataBase: new URL(SITE_URL),
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: googleVerification || undefined,
    other: Object.keys(otherVerification).length > 0 ? otherVerification : undefined,
  },
  icons: {
    icon: [
      { url: "/icon", type: "image/png", sizes: "64x64" },
      { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
    shortcut: "/icon",
  },
  referrer: "origin-when-cross-origin",
  openGraph: {
    type: "website",
    locale: "en_ZA",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Siyashesha`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: defaultSocialImage,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} township delivery platform`,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Siyashesha`,
    description: SITE_DESCRIPTION,
    images: [defaultSocialImage],
  },
  category: "Food delivery",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080B27",
};

const globalSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      legalName: process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME?.trim() || SITE_NAME,
      url: SITE_URL,
      logo: absoluteUrl("/lethelalogo.svg"),
      email: LEGAL_SUPPORT_EMAIL || undefined,
      areaServed: { "@type": "Country", name: "South Africa" },
      knowsLanguage: ["en-ZA", "zu-ZA", "xh-ZA"],
      sameAs: getFooterSocialLinks().map((item) => item.href),
      contactPoint: [
        {
          "@type": "ContactPoint",
          telephone: "+27-72-390-8919",
          contactType: "customer support",
          areaServed: "ZA",
          availableLanguage: ["en", "zu", "xh"],
        },
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "en-ZA",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/#service`,
      name: SITE_NAME,
      url: SITE_URL,
      provider: { "@id": `${SITE_URL}/#organization` },
      areaServed: [
        { "@type": "Country", name: "South Africa" },
        { "@type": "Place", name: "Klipfontein View, Midrand" },
      ],
      serviceType: "Food and grocery delivery",
      availableChannel: {
        "@type": "ServiceChannel",
        serviceUrl: SITE_URL,
        availableLanguage: ["English", "isiZulu", "isiXhosa"],
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Lethela marketplace categories",
        itemListElement: [
          "Groceries",
          "Kota",
          "Chicken",
          "Burgers",
          "Braai",
          "Breakfast",
          "Drinks",
          "Snacks",
        ].map((name) => ({ "@type": "OfferCatalog", name })),
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA">
      <head>
        <link
          rel="search"
          type="application/opensearchdescription+xml"
          title={SITE_NAME}
          href="/opensearch.xml"
        />
      </head>
      <body className="min-h-dvh bg-lethela-secondary text-white">
        <RouteThemeMarker />
        <StructuredData data={globalSchema} />
        <MarketingScripts />
        <Providers>
          <Suspense fallback={null}>
            <VisitorTelemetry />
          </Suspense>
          <CookieConsentBanner />
          {children}
        </Providers>
        <ConsentAnalytics />
      </body>
    </html>
  );
}
