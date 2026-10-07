import { ChevronDown } from "lucide-react";

type OnboardingPreviewProps = {
  accountType: "vendor" | "rider";
};

const content = {
  vendor: {
    summary: "What happens after vendor signup?",
    steps: [
      "Complete your store, location and operating hours.",
      "Add banking and the required business or licence documents.",
      "Add products, prices, images and stock status.",
      "Submit the completed profile for Lethela approval.",
    ],
    note: "Stores stay private until the approval checklist is complete.",
  },
  rider: {
    summary: "What happens after rider signup?",
    steps: [
      "Complete your personal, vehicle and availability details.",
      "Add the required identity, licence and banking documents.",
      "Submit the completed profile for Lethela verification.",
      "Delivery access opens only after approval.",
    ],
    note: "Rider registration is free. Approved riders keep the full delivery fee and tip.",
  },
} as const;

export default function OnboardingPreview({ accountType }: OnboardingPreviewProps) {
  const details = content[accountType];

  return (
    <details className="group rounded-xl border border-slate-200 text-slate-700 open:bg-slate-50/70">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
        {details.summary}
        <ChevronDown
          className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <ol className="grid gap-3 px-4 pb-4 pt-1">
        {details.steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm leading-5 text-slate-600">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-lethela-primary ring-1 ring-slate-200">
              {index + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
      <p className="border-t border-slate-200 px-4 py-3 text-xs font-medium text-slate-700">
        {details.note}
      </p>
    </details>
  );
}
