"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function signIn(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent("Inloggen mislukt. Controleer je gegevens.")}`);
  }

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();

  if (email) {
    const supabase = await getSupabaseServerClient();
    const baseUrl = process.env.NEXT_PUBLIC_SCANNER_URL ?? "http://localhost:3002";
    // Geen foutmelding bij een onbekend e-mailadres — dat zou deze pagina bruikbaar maken
    // om te achterhalen welke adressen een account hebben.
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${baseUrl}/auth/reset-callback` });
  }

  redirect("/wachtwoord-vergeten?sent=1");
}

export async function setNewPassword(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    redirect(`/wachtwoord-resetten?error=${encodeURIComponent("Wachtwoord moet minstens 8 tekens bevatten.")}`);
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent("Resetlink is verlopen. Vraag een nieuwe aan.")}`);
  }

  redirect("/");
}
