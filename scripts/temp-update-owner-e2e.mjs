import fs from "node:fs";

const file = "scripts/e2e-demo.mjs";
let text = fs.readFileSync(file, "utf8");

const oldBlock = `  const adminKey = process.env.ADMIN_APPROVAL_KEY?.trim();
  if (!adminKey) throw new Error("ADMIN_APPROVAL_KEY is required for the admin E2E scenario.");
  await page.getByPlaceholder("Enter admin approval key").fill(adminKey);
  await page.getByRole("button", { name: "Continue with key" }).click();`;

const newBlock = `  await page.getByRole("button", { name: "Continue to admin" }).click();`;

const matches = text.split(oldBlock).length - 1;
if (matches !== 1) {
  throw new Error(`Expected exactly one old owner-access E2E block, found ${matches}.`);
}

text = text.replace(oldBlock, newBlock);
fs.writeFileSync(file, text);
console.log("Updated owner access E2E scenario for normal authorised owner flow.");
