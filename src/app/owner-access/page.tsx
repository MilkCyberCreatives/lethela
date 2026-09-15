import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AdminPortalKeyForm from "@/components/AdminPortalKeyForm";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { ADMIN_ACCESS_COOKIE_NAME, readAdminAccessToken } from "@/lib/admin-access";
import { getAdminPortalPath } from "@/lib/admin-portal";
import { isAdminRole } from "@/lib/auth-security";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Owner Access",
  description: "Private Lethela owner access page.",
  path: getAdminPortalPath(),
});

export default async function OwnerAccessPage() {
  const session = await auth().catch(() => null);
  const isSignedInAdmin = Boolean(session?.user?.id && isAdminRole(session.user.role));
  const allowDevBypass =
    process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_ADMIN_BYPASS === "true";

  if (isSignedInAdmin && session?.user?.id) {
    if (allowDevBypass) redirect("/admin");

    const cookieStore = await cookies();
    const tokenValue = cookieStore.get(ADMIN_ACCESS_COOKIE_NAME)?.value;
    const token = tokenValue ? readAdminAccessToken(tokenValue) : null;
    if (token?.sub === session.user.id) redirect("/admin");
  }

  return (
    <PageShell contentClassName="max-w-xl">
      <div className="rounded-2xl border border-white/15 bg-white/5 p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.16em] text-white/60">Owner access</p>
        <h1 className="mt-2 text-3xl font-bold">Manage Lethela</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/75">
          Sign in with an authorised Lethela owner account, then complete the private owner
          verification before opening the command centre.
        </p>

        {!isSignedInAdmin ? (
          <div className="mt-6 rounded-xl border border-white/10 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
              Secure owner sign in
            </h2>
            <p className="mt-2 text-sm text-white/75">
              Use your authorised Google or email account first. Owner verification is kept separate
              from your normal account password.
            </p>
            <div className="mt-4">
              <Link href="/signin?callbackUrl=/owner-access">
                <Button className="h-11 w-full bg-lethela-primary text-white hover:opacity-90">
                  Continue to owner sign in
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <p className="text-sm text-white/75">
              Your owner account is signed in. Complete the private verification below to unlock
              admin operations on this browser.
            </p>
            <AdminPortalKeyForm />
          </div>
        )}

        {session?.user?.id && !isSignedInAdmin ? (
          <details className="mt-4 rounded-xl border border-white/10 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-white/80">
              First owner setup
            </summary>
            <p className="mt-3 text-sm text-white/65">
              This signed-in account is not yet an owner. Use the one-time approval key only for
              initial setup or recovery.
            </p>
            <AdminPortalKeyForm />
          </details>
        ) : null}
      </div>
    </PageShell>
  );
}
