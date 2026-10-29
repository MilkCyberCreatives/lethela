import Link from "next/link";
import AdminAiDesk from "@/components/admin/AdminAiDesk";
import { adminAiProvider } from "@/lib/admin-ai";
import { loadDailyBrief, type DailyBrief } from "@/lib/daily-brief";

// Admin only: the admin layout redirects anyone who is not a verified owner or admin, and
// robots.txt keeps /admin out of search engines.
export const dynamic = "force-dynamic";

function Stat({ label, value, note }: { label: string; value: number | string; note?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {note ? <p className="mt-1 text-xs text-slate-500">{note}</p> : null}
    </div>
  );
}

function providerLabel(provider: string) {
  if (provider === "anthropic") return "On (Claude)";
  if (provider === "openai") return "On (OpenAI)";
  return "Off: using plain templates";
}

export default async function AdminAiPage() {
  const brief: DailyBrief | null = await loadDailyBrief().catch((error) => {
    console.error("Could not load the admin brief.", error);
    return null;
  });
  const provider = adminAiProvider();

  return (
    <main className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <section className="container py-10">
        <Link href="/admin" className="text-sm underline">
          Back to admin
        </Link>
        <p className="mt-6 text-xs uppercase tracking-[0.16em] text-lethela-primary">AI desk</p>
        <h1 className="mt-3 text-3xl font-bold">Today, sorted.</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Yesterday in numbers, what is stuck right now and what to do next. Only admins can see
          this page. The writing tools below only draft text for you to check and copy: nothing is
          sent from here. AI: <strong>{providerLabel(provider)}</strong>.
        </p>

        {!brief ? (
          <p className="mt-6 rounded-lg border border-amber-200 bg-white p-4 text-sm">
            The numbers could not be loaded right now. Try again in a minute.
          </p>
        ) : (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label={`Orders ${brief.dayLabel}`}
                value={brief.orders.placed}
                note={`${brief.orders.paid} paid, ${brief.orders.delivered} delivered, ${brief.orders.cancelled} cancelled`}
              />
              <Stat
                label="Open orders now"
                value={brief.orders.openNow}
                note={`${brief.orders.stuckNow} older than 45 min, ${brief.orders.refundsWaiting} refunds waiting`}
              />
              <Stat
                label="Stores open for orders"
                value={`${brief.stores.orderable} of ${brief.stores.registered}`}
                note={`${brief.stores.unfinished} unfinished`}
              />
              <Stat
                label="Riders ready"
                value={`${brief.riders.ready} of ${brief.riders.registered}`}
                note={`${brief.riders.online} online now`}
              />
            </div>

            <section className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="font-semibold">To do today</h2>
              <ol className="mt-3 grid gap-2 text-sm text-slate-700">
                {brief.actions.map((action, index) => (
                  <li key={action} className="flex gap-3">
                    <span className="w-6 shrink-0 font-bold tabular-nums text-lethela-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{action}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-slate-500">
                Sign-ups {brief.dayLabel}: {brief.signups.customers} customers,{" "}
                {brief.signups.stores} stores, {brief.signups.riders} riders.
                {brief.visitors
                  ? ` Website: ${brief.visitors.people} people, ${brief.visitors.reachedCheckout} reached checkout.`
                  : ""}{" "}
                The same brief goes to the admins every morning at about 07:00 once email or
                WhatsApp is set up.
              </p>
            </section>

            <AdminAiDesk accounts={brief.unfinishedAccounts} aiOn={provider !== "none"} />
          </>
        )}
      </section>
    </main>
  );
}
