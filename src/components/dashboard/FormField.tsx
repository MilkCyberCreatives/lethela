import type { ReactNode } from "react";

// Visible label above a dashboard form control. Placeholders disappear once a field has a
// value, so each field keeps a label on screen. The control shrinks to fit narrow columns.
export default function FormField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`grid content-start gap-1.5 [&>*]:min-w-0 ${className || ""}`}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
