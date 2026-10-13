import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import RiderDashboardShell from "@/components/rider/RiderDashboardShell";
import RiderProfileForm from "@/components/rider/RiderProfileForm";
import { Notice } from "@/components/dashboard/kit/ui";
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

  return (
    <RiderDashboardShell
      activeView="profile"
      riderName={session.user.name || "Your rider account"}
      riderEmail={session.user.email}
      title="My profile"
      description="Your contact, vehicle and payout details. Only Lethela sees them."
    >
      <div className="space-y-4">
        {resolved.welcome === "1" ? (
          <Notice tone="success" title="Your rider account is ready">
            Add your phone number, area and vehicle, then send your profile to Lethela.
          </Notice>
        ) : null}
        <RiderProfileForm />
      </div>
    </RiderDashboardShell>
  );
}
