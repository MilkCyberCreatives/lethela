import type { ReactNode } from "react";
import { getAdminPortalPath } from "@/lib/admin-portal";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata({
  title: "Admin Dashboard",
  description: "Internal Lethela owner dashboard for vendor and rider approvals.",
  path: getAdminPortalPath(),
});

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
