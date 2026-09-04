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
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("ERR_ABORTED")) throw error;
    await page.waitForTimeout(250);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  }
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
  // Let the post-login redirect finish before the scenario starts its next
  // navigation. Starting another navigation at the earlier "commit" stage can
  // race the redirect on a cold dev server and make an authenticated profile
  // request arrive without the settled session cookie.
  await page.waitForURL((url) => !url.pathname.startsWith("/signin"), {
    timeout: 60000,
    waitUntil: "domcontentloaded",
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
  const searchPromise = page.waitForResponse((response) =>
    response.url().includes("/api/ai/search"),
  );
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const searchResponse = await searchPromise;
  if (!searchResponse.ok()) throw new Error(`Search API returned ${searchResponse.status()}.`);
  await page.getByText("Search results", { exact: true }).waitFor();
  await gotoStable(page, `${baseUrl}/vendors/hello-tomato`);
  await dismissCookieBanner(page);
  const addButton = page.getByRole("button", { name: /^Add$/ }).first();
  await addButton.waitFor({ state: "visible", timeout: 15000 });
  await addButton.click();
  const cartDialog = page.getByRole("dialog", { name: "Shopping cart" });
  if (!(await cartDialog.getAttribute("class"))?.includes("translate-x-full")) {
    throw new Error("Adding an item opened the cart and blocked continued browsing.");
  }
  const addButtons = page.getByRole("button", { name: /^Add$/ });
  if ((await addButtons.count()) > 1) {
    await addButtons.nth(1).scrollIntoViewIfNeeded();
    await addButtons.nth(1).click();
    if (!(await cartDialog.getAttribute("class"))?.includes("translate-x-full")) {
      throw new Error("Adding another item opened the cart and blocked continued browsing.");
    }
  }
  await page.getByRole("button", { name: "Open cart" }).click();
  await page.waitForFunction(() => {
    const dialog = document.querySelector('[role="dialog"][aria-label="Shopping cart"]');
    return dialog instanceof HTMLElement && dialog.classList.contains("translate-x-0");
  });
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

await scenario("admin signs in directly and reaches vendor approvals", async (page) => {
  await signIn(page, accounts.admin);
  await gotoStable(page, `${baseUrl}/admin`);
  if (!page.url().includes("/admin")) {
    throw new Error(`Admin reached unexpected path: ${page.url()}`);
  }
  const bodyText = await page.locator("body").innerText();
  if (!bodyText.includes("Vendor approvals")) {
    throw new Error("Admin vendor approvals did not render after sign-in.");
  }
});

await scenario("customer registers with a five-character password", async (page) => {
  await gotoStable(page, `${baseUrl}/signup`);
  await dismissCookieBanner(page);
  const email = `e2e.${Date.now()}@lethela.test`;
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Create password").fill("abcde");
  const registrationPromise = page.waitForResponse((response) =>
    response.url().includes("/api/auth/register"),
  );
  await page.getByRole("button", { name: "Create account" }).click();
  const registrationResponse = await registrationPromise;
  if (!registrationResponse.ok()) {
    throw new Error(`Five-character registration returned ${registrationResponse.status()}.`);
  }
  await page.waitForFunction(async () => {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    const session = await response.json();
    return Boolean(session?.user?.id);
  });
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
    const addButtons = await page.getByRole("button", { name: "Add" }).count();
    if (/No approved (live listings|licensed liquor vendors)/i.test(body) || addButtons === 0) {
      emptyCategories.push(slug);
    }
  }
  if (emptyCategories.length) {
    throw new Error(`Categories with no approved listings: ${emptyCategories.join(", ")}`);
  }
});

await scenario("Google sign-in is offered and hands off directly to Google", async (page) => {
  await gotoStable(page, `${baseUrl}/signin`);
  await dismissCookieBanner(page);

  const googleButton = page.getByRole("button", { name: /continue with google/i });
  if (!(await googleButton.isVisible().catch(() => false))) {
    console.log(
      "  (skipped) GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured — Google button hidden.",
    );
    return;
  }

  await Promise.all([
    page.waitForURL(/accounts\.google\.com/, { timeout: 30000, waitUntil: "commit" }),
    googleButton.click(),
  ]);

  const handoff = new URL(page.url());
  if (handoff.hostname !== "accounts.google.com") {
    throw new Error(`Google sign-in did not reach Google: ${page.url()}`);
  }
  const params = handoff.searchParams;
  if (!params.get("client_id")) {
    throw new Error("Google authorization URL is missing client_id.");
  }
  if (params.get("redirect_uri") !== `${baseUrl}/api/auth/callback/google`) {
    throw new Error(`Unexpected Google redirect_uri: ${params.get("redirect_uri")}`);
  }

  // The sign-up surfaces should offer the same option without extra steps.
  for (const path of ["/signup", "/vendors/register", "/rider"]) {
    await gotoStable(page, `${baseUrl}${path}`);
    await dismissCookieBanner(page);
    const signupGoogle = page.getByRole("button", { name: /sign up with google/i });
    if (!(await signupGoogle.isVisible().catch(() => false))) {
      throw new Error(`"Sign up with Google" is missing on ${path}.`);
    }
  }
});

await browser.close();

for (const result of results) {
  console.log(
    `${result.ok ? "[PASS]" : "[FAIL]"} ${result.name}${result.error ? `: ${result.error}` : ""}`,
  );
}

if (results.some((result) => !result.ok)) process.exitCode = 1;
