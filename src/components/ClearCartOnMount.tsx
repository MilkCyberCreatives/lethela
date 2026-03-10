"use client";

import { useEffect } from "react";
import { useCart } from "@/store/cart";

export default function ClearCartOnMount() {
  const clear = useCart((state) => state.clear);

  useEffect(() => {
    clear();
  }, [clear]);

  return null;
}
