import { redirect } from "next/navigation";
import { prisma, verifyUnsubscribeToken } from "@lions/core";
import { Card, CardContent } from "@lions/ui";
import { HOME_EVENT_SLUG } from "@/lib/site-config";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const verified = token ? verifyUnsubscribeToken(token) : null;

  if (verified) {
    await prisma.emailOptOut.upsert({
      where: { email: verified.email },
      create: { email: verified.email },
      update: {},
    });
    // Zelfde patroon als het contactformulier ((site)/contact/actions.ts): een geslaagde
    // afmelding stuurt door naar HOME_EVENT_SLUG met een query-vlag, waar
    // unsubscribe-success-dialog.tsx ([eventSlug]/page.tsx) 'm als pop-up toont i.p.v. een
    // kale bevestigingspagina — een ongeldige/kapotte link blijft wél deze pagina tonen,
    // die heeft geen event om naar terug te sturen.
    redirect(`/${HOME_EVENT_SLUG}?afgemeld=1`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col gap-2 text-center">
          <h1 className="text-xl font-semibold text-destructive">Ongeldige afmeldlink</h1>
          <p className="text-sm text-muted-foreground">
            Deze link is ongeldig of onvolledig. Neem contact op als je toch geen mailings meer wilt ontvangen.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
