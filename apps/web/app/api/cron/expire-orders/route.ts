import { NextResponse } from "next/server";
import { expireStaleOrders } from "@lions/core";

// Vercel Cron roept dit aan met een Authorization: Bearer <CRON_SECRET>-header.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Niet toegestaan" }, { status: 401 });
  }

  const expiredCount = await expireStaleOrders();
  return NextResponse.json({ expiredCount });
}
