import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import UserProfileForm from "@/components/profile/UserProfileForm";
import OrderHistoryPanel from "@/components/profile/OrderHistoryPanel";
import ProfileExperiencePanel from "@/components/profile/ProfileExperiencePanel";
import { auth } from "@/auth";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Profile",
  description: "Manage your Lethela account profile.",
  path: "/profile",
});

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }> | { welcome?: string };
}) {
  const resolved = await Promise.resolve(searchParams);
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/profile");
  }

  return (
    <PageShell>
      {resolved.welcome === "1" ? (
        <div className="mb-6 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm text-emerald-50">
          <p className="font-semibold">Your account is ready.</p>
          <p className="mt-1 text-emerald-50/75">
            Add your name and mobile number now, or return whenever you are ready.
          </p>
        </div>
      ) : null}
      <div className="mb-6 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.14em] text-white/60">Account</p>
        <h1 className="mt-2 text-3xl font-semibold">User profile</h1>
        <p className="mt-3 text-sm text-white/75">
          Update your name and upload your personal profile picture.
        </p>
      </div>

      <div className="grid gap-6">
        <UserProfileForm />
        <OrderHistoryPanel />
        <ProfileExperiencePanel />
      </div>
    </PageShell>
  );
}
