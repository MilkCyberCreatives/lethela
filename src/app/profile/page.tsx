import { redirect } from "next/navigation";
import MainHeader from "@/components/MainHeader";
import UserProfileForm from "@/components/profile/UserProfileForm";
import { auth } from "@/auth";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/profile");
  }

  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />
      <section className="container py-10">
        <div className="mb-6 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.14em] text-white/60">Account</p>
          <h1 className="mt-2 text-3xl font-semibold">User profile</h1>
          <p className="mt-3 text-sm text-white/75">
            Update your name and upload your personal profile picture.
          </p>
        </div>

        <UserProfileForm />
      </section>
    </main>
  );
}
