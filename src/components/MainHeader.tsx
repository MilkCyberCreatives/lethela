"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import CartButton from "@/components/CartButton";
import CartDrawer from "@/components/CartDrawer";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { usePathname } from "next/navigation";
import MobileCartBar from "@/components/MobileCartBar";
import CartVendorNotice from "@/components/CartVendorNotice";

export default function MainHeader() {
  const pathname = usePathname();
  const sessionState = useSession();
  const session = sessionState?.data;
  const status = sessionState?.status ?? "unauthenticated";
  const user = session?.user;
  const userImage =
    user && "image" in user && typeof user.image === "string" && user.image.trim().length > 0
      ? user.image
      : null;
  const initials = (user?.name || user?.email || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSignOut() {
    await fetch("/api/admin/access", { method: "DELETE" }).catch(() => undefined);
    if (pathname.startsWith("/vendors")) {
      await fetch("/api/vendor/logout", { method: "POST" }).catch(() => undefined);
    }
    await signOut({ callbackUrl: "/" });
  }

  const portal = pathname.startsWith("/vendors/dashboard")
    ? "Vendor dashboard"
    : pathname.startsWith("/rider/dashboard")
      ? "Rider dashboard"
      : null;
  const hideCart =
    Boolean(portal) ||
    [
      "/about",
      "/faq",
      "/privacy-policy",
      "/terms",
      "/popia",
      "/refund-policy",
      "/cookie-policy",
      "/paia-manual",
      "/owner-access",
      "/signin",
      "/signup",
      "/forgot-password",
      "/reset-password",
      "/vendors/signin",
      "/vendors/register",
      "/rider",
    ].some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (portal) {
    return (
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05071D]/95 text-white backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link
            href={pathname.startsWith("/vendors") ? "/vendors/dashboard" : "/rider/dashboard"}
            className="flex items-center gap-3"
          >
            <Image
              src="/lethelalogo.svg"
              alt="Lethela"
              width={130}
              height={32}
              className="h-8 w-auto rounded bg-white px-2"
            />
            <span className="text-sm font-semibold">{portal}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="rounded-lg border border-white/20 px-3 py-2 text-sm">
              View marketplace
            </Link>
            <Button
              variant="outline"
              className="border-white/20 bg-transparent text-white"
              onClick={() => void handleSignOut()}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 surface-header">
      <div className="container flex h-20 items-center justify-between text-sm text-black">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/lethelalogo.svg"
            alt="Lethela - Siyashesha"
            width={170}
            height={40}
            className="h-10 w-auto"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="hover:underline hover:text-lethela-primary font-medium">
            Home
          </Link>
          <Link
            href="/vendors/register"
            className="hover:underline hover:text-lethela-primary font-medium"
          >
            Become a Vendor
          </Link>
          <Link href="/rider" className="hover:underline hover:text-lethela-primary font-medium">
            Rider
          </Link>
          <Link
            href="/categories/groceries"
            className="hover:underline hover:text-lethela-primary font-medium"
          >
            Groceries
          </Link>
          <Link
            href="/categories/liquor"
            className="hover:underline hover:text-lethela-primary font-medium"
          >
            Liquor <span className="text-[10px]">18+</span>
          </Link>
          <Link
            href="/restaurants"
            className="hover:underline hover:text-lethela-primary font-medium"
          >
            Restaurants
          </Link>
          <Link href="/about" className="hover:underline hover:text-lethela-primary font-medium">
            About
          </Link>
          {!hideCart ? <CartButton /> : null}
          {status === "authenticated" && user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-full border border-black/10 px-3 py-2 hover:border-lethela-primary"
              >
                <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-lethela-primary/10 text-xs font-semibold text-lethela-primary">
                  {userImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={userImage}
                      alt={user.name || user.email || "Profile"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </span>
                <span className="font-medium">{user.name || "Profile"}</span>
              </Link>
              <Button
                variant="outline"
                className="border-black/20 text-black hover:bg-black/5"
                onClick={() => void handleSignOut()}
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <Link href="/signin">
              <Button className="bg-lethela-primary text-white hover:opacity-90">Sign In</Button>
            </Link>
          )}
        </nav>

        <div className="md:hidden flex items-center gap-3">
          {!hideCart ? <CartButton /> : null}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                aria-label="Open navigation menu"
                title="Open navigation menu"
                className="border-black/20 text-black hover:bg-black/5"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="bg-lethela-secondary text-white w-[260px] pt-12">
              <nav className="flex flex-col gap-4 text-lg">
                <Link href="/" className="hover:underline">
                  Home
                </Link>
                <Link href="/vendors/register" className="hover:underline">
                  Become a Vendor
                </Link>
                <Link href="/rider" className="hover:underline">
                  Rider
                </Link>
                <Link href="/categories/groceries" className="hover:underline">
                  Groceries
                </Link>
                <Link href="/categories/liquor" className="hover:underline">
                  Liquor 18+
                </Link>
                <Link href="/restaurants" className="hover:underline">
                  Restaurants
                </Link>
                <Link href="/about" className="hover:underline">
                  About
                </Link>
                {status === "authenticated" && user ? (
                  <>
                    <Link href="/profile" className="hover:underline">
                      Profile
                    </Link>
                    <Button
                      className="mt-4 w-full bg-lethela-primary hover:opacity-90"
                      onClick={() => void handleSignOut()}
                    >
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <Link href="/signin">
                    <Button className="mt-4 w-full bg-lethela-primary hover:opacity-90">
                      Sign In
                    </Button>
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {!hideCart ? <CartDrawer /> : null}
      {!hideCart ? <MobileCartBar /> : null}
      {!hideCart ? <CartVendorNotice /> : null}
    </header>
  );
}
