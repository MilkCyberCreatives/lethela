"use client";

import Link from "next/link";
import { Facebook, Instagram, Linkedin, MessageCircle, Music2, Youtube } from "lucide-react";
import { getFooterSocialLinks, LEGAL_SERVICE_AREA, LEGAL_SUPPORT_EMAIL } from "@/lib/legal";
import { trackWhatsAppClick } from "@/lib/visitor";
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

const EXPLORE_LINKS = [
  { href: "/search", label: "Search" },
  { href: "/track", label: "Track Order" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
] as const;

const BUSINESS_LINKS = [
  { href: "/vendors/register", label: "Become a Vendor" },
  { href: "/rider", label: "Become a Rider" },
  { href: "/vendors/dashboard", label: "Vendor Dashboard" },
  { href: "/rider/dashboard", label: "Rider Dashboard" },
] as const;

const LEGAL_LINKS = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/popia", label: "POPIA Notice" },
  { href: "/refund-policy", label: "Refunds & Cancellations" },
] as const;

export default function Footer() {
  const whatsappLink = `https://wa.me/${getOrderWhatsAppPhone()}`;
  const socialLinks = getFooterSocialLinks();
  const socialByKey = new Map(socialLinks.map((item) => [item.key, item]));
  const visibleSocials = POPULAR_SOCIALS.filter((item) => socialByKey.has(item.key));

  return (
    <footer className="mt-auto border-t border-white/10 bg-lethela-secondary">
      <div className="container py-8 md:py-10">
        <div className="grid gap-7 lg:grid-cols-[1.25fr_repeat(3,minmax(0,0.7fr))]">
          <section>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
              Local delivery
            </div>
            <h3 className="mt-3 text-2xl font-bold text-white">Lethela</h3>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/68">
              A clean South African marketplace for food, groceries, vendor operations and rider
              dispatch.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/search"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-white/90"
              >
                Browse
              </Link>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackWhatsAppClick("footer_primary")}
                className="rounded-lg border border-white/18 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.08]"
              >
                WhatsApp
              </a>
            </div>
            <div className="mt-5 text-sm text-white/60">{LEGAL_SERVICE_AREA}</div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {visibleSocials.map((item) => {
                const social = socialByKey.get(item.key);
                if (!social) return null;
                return (
                  <a
                    key={item.key}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.label}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] text-white/78 transition-colors hover:border-white/25 hover:text-white"
                  >
                    <SocialIcon socialKey={item.key} />
                  </a>
                );
              })}
            </div>
          </section>

          <section>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Explore</div>
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

          <section>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Business</div>
            <ul className="mt-4 space-y-2.5 text-sm text-white/80">
              {BUSINESS_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition-colors hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Legal</div>
            <ul className="mt-4 space-y-2.5 text-sm text-white/80">
              {LEGAL_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition-colors hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            {LEGAL_SUPPORT_EMAIL ? (
              <p className="mt-4 text-sm text-white/60">{LEGAL_SUPPORT_EMAIL}</p>
            ) : null}
          </section>
        </div>

        <div className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-white/55 md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} Lethela. All rights reserved.</p>
          <p>
            Developed by{" "}
            <a
              href="https://milkcybercreatives.co.za/"
              target="_blank"
              rel="noreferrer"
              className="text-white/75 underline decoration-white/30 underline-offset-4 hover:text-white"
            >
              Milk Cyber Creatives
            </a>
            .
          </p>
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
