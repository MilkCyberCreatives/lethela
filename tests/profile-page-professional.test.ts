import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const profilePage = readFileSync("src/app/profile/page.tsx", "utf8");
const profileForm = readFileSync("src/components/profile/UserProfileForm.tsx", "utf8");
const orderHistory = readFileSync("src/components/profile/OrderHistoryPanel.tsx", "utf8");
const experiencePanel = readFileSync("src/components/profile/ProfileExperiencePanel.tsx", "utf8");

test("customer profile uses the professional account shell", () => {
  assert.match(profilePage, /My Lethela account/);
  assert.match(profilePage, /Account menu/);
  assert.match(profilePage, /bg-\[#f5f7fb\]/);
  assert.match(profilePage, /signin\?callbackUrl=\/profile/);
  assert.match(profilePage, /id="profile-details"/);
  assert.match(profilePage, /id="order-history"/);
  assert.match(profilePage, /id="saved-activity"/);
});

test("profile editing does not expose internal image URLs or browser prompts", () => {
  assert.doesNotMatch(profileForm, /Profile photo URL/);
  assert.doesNotMatch(profileForm, /window\.prompt/);
  assert.doesNotMatch(profileForm, /window\.confirm/);
  assert.match(profileForm, /Save changes/);
  assert.match(profileForm, /Confirm account closure request/);
});

test("customer profile keeps operational features mobile friendly", () => {
  assert.match(orderHistory, /Open secure tracking/);
  assert.match(orderHistory, /Get order support/);
  assert.match(experiencePanel, /Reorder shortcuts/);
  assert.match(experiencePanel, /Notification preferences/);
  assert.doesNotMatch(experiencePanel, /label: "Admin alerts"/);
  assert.match(experiencePanel, /role="switch"/);
});
