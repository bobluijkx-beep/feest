import "server-only";
import { prisma } from "../db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Haalt alle e-mailadressen op die zich hebben afgemeld — nooit als contact in het
 * adresboek, ongeacht bron (zie ook segment.ts, dat dezelfde tabel nogmaals checkt vlak
 * vóór verzending voor het geval iemand zich ná import/sync afmeldt). */
async function getOptedOutEmails(): Promise<Set<string>> {
  const optOuts = await prisma.emailOptOut.findMany({ select: { email: true } });
  return new Set(optOuts.map((o) => o.email.toLowerCase()));
}

export interface ImportContactsResult {
  imported: number;
  skippedInvalid: number;
  skippedOptOut: number;
}

/** Verwerkt geplakte CSV-regels ("Naam,e-mailadres" per regel) tot Contact-rijen met
 * bron IMPORT. Ongeldige regels (geen komma, geen geldig e-mailadres) en afgemelde
 * adressen worden overgeslagen i.p.v. de hele import te laten falen — bij een import uit
 * een externe database is een paar rommelige regels eerder regel dan uitzondering. */
export async function importContacts(organizationId: string, rawText: string): Promise<ImportContactsResult> {
  const optedOut = await getOptedOutEmails();

  const rows = new Map<string, string>(); // email -> naam, laatste regel wint bij duplicaten in dezelfde import
  let skippedInvalid = 0;
  let skippedOptOut = 0;

  for (const line of rawText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const commaIndex = trimmed.indexOf(",");
    if (commaIndex === -1) {
      skippedInvalid++;
      continue;
    }
    const name = trimmed.slice(0, commaIndex).trim();
    const email = normalizeEmail(trimmed.slice(commaIndex + 1));
    if (!name || !EMAIL_RE.test(email)) {
      skippedInvalid++;
      continue;
    }
    if (optedOut.has(email)) {
      skippedOptOut++;
      continue;
    }
    rows.set(email, name);
  }

  for (const [email, name] of rows) {
    await prisma.contact.upsert({
      where: { organizationId_email: { organizationId, email } },
      create: { organizationId, email, name, source: "IMPORT" },
      update: { name },
    });
  }

  return { imported: rows.size, skippedInvalid, skippedOptOut };
}

/** Vult het adresboek aan met iedereen die ooit een betaalde bestelling heeft geplaatst
 * (over alle events van deze organisatie heen, niet alleen het huidige) en zich niet heeft
 * afgemeld — bron ORDER. Bestaat een e-mailadres al (uit een eerdere import of sync), dan
 * wordt alleen de naam bijgewerkt; de oorspronkelijke bron blijft staan (puur informatief,
 * geen gedrag hangt ervan af). */
export async function syncOrderContactsIntoAddressBook(organizationId: string): Promise<{ added: number }> {
  const [orders, optedOut] = await Promise.all([
    prisma.order.findMany({
      where: { status: "PAID", event: { organizationId } },
      select: { buyerName: true, buyerEmail: true },
      orderBy: { createdAt: "asc" },
    }),
    getOptedOutEmails(),
  ]);

  const byEmail = new Map<string, string>();
  for (const order of orders) {
    const email = normalizeEmail(order.buyerEmail);
    if (!EMAIL_RE.test(email) || optedOut.has(email)) continue;
    byEmail.set(email, order.buyerName); // oplopend gesorteerd, dus laatste bestelling wint
  }

  for (const [email, name] of byEmail) {
    await prisma.contact.upsert({
      where: { organizationId_email: { organizationId, email } },
      create: { organizationId, email, name, source: "ORDER" },
      update: { name },
    });
  }

  return { added: byEmail.size };
}

export async function getContactStats(
  organizationId: string,
): Promise<{ total: number; fromOrders: number; fromImport: number }> {
  const [total, fromOrders, fromImport] = await Promise.all([
    prisma.contact.count({ where: { organizationId } }),
    prisma.contact.count({ where: { organizationId, source: "ORDER" } }),
    prisma.contact.count({ where: { organizationId, source: "IMPORT" } }),
  ]);
  return { total, fromOrders, fromImport };
}

const CONTACT_LIST_LIMIT = 500;

export async function listContacts(
  organizationId: string,
): Promise<{ contacts: { id: string; name: string; email: string; source: "ORDER" | "IMPORT" }[]; truncated: boolean }> {
  const contacts = await prisma.contact.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    take: CONTACT_LIST_LIMIT + 1,
    select: { id: true, name: true, email: true, source: true },
  });
  return { contacts: contacts.slice(0, CONTACT_LIST_LIMIT), truncated: contacts.length > CONTACT_LIST_LIMIT };
}
