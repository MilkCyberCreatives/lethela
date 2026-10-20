export const KASI_REQUEST_ROLE_LABELS = {
  CUSTOMER: "Order",
  STORE: "Sell (store)",
  RIDER: "Deliver (rider)",
} as const;

export type KasiRequestRole = keyof typeof KASI_REQUEST_ROLE_LABELS;
