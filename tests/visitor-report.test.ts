import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

const PHONE = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/129 Mobile Safari/537.36";
const COMPUTER =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129 Safari/537.36";

test("a Lethela day runs midnight to midnight South African time", async () => {
  const { saDayKey, saDayWindow, shiftSaDay, saHour } = await import("../src/lib/visitor-report");
  const window = saDayWindow("2026-10-15");
  assert.equal(window.start.toISOString(), "2026-10-14T22:00:00.000Z");
  assert.equal(window.end.toISOString(), "2026-10-15T22:00:00.000Z");
  assert.equal(saDayKey(new Date("2026-10-15T22:30:00Z")), "2026-10-16");
  assert.equal(saHour(new Date("2026-10-16T05:00:00Z")), 7);
  assert.equal(shiftSaDay("2026-10-01", -1), "2026-09-30");
});

test("robots, speed checks and our own jobs are not counted as visitors", async () => {
  const { isAutomatedUserAgent } = await import("../src/lib/bot-detect");
  for (const agent of [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36 Chrome-Lighthouse",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/129.0 Safari/537.36",
    "curl/8.5.0",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "WhatsApp/2.23.20.0",
    "",
  ]) {
    assert.equal(isAutomatedUserAgent(agent), true, agent);
  }
  assert.equal(isAutomatedUserAgent(PHONE), false);
  assert.equal(isAutomatedUserAgent(COMPUTER), false);
  assert.equal(
    isAutomatedUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 [FBAN/FBIOS;FBAV/440.0]",
    ),
    false,
  );
});

test("visit sources are named in plain words", async () => {
  const { classifySource } = await import("../src/lib/visitor-report");
  assert.equal(classifySource({ clickId: "fbclid" }), "Facebook");
  assert.equal(classifySource({ referrer: "l.instagram.com" }), "Instagram");
  assert.equal(classifySource({ referrer: "m.facebook.com" }), "Facebook");
  assert.equal(classifySource({ utmSource: "facebook", utmMedium: "paid" }), "Facebook ads");
  assert.equal(classifySource({ referrer: "www.google.co.za" }), "Google");
  assert.equal(classifySource({ utmSource: "whatsapp" }), "WhatsApp");
  assert.equal(classifySource({ referrer: "chatgpt.com" }), "AI assistants");
  assert.equal(classifySource(null), "Direct or unknown");
  assert.equal(classifySource({ referrer: "kasid.co.za" }), "kasid.co.za");
});

test("the day summary counts people, sources, steps and leaves staff out", async () => {
  const { summariseVisitorDay, saDayWindow, formatVisitorReportText } = await import(
    "../src/lib/visitor-report"
  );
  const window = saDayWindow("2026-10-15");
  const at = (minutes: number) => new Date(window.start.getTime() + minutes * 60_000);
  const event = (
    visitorId: string,
    minutes: number,
    type: string,
    path: string | null,
    extra: Partial<{
      userId: string;
      vendorSlug: string;
      searchQuery: string;
      metaJson: string;
    }> = {},
  ) => ({
    visitorId,
    userId: extra.userId ?? null,
    type,
    path,
    vendorSlug: extra.vendorSlug ?? null,
    searchQuery: extra.searchQuery ?? null,
    metaJson: extra.metaJson ?? null,
    createdAt: at(minutes),
  });

  const summary = summariseVisitorDay({
    window,
    events: [
      event("a", 600, "page_view", "/?fbclid=x", {
        metaJson: JSON.stringify({ entry: { clickId: "fbclid" } }),
      }),
      event("a", 601, "page_view", "/vendors/mama-kota"),
      event("a", 602, "product_add", "/vendors/mama-kota"),
      event("a", 603, "page_view", "/checkout"),
      event("b", 610, "page_view", "/", {
        metaJson: JSON.stringify({ entry: { referrer: "www.google.com" } }),
      }),
      event("b", 611, "search", "/", { searchQuery: "Kota " }),
      event("c", 620, "page_view", "/rider"),
      event("staff", 630, "page_view", "/admin"),
      event("staff", 631, "page_view", "/"),
      event("owner", 640, "page_view", "/", { userId: "admin-user" }),
    ],
    visitors: [
      { id: "a", userAgent: PHONE, createdAt: at(600) },
      { id: "b", userAgent: COMPUTER, createdAt: new Date("2026-09-01T00:00:00Z") },
      { id: "c", userAgent: PHONE, createdAt: at(620) },
    ],
    staffUserIds: new Set(["admin-user"]),
    orders: { placed: 1, paid: 0, customers: 1 },
    signups: { customers: 0, stores: 0, riders: 1 },
    liveStores: 1,
  });

  assert.equal(summary.visitors, 3);
  assert.equal(summary.newVisitors, 2);
  assert.equal(summary.pageViews, 5);
  assert.equal(summary.phones, 2);
  assert.deepEqual(summary.funnel, {
    visited: 3,
    openedStore: 1,
    addedToCart: 1,
    reachedCheckout: 1,
    placedOrder: 1,
    paid: 0,
  });
  assert.deepEqual(summary.sources.map((row) => row.label).sort(), [
    "Direct or unknown",
    "Facebook",
    "Google",
  ]);
  assert.equal(summary.pages[0].label, "Homepage");
  assert.equal(summary.pages[0].count, 2);
  assert.deepEqual(summary.stores, [{ label: "mama-kota", count: 1 }]);
  assert.deepEqual(summary.searches, [{ label: "kota", count: 1 }]);
  assert.equal(summary.signupPages.riders, 1);
  assert.equal(summary.didNotOrder, 2);
  assert.match(summary.dropOff?.headline || "", /3 people visited, but only 1 opened a store/);

  const text = formatVisitorReportText(summary, {
    reportUrl: "https://www.lethela.co.za/admin/visitors?day=2026-10-15",
    week: { visitors: 20, previousVisitors: 12, paidOrders: 2 },
  });
  assert.match(text, /^Lethela visitors for Thu 15 Oct/);
  assert.match(text, /3 people visited \(2 new\)/);
  assert.match(text, /Where they came from: /);
  assert.match(text, /Placed an order: 1 \(0 paid\)/);
  assert.match(text, /Last 7 days: 20 people \(week before: 12\), 2 paid orders/);
  // The report never quotes delivery fees or prices.
  assert.doesNotMatch(text, /R\d/);
});

test("with no store listed the report says so instead of blaming the visitors", async () => {
  const { findDropOff } = await import("../src/lib/visitor-report");
  const dropOff = findDropOff(
    { visited: 5, openedStore: 0, addedToCart: 0, reachedCheckout: 0, placedOrder: 0, paid: 0 },
    0,
  );
  assert.match(dropOff?.headline || "", /no store is listed yet/);
});

test("the daily report is sent once a day from 07:00 by a scheduled job, with no secret needed", async () => {
  const route = await source("src/app/api/cron/visitor-report/route.ts");
  const delivery = await source("src/lib/visitor-report-data.ts");
  const workflow = await source(".github/workflows/visitor-report.yml");
  assert.match(workflow, /cron: "0 5 \* \* \*"/);
  assert.match(workflow, /api\/cron\/visitor-report/);
  assert.match(delivery, /claimOrderNotification\("visitor-report", dayKey, "daily"\)/);
  assert.match(delivery, /saHour\(now\) < 6/);
  assert.match(delivery, /sendTwilioWhatsApp/);
  assert.match(delivery, /sendResendEmail/);
  assert.doesNotMatch(route, /searchParams|request\.url/);
});

test("every visit is counted anonymously; ad tools wait for cookie consent", async () => {
  const telemetry = await source("src/components/VisitorTelemetry.tsx");
  const visitor = await source("src/lib/visitor.ts");
  const events = await source("src/app/api/visitors/events/route.ts");
  const meta = await source("src/lib/meta-pixel.ts");
  const capi = await source("src/app/api/meta/events/route.ts");
  const config = await source("next.config.mjs");

  assert.doesNotMatch(telemetry, /if \(canUseAnalyticsCookies\(\)\) \{\s*void trackVisitorEvent/);
  assert.match(visitor, /consented: input\.consented \?\? canUseAnalyticsCookies\(\)/);
  assert.match(events, /isAutomatedUserAgent\(userAgent\)/);
  assert.match(events, /if \(consented\) \{/);
  assert.match(meta, /!canUseAnalyticsCookies\(\)\) return/);
  assert.match(capi, /META_CONVERSIONS_API_TOKEN/);
  assert.doesNotMatch(capi, /userData\.(em|ph|fn|ln)\b/);
  assert.match(config, /script-src[^\n]*https:\/\/connect\.facebook\.net/);
});
