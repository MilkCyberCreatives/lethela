import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

// National plan (20 Oct 2026): record which township people want Lethela in next.
test("the homepage and area page ask which kasi wants Lethela next", async () => {
  const [home, area, form, route] = await Promise.all([
    source("src/app/page.tsx"),
    source("src/app/areas/klipfontein-view/page.tsx"),
    source("src/components/BringLethelaForm.tsx"),
    source("src/app/api/kasi-requests/route.ts"),
  ]);
  assert.match(home, /<BringLethelaForm \/>/);
  assert.match(area, /<BringLethelaForm \/>/);
  assert.match(form, /Want Lethela in your kasi\?/);
  assert.match(form, /\/api\/kasi-requests/);
  // No delivery promise outside the pilot area.
  assert.match(form, /open in Klipfontein View/);
  assert.match(route, /recipientType: "KASI_REQUEST"/);
  assert.match(route, /checkRateLimit/);
  assert.match(route, /notifyStaff/);
});

test("admins see support and kasi requests under Messages, apart from sent messages", async () => {
  const [admin, panel, messagesRoute, store, support] = await Promise.all([
    source("src/app/admin/page.tsx"),
    source("src/components/admin/AdminPublicRequests.tsx"),
    source("src/app/api/admin/messages/route.ts"),
    source("src/lib/platform-messages.ts"),
    source("src/app/api/support/cases/route.ts"),
  ]);
  assert.match(admin, /view === "messages" \? <AdminPublicRequests \/>/);
  assert.match(panel, /\/api\/admin\/messages\?kind=public/);
  assert.match(messagesRoute, /: "sent"/);
  assert.match(store, /PUBLIC_REQUEST_TYPES = \["SUPPORT_CASE", "KASI_REQUEST"\]/);
  assert.match(support, /notifyStaff/);
});

test("public forms keep the form element before awaiting, so a sent form never shows an error", async () => {
  for (const path of [
    "src/components/SupportCaseForm.tsx",
    "src/components/BringLethelaForm.tsx",
  ]) {
    const text = await source(path);
    assert.doesNotMatch(text, /event\.currentTarget\.reset\(\)/);
    assert.match(text, /formElement\.reset\(\)/);
  }
});
