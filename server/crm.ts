// Maps Supabase rows (leads + conversations + rendez_vous) to the Lead shape used by the CRM screens.

export const CRM_KEYS = [
  "notes",
  "tasks",
  "activities",
  "mandate",
  "nurtureStep",
  "customSequence",
  "lastAction",
  "status",
  "meetingType",
  "valuation",
  "autoRelances",
] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

export function pickCrm(body: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of CRM_KEYS) if (body[k] !== undefined) out[k] = body[k];
  return out;
}

function mapTimeframe(raw?: string | null): string {
  const t = (raw || "").toLowerCase();
  if (!t) return "Curiosité";
  if (/(imm[ée]diat|urgent|<\s*1|moins d.un mois)/.test(t)) return "< 1 mois";
  if (/curios|simple|estimation/.test(t)) return "Curiosité";
  const m = t.match(/(\d+)\s*(mois|ans?)/);
  if (m) {
    const months = m[2].startsWith("an") ? Number(m[1]) * 12 : Number(m[1]);
    if (months <= 1) return "< 1 mois";
    if (months <= 3) return "1-3 mois";
    if (months <= 6) return "3-6 mois";
    return "> 6 mois";
  }
  if (/1[-– ]?3/.test(t)) return "1-3 mois";
  if (/3[-– ]?6/.test(t)) return "3-6 mois";
  return "> 6 mois";
}

function mapMotive(raw?: string | null): string {
  const t = (raw || "").toLowerCase();
  if (/success|h[ée]ritage/.test(t)) return "Succession";
  if (/mutation/.test(t)) return "Mutation pro";
  if (/agrandi|famil|naissance/.test(t)) return "Agrandissement";
  if (/divorce|s[ée]paration/.test(t)) return "Divorce / Séparation";
  if (/invest/.test(t)) return "Vente investissement";
  return "Autre";
}

function parisParts(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const g = (t: string) => parts.find((p) => p.type === t)?.value || "00";
  return { date: `${g("year")}-${g("month")}-${g("day")}`, time: `${g("hour")}:${g("minute")}` };
}

function relative(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  if (diffMin < 60) return diffMin < 2 ? "À l'instant" : `Il y a ${diffMin} min`;
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  if (diffMin < 1440) return cap(rtf.format(-Math.round(diffMin / 60), "hour"));
  if (diffMin < 43200) return cap(rtf.format(-Math.round(diffMin / 1440), "day"));
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" });
}

export function toLead(row: any, conv?: any, rdvs: any[] = []) {
  const crm = row.crm && typeof row.crm === "object" ? row.crm : {};
  const score = Number(row.score_qualification) || 0;
  const derivedStatus =
    row.statut === "perdu" ? "COLD" : score >= 75 || row.statut === "qualifie" || row.statut === "rdv_pris" ? "HOT" : score >= 50 ? "WARM" : "COLD";

  const confirmed = rdvs.filter((r) => r.statut === "confirme").sort((a, b) => a.creneau.localeCompare(b.creneau));
  const upcoming = confirmed.find((r) => new Date(r.creneau).getTime() >= Date.now()) || confirmed[confirmed.length - 1];
  const meeting = upcoming ? parisParts(upcoming.creneau) : null;

  const messages: any[] = Array.isArray(conv?.messages) ? conv.messages : [];
  const history = messages.map((m, i) => ({
    id: `m-${row.id}-${i}`,
    role: m.role === "user" ? "user" : "assistant",
    content: String(m.content || ""),
    timestamp: m.timestamp && !isNaN(new Date(m.timestamp).getTime())
      ? new Date(m.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })
      : "",
  }));

  return {
    id: row.id,
    name: row.nom,
    phone: row.telephone,
    email: row.email || "",
    address: row.adresse || undefined,
    propertyType: row.type_bien || "Bien",
    surface: Number(row.surface) || 0,
    city: row.ville_bien || "",
    estimatedValue: Number(row.valeur_estimee) || 0,
    motive: mapMotive(row.motif),
    timeframe: mapTimeframe(row.delai_projet),
    status: crm.status || derivedStatus,
    score,
    meetingBooked: Boolean(meeting),
    meetingDate: meeting?.date,
    meetingTime: meeting?.time,
    meetingType: crm.meetingType || (meeting ? "Visite estimation à domicile" : undefined),
    createdAt: relative(row.created_at),
    createdAtIso: row.created_at,
    conversationHistory: history,
    notes: crm.notes,
    nurtureStep: crm.nurtureStep,
    customSequence: crm.customSequence,
    lastAction: crm.lastAction,
    tasks: crm.tasks,
    activities: crm.activities,
    mandate: crm.mandate,
    valuation: crm.valuation,
    autoRelances: crm.autoRelances,
    calBookingId: upcoming?.cal_booking_id,
  };
}
