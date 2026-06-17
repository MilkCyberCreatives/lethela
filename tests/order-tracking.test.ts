import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTrackingSnapshot,
  getSimulatedRiderPoint,
  normalizeTrackingStatus,
} from "../src/lib/order-tracking";

test("normalizeTrackingStatus maps legacy values into tracking states", () => {
  assert.equal(normalizeTrackingStatus("placed"), "PENDING");
  assert.equal(normalizeTrackingStatus("accepted"), "ACCEPTED");
  assert.equal(normalizeTrackingStatus("picked_up"), "PICKED_UP");
  assert.equal(normalizeTrackingStatus("on_the_way"), "ON_THE_WAY");
  assert.equal(normalizeTrackingStatus("canceled"), "CANCELLED");
  assert.equal(normalizeTrackingStatus("unknown"), "PENDING");
});

test("getSimulatedRiderPoint returns a point between vendor and destination", () => {
  const point = getSimulatedRiderPoint({
    status: "OUT_FOR_DELIVERY",
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    vendor: { lat: -26.0, lng: 28.0 },
    destination: { lat: -26.1, lng: 28.1 },
  });

  assert.ok(point);
  assert.ok(point!.lat < -26.0 && point!.lat > -26.1);
  assert.ok(point!.lng > 28.0 && point!.lng < 28.1);
});

test("buildTrackingSnapshot exposes live rider state when rider coordinates are present", () => {
  const snapshot = buildTrackingSnapshot({
    status: "OUT_FOR_DELIVERY",
    createdAt: new Date().toISOString(),
    vendor: { lat: -26.0, lng: 28.0 },
    destination: { lat: -26.1, lng: 28.1 },
    rider: { lat: -26.05, lng: 28.05 },
  });

  assert.equal(snapshot.status, "OUT_FOR_DELIVERY");
  assert.equal(snapshot.hasLiveRider, true);
  assert.ok(snapshot.progressPct >= 78);
});
