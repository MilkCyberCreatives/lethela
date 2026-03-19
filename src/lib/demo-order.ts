export const DEMO_ORDER_REF = "LET-12345";

export function isDemoOrderRef(value: string) {
  return value.trim().toUpperCase() === DEMO_ORDER_REF;
}

export function getDemoOrderSummary() {
  return {
    id: DEMO_ORDER_REF,
    status: "OUT_FOR_DELIVERY" as const,
    eta: "10-15 min",
    vendor: "Hello Tomato",
  };
}

export function getDemoOrderDetails() {
  return {
    id: DEMO_ORDER_REF,
    publicId: DEMO_ORDER_REF,
    status: "OUT_FOR_DELIVERY" as const,
    paymentStatus: "PENDING" as const,
    createdAt: new Date("2026-03-06T12:00:00.000Z"),
    updatedAt: new Date("2026-03-06T12:28:00.000Z"),
    totalCents: 12999,
    items: [
      { itemId: "demo-1", name: "Chicken kota", qty: 1, priceCents: 7999 },
      { itemId: "demo-2", name: "Loaded fries", qty: 1, priceCents: 5000 },
    ],
    vendor: {
      name: "Hello Tomato",
      latitude: -25.9581,
      longitude: 28.1452,
      suburb: "Klipfontein View",
      city: "Midrand",
    },
    destination: {
      lat: -25.9992,
      lng: 28.1263,
    },
    rider: {
      lat: -25.9804,
      lng: 28.1341,
      speed: 32,
      locatedAt: new Date("2026-03-06T12:27:00.000Z"),
      simulated: false,
    },
    tracking: {
      status: "OUT_FOR_DELIVERY" as const,
      statusLabel: "Rider is on the way",
      statusDetail: "Your rider is heading to your drop-off point now.",
      etaLabel: "10-15 min",
      progressPct: 82,
      rider: {
        lat: -25.9804,
        lng: 28.1341,
      },
      hasLiveRider: true,
    },
  };
}
