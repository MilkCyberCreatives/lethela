import type { ReactNode } from "react";

// Visible label above a dashboard form control. Placeholders disappear once a field has a
// value, so each field keeps a label on screen. The control shrinks to fit narrow columns.
export default function FormField({
  label,
  className,
  children,
  required = false,
  hint,
  error,
}: {
  label: string;
  className?: string;
  children: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string | null;
}) {
  return (
    <label className={`grid content-start gap-1.5 [&>*]:min-w-0 ${className || ""}`}>
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? (
          <span className="ml-1 text-lethela-primary" aria-hidden="true">
            *
          </span>
        ) : null}
      </span>
      {children}
      {error ? (
        <span className="text-xs font-medium text-red-700" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs leading-5 text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}
