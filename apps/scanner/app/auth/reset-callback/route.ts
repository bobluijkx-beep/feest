import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

/** Ontvangt de PKCE `code` uit de resetlink die Supabase Auth verstuurt, wisselt die in
 * voor een sessie (moet in een Route Handler/Server Action gebeuren — cookies kunnen niet
 * gezet worden vanuit een gewone Server Component), en stuurt door naar de
 * wachtwoord-resetten-pagina die daarna met een geldige sessie kan werken. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/wachtwoord-resetten", url.origin));
    }
  }

  const message = encodeURIComponent("Resetlink is ongeldig of verlopen. Vraag een nieuwe aan.");
  return NextResponse.redirect(new URL(`/login?error=${message}`, url.origin));
}
