// /src/components/dashboard/DashCard.tsx
import { ReactNode } from "react";

export default function DashCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,24,70,0.96),rgba(8,11,39,0.98))] p-5 shadow-[0_14px_36px_rgba(2,6,23,0.22)] ${className || ""}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lethela-primary/80 to-transparent" />
      <div className="mb-3 flex items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-lethela-primary shadow-[0_0_16px_rgba(181,0,27,0.55)]" />
        <div className="text-sm font-semibold text-white/90">{title}</div>
      </div>
      {children}
    </div>
  );
}
