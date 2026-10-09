"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Home, PackageSearch, Search, ShoppingCart, UserRound } from "lucide-react";
import { useCart } from "@/store/cart";
import { useUIStore } from "@/store/ui";
import { mobileBottomNavHidden } from "@/lib/mobile-nav";

type Props = {
  // The cart drawer is only mounted on shopping pages; elsewhere the cart tab opens checkout.
  cartDrawerAvailable: boolean;
};

export default function MobileBottomNav({ cartDrawerAvailable }: Props) {
  const pathname = usePathname();
  const status = useSession()?.status ?? "unauthenticated";
  const signedIn = status === "authenticated";
  const count = useCart((state) => state.count());
  const openCart = useUIStore((state) => state.openCart);
  const [mounted, setMounted] = useState(false);
  const hidden = mobileBottomNavHidden(pathname);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (hidden) return;
    document.body.dataset.mobileNav = "1";
    return () => {
      delete document.body.dataset.mobileNav;
    };
  }, [hidden]);

  if (hidden) return null;

  const accountHref = signedIn ? "/profile" : "/signin?callbackUrl=/profile";
  const ordersHref = signedIn ? "/profile#order-history" : "/track";
  const isActive = (match: (path: string) => boolean) => match(pathname);

  const tabClass = (active: boolean) =>
    `flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${
      active ? "text-lethela-primary" : "text-slate-600 hover:text-lethela-secondary"
    }`;

  const cartBadge =
    mounted && count > 0 ? (
      <span className="absolute -right-2.5 -top-1.5 min-w-[1.1rem] rounded-full bg-lethela-primary px-1 py-0.5 text-center text-[10px] leading-none text-white">
        {count > 99 ? "99+" : count}
      </span>
    ) : null;

  const cartLabel = mounted && count > 0 ? `Cart, ${count} items` : "Cart";

  return (
    <nav
      aria-label="Main"
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-[75] border-t border-black/10 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch px-1">
        <Link
          href="/"
          className={tabClass(isActive((path) => path === "/"))}
          aria-current={pathname === "/" ? "page" : undefined}
        >
          <Home className="h-5 w-5" aria-hidden="true" />
          Home
        </Link>
        <Link
          href="/search"
          className={tabClass(
            isActive(
              (path) =>
                path.startsWith("/search") ||
                path.startsWith("/categories") ||
                path.startsWith("/restaurants"),
            ),
          )}
          aria-current={pathname.startsWith("/search") ? "page" : undefined}
        >
          <Search className="h-5 w-5" aria-hidden="true" />
          Search
        </Link>
        {cartDrawerAvailable ? (
          <button
            type="button"
            onClick={openCart}
            className={tabClass(false)}
            aria-label={cartLabel}
          >
            <span className="relative">
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              {cartBadge}
            </span>
            Cart
          </button>
        ) : (
          <Link href="/checkout" className={tabClass(false)} aria-label={cartLabel}>
            <span className="relative">
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              {cartBadge}
            </span>
            Cart
          </Link>
        )}
        <Link
          href={ordersHref}
          className={tabClass(
            isActive((path) => path.startsWith("/track") || path.startsWith("/orders")),
          )}
        >
          <PackageSearch className="h-5 w-5" aria-hidden="true" />
          Orders
        </Link>
        <Link
          href={accountHref}
          className={tabClass(
            isActive((path) => path.startsWith("/profile") || path.startsWith("/account")),
          )}
          aria-current={pathname.startsWith("/profile") ? "page" : undefined}
        >
          <UserRound className="h-5 w-5" aria-hidden="true" />
          {signedIn ? "Account" : "Sign in"}
        </Link>
      </div>
    </nav>
  );
}
