import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import withSerwistInit from "@serwist/next";

// Laadt de gedeelde .env uit de monorepo-root (single source of truth voor lokale
// dev). Op Vercel bestaat dat bestand niet — daar staan de env vars al in
// process.env, en doet dit gewoon niets (dotenv faalt stil als het bestand ontbreekt).
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: path.join(rootDir, ".env") });

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: rootDir,
};

export default withSerwist(nextConfig);
