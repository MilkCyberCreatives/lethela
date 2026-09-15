import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ADMIN_ACCESS_COOKIE_NAME, readAdminAccessToken } from "@/lib/admin-access";
import { getAdminPortalPath } from "@/lib/admin-portal";
import { isAdminRole } from "@/lib/auth-security";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata({
  title: "Admin Dashboard",
  description: "Internal Lethela owner dashboard for vendor and rider approvals.",
  path: getAdminPortalPath(),
});

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    redirect(
      "/signin?callbackUrl=/owner-access&message=Sign in with your authorised owner account.",
    );
  }

  const allowDevBypass =
    process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_ADMIN_BYPASS === "true";

  if (!allowDevBypass) {
    const cookieStore = await cookies();
    const tokenValue = cookieStore.get(ADMIN_ACCESS_COOKIE_NAME)?.value;
    const token = tokenValue ? readAdminAccessToken(tokenValue) : null;
    if (token?.sub !== session.user.id) {
      redirect("/owner-access");
    }
  }

  return children;
}
