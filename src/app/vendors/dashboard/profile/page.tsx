import { redirect } from "next/navigation";
import MainHeader from "@/components/MainHeader";
import ProfileManager from "@/components/dashboard/ProfileManager";
import { getVendorSession } from "@/lib/authz";

export default async function VendorProfilePage() {
  await getVendorSession().catch(() =>
    redirect(
      "/signin?callbackUrl=/vendors/dashboard/profile&message=Sign in with your vendor account to continue.",
    ),
  );
  return (
    <main className="min-h-dvh bg-lethela-secondary text-white">
      <MainHeader />
      <section className="container max-w-5xl py-8">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.14em] text-white/55">Vendor dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold">Store profile and approval setup</h1>
        </div>
        <ProfileManager />
      </section>
    </main>
  );
}
