import type { Metadata } from "next";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { LEGAL_LAST_UPDATED, LEGAL_WHATSAPP_LINK } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Refunds and Cancellations",
  description:
    "How Lethela handles cancellations, missing items, damaged orders and refund requests.",
  alternates: {
    canonical: "/refund-policy",
  },
};

function PolicyItem({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-white/72">{body}</p>
    </div>
  );
}

export default function RefundPolicyPage() {
  return (
    <LegalPageShell
      title="Refunds and Cancellations"
      intro="This policy explains the practical approach Lethela applies to order issues, cancellations and refund handling."
      note={
        <>
          Last updated: {LEGAL_LAST_UPDATED}. Report order issues as quickly as possible so the team
          can investigate while the order is still recent.
        </>
      }
    >
      <PolicyItem
        title="Before preparation or acceptance"
        body="Where an order has not been accepted, confirmed, prepared or dispatched, we may cancel it and reverse the payment or stop the order before fulfilment. Online-purchase rights under South African electronic commerce rules are considered together with the nature of the goods ordered."
      />
      <PolicyItem
        title="After preparation or dispatch"
        body="Once food is prepared, customised, packed for delivery, or already out for delivery, a full refund may not be available unless there is a service failure, incorrect item, quality issue, unsafe item, non-delivery, or another justified reason."
      />
      <PolicyItem
        title="Missing, incorrect or damaged orders"
        body="If an item is missing, materially incorrect, damaged, expired, unsafe, or not reasonably fit for its intended purpose, please contact support promptly. The outcome may include replacement, store correction, credit, partial refund, or full refund depending on the issue and available evidence."
      />
      <PolicyItem
        title="Alcohol and restricted items"
        body="Liquor/alcohol orders may be cancelled or refused where the customer cannot prove they are 18 or older, appears intoxicated, gives an unsafe delivery instruction, or asks the rider to leave alcohol unattended. Failed verification may affect refund handling where the order was correctly prepared and dispatched."
      />
      <PolicyItem
        title="Delivery fee handling"
        body="Delivery fees may be refunded in full or in part where the delivery service materially failed, the wrong order was delivered, or the order could not be fulfilled."
      />
      <PolicyItem
        title="Refund timing"
        body="Where a refund is approved, timing depends on the payment provider and bank processing cycle. We aim to submit approved reversals as soon as the issue has been verified and the payment reference has been matched."
      />
      <PolicyItem
        title="How to get help"
        body="For order issues, send the order reference, phone number used at checkout, photos where useful, and a short explanation through the available support channels as soon as possible after delivery or failed checkout."
      />
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm leading-7 text-white/72">
        Need help now?{" "}
        <a href={LEGAL_WHATSAPP_LINK} target="_blank" rel="noreferrer" className="underline">
          Message Lethela on WhatsApp
        </a>
        .
      </div>
    </LegalPageShell>
  );
}
