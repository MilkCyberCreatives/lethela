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
    totalCents: 12999,
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
  };
}
