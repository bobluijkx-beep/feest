import { signOut } from "../actions/auth";

export default function GeenToegangPage() {
  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>Geen toegang</h1>
      <p>Deze app is alleen voor de rollen ADMIN en DOOR_STAFF.</p>
      <form action={signOut}>
        <button type="submit">Uitloggen</button>
      </form>
    </main>
  );
}
