import Link from "next/link";
import type { ReactNode } from "react";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Shared building blocks for the admin, vendor and rider dashboards.
 * Flat design: white surfaces on a light grey canvas, 1px borders, no shadows or gradients.
 * Lethela red marks actions and anything that needs attention; navy is the text colour.
 */

export const dashButton = {
  primary:
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-lethela-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#9a0017] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 [&_svg]:h-4 [&_svg]:w-4",
  secondary:
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:h-4 [&_svg]:w-4",
  quiet:
    "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:h-4 [&_svg]:w-4",
  danger:
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:h-4 [&_svg]:w-4",
  link: "inline-flex items-center gap-1 text-sm font-semibold text-lethela-primary hover:underline [&_svg]:h-4 [&_svg]:w-4",
};

/** Form field styles that match the dashboard look. */
export const dashField = {
  label: "text-sm font-medium text-slate-700",
  input:
    "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-lethela-primary focus:ring-2 focus:ring-lethela-primary/15 disabled:bg-slate-50 disabled:text-slate-500",
  hint: "text-xs text-slate-500",
};

export function PageHeader({
  title,
  description,
  meta,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {meta ? <div className="mb-2 flex flex-wrap items-center gap-2">{meta}</div> : null}
        <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 sm:text-[26px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const badgeTones: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-800",
  danger: "bg-red-50 text-red-700",
  info: "bg-sky-50 text-sky-800",
  brand: "bg-lethela-primary/[0.08] text-lethela-primary",
};

export function StatusBadge({
  tone = "neutral",
  dot = true,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        badgeTones[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

/** Maps the many order, vendor and rider status words onto one colour scale. */
export function toneForStatus(status: string | null | undefined): Tone {
  const value = String(status || "").toUpperCase();
  if (
    [
      "APPROVED",
      "ACTIVE",
      "DELIVERED",
      "COMPLETED",
      "PAID",
      "SUCCESS",
      "ONLINE",
      "RESOLVED",
    ].includes(value)
  )
    return "success";
  if (
    [
      "SUBMITTED",
      "PENDING",
      "UNDER_REVIEW",
      "CHANGES_REQUESTED",
      "PREPARING",
      "READY",
      "READY_FOR_PICKUP",
      "PROCESSING",
      "AWAITING_PAYMENT",
      "PENDING_PAYMENT",
    ].includes(value)
  )
    return "warning";
  if (
    [
      "REJECTED",
      "SUSPENDED",
      "CANCELLED",
      "CANCELED",
      "FAILED",
      "REFUNDED",
      "OFFLINE",
      "DECLINED",
    ].includes(value)
  )
    return "danger";
  if (["PICKED_UP", "ON_THE_WAY", "OUT_FOR_DELIVERY", "ASSIGNED", "ACCEPTED"].includes(value))
    return "info";
  return "neutral";
}

export function statusText(status: string | null | undefined) {
  const value = String(status || "")
    .replaceAll("_", " ")
    .toLowerCase();
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Unknown";
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  href,
  onClick,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  tone?: "default" | "attention";
}) {
  const attention = tone === "attention";
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium leading-5 text-slate-600">{label}</span>
        {icon ? (
          <span
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-lg [&_svg]:h-4 [&_svg]:w-4",
              attention ? "bg-lethela-primary text-white" : "bg-slate-100 text-slate-500",
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "mt-2 text-2xl font-semibold tracking-tight tabular-nums",
          attention ? "text-lethela-primary" : "text-slate-900",
        )}
      >
        {value}
      </div>
      {hint ? <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p> : null}
    </>
  );
  const className = cn(
    "flex min-w-0 flex-col rounded-xl border bg-white p-4 text-left sm:p-5",
    attention ? "border-lethela-primary/30" : "border-slate-200",
    href || onClick ? "transition-colors hover:border-slate-400" : "",
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}

export function Panel({
  title,
  description,
  action,
  children,
  padded = true,
  className,
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  padded?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn("min-w-0 rounded-xl border border-slate-200 bg-white", className)}
    >
      {title || action ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title ? <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2> : null}
            {description ? (
              <p className="mt-0.5 text-sm leading-5 text-slate-500">{description}</p>
            ) : null}
          </div>
          {action ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>
          ) : null}
        </header>
      ) : null}
      <div className={padded ? "p-4 sm:p-5" : undefined}>{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  text,
  icon,
  action,
  compact = false,
}: {
  title: string;
  text?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        compact
          ? "px-4 py-5"
          : "rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10",
      )}
    >
      {icon ? (
        <span
          className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 [&_svg]:h-5 [&_svg]:w-5"
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      <p className={cn("text-sm font-semibold text-slate-900", icon ? "mt-3" : "")}>{title}</p>
      {text ? <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{text}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

const noticeTones: Record<Exclude<Tone, "brand" | "neutral"> | "neutral", string> = {
  neutral: "border-slate-200 bg-white text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-800",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

export function Notice({
  tone = "neutral",
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof noticeTones;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
      className={cn(
        "flex flex-col gap-3 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between",
        noticeTones[tone],
        className,
      )}
    >
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? (
          <div className={title ? "mt-0.5 leading-6" : "leading-6"}>{children}</div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
    >
      <div className="h-full rounded-full bg-lethela-primary" style={{ width: `${clamped}%` }} />
    </div>
  );
}

/** One line of a setup checklist: done items get a tick, open ones link to where to fix them. */
export function ChecklistItem({
  done,
  label,
  detail,
  href,
  optional = false,
}: {
  done: boolean;
  label: string;
  detail?: ReactNode;
  href?: string;
  optional?: boolean;
}) {
  const body = (
    <>
      <span
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center rounded-full border",
          done
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-slate-300 bg-white text-transparent",
        )}
        aria-hidden="true"
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm font-medium",
            done ? "text-slate-500 line-through decoration-slate-300" : "text-slate-900",
          )}
        >
          {label}
          {optional ? (
            <span className="ml-2 text-xs font-normal text-slate-400 no-underline">Optional</span>
          ) : null}
        </span>
        {detail && !done ? (
          <span className="mt-0.5 block text-xs text-slate-500">{detail}</span>
        ) : null}
      </span>
      {href && !done ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      ) : null}
      <span className="sr-only">{done ? "Done" : "Not done yet"}</span>
    </>
  );
  const className = "flex items-center gap-3 rounded-lg px-2 py-2.5";
  if (href && !done) {
    return (
      <Link href={href} className={cn(className, "transition-colors hover:bg-slate-50")}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}

/** A label and value row for read-only details. */
export function DetailRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

/** Segmented filter buttons (All, Waiting, Approved…). */
export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ value: T; label: string; count?: number | null }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label={label}>
      <div className="inline-flex min-w-full gap-1 rounded-lg bg-slate-100 p-1 sm:min-w-0">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors",
                selected
                  ? "bg-white text-slate-900 ring-1 ring-slate-200"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              {option.label}
              {option.count != null ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                    selected ? "bg-slate-100 text-slate-700" : "bg-slate-200/70 text-slate-600",
                  )}
                >
                  {option.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
