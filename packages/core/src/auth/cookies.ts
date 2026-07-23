// Minimale cookie-adapter zodat dit package niet direct van `next/headers` afhangt.
// Elke app geeft zijn eigen Next.js `cookies()`-store door langs deze vorm.
export interface CookieAdapter {
  getAll(): { name: string; value: string }[];
  setAll(cookies: { name: string; value: string; options: Record<string, unknown> }[]): void;
}
