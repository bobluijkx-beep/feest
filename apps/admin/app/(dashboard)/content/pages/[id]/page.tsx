import { notFound } from "next/navigation";
import { prisma } from "@lions/core";
import { requireStaffRole } from "@/lib/require-role";
import { BlockForm } from "../block-form";
import { updatePageBlock, deletePageBlock } from "../actions";

export default async function EditPageBlockPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffRole(["ADMIN", "EDITOR"]);
  const { id } = await params;

  const block = await prisma.pageBlock.findUnique({ where: { id } });
  if (!block) notFound();

  return (
    <main>
      <h1>Blok bewerken: {block.type}</h1>
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
      />
      <form action={deletePageBlock} style={{ marginTop: "1rem" }}>
        <input type="hidden" name="id" value={block.id} />
        <button type="submit">Verwijderen</button>
      </form>
    </main>
  );
}
