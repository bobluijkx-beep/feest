import { NextResponse } from "next/server";
import { expireStaleOrders, createAdminSupabaseClient } from "@lions/core";

// Vercel Cron roept dit aan met een Authorization: Bearer <CRON_SECRET>-header.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Niet toegestaan" }, { status: 401 });
  }

  // Houdt het Supabase-project actief: gratis projecten pauzeren na ~7 dagen zonder
  // activiteit op de Supabase-API zelf. Een rechtstreekse Postgres-query via Prisma telt
  // daar niet per se voor mee, dus deze call gaat expliciet via de Supabase Auth-API.
  // Mislukt dit (bv. tijdelijke netwerkstoring), dan mag de eigenlijke cron-taak
  // (verlopen bestellingen opruimen) gewoon doorgaan.
  try {
    await createAdminSupabaseClient().auth.admin.listUsers({ page: 1, perPage: 1 });
  } catch (err) {
    console.error("Supabase keep-alive ping mislukt", err);
  }

  const expiredCount = await expireStaleOrders();
  return NextResponse.json({ expiredCount });
}
