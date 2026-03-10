import { execSync } from "node:child_process";

const isCi = process.env.CI === "true";
const isVercel = Boolean(process.env.VERCEL);

if (isCi || isVercel) {
  process.exit(0);
}

execSync("npx husky", { stdio: "inherit", shell: true });
