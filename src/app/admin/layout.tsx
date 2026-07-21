import type { ReactNode } from "react";
import { getAdminPortalPath } from "@/lib/admin-portal";
import { buildNoIndexMetadata } from "@/lib/seo";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ADMIN_ACCESS_COOKIE_NAME, readAdminAccessToken } from "@/lib/admin-access";
import { isAdminRole } from "@/lib/auth-security";

export const metadata = buildNoIndexMetadata({
  title: "Admin Dashboard",
  description: "Internal Lethela owner dashboard for vendor and rider approvals.",
  path: getAdminPortalPath(),
});

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [session, cookieStore] = await Promise.all([auth().catch(() => null), cookies()]);
  const factor = readAdminAccessToken(cookieStore.get(ADMIN_ACCESS_COOKIE_NAME)?.value || "");
  const hasSecondFactor = Boolean(session?.user?.id && factor?.sub === session.user.id);
  if (!session?.user?.id || !isAdminRole(session.user.role) || !hasSecondFactor) {
    redirect("/owner-access?message=Sign in and complete owner security verification.");
  }
  return children;
}
