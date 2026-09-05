import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";
const executablePath =
  process.env.E2E_CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outputDir = path.join(tmpdir(), "lethela-dashboard-inspection");
const viewports = [
  { name: "phone-320", width: 320, height: 844 },
  { name: "phone-390", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
];
const dashboards = [
  {
    role: "customer",
    email: "demo.customer@lethela.test",
    password: "DemoBuyer2026",
    route: "/profile",
    marker: "#profile-details",
  },
  {
    role: "vendor",
    email: "demo@lethela.co.za",
    password: "DemoVendor123!",
    route: "/vendors/dashboard",
    marker: "main",
  },
  {
    role: "rider",
    email: "demo.rider@lethela.test",
    password: "DemoRider2026",
    route: "/rider/dashboard",
    marker: "main",
  },
  {
    role: "admin",
    email: "admin@lethela.co.za",
    password: "AdminDemo123!",
    route: "/admin?view=overview",
    marker: "main",
  },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });
const findings = [];

async function gotoStable(page, route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("load", { timeout: 60000 }).catch(() => undefined);
  await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
}

async function signIn(page, account) {
  await gotoStable(page, "/signin");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  const callback = page.waitForResponse((response) =>
    response.url().includes("/api/auth/callback/credentials"),
  );
  await page.getByRole("button", { name: "Sign in" }).click();
  const response = await callback;
  if (!response.ok()) throw new Error(`${account.role} sign-in returned ${response.status()}`);
  await page.waitForFunction(async () => {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    const session = await response.json();
    return Boolean(session?.user?.id);
  });
}

for (const dashboard of dashboards) {
  const context = await browser.newContext({ viewport: viewports[1] });
  await context.addInitScript(() => {
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
  });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) {
      runtimeErrors.push(message.text());
    }
  });

  try {
    await signIn(page, dashboard);
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await gotoStable(page, dashboard.route);
      await page.locator(dashboard.marker).first().waitFor({ state: "visible", timeout: 15000 });

      const metrics = await page.evaluate(() => {
        const viewportWidth = document.documentElement.clientWidth;
        const isVisible = (element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            Number(style.opacity) !== 0 &&
            rect.width > 0 &&
            rect.height > 0 &&
            rect.right > 0 &&
            rect.left < viewportWidth
          );
        };
        const controls = [
          ...document.querySelectorAll("button, input, select, textarea, [role='button']"),
        ]
          .filter(isVisible)
          .map((element) => {
            const rect = element.getBoundingClientRect();
            const label =
              element.getAttribute("aria-label") ||
              element.textContent?.trim().replace(/\s+/g, " ");
            return {
              label: label?.slice(0, 60) || element.tagName.toLowerCase(),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            };
          });
        return {
          title: document.title,
          heading: document.querySelector("h1")?.textContent?.trim() || null,
          viewportWidth,
          documentWidth: document.documentElement.scrollWidth,
          smallControls: controls.filter((control) => control.width < 44 || control.height < 44),
        };
      });

      findings.push({
        role: dashboard.role,
        viewport: viewport.name,
        path: new URL(page.url()).pathname,
        runtimeErrors: [...runtimeErrors],
        ...metrics,
      });
      runtimeErrors.length = 0;
      await page.screenshot({
        path: path.join(outputDir, `${dashboard.role}-${viewport.name}.png`),
        fullPage: false,
      });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoStable(page, dashboard.route);
    if (dashboard.role === "customer") {
      await page.getByRole("link", { name: "Order history", exact: true }).click();
      await page.locator("#order-history").waitFor({ state: "visible" });
      if (new URL(page.url()).hash !== "#order-history") {
        throw new Error("Customer dashboard navigation did not move to order history");
      }
    } else if (dashboard.role === "vendor") {
      await page.locator('a[href="/vendors/dashboard?tab=orders"]').first().click();
      await page.waitForURL((url) => url.searchParams.get("tab") === "orders");
      await page.getByRole("heading", { name: "Orders", exact: true }).waitFor();
    } else if (dashboard.role === "rider") {
      await page.getByRole("link", { name: /Profile & documents/ }).click();
      await page.waitForURL((url) => url.pathname === "/rider/dashboard/profile");
      await page
        .getByRole("heading", { name: /Profile/ })
        .first()
        .waitFor();
    } else if (dashboard.role === "admin") {
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      await page.getByRole("button", { name: "Vendor approvals", exact: true }).click();
      await page.getByText("Vendor approvals", { exact: true }).last().waitFor();
    }
    if (runtimeErrors.length) throw new Error(runtimeErrors.join("\n"));
  } catch (error) {
    findings.push({
      role: dashboard.role,
      failure: error instanceof Error ? error.message : String(error),
      runtimeErrors,
    });
  } finally {
    await context.close();
  }
}

await browser.close();

const failures = findings.filter(
  (finding) =>
    finding.failure ||
    finding.runtimeErrors?.length ||
    finding.documentWidth > finding.viewportWidth + 1 ||
    finding.smallControls?.length,
);
console.log(JSON.stringify({ outputDir, inspected: findings.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
