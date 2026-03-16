import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import MainHeader from "@/components/MainHeader";
import { cn } from "@/lib/utils";

type PageShellProps = {
  children: ReactNode;
  contentClassName?: string;
  footer?: boolean;
};

export default function PageShell({ children, contentClassName, footer = true }: PageShellProps) {
  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />
      <section className={cn("container py-10 md:py-14", contentClassName)}>{children}</section>
      {footer ? <Footer /> : null}
    </main>
  );
}
