import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";
const executablePath =
  process.env.E2E_CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const widths = (process.env.MOBILE_AUDIT_WIDTHS || "320,360,390,430")
  .split(",")
  .map(Number)
  .filter(Number.isFinite);
const routes = (process.env.MOBILE_AUDIT_ROUTES || "").trim()
  ? process.env.MOBILE_AUDIT_ROUTES.split(",")
  : [
      "/",
      "/categories",
      "/vendors/hello-tomato",
      "/products/product-township-kota",
      "/search",
      "/checkout",
      "/signin",
      "/signup",
      "/vendors/register",
      "/rider",
    ];
const screenshotRoutes = new Set(["/", "/vendors/hello-tomato", "/checkout", "/signin"]);
const outputDir = path.join(tmpdir(), "lethela-mobile-inspection");

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });
const findings = [];

for (const width of widths) {
  const context = await browser.newContext({
    viewport: { width, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
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

  for (const route of routes) {
    const page = await context.newPage();
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("Failed to load resource")) {
        runtimeErrors.push(message.text());
      }
    });

    try {
      const response = await page.goto(`${baseUrl}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await page.waitForLoadState("load", { timeout: 60000 }).catch(() => undefined);
      await page.locator("body").waitFor({ state: "visible", timeout: 15000 });

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
            rect.height > 0
          );
        };
        const describe = (element) => {
          const label =
            element.getAttribute("aria-label") ||
            element.textContent?.trim().replace(/\s+/g, " ") ||
            element.tagName.toLowerCase();
          const rect = element.getBoundingClientRect();
          return `${element.tagName.toLowerCase()}:${label.slice(0, 60)} (${Math.round(rect.left)}..${Math.round(rect.right)})`;
        };
        const hasHorizontalScroller = (element) => {
          let ancestor = element.parentElement;
          while (ancestor && ancestor !== document.body) {
            if (["auto", "scroll"].includes(getComputedStyle(ancestor).overflowX)) return true;
            ancestor = ancestor.parentElement;
          }
          return false;
        };

        const protruding = [...document.body.querySelectorAll("*")]
          .filter(isVisible)
          .filter((element) => {
            const style = getComputedStyle(element);
            if (["fixed", "absolute"].includes(style.position)) return false;
            if (["auto", "scroll"].includes(style.overflowX)) return false;
            if (hasHorizontalScroller(element)) return false;
            const rect = element.getBoundingClientRect();
            if (rect.right <= 0 || rect.left >= viewportWidth) return false;
            return rect.left < -1 || rect.right > viewportWidth + 1;
          })
          .map(describe)
          .slice(0, 12);

        const smallControls = [...document.querySelectorAll("button, input, select, textarea")]
          .filter(isVisible)
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width < 44 || rect.height < 44;
          })
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return `${describe(element)} (${Math.round(rect.width)}x${Math.round(rect.height)})`;
          })
          .slice(0, 12);

        const brokenImages = [...document.images]
          .filter(isVisible)
          .filter((image) => {
            const rect = image.getBoundingClientRect();
            return image.loading !== "lazy" || (rect.top < innerHeight && rect.bottom > 0);
          })
          .filter((image) => !image.complete || image.naturalWidth === 0)
          .map((image) => image.alt || image.currentSrc || image.src)
          .slice(0, 12);

        return {
          viewportWidth,
          documentWidth: document.documentElement.scrollWidth,
          scrollY,
          header: (() => {
            const header = document.querySelector("header");
            if (!header) return null;
            const rect = header.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom, width: rect.width };
          })(),
          protruding,
          smallControls,
          brokenImages,
        };
      });

      findings.push({
        width,
        route,
        status: response?.status() ?? null,
        runtimeErrors,
        ...metrics,
      });

      if (screenshotRoutes.has(route) && (width === 320 || width === 390)) {
        const name = route === "/" ? "home" : route.slice(1).replaceAll("/", "-");
        await page.screenshot({
          path: path.join(outputDir, `${name}-${width}.png`),
          fullPage: false,
        });
      }
    } catch (error) {
      findings.push({
        width,
        route,
        failure: error instanceof Error ? error.message : String(error),
        runtimeErrors,
      });
    } finally {
      await page.close();
    }
  }

  await context.close();
}

await browser.close();

const failures = findings.filter(
  (finding) =>
    finding.failure ||
    finding.status !== 200 ||
    finding.runtimeErrors?.length ||
    finding.documentWidth > finding.viewportWidth + 1 ||
    finding.protruding?.length ||
    finding.smallControls?.length ||
    finding.brokenImages?.length,
);

console.log(JSON.stringify({ outputDir, inspected: findings.length, failures }, null, 2));
if (failures.length > 0) process.exitCode = 1;
