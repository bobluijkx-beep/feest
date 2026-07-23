import type { UserRole } from "@lions/db";
import type { AppUser } from "./session";

export class AuthError extends Error {
  constructor(
    public status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** De echte RBAC-grens: verplicht aan het begin van elke API-route/Server Action die
 * gevoelige data raakt. UI-checks zijn alleen UX-gemak, nooit de beveiligingsgrens. */
export function requireRole(user: AppUser | null, allowed: UserRole[]): AppUser {
  if (!user) throw new AuthError(401, "Niet ingelogd.");
  if (!allowed.includes(user.role)) {
    throw new AuthError(403, `Rol '${user.role}' heeft hier geen toegang toe.`);
  }
  return user;
}
