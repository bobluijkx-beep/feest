// Prisma genereert naar de standaardlocatie (node_modules/.prisma/client) — bewust geen
// custom `output` in schema.prisma. Next.js' tracing voor de serverless-bundle op
// Vercel heeft alleen goed geteste ondersteuning voor die standaardlocatie; een custom
// pad (zoals we eerder gebruikten) leidde tot PrismaClientInitializationError omdat de
// query-engine dan niet werd meegenomen in de bundle. Zie https://pris.ly/d/engine-not-found-nextjs.
export * from "@prisma/client";
