"use server";

import { redirect } from "next/navigation";
import { prisma, verifySongRequestToken, submitSongRequests } from "@lions/core";
import { HOME_EVENT_SLUG } from "@/lib/site-config";

interface Row {
  artist: string;
  title: string;
}

/** Leest één van de twee formulierregels: `null` als de rij helemaal leeg is gelaten
 * (geen verzoek voor dit slot), `"invalid"` als er maar één van de twee velden is
 * ingevuld (moet samen), anders het geldige paar. */
function readRow(formData: FormData, n: number): Row | null | "invalid" {
  const artist = String(formData.get(`artist${n}`) ?? "").trim();
  const title = String(formData.get(`title${n}`) ?? "").trim();
  if (!artist && !title) return null;
  if (!artist || !title) return "invalid";
  return { artist, title };
}

export async function submitSongRequestForm(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const verified = token ? verifySongRequestToken(token) : null;
  if (!verified) redirect("/verzoeken?fout=ongeldig");

  const order = await prisma.order.findUnique({
    where: { id: verified.orderId },
    select: { id: true, eventId: true, buyerName: true, status: true, tickets: { select: { id: true } } },
  });
  if (!order || order.status !== "PAID" || order.tickets.length === 0) {
    redirect("/verzoeken?fout=ongeldig");
  }

  const row1 = readRow(formData, 1);
  const row2 = readRow(formData, 2);
  if (row1 === "invalid" || row2 === "invalid") {
    redirect(`/verzoeken?token=${token}&fout=onvolledig`);
  }

  const rows = [row1, row2].filter((r): r is Row => r !== null);
  await submitSongRequests(order.id, order.eventId, order.buyerName, rows);

  // Zelfde patroon als het contactformulier en afmelden: een geslaagde inzending stuurt
  // door naar HOME_EVENT_SLUG met een query-vlag, waar de pop-up (song-request-success-
  // dialog.tsx, [eventSlug]/page.tsx) 'm toont i.p.v. een banner op /verzoeken zelf.
  redirect(`/${HOME_EVENT_SLUG}?verzoek=1`);
}
