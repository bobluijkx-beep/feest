"use server";

import { redirect } from "next/navigation";
import { getNoticeByToken, submitCancellationChoice } from "@lions/core";

/** Verwerkt de keuze van de koper op de verborgen keuzepagina. De token is de enige
 * autorisatie; submitCancellationChoice zelf zorgt dat een keuze maar één keer kan worden
 * vastgelegd (atomaire claim), dus een tweede klik of ander tabblad doet niets extra. Bij
 * "deels doneren" (PARTIAL) komt het bedrag als vrije tekst binnen (komma of punt) en wordt
 * in submitCancellationChoice opnieuw tegen het echte bedrag gevalideerd. */
export async function chooseCancellationOption(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const choice = String(formData.get("choice") ?? "");
  if (choice !== "REFUND" && choice !== "DONATE" && choice !== "PARTIAL") return;

  const notice = await getNoticeByToken(token);
  if (!notice) return;

  let donationCents: number | undefined;
  if (choice === "PARTIAL") {
    const euros = Number(String(formData.get("donateEuros") ?? "").replace(",", "."));
    donationCents = Number.isFinite(euros) ? Math.round(euros * 100) : undefined;
  }

  const result = await submitCancellationChoice(token, choice, { donationCents });
  if (result.error === "amount") redirect(`/${notice.event.slug}/annulering/${token}?fout=bedrag`);
  redirect(`/${notice.event.slug}/annulering/${token}?gekozen=1`);
}
