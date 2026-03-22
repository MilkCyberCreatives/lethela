import test from "node:test";
import assert from "node:assert/strict";
import { geocodeSuburb } from "../src/lib/geo";

test("geocodeSuburb resolves known fallback areas", async () => {
  delete process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const point = await geocodeSuburb("Midrand");
  assert.deepEqual(point, { lat: -25.9992, lng: 28.1263 });
});

test("geocodeSuburb returns null for unknown areas when maps lookup is unavailable", async () => {
  delete process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const point = await geocodeSuburb("Some Unknown Area 987654");
  assert.equal(point, null);
});

