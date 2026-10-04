// Statistiques de marché par secteur, calculées à partir des ventes réelles (DVF). Aucun chiffre n'est écrit à la main :
// si les données ne sont pas disponibles, la page l'indique et n'est pas indexée.
import { DvfSale, loadCommuneYear, quantile } from "./dvf";
import { Area } from "../src/data/areas";

export interface SizeRow {
  label: string; // « 3 pièces »
  n: number;
  medianPrice: number;
  medianM2: number;
}

export interface TypeStats {
  n: number;
  medianM2: number;
  p25M2: number;
  p75M2: number;
  medianPrice: number;
  bySize: SizeRow[];
}

export interface AreaStats {
  apartment?: TypeStats;
  house?: TypeStats;
  totalSales: number;
  periodFrom: string;
  periodTo: string;
  /** Évolution du prix médian au m² des appartements : 12 derniers mois contre les 12 mois précédents */
  trend?: { pct: number; nRecent: number; nBefore: number };
  generatedAt: string;
}

const MIN_TYPE = 10;
const MIN_SIZE = 8;
const MIN_TREND = 30;

const med = (xs: number[]) => Math.round(quantile([...xs].sort((a, b) => a - b), 0.5));

function typeStats(sales: DvfSale[]): TypeStats | undefined {
  if (sales.length < MIN_TYPE) return undefined;
  const ppm2 = sales.map((s) => s.ppm2).sort((a, b) => a - b);
  const bySize: SizeRow[] = [];
  const groups: Array<[string, (r: number) => boolean]> = [
    ["1 pièce", (r) => r === 1],
    ["2 pièces", (r) => r === 2],
    ["3 pièces", (r) => r === 3],
    ["4 pièces", (r) => r === 4],
    ["5 pièces et plus", (r) => r >= 5],
  ];
  for (const [label, ok] of groups) {
    const g = sales.filter((s) => ok(s.r));
    if (g.length >= MIN_SIZE) bySize.push({ label, n: g.length, medianPrice: med(g.map((s) => s.p)), medianM2: med(g.map((s) => s.ppm2)) });
  }
  return {
    n: sales.length,
    medianM2: Math.round(quantile(ppm2, 0.5)),
    p25M2: Math.round(quantile(ppm2, 0.25)),
    p75M2: Math.round(quantile(ppm2, 0.75)),
    medianPrice: med(sales.map((s) => s.p)),
    bySize,
  };
}

/** Pure computation (tested without network). `now` is injectable. */
export function computeAreaStats(all: DvfSale[], now = new Date()): AreaStats | null {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const since24 = iso(new Date(now.getTime() - 24 * 30.44 * 86400000));
  const since12 = iso(new Date(now.getTime() - 12 * 30.44 * 86400000));

  let pool = all.filter((s) => s.d >= since24);
  if (pool.length < MIN_TYPE) return null;
  // Écarte les prix au m² aberrants par rapport à la médiane du secteur (même règle que l'estimation)
  const m0 = quantile(pool.map((s) => s.ppm2).sort((a, b) => a - b), 0.5);
  pool = pool.filter((s) => s.ppm2 >= m0 * 0.5 && s.ppm2 <= m0 * 1.8);

  const apartments = pool.filter((s) => s.t === "apartment");
  const houses = pool.filter((s) => s.t === "house");
  const apartment = typeStats(apartments);
  const house = typeStats(houses);
  if (!apartment && !house) return null;

  const dates = pool.map((s) => s.d).sort();
  let trend: AreaStats["trend"];
  const recent = apartments.filter((s) => s.d >= since12);
  const before = apartments.filter((s) => s.d < since12);
  if (recent.length >= MIN_TREND && before.length >= MIN_TREND) {
    const a = med(recent.map((s) => s.ppm2));
    const b = med(before.map((s) => s.ppm2));
    trend = { pct: Math.round(((a - b) / b) * 1000) / 10, nRecent: recent.length, nBefore: before.length };
  }
  return {
    apartment,
    house,
    totalSales: pool.length,
    periodFrom: dates[0],
    periodTo: dates[dates.length - 1],
    trend,
    generatedAt: now.toISOString(),
  };
}

const cache = new Map<string, { t: number; stats: AreaStats | null }>();
const TTL = 24 * 3600 * 1000;
const FAIL_TTL = 15 * 60 * 1000;

export async function getAreaStats(area: Area): Promise<AreaStats | null> {
  const hit = cache.get(area.slug);
  if (hit && Date.now() - hit.t < (hit.stats ? TTL : FAIL_TTL)) return hit.stats;
  const thisYear = new Date().getFullYear();
  const files = await Promise.all(area.codes.flatMap((c) => [thisYear, thisYear - 1, thisYear - 2].map((y) => loadCommuneYear(c, y))));
  const seen = new Set<string>();
  const sales = files.flatMap((x) => x || []).filter((s) => {
    const k = `${s.d}|${s.p}|${s.s}|${s.st}|${s.la}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const stats = computeAreaStats(sales);
  cache.set(area.slug, { t: Date.now(), stats });
  return stats;
}

/** Fills the cache in the background, a few sectors at a time, so that the first visitor (or crawler) is not slowed down. */
export function warmAreas(areas: Area[]) {
  void (async () => {
    for (let i = 0; i < areas.length; i += 3) await Promise.all(areas.slice(i, i + 3).map((a) => getAreaStats(a).catch(() => null)));
  })();
}
