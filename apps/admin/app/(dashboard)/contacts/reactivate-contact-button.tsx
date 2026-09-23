"use client";

import { Button } from "@lions/ui";
import { reactivateContact } from "./actions";

export function ReactivateContactButton({ email }: { email: string }) {
  return (
    <form action={reactivateContact}>
      <input type="hidden" name="email" value={email} />
      <Button type="submit" variant="outline" size="sm">
        Weer aanmelden
      </Button>
    </form>
  );
}
