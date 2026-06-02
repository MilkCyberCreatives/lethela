import fs from "node:fs";
import path from "node:path";

type LocalSqliteUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  passwordHash: string | null;
  role: string;
};

function isLocalSqliteAuthEnabled() {
  const provider = process.env.DATABASE_PROVIDER?.trim().toLowerCase();
  const url = process.env.DATABASE_URL?.trim().toLowerCase();
  const isSqlite = provider === "sqlite" || Boolean(url?.startsWith("file:"));
  return process.env.NODE_ENV !== "production" && isSqlite;
}

function resolveSqliteFilePath() {
  const rawUrl = process.env.DATABASE_URL?.trim();
  if (!rawUrl?.startsWith("file:")) return null;

  const rawPath = rawUrl.slice("file:".length);
  if (/^[A-Za-z]:\//.test(rawPath) || rawPath.startsWith("/")) {
    return rawPath.replace(/\//g, path.sep);
  }

  const preferredPath = path.resolve(process.cwd(), "prisma", rawPath);
  if (fs.existsSync(preferredPath)) return preferredPath;

  return path.resolve(process.cwd(), rawPath);
}

export async function findLocalSqliteUserByEmail(email: string): Promise<LocalSqliteUser | null> {
  if (!isLocalSqliteAuthEnabled()) return null;

  const sqlitePath = resolveSqliteFilePath();
  if (!sqlitePath || !fs.existsSync(sqlitePath)) {
    return null;
  }

  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(sqlitePath);
  try {
    const row = db
      .prepare(
        'SELECT id, email, name, image, passwordHash, role FROM "User" WHERE lower(email) = lower(?) LIMIT 1'
      )
      .get(email) as LocalSqliteUser | undefined;
    return row ?? null;
  } finally {
    db.close();
  }
}
