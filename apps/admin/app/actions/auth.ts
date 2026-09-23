"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";

/** feest-admin heeft — anders dan feest-website — geen eigen domein, dus Vercel's
 * SSO-deploymentbeveiliging ("alles behalve custom domains") staat ook op de productie-URL
 * aan. Zonder deze queryparams loopt de browser die op de resetlink in de e-mail klikt eerst
 * tegen Vercel's eigen inlogscherm aan, vóórdat onze route (en de daadwerkelijke,
 * Supabase-gebaseerde auth) ooit bereikt wordt. Dit zijn Vercel's eigen "Protection Bypass
 * for Automation"-queryparams (Settings -> Deployment Protection); zonder ingestelde
 * VERCEL_AUTOMATION_BYPASS_SECRET (bv. lokaal, of op een project zonder deze bescherming)
 * blijft de link ongewijzigd. */
function buildAdminRedirectUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";
  const url = new URL(path, baseUrl);
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (bypassSecret) {
    url.searchParams.set("x-vercel-protection-bypass", bypassSecret);
    url.searchParams.set("x-vercel-set-bypass-cookie", "true");
  }
  return url.toString();
}

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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildAdminRedirectUrl("/auth/reset-callback"),
    });

    // Alleen een rate-limit-fout tonen we door: dat lekt niets over welke adressen een
    // account hebben, maar voorkomt dat iemand denkt dat de mail onderweg is terwijl
    // Supabase 'm nooit heeft verstuurd (de standaard e-maillimiet is erg laag).
    if (error?.status === 429) {
      redirect(
        `/wachtwoord-vergeten?error=${encodeURIComponent("Te veel resetpogingen. Probeer het over een uur opnieuw.")}`,
      );
    }
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
