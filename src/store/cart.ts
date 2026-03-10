// /src/store/cart.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  itemId: string;
  vendorId: string;
  vendorSlug: string;
  deliveryFeeCents?: number | null;
  name: string;
  priceCents: number;
  qty: number;
  image?: string | null;
};

type CartState = {
  items: CartItem[];
  vendorLockedTo?: string | null; // only one vendor at a time (MVP)
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  inc: (itemId: string) => void;
  dec: (itemId: string) => void;
  remove: (itemId: string) => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      vendorLockedTo: null,
      add: (item, qty = 1) => {
        const st = get();
        // One-vendor-only rule (simplifies delivery fees)
        if (st.vendorLockedTo && st.vendorLockedTo !== item.vendorId) {
          // reset cart for a new vendor
          set({ items: [], vendorLockedTo: null });
        }
        const existing = st.items.find((i) => i.itemId === item.itemId);
        if (existing) {
          existing.qty += qty;
          set({ items: [...st.items] });
        } else {
          set({
            items: [...st.items, { ...item, qty }],
            vendorLockedTo: item.vendorId,
          });
        }
      },
      inc: (itemId) => {
        const st = get();
        const it = st.items.find((i) => i.itemId === itemId);
        if (it) {
          it.qty += 1;
          set({ items: [...st.items] });
        }
      },
      dec: (itemId) => {
        const st = get();
        const it = st.items.find((i) => i.itemId === itemId);
        if (it) {
          it.qty -= 1;
          if (it.qty <= 0) {
            set({ items: st.items.filter((i) => i.itemId !== itemId) });
          } else {
            set({ items: [...st.items] });
          }
          if (get().items.length === 0) set({ vendorLockedTo: null });
        }
      },
      remove: (itemId) => {
        const st = get();
        const next = st.items.filter((i) => i.itemId !== itemId);
        set({ items: next });
        if (next.length === 0) set({ vendorLockedTo: null });
      },
      clear: () => set({ items: [], vendorLockedTo: null }),
      subtotal: () => get().items.reduce((sum, i) => sum + i.priceCents * i.qty, 0),
      count: () => get().items.reduce((sum, i) => sum + i.qty, 0),
    }),
    {
      name: "lethela_cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (st) => ({ items: st.items, vendorLockedTo: st.vendorLockedTo }),
    },
  ),
);
