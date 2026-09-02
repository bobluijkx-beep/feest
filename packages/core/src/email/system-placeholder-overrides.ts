import "server-only";
import { prisma } from "../db";

export interface SystemPlaceholderDef {
  key: "locatie" | "tickets_sectie" | "merchandise";
  label: string;
  /** Of het template het {{waarde}}-token gebruikt om de berekende waarde in te voegen
   * (locatie/merchandise) — tickets_sectie heeft geen losse waarde, is puur aan/uit. */
  hasValue: boolean;
  defaultTemplate: string;
  helpText: string;
}

/** De enige drie systeem-placeholders (packages/core/src/email/placeholders.ts) waarvan
 * de bewoording zelf aanpasbaar is, in plaats van dat alleen de onderliggende waarde
 * (koper/order) verandert — zie de admin-sectie /content/emails/placeholders. */
export const SYSTEM_PLACEHOLDER_DEFS: SystemPlaceholderDef[] = [
  {
    key: "locatie",
    label: "Locatie ({{locatie}})",
    hasValue: true,
    defaultTemplate: "{{waarde}}",
    helpText:
      "{{waarde}} wordt vervangen door de locatienaam van het event. Staat er geen locatie bij het event, dan blijft {{waarde}} leeg — een vaste tekst ervoor of erna staat er dan nog steeds.",
  },
  {
    key: "tickets_sectie",
    label: "Tickets-vermelding ({{tickets_sectie}})",
    hasValue: false,
    defaultTemplate:
      "<p>Je tickets (met QR-code) vind je als bijlage bij deze e-mail. Neem ze mee op je telefoon of geprint naar het evenement.</p>",
    helpText: "Wordt alleen getoond als de bestelling ook echt tickets bevat.",
  },
  {
    key: "merchandise",
    label: "Feestartikelen-vermelding ({{merchandise}})",
    hasValue: true,
    defaultTemplate: "<p>Ook besteld: {{waarde}}.</p>",
    helpText:
      "{{waarde}} wordt vervangen door de lijst bestelde feestartikelen (bv. \"2x Muntje, 1x Waaier\"). Wordt alleen getoond als de bestelling ook echt feestartikelen bevat.",
  },
];

const VALUE_TOKEN = "{{waarde}}";

/** Haalt de (eventueel aangepaste) templates op voor alle drie de placeholders — org-breed,
 * valt terug op de meegeleverde standaardtekst voor elke key zonder eigen rij. */
export async function getSystemPlaceholderTemplates(organizationId: string): Promise<Record<string, string>> {
  const rows = await prisma.systemPlaceholderOverride.findMany({ where: { organizationId } });
  const overrides = new Map(rows.map((row) => [row.key, row.template]));
  return Object.fromEntries(
    SYSTEM_PLACEHOLDER_DEFS.map((def) => [def.key, overrides.get(def.key) ?? def.defaultTemplate]),
  );
}

/** Vult een systeem-placeholder-template in: vervangt {{waarde}} (indien aanwezig) door de
 * berekende waarde. Losse string-substitutie i.p.v. renderTemplate() hergebruiken — dat
 * laatste doet {{content}}/de systeemvars op het buitenste niveau, dit is een kleinere,
 * eerdere stap die de uitkomst daarvan levert. */
export function renderSystemPlaceholder(template: string, value: string): string {
  return template.split(VALUE_TOKEN).join(value);
}
