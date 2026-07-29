import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, CheckCircle2, Headphones, ShieldCheck } from "lucide-react";
import Footer from "@/components/Footer";
import MainHeader from "@/components/MainHeader";
import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";

export default function AuthShell({
  title,
  supportingText,
  children,
  compact = false,
}: {
  title: string;
  supportingText: string;
  children: ReactNode;
  compact?: boolean;
}) {
  const whatsappHref = `https://wa.me/${getOrderWhatsAppPhone()}`;

  return (
    <div
      className={`flex flex-col bg-[#f5f7fb] text-slate-950 ${compact ? "h-dvh overflow-hidden" : "min-h-dvh"}`}
    >
      <MainHeader />
      <main className={`relative min-h-0 flex-1 overflow-hidden ${compact ? "flex" : ""}`}>
        <div
          aria-hidden="true"
          className="absolute -left-32 top-24 h-72 w-72 rounded-full bg-lethela-primary/[0.07] blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -right-32 bottom-16 h-80 w-80 rounded-full bg-[#080B27]/[0.08] blur-3xl"
        />

        <div
          className={
            compact
              ? "container relative flex min-h-0 flex-1 items-center justify-center py-3 sm:py-5"
              : "container relative grid items-start gap-6 py-8 md:py-12 lg:grid-cols-[minmax(0,0.82fr)_minmax(28rem,1fr)] lg:gap-10 lg:py-16"
          }
        >
          {!compact ? (
            <aside className="overflow-hidden rounded-[2rem] bg-lethela-secondary p-5 text-white shadow-[0_24px_70px_rgba(8,11,39,0.18)] sm:p-7 lg:sticky lg:top-28 lg:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
                <ShieldCheck className="h-4 w-4 text-lethela-primary" />
                Secure Lethela access
              </div>
              <h2 className="mt-4 max-w-lg text-2xl font-bold tracking-tight sm:text-3xl lg:mt-6 lg:text-4xl">
                Your local marketplace, one account away.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/70 sm:text-base">
                Order from nearby businesses, manage your store, or deliver in your community—all
                with one secure Lethela account.
              </p>

              <div className="mt-7 hidden gap-3 lg:grid">
                {[
                  "Clear steps and helpful guidance",
                  "Your details stay protected",
                  "Support is close when you need it",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white/82"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-lethela-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 hidden items-center gap-3 border-t border-white/10 pt-6 text-sm text-white/65 lg:flex">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08]">
                  <Headphones className="h-5 w-5 text-white" />
                </span>
                <span>
                  Need a hand?{" "}
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-white underline decoration-white/35 underline-offset-4 hover:decoration-white"
                  >
                    Chat with support
                  </a>
                </span>
              </div>
            </aside>
          ) : null}

          <section
            aria-labelledby="auth-page-title"
            className={
              compact
                ? "max-h-full w-full max-w-xl overflow-y-auto rounded-[1.5rem] border border-slate-200/80 bg-white p-3 shadow-[0_18px_55px_rgba(15,23,42,0.10)] sm:p-6"
                : "w-full rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-8 lg:p-10"
            }
          >
            <Link
              href="/"
              className={`inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-lethela-primary ${compact ? "[@media(max-height:700px)]:hidden" : ""}`}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to marketplace
            </Link>
            <p
              className={`${compact ? "mt-3 [@media(max-height:700px)]:hidden" : "mt-7"} text-xs font-semibold uppercase tracking-[0.16em] text-lethela-primary`}
            >
              Welcome to Lethela
            </p>
            <h1
              id="auth-page-title"
              className={`${compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"} mt-1.5 font-bold tracking-tight text-slate-950`}
            >
              {title}
            </h1>
            <p
              className={`${compact ? "mt-2 text-sm leading-5 [@media(max-height:700px)]:hidden" : "mt-3 text-sm leading-6 sm:text-base"} max-w-xl text-slate-600`}
            >
              {supportingText}
            </p>
            <div
              className={`${compact ? "mt-4" : "mt-7"} [&_form_input:not([type='checkbox'])]:h-12 [&_form_input:not([type='checkbox'])]:border-slate-300 [&_form_input:not([type='checkbox'])]:bg-slate-50/70 [&_form_input:not([type='checkbox'])]:px-4 [&_form_input:not([type='checkbox'])]:text-slate-950 [&_form_input:not([type='checkbox'])]:placeholder:text-slate-400`}
            >
              {children}
            </div>
            {!compact ? (
              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200 pt-5 text-xs text-slate-500">
                <span className="font-medium text-slate-700">Secure account access</span>
                <Link
                  href="/privacy-policy"
                  className="underline underline-offset-4 hover:text-slate-900"
                >
                  Privacy
                </Link>
                <Link href="/terms" className="underline underline-offset-4 hover:text-slate-900">
                  Terms
                </Link>
              </div>
            ) : null}
          </section>
        </div>
      </main>
      <Footer compact={compact} />
    </div>
  );
}
