// `output: "standalone"` leaves out the static assets that server.js serves.
// Copy them in so `pnpm start` (node .next/standalone/server.js) works.
// Prisma Compute does the same copy on deploy; running both is harmless.
import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const standalone = join(root, ".next", "standalone");

if (!existsSync(standalone)) {
  console.error("No .next/standalone found. Run `next build` first.");
  process.exit(1);
}

cpSync(join(root, ".next", "static"), join(standalone, ".next", "static"), {
  recursive: true,
});

const publicDir = join(root, "public");
if (existsSync(publicDir)) {
  cpSync(publicDir, join(standalone, "public"), { recursive: true });
}
