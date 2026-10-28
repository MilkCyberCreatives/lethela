import assert from "node:assert/strict";
import test from "node:test";
import { followUpLinks, followUpMessage, whatsAppNumber } from "../src/lib/follow-up";
import { ContactRegistrationSchema } from "../src/lib/registration-schema";

test("follow-up WhatsApp numbers use the South African country code", () => {
  assert.equal(whatsAppNumber("072 123 4567"), "27721234567");
  assert.equal(whatsAppNumber("+27 72 123 4567"), "27721234567");
  assert.equal(whatsAppNumber("721234567"), "27721234567");
  assert.equal(whatsAppNumber(""), null);
  assert.equal(whatsAppNumber("12345"), null);
});

test("a store reminder lists what is missing and links to the dashboard", () => {
  const text = followUpMessage({
    kind: "store",
    name: "Mama's Kota",
    missing: ["Opening hours", "Products or menu"],
  });
  assert.match(text, /^Hi Mama's Kota, this is the Lethela team\./);
  assert.match(text, /Still needed: opening hours, products or menu\./);
  assert.match(text, /\/vendors\/dashboard/);
  // Never quote fees or prices in a reminder.
  assert.doesNotMatch(text, /R\s?\d|\d+\s?%|per km/i);
});

test("the placeholder store name is not used as a greeting", () => {
  assert.match(followUpMessage({ kind: "store", name: "New vendor", missing: [] }), /^Hi there,/);
});

test("follow-up links open WhatsApp and email with the reminder filled in", () => {
  const links = followUpLinks({
    kind: "rider",
    name: "Thabo",
    phone: "0721234567",
    email: "thabo@example.com",
    missing: ["Rider agreement"],
  });
  assert.ok(links.whatsapp?.startsWith("https://wa.me/27721234567?text="));
  assert.match(decodeURIComponent(links.whatsapp ?? ""), /Still needed: rider agreement\./);
  assert.ok(links.email?.startsWith("mailto:thabo@example.com?subject="));
  assert.deepEqual(followUpLinks({ kind: "rider", missing: [] }), { whatsapp: null, email: null });
});

test("store and rider sign-up keep name and phone, and still accept older forms", () => {
  const full = ContactRegistrationSchema.parse({
    email: "store@example.com",
    password: "simple1",
    acceptTerms: true,
    name: "  Mama's Kota ",
    phone: " 072 123 4567 ",
  });
  assert.equal(full.name, "Mama's Kota");
  assert.equal(full.phone, "072 123 4567");
  const old = ContactRegistrationSchema.parse({
    email: "store@example.com",
    password: "simple1",
    acceptTerms: true,
  });
  assert.equal(old.name, "");
  assert.equal(old.phone, "");
  assert.equal(
    ContactRegistrationSchema.safeParse({
      email: "store@example.com",
      password: "simple1",
      acceptTerms: true,
      phone: "123",
    }).success,
    false,
  );
});
