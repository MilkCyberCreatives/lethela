import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", "/vendors/dashboard", "/checkout", "/orders/"],
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: ["/api/", "/admin", "/vendors/dashboard", "/checkout", "/orders/", "/rider/dashboard"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: ["/api/", "/admin", "/vendors/dashboard", "/checkout", "/orders/", "/rider/dashboard"],
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: ["/api/", "/admin", "/vendors/dashboard", "/checkout", "/orders/", "/rider/dashboard"],
      },
      {
        userAgent: "Claude-SearchBot",
        allow: "/",
        disallow: ["/api/", "/admin", "/vendors/dashboard", "/checkout", "/orders/", "/rider/dashboard"],
      },
      {
        userAgent: "Claude-User",
        allow: "/",
        disallow: ["/api/", "/admin", "/vendors/dashboard", "/checkout", "/orders/", "/rider/dashboard"],
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/api/", "/admin", "/vendors/dashboard", "/checkout", "/orders/", "/rider/dashboard"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
