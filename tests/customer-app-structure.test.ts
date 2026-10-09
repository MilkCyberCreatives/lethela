import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizeCheckoutDetails } from "../src/lib/checkout-details";
import { mobileBottomNavHidden } from "../src/lib/mobile-nav";

const header = readFileSync("src/components/MainHeader.tsx", "utf8");
const bottomNav = readFileSync("src/components/MobileBottomNav.tsx", "utf8");
const checkout = readFileSync("src/app/checkout/page.tsx", "utf8");
const passwordRoute = readFileSync("src/app/api/me/password/route.ts", "utf8");
const profilePage = readFileSync("src/app/profile/page.tsx", "utf8");

test("phone bottom navigation is on shopping pages but not on focused task pages", () => {
  assert.match(header, /<MobileBottomNav cartDrawerAvailable=\{!hideCart\} \/>/);
  assert.match(bottomNav, /md:hidden/);
  for (const label of ["Home", "Search", "Cart", "Orders"]) {
    assert.match(bottomNav, new RegExp(`\\b${label}\\b`));
  }
  for (const path of [
    "/",
    "/search",
    "/categories/kota",
    "/vendors/some-shop",
    "/profile",
    "/track",
  ]) {
    assert.equal(mobileBottomNavHidden(path), false, path);
  }
  for (const path of [
    "/checkout",
    "/checkout/success",
    "/signin",
    "/signup",
    "/vendors/register",
    "/rider",
    "/rider/dashboard",
  ]) {
    assert.equal(mobileBottomNavHidden(path), true, path);
  }
});

test("saved checkout details are trimmed, capped and ignored when empty", () => {
  assert.equal(normalizeCheckoutDetails(null), null);
  assert.equal(normalizeCheckoutDetails({ customerName: "   " }), null);
  const details = normalizeCheckoutDetails({
    customerName: "  Thabo  ",
    customerPhone: "0721234567",
    standNumber: 42,
    deliveryNotes: "x".repeat(600),
  });
  assert.ok(details);
  assert.equal(details.customerName, "Thabo");
  assert.equal(details.standNumber, "");
  assert.equal(details.deliveryNotes.length, 500);
});

test("checkout remembers details on the device and fills signed-in contact details", () => {
  assert.match(checkout, /readCheckoutDetails\(\)/);
  assert.match(checkout, /rememberCheckoutDetails\(\);\s*persistPreferredLocation/);
  assert.match(checkout, /fetch\("\/api\/me"/);
  assert.match(checkout, /Clear details/);
});

test("signed-in users can change their password safely", () => {
  assert.match(profilePage, /id="password"/);
  assert.match(passwordRoute, /compare\(parsed\.data\.currentPassword, user\.passwordHash\)/);
  assert.match(passwordRoute, /AccountPasswordSchema/);
  assert.match(passwordRoute, /sessionVersion: \{ increment: 1 \}/);
  assert.match(passwordRoute, /checkRateLimit/);
});
