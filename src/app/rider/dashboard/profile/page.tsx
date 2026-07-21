import { redirect } from "next/navigation";
import { auth } from "@/auth";
import PageShell from "@/components/PageShell";
import RiderProfileForm from "@/components/rider/RiderProfileForm";

export default async function RiderProfilePage() {
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
      <RiderProfileForm />
    </PageShell>
  );
}
