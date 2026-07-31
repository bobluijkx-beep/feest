"use client";

import { useActionState } from "react";
import { createStaffUser, type CreateStaffUserState } from "./actions";

const initialState: CreateStaffUserState = {};

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createStaffUser, initialState);

  return (
    <div style={{ border: "1px solid #ddd", padding: "1rem", marginBottom: "1.5rem" }}>
      <h2>Nieuwe gebruiker</h2>
      <form action={formAction} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <label>
          E-mailadres
          <br />
          <input type="email" name="email" required />
        </label>
        <label>
          Rol
          <br />
          <select name="role" required defaultValue="EDITOR">
            <option value="ADMIN">ADMIN</option>
            <option value="FINANCE">FINANCE</option>
            <option value="EDITOR">EDITOR</option>
            <option value="DOOR_STAFF">DOOR_STAFF</option>
          </select>
        </label>
        <button type="submit" disabled={pending}>
          {pending ? "Bezig…" : "Aanmaken"}
        </button>
      </form>

      {state.error && <p style={{ color: "crimson" }}>{state.error}</p>}

      {state.tempPassword && (
        <div style={{ marginTop: "1rem", background: "#fffbe6", border: "1px solid #f0c000", padding: "0.75rem" }}>
          <p>
            Account voor <strong>{state.createdEmail}</strong> aangemaakt. Tijdelijk wachtwoord (wordt maar één keer
            getoond, geef dit veilig door):
          </p>
          <code>{state.tempPassword}</code>
        </div>
      )}
    </div>
  );
}
