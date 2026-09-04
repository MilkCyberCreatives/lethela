import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE_NAME} — Siyashesha`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#080B27",
    theme_color: "#080B27",
    lang: "en-ZA",
    categories: ["food", "shopping", "business", "delivery"],
    icons: [
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/favicon.svg?v=20260904",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    shortcuts: [
      { name: "Search", short_name: "Search", url: "/search" },
      { name: "Track Order", short_name: "Track", url: "/track" },
      { name: "Become a Vendor", short_name: "Vendor", url: "/vendors/register" },
    ],
  };
}
