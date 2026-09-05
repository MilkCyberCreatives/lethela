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
        <div className="container flex min-h-16 flex-wrap items-center justify-between gap-2 py-2 sm:h-16 sm:flex-nowrap sm:gap-4 sm:py-0">
          <Link
            href={pathname.startsWith("/vendors") ? "/vendors/dashboard" : "/rider/dashboard"}
            className="flex min-w-0 items-center gap-2 sm:gap-3"
          >
            <span className="shrink-0 rounded bg-white px-2">
              <Image
                src="/lethelalogo.svg"
                alt="Lethela"
                width={914}
                height={266}
                preload
                className="h-7 w-auto sm:h-8"
              />
            </span>
            <span className="max-w-[8.5rem] truncate text-xs font-semibold sm:max-w-none sm:text-sm">
              {portal}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-lg border border-white/20 px-3 py-2 text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">View marketplace</span>
              <span className="sm:hidden">Marketplace</span>
            </Link>
            <Button
              variant="outline"
              className="min-h-11 border-white/20 bg-transparent px-3 text-xs text-white sm:text-sm"
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
      <div className="container flex h-16 items-center justify-between text-sm text-black sm:h-20">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Image
            src="/lethelalogo.svg"
            alt="Lethela - Siyashesha"
            width={914}
            height={266}
            preload
            className="h-8 w-auto sm:h-10"
          />
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          <Link href="/categories" className="nav-link-soft">
            Browse
          </Link>
          <Link href="/how-it-works" className="nav-link-soft">
            How it works
          </Link>
          <Link href="/vendors/register" className="nav-link-soft">
            Sell on Lethela
          </Link>
          <Link href="/rider" className="nav-link-soft">
            Deliver
          </Link>
          {!hideCart ? <CartButton /> : null}
          {status === "authenticated" && user ? (
            <div className="flex items-center gap-3">
              {["OWNER", "ADMIN"].includes(user.role) ? (
                <Link href="/admin" className="font-semibold text-lethela-primary">
                  Admin
                </Link>
              ) : null}
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
                className="min-h-11 border-black/20 text-black hover:bg-black/5"
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

        <div className="flex items-center gap-2 md:hidden">
          {!hideCart ? <CartButton /> : null}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                aria-label="Open navigation menu"
                title="Open navigation menu"
                className="h-11 w-11 border-black/20 px-0 text-black hover:bg-black/5"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-[min(88vw,320px)] bg-lethela-secondary pt-12 text-white"
            >
              <nav className="mobile-site-nav flex flex-col gap-2 text-base sm:text-lg">
                <Link href="/" className="hover:underline">
                  Home
                </Link>
                <Link href="/categories" className="hover:underline">
                  Browse everything
                </Link>
                <Link href="/how-it-works" className="hover:underline">
                  How it works
                </Link>
                <Link href="/vendors/register" className="hover:underline">
                  Sell on Lethela
                </Link>
                <Link href="/rider" className="hover:underline">
                  Deliver with us
                </Link>
                {status === "authenticated" && user ? (
                  <>
                    {["OWNER", "ADMIN"].includes(user.role) ? (
                      <Link href="/admin" className="hover:underline">
                        Admin dashboard
                      </Link>
                    ) : null}
                    <Link href="/profile" className="hover:underline">
                      Profile
                    </Link>
                    <Button
                      className="mt-4 min-h-11 w-full bg-lethela-primary hover:opacity-90"
                      onClick={() => void handleSignOut()}
                    >
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <Link href="/signin">
                    <Button className="mt-4 min-h-11 w-full bg-lethela-primary hover:opacity-90">
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
      {!hideCart ? <CartVendorNotice /> : null}
    </header>
  );
}
