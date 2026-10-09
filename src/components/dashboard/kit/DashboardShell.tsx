"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { signOut } from "next-auth/react";
import { ExternalLink, LogOut, MoreHorizontal, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardNavItem = {
  id: string;
  label: string;
  /** Shorter label for the phone tab bar. */
  shortLabel?: string;
  icon: ReactNode;
  /** Link target. Leave empty when the page switches views itself through `onNavigate`. */
  href?: string;
  /** Small count shown next to the label, for example orders waiting. */
  badge?: number | null;
  /** Sidebar group heading. Items without a group are listed first. */
  group?: string;
};

type DashboardShellProps = {
  /** Which workspace this is: "Admin", "Vendor" or "Rider". */
  area: string;
  /** Name shown at the top of the sidebar, for example the store name. */
  workspaceName: string;
  workspaceDetail?: string;
  homeHref: string;
  nav: DashboardNavItem[];
  activeId: string;
  /** Up to four item ids for the phone tab bar. Everything else sits under "More". */
  phoneTabs: string[];
  onNavigate?: (id: string) => void;
  /** Search field shown in the top bar (inline on computers, behind a button on phones). */
  search?: ReactNode;
  /** Extra controls at the right of the top bar, for example the notification bell. */
  actions?: ReactNode;
  /** Replaces the default sign-out (used by the admin lock). */
  onSignOut?: () => void | Promise<void>;
  signOutLabel?: string;
  children: ReactNode;
};

async function defaultSignOut(pathname: string) {
  await fetch("/api/admin/access", { method: "DELETE" }).catch(() => undefined);
  if (pathname.startsWith("/vendors")) {
    await fetch("/api/vendor/logout", { method: "POST" }).catch(() => undefined);
  }
  await signOut({ callbackUrl: "/" });
}

function groupNav(nav: DashboardNavItem[]) {
  const groups: Array<{ title: string | null; items: DashboardNavItem[] }> = [];
  for (const item of nav) {
    const title = item.group ?? null;
    const existing = groups.find((group) => group.title === title);
    if (existing) existing.items.push(item);
    else groups.push({ title, items: [item] });
  }
  return groups;
}

function Badge({ value, inverted = false }: { value: number; inverted?: boolean }) {
  return (
    <span
      className={cn(
        "ml-auto inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-5 tabular-nums",
        inverted ? "bg-white text-lethela-primary" : "bg-lethela-primary text-white",
      )}
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

export default function DashboardShell({
  area,
  workspaceName,
  workspaceDetail,
  homeHref,
  nav,
  activeId,
  phoneTabs,
  onNavigate,
  search,
  actions,
  onSignOut,
  signOutLabel = "Sign out",
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const active = nav.find((item) => item.id === activeId) ?? nav[0];
  const tabs = phoneTabs
    .map((id) => nav.find((item) => item.id === id))
    .filter((item): item is DashboardNavItem => Boolean(item))
    .slice(0, 4);
  const moreActive = !tabs.some((item) => item.id === activeId);
  const groups = groupNav(nav);

  // Close the phone sheet and search whenever the page or view changes.
  useEffect(() => {
    setMoreOpen(false);
    setSearchOpen(false);
  }, [pathname, activeId]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (onSignOut) await onSignOut();
      else await defaultSignOut(pathname);
    } finally {
      setSigningOut(false);
    }
  }

  function renderItem(item: DashboardNavItem, variant: "sidebar" | "sheet") {
    const isActive = item.id === activeId;
    const className = cn(
      "flex w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors",
      variant === "sidebar" ? "h-9" : "min-h-12",
      isActive
        ? "bg-lethela-primary/[0.07] text-lethela-primary"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    );
    const content = (
      <>
        <span
          className={cn(
            "grid h-5 w-5 shrink-0 place-items-center [&_svg]:h-[18px] [&_svg]:w-[18px]",
            isActive ? "text-lethela-primary" : "text-slate-400",
          )}
          aria-hidden="true"
        >
          {item.icon}
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.badge ? <Badge value={item.badge} /> : null}
      </>
    );

    if (item.href) {
      return (
        <Link
          key={item.id}
          href={item.href}
          className={className}
          aria-current={isActive ? "page" : undefined}
          onClick={() => {
            onNavigate?.(item.id);
            setMoreOpen(false);
          }}
        >
          {content}
        </Link>
      );
    }
    return (
      <button
        key={item.id}
        type="button"
        className={className}
        aria-current={isActive ? "page" : undefined}
        onClick={() => {
          onNavigate?.(item.id);
          setMoreOpen(false);
        }}
      >
        {content}
      </button>
    );
  }

  function renderTab(item: DashboardNavItem) {
    const isActive = item.id === activeId;
    const className = cn(
      "relative flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold transition-colors",
      isActive ? "text-lethela-primary" : "text-slate-500 hover:text-slate-900",
    );
    const content = (
      <>
        <span className="relative [&_svg]:h-5 [&_svg]:w-5" aria-hidden="true">
          {item.icon}
          {item.badge ? (
            <span className="absolute -right-2.5 -top-1.5 min-w-[1.1rem] rounded-full bg-lethela-primary px-1 text-center text-[10px] leading-4 text-white">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          ) : null}
        </span>
        <span className="max-w-full truncate">{item.shortLabel ?? item.label}</span>
      </>
    );
    if (item.href) {
      return (
        <Link
          key={item.id}
          href={item.href}
          className={className}
          aria-current={isActive ? "page" : undefined}
          onClick={() => onNavigate?.(item.id)}
        >
          {content}
        </Link>
      );
    }
    return (
      <button
        key={item.id}
        type="button"
        className={className}
        aria-current={isActive ? "page" : undefined}
        onClick={() => onNavigate?.(item.id)}
      >
        {content}
      </button>
    );
  }

  const footerLinks = (variant: "sidebar" | "sheet") => (
    <div className="grid gap-1">
      <Link
        href="/"
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900",
          variant === "sidebar" ? "h-9" : "min-h-12",
        )}
      >
        <ExternalLink className="h-[18px] w-[18px] text-slate-400" aria-hidden="true" />
        View marketplace
      </Link>
      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={signingOut}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60",
          variant === "sidebar" ? "h-9" : "min-h-12",
        )}
      >
        <LogOut className="h-[18px] w-[18px] text-slate-400" aria-hidden="true" />
        {signingOut ? "Signing out…" : signOutLabel}
      </button>
    </div>
  );

  return (
    <div className="lethela-dash min-h-dvh bg-[#F5F6F8] text-slate-900">
      {/* Computer sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-200 px-5">
          <Link href={homeHref} className="flex items-center" aria-label={`Lethela ${area} home`}>
            <Image
              src="/lethelalogo.svg"
              alt="Lethela"
              width={914}
              height={266}
              preload
              className="h-8 w-auto"
            />
          </Link>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {area}
          </span>
        </div>
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="truncate text-sm font-semibold text-slate-900">{workspaceName}</p>
          {workspaceDetail ? (
            <p className="mt-0.5 truncate text-xs text-slate-500">{workspaceDetail}</p>
          ) : null}
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-3" aria-label={`${area} sections`}>
          {groups.map((group) => (
            <div key={group.title ?? "main"}>
              {group.title ? (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.title}
                </p>
              ) : null}
              <div className="grid gap-0.5">
                {group.items.map((item) => renderItem(item, "sidebar"))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">{footerLinks("sidebar")}</div>
      </aside>

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:h-16 lg:px-8">
            <Link href={homeHref} className="flex shrink-0 items-center lg:hidden">
              <Image
                src="/lethelaicon.svg"
                alt="Lethela"
                width={181}
                height={266}
                className="h-8 w-auto"
              />
            </Link>
            <div className="min-w-0 flex-1 lg:hidden">
              <p className="truncate text-[15px] font-semibold leading-tight text-slate-900">
                {active?.label ?? area}
              </p>
              <p className="truncate text-xs leading-tight text-slate-500">{workspaceName}</p>
            </div>
            {search ? (
              <div className="hidden min-w-0 max-w-xl flex-1 lg:block">{search}</div>
            ) : null}
            <div className="ml-auto flex items-center gap-1.5">
              {search ? (
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
                  aria-label={searchOpen ? "Close search" : "Search"}
                  aria-expanded={searchOpen}
                  onClick={() => setSearchOpen((value) => !value)}
                >
                  {searchOpen ? (
                    <X className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Search className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              ) : null}
              {actions}
            </div>
          </div>
          {search && searchOpen ? (
            <div className="border-t border-slate-100 px-4 py-3 sm:px-6 lg:hidden">{search}</div>
          ) : null}
        </header>

        <main className="mx-auto w-full max-w-[1320px] px-4 pb-28 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>

      {/* Phone tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label={`${area} quick sections`}
      >
        <div className="mx-auto flex max-w-lg items-stretch">
          {tabs.map((item) => renderTab(item))}
          <button
            type="button"
            className={cn(
              "flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold transition-colors",
              moreActive || moreOpen ? "text-lethela-primary" : "text-slate-500",
            )}
            aria-expanded={moreOpen}
            aria-controls="dashboard-more-sheet"
            onClick={() => setMoreOpen(true)}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            More
          </button>
        </div>
      </nav>

      {moreOpen ? (
        // Above the cookie banner (z-120) so every item stays tappable.
        <div
          className="fixed inset-0 z-[130] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="All sections"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close"
            onClick={() => setMoreOpen(false)}
          />
          <div
            id="dashboard-more-sheet"
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3"
          >
            <div className="flex items-center justify-between px-3 pb-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{workspaceName}</p>
                {workspaceDetail ? (
                  <p className="truncate text-xs text-slate-500">{workspaceDetail}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close"
                onClick={() => setMoreOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="space-y-4 py-2" aria-label={`All ${area.toLowerCase()} sections`}>
              {groups.map((group) => (
                <div key={`sheet-${group.title ?? "main"}`}>
                  {group.title ? (
                    <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {group.title}
                    </p>
                  ) : null}
                  <div className="grid gap-0.5">
                    {group.items.map((item) => renderItem(item, "sheet"))}
                  </div>
                </div>
              ))}
            </nav>
            <div className="mt-2 border-t border-slate-200 pt-2">{footerLinks("sheet")}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
