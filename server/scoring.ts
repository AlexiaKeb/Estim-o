// Lead score: a transparent, deterministic rule set. The same inputs always give the same score,
// and every point can be explained to the advisor. (The AI chat never sets the score.)

export type Ownership = "seul" | "plusieurs" | "pas_encore";
export type Mandate = "aucun" | "estimations" | "simple" | "exclusif";
export type Occupancy = "occupe" | "libre" | "loue";

export interface Qualification {
  ownership?: Ownership;
  mandate?: Mandate;
  occupancy?: Occupancy;
  expectedPrice?: number | null;
  answeredAt?: string;
}

export interface ScoreInput extends Qualification {
  timeframe: string; // "< 1 mois" | "1-3 mois" | "3-6 mois" | "> 6 mois" | "Curiosité"
  motive: string; // "Succession" | "Mutation pro" | ... | "Autre"
  estimateLow?: number;
  estimateHigh?: number;
  booked?: boolean;
}

export interface ScoreReason {
  label: string;
  points: number;
}

export interface ScoreResult {
  score: number;
  status: "HOT" | "WARM" | "COLD";
  reasons: ScoreReason[];
  blockers: string[];
}

const TIMEFRAME_POINTS: Record<string, number> = { "< 1 mois": 30, "1-3 mois": 25, "3-6 mois": 15, "> 6 mois": 5, Curiosité: 0 };
const CONCRETE_MOTIVES = ["Succession", "Mutation pro", "Divorce / Séparation", "Agrandissement", "Vente investissement"];

export function computeScore(i: ScoreInput): ScoreResult {
  const reasons: ScoreReason[] = [];
  const blockers: string[] = [];
  const add = (label: string, points: number) => reasons.push({ label, points });

  add(`Délai du projet : ${i.timeframe}`, TIMEFRAME_POINTS[i.timeframe] ?? 0);
  if (CONCRETE_MOTIVES.includes(i.motive)) add(`Motif concret : ${i.motive}`, 10);

  if (i.ownership === "seul") add("Seul propriétaire : décision simple", 15);
  else if (i.ownership === "plusieurs") add("Plusieurs propriétaires : accord à obtenir", 8);
  else if (i.ownership === "pas_encore") add("Pas encore propriétaire (succession ou achat en cours)", 3);

  if (i.mandate === "aucun") add("Aucun mandat de vente en cours", 15);
  else if (i.mandate === "estimations") add("A reçu des estimations, aucun mandat signé", 12);
  else if (i.mandate === "simple") add("Mandat simple signé ailleurs", 5);
  else if (i.mandate === "exclusif") {
    add("Mandat exclusif signé ailleurs", -20);
    blockers.push("Mandat exclusif en cours chez une autre agence : impossible de le prendre avant son terme.");
  }

  if (i.occupancy === "occupe" || i.occupancy === "libre") add(i.occupancy === "libre" ? "Bien libre : visite facile" : "Occupé par le propriétaire : visite facile", 5);
  else if (i.occupancy === "loue") {
    add("Bien loué : locataire en place", 0);
    blockers.push("Bien loué : prévoir la coordination avec le locataire (préavis, visites).");
  }

  if (i.expectedPrice && i.estimateLow && i.estimateHigh) {
    const mid = (i.estimateLow + i.estimateHigh) / 2;
    const gap = i.expectedPrice / mid - 1; // +0.10 = 10 % above the estimate
    const pct = Math.round(Math.abs(gap) * 100);
    if (Math.abs(gap) <= 0.08) add("Prix espéré cohérent avec l'estimation", 15);
    else if (gap < 0) add(`Prix espéré ${pct} % sous l'estimation : vendeur motivé`, 10);
    else if (gap <= 0.2) add(`Prix espéré ${pct} % au-dessus de l'estimation`, 8);
    else {
      add(`Prix espéré ${pct} % au-dessus de l'estimation`, -5);
      blockers.push(`Attente de prix très supérieure à l'estimation (+${pct} %) : à cadrer dès la visite.`);
    }
  }

  if (i.booked) add("A réservé une visite", 35);

  const score = Math.max(0, Math.min(100, reasons.reduce((n, r) => n + r.points, 0)));
  let status: ScoreResult["status"] = score >= 65 ? "HOT" : score >= 35 ? "WARM" : "COLD";
  if (i.mandate === "exclusif" && status === "HOT") status = "WARM";
  return { score, status, reasons, blockers };
}

const OWNERSHIP: Ownership[] = ["seul", "plusieurs", "pas_encore"];
const MANDATE: Mandate[] = ["aucun", "estimations", "simple", "exclusif"];
const OCCUPANCY: Occupancy[] = ["occupe", "libre", "loue"];

/** Keeps only valid answers from an untrusted request body. */
export function sanitizeQualification(body: any): Qualification {
  const q: Qualification = {};
  if (OWNERSHIP.includes(body?.ownership)) q.ownership = body.ownership;
  if (MANDATE.includes(body?.mandate)) q.mandate = body.mandate;
  if (OCCUPANCY.includes(body?.occupancy)) q.occupancy = body.occupancy;
  const price = Number(body?.expectedPrice ?? body?.expected_price);
  if (isFinite(price) && price >= 20000 && price <= 20000000) q.expectedPrice = Math.round(price);
  return q;
}
