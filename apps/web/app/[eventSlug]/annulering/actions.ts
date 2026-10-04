"use server";

import { redirect } from "next/navigation";
import { getNoticeByToken, submitCancellationChoice } from "@lions/core";

/** Verwerkt de keuze van de koper op de verborgen keuzepagina. De token is de enige
 * autorisatie; submitCancellationChoice zelf zorgt dat een keuze maar één keer kan worden
 * vastgelegd (atomaire claim), dus een tweede klik of ander tabblad doet niets extra. */
export async function chooseCancellationOption(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const choice = String(formData.get("choice") ?? "");
  if (choice !== "REFUND" && choice !== "DONATE") return;

  const notice = await getNoticeByToken(token);
  if (!notice) return;

  await submitCancellationChoice(token, choice);
  redirect(`/${notice.event.slug}/annulering/${token}`);
}
