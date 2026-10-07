"use client";

import { forwardRef, useState, type ComponentProps, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Shared building blocks for the sign-in, sign-up and password recovery forms so every
// account page uses the same field, button and message styles.

export const authInputClass =
  "h-12 rounded-xl border-slate-300 bg-white px-4 text-base text-slate-950 placeholder:text-slate-400 hover:border-slate-400 focus-visible:border-lethela-primary focus-visible:ring-2 focus-visible:ring-lethela-primary/15 focus-visible:ring-offset-0 md:text-[15px]";

export const authPrimaryButtonClass =
  "h-12 w-full rounded-xl border-lethela-primary bg-lethela-primary text-[15px] font-semibold text-white hover:bg-[#9a0017] focus-visible:ring-lethela-primary/40 focus-visible:ring-offset-white";

export const authSecondaryButtonClass =
  "h-12 w-full rounded-xl border-slate-300 bg-white text-[15px] font-semibold text-slate-900 hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-lethela-primary/30 focus-visible:ring-offset-white";

export const authLinkClass =
  "font-semibold text-lethela-primary underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lethela-primary/30";

export function AuthField({
  label,
  htmlFor,
  aside,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  aside?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-800">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {hint}
    </div>
  );
}

type PasswordInputProps = Omit<ComponentProps<"input">, "type">;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn(authInputClass, "pr-12", className)}
          {...props}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-xl text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lethela-primary/30"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
          ) : (
            <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  },
);

const alertStyles = {
  error: { box: "border-red-200 bg-red-50 text-red-800", Icon: AlertCircle },
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-900", Icon: CheckCircle2 },
  info: { box: "border-amber-200 bg-amber-50 text-amber-900", Icon: Info },
} as const;

export function AuthAlert({
  tone,
  children,
  className,
}: {
  tone: keyof typeof alertStyles;
  children: ReactNode;
  className?: string;
}) {
  const { box, Icon } = alertStyles[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-5", box, className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-xs font-medium text-slate-400">
      <span className="h-px flex-1 bg-slate-200" />
      {label}
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

export function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.72-.06-1.25-.2-1.8H12v3.48h5.52a4.75 4.75 0 0 1-2.05 3.03l-.02.12 2.98 2.31.2.02c1.83-1.7 2.97-4.18 2.97-7.16Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.69 0 4.94-.88 6.59-2.61l-3.12-2.45c-.84.57-1.97.97-3.47.97a6.03 6.03 0 0 1-5.7-4.17l-.11.01-3.1 2.4-.04.1A9.95 9.95 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.3 13.74A6.2 6.2 0 0 1 5.97 12c0-.61.11-1.2.32-1.74v-.12L3.15 7.7l-.1.05A10 10 0 0 0 2 12c0 1.53.35 2.98 1.05 4.25l3.25-2.51Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.09c1.87 0 3.13.81 3.85 1.48l2.8-2.74A9.42 9.42 0 0 0 12 2a9.95 9.95 0 0 0-8.95 5.75l3.24 2.51A6.05 6.05 0 0 1 12 6.09Z"
      />
    </svg>
  );
}
