import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";
const executablePath =
  process.env.E2E_CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const accounts = {
  customer: ["demo.customer@lethela.test", "DemoBuyer2026"],
  vendor: ["demo@lethela.co.za", "DemoVendor123!"],
  rider: ["demo.rider@lethela.test", "DemoRider2026"],
  admin: ["admin@lethela.co.za", "AdminDemo123!"],
};

const browser = await chromium.launch({ executablePath, headless: true });
const results = [];

// The Next dev server keeps an HMR websocket and analytics beacons open, so the
// page never reaches Playwright's "networkidle" state. Navigate on
// "domcontentloaded" and then wait for the load event plus the main landmark.
async function gotoStable(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  // A cold dev compile can push the load event past the default 30s budget.
  await page.waitForLoadState("load", { timeout: 60000 }).catch(() => {});
  await page
    .locator("body")
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => {});
}

async function scenario(name, run, viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  // Only uncaught JS errors and app-emitted console errors should fail a
  // scenario. Browser-generated "Failed to load resource" lines for background
  // network 404s (favicons, optional data lookups against drifted local seed
  // data) are logged for visibility but are not assertion failures.
  const isBenignConsoleError = (text) =>
    text.includes("ExperimentalWarning") ||
    text.includes("Failed to load resource") ||
    text.includes("favicon");
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (isBenignConsoleError(text)) {
      console.log(`  (ignored console error) ${text}`);
      return;
    }
    errors.push(`console: ${text}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));

  try {
    await run(page);
    if (errors.length) throw new Error(errors.join("\n"));
    results.push({ name, ok: true });
  } catch (error) {
    results.push({
      name,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await context.close();
  }
}

async function signIn(page, [email, password]) {
  await gotoStable(page, `${baseUrl}/signin`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const callbackPromise = page.waitForResponse((response) =>
    response.url().includes("/api/auth/callback/credentials"),
  );
  await page.getByRole("button", { name: "Sign in" }).click();
  const callbackResponse = await callbackPromise;
  const callbackBody = await callbackResponse.text();
  if (!callbackResponse.ok() || callbackBody.includes("CredentialsSignin")) {
    // The demo credentials are valid, so a CredentialsSignin here almost always
    // means the auth-login rate limiter (10 attempts / 15 min per client) has
    // tripped from running this suite repeatedly. Restart the dev server for a
    // clean in-memory bucket, or wait out the window.
    throw new Error(
      `Sign-in callback failed for ${email}: ${callbackBody} ` +
        `(if credentials are known-good, the login rate limit is likely tripped — ` +
        `restart the dev server or wait 15 minutes)`,
    );
  }
  await page.waitForFunction(async () => {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    const session = await response.json();
    return Boolean(session?.user?.id);
  });
  // Wait for the client-side redirect away from /signin to commit. Only wait for
  // the URL change here (not the full load) because the role dashboards can take
  // a while to compile on a cold dev server; the caller navigates explicitly and
  // waits on real elements afterwards.
  await page.waitForURL((url) => !url.pathname.startsWith("/signin"), {
    timeout: 60000,
    waitUntil: "commit",
  });
}

async function dismissCookieBanner(page) {
  const decline = page.getByRole("button", { name: "Decline" });
  try {
    await decline.waitFor({ state: "visible", timeout: 2000 });
    await decline.click();
  } catch {
    // Consent was already saved or the banner is not present on this route.
  }
}

await scenario("mobile browse, search, cart and guest checkout", async (page) => {
  await gotoStable(page, baseUrl);
  await dismissCookieBanner(page);
  if (!(await page.locator("body").innerText()).includes("Lethela")) {
    throw new Error("Homepage did not render Lethela content.");
  }
  await page.getByPlaceholder(/Search kota, groceries/i).fill("burger");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByText("Search results", { exact: true }).waitFor();
  await gotoStable(page, `${baseUrl}/vendors/hello-tomato`);
  await dismissCookieBanner(page);
  const addButton = page.getByRole("button", { name: /^Add$/ }).first();
  await addButton.waitFor({ state: "visible", timeout: 15000 });
  await addButton.click();
  const cartDialog = page.getByRole("dialog", { name: "Shopping cart" });
  if (!(await cartDialog.isVisible())) {
    await page.getByRole("button", { name: "Open cart" }).click();
  }
  await page.getByRole("link", { name: "Checkout", exact: true }).last().click();
  await page.waitForURL((url) => url.pathname.startsWith("/checkout"));
  await page.waitForLoadState("load");
  await page.getByLabel(/Customer name/i).fill("DEMO Buyer");
  await page.getByLabel(/Phone number/i).fill("0720000000");
  if (!(await page.locator("body").innerText()).includes("order as a guest")) {
    throw new Error("Guest checkout guidance is missing.");
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  if (overflow) throw new Error("Checkout has horizontal overflow at 390px.");
});

await scenario("customer sign-in and profile access", async (page) => {
  await signIn(page, accounts.customer);
  await gotoStable(page, `${baseUrl}/profile`);
  if (page.url().includes("/signin")) {
    throw new Error("Customer was redirected away from profile.");
  }
  // The authenticated profile page renders the account details form section.
  await page
    .locator("#profile-details")
    .waitFor({ timeout: 15000 })
    .catch(() => {
      throw new Error("Profile account section did not render for the signed-in customer.");
    });
});

await scenario("vendor sign-in and dashboard access", async (page) => {
  await signIn(page, accounts.vendor);
  await gotoStable(page, `${baseUrl}/vendors/dashboard`);
  if (!page.url().includes("/vendors/dashboard")) {
    throw new Error(`Vendor reached unexpected path: ${page.url()}`);
  }
  await page
    .getByText("Dashboard", { exact: true })
    .first()
    .waitFor({ timeout: 15000 })
    .catch(() => {
      throw new Error("Vendor dashboard did not render.");
    });
});

await scenario("rider sign-in and dashboard access", async (page) => {
  await signIn(page, accounts.rider);
  await gotoStable(page, `${baseUrl}/rider/dashboard`);
  if (!page.url().includes("/rider/dashboard")) {
    throw new Error(`Rider reached unexpected path: ${page.url()}`);
  }
  await page
    .getByText(/Rider/)
    .first()
    .waitFor({ timeout: 15000 })
    .catch(() => {
      throw new Error("Rider dashboard did not render.");
    });
});

await scenario("admin remains behind owner-access verification", async (page) => {
  await signIn(page, accounts.admin);
  if (!page.url().includes("/owner-access")) {
    throw new Error(`Admin bypassed owner verification: ${page.url()}`);
  }
  // The app gates /admin with a redirect to /owner-access (authz is enforced in
  // the server component, never via a bare 403), so an unverified admin must be
  // bounced there and must not see the admin dashboard shell.
  await gotoStable(page, `${baseUrl}/admin`);
  if (!page.url().includes("/owner-access")) {
    throw new Error(`Unverified admin was not redirected to owner-access: ${page.url()}`);
  }
  const bodyText = await page.locator("body").innerText();
  if (!bodyText.includes("Private admin entry")) {
    throw new Error("Owner-access verification page did not render for unverified admin.");
  }
  if (bodyText.includes("Operations queue")) {
    throw new Error("Unverified admin rendered the admin dashboard.");
  }
});

await scenario("every township category page shows approved listings", async (page) => {
  const categorySlugs = [
    "kota",
    "chips",
    "burger",
    "mogodu",
    "groceries",
    "liquor",
    "drinks",
    "snacks",
    "wings",
    "braai",
    "pizza",
    "chicken",
    "breakfast",
  ];
  const emptyCategories = [];
  for (const slug of categorySlugs) {
    await gotoStable(page, `${baseUrl}/categories/${slug}`);
    if (slug === "liquor") {
      // Clear the 18+ age gate so the listing grid is not hidden behind it.
      await page
        .getByRole("button", { name: /I am 18/i })
        .click({ timeout: 4000 })
        .catch(() => {});
      await page.waitForLoadState("load");
    }
    const body = await page.locator("body").innerText();
    if (/No approved (live listings|licensed liquor vendors)/i.test(body)) {
      emptyCategories.push(slug);
    }
  }
  if (emptyCategories.length) {
    throw new Error(`Categories with no approved listings: ${emptyCategories.join(", ")}`);
  }
});

await browser.close();

for (const result of results) {
  console.log(
    `${result.ok ? "[PASS]" : "[FAIL]"} ${result.name}${result.error ? `: ${result.error}` : ""}`,
  );
}

if (results.some((result) => !result.ok)) process.exitCode = 1;
