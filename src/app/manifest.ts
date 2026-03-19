import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE_NAME,
    short_name: "Lethela",
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#080B27",
    theme_color: "#080B27",
    lang: "en-ZA",
    categories: ["food", "shopping", "business"],
    icons: [
      {
        src: absoluteUrl("/favicon.svg"),
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    shortcuts: [
      {
        name: "Search",
        short_name: "Search",
        url: "/search",
      },
      {
        name: "Track Order",
        short_name: "Track",
        url: "/track",
      },
      {
        name: "Become a Vendor",
        short_name: "Vendor",
        url: "/vendors/register",
      },
    ],
  };
}
