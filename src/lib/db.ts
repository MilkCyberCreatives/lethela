// src/lib/db.ts
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

type DatabaseProvider = "sqlite" | "postgresql";

type PrismaRuntimeInfo = {
  source: "env" | "local-bundled";
  provider: DatabaseProvider;
  url: string;
  seedPath: string | null;
  persistent: boolean;
  scalable: boolean;
  writable: boolean | null;
};

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaRuntimeInfo?: PrismaRuntimeInfo;
};

function toSqliteFileUrl(filePath: string) {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

function findBundledSqlitePath() {
  const candidates = [
    path.join(process.cwd(), "prisma", "dev.db"),
    path.join(process.cwd(), ".next", "server", "prisma", "dev.db"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function isRelativeSqliteUrl(value: string) {
  return /^file:\.\.?\//.test(value) || value === "file:./dev.db";
}

function inferProvider(url?: string | null): DatabaseProvider {
  const value = String(url || "").trim().toLowerCase();
  if (value.startsWith("postgres://") || value.startsWith("postgresql://")) {
    return "postgresql";
  }
  return "sqlite";
}

function resolveConfiguredProvider(url?: string | null): DatabaseProvider {
  const configured = process.env.DATABASE_PROVIDER?.trim().toLowerCase();
  if (configured === "postgresql") return "postgresql";
  if (configured === "sqlite") return "sqlite";
  return inferProvider(url);
}

function resolvePrismaRuntimeInfo(): PrismaRuntimeInfo {
  const configuredUrl = process.env.DATABASE_URL?.trim();
  const provider = resolveConfiguredProvider(configuredUrl);
  const isProductionRuntime = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

  if (configuredUrl) {
    if (provider === "sqlite" && isProductionRuntime && isRelativeSqliteUrl(configuredUrl)) {
      throw new Error(
        "DATABASE_URL must point to a persistent production database. Relative SQLite paths are not allowed in production."
      );
    }

    if (isProductionRuntime && provider !== "postgresql") {
      throw new Error(
        "Production deployments must use PostgreSQL for scale and multi-instance safety. Set DATABASE_PROVIDER=postgresql."
      );
    }

    return {
      source: "env",
      provider,
      url: configuredUrl,
      seedPath: null,
      persistent: provider === "postgresql" || !isRelativeSqliteUrl(configuredUrl),
      scalable: provider === "postgresql",
      writable: null,
    };
  }

  if (isProductionRuntime) {
    throw new Error(
      "DATABASE_URL must be configured for production deployments. Refusing to start with a bundled or temporary database."
    );
  }

  const bundledPath = findBundledSqlitePath();
  const localPath = bundledPath || path.join(process.cwd(), "prisma", "dev.db");
  return {
    source: "local-bundled",
    provider: "sqlite",
    url: toSqliteFileUrl(localPath),
    seedPath: bundledPath,
    persistent: true,
    scalable: false,
    writable: null,
  };
}

export const prismaRuntimeInfo = globalForPrisma.prismaRuntimeInfo ?? resolvePrismaRuntimeInfo();

if (process.env.NODE_ENV === "production") {
  console.info("[prisma-runtime]", {
    source: prismaRuntimeInfo.source,
    provider: prismaRuntimeInfo.provider,
    persistent: prismaRuntimeInfo.persistent,
    scalable: prismaRuntimeInfo.scalable,
    writable: prismaRuntimeInfo.writable,
    hasSeedPath: Boolean(prismaRuntimeInfo.seedPath),
    url: prismaRuntimeInfo.url,
  });
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: prismaRuntimeInfo.url,
      },
    },
    log: ["warn", "error"], // add "query" if you want verbose SQL logs
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaRuntimeInfo = prismaRuntimeInfo;
}
