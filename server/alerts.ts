// Alertes pour la conseillère (nouveau lead, rendez-vous pris). Deux canaux gratuits, chacun facultatif :
// - e-mail, via le service d'envoi déjà configuré (Resend / Brevo) ;
// - Telegram (bot gratuit) : notification immédiate sur le téléphone.
// Variables : ALERT_EMAIL (sinon MAIL_REPLY_TO), TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
import { isMailConfigured, mailConfig, sendEmail } from "./mailer";

export interface Alert {
  title: string;
  lines: string[];
  link?: string;
  linkLabel?: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function alertChannels() {
  const email = (process.env.ALERT_EMAIL || process.env.MAIL_REPLY_TO || "").trim();
  return {
    email: isMailConfigured() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null,
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  };
}

/** Never throws: an alert that fails must not break the visitor's journey. */
export async function notifyAdvisor(alert: Alert): Promise<{ email: boolean; telegram: boolean; errors: string[] }> {
  const ch = alertChannels();
  const out = { email: false, telegram: false, errors: [] as string[] };

  if (ch.email) {
    try {
      const text = `${alert.title}\n\n${alert.lines.join("\n")}${alert.link ? `\n\n${alert.linkLabel || "Ouvrir"} : ${alert.link}` : ""}`;
      const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1c1917">
<h2 style="margin:0 0 12px;font-size:18px">${esc(alert.title)}</h2>
${alert.lines.map((l) => `<p style="margin:4px 0;font-size:15px">${esc(l)}</p>`).join("")}
${alert.link ? `<p style="margin:20px 0 0"><a href="${esc(alert.link)}" style="display:inline-block;background:#0f1f3d;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">${esc(alert.linkLabel || "Ouvrir")}</a></p>` : ""}
</div>`;
      const r = await sendEmail({ to: ch.email, subject: alert.title, text, html });
      if (r.ok === true) out.email = true;
      else out.errors.push(`E-mail : ${r.error}`);
    } catch (e: any) {
      out.errors.push(`E-mail : ${e?.message || "erreur"}`);
    }
  }

  if (ch.telegram) {
    try {
      const body = `<b>${esc(alert.title)}</b>\n${alert.lines.map(esc).join("\n")}${alert.link ? `\n\n<a href="${esc(alert.link)}">${esc(alert.linkLabel || "Ouvrir")}</a>` : ""}`;
      const res = await fetch(`${process.env.TELEGRAM_API_BASE || "https://api.telegram.org"}/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: body, parse_mode: "HTML", disable_web_page_preview: true }),
      });
      if (res.ok) out.telegram = true;
      else out.errors.push(`Telegram : code ${res.status}`);
    } catch (e: any) {
      out.errors.push(`Telegram : ${e?.message || "erreur"}`);
    }
  }
  if (out.errors.length) console.warn("[alerts]", out.errors.join(" | "));
  return out;
}

void mailConfig; // (import kept for future use of the sender identity)
