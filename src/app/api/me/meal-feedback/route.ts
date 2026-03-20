import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getUserMealFeedback } from "@/lib/customer-experience";
import { prisma } from "@/server/db";

const MealFeedbackSchema = z.object({
  productId: z.string().trim().min(1),
  favorite: z.boolean().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(280).optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const feedback = await getUserMealFeedback(session.user.id);
  return NextResponse.json({ ok: true, feedback });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = MealFeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid meal feedback payload.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { productId, favorite, rating, comment } = parsed.data;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      vendorId: true,
    },
  });

  if (!product) {
    return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
  }

  if (typeof favorite === "boolean") {
    if (favorite) {
      await prisma.userFavoriteProduct.upsert({
        where: {
          userId_productId: {
            userId: session.user.id,
            productId,
          },
        },
        create: {
          userId: session.user.id,
          productId,
        },
        update: {},
      });
    } else {
      await prisma.userFavoriteProduct.deleteMany({
        where: {
          userId: session.user.id,
          productId,
        },
      });
    }
  }

  if (typeof rating === "number") {
    await prisma.userProductReview.upsert({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId,
        },
      },
      create: {
        userId: session.user.id,
        productId,
        vendorId: product.vendorId,
        rating,
        comment: comment ? comment.trim() : null,
      },
      update: {
        vendorId: product.vendorId,
        rating,
        comment: comment !== undefined ? (comment ? comment.trim() : null) : undefined,
      },
    });
  } else if (comment !== undefined) {
    await prisma.userProductReview.updateMany({
      where: {
        userId: session.user.id,
        productId,
      },
      data: {
        comment: comment ? comment.trim() : null,
      },
    });
  }

  const feedback = await getUserMealFeedback(session.user.id);
  return NextResponse.json({ ok: true, feedback });
}
