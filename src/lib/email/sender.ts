type SendEmailInput = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

import { adminDatabase } from "@/lib/admin/config";

export async function sendEmail(input: SendEmailInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const { apiKey, from } = getEmailConfig();

  if (!apiKey || !from) {
    // No-op in dev / when not configured.
    return { ok: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Email provider error (${res.status}): ${body || res.statusText}` };
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: msg };
  }
}

function getEmailConfig(): { apiKey: string; from: string } {
  const envKey = process.env.RESEND_API_KEY || "";
  const envFrom = process.env.EMAIL_FROM || "";
  if (envKey && envFrom) return { apiKey: envKey, from: envFrom };

  try {
    // Fallback to in-app admin settings (runtime only; not persisted across restarts).
    const settings = adminDatabase.emailSettings;
    const key = typeof settings.resendApiKey === "string" ? settings.resendApiKey : "";
    const from = typeof settings.emailFrom === "string" ? settings.emailFrom : "";
    const enabled = Boolean(settings.enabled);
    if (enabled && key && from) return { apiKey: key, from };
  } catch {
    // ignore
  }

  return { apiKey: "", from: "" };
}
