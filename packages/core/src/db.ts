import { PrismaClient } from "@lions/db";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Voorkomt uitputting van de connection pool door hot-reload in dev (elke edit zou
// anders een nieuwe PrismaClient/pool aanmaken).
export const prisma = globalThis.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
