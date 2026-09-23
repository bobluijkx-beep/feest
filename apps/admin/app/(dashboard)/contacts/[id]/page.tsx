import { notFound } from "next/navigation";
import { prisma } from "@lions/core";
import { Card, CardHeader, CardTitle, CardContent } from "@lions/ui";
import { requireStaffRole } from "@/lib/require-role";
import { EmailOptOutDot } from "@/lib/email-optout-dot";
import { EditContactForm } from "./edit-contact-form";
import { ReactivateContactButton } from "../reactivate-contact-button";

export default async function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireStaffRole(["ADMIN", "EDITOR"]);
  const { id } = await params;

  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact || contact.organizationId !== actor.organizationId) notFound();

  const optOut = await prisma.emailOptOut.findFirst({
    where: { email: { equals: contact.email, mode: "insensitive" } },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact bewerken: {contact.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <EditContactForm contact={contact} />
        <div className="flex items-center gap-2 border-t border-border pt-4">
          <EmailOptOutDot optedOut={Boolean(optOut)} />
          <span className="text-sm text-muted-foreground">
            {optOut ? "Afgemeld voor mailings" : "Ontvangt mailings"}
          </span>
          {optOut && <ReactivateContactButton email={contact.email} />}
        </div>
      </CardContent>
    </Card>
  );
}
