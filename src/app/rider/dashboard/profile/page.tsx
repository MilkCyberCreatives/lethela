import { redirect } from "next/navigation";
import { auth } from "@/auth";
import MainHeader from "@/components/MainHeader";
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
    <main className="min-h-dvh bg-lethela-secondary text-white">
      <MainHeader />
      <section className="container max-w-5xl py-8">
        <RiderProfileForm />
      </section>
    </main>
  );
}
