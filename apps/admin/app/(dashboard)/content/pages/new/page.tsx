import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";
import { BlockForm } from "../block-form";
import { createPageBlock } from "../actions";

const BLOCK_TYPES = [
  { type: "hero", label: "Hero-sectie" },
  { type: "programme", label: "Programma" },
  { type: "sponsor", label: "Sponsor" },
  { type: "faq_item", label: "FAQ-item" },
  { type: "cta", label: "Call-to-action" },
];

export default async function NewPageBlockPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const { type } = await searchParams;

  const event = await prisma.event.findFirst({ where: { organizationId: actor.organizationId } });
  if (!event) notFound();

  if (!type || !BLOCK_TYPES.some((b) => b.type === type)) {
    return (
      <main>
        <h1>Blok toevoegen</h1>
        <ul>
          {BLOCK_TYPES.map((b) => (
            <li key={b.type}>
              <Link href={`/content/pages/new?type=${b.type}`}>{b.label}</Link>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  return (
    <main>
      <h1>Nieuw blok: {type}</h1>
      <BlockForm
        type={type}
        action={createPageBlock}
        initial={{ order: 0, isPublished: false, content: {} }}
        submitLabel="Aanmaken"
        hiddenFields={{ eventId: event.id }}
      />
    </main>
  );
}
