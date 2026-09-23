"use client";

import { Button } from "@lions/ui";
import { deleteTemplate } from "./actions";

export function DeleteTemplateButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteTemplate}
      onSubmit={(e) => {
        if (!window.confirm(`Template "${name}" definitief verwijderen?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="destructive" size="sm">
        Verwijderen
      </Button>
    </form>
  );
}
