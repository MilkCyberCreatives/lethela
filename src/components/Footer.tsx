import Link from "next/link";
import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";

export default function Footer() {
  const whatsappLink = `https://wa.me/${getOrderWhatsAppPhone()}`;

  return (
    <footer className="mt-auto border-t border-white/10 bg-lethela-secondary">
      <div className="container py-12">
        <div className="mb-8 flex flex-wrap gap-2">
          {["Township favourites", "Groceries", "Fast support", "WhatsApp checkout"].map((item) => (
            <span key={item} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white/68 transition-colors hover:bg-white/[0.08]">
              {item}
            </span>
          ))}
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.2fr,0.8fr,0.8fr,1fr]">
          <div className="surface-panel-muted p-5">
            <h3 className="text-xl font-bold text-white">Lethela</h3>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Siyashesha. A cleaner, faster way to order food, groceries and township favourites from local vendors.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
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
          </div>

          <div>
            <h4 className="font-semibold text-white">Explore</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>
                <Link href="/" className="transition-colors hover:text-white">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="transition-colors hover:text-white">
                  About
                </Link>
              </li>
              <li>
                <Link href="/search" className="transition-colors hover:text-white">
                  Search
                </Link>
              </li>
              <li>
                <Link href="/track" className="transition-colors hover:text-white">
                  Track Order
                </Link>
              </li>
              <li>
                <Link href="/faq" className="transition-colors hover:text-white">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/rider" className="transition-colors hover:text-white">
                  Rider
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white">Business</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>
                <Link href="/vendors/register" className="transition-colors hover:text-white">
                  Become a Vendor
                </Link>
              </li>
              <li>
                <Link href="/vendors/dashboard" className="transition-colors hover:text-white">
                  Vendor Dashboard
                </Link>
              </li>
              <li>
                <Link href="/signin" className="transition-colors hover:text-white">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>Serving: Klipfontein View, Midrand 1685</li>
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
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-white/60">
          <div className="overflow-x-auto">
            <p className="flex min-w-max items-center justify-center gap-1 whitespace-nowrap text-center sm:justify-start sm:text-left">
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
    </footer>
  );
}
