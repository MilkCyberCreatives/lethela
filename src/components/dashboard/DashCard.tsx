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
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 ${className || ""}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-lethela-primary" />
          <div>
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
