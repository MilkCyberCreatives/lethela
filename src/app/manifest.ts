import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Lethela",
    description: SITE_DESCRIPTION,
    start_url: "/",
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
  };
}
