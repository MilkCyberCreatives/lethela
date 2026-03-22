import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma, prismaRuntimeInfo } from "@/lib/db";

const DEFAULT_QUERY_TIMEOUT_MS = 2500;
type QueryClient = Prisma.TransactionClient | PrismaClient;

function resolveAfter<T>(ms: number, value: T) {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}

export async function withQueryTimeout<T>(promise: Promise<T>, fallback: T, ms = DEFAULT_QUERY_TIMEOUT_MS): Promise<T> {
  const guarded = promise.catch(() => fallback);
  return Promise.race([guarded, resolveAfter(ms, fallback)]);
}

export async function runBoundedDbQuery<T>(
  query: (db: QueryClient) => Promise<T>,
  ms = DEFAULT_QUERY_TIMEOUT_MS
): Promise<T> {
  if (prismaRuntimeInfo.provider !== "postgresql") {
    return query(prisma);
  }

  const statementTimeoutMs = Math.max(250, Math.floor(ms));
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = ${statementTimeoutMs}`);
    return query(tx);
  });
}

export async function withTimeoutOrThrow<T>(promise: Promise<T>, ms = DEFAULT_QUERY_TIMEOUT_MS, message = "Operation timed out"): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}
