import fs from "node:fs";

const path = "scripts/e2e-demo.mjs";
let text = fs.readFileSync(path, "utf8");

function replaceOnce(oldText, newText, label) {
  const matches = text.split(oldText).length - 1;
  if (matches !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${matches}`);
  }
  text = text.replace(oldText, newText);
}

replaceOnce(
  'await scenario("admin signs in directly and reaches vendor approvals", async (page) => {',
  'await scenario("admin completes owner verification and reaches vendor approvals", async (page) => {',
  "admin scenario title",
);

replaceOnce(
  '  if (!page.url().includes("/admin")) {\n    throw new Error(`Admin reached unexpected path: ${page.url()}`);\n  }\n',
  '  if (!page.url().includes("/owner-access")) {\n    throw new Error(`Admin did not reach owner verification: ${page.url()}`);\n  }\n  const adminKey = process.env.ADMIN_APPROVAL_KEY?.trim();\n  if (!adminKey) throw new Error("ADMIN_APPROVAL_KEY is required for the admin E2E scenario.");\n  await page.getByPlaceholder("Enter admin approval key").fill(adminKey);\n  await page.getByRole("button", { name: "Continue with key" }).click();\n  await page.waitForURL((url) => url.pathname.startsWith("/admin"), {\n    timeout: 30000,\n    waitUntil: "domcontentloaded",\n  });\n',
  "admin owner-verification flow",
);

replaceOnce(
  'await scenario("customer registers with a five-character password", async (page) => {',
  'await scenario("customer registers with a six-character password", async (page) => {',
  "registration scenario title",
);
replaceOnce(
  '  await page.getByLabel("Create password").fill("abcde");',
  '  await page.getByLabel("Create password").fill("abcdef");',
  "registration password",
);
replaceOnce(
  '    throw new Error(`Five-character registration returned ${registrationResponse.status()}.`);',
  '    throw new Error(`Six-character registration returned ${registrationResponse.status()}.`);',
  "registration error text",
);

fs.writeFileSync(path, text);
console.log("Updated E2E expectations for owner verification and six-character passwords.");
