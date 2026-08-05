import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const privateRoutes = [
  "/api/",
  "/admin",
  "/owner-access",
  "/vendors/dashboard",
  "/vendors/signin",
  "/rider/dashboard",
  "/checkout",
  "/orders/",
  "/account",
  "/profile",
  "/signin",
  "/signup/",
  "/forgot-password",
  "/reset-password",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privateRoutes,
      },
      ...[
        "GPTBot",
        "OAI-SearchBot",
        "ChatGPT-User",
        "ClaudeBot",
        "Claude-SearchBot",
        "Claude-User",
        "PerplexityBot",
      ].map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: privateRoutes,
      })),
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/discovery-sitemap.xml`],
    host: SITE_URL,
  };
}
