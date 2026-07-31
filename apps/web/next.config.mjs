import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Laadt de gedeelde .env uit de monorepo-root (single source of truth voor lokale
// dev). Op Vercel bestaat dat bestand niet — daar staan de env vars al in
// process.env, en doet dit gewoon niets (dotenv faalt stil als het bestand ontbreekt).
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: path.join(rootDir, ".env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma's query-engine (.so.node) leeft buiten deze app, in
  // packages/db/generated/client. Next.js' automatische file-tracing voor de
  // serverless-bundle vindt dat binaire bestand niet vanzelf in een monorepo, wat op
  // Vercel leidt tot PrismaClientInitializationError ("Query Engine ... could not be
  // found"). Zie https://pris.ly/d/engine-not-found-nextjs.
  outputFileTracingRoot: rootDir,
  outputFileTracingIncludes: {
    "/**": ["../../packages/db/generated/client/**/*"],
  },
};

export default nextConfig;
