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
    <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-slate-700">
      <summary className="cursor-pointer text-xs font-semibold text-slate-700">
        {details.summary}
      </summary>
      <ol className="mt-2 grid gap-1 pl-4 text-xs leading-5 text-slate-600">
        {details.steps.map((step, index) => (
          <li key={step} className="list-decimal">
            {step}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs font-medium text-slate-700">{details.note}</p>
    </details>
  );
}
