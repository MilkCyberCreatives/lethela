import type { Metadata } from "next";
import Link from "next/link";
import AdminPortalKeyForm from "@/components/AdminPortalKeyForm";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { getAdminPortalPath } from "@/lib/admin-portal";
import { buildNoIndexMetadata } from "@/lib/seo";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/auth-security";
import { redirect } from "next/navigation";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Owner Access",
  description: "Private Lethela owner access page.",
  path: getAdminPortalPath(),
});

export default async function OwnerAccessPage() {
  const session = await auth().catch(() => null);
  if (session?.user?.id && isAdminRole(session.user.role)) redirect("/admin");

  return (
    <PageShell contentClassName="max-w-xl">
      <div className="rounded-2xl border border-white/15 bg-white/5 p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.16em] text-white/60">Owner access</p>
        <h1 className="mt-2 text-3xl font-bold">Manage Lethela</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/75">
          Sign in with the Google account listed in <code>ADMIN_BOOTSTRAP_EMAILS</code>. The same
          account opens vendor approvals, riders, orders and support—no separate dashboard password.
        </p>

        <div className="mt-6 rounded-xl border border-white/10 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
            One-step sign in
          </h2>
          <p className="mt-2 text-sm text-white/75">
            Use Google for the simplest recovery-safe owner access, or your existing email account.
          </p>
          <div className="mt-4">
            <Link href="/signin?callbackUrl=/admin">
              <Button className="h-11 w-full bg-lethela-primary text-white hover:opacity-90">
                Continue to owner sign in
              </Button>
            </Link>
          </div>
        </div>

        {session?.user?.id ? (
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
