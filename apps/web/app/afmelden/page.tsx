import { prisma, verifyUnsubscribeToken } from "@lions/core";
import { Card, CardContent } from "@lions/ui";

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
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col gap-2 text-center">
          {verified ? (
            <>
              <h1 className="text-xl font-semibold text-primary">Je bent afgemeld</h1>
              <p className="text-sm text-muted-foreground">
                {verified.email} ontvangt geen mailings meer van Lionsclub Voorschoten. Transactionele e-mails over
                een bestelling die je al geplaatst hebt (bv. orderbevestigingen) blijven wel gewoon aankomen.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-destructive">Ongeldige afmeldlink</h1>
              <p className="text-sm text-muted-foreground">
                Deze link is ongeldig of onvolledig. Neem contact op als je toch geen mailings meer wilt ontvangen.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
