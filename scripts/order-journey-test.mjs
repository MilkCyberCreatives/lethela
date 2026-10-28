// Full order journey test for Lethela, driven in real Chromium for customer, store, rider and
// admin, against a LOCAL production build on a THROWAWAY Postgres database.
//
// It refuses to run unless E2E_BASE_URL is http://localhost or http://127.0.0.1 and DATABASE_URL
// is a local Postgres database whose name contains "e2e" or "test" (it wipes and reseeds it).
//
// Usage (see the header of scripts/seed-e2e-postgres.mjs and the report for the full setup):
//   E2E_BASE_URL=http://localhost:3100 \
//   DATABASE_URL=postgresql://e2e:e2e@127.0.0.1:5432/lethela_e2e \
//   OZOW_SITE_CODE=E2E-SITE-001 OZOW_PRIVATE_KEY=e2e-ozow-private-key-not-real OZOW_IS_TEST=true \
//   CRON_SECRET=e2e-only-cron-secret E2E_CATCHER_URL=http://127.0.0.1:3199 \
//   node scripts/order-journey-test.mjs [--no-seed]
// The values must match the ones the server was started with.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import {
  assertLocalDatabase,
  seedE2eDatabase,
  E2E_ACCOUNTS,
  E2E_STORE,
} from "./seed-e2e-postgres.mjs";

// ---------------------------------------------------------------- safety
const BASE = (process.env.E2E_BASE_URL || "http://localhost:3100").replace(/\/+$/, "");
const baseUrl = new URL(BASE);
if (baseUrl.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(baseUrl.hostname)) {
  console.error(`Refusing to run against ${BASE}: only http://localhost or http://127.0.0.1.`);
  process.exit(2);
}
const DATABASE_URL = process.env.DATABASE_URL || "";
assertLocalDatabase(DATABASE_URL);
const OZOW_SITE_CODE = process.env.OZOW_SITE_CODE || "E2E-SITE-001";
const OZOW_PRIVATE_KEY = process.env.OZOW_PRIVATE_KEY || "e2e-ozow-private-key-not-real";
const OZOW_IS_TEST = process.env.OZOW_IS_TEST === "true" ? "true" : "false";
const CRON_SECRET = process.env.CRON_SECRET || "";
const CATCHER = (process.env.E2E_CATCHER_URL || "http://127.0.0.1:3199").replace(/\/+$/, "");
const CHROME = process.env.E2E_CHROME_PATH || "/opt/pw-browsers/chromium";
const SHOTS = process.env.E2E_SHOTS_DIR || path.resolve("e2e-shots");
const HEADLESS = process.env.E2E_HEADED !== "1";
fs.mkdirSync(SHOTS, { recursive: true });

// A response wait left behind by a failed click must not crash the whole run.
process.on("unhandledRejection", (error) =>
  console.log(`  (ignored late rejection) ${error?.message?.split("\n")[0]}`),
);

const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

// ---------------------------------------------------------------- results
const results = [];
const problems = []; // page errors, console errors, 5xx responses
let shotIndex = 0;
const state = {};
// HTTP codes a step provokes on purpose (tampered price, late accept, a cash order...),
// so the browser's own "Failed to load resource" line for them is not reported as a problem.
const expectedCodes = new Set();
async function expecting(codes, fn) {
  codes.forEach((code) => expectedCodes.add(code));
  try {
    return await fn();
  } finally {
    codes.forEach((code) => expectedCodes.delete(code));
  }
}

async function check(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail || "" });
    console.log(`[PASS] ${name}${detail ? ` - ${detail}` : ""} (${Date.now() - started}ms)`);
    return true;
  } catch (error) {
    const message =
      (error instanceof Error ? error.message : String(error))
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 2)
        .join(" ") || "error";
    results.push({ name, ok: false, detail: message });
    console.log(`[FAIL] ${name} - ${message}`);
    return false;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const money = (cents) => `R ${(cents / 100).toFixed(2)}`;

// ---------------------------------------------------------------- outbound catcher
async function catcherLog() {
  const text = await fetch(`${CATCHER}/log`).then((r) => r.text());
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------- browser
const browser = await chromium.launch({ executablePath: CHROME, headless: HEADLESS });
const contexts = [];

async function newContext(role, options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1280, height: 900 },
    // Each role is its own "device", as in real life (the sign-in limit is per client).
    userAgent: `Mozilla/5.0 (X11; Linux x86_64) Chrome/140.0 LethelaE2E/${role}`,
    geolocation: options.geolocation,
    permissions: options.geolocation ? ["geolocation"] : [],
    storageState: options.storageState,
  });
  context.role = role;
  context.ozowRedirects = [];
  // Nothing leaves this machine: Ozow's hosted page is replaced with a stub, all else aborted.
  await context.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, async (route) => {
    const url = route.request().url();
    if (url.startsWith("https://pay.ozow.com/")) {
      context.ozowRedirects.push(url);
      return route.fulfill({ status: 200, contentType: "text/html", body: "<h1>Ozow stub</h1>" });
    }
    return route.abort();
  });
  // Cookie consent decided up front so the banner never covers buttons.
  await context.addInitScript(() => {
    try {
      localStorage.setItem(
        "lethela_cookie_consent",
        JSON.stringify({
          essential: true,
          status: "declined",
          analytics: false,
          marketing: false,
          push: false,
          updatedAt: new Date().toISOString(),
          version: "2026-07-07",
        }),
      );
    } catch {}
  });
  const track = (page) => {
    // Dashboards ask "Accept order for LET-...?" with window.confirm: answer OK like a person.
    page.on("dialog", (dialog) => {
      problems.push({
        role,
        kind: "dialog",
        url: page.url(),
        text: `${dialog.type()}: ${dialog.message()}`,
        info: true,
      });
      void dialog.accept().catch(() => {});
    });
    page.on("pageerror", (error) =>
      problems.push({ role, kind: "pageerror", url: page.url(), text: error.message }),
    );
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      // Requests to outside hosts are aborted on purpose by this test.
      if (/net::ERR_FAILED|ERR_BLOCKED|net::ERR_ABORTED/.test(text)) return;
      const code = text.match(/status of (\d{3})/)?.[1];
      if (code && expectedCodes.has(Number(code))) return;
      problems.push({ role, kind: "console", url: page.url(), text });
    });
    page.on("response", (response) => {
      const url = response.url();
      if (!url.startsWith(BASE)) return;
      const status = response.status();
      if (status >= 500) {
        problems.push({
          role,
          kind: `http ${status}`,
          url: page.url(),
          text: url.replace(BASE, ""),
        });
      } else if (
        status === 404 &&
        !expectedCodes.has(404) &&
        !/\.(png|jpg|ico|svg|webp)(\?|$)/.test(url)
      ) {
        problems.push({ role, kind: "http 404", url: page.url(), text: url.replace(BASE, "") });
      }
    });
  };
  context.on("page", track);
  contexts.push(context);
  return context;
}

async function shot(page, label) {
  const file = path.join(SHOTS, `${String(++shotIndex).padStart(2, "0")}-${label}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
  return file;
}

async function go(page, pathname) {
  const response = await page.goto(`${BASE}${pathname}`, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(600);
  return response;
}

async function bodyText(page) {
  return page.locator("body").innerText();
}

async function signIn(page, account) {
  await go(page, "/signin");
  await page.getByLabel("Email address").fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  const callback = page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials"));
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const response = await callback;
  const text = await response.text();
  assert(
    response.ok() && !text.includes("CredentialsSignin"),
    `sign-in failed: ${text.slice(0, 120)}`,
  );
  await page.waitForURL((url) => !url.pathname.startsWith("/signin"), { timeout: 30000 });
  await page.waitForLoadState("load");
  const session = await page.evaluate(() => fetch("/api/auth/session").then((r) => r.json()));
  assert(session?.user?.email === account.email, "no session after sign-in");
  return session.user;
}

// ---------------------------------------------------------------- Ozow helpers
function ozowHash(parts) {
  return crypto
    .createHash("sha512")
    .update(
      parts
        .map((p) => p ?? "")
        .join("")
        .toLowerCase(),
      "utf8",
    )
    .digest("hex")
    .toUpperCase();
}

function ozowCallbackBody({
  ref,
  txnId,
  amount,
  status = "Complete",
  siteCode = OZOW_SITE_CODE,
  key = OZOW_PRIVATE_KEY,
}) {
  const fields = {
    SiteCode: siteCode,
    TransactionId: txnId,
    TransactionReference: ref,
    Amount: amount,
    Status: status,
    CurrencyCode: "ZAR",
    IsTest: OZOW_IS_TEST,
    StatusMessage: "e2e",
  };
  fields.Hash = ozowHash([
    fields.SiteCode,
    fields.TransactionId,
    fields.TransactionReference,
    fields.Amount,
    fields.Status,
    "",
    "",
    "",
    "",
    "",
    fields.CurrencyCode,
    fields.IsTest,
    fields.StatusMessage,
    key,
  ]);
  return fields;
}

async function postOzow(fields) {
  const response = await fetch(`${BASE}/api/payments/ozow/notify`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  });
  return { status: response.status, json: await response.json().catch(() => ({})) };
}

// ---------------------------------------------------------------- flows
async function addToCartAndCheckout(page, productNames) {
  await go(page, `/vendors/${E2E_STORE.slug}`);
  for (const [name, qty] of productNames) {
    const card = page
      .locator("article, li, div")
      .filter({ hasText: name })
      .filter({
        has: page.getByRole("button", { name: /Add to cart/i }),
      });
    for (let i = 0; i < qty; i += 1) {
      await card
        .last()
        .getByRole("button", { name: /Add to cart/i })
        .click();
      await page.waitForTimeout(300);
    }
  }
  await go(page, "/checkout");
}

async function fillCheckoutContact(page, { name, phone, area }) {
  const nameBox = page.locator("#checkout-customer-name");
  await nameBox.fill(name);
  await page.locator("#checkout-phone").fill(phone);
  if (area !== undefined) {
    await page.locator("#checkout-area").fill(area);
  }
  const stand = page.getByLabel("Stand or house number");
  if (!(await stand.isVisible().catch(() => false))) {
    await page.getByText("Add delivery details and notes (optional)").click();
  }
  await stand.fill("Stand 45");
  await page.getByLabel("Street, extension or section").fill("Ext 2");
  await page.getByLabel("Nearby landmark").fill("Blue gate by the tuck shop");
  await page.waitForTimeout(1500); // delivery quote debounce + request
}

async function readCheckoutSummary(page) {
  const text = await bodyText(page);
  const delivery = text.match(
    /\nDelivery(?: \(([\d.]+) (?:road|estimated) km from store\))?\s*R\s?([\d.,]+)/,
  );
  const total = [...text.matchAll(/\nTotal\s*R\s?([\d.,]+)/g)].at(-1);
  return {
    km: delivery?.[1] ? Number(delivery[1]) : null,
    deliveryCents: delivery ? Math.round(Number(delivery[2].replace(",", "")) * 100) : null,
    totalCents: total ? Math.round(Number(total[1].replace(",", "")) * 100) : null,
    text,
  };
}

async function vendorAdvance(page, ref) {
  await go(page, "/vendors/dashboard?tab=orders");
  const steps = ["Accept order", "Start preparing", "Ready for rider"];
  for (const label of steps) {
    const row = page.getByText(ref).first();
    await row.waitFor({ timeout: 20000 });
    let button = page.getByRole("button", { name: label }).first();
    if (!(await button.isVisible().catch(() => false))) {
      await row.click();
      await page.waitForTimeout(500);
      button = page.getByRole("button", { name: label }).first();
    }
    await button.waitFor({ timeout: 15000 });
    const response = page.waitForResponse(
      (r) => r.url().includes(`/api/vendors/orders/`) && r.request().method() !== "GET",
    );
    await button.click();
    const res = await response;
    const json = await res.json().catch(() => ({}));
    assert(
      res.ok() && json.ok !== false,
      `${label} failed: ${res.status()} ${JSON.stringify(json).slice(0, 160)}`,
    );
    await page.waitForTimeout(800);
  }
  const order = await prisma.order.findUnique({ where: { publicId: ref } });
  return order.status;
}

async function waitForOffer(page, ref, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await go(page, "/rider/dashboard");
    const panel = page.getByText("Delivery requests");
    if ((await panel.count()) && (await page.getByText(ref).count())) return true;
    await page.waitForTimeout(3000);
  }
  return false;
}

async function riderAccept(page, ref) {
  const item = page
    .locator("li")
    .filter({ hasText: ref })
    .filter({
      has: page.getByRole("button", { name: "Accept delivery" }),
    });
  const response = page.waitForResponse((r) => r.url().includes(`/api/riders/me/offers/`));
  await item.getByRole("button", { name: "Accept delivery" }).click();
  const res = await response;
  const json = await res.json().catch(() => ({}));
  assert(
    res.ok() && json.ok,
    `accept failed: ${res.status()} ${JSON.stringify(json).slice(0, 160)}`,
  );
  await page.waitForTimeout(1500);
}

async function riderDeliver(page, ref) {
  const item = page.locator("li").filter({ hasText: ref }).filter({ hasText: "Deliver to" });
  await item.getByRole("link", { name: "Open delivery" }).click();
  await page.waitForURL((url) => url.pathname.startsWith(`/rider/${ref}`));
  await page.waitForLoadState("load");
  for (const label of ["PICKED UP", "ON THE WAY", "DELIVERED"]) {
    const response = page.waitForResponse((r) => r.url().includes(`/api/orders/${ref}/status`));
    await page.getByRole("button", { name: label, exact: true }).click();
    const res = await response;
    const json = await res.json().catch(() => ({}));
    assert(
      res.ok() && json.ok,
      `${label} failed: ${res.status()} ${JSON.stringify(json).slice(0, 160)}`,
    );
    await page.waitForTimeout(700);
  }
  return (await prisma.order.findUnique({ where: { publicId: ref } })).status;
}

async function runSweep() {
  const headers = CRON_SECRET ? { authorization: `Bearer ${CRON_SECRET}` } : {};
  const response = await fetch(`${BASE}/api/cron/order-sweep`, { headers });
  return response.status;
}

async function visitTabs(page, label, urls) {
  const visited = [];
  for (const url of urls) {
    const before = problems.length;
    const response = await go(page, url);
    await page.waitForTimeout(1200);
    visited.push(`${url}:${response?.status()}${problems.length > before ? "!" : ""}`);
  }
  return `${label}: ${visited.join(" ")}`;
}

// ================================================================ run
if (!process.argv.includes("--no-seed")) {
  await seedE2eDatabase(DATABASE_URL);
  console.log("Seeded throwaway database.");
}
await fetch(`${CATCHER}/log`, { method: "DELETE" }).catch(() => {
  throw new Error(`Outbound catcher not reachable at ${CATCHER}`);
});
const health = await fetch(`${BASE}/api/ops/version`)
  .then((r) => r.status)
  .catch(() => 0);
assert(health > 0, `Server not reachable at ${BASE}`);

const storePoint = { latitude: E2E_STORE.latitude + 0.001, longitude: E2E_STORE.longitude + 0.001 };
const publicCtx = await newContext("public");
const customerCtx = await newContext("customer", { viewport: { width: 390, height: 844 } });
const vendorCtx = await newContext("vendor");
const riderCtx = await newContext("rider", {
  viewport: { width: 390, height: 844 },
  geolocation: storePoint,
});
const rider2Ctx = await newContext("rider2", { geolocation: storePoint });
const adminCtx = await newContext("admin");
const publicPage = await publicCtx.newPage();
const customer = await customerCtx.newPage();
const vendor = await vendorCtx.newPage();
const rider = await riderCtx.newPage();
const rider2 = await rider2Ctx.newPage();
const admin = await adminCtx.newPage();

// ---------- public pages
await check("Homepage lists the store and says Lethela is open", async () => {
  // The homepage is cached for 3 minutes (revalidate = 180); the first visit after a reseed
  // can get the stale copy while the fresh one is built, so look up to three times.
  let text = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await go(publicPage, "/");
    text = await bodyText(publicPage);
    if (text.includes(E2E_STORE.name)) break;
    await publicPage.waitForTimeout(3000);
  }
  assert(text.includes(E2E_STORE.name), "store not on homepage");
  const open = text.match(/(pilot )?now (open|delivering)[^\n.]*/i);
  assert(open, "no 'now open' wording");
  return `hero: "${open[0]}"`;
});

await check("Store page lists products and shows Open now", async () => {
  await go(publicPage, `/vendors/${E2E_STORE.slug}`);
  const text = await bodyText(publicPage);
  for (const name of ["E2E Loaded Kota", "E2E Slap Chips", "E2E Party Platter"]) {
    assert(text.includes(name), `${name} missing`);
  }
  assert(text.includes("Open now"), "no Open now");
  return "3 products, Open now";
});

// ---------- sign in each role once
await check("Customer signs in", async () => (await signIn(customer, E2E_ACCOUNTS.customer)).role);
await check("Store owner signs in and dashboard opens", async () => {
  await signIn(vendor, E2E_ACCOUNTS.vendor);
  await go(vendor, "/vendors/dashboard");
  assert(vendor.url().includes("/vendors/dashboard"), `landed on ${vendor.url()}`);
  return "dashboard ok";
});
await check("Rider signs in and goes online with the dashboard button", async () => {
  await signIn(rider, E2E_ACCOUNTS.rider);
  await go(rider, "/rider/dashboard");
  const button = rider.getByRole("button", { name: "Go online" });
  await button.waitFor({ timeout: 20000 });
  await button.click();
  await rider.getByRole("button", { name: "Go offline" }).waitFor({ timeout: 15000 });
  await rider.waitForTimeout(2500); // location sent from the browser
  const app = await prisma.riderApplication.findUnique({ where: { id: "rider-e2e-demo" } });
  const loc = await prisma.$queryRawUnsafe(
    `SELECT rider_id FROM app_rider_locations WHERE rider_id = 'rider-e2e-demo'`,
  );
  assert(app.availableNow, "availableNow false");
  return `online, location shared: ${loc.length === 1}`;
});
await check("Second rider signs in (already online near the store)", async () => {
  await signIn(rider2, E2E_ACCOUNTS.rider2);
  await go(rider2, "/rider/dashboard");
  return "ok";
});
await check("Admin signs in and passes owner verification", async () => {
  await signIn(admin, E2E_ACCOUNTS.admin);
  await go(admin, "/admin");
  if (admin.url().includes("/owner-access")) {
    await admin.getByRole("button", { name: "Continue to admin" }).click();
    await admin.waitForURL((url) => url.pathname === "/admin", { timeout: 30000 });
  }
  assert(admin.url().endsWith("/admin"), `landed on ${admin.url()}`);
  return "admin open";
});

// ---------- customer order paid with Ozow
await check("Customer adds items and checkout shows R10/km delivery (Midrand)", async () => {
  await addToCartAndCheckout(customer, [
    ["E2E Loaded Kota", 2],
    ["E2E Slap Chips", 1],
  ]);
  await fillCheckoutContact(customer, {
    name: "Demo Customer",
    phone: "0721112222",
    area: "Midrand",
  });
  const summary = await readCheckoutSummary(customer);
  assert(summary.km !== null, "no distance shown");
  const expected = Math.max(1000, Math.ceil(summary.km * 1000));
  assert(
    Math.abs(summary.deliveryCents - expected) <= 1,
    `fee ${summary.deliveryCents} != ${expected} for ${summary.km} km`,
  );
  state.midrandFee = summary.deliveryCents;
  return `${summary.km} km -> ${money(summary.deliveryCents)}`;
});

await check(
  "Checkout uses R10 minimum for a delivery next to the store (Klipfontein View)",
  async () => {
    await customer.locator("#checkout-area").fill("Klipfontein View");
    await customer.waitForTimeout(1500);
    const summary = await readCheckoutSummary(customer);
    assert(summary.deliveryCents === 1000, `fee ${summary.deliveryCents} at ${summary.km} km`);
    await customer.locator("#checkout-area").fill("Midrand");
    await customer.waitForTimeout(1500);
    return `${summary.km ?? 0} km -> ${money(summary.deliveryCents)}`;
  },
);

await check("Tampered item price is refused by the server", () =>
  expecting([409], async () => {
    const result = await customer.evaluate(async (store) => {
      const response = await fetch("/api/payments/ozow/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          vendorId: store.id,
          checkoutKey: crypto.randomUUID(),
          vendorSlug: store.slug,
          destinationSuburb: "Klipfontein View",
          items: [{ itemId: "product-e2e-kota", name: "E2E Loaded Kota", priceCents: 100, qty: 2 }],
          customerName: "Tamper Test",
          customerPhone: "0721112222",
          subtotalCents: 200,
          deliveryCents: 1000,
          riderTipCents: 0,
          totalCents: 1200,
        }),
      });
      return { status: response.status, json: await response.json() };
    }, E2E_STORE);
    assert(result.status === 409, `status ${result.status}`);
    const orders = await prisma.order.count({ where: { totalCents: 1200 } });
    assert(orders === 0, "an order was created");
    return `409 "${result.json.error}", server subtotal ${money(result.json.subtotalCents)}`;
  }),
);

await check("Pay with Ozow creates the order and a signed Ozow link", async () => {
  await customer.getByRole("button", { name: "R 10", exact: true }).first().click(); // R10 tip
  await customer.waitForTimeout(400);
  const summary = await readCheckoutSummary(customer);
  const pay = customer.getByRole("button", { name: /Pay with Ozow/ });
  await pay.click();
  await customer.waitForURL(/pay\.ozow\.com/, { timeout: 30000 });
  const url = new URL(customerCtx.ozowRedirects.at(-1));
  const p = Object.fromEntries(url.searchParams);
  const expectedHash = ozowHash([
    p.SiteCode,
    p.CountryCode,
    p.CurrencyCode,
    p.Amount,
    p.TransactionReference,
    p.BankReference,
    "",
    "",
    "",
    "",
    "",
    "",
    p.CancelUrl,
    p.ErrorUrl,
    p.SuccessUrl,
    p.NotifyUrl,
    p.IsTest,
    OZOW_PRIVATE_KEY,
  ]);
  assert(p.HashCheck === expectedHash, "HashCheck does not verify");
  const order = await prisma.order.findUnique({ where: { publicId: p.TransactionReference } });
  assert(
    order && order.status === "PENDING_PAYMENT" && order.paymentStatus === "PENDING",
    "order not pending",
  );
  assert(
    order.totalCents === summary.totalCents,
    `total ${order.totalCents} != shown ${summary.totalCents}`,
  );
  assert(order.riderTipCents === 1000, `tip ${order.riderTipCents}`);
  state.ozow = { ref: p.TransactionReference, amount: p.Amount, successUrl: p.SuccessUrl, order };
  return `${p.TransactionReference} amount R${p.Amount} (fee ${money(order.deliveryFeeCents)}, tip ${money(order.riderTipCents)})`;
});

await check("Ozow callback with a bad signature is refused", async () => {
  const fields = ozowCallbackBody({
    ref: state.ozow.ref,
    txnId: "TXN-E2E-BAD",
    amount: state.ozow.amount,
  });
  fields.Hash = fields.Hash.replace(/^./, (c) => (c === "A" ? "B" : "A"));
  const res = await postOzow(fields);
  assert(res.status === 400, `status ${res.status}`);
  const order = await prisma.order.findUnique({ where: { publicId: state.ozow.ref } });
  assert(order.paymentStatus === "PENDING", "order changed");
  return `${res.status} ${res.json.error}`;
});

await check("Ozow callback for the wrong amount is refused", async () => {
  const res = await postOzow(
    ozowCallbackBody({ ref: state.ozow.ref, txnId: "TXN-E2E-AMT", amount: "1.00" }),
  );
  assert(res.status === 409, `status ${res.status}`);
  const order = await prisma.order.findUnique({ where: { publicId: state.ozow.ref } });
  assert(order.paymentStatus === "PENDING", "order changed");
  return `${res.status} ${res.json.error}`;
});

await check("Valid Ozow callback marks the order paid", async () => {
  const res = await postOzow(
    ozowCallbackBody({ ref: state.ozow.ref, txnId: "TXN-E2E-1", amount: state.ozow.amount }),
  );
  assert(
    res.status === 200 && res.json.ok && !res.json.duplicate,
    `status ${res.status} ${JSON.stringify(res.json)}`,
  );
  const order = await prisma.order.findUnique({ where: { publicId: state.ozow.ref } });
  assert(
    order.paymentStatus === "PAID" && order.status === "NEW",
    `${order.paymentStatus}/${order.status}`,
  );
  return "PAID / NEW";
});

await check("Repeat Ozow callback is ignored", async () => {
  const res = await postOzow(
    ozowCallbackBody({ ref: state.ozow.ref, txnId: "TXN-E2E-1", amount: state.ozow.amount }),
  );
  assert(
    res.status === 200 && res.json.duplicate === true,
    `status ${res.status} ${JSON.stringify(res.json)}`,
  );
  const other = await postOzow(
    ozowCallbackBody({ ref: state.ozow.ref, txnId: "TXN-E2E-2", amount: state.ozow.amount }),
  );
  assert(other.status === 409, `different txn status ${other.status}`);
  return `duplicate:true; other txn id -> ${other.status}`;
});

await check("Customer returns from Ozow to the success page", async () => {
  await customer.goto(state.ozow.successUrl, { waitUntil: "load" });
  await customer.waitForTimeout(1500);
  const text = await bodyText(customer);
  assert(text.includes(state.ozow.ref), "ref not shown");
  const link = await customer
    .locator(`a[href*="/orders/${state.ozow.ref}"]`)
    .first()
    .getAttribute("href");
  state.ozow.trackUrl = link;
  return `tracking link ${link ? "present" : "missing"}`;
});

await check("Store and admins are notified of the paid order (local catcher only)", async () => {
  const log = await catcherLog();
  const services = log.map((e) => e.service);
  assert(
    log.some((e) => e.service !== "blocked" && String(e.body).includes(state.ozow.ref)),
    "no message mentions the order",
  );
  const blocked = log.filter((e) => e.service === "blocked").map((e) => new URL(e.url).hostname);
  return `resend:${services.filter((s) => s === "resend").length} twilio:${services.filter((s) => s === "twilio").length}${blocked.length ? ` blocked:${[...new Set(blocked)].join(",")}` : ""}`;
});

// ---------- store prepares
await check(
  "Store sees the paid order and taps Accept, Start preparing, Ready for rider",
  async () => {
    const status = await vendorAdvance(vendor, state.ozow.ref);
    assert(status === "READY_FOR_PICKUP" || status === "RIDER_ASSIGNED", `status ${status}`);
    return status;
  },
);

// ---------- riders
await check("Both nearby online riders get the delivery request", async () => {
  const one = await waitForOffer(rider, state.ozow.ref);
  const two = await waitForOffer(rider2, state.ozow.ref, 20000);
  assert(one, "demo rider has no request");
  assert(two, "second rider has no request");
  const offers = await prisma.$queryRawUnsafe(
    `SELECT o.rider_id, o.status, o.wave FROM app_dispatch_offers o JOIN "Order" x ON x.id = o.order_id WHERE x."publicId" = $1`,
    state.ozow.ref,
  );
  return offers.map((o) => `${o.rider_id}:${o.status}:w${o.wave}`).join(", ");
});

await check("First rider to tap Accept gets it; the other rider cannot", () =>
  expecting([409], async () => {
    await riderAccept(rider, state.ozow.ref);
    const order = await prisma.order.findUnique({ where: { publicId: state.ozow.ref } });
    assert(
      order.assignedRiderId === "rider-e2e-demo" && order.status === "RIDER_ASSIGNED",
      `${order.assignedRiderId}/${order.status}`,
    );
    // The second rider's screen still shows the old request until it refreshes: tap Accept there.
    const late = rider2
      .locator("li")
      .filter({ hasText: state.ozow.ref })
      .getByRole("button", { name: "Accept delivery" });
    let lateNote = "request already gone";
    if (await late.isVisible().catch(() => false)) {
      const response = rider2.waitForResponse((r) => r.url().includes(`/api/riders/me/offers/`));
      await late.click();
      const res = await response;
      assert(!res.ok(), "second rider accept succeeded");
      lateNote = `late accept -> ${res.status()}`;
    }
    await go(rider2, "/rider/dashboard");
    const still = await rider2.getByText(state.ozow.ref).count();
    assert(still === 0, "second rider still sees the order");
    const after = await prisma.order.findUnique({ where: { publicId: state.ozow.ref } });
    assert(after.assignedRiderId === "rider-e2e-demo", "assignment changed");
    return lateNote;
  }),
);

await check("Rider sees the customer address and phone after accepting", async () => {
  await go(rider, "/rider/dashboard");
  const item = rider
    .locator("li")
    .filter({ hasText: state.ozow.ref })
    .filter({ hasText: "Deliver to" });
  await item.waitFor({ timeout: 15000 });
  const text = await item.innerText();
  assert(text.includes("Stand 45"), `no address in: ${text.slice(0, 200)}`);
  assert(text.includes("0721112222"), "no phone");
  assert(text.includes("Blue gate"), "no landmark");
  return text.match(/Deliver to [^\n]*/)?.[0];
});

await check("Rider taps Picked up, On the way, Delivered", async () => {
  const status = await riderDeliver(rider, state.ozow.ref);
  assert(status === "DELIVERED", `status ${status}`);
  return status;
});

await check("Rider earnings show delivery fee + tip", async () => {
  await go(rider, "/rider/dashboard");
  await rider.waitForTimeout(1500);
  const order = await prisma.order.findUnique({ where: { publicId: state.ozow.ref } });
  const expected = order.deliveryFeeCents + order.riderTipCents;
  const api = await rider.evaluate(() => fetch("/api/riders/me/earnings").then((r) => r.json()));
  const text = await bodyText(rider);
  const shown = text.match(/Today\s*R\s?([\d.,]+)/);
  const shownCents = shown ? Math.round(Number(shown[1].replace(",", "")) * 100) : null;
  assert(order.riderPayoutCents === expected, `payout ${order.riderPayoutCents} != ${expected}`);
  assert(
    shownCents === expected,
    `dashboard Today shows ${shownCents}, expected ${expected} (api today=${JSON.stringify(api?.today)})`,
  );
  return `${money(expected)} = fee ${money(order.deliveryFeeCents)} + tip ${money(order.riderTipCents)}`;
});

await check("Customer tracking page shows Delivered", async () => {
  assert(state.ozow.trackUrl, "no tracking link");
  await go(customer, state.ozow.trackUrl.replace(BASE, ""));
  await customer.waitForTimeout(1500);
  const text = await bodyText(customer);
  assert(/Delivered/i.test(text), "no Delivered");
  return "Delivered shown";
});

await check("Admin sees the order in Operations", async () => {
  await go(admin, "/admin");
  await admin
    .getByRole("button", { name: /^Operations$/ })
    .first()
    .click();
  await admin.waitForTimeout(2500);
  let text = await bodyText(admin);
  if (!text.includes(state.ozow.ref)) {
    await admin
      .getByRole("button", { name: /^Orders$/ })
      .first()
      .click();
    await admin.waitForTimeout(2500);
    text = await bodyText(admin);
    assert(text.includes(state.ozow.ref), "order not in Operations or Orders");
    return "only in Orders (not in Operations once delivered)";
  }
  return "listed in Operations";
});

// ---------- only real stores are shown
await check("Search shows only stores that really exist", async () => {
  const vendors = await prisma.vendor.findMany({ select: { slug: true } });
  const slugs = new Set(vendors.map((v) => v.slug));
  const bad = [];
  for (const q of ["kota", "airtime", "bread", "chicken", "spaza"]) {
    const json = await fetch(`${BASE}/api/search?q=${q}`, {
      headers: { "user-agent": "LethelaE2E/search" },
    }).then((r) => r.json());
    for (const hit of json.results || []) {
      if (hit.kind !== "category" && hit.slug && !slugs.has(hit.slug))
        bad.push(`${q}->${hit.title} (${hit.slug})`);
    }
  }
  assert(
    bad.length === 0,
    `search returns stores not in the database: ${[...new Set(bad)].slice(0, 4).join("; ")}`,
  );
  return "all hits are real stores";
});

await check("Search hides products that are not approved or are out of stock", async () => {
  const shown = [];
  for (const q of ["unreviewed", "soldout"]) {
    const json = await fetch(`${BASE}/api/search?q=${q}`, {
      headers: { "user-agent": "LethelaE2E/search3" },
    }).then((r) => r.json());
    for (const hit of json.results || [])
      if (/E2E (Unreviewed|Soldout) Pie/.test(hit.title)) shown.push(hit.title);
  }
  assert(shown.length === 0, `search shows: ${shown.join(", ")}`);
  return "hidden";
});

await check("A store that is not in the database is not served (404)", async () => {
  const res = await fetch(`${BASE}/vendors/kasie-market`);
  const text = await res.text();
  assert(
    res.status === 404,
    `/vendors/kasie-market -> ${res.status} (${(text.match(/Add to cart/g) || []).length} "Add to cart" buttons for a store that does not exist)`,
  );
  return "404";
});

await check("Ordering from a non-existent (demo) store fails with a clear message", async () => {
  const ctx = await newContext("demo-store", { viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await go(page, "/vendors/kasie-market");
  const add = page.getByRole("button", { name: /Add to cart/i }).first();
  if (!(await add.isVisible().catch(() => false))) return "store page not shown (ok)";
  await add.click();
  await go(page, "/checkout");
  await fillCheckoutContact(page, {
    name: "Demo Store Test",
    phone: "0748889999",
    area: "Klipfontein View",
  });
  const summary = await readCheckoutSummary(page);
  const pay = page.getByRole("button", { name: /Pay with Ozow|Place order/ }).first();
  let message =
    summary.text.match(
      /(Cart has invalid vendor info[^\n]*|Vendor is unavailable[^\n]*|We could not confirm[^\n]*|could not[^\n]*)/i,
    )?.[0] || "";
  if (await pay.isEnabled().catch(() => false)) {
    await pay.click();
    await page.waitForTimeout(2500);
    message =
      (await bodyText(page)).match(
        /(Vendor is unavailable[^\n]*|Cart has invalid[^\n]*|Some cart items[^\n]*|Please[^\n]*)/,
      )?.[0] || page.url();
  }
  await ctx.close();
  throw new Error(
    `customer could fill a cart from a store that does not exist; checkout said: "${message}"`,
  );
});

// ---------- guest checkout: online payment only (no cash on delivery since 23 Oct 2026)
const guestCtx = await newContext("guest", { viewport: { width: 390, height: 844 } });
const guest = await guestCtx.newPage();
await check("Checkout offers online payment only; the server refuses cash", () =>
  expecting([409], async () => {
    await addToCartAndCheckout(guest, [
      ["E2E Loaded Kota", 1],
      ["E2E Slap Chips", 1],
    ]);
    await fillCheckoutContact(guest, {
      name: "Guest Buyer",
      phone: "0735556666",
      area: "Klipfontein View",
    });
    const text = await bodyText(guest);
    assert(!/Cash on delivery|Order via WhatsApp/i.test(text), "cash or WhatsApp ordering shown");
    assert(
      (await guest.getByRole("button", { name: /Pay with Ozow/ }).count()) === 1,
      "no Pay with Ozow button",
    );
    const summary = await readCheckoutSummary(guest);
    const result = await guest.evaluate(
      async ({ store, total, fee }) => {
        const response = await fetch("/api/payments/ozow/create", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            vendorId: store.id,
            vendorSlug: store.slug,
            checkoutKey: crypto.randomUUID(),
            destinationSuburb: "Klipfontein View",
            items: [
              { itemId: "product-e2e-kota", name: "E2E Loaded Kota", priceCents: 4500, qty: 1 },
            ],
            customerName: "Guest Buyer",
            customerPhone: "0735556666",
            subtotalCents: 4500,
            deliveryCents: fee,
            riderTipCents: 0,
            totalCents: total,
            paymentMethod: "CASH",
          }),
        });
        return { status: response.status, json: await response.json() };
      },
      { store: E2E_STORE, total: summary.totalCents, fee: summary.deliveryCents },
    );
    assert(result.status === 409, `server status ${result.status}`);
    return `only Pay with Ozow shown; cash -> 409 "${result.json.error}"`;
  }),
);

await check("Guest (no account) pays online with Ozow", async () => {
  const text = await bodyText(guest);
  assert(/guest/i.test(text), "no guest checkout wording");
  await guest.getByRole("button", { name: "R 5", exact: true }).first().click();
  await guest.waitForTimeout(400);
  await guest.getByRole("button", { name: /Pay with Ozow/ }).click();
  await guest.waitForURL(/pay\.ozow\.com/, { timeout: 30000 });
  const p = Object.fromEntries(new URL(guestCtx.ozowRedirects.at(-1)).searchParams);
  const ref = p.TransactionReference;
  const res = await postOzow(ozowCallbackBody({ ref, txnId: "TXN-E2E-GUEST", amount: p.Amount }));
  assert(res.status === 200 && res.json.ok, `callback ${res.status}`);
  const order = await prisma.order.findUnique({
    where: { publicId: ref },
    include: { user: true },
  });
  assert(
    order.paymentStatus === "PAID" && order.status === "NEW",
    `${order.paymentStatus}/${order.status}`,
  );
  assert(order.user?.email?.endsWith("@guest.lethela.invalid"), `user ${order.user?.email}`);
  await guest.goto(p.SuccessUrl, { waitUntil: "load" });
  await guest.waitForTimeout(1200);
  state.guest = {
    ref,
    order,
    trackUrl: await guest.locator(`a[href*="/orders/${ref}"]`).first().getAttribute("href"),
  };
  return `${ref} paid ${money(order.totalCents)} (fee ${money(order.deliveryFeeCents)}, tip ${money(order.riderTipCents)})`;
});

await check("Guest order: store accepts, prepares, marks ready", async () => {
  const status = await vendorAdvance(vendor, state.guest.ref);
  return status;
});

await check(
  "Guest order: rider sees request (no cash to collect), accepts and delivers",
  async () => {
    assert(await waitForOffer(rider, state.guest.ref), "no request");
    const text = await bodyText(rider);
    assert(!/Cash on delivery: collect R/.test(text), "cash-to-collect note on a paid order");
    await riderAccept(rider, state.guest.ref);
    await go(rider, "/rider/dashboard");
    const status = await riderDeliver(rider, state.guest.ref);
    assert(status === "DELIVERED", status);
    return status;
  },
);

await check("Guest tracking page shows Delivered", async () => {
  assert(state.guest.trackUrl, "no tracking link");
  await go(guest, state.guest.trackUrl.replace(BASE, ""));
  assert(/Delivered/i.test(await bodyText(guest)), "no Delivered");
  return "ok";
});

await check("Admin Customers lists the guest as Guest", async () => {
  await go(admin, "/admin");
  await admin
    .getByRole("button", { name: /^Customers$/ })
    .first()
    .click();
  await admin.waitForTimeout(2500);
  const row = admin
    .locator("tr:visible, li:visible, article:visible")
    .filter({ hasText: "Guest Buyer" })
    .first();
  await row.waitFor({ timeout: 15000 });
  const text = await row.innerText();
  assert(/Guest/.test(text.replace("Guest Buyer", "")), `row: ${text.slice(0, 160)}`);
  return text.replace(/\s+/g, " ").slice(0, 120);
});

// ---------- customer sign-up, forgot / reset password
const newCustomerCtx = await newContext("new-customer");
const newCustomer = await newCustomerCtx.newPage();
const newCustomerEmail = `e2e.customer.${Date.now()}@lethela.test`;
await check("New customer signs up", async () => {
  await go(newCustomer, "/signup");
  await newCustomer.getByLabel("Email address").fill(newCustomerEmail);
  await newCustomer
    .getByLabel(/password/i)
    .first()
    .fill("FirstPass1");
  const response = newCustomer.waitForResponse((r) => r.url().includes("/api/auth/register"));
  await newCustomer.getByRole("button", { name: "Create account" }).click();
  const res = await response;
  assert(res.ok(), `register ${res.status()}`);
  await newCustomer.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 30000 });
  return "account created and signed in";
});

await check("Forgot password emails a reset link (to the local catcher)", async () => {
  await newCustomerCtx.clearCookies();
  await go(newCustomer, "/forgot-password");
  await newCustomer.getByLabel(/email/i).first().fill(newCustomerEmail);
  const response = newCustomer.waitForResponse((r) =>
    r.url().includes("/api/auth/forgot-password"),
  );
  await newCustomer
    .getByRole("button", { name: /reset|send/i })
    .first()
    .click();
  const res = await response;
  assert(res.ok(), `forgot-password ${res.status()} ${await res.text()}`);
  await newCustomer.waitForTimeout(1000);
  const mail = (await catcherLog())
    .filter((e) => e.service === "resend" && String(e.body).includes(newCustomerEmail))
    .at(-1);
  assert(mail, "no reset email captured");
  const link = JSON.parse(mail.body).text.match(/https?:\/\/\S+reset-password\?token=\S+/)?.[0];
  assert(link && link.startsWith(BASE), `bad link ${link}`);
  state.resetLink = link;
  return "reset email captured";
});

await check("Reset password, then sign in with the new password", async () => {
  await newCustomer.goto(state.resetLink, { waitUntil: "load" });
  const boxes = newCustomer.locator('input[type="password"]');
  const count = await boxes.count();
  for (let i = 0; i < count; i += 1) await boxes.nth(i).fill("SecondPass2");
  const response = newCustomer.waitForResponse((r) => r.url().includes("/api/auth/reset-password"));
  await newCustomer
    .getByRole("button", { name: /reset|save|update|set/i })
    .first()
    .click();
  const res = await response;
  assert(res.ok(), `reset ${res.status()} ${await res.text()}`);
  await newCustomerCtx.clearCookies();
  await signIn(newCustomer, { email: newCustomerEmail, password: "SecondPass2" });
  return "signed in with new password";
});

// ---------- new store sign-up, profile, auto-approval
const newVendorCtx = await newContext("new-vendor");
const newVendor = await newVendorCtx.newPage();
const newVendorEmail = `e2e.store.${Date.now()}@lethela.test`;
await check("New store signs up with store name, WhatsApp number, email and password", async () => {
  await go(newVendor, "/vendors/register");
  await newVendor.getByLabel("Store name").fill("E2E Signup Spaza");
  await newVendor.getByLabel("WhatsApp number").fill("072 999 7777");
  await newVendor.getByLabel("Email address").fill(newVendorEmail);
  await newVendor
    .getByLabel(/password/i)
    .first()
    .fill("StorePass1");
  await newVendor.getByRole("button", { name: "Create vendor account" }).click();
  await newVendor.waitForURL(/\/vendors\/dashboard/, { timeout: 30000 });
  await newVendor.waitForLoadState("load");
  const v = await prisma.vendor.findFirst({ where: { owner: { email: newVendorEmail } } });
  assert(v, "no vendor row");
  assert(v.name === "E2E Signup Spaza", `store name not kept: ${v.name}`);
  assert(v.phone === "072 999 7777", `store phone not kept: ${v.phone}`);
  state.newVendorId = v.id;
  return `vendor ${v.slug} status ${v.status}, name and phone kept`;
});

await check("Admin can remind the unfinished store on WhatsApp or email", async () => {
  await go(admin, "/admin?view=vendors&status=ALL");
  const card = admin.locator("article").filter({ hasText: "E2E Signup Spaza" });
  const whatsapp = card.getByRole("link", { name: "WhatsApp reminder" });
  await whatsapp.waitFor({ timeout: 30000 });
  const href = decodeURIComponent((await whatsapp.getAttribute("href")) || "");
  assert(href.startsWith("https://wa.me/27729997777?text="), `whatsapp link ${href.slice(0, 60)}`);
  assert(/Still needed: .*opening hours/.test(href), "reminder does not list opening hours");
  const email = await card.getByRole("link", { name: "Email reminder" }).getAttribute("href");
  assert(email?.startsWith(`mailto:${newVendorEmail}?`), `email link ${email?.slice(0, 60)}`);
  return "WhatsApp and email reminders list what is missing";
});

await check("New store completes profile, hours and a product in the dashboard", async () => {
  await go(newVendor, "/vendors/dashboard?tab=profile");
  await newVendor.getByLabel("Store name").fill("E2E New Spaza");
  await newVendor.getByLabel("Phone or WhatsApp number").fill("0729998888");
  await newVendor.getByLabel("Street address").fill("Stand 77, Second Street");
  await newVendor.getByLabel("Township or suburb").fill("Klipfontein View");
  await newVendor.getByLabel("City or town").fill("Midrand");
  const province = newVendor.getByLabel(/^Province/);
  if ((await province.evaluate((el) => el.tagName)) === "SELECT")
    await province.selectOption({ label: "Gauteng" });
  else await province.fill("Gauteng");
  let response = newVendor.waitForResponse(
    (r) => /\/api\/vendors/.test(r.url()) && r.request().method() !== "GET",
  );
  await newVendor.getByRole("button", { name: "Save changes" }).click();
  let res = await response;
  assert(res.ok(), `profile save ${res.status()} ${(await res.text()).slice(0, 200)}`);

  await go(newVendor, "/vendors/dashboard?tab=hours");
  await newVendor.getByRole("button", { name: /Reset all days/ }).click();
  response = newVendor.waitForResponse(
    (r) => r.url().includes("/api/vendors/hours") && r.request().method() !== "GET",
  );
  await newVendor.getByRole("button", { name: "Save hours" }).click();
  res = await response;
  assert(res.ok(), `hours save ${res.status()} ${(await res.text()).slice(0, 200)}`);

  // A menu section and a published menu item (no product review needed).
  await go(newVendor, "/vendors/dashboard?tab=menu");
  const menuCard = newVendor.locator("section").filter({ hasText: "Add a menu item" });
  if (await newVendor.getByLabel("Section name").isVisible()) {
    await newVendor.getByLabel("Section name").fill("Bakery");
    response = newVendor.waitForResponse(
      (r) => r.url().endsWith("/api/vendors/menu") && r.request().method() === "POST",
    );
    await newVendor.getByRole("button", { name: "Add", exact: true }).click();
    res = await response;
    assert(res.ok(), `section save ${res.status()}`);
    await newVendor.waitForTimeout(800);
  }
  await menuCard.getByPlaceholder("e.g. Beef kota").fill("E2E Bread");
  await menuCard.getByPlaceholder("e.g. 45.00").fill("18.50");
  response = newVendor.waitForResponse(
    (r) => r.url().includes("/api/vendors/menu/items") && r.request().method() === "POST",
  );
  await newVendor.getByRole("button", { name: "Add item", exact: true }).click();
  res = await response;
  assert(res.ok(), `menu item save ${res.status()} ${(await res.text()).slice(0, 200)}`);
  const v = await prisma.vendor.findUnique({
    where: { id: state.newVendorId },
    include: { _count: { select: { items: true, hours: true } } },
  });
  return `status after saving: ${v.status}, menu items ${v._count.items}, open days ${v._count.hours}`;
});

await check("New store is approved automatically (sweep) and goes live", async () => {
  let v = await prisma.vendor.findUnique({ where: { id: state.newVendorId } });
  let via = "on save";
  if (v.status !== "APPROVED") {
    const status = await runSweep();
    via = `sweep ${status}`;
    v = await prisma.vendor.findUnique({ where: { id: state.newVendorId } });
  }
  assert(
    v.status === "APPROVED" && v.isActive,
    `status ${v.status} active ${v.isActive} reason ${v.reviewReason}`,
  );
  const page = await fetch(`${BASE}/vendors/${v.slug}`).then((r) => r.status);
  const search = await fetch(`${BASE}/api/search?q=${encodeURIComponent("New Spaza")}`, {
    headers: { "user-agent": "LethelaE2E/search2" },
  }).then((r) => r.json());
  const found = (search.results || []).some((hit) => hit.slug === v.slug);
  state.newStoreFoundBySearch = found;
  return `APPROVED (${via}); /vendors/${v.slug} -> ${page}`;
});

await check("New store with only menu items can be found by search", async () => {
  assert(
    state.newStoreFoundBySearch,
    "search for its name does not return it (search only lists stores that have a Product row)",
  );
  return "found";
});

// ---------- new rider sign-up, profile, auto-approval
const newRiderCtx = await newContext("new-rider", { viewport: { width: 390, height: 844 } });
const newRider = await newRiderCtx.newPage();
const newRiderEmail = `e2e.rider.${Date.now()}@lethela.test`;
await check("New rider signs up with name, WhatsApp number, email and password", async () => {
  await go(newRider, "/rider");
  await newRider.getByLabel("Your full name").fill("E2E Signup Rider");
  await newRider.getByLabel("WhatsApp number").fill("0724443333");
  await newRider.getByLabel("Email address").fill(newRiderEmail);
  await newRider
    .getByLabel(/password/i)
    .first()
    .fill("RiderPass1");
  await newRider.getByRole("button", { name: "Create rider account" }).click();
  await newRider.waitForURL(/\/rider\/dashboard/, { timeout: 30000 });
  await newRider.waitForLoadState("load");
  const application = await prisma.riderApplication.findFirst({
    where: { email: newRiderEmail },
  });
  assert(
    application?.fullName === "E2E Signup Rider" && application?.phone === "0724443333",
    `rider name/phone not kept: ${application?.fullName} ${application?.phone}`,
  );
  return newRider.url().replace(BASE, "");
});

await check("New rider completes the profile with the minimum fields", async () => {
  if (!newRider.url().includes("/rider/dashboard/profile"))
    await go(newRider, "/rider/dashboard/profile");
  await newRider.getByLabel("Full name").fill("E2E New Rider");
  await newRider.getByLabel("Phone or WhatsApp number").fill("0724443333");
  await newRider
    .locator("label")
    .filter({ has: newRider.locator('input[value="SCOOTER"]') })
    .click();
  assert(await newRider.locator('input[value="SCOOTER"]').isChecked(), "Scooter not selected");
  await newRider.getByLabel("Township or area").fill("Klipfontein View");
  const province = newRider.getByLabel(/^Province/);
  if ((await province.evaluate((el) => el.tagName)) === "SELECT")
    await province.selectOption({ label: "Gauteng" });
  else await province.fill("Gauteng");
  for (const label of [
    "I have a smartphone and mobile data.",
    "I declare that I may lawfully work in South Africa.",
    "I accept the delivery conduct agreement.",
    "I will verify ID and refuse liquor handover when required.",
  ]) {
    const box = newRider.getByLabel(label);
    if (!(await box.isChecked())) await box.check();
  }
  const response = newRider.waitForResponse(
    (r) => r.url().includes("/api/riders/profile") && r.request().method() !== "GET",
  );
  await newRider
    .getByRole("button", { name: /^(Save|Send)/ })
    .first()
    .click();
  const res = await response;
  assert(res.ok(), `rider profile save ${res.status()} ${(await res.text()).slice(0, 200)}`);
  const app = await prisma.riderApplication.findFirst({ where: { email: newRiderEmail } });
  state.newRiderId = app?.id;
  return `status ${app?.status}`;
});

await check("New rider is approved automatically (sweep)", async () => {
  let app = await prisma.riderApplication.findUnique({ where: { id: state.newRiderId } });
  let via = "on save";
  if (app.status !== "APPROVED") {
    via = `sweep ${await runSweep()}`;
    app = await prisma.riderApplication.findUnique({ where: { id: state.newRiderId } });
  }
  assert(app.status === "APPROVED", `status ${app.status} reason ${app.reviewReason}`);
  await go(newRider, "/rider/dashboard");
  const canGoOnline = await newRider
    .getByRole("button", { name: "Go online" })
    .isEnabled()
    .catch(() => false);
  return `APPROVED (${via}); Go online enabled: ${canGoOnline}`;
});

// ---------- every dashboard tab, collecting errors
await check("Customer pages load without errors", async () => {
  const before = problems.length;
  const summary = await visitTabs(customer, "customer", [
    "/profile",
    "/account",
    "/track",
    "/search?q=kota",
    "/categories/kota",
    "/checkout",
    "/pricing",
  ]);
  const found = problems.slice(before).filter((p) => !p.info);
  assert(
    found.length === 0,
    `${found.length} problems: ${found.map((p) => `${p.kind} ${p.text}`.slice(0, 120)).join(" | ")}`,
  );
  return summary;
});

await check("Every store dashboard tab loads without errors", async () => {
  const before = problems.length;
  const tabs = [
    "overview",
    "orders",
    "menu",
    "profile",
    "hours",
    "specials",
    "team",
    "analytics",
    "payouts",
    "operations",
    "messages",
    "experience",
    "automations",
    "support",
  ];
  const summary = await visitTabs(
    vendor,
    "vendor",
    tabs.map((t) => `/vendors/dashboard?tab=${t}`).concat("/vendors/dashboard/profile"),
  );
  const found = problems.slice(before).filter((p) => !p.info);
  assert(
    found.length === 0,
    `${found.length} problems: ${found.map((p) => `${p.kind} ${p.text}`.slice(0, 120)).join(" | ")}`,
  );
  return summary;
});

await check("Every rider dashboard page loads without errors", async () => {
  const before = problems.length;
  const summary = await visitTabs(rider, "rider", ["/rider/dashboard", "/rider/dashboard/profile"]);
  const found = problems.slice(before).filter((p) => !p.info);
  assert(
    found.length === 0,
    `${found.length} problems: ${found.map((p) => `${p.kind} ${p.text}`.slice(0, 120)).join(" | ")}`,
  );
  return summary;
});

await check("Every admin section loads without errors", async () => {
  const before = problems.length;
  await go(admin, "/admin");
  const sections = [
    "Overview",
    "Operations",
    "Live map",
    "Orders",
    "Vendors",
    "Products",
    "Riders",
    "Customers",
    "Messages",
    "Finance",
    "Activity log",
  ];
  const visited = [];
  for (const name of sections) {
    const button = admin.getByRole("button", { name: new RegExp(`^${name}$`) }).first();
    if (!(await button.isVisible().catch(() => false))) {
      visited.push(`${name}:missing`);
      continue;
    }
    const mark = problems.length;
    await button.click();
    await admin.waitForTimeout(2000);
    visited.push(`${name}${problems.length > mark ? "!" : ""}`);
  }
  for (const url of ["/admin/launch-checklist", "/admin/visitors"]) {
    const mark = problems.length;
    const res = await go(admin, url);
    visited.push(`${url}:${res?.status()}${problems.length > mark ? "!" : ""}`);
  }
  const found = problems.slice(before).filter((p) => !p.info);
  assert(
    found.length === 0,
    `${visited.join(" ")} | ${found.length} problems: ${found.map((p) => `${p.kind} ${p.text}`.slice(0, 120)).join(" | ")}`,
  );
  return visited.join(" ");
});

await check("No email/WhatsApp left this machine (all went to the local catcher)", async () => {
  const log = await catcherLog();
  const counts = {};
  for (const entry of log) counts[entry.service] = (counts[entry.service] || 0) + 1;
  const blockedHosts = [
    ...new Set(log.filter((e) => e.service === "blocked").map((e) => new URL(e.url).hostname)),
  ];
  return `${JSON.stringify(counts)}${blockedHosts.length ? ` blocked hosts: ${blockedHosts.join(",")}` : ""}`;
});

// ---------------------------------------------------------------- report
await browser.close();
await prisma.$disconnect();

const unique = new Map();
for (const problem of problems.filter((p) => !p.info)) {
  const key = `${problem.kind}|${problem.text}`;
  const entry = unique.get(key) || { ...problem, count: 0, urls: new Set() };
  entry.count += 1;
  entry.urls.add(`${problem.role}@${problem.url.replace(BASE, "")}`);
  unique.set(key, entry);
}
console.log("\n==== Summary ====");
for (const result of results)
  console.log(`${result.ok ? "PASS" : "FAIL"} | ${result.name} | ${result.detail}`);
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed.`);
console.log(`\n==== Page errors, console errors, 404s and 5xx (${unique.size} unique) ====`);
for (const entry of unique.values()) {
  console.log(
    `${entry.kind} x${entry.count}: ${entry.text.slice(0, 300)}\n    on ${[...entry.urls].slice(0, 4).join(", ")}`,
  );
}
fs.writeFileSync(
  path.join(SHOTS, "results.json"),
  JSON.stringify(
    { results, problems: [...unique.values()].map((e) => ({ ...e, urls: [...e.urls] })) },
    null,
    2,
  ),
);
if (results.some((r) => !r.ok)) process.exitCode = 1;
