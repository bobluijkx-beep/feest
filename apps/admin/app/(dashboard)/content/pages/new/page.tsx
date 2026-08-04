import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, buttonVariants } from "@lions/ui";
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

  const { selected: event } = await getSelectedEvent(actor, eventId);
  if (!event) notFound();

  if (!type || !BLOCK_TYPES.some((b) => b.type === type)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Blok toevoegen</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {BLOCK_TYPES.map((b) => (
            <Link
              key={b.type}
              href={`/content/pages/new?eventId=${event.id}&type=${b.type}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {b.label}
            </Link>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nieuw blok: {type}</CardTitle>
      </CardHeader>
      <CardContent>
        <BlockForm
          type={type}
          action={createPageBlock}
          initial={{ order: 0, isPublished: false, content: {} }}
          submitLabel="Aanmaken"
          hiddenFields={{ eventId: event.id }}
        />
      </CardContent>
    </Card>
  );
}
