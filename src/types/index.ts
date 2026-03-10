// /src/types/index.ts
export type Vendor = {
  id: string;
  slug: string;
  name: string;
  suburb: string;
  cuisine: string[];
  rating: number;
  deliveryFee: number; // in ZAR
  etaMins: number;     // estimated minutes
  halaal?: boolean;
  image?: string;      // optional hero image
};
