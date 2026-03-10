import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import MainHeader from "@/components/MainHeader";

export default function LegalPageShell({
  title,
  intro,
  children,
  note,
}: {
  title: string;
  intro: string;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />

      <section className="border-b border-white/10 bg-black/20">
        <div className="container max-w-4xl py-10 md:py-14">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/72 md:text-base">{intro}</p>
          {note ? <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">{note}</div> : null}
        </div>
      </section>

      <section className="container max-w-4xl py-10">
        <div className="space-y-5">{children}</div>
      </section>

      <Footer />
    </main>
  );
}
