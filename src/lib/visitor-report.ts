import { isPhoneUserAgent } from "@/lib/bot-detect";

// South Africa has no daylight saving, so a Lethela day is always UTC+2.
const SA_OFFSET_MS = 2 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type ReportWindow = { key: string; start: Date; end: Date };

/** The South African calendar day (YYYY-MM-DD) that `at` falls on. */
export function saDayKey(at: Date) {
  return new Date(at.getTime() + SA_OFFSET_MS).toISOString().slice(0, 10);
}

export function saHour(at: Date) {
  return new Date(at.getTime() + SA_OFFSET_MS).getUTCHours();
}

/** Midnight to midnight, South African time, for the given YYYY-MM-DD day. */
export function saDayWindow(key: string): ReportWindow {
  const start = new Date(Date.parse(`${key}T00:00:00.000Z`) - SA_OFFSET_MS);
  return { key, start, end: new Date(start.getTime() + DAY_MS) };
}

export function shiftSaDay(key: string, days: number) {
  return saDayKey(new Date(saDayWindow(key).start.getTime() + days * DAY_MS));
}

export function isValidDayKey(value: string | null | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)));
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatSaDay(key: string) {
  const date = new Date(`${key}T00:00:00.000Z`);
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

export type EntryInfo = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
  clickId?: string | null;
};

/** Turns where a visit started (link tags, referring site) into a plain source name. */
export function classifySource(entry: EntryInfo | null | undefined) {
  if (!entry) return "Direct or unknown";
  const utm = `${entry.utmSource || ""} ${entry.utmMedium || ""}`.toLowerCase();
  const referrer = String(entry.referrer || "").toLowerCase();
  const paid = /cpc|paid|ads?\b|retarget/.test(utm);

  if (entry.clickId === "fbclid" || /facebook|\bfb\b|instagram|\big\b|meta/.test(utm)) {
    if (/instagram|\big\b/.test(utm) || referrer.includes("instagram")) {
      return paid ? "Instagram ads" : "Instagram";
    }
    return paid ? "Facebook ads" : "Facebook";
  }
  if (/whatsapp|wa\b/.test(utm)) return "WhatsApp";
  if (/tiktok/.test(utm)) return "TikTok";
  if (entry.clickId === "gclid" || /google/.test(utm)) return paid ? "Google ads" : "Google";
  if (utm.trim()) return entry.utmSource ? cleanName(entry.utmSource) : "Other links";

  if (!referrer) return "Direct or unknown";
  if (/(^|\.)instagram\.com$/.test(referrer)) return "Instagram";
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/.test(referrer)) return "Facebook";
  if (/whatsapp/.test(referrer) || referrer === "wa.me") return "WhatsApp";
  if (/tiktok/.test(referrer)) return "TikTok";
  if (/(^|\.)google\./.test(referrer)) return "Google";
  if (/(^|\.)(bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org)$/.test(referrer)) {
    return "Other search engines";
  }
  if (/(chatgpt|openai|perplexity|claude|gemini|copilot)/.test(referrer)) return "AI assistants";
  if (/(^|\.)(t\.co|x\.com|twitter\.com)$/.test(referrer)) return "X (Twitter)";
  if (/(^|\.)lethela\.co\.za$/.test(referrer)) return "Direct or unknown";
  return referrer.replace(/^www\./, "");
}

function cleanName(value: string) {
  const text = value.trim().slice(0, 40);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Paths staff use, which say nothing about customers. */
export function isStaffPath(path: string) {
  return (
    path.startsWith("/admin") ||
    path.startsWith("/owner-access") ||
    path.startsWith("/vendors/dashboard") ||
    path.startsWith("/rider/dashboard")
  );
}

export function cleanPath(path: string | null | undefined) {
  const value = String(path || "/").split(/[?#]/)[0] || "/";
  return value.length > 1 ? value.replace(/\/+$/, "") : value;
}

const STORE_PATH_EXCLUSIONS = new Set(["register", "signin", "dashboard"]);

export function storeSlugFromPath(path: string) {
  const match = /^\/vendors\/([^/]+)$/.exec(path);
  if (!match || STORE_PATH_EXCLUSIONS.has(match[1])) return null;
  return decodeURIComponent(match[1]);
}

export function isCheckoutPath(path: string) {
  return path === "/checkout";
}

export function pageLabel(path: string) {
  const store = storeSlugFromPath(path);
  if (store) return `Store: ${store}`;
  const labels: Record<string, string> = {
    "/": "Homepage",
    "/rider": "Rider sign-up page",
    "/vendors/register": "Store sign-up page",
    "/signup": "Sign-up page",
    "/signin": "Sign-in page",
    "/checkout": "Checkout",
    "/checkout/success": "Payment done page",
    "/checkout/cancel": "Payment cancelled page",
    "/search": "Search",
    "/products": "Products",
    "/restaurants": "Restaurants",
    "/how-it-works": "How it works",
    "/about": "About",
    "/faq": "FAQ",
    "/contact": "Contact",
    "/track": "Track an order",
    "/pricing": "Pricing",
  };
  if (labels[path]) return labels[path];
  if (path.startsWith("/categories/")) return `Category: ${path.slice(12)}`;
  if (path.startsWith("/areas/")) return `Area page: ${path.slice(7)}`;
  if (path.startsWith("/orders/")) return "Order tracking";
  return path;
}

export type ReportEvent = {
  visitorId: string;
  userId: string | null;
  type: string;
  path: string | null;
  vendorSlug: string | null;
  searchQuery: string | null;
  metaJson: string | null;
  createdAt: Date;
};

export type ReportVisitor = { id: string; userAgent: string | null; createdAt: Date };

export type VisitorDayInput = {
  window: ReportWindow;
  events: ReportEvent[];
  visitors: ReportVisitor[];
  staffUserIds: Set<string>;
  orders: { placed: number; paid: number; customers: number };
  signups: { customers: number; stores: number; riders: number };
  liveStores: number;
};

export type Count = { label: string; count: number };

export type VisitorDaySummary = {
  dayKey: string;
  visitors: number;
  newVisitors: number;
  pageViews: number;
  phones: number;
  computers: number;
  sources: Count[];
  pages: Count[];
  stores: Count[];
  searches: Count[];
  funnel: {
    visited: number;
    openedStore: number;
    addedToCart: number;
    reachedCheckout: number;
    placedOrder: number;
    paid: number;
  };
  signupPages: { customers: number; stores: number; riders: number };
  signups: { customers: number; stores: number; riders: number };
  whatsappClicks: number;
  didNotOrder: number;
  liveStores: number;
  dropOff: { headline: string; advice: string } | null;
};

function parseEntry(metaJson: string | null): EntryInfo | null {
  if (!metaJson) return null;
  try {
    const meta = JSON.parse(metaJson) as { entry?: EntryInfo };
    return meta?.entry && typeof meta.entry === "object" ? meta.entry : null;
  } catch {
    return null;
  }
}

function topCounts(map: Map<string, Set<string>>, limit: number): Count[] {
  return [...map.entries()]
    .map(([label, set]) => ({ label, count: set.size }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function addTo(map: Map<string, Set<string>>, key: string, visitorId: string) {
  const set = map.get(key) || new Set<string>();
  set.add(visitorId);
  map.set(key, set);
}

export function summariseVisitorDay(input: VisitorDayInput): VisitorDaySummary {
  const events = [...input.events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Anyone who signed in as staff or opened a staff page is left out completely.
  const staffVisitors = new Set<string>();
  for (const event of events) {
    if (
      (event.userId && input.staffUserIds.has(event.userId)) ||
      isStaffPath(cleanPath(event.path))
    ) {
      staffVisitors.add(event.visitorId);
    }
  }

  const visitorsById = new Map(input.visitors.map((visitor) => [visitor.id, visitor]));
  const seen = new Set<string>();
  const sourceByVisitor = new Map<string, string>();
  const pages = new Map<string, Set<string>>();
  const stores = new Map<string, Set<string>>();
  const searches = new Map<string, Set<string>>();
  const openedStore = new Set<string>();
  const addedToCart = new Set<string>();
  const reachedCheckout = new Set<string>();
  const whatsapp = new Set<string>();
  const signupPages = {
    customers: new Set<string>(),
    stores: new Set<string>(),
    riders: new Set<string>(),
  };
  let pageViews = 0;

  for (const event of events) {
    const id = event.visitorId;
    if (staffVisitors.has(id)) continue;
    const path = cleanPath(event.path);

    if (event.type === "page_view") {
      pageViews += 1;
      seen.add(id);
      const entry = parseEntry(event.metaJson);
      if (entry && !sourceByVisitor.has(id)) sourceByVisitor.set(id, classifySource(entry));
      addTo(pages, pageLabel(path), id);
      const slug = storeSlugFromPath(path);
      if (slug) {
        openedStore.add(id);
        addTo(stores, slug, id);
      }
      if (isCheckoutPath(path)) reachedCheckout.add(id);
      if (path === "/signup") signupPages.customers.add(id);
      if (path === "/vendors/register") signupPages.stores.add(id);
      if (path === "/rider") signupPages.riders.add(id);
    } else if (event.type === "vendor_click") {
      openedStore.add(id);
      if (event.vendorSlug) addTo(stores, event.vendorSlug, id);
    } else if (event.type === "product_add") {
      addedToCart.add(id);
    } else if (event.type === "search" && event.searchQuery?.trim()) {
      addTo(searches, event.searchQuery.trim().toLowerCase().slice(0, 40), id);
    } else if (event.type === "whatsapp_click") {
      whatsapp.add(id);
    }
  }

  let phones = 0;
  let newVisitors = 0;
  const sources = new Map<string, Set<string>>();
  for (const id of seen) {
    const visitor = visitorsById.get(id);
    if (isPhoneUserAgent(visitor?.userAgent)) phones += 1;
    if (visitor && visitor.createdAt >= input.window.start) newVisitors += 1;
    addTo(sources, sourceByVisitor.get(id) || "Direct or unknown", id);
  }

  // Steps only count people who were counted as visitors that day.
  const within = (set: Set<string>) => [...set].filter((id) => seen.has(id)).length;
  const funnel = {
    visited: seen.size,
    openedStore: within(openedStore),
    addedToCart: within(addedToCart),
    reachedCheckout: within(reachedCheckout),
    placedOrder: input.orders.placed,
    paid: input.orders.paid,
  };

  return {
    dayKey: input.window.key,
    visitors: seen.size,
    newVisitors,
    pageViews,
    phones,
    computers: seen.size - phones,
    sources: topCounts(sources, 6),
    pages: topCounts(pages, 6),
    stores: topCounts(stores, 5),
    searches: topCounts(searches, 5),
    funnel,
    signupPages: {
      customers: within(signupPages.customers),
      stores: within(signupPages.stores),
      riders: within(signupPages.riders),
    },
    signups: input.signups,
    whatsappClicks: within(whatsapp),
    didNotOrder: Math.max(0, seen.size - input.orders.customers),
    liveStores: input.liveStores,
    dropOff: findDropOff(funnel, input.liveStores),
  };
}

export function findDropOff(
  funnel: VisitorDaySummary["funnel"],
  liveStores: number,
): VisitorDaySummary["dropOff"] {
  if (funnel.visited === 0) return null;
  if (liveStores === 0) {
    return {
      headline: `${funnel.visited} people visited, but no store is listed yet, so nobody could order.`,
      advice:
        "Approve a store with its menu, opening hours and Klipfontein View address. The homepage lists it within a few minutes.",
    };
  }

  const steps = [
    {
      from: funnel.visited,
      to: funnel.openedStore,
      headline: (a: number, b: number) => `${a} people visited, but only ${b} opened a store.`,
      advice:
        "Most people left before looking at a store. Share links straight to a store or a popular item in posts, and check the store list is easy to see on a phone.",
    },
    {
      from: funnel.openedStore,
      to: funnel.addedToCart,
      headline: (a: number, b: number) =>
        `${a} people opened a store, but only ${b} added something to the cart.`,
      advice:
        "People looked but did not pick anything. Check that stores are open, items have clear photos and names, and popular items are near the top.",
    },
    {
      from: funnel.addedToCart,
      to: funnel.reachedCheckout,
      headline: (a: number, b: number) =>
        `${a} people added to the cart, but only ${b} went to checkout.`,
      advice:
        "People stopped at the cart. Check the cart button is easy to find and that their delivery area is accepted.",
    },
    {
      from: funnel.reachedCheckout,
      to: funnel.placedOrder,
      headline: (a: number, b: number) =>
        `${a} people reached checkout, but only ${b} placed an order.`,
      advice:
        "People gave up at checkout. Check the form is short, the delivery address works and nothing surprises them at the last step.",
    },
    {
      from: funnel.placedOrder,
      to: funnel.paid,
      headline: (a: number, b: number) => `${a} orders were started, but only ${b} were paid.`,
      advice: "Payments are not going through. Check Ozow is live and try a small order yourself.",
    },
  ];

  let worst: { lost: number; step: (typeof steps)[number] } | null = null;
  for (const step of steps) {
    const lost = step.from - Math.min(step.to, step.from);
    if (step.from > 0 && lost > 0 && (!worst || lost > worst.lost)) worst = { lost, step };
  }
  if (!worst) return null;
  return {
    headline: worst.step.headline(worst.step.from, Math.min(worst.step.to, worst.step.from)),
    advice: worst.step.advice,
  };
}

export type WeekComparison = { visitors: number; previousVisitors: number; paidOrders: number };

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

function inline(counts: Count[]) {
  return counts.map((item) => `${item.label} ${item.count}`).join(", ");
}

export function formatVisitorReportText(
  summary: VisitorDaySummary,
  options: { reportUrl: string; week?: WeekComparison | null },
) {
  const lines = [`Lethela visitors for ${formatSaDay(summary.dayKey)}`, ""];

  if (summary.visitors === 0) {
    lines.push("No visitors were recorded on the website.");
  } else {
    lines.push(
      `${plural(summary.visitors, "person", "people")} visited (${summary.newVisitors} new) and viewed ${plural(summary.pageViews, "page")}.`,
      `${summary.phones} on phones, ${summary.computers} on computers.`,
      "",
      `Where they came from: ${inline(summary.sources)}`,
      `What they looked at: ${inline(summary.pages.slice(0, 5))}`,
    );
    if (summary.stores.length) lines.push(`Stores opened: ${inline(summary.stores)}`);
    if (summary.searches.length) lines.push(`Searched for: ${inline(summary.searches)}`);
    const f = summary.funnel;
    lines.push(
      "",
      "How far they got:",
      `- Opened a store: ${f.openedStore}`,
      `- Added to cart: ${f.addedToCart}`,
      `- Reached checkout: ${f.reachedCheckout}`,
      `- Placed an order: ${f.placedOrder} (${f.paid} paid)`,
      `- Visited but did not order: ${summary.didNotOrder}`,
      "",
      `Sign-ups: ${plural(summary.signups.customers, "customer")}, ${plural(summary.signups.stores, "store")}, ${plural(summary.signups.riders, "rider")}`,
      `Sign-up pages opened: customers ${summary.signupPages.customers}, stores ${summary.signupPages.stores}, riders ${summary.signupPages.riders}`,
    );
    if (summary.whatsappClicks) lines.push(`Tapped WhatsApp: ${summary.whatsappClicks}`);
  }

  if (summary.dropOff) {
    lines.push(
      "",
      `Biggest drop: ${summary.dropOff.headline}`,
      `What to try: ${summary.dropOff.advice}`,
    );
  }

  if (options.week) {
    const { visitors, previousVisitors, paidOrders } = options.week;
    lines.push(
      "",
      `Last 7 days: ${plural(visitors, "person", "people")} (week before: ${previousVisitors}), ${plural(paidOrders, "paid order")}.`,
    );
  }

  lines.push("", `Full report: ${options.reportUrl}`);
  return lines.join("\n");
}
