import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getVendorReadiness, NEW_VENDOR_PLACEHOLDER_NAME } from "../src/lib/vendor-readiness";
import { getRiderReadiness } from "../src/lib/rider-readiness";

test("vendor approval readiness rejects incomplete profiles", () => {
  const base = {
    name: "Local Store",
    email: "owner@example.test",
    phone: "0712345678",
    storeType: "Spaza shop",
    province: "Gauteng",
    city: "Midrand",
    township: "Klipfontein View",
    address: "12 Main Road",
    cuisine: '["Groceries"]',
    operatingHoursCount: 7,
    etaMins: 30,
    productCount: 1,
    bankName: "Bank",
    bankAccountName: "Owner",
    bankAccountNumber: "123456789",
    kycIdUrl: "/api/files?path=private%2Fid.pdf",
    kycProofUrl: "/api/files?path=private%2Fproof.pdf",
  };
  assert.equal(getVendorReadiness(base).canSubmit, true);
  assert.equal(getVendorReadiness({ ...base, productCount: 0 }).canSubmit, false);
  assert.equal(getVendorReadiness({ ...base, phone: "" }).canSubmit, false);
  assert.equal(getVendorReadiness({ ...base, address: null }).canSubmit, false);
  assert.equal(getVendorReadiness({ ...base, operatingHoursCount: 0 }).canSubmit, false);
});

test("vendor approval only needs what an order needs", () => {
  const minimal = getVendorReadiness({
    name: "Mama's Kota Corner",
    phone: "0712345678",
    province: "Gauteng",
    city: "Midrand",
    township: "Klipfontein View",
    address: "12 Main Road",
    operatingHoursCount: 1,
    menuItemCount: 1,
  });
  assert.equal(minimal.canSubmit, true);
  assert.equal(minimal.percent, 100);

  const optional = minimal.checks.filter((check) => !check.required).map((check) => check.key);
  assert.deepEqual(optional.sort(), ["banking", "category", "owner-documents", "preparation-time"]);
});

test("vendor readiness does not accept the sign-up placeholder store name", () => {
  const readiness = getVendorReadiness({
    name: NEW_VENDOR_PLACEHOLDER_NAME,
    phone: "0712345678",
    province: "Gauteng",
    city: "Midrand",
    township: "Klipfontein View",
    address: "12 Main Road",
    operatingHoursCount: 1,
    productCount: 1,
  });
  assert.equal(readiness.canSubmit, false);
  assert.equal(readiness.checks.find((check) => check.key === "store-details")?.complete, false);
});

test("walking rider readiness does not require vehicle documents", () => {
  const ready = getRiderReadiness({
    fullName: "Rider Example",
    phone: "0712345678",
    idNumberLast4: "1234",
    idDocumentUrl: "/api/files?path=private%2Fid.pdf",
    profilePhotoUrl: "/uploads/photo.jpg",
    vehicleType: "WALKING",
    province: "Gauteng",
    municipality: "Johannesburg",
    township: "Alexandra",
    preferredZones: '["Zone 1"]',
    workingDays: '["MONDAY"]',
    startTime: "08:00",
    endTime: "17:00",
    bankAccountName: "Rider Example",
    bankName: "Bank",
    bankAccountNumber: "123456789",
    bankBranchCode: "123456",
    bankAccountType: "SAVINGS",
    hasSmartphone: true,
    lawfulWorkDeclared: true,
    conductAccepted: true,
    liquorIdCheckAccepted: true,
  });
  assert.equal(ready.canSubmit, true);
});

test("rider approval only needs contact details, delivery method, area and the agreement", () => {
  const minimal = {
    fullName: "Rider Example",
    phone: "0712345678",
    vehicleType: "MOTORCYCLE",
    province: "Gauteng",
    township: "Klipfontein View",
    hasSmartphone: true,
    lawfulWorkDeclared: true,
    conductAccepted: true,
    liquorIdCheckAccepted: true,
  };
  const ready = getRiderReadiness(minimal);
  assert.equal(ready.canSubmit, true);
  assert.deepEqual(ready.missing, []);
  assert.ok(ready.later?.includes("Vehicle and licence"));
  assert.ok(ready.later?.includes("Bank account for payouts"));

  assert.equal(getRiderReadiness({ ...minimal, vehicleType: "" }).canSubmit, false);
  assert.equal(getRiderReadiness({ ...minimal, township: "" }).canSubmit, false);
  assert.equal(getRiderReadiness({ ...minimal, phone: "071" }).canSubmit, false);
  assert.equal(getRiderReadiness({ ...minimal, conductAccepted: false }).canSubmit, false);
});

test("an older rider profile keeps its delivery method and area when the rider saves", async () => {
  // Seeded and older profiles can say "Scooter" and keep the area in suburb and city.
  assert.equal(
    getRiderReadiness({ vehicleType: "Scooter" }).checks.find(
      (check) => check.key === "delivery-method",
    )?.complete,
    true,
  );
  const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const [form, route] = await Promise.all([
    source("src/components/rider/RiderProfileForm.tsx"),
    source("src/app/api/riders/profile/route.ts"),
  ]);
  assert.match(
    form,
    /const savedMethod = String\(profile\.vehicleType \?\? ""\)\.toUpperCase\(\);/,
  );
  assert.match(form, /if \(!next\.township && typeof profile\.suburb === "string"\)/);
  assert.match(form, /if \(!next\.municipality && typeof profile\.city === "string"\)/);
  // Saving the same method in capitals is not a change, so an approved rider stays approved.
  assert.match(route, /const vehicleType = data\.vehicleType \|\| current\.vehicleType;/);
  assert.match(route, /replacesExisting\(savedMethod, vehicleType\.toUpperCase\(\)\)/);
});
