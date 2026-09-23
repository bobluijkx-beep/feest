"use client";

import { Button } from "@lions/ui";
import { deleteCampaign } from "./actions";

export function DeleteCampaignButton({ id, subject }: { id: string; subject: string }) {
  return (
    <form
      action={deleteCampaign}
      onSubmit={(e) => {
        if (!window.confirm(`Mailing "${subject}" definitief uit de geschiedenis verwijderen?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="destructive" size="sm">
        Verwijderen
      </Button>
    </form>
  );
}
