import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";

export default function AuthShell({
  title,
  supportingText,
  children,
}: {
  title: string;
  supportingText: string;
  children: ReactNode;
}) {
  const whatsappHref = `https://wa.me/${getOrderWhatsAppPhone()}`;

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-50 px-4 py-8 text-slate-950">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link href="/" aria-label="Lethela marketplace" className="inline-flex">
          <Image src="/lethelalogo.svg" alt="Lethela" width={154} height={38} priority />
        </Link>
        <h1 className="mt-7 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{supportingText}</p>
        <div className="mt-6">{children}</div>
        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-200 pt-4 text-xs text-slate-600">
          <a href={whatsappHref} target="_blank" rel="noreferrer" className="underline">
            WhatsApp support
          </a>
          <Link href="/privacy-policy" className="underline">
            Privacy
          </Link>
          <Link href="/terms" className="underline">
            Terms
          </Link>
        </div>
      </section>
    </main>
  );
}
