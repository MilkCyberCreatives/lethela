import { prisma } from "@/server/db";

export type ProductFeedbackMap = {
  favorites: string[];
  ratings: Record<string, number>;
  comments: Record<string, string>;
};

export type UserExperienceSnapshot = {
  favorites: Array<{
    productId: string;
    productName: string;
    productImage: string | null;
    vendorName: string;
    vendorSlug: string;
    priceCents: number;
    savedAt: string;
  }>;
  recentOrders: Array<{
    id: string;
    publicId: string;
    createdAt: string;
    totalCents: number;
    vendorId: string;
    vendorName: string;
    vendorSlug: string;
    items: Array<{
      productId: string | null;
      itemId: string | null;
      name: string;
      priceCents: number;
      qty: number;
      image: string | null;
    }>;
  }>;
  reviewSummary: {
    totalRatings: number;
    averageRating: number | null;
  };
  pushPreferences: {
    marketingEnabled: boolean;
    orderUpdatesEnabled: boolean;
    recommendationsEnabled: boolean;
    adminAlertsEnabled: boolean;
  };
};

type PushPreferenceInput = {
  marketingEnabled?: boolean;
  orderUpdatesEnabled?: boolean;
  recommendationsEnabled?: boolean;
  adminAlertsEnabled?: boolean;
};

export function isPaidLikeStatus(paymentStatus: string | null | undefined) {
  const normalized = String(paymentStatus || "").toUpperCase();
  return normalized === "PAID" || normalized === "SUCCESS";
}

export async function getUserMealFeedback(userId: string): Promise<ProductFeedbackMap> {
  const [favorites, reviews] = await Promise.all([
    prisma.userFavoriteProduct.findMany({
      where: { userId },
      select: { productId: true },
    }),
    prisma.userProductReview.findMany({
      where: { userId },
      select: {
        productId: true,
        rating: true,
        comment: true,
      },
    }),
  ]);

  return {
    favorites: favorites.map((item) => item.productId),
    ratings: Object.fromEntries(reviews.map((item) => [item.productId, item.rating])),
    comments: Object.fromEntries(
      reviews
        .filter((item) => typeof item.comment === "string" && item.comment.trim().length > 0)
        .map((item) => [item.productId, String(item.comment || "").trim()])
    ),
  };
}

export async function upsertPushPreference(
  visitorId: string,
  userId: string | null | undefined,
  input: PushPreferenceInput
)
{
  const existing = await prisma.pushPreference.findUnique({
    where: { visitorId },
    select: {
      id: true,
      marketingEnabled: true,
      orderUpdatesEnabled: true,
      recommendationsEnabled: true,
      adminAlertsEnabled: true,
    },
  });

  const data = {
    userId: userId || null,
    marketingEnabled: input.marketingEnabled ?? existing?.marketingEnabled ?? false,
    orderUpdatesEnabled: input.orderUpdatesEnabled ?? existing?.orderUpdatesEnabled ?? true,
    recommendationsEnabled: input.recommendationsEnabled ?? existing?.recommendationsEnabled ?? true,
    adminAlertsEnabled: input.adminAlertsEnabled ?? existing?.adminAlertsEnabled ?? false,
  };

  return prisma.pushPreference.upsert({
    where: { visitorId },
    create: {
      visitorId,
      ...data,
    },
    update: data,
    select: {
      marketingEnabled: true,
      orderUpdatesEnabled: true,
      recommendationsEnabled: true,
      adminAlertsEnabled: true,
    },
  });
}

export async function getUserExperienceSnapshot(userId: string, visitorId?: string | null): Promise<UserExperienceSnapshot> {
  const [favorites, orders, reviews, pushPreference] = await Promise.all([
    prisma.userFavoriteProduct.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        createdAt: true,
        product: {
          select: {
            id: true,
            name: true,
            image: true,
            priceCents: true,
            vendor: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    }),
    prisma.order.findMany({
      where: {
        userId,
        paymentStatus: { in: ["PAID", "SUCCESS"] },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        publicId: true,
        createdAt: true,
        totalCents: true,
        itemsJson: true,
        vendor: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    }),
    prisma.userProductReview.findMany({
      where: { userId },
      select: { rating: true },
    }),
    visitorId
      ? prisma.pushPreference.findUnique({
          where: { visitorId },
          select: {
            marketingEnabled: true,
            orderUpdatesEnabled: true,
            recommendationsEnabled: true,
            adminAlertsEnabled: true,
          },
        })
      : Promise.resolve(null),
  ]);

  const averageRating =
    reviews.length > 0 ? Number((reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length).toFixed(1)) : null;

  return {
    favorites: favorites.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      productImage: item.product.image || null,
      vendorName: item.product.vendor.name,
      vendorSlug: item.product.vendor.slug,
      priceCents: item.product.priceCents,
      savedAt: item.createdAt.toISOString(),
    })),
    recentOrders: orders.map((order) => {
      const items = (() => {
        try {
          const parsed = JSON.parse(order.itemsJson || "[]");
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();

      return {
        id: order.id,
        publicId: order.publicId,
        createdAt: order.createdAt.toISOString(),
        totalCents: order.totalCents,
        vendorId: order.vendor.id,
        vendorName: order.vendor.name,
        vendorSlug: order.vendor.slug,
        items: items.map((item: Record<string, unknown>) => ({
          productId: typeof item.productId === "string" ? item.productId : null,
          itemId: typeof item.itemId === "string" ? item.itemId : null,
          name: String(item.name || "Item"),
          priceCents: Number(item.priceCents || 0),
          qty: Math.max(1, Number(item.qty || 1)),
          image: typeof item.image === "string" ? item.image : null,
        })),
      };
    }),
    reviewSummary: {
      totalRatings: reviews.length,
      averageRating,
    },
    pushPreferences: {
      marketingEnabled: pushPreference?.marketingEnabled ?? false,
      orderUpdatesEnabled: pushPreference?.orderUpdatesEnabled ?? true,
      recommendationsEnabled: pushPreference?.recommendationsEnabled ?? true,
      adminAlertsEnabled: pushPreference?.adminAlertsEnabled ?? false,
    },
  };
}

export async function getVendorTrustSnapshot(vendorId: string) {
  const [reviewAgg, reviewCount, orderCount, recentReviews] = await Promise.all([
    prisma.userProductReview.aggregate({
      where: { vendorId },
      _avg: { rating: true },
    }),
    prisma.userProductReview.count({
      where: { vendorId },
    }),
    prisma.order.count({
      where: {
        vendorId,
        paymentStatus: { in: ["PAID", "SUCCESS"] },
      },
    }),
    prisma.userProductReview.findMany({
      where: {
        vendorId,
        comment: {
          not: null,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: {
        rating: true,
        comment: true,
        updatedAt: true,
        user: {
          select: {
            name: true,
          },
        },
        product: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  return {
    averageRating: reviewAgg._avg.rating != null ? Number(reviewAgg._avg.rating.toFixed(1)) : null,
    reviewCount,
    orderCount,
    recentReviews: recentReviews.map((item) => ({
      rating: item.rating,
      comment: String(item.comment || "").trim(),
      updatedAt: item.updatedAt,
      userName: item.user.name || "Customer",
      productName: item.product.name,
    })),
  };
}
