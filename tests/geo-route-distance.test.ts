import test from "node:test";
import assert from "node:assert/strict";
import { haversineKm, routeDistance } from "@/lib/geo";

const previousServerKey = process.env.GOOGLE_MAPS_API_KEY;
const previousPublicKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

test.beforeEach(() => {
  delete process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
});

test.after(() => {
  if (previousServerKey === undefined) delete process.env.GOOGLE_MAPS_API_KEY;
  else process.env.GOOGLE_MAPS_API_KEY = previousServerKey;

  if (previousPublicKey === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  else process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = previousPublicKey;
});

test("routeDistance falls back to a conservative road estimate without Google Routes", async () => {
  const origin = { lat: -25.9581, lng: 28.1452 };
  const destination = { lat: -25.9992, lng: 28.1263 };
  const straightLine = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng);
  const result = await routeDistance(origin, destination);

  assert.equal(result.source, "ESTIMATED");
  assert.ok(result.distanceKm >= straightLine);
  assert.ok(result.durationMin && result.durationMin > 0);
});
