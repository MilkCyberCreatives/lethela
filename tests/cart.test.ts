import test from "node:test";
import assert from "node:assert/strict";
import { sanitizePersistedCartState } from "../src/store/cart";

test("sanitizePersistedCartState removes legacy demo vendor cart items", () => {
  const state = sanitizePersistedCartState({
    vendorLockedTo: "vendor-demo-wings-yard",
    items: [
      {
        itemId: "old-item",
        vendorId: "vendor-demo-wings-yard",
        vendorSlug: "demo-wings-yard",
        name: "Old Wings",
        priceCents: 7999,
        qty: 1,
      },
      {
        itemId: "new-item",
        vendorId: "vendor-hello-tomato",
        vendorSlug: "hello-tomato",
        name: "Hello Tomato Burger",
        priceCents: 8999,
        qty: 1,
      },
    ],
  });

  assert.equal(state.items.length, 1);
  assert.equal(state.items[0].vendorSlug, "hello-tomato");
  assert.equal(state.vendorLockedTo, "vendor-hello-tomato");
});
