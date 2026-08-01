import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { expireOrderIfStale } from "@lions/core";

async function handler(request: Request) {
  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : null;
  if (!orderId) {
    return NextResponse.json({ error: "Ontbrekend orderId" }, { status: 400 });
  }

  const expired = await expireOrderIfStale(orderId);
  return NextResponse.json({ expired });
}

/** Wordt precies 15 minuten na orderaanmaak door QStash aangeroepen (zie
 * packages/core/src/checkout/qstash.ts). verifySignatureAppRouter() valideert bij het
 * aanmaken van de wrapper meteen of QSTASH_CURRENT_SIGNING_KEY/QSTASH_NEXT_SIGNING_KEY
 * bestaan — als we die wrapper op module-niveau zouden aanmaken, zou de hele app-build
 * falen zolang er nog geen echte Upstash-sleutels zijn ingesteld. Daarom pas hier, per
 * request, aanmaken: zonder sleutels geeft dit gewoon een nette 503 in plaats van de
 * build te breken. */
export async function POST(request: Request) {
  if (!process.env.QSTASH_CURRENT_SIGNING_KEY || !process.env.QSTASH_NEXT_SIGNING_KEY) {
    return NextResponse.json({ error: "QStash is niet geconfigureerd." }, { status: 503 });
  }

  const verifiedHandler = verifySignatureAppRouter(handler);
  return verifiedHandler(request);
}
