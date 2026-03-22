/* eslint-disable @next/next/next-script-for-ga */
import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import { Suspense } from "react";
import MarketingScripts from "@/components/MarketingScripts";
import Providers from "@/components/Providers";
import StructuredData from "@/components/StructuredData";
import VisitorTelemetry from "@/components/VisitorTelemetry";
import { getFooterSocialLinks, LEGAL_SUPPORT_EMAIL } from "@/lib/legal";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
const bingVerification = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim();
const facebookDomainVerification = process.env.NEXT_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION?.trim();
const gtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim() || "";

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
    "alcohol delivery",
    "grocery delivery",
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
  alternates: {
    canonical: "/",
  },
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
    icon: "/favicon.svg",
    apple: "/favicon.svg",
    shortcut: "/favicon.svg",
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
        url: absoluteUrl("/hero.jpg"),
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} delivery platform`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Siyashesha`,
    description: SITE_DESCRIPTION,
    images: [absoluteUrl("/hero.jpg")],
  },
  category: "Food delivery",
};

export const viewport: Viewport = {
  themeColor: "#080B27",
};

const globalSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: absoluteUrl("/lethelalogo.svg"),
      email: LEGAL_SUPPORT_EMAIL || undefined,
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
      "@type": "FoodDeliveryService",
      "@id": `${SITE_URL}/#service`,
      name: SITE_NAME,
      url: SITE_URL,
      areaServed: "South Africa",
      serviceType: "Food and grocery delivery",
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA">
      <head>
        {gtmId ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`,
            }}
          />
        ) : null}
      </head>
      <body className={`${spaceGrotesk.className} min-h-dvh bg-lethela-secondary text-white`}>
        <StructuredData data={globalSchema} />
        <MarketingScripts />
        <Providers>
          <Suspense fallback={null}>
            <VisitorTelemetry />
          </Suspense>
          {children}
        </Providers>
      </body>
    </html>
  );
}
