import test from "node:test";
import assert from "node:assert/strict";
import { buildLaunchNotificationLink, buildWhatsAppSupportLink } from "@/lib/support";

const previousNumber = process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER;

test.after(() => {
  if (previousNumber === undefined) delete process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER;
  else process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER = previousNumber;
});

test("support link uses a clean WhatsApp number and encoded message", () => {
  process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER = "+27 72 390 8919";
  const link = buildWhatsAppSupportLink("Please help me order");
  assert.match(link, /^https:\/\/wa\.me\/27723908919\?text=/);
  assert.equal(decodeURIComponent(new URL(link).searchParams.get("text") || ""), "Please help me order");
});

test("launch notification link contains the selected area without an order total", () => {
  const link = buildLaunchNotificationLink("Klipfontein View");
  const text = decodeURIComponent(new URL(link).searchParams.get("text") || "");
  assert.match(text, /notify me/i);
  assert.match(text, /Klipfontein View/i);
  assert.doesNotMatch(text, /R\s?0\.00|order reference|subtotal/i);
});
