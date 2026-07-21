import test from "node:test";
import assert from "node:assert/strict";
import { getVendorReadiness } from "../src/lib/vendor-readiness";
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
  assert.equal(getVendorReadiness({ ...base, kycIdUrl: null }).canSubmit, false);
  assert.equal(getVendorReadiness({ ...base, productCount: 0 }).canSubmit, false);
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
