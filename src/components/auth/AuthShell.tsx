import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Bike, Check, MessageCircle, ShoppingBag, Store } from "lucide-react";
import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";

export type AuthAudience = "account" | "customer" | "vendor" | "rider";

const BRAND_PANEL: Record<AuthAudience, { eyebrow: string; headline: string; points: string[] }> = {
  account: {
    eyebrow: "Lethela – Siyashesha",
    headline: "Your township marketplace, one account away.",
    points: [
      "Order from local businesses near you",
      "Run your store or your deliveries from the same sign-in",
      "Help is a WhatsApp message away",
    ],
  },
  customer: {
    eyebrow: "For customers",
    headline: "Order from the businesses around you.",
    points: [
      "Meals, groceries and more from local vendors",
      "Lethela riders bring it to your door",
      "Add delivery details only when you check out",
    ],
  },
  vendor: {
    eyebrow: "For vendors",
    headline: "Sell to your neighbourhood. Lethela handles delivery.",
    points: [
      "Start with just your email and a password",
      "Add your store details and products in your dashboard",
      "Your store goes live once Lethela approves it",
    ],
  },
  rider: {
    eyebrow: "For riders",
    headline: "Deliver in your community and earn.",
    points: [
      "Free to register",
      "Keep the full delivery fee and every tip",
      "Start delivering once your profile is approved",
    ],
  },
};

const ROLE_TABS = [
  { audience: "customer", href: "/signup", label: "Customer", Icon: ShoppingBag },
  { audience: "vendor", href: "/vendors/register", label: "Vendor", Icon: Store },
  { audience: "rider", href: "/rider", label: "Rider", Icon: Bike },
] as const;

export default function AuthShell({
  title,
  supportingText,
  children,
  audience = "account",
  showRoleTabs = false,
  after,
}: {
  title: string;
  supportingText: string;
  children: ReactNode;
  audience?: AuthAudience;
  /** Show the Customer / Vendor / Rider switch above the title (sign-up pages). */
  showRoleTabs?: boolean;
  /** Optional content rendered under the form, such as "what happens next". */
  after?: ReactNode;
}) {
  const whatsappHref = `https://wa.me/${getOrderWhatsAppPhone()}`;
  const panel = BRAND_PANEL[audience];

  return (
    <div className="min-h-dvh bg-white text-slate-950 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-lethela-secondary lg:block">
        <Image
          src="/hero.jpg"
          alt=""
          fill
          sizes="(min-width: 1024px) 48vw, 1px"
          quality={72}
          className="object-cover object-[62%_center]"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-lethela-secondary/45" />
        <div className="relative flex h-full min-h-dvh flex-col justify-end p-10 xl:p-14">
          <div className="max-w-md rounded-2xl bg-lethela-secondary/95 p-7 text-white xl:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
              {panel.eyebrow}
            </p>
            <h2 className="mt-3 text-[1.75rem] font-bold leading-tight tracking-tight xl:text-[2rem]">
              {panel.headline}
            </h2>
            <ul className="mt-6 grid gap-3">
              {panel.points.map((point) => (
                <li key={point} className="flex items-start gap-3 text-[15px] text-white/85">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lethela-primary">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} aria-hidden="true" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-white/10 pt-5 text-sm text-white/55">
              Launching from Klipfontein View, Midrand.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between gap-4 px-5 pb-2 pt-5 sm:px-10 sm:pt-7">
          <Link href="/" aria-label="Lethela home" className="shrink-0">
            <Image
              src="/lethelalogo.svg"
              alt="Lethela - Siyashesha"
              width={914}
              height={266}
              preload
              className="h-9 w-auto sm:h-10"
            />
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-slate-600 transition-colors hover:text-lethela-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Back to marketplace</span>
            <span className="sm:hidden">Marketplace</span>
          </Link>
        </header>

        <main className="flex flex-1 justify-center px-5 py-6 sm:px-10 sm:py-10 lg:items-center">
          <section aria-labelledby="auth-page-title" className="w-full max-w-[26rem]">
            {showRoleTabs ? (
              <nav aria-label="Account type" className="mb-7">
                <ul className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                  {ROLE_TABS.map(({ audience: tabAudience, href, label, Icon }) => {
                    const active = tabAudience === audience;
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          aria-current={active ? "page" : undefined}
                          className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold transition-colors ${
                            active
                              ? "bg-white text-slate-950 ring-1 ring-slate-200"
                              : "text-slate-600 hover:text-slate-950"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 ${active ? "text-lethela-primary" : ""}`}
                            aria-hidden="true"
                          />
                          {label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            ) : null}

            <h1
              id="auth-page-title"
              className="text-[1.75rem] font-bold leading-tight tracking-tight text-slate-950 sm:text-[2rem]"
            >
              {title}
            </h1>
            <p className="mt-2 text-[15px] leading-6 text-slate-600">{supportingText}</p>

            <div className="mt-7">{children}</div>
            {after ? <div className="mt-6">{after}</div> : null}
          </section>
        </main>

        <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-slate-100 px-5 py-5 text-xs text-slate-500 sm:justify-between sm:px-10">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 font-medium text-slate-600 hover:text-lethela-primary"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Need help? Chat on WhatsApp
          </a>
          <span className="flex items-center gap-4">
            <Link
              href="/privacy-policy"
              className="inline-flex min-h-11 items-center hover:text-slate-900"
            >
              Privacy
            </Link>
            <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-slate-900">
              Terms
            </Link>
            <span>© {new Date().getFullYear()} Lethela</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
