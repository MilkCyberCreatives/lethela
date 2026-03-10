// /components/MenuSectionList.tsx
"use client";

import MealPreferenceControls from "@/components/MealPreferenceControls";
import { Button } from "@/components/ui/button";
import { formatZAR } from "@/lib/format";
import { useCart } from "@/store/cart";
import { useUIStore } from "@/store/ui";

type Item = {
  id: string;
  vendorId: string;
  name: string;
  description?: string | null;
  priceCents: number;
  tags: string[];
  image?: string | null;
};

type Section = {
  id: string;
  title: string;
  items: Item[];
};

export default function MenuSectionList({
  vendorId,
  vendorSlug,
  deliveryFeeCents,
  sections,
}: {
  vendorId: string;
  vendorSlug: string;
  deliveryFeeCents: number;
  sections: Section[];
}) {
  const add = useCart((s) => s.add);
  const openCart = useUIStore((s) => s.openCart);

  return (
    <div className="space-y-8">
      {sections.map((s) => (
        <div key={s.id} id={s.id} className="scroll-mt-24">
          <h3 className="text-lg font-semibold">{s.title}</h3>
          <div className="mt-3 space-y-3">
            {s.items.map((it) => (
              <div key={it.id} className="flex items-start justify-between rounded-lg border border-white/10 p-3">
                <div className="pr-3">
                  <div className="font-medium">{it.name}</div>
                  {it.description && <div className="mt-1 text-sm text-white/70">{it.description}</div>}
                  <div className="mt-1 text-sm text-white/80">{formatZAR(it.priceCents)}</div>
                  <div className="mt-3">
                    <MealPreferenceControls itemId={it.id} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    className="bg-lethela-primary"
                    onClick={() => {
                      add(
                        {
                          itemId: it.id,
                          vendorId: it.vendorId || vendorId,
                          vendorSlug,
                          deliveryFeeCents,
                          name: it.name,
                          priceCents: it.priceCents,
                          image: it.image ?? undefined,
                        },
                        1,
                      );
                      openCart();
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
