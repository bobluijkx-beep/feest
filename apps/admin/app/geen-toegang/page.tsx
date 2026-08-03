import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@lions/ui";
import { signOut } from "../actions/auth";

export default function GeenToegangPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Geen toegang</CardTitle>
          <CardDescription>
            Deze omgeving is niet voor jouw rol. Gebruik de scanner-app om in- en uit te checken op de avond zelf.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Uitloggen
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
