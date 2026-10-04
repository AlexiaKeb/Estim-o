// Sends real e-mails over HTTPS (Resend or Brevo). SMTP ports are blocked on most free hosting plans,
// so an HTTP API is the reliable option.

export interface MailConfig {
  provider: "resend" | "brevo" | null;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  bcc: string;
}

export function mailConfig(): MailConfig {
  const provider = process.env.RESEND_API_KEY ? "resend" : process.env.BREVO_API_KEY ? "brevo" : null;
  const fromEmail = process.env.MAIL_FROM_EMAIL || "";
  return {
    provider: provider && fromEmail ? provider : null,
    fromEmail,
    fromName: process.env.MAIL_FROM_NAME || process.env.AGENT_NAME || "Agent Estimation",
    replyTo: process.env.MAIL_REPLY_TO || fromEmail,
    bcc: process.env.MAIL_BCC || "",
  };
}

export function isMailConfigured(): boolean {
  return mailConfig().provider !== null;
}

export interface OutgoingMail {
  to: string;
  toName?: string;
  subject: string;
  text: string;
  html: string;
  unsubscribeUrl?: string;
}

export async function sendEmail(mail: OutgoingMail): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const cfg = mailConfig();
  if (!cfg.provider) {
    return { ok: false, error: "L'envoi d'e-mails n'est pas configuré (clé du service d'envoi et adresse expéditeur manquantes)." };
  }
  const headers: Record<string, string> = {};
  if (mail.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${mail.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  try {
    if (cfg.provider === "resend") {
      const res = await fetch(`${process.env.RESEND_API_BASE || "https://api.resend.com"}/emails`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          from: `${cfg.fromName} <${cfg.fromEmail}>`,
          to: [mail.to],
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
          reply_to: cfg.replyTo,
          ...(cfg.bcc ? { bcc: [cfg.bcc] } : {}),
          ...(Object.keys(headers).length ? { headers } : {}),
        }),
      });
      const body: any = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: body?.message || body?.error?.message || `Resend a refusé l'envoi (code ${res.status}).` };
      return { ok: true, id: String(body.id || "") };
    }

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY as string, "Content-Type": "application/json", accept: "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        sender: { name: cfg.fromName, email: cfg.fromEmail },
        to: [{ email: mail.to, ...(mail.toName ? { name: mail.toName } : {}) }],
        subject: mail.subject,
        textContent: mail.text,
        htmlContent: mail.html,
        replyTo: { email: cfg.replyTo },
        ...(cfg.bcc ? { bcc: [{ email: cfg.bcc }] } : {}),
        ...(Object.keys(headers).length ? { headers } : {}),
      }),
    });
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body?.message || `Brevo a refusé l'envoi (code ${res.status}).` };
    return { ok: true, id: String(body.messageId || "") };
  } catch (e: any) {
    return { ok: false, error: `Service d'envoi injoignable : ${e.message}` };
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface TemplateInput {
  body: string;
  signatureName: string;
  signatureLine: string;
  phone: string;
  bookingUrl?: string;
  unsubscribeUrl: string;
}

/** Plain, readable e-mail: the message, a signature, a legal footer with the unsubscribe link. */
export function renderEmail(t: TemplateInput): { text: string; html: string } {
  const text = [
    t.body.trim(),
    "",
    `${t.signatureName}`,
    t.signatureLine,
    t.phone ? `Tél. ${t.phone}` : "",
    t.bookingUrl ? `\nRéserver une visite : ${t.bookingUrl}` : "",
    "",
    "—",
    `Vous recevez ce message suite à votre demande d'estimation. Pour ne plus recevoir de messages : ${t.unsubscribeUrl}`,
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");

  const paragraphs = t.body
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#f6f5f3;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1c1917">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
${paragraphs}
<p style="margin:22px 0 0;line-height:1.5"><strong>${esc(t.signatureName)}</strong><br>${esc(t.signatureLine)}${t.phone ? `<br>Tél. ${esc(t.phone)}` : ""}</p>
${t.bookingUrl ? `<p style="margin:20px 0 0"><a href="${esc(t.bookingUrl)}" style="display:inline-block;background:#1c1917;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">Réserver une visite</a></p>` : ""}
</div>
<p style="max-width:560px;margin:14px auto 0;font-size:12px;color:#78716c;line-height:1.5">Vous recevez ce message suite à votre demande d'estimation. <a href="${esc(t.unsubscribeUrl)}" style="color:#78716c">Ne plus recevoir ces messages</a>.</p>
</body></html>`;
  return { text, html };
}

/** Replaces {Prénom}, {Ville}, {TypeBien}, {PrixEstime}, {Motif} with the lead's real data. */
export function fillVariables(text: string, lead: { nom?: string; ville_bien?: string; type_bien?: string; valeur_estimee?: number | string | null; motif?: string | null }): string {
  const first = (lead.nom || "").trim().split(/\s+/)[0] || "";
  const price = Number(lead.valeur_estimee) > 0 ? `${Math.round(Number(lead.valeur_estimee)).toLocaleString("fr-FR")} €` : "";
  return text
    .replace(/\{Pr[ée]nom\}/gi, first)
    .replace(/\{Ville\}/gi, lead.ville_bien || "")
    .replace(/\{TypeBien\}/gi, (lead.type_bien || "bien").toLowerCase())
    .replace(/\{PrixEstime\}/gi, price)
    .replace(/\{Motif\}/gi, lead.motif || "");
}
