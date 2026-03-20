import type { Metadata } from "next";
import Link from "next/link";
import AdminPortalKeyForm from "@/components/AdminPortalKeyForm";
import MainHeader from "@/components/MainHeader";
import { Button } from "@/components/ui/button";
import { buildNoIndexMetadata } from "@/lib/seo";
import { getAdminPortalPath } from "@/lib/admin-portal";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Owner Access",
  description: "Private Lethela owner access page.",
  path: getAdminPortalPath(),
});

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />
      <section className="container max-w-3xl py-14">
        <div className="rounded-2xl border border-white/15 bg-white/5 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.16em] text-white/60">Owner access</p>
          <h1 className="mt-2 text-3xl font-bold">Private admin entry</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/75">
            This page is for Lethela owner access only. Use your admin sign-in or your approval key to open the admin dashboard.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">Admin session</h2>
              <p className="mt-2 text-sm text-white/75">
                Sign in with your owner admin account first, then continue to the dashboard.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/signin?callbackUrl=/admin">
                  <Button className="bg-lethela-primary text-white hover:opacity-90">Sign in as owner</Button>
                </Link>
                <Link href="/admin">
                  <Button
                    variant="outline"
                    className="border-white/30 bg-transparent text-white hover:border-lethela-primary hover:text-lethela-primary"
                  >
                    Open admin
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">Approval key</h2>
              <p className="mt-2 text-sm text-white/75">
                If you use an admin approval key, enter it here once and it will stay saved on this device.
              </p>
              <AdminPortalKeyForm />
            </div>
          </div>

          <p className="mt-6 text-xs text-white/60">
            Keep this URL private. For a custom hidden route, set <code>ADMIN_PORTAL_PATH</code> in production.
          </p>
        </div>
      </section>
    </main>
  );
}
