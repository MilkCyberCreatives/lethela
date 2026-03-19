"use client";

import Link from "next/link";
import { Banknote, Facebook, Instagram, Landmark, Linkedin, MessageCircle, Music2, ShieldCheck, Youtube } from "lucide-react";
import { FOOTER_PAYMENT_METHODS, getFooterSocialLinks, LEGAL_SERVICE_AREA, LEGAL_SUPPORT_EMAIL } from "@/lib/legal";
import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";

const POPULAR_SOCIALS = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "x", label: "X" },
  { key: "youtube", label: "YouTube" },
  { key: "linkedin", label: "LinkedIn" },
] as const;

const FOOTER_HIGHLIGHTS = ["Township favourites", "Groceries", "Fast support", "WhatsApp checkout"] as const;

const EXPLORE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/search", label: "Search" },
  { href: "/track", label: "Track Order" },
  { href: "/faq", label: "FAQ" },
  { href: "/rider", label: "Rider" },
] as const;

const BUSINESS_LINKS = [
  { href: "/vendors/register", label: "Become a Vendor" },
  { href: "/vendors/dashboard", label: "Vendor Dashboard" },
  { href: "/signin", label: "Sign in" },
] as const;

const LEGAL_LINKS = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/popia", label: "POPIA Notice" },
  { href: "/paia-manual", label: "PAIA Access Guide" },
  { href: "/refund-policy", label: "Refunds & Cancellations" },
] as const;

const FOOTER_META_LINKS = [
  { href: "/privacy-policy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/popia", label: "POPIA" },
  { href: "/paia-manual", label: "PAIA" },
  { href: "/refund-policy", label: "Refunds" },
] as const;

function PaymentMethodIcon({ label }: { label: string }) {
  if (label === "Ozow") return <ShieldCheck className="h-3.5 w-3.5" aria-hidden />;
  if (label === "Instant EFT") return <Landmark className="h-3.5 w-3.5" aria-hidden />;
  if (label === "WhatsApp Order") return <MessageCircle className="h-3.5 w-3.5" aria-hidden />;
  return <Banknote className="h-3.5 w-3.5" aria-hidden />;
}

export default function Footer() {
  const whatsappLink = `https://wa.me/${getOrderWhatsAppPhone()}`;
  const socialLinks = getFooterSocialLinks();
  const socialByKey = new Map(socialLinks.map((item) => [item.key, item]));
  const visibleSocials = POPULAR_SOCIALS.filter((item) => socialByKey.has(item.key));

  return (
    <footer className="mt-auto border-t border-white/10 bg-lethela-secondary">
      <div className="container py-10 md:py-12">
        <div className="mb-6 flex flex-wrap gap-2 md:mb-8">
          {FOOTER_HIGHLIGHTS.map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white/68 transition-colors hover:bg-white/[0.08]"
            >
              {item}
            </span>
          ))}
        </div>

        <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]">
          <section className="flex h-full flex-col py-2 md:py-3 xl:w-fit xl:justify-self-end">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Local delivery</div>
            <h3 className="mt-3 text-2xl font-bold text-white">Lethela</h3>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/70">
              Siyashesha. A cleaner, faster way to order food, groceries and township favourites from local vendors.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/search"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-transform hover:-translate-y-0.5"
              >
                Browse the menu
              </Link>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/18 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.08]"
              >
                Order on WhatsApp
              </a>
            </div>

            <div className="mt-6 grid gap-4 border-t border-white/10 pt-5 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Service area</div>
                <div className="mt-2 text-sm text-white/80">{LEGAL_SERVICE_AREA}</div>
              </div>
              <div className="md:text-right">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Social</div>
                <div className="mt-3 flex flex-wrap items-center gap-2 md:justify-end">
                  {visibleSocials.map((item) => {
                    const social = socialByKey.get(item.key);
                    if (!social) return null;
                    const className =
                      "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-white/80 transition-colors";

                    return (
                      <a
                        key={item.key}
                        href={social.href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={social.label}
                        className={`${className} hover:border-white/25 hover:text-white`}
                      >
                        <SocialIcon socialKey={item.key} />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="flex h-full flex-col py-2 md:py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Explore</div>
            <h4 className="mt-3 font-semibold text-white">Explore</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/80">
              {EXPLORE_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition-colors hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex h-full flex-col py-2 md:py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Business</div>
            <h4 className="mt-3 font-semibold text-white">Business</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/80">
              {BUSINESS_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition-colors hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Payments</div>
              <h4 className="mt-3 font-semibold text-white">Payments</h4>
              <div className="mt-4 flex flex-wrap gap-2">
                {FOOTER_PAYMENT_METHODS.map((method) => (
                  <span
                    key={method.label}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/68"
                  >
                    <PaymentMethodIcon label={method.label} />
                    {method.label}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="flex h-full flex-col py-2 md:py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Legal & Contact</div>
            <h4 className="mt-3 font-semibold text-white">Legal & Contact</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/80">
              {LEGAL_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition-colors hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Contact</div>
              <h4 className="mt-3 font-semibold text-white">Contact</h4>
              <ul className="mt-4 space-y-2.5 text-sm text-white/80">
                <li>Serving: {LEGAL_SERVICE_AREA}</li>
                {LEGAL_SUPPORT_EMAIL ? <li>Email: {LEGAL_SUPPORT_EMAIL}</li> : null}
                <li>
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-white hover:opacity-90"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                      <path d="M20.52 3.48A11.87 11.87 0 0 0 12.06 0C5.44.03.1 5.36.12 11.98c0 2.11.56 4.17 1.64 5.98L0 24l6.2-1.7a12.04 12.04 0 0 0 5.86 1.5h.01c6.62 0 12.01-5.37 12.03-12A11.87 11.87 0 0 0 20.52 3.48ZM12.07 22.1h-.01a9.94 9.94 0 0 1-5.06-1.38l-.36-.21-3.68 1 1-3.58-.24-.37A9.93 9.93 0 0 1 2.1 11.97C2.09 6.47 6.56 2 12.06 2h.01A9.94 9.94 0 0 1 22.1 12.03c-.02 5.49-4.49 9.96-10.03 9.96Zm5.46-7.46c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15s-.77.97-.95 1.18c-.18.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.51-1.78-1.69-2.08-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.53.08-.8.38-.27.3-1.05 1.03-1.05 2.5 0 1.46 1.08 2.87 1.24 3.07.15.2 2.12 3.24 5.14 4.55.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.18-1.42-.07-.12-.27-.2-.57-.36Z" />
                    </svg>
                    Message Lethela on WhatsApp
                  </a>
                </li>
              </ul>
            </div>
          </section>
        </div>

        <div className="mt-6 border-t border-white/10 pt-5 text-xs text-white/60 md:mt-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-white/58">
              {FOOTER_META_LINKS.map((item) => (
                <Link key={item.href} href={item.href} className="transition-colors hover:text-white">
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="md:text-right">
              <p className="flex flex-wrap items-center justify-start gap-x-1 gap-y-1 text-left md:justify-end">
                <span>&copy; {new Date().getFullYear()} Lethela. All rights reserved. Developed by</span>
                <a
                  href="https://milkcybercreatives.co.za/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/80 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white"
                >
                  Milk Cyber Creatives
                </a>
                <span>.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ socialKey }: { socialKey: string }) {
  if (socialKey === "facebook") return <Facebook className="h-4 w-4" />;
  if (socialKey === "instagram") return <Instagram className="h-4 w-4" />;
  if (socialKey === "tiktok") return <Music2 className="h-4 w-4" />;
  if (socialKey === "youtube") return <Youtube className="h-4 w-4" />;
  if (socialKey === "linkedin") return <Linkedin className="h-4 w-4" />;
  if (socialKey === "x") return <span className="text-xs font-semibold">X</span>;
  return <MessageCircle className="h-4 w-4" />;
}
