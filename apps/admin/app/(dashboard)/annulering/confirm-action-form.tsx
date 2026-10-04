"use client";

import { Button } from "@lions/ui";

/** Server-action-formulier met een window.confirm vooraf — voor de onomkeerbare acties op de
 * annuleringspagina (event annuleren, geld terugstorten). */
export function ConfirmActionForm({
  action,
  eventId,
  label,
  confirmMessage,
  variant = "default",
}: {
  action: (formData: FormData) => void | Promise<void>;
  eventId: string;
  label: string;
  confirmMessage: string;
  variant?: "default" | "destructive" | "outline";
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <input type="hidden" name="eventId" value={eventId} />
      <Button type="submit" variant={variant}>
        {label}
      </Button>
    </form>
  );
}
