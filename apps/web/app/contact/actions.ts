"use server";

import { redirect } from "next/navigation";
import { sendEmail } from "@lions/core";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Verstuurt een ingevuld contactformulier naar het clubadres (RESEND_FROM_EMAIL — hetzelfde
 * adres dat nu al als afzender van alle andere mail gebruikt wordt), met de bezoeker als
 * reply-to zodat het bestuur er direct op kan reageren. Geen database-opslag: dit is puur
 * een doorgeefluik, net als de rest van de mailflow (sendEmail in packages/core). */
export async function submitContactForm(formData: FormData): Promise<void> {
  const naam = String(formData.get("naam") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const bericht = String(formData.get("bericht") ?? "").trim();
  // Honeypot: onzichtbaar voor mensen (zie page.tsx), bots die elk veld invullen tuinen
  // er vaak in. Doe alsof het gelukt is — geen signaal teruggeven dat dit gedetecteerd is.
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot) redirect("/contact?verzonden=1");

  if (!naam || !email || !bericht) {
    redirect("/contact?fout=ontbrekend");
  }

  const to = process.env.RESEND_FROM_EMAIL;
  if (!to) {
    console.error("Contactformulier: RESEND_FROM_EMAIL ontbreekt, kan niet versturen.");
    redirect("/contact?fout=onbekend");
  }

  const html = `
    <p><strong>Naam:</strong> ${escapeHtml(naam)}</p>
    <p><strong>E-mailadres:</strong> ${escapeHtml(email)}</p>
    <p><strong>Bericht:</strong></p>
    <p>${escapeHtml(bericht).replace(/\n/g, "<br />")}</p>
  `;

  const result = await sendEmail({
    to,
    subject: `Nieuw bericht via het contactformulier — ${naam}`,
    html,
    replyTo: email,
  });

  if (!result.ok) {
    console.error("Contactformulier versturen mislukt", result.error);
    redirect("/contact?fout=onbekend");
  }

  redirect("/contact?verzonden=1");
}
