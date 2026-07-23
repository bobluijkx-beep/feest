import { signIn } from "../actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main style={{ maxWidth: 360, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>Inloggen</h1>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <form action={signIn}>
        <div style={{ marginBottom: "0.75rem" }}>
          <label>
            E-mailadres
            <br />
            <input type="email" name="email" required style={{ width: "100%" }} />
          </label>
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label>
            Wachtwoord
            <br />
            <input type="password" name="password" required style={{ width: "100%" }} />
          </label>
        </div>
        <button type="submit">Inloggen</button>
      </form>
    </main>
  );
}
