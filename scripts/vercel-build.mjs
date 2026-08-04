import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "artifacts/app-ready/dist/public");
const outputDir = process.env.VERCEL_OUTPUT_DIR
  ? resolve(process.cwd(), process.env.VERCEL_OUTPUT_DIR)
  : resolve(root, "public");

console.log("Building @workspace/app-ready...");
execSync("pnpm --filter @workspace/app-ready run build", {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

console.log(`Copying build output to ${outputDir}`);
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
cpSync(src, outputDir, { recursive: true });

// Copy API functions
const apiSrc = resolve(root, "artifacts/app-ready/api");
const apiDest = resolve(outputDir, "api");
try {
  cpSync(apiSrc, apiDest, { recursive: true });
  console.log("API functions copied.");
} catch (err) {
  console.log("No API folder to copy.");
}

console.log("Vercel build complete.");
