// src/lib/db.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

type PrismaRuntimeInfo = {
  source: "env" | "local-bundled" | "production-temp";
  url: string;
  seedPath: string | null;
  persistent: boolean;
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

function resolvePrismaRuntimeInfo(): PrismaRuntimeInfo {
  const configuredUrl = process.env.DATABASE_URL?.trim();
  if (configuredUrl) {
    return {
      source: "env",
      url: configuredUrl,
      seedPath: null,
      persistent: !configuredUrl.startsWith("file:"),
      writable: null,
    };
  }

  const bundledPath = findBundledSqlitePath();

  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    const tempDbPath = path.join(os.tmpdir(), "lethela-production.db");
    fs.mkdirSync(path.dirname(tempDbPath), { recursive: true });
    if (bundledPath && !fs.existsSync(tempDbPath)) {
      fs.copyFileSync(bundledPath, tempDbPath);
    }
    if (fs.existsSync(tempDbPath)) {
      fs.chmodSync(tempDbPath, 0o600);
    }
    let writable = false;
    try {
      fs.accessSync(tempDbPath, fs.constants.W_OK);
      writable = true;
    } catch {
      writable = false;
    }

    return {
      source: "production-temp",
      url: toSqliteFileUrl(tempDbPath),
      seedPath: bundledPath,
      persistent: false,
      writable,
    };
  }

  const localPath = bundledPath || path.join(process.cwd(), "prisma", "dev.db");
  return {
    source: "local-bundled",
    url: toSqliteFileUrl(localPath),
    seedPath: bundledPath,
    persistent: true,
    writable: null,
  };
}

export const prismaRuntimeInfo = globalForPrisma.prismaRuntimeInfo ?? resolvePrismaRuntimeInfo();

if (process.env.NODE_ENV === "production") {
  console.info("[prisma-runtime]", {
    source: prismaRuntimeInfo.source,
    persistent: prismaRuntimeInfo.persistent,
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
