// /src/components/dashboard/DashCard.tsx
import { ReactNode } from "react";

export default function DashCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-[#11183d] p-5 ${className || ""}`}>
      <div className="mb-3 flex items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-lethela-primary" />
        <div className="text-sm font-semibold text-white/90">{title}</div>
      </div>
      {children}
    </div>
  );
}
