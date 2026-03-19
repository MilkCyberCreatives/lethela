// /src/components/dashboard/DashCard.tsx
import { ReactNode } from "react";

export default function DashCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-[#11183d] p-5 ${className || ""}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-lethela-primary" />
          <div>
            <div className="text-sm font-semibold text-white/90">{title}</div>
            {description ? <p className="mt-1 text-xs text-white/60">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
