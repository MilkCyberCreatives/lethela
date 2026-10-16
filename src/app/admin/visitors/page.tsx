import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { ADMIN_ACCESS_COOKIE_NAME, readAdminAccessToken } from "@/lib/admin-access";
import {
  formatSaDay,
  isValidDayKey,
  saDayKey,
  saDayWindow,
  shiftSaDay,
  type Count,
} from "@/lib/visitor-report";
import { getVisitorReportChannelStatus, loadVisitorDay } from "@/lib/visitor-report-data";

export const dynamic = "force-dynamic";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-3 text-sm text-slate-700">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function CountList({ items, empty }: { items: Count[]; empty: string }) {
  if (!items.length) return <p className="text-slate-500">{empty}</p>;
  return (
    <ul className="grid gap-1">
      {items.map((item) => (
        <li key={item.label} className="flex justify-between gap-4">
          <span className="truncate">{item.label}</span>
          <span className="font-semibold">{item.count}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function AdminVisitorsPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const cookieStore = await cookies();
  const hasAdminCookie = Boolean(
    readAdminAccessToken(cookieStore.get(ADMIN_ACCESS_COOKIE_NAME)?.value?.trim() || ""),
  );
  const session = await auth().catch(() => null);
  if (!hasAdminCookie && session?.user?.role !== "ADMIN") {
    redirect("/owner-access");
  }

  const today = saDayKey(new Date());
  const requested = (await searchParams).day;
  const dayKey =
    isValidDayKey(requested) && requested! <= today ? requested! : shiftSaDay(today, -1);
  const summary = await loadVisitorDay(saDayWindow(dayKey)).catch(() => null);
  const channels = getVisitorReportChannelStatus();
  const f = summary?.funnel;

  const funnelSteps = f
    ? [
        { label: "Visited the website", count: f.visited },
        { label: "Opened a store", count: f.openedStore },
        { label: "Added to cart", count: f.addedToCart },
        { label: "Reached checkout", count: f.reachedCheckout },
        { label: "Placed an order", count: f.placedOrder },
        { label: "Paid", count: f.paid },
      ]
    : [];

  return (
    <main className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <section className="container py-10">
        <Link href="/admin" className="text-sm underline">
          Back to admin
        </Link>
        <p className="mt-6 text-xs uppercase tracking-[0.16em] text-lethela-primary">
          Website visitors
        </p>
        <h1 className="mt-3 text-3xl font-bold">
          {dayKey === today ? "Today so far" : formatSaDay(dayKey)}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Who visited lethela.co.za, where they came from and how far they got. Staff, search engine
          robots and speed checks are left out. The same report goes to the admins every morning at
          about 07:00 by{" "}
          {[channels.whatsapp ? "WhatsApp" : "", channels.email ? "email" : ""]
            .filter(Boolean)
            .join(" and ") || "WhatsApp or email once one is set up"}
          .
        </p>
        <nav className="mt-4 flex flex-wrap gap-2 text-sm" aria-label="Choose a day">
          <Link
            href={`/admin/visitors?day=${shiftSaDay(dayKey, -1)}`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            Previous day
          </Link>
          {dayKey < today ? (
            <Link
              href={`/admin/visitors?day=${shiftSaDay(dayKey, 1)}`}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              Next day
            </Link>
          ) : null}
          {dayKey !== today ? (
            <Link
              href={`/admin/visitors?day=${today}`}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              Today so far
            </Link>
          ) : null}
        </nav>

        {!summary ? (
          <p className="mt-6 rounded-lg border border-amber-200 bg-white p-4 text-sm">
            The visitor numbers could not be loaded right now. Try again in a minute.
          </p>
        ) : (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="People" value={summary.visitors} />
              <Stat label="New" value={summary.newVisitors} />
              <Stat label="Pages viewed" value={summary.pageViews} />
              <Stat label="Did not order" value={summary.didNotOrder} />
            </div>

            {summary.dropOff ? (
              <section className="mt-3 rounded-lg border border-amber-200 bg-white p-4">
                <h2 className="font-semibold">Biggest drop</h2>
                <p className="mt-1 text-sm text-slate-700">{summary.dropOff.headline}</p>
                <p className="mt-1 text-sm text-slate-600">What to try: {summary.dropOff.advice}</p>
              </section>
            ) : null}

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <Card title="How far they got">
                <ul className="grid gap-1">
                  {funnelSteps.map((step) => (
                    <li key={step.label} className="flex justify-between gap-4">
                      <span>{step.label}</span>
                      <span className="font-semibold">{step.count}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title="Where they came from">
                <CountList items={summary.sources} empty="No visits yet." />
                <p className="mt-3 text-slate-500">
                  {summary.phones} on phones, {summary.computers} on computers.
                </p>
              </Card>
              <Card title="What they looked at">
                <CountList items={summary.pages} empty="No pages viewed yet." />
              </Card>
              <Card title="Stores opened">
                <CountList items={summary.stores} empty="Nobody opened a store." />
              </Card>
              <Card title="Searches">
                <CountList items={summary.searches} empty="No searches." />
              </Card>
              <Card title="Sign-ups">
                <ul className="grid gap-1">
                  <li className="flex justify-between gap-4">
                    <span>Customers (sign-up page opened by {summary.signupPages.customers})</span>
                    <span className="font-semibold">{summary.signups.customers}</span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>Stores (sign-up page opened by {summary.signupPages.stores})</span>
                    <span className="font-semibold">{summary.signups.stores}</span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>Riders (sign-up page opened by {summary.signupPages.riders})</span>
                    <span className="font-semibold">{summary.signups.riders}</span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>Tapped WhatsApp</span>
                    <span className="font-semibold">{summary.whatsappClicks}</span>
                  </li>
                </ul>
              </Card>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
