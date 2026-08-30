import "server-only";
import { prisma } from "../db";
import { DEFAULT_LAYOUT_HTML } from "./layout";

/** Zoekt de HTML op van de lay-out die bij een e-mail hoort: het expliciet gekozen
 * `layoutId` als dat er is, anders de standaard-lay-out van de organisatie
 * (EmailLayout.isDefault), anders — bv. vlak na de migratie, vóórdat er ooit een
 * lay-out is aangemaakt — de meegeleverde DEFAULT_LAYOUT_HTML. Zo kan dit nooit een
 * verzending laten mislukken doordat er (nog) geen lay-outrij bestaat. */
export async function getEmailLayoutHtml(params: {
  organizationId: string;
  layoutId: string | null | undefined;
}): Promise<string> {
  if (params.layoutId) {
    const chosen = await prisma.emailLayout.findUnique({ where: { id: params.layoutId } });
    if (chosen) return chosen.bodyHtml;
  }

  const fallback = await prisma.emailLayout.findFirst({
    where: { organizationId: params.organizationId, isDefault: true },
  });
  return fallback?.bodyHtml ?? DEFAULT_LAYOUT_HTML;
}
