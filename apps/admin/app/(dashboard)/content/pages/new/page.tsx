import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffRole } from "@/lib/require-role";
import { getSelectedEvent } from "@/lib/selected-event";
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
  searchParams: Promise<{ type?: string; eventId?: string }>;
}) {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const { type, eventId } = await searchParams;

  const { selected: event } = await getSelectedEvent(actor.organizationId, eventId);
  if (!event) notFound();

  if (!type || !BLOCK_TYPES.some((b) => b.type === type)) {
    return (
      <main>
        <h1>Blok toevoegen</h1>
        <ul>
          {BLOCK_TYPES.map((b) => (
            <li key={b.type}>
              <Link href={`/content/pages/new?eventId=${event.id}&type=${b.type}`}>{b.label}</Link>
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
