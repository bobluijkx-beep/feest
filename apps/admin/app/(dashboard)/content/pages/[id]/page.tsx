import { notFound } from "next/navigation";
import { prisma, getAvailableTicketCount } from "@lions/core";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { BlockForm } from "../block-form";
import { updatePageBlock, deletePageBlock } from "../actions";

export default async function EditPageBlockPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffRole(["ADMIN", "EDITOR"]);
  const { id } = await params;

  const block = await prisma.pageBlock.findUnique({ where: { id } });
  if (!block) notFound();

  const availableTickets =
    block.type === "availability" ? await getAvailableTicketCount(block.eventId) : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blok bewerken: {block.type}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <BlockForm
          type={block.type}
          action={updatePageBlock}
          initial={{
            order: block.order,
            isPublished: block.isPublished,
            content: (block.content as Record<string, string>) ?? {},
          }}
          submitLabel="Opslaan"
          hiddenFields={{ id: block.id }}
          previewAvailableTickets={availableTickets}
        />
        <form action={deletePageBlock}>
          <input type="hidden" name="id" value={block.id} />
          <Button type="submit" variant="destructive" size="sm">
            Verwijderen
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
