import { spawnSync } from "node:child_process";
import path from "node:path";

function resolveProvider() {
  const configured = String(process.env.DATABASE_PROVIDER || "").trim().toLowerCase();
  if (configured === "postgresql") return "postgresql";
  if (configured === "sqlite") return "sqlite";

  const url = String(process.env.DATABASE_URL || "").trim().toLowerCase();
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return "postgresql";
  }
  return "sqlite";
}

const provider = resolveProvider();
const schemaPath =
  provider === "postgresql"
    ? path.join(process.cwd(), "prisma", "schema.postgresql.prisma")
    : path.join(process.cwd(), "prisma", "schema.prisma");

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/prisma-run.mjs <prisma-command> [...args]");
  process.exit(1);
}

const command =
  process.platform === "win32"
    ? {
        file: "cmd.exe",
        args: ["/c", "npx", "prisma", ...args, "--schema", schemaPath],
      }
    : {
        file: "npx",
        args: ["prisma", ...args, "--schema", schemaPath],
      };

const result = spawnSync(command.file, command.args, {
  cwd: process.cwd(),
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 0);
