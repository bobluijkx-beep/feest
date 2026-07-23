import "server-only";

const RESEND_API_URL = "https://api.resend.com/emails";

export interface EmailAttachment {
  filename: string;
  /** Base64-encoded content, zoals Resend verwacht. */
  content: string;
}

export type SendEmailResult =
  | { ok: true; messageId: string | null; error: null }
  | { ok: false; messageId: null; error: string };

/** Zelfde raw-fetch-patroon als lib/services/notifications.ts in het HR-portal-project,
 * uitgebreid met bijlagen (ticket-PDF + ICS-agenda-item). */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return { ok: false, messageId: null, error: "Resend is niet geconfigureerd." };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        attachments: params.attachments,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, messageId: null, error: `Resend ${res.status}: ${body.slice(0, 300)}` };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, messageId: data.id ?? null, error: null };
  } catch (err) {
    return { ok: false, messageId: null, error: err instanceof Error ? err.message : "Onbekende fout" };
  }
}
