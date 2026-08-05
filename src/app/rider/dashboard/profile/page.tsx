import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import RiderDashboardShell from "@/components/rider/RiderDashboardShell";
import RiderProfileForm from "@/components/rider/RiderProfileForm";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Rider Profile & Documents",
  description: "Manage your private Lethela rider profile, documents, vehicle and banking details.",
  path: "/rider/dashboard/profile",
});

export default async function RiderProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }> | { welcome?: string };
}) {
  const resolved = await Promise.resolve(searchParams);
  const session = await auth().catch(() => null);
  if (
    !session?.user?.id ||
    (session.user.role !== "RIDER" && !["OWNER", "ADMIN"].includes(session.user.role))
  ) {
    redirect(
      "/signin?tab=rider&callbackUrl=/rider/dashboard/profile&message=Sign in with your rider account to continue.",
    );
  }

  const userLabel = session.user.email || session.user.name || "Secure rider session";

  return (
    <RiderDashboardShell
      activeView="profile"
      userLabel={userLabel}
      eyebrow="Rider onboarding"
      title="Profile & documents"
      description="Keep your personal, vehicle, compliance and banking information complete and current."
    >
      <div className="space-y-5">
        {resolved.welcome === "1" ? (
          <div className="rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm text-emerald-50">
            <p className="font-semibold">Your rider account is ready.</p>
            <p className="mt-1 text-emerald-50/75">
              Complete the sections below, then submit your profile for operations review.
            </p>
          </div>
        ) : null}
        <RiderProfileForm />
      </div>
    </RiderDashboardShell>
  );
}
