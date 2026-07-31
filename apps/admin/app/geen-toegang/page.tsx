import { signOut } from "../actions/auth";

export default function GeenToegangPage() {
  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>Geen toegang</h1>
      <p>Deze omgeving is niet voor jouw rol. Gebruik de scanner-app om in- en uit te checken op de avond zelf.</p>
      <form action={signOut}>
        <button type="submit">Uitloggen</button>
      </form>
    </main>
  );
}
