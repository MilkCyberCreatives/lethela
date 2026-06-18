import test from "node:test";
import assert from "node:assert/strict";
import { buildPublicVendorCard, isPublicCatalogVendor } from "../src/lib/public-catalog";

test("buildPublicVendorCard prefers real review averages over fallback vendor rating", () => {
  const card = buildPublicVendorCard({
    id: "vendor-1",
    name: "Vendor One",
    slug: "vendor-one",
    rating: 4.4,
    cuisine: JSON.stringify(["Burgers"]),
    etaMins: 25,
    products: [{ isAlcohol: false }],
    reviews: [{ rating: 5 }, { rating: 4 }, { rating: 5 }],
  });

  assert.equal(card.rating, 4.7);
  assert.equal(card.eta, "25-30 min");
  assert.deepEqual(card.cuisines, ["Burgers"]);
});

test("isPublicCatalogVendor hides the owner demo identity from public catalog surfaces", () => {
  assert.equal(
    isPublicCatalogVendor({ name: "Milk Cyber Creatives", slug: "milk-cyber-creatives" }),
    false,
  );
  assert.equal(
    isPublicCatalogVendor({ name: "Milk Cyber Creatives Owner", slug: "lethela-owner" }),
    false,
  );
  assert.equal(isPublicCatalogVendor({ name: "Hello Tomato", slug: "hello-tomato" }), true);
});
