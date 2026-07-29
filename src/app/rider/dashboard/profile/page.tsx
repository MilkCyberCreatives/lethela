import { redirect } from "next/navigation";
import { auth } from "@/auth";
import PageShell from "@/components/PageShell";
import RiderProfileForm from "@/components/rider/RiderProfileForm";

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
      "/signin?callbackUrl=/rider/dashboard/profile&message=Sign in with your rider account to continue.",
    );
  }
  return (
    <PageShell contentClassName="max-w-5xl">
      {resolved.welcome === "1" ? (
        <div className="mb-6 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm text-emerald-50">
          <p className="font-semibold">Your rider account is ready.</p>
          <p className="mt-1 text-emerald-50/75">
            Complete the sections below when convenient, then submit your profile for review.
          </p>
        </div>
      ) : null}
      <RiderProfileForm />
    </PageShell>
  );
}
