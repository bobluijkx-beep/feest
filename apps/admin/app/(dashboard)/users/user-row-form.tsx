"use client";

import { useState, useTransition } from "react";
import { Button, Select } from "@lions/ui";
import { updateStaffUser } from "./actions";
import type { UserRole } from "@lions/db";

const EVENT_SCOPED_ROLES: UserRole[] = ["EDITOR", "DOOR_STAFF"];

export function UserRowForm({
  userId,
  initialRole,
  initialEventIds,
  events,
}: {
  userId: string;
  initialRole: UserRole;
  initialEventIds: string[];
  events: { id: string; name: string }[];
}) {
  const [role, setRole] = useState<UserRole>(initialRole);
  const [eventIds, setEventIds] = useState<Set<string>>(new Set(initialEventIds));
  const [pending, startTransition] = useTransition();

  function toggleEvent(eventId: string, checked: boolean) {
    setEventIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(eventId);
      else next.delete(eventId);
      return next;
    });
  }

  function handleSubmit(formData: FormData) {
    formData.set("userId", userId);
    formData.set("role", role);
    for (const eventId of eventIds) formData.append("eventIds", eventId);
    startTransition(() => updateStaffUser(formData));
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="w-36">
          <option value="ADMIN">ADMIN</option>
          <option value="FINANCE">FINANCE</option>
          <option value="EDITOR">EDITOR</option>
          <option value="DOOR_STAFF">DOOR_STAFF</option>
        </Select>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Bezig…" : "Opslaan"}
        </Button>
      </div>
      {EVENT_SCOPED_ROLES.includes(role) && (
        <div className="flex flex-wrap gap-2">
          {events.map((event) => (
            <label key={event.id} className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={eventIds.has(event.id)}
                onChange={(e) => toggleEvent(event.id, e.target.checked)}
                className="h-3.5 w-3.5 rounded border-input"
              />
              {event.name}
            </label>
          ))}
          {events.length === 0 && <p className="text-xs text-muted-foreground">Nog geen events.</p>}
        </div>
      )}
    </form>
  );
}
