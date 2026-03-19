import type { ReactNode } from "react";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata({
  title: "Admin Dashboard",
  description: "Internal Lethela owner dashboard for vendor and rider approvals.",
  path: "/admin",
});

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
