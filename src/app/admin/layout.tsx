import type { ReactNode } from "react";
import { getAdminPortalPath } from "@/lib/admin-portal";
import { buildNoIndexMetadata } from "@/lib/seo";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/auth-security";

export const metadata = buildNoIndexMetadata({
  title: "Admin Dashboard",
  description: "Internal Lethela owner dashboard for vendor and rider approvals.",
  path: getAdminPortalPath(),
});

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    redirect("/signin?callbackUrl=/admin&message=Sign in with your authorised owner account.");
  }
  return children;
}
