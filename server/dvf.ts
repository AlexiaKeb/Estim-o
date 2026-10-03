// Estimation à partir des ventes réelles : DVF (Demandes de valeurs foncières, DGFiP / data.gouv.fr)
// et géocodage BAN (api-adresse.data.gouv.fr). Données ouvertes, sans clé d'API.
//
// Fichiers utilisés : https://files.data.gouv.fr/geo-dvf/latest/csv/{année}/communes/{dép}/{insee}.csv
import fs from "fs";
import path from "path";

const BAN_URL = process.env.BAN_API_URL || "https://api-adresse.data.gouv.fr";
const DVF_BASE = process.env.DVF_BASE_URL || "https://files.data.gouv.fr/geo-dvf/latest/csv";
const CACHE_DIR = path.join(process.cwd(), ".cache", "dvf");
const CACHE_TTL_MS = 7 * 24 * 3600 * 1000;
const MEM_TTL_MS = 24 * 3600 * 1000;

export interface DvfSale {
  d: string; // YYYY-MM-DD
  p: number; // prix de vente (€)
  s: number; // surface bâtie (m²)
  r: number; // pièces principales
  t: "apartment" | "house";
  la: number | null;
  lo: number | null;
  st: string; // rue (sans numéro)
  ppm2: number;
}

export interface Geo {
  lat: number | null;
  lon: number | null;
  citycode: string;
  city: string;
  precise: boolean; // adresse localisée au numéro/rue
}

export interface Comparable {
  street: string;
  month: string; // "mars 2025"
  surface: number;
  rooms: number;
  price: number;
  ppm2: number;
  distanceM: number | null;
}

export interface DvfEstimate {
  medianM2: number;
  p25M2: number;
  p75M2: number;
  sampleSize: number;
  radiusM: number | null; // null = toute la commune
  periodFrom: string;
  periodTo: string;
  precision: "adresse" | "commune";
  commune: string;
  comparables: Comparable[];
}

// ---------- CSV ----------
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Turns a geo-dvf commune file into clean single-property sales (one dwelling per sale). */
export function salesFromCsv(text: string): DvfSale[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const idx: Record<string, number> = {};
  rows[0].forEach((h, i) => (idx[h] = i));
  const need = ["id_mutation", "date_mutation", "nature_mutation", "valeur_fonciere", "type_local", "surface_reelle_bati"];
  if (need.some((k) => idx[k] === undefined)) return [];

  const byMutation = new Map<string, string[][]>();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r[idx.nature_mutation] !== "Vente") continue;
    const id = r[idx.id_mutation];
    (byMutation.get(id) || byMutation.set(id, []).get(id)!).push(r);
  }

  const out: DvfSale[] = [];
  for (const group of byMutation.values()) {
    const dwellings = new Map<string, string[]>();
    for (const r of group) {
      const type = r[idx.type_local];
      if (type !== "Appartement" && type !== "Maison") continue;
      // The same dwelling can repeat once per parcel: de-duplicate on its characteristics
      dwellings.set(`${type}|${r[idx.surface_reelle_bati]}|${r[idx.nombre_pieces_principales]}`, r);
    }
    if (dwellings.size !== 1) continue; // sales of several dwellings have no usable unit price
    const r = [...dwellings.values()][0];
    const price = parseFloat(r[idx.valeur_fonciere]);
    const surface = parseFloat(r[idx.surface_reelle_bati]);
    if (!(price > 0) || !(surface >= 9)) continue;
    const ppm2 = price / surface;
    if (ppm2 < 500 || ppm2 > 25000) continue;
    const lat = parseFloat(r[idx.latitude]);
    const lon = parseFloat(r[idx.longitude]);
    out.push({
      d: r[idx.date_mutation],
      p: Math.round(price),
      s: surface,
      r: parseInt(r[idx.nombre_pieces_principales] || "0", 10) || 0,
      t: r[idx.type_local] === "Maison" ? "house" : "apartment",
      la: isFinite(lat) ? lat : null,
      lo: isFinite(lon) ? lon : null,
      st: r[idx.adresse_nom_voie] || "",
      ppm2: Math.round(ppm2),
    });
  }
  return out;
}

// ---------- Loading with cache ----------
const mem = new Map<string, { t: number; sales: DvfSale[] | null }>();

async function loadCommuneYear(citycode: string, year: number): Promise<DvfSale[] | null> {
  const key = `${citycode}-${year}`;
  const hit = mem.get(key);
  if (hit && Date.now() - hit.t < (hit.sales ? MEM_TTL_MS : 15 * 60 * 1000)) return hit.sales;

  const file = path.join(CACHE_DIR, `${key}.json`);
  try {
    const st = fs.statSync(file);
    if (Date.now() - st.mtimeMs < CACHE_TTL_MS) {
      const sales = JSON.parse(fs.readFileSync(file, "utf8")) as DvfSale[];
      mem.set(key, { t: Date.now(), sales });
      return sales;
    }
  } catch {
    /* no disk cache */
  }

  const dep = citycode.startsWith("97") ? citycode.slice(0, 3) : citycode.slice(0, 2);
  const url = `${DVF_BASE}/${year}/communes/${dep}/${citycode}.csv`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) {
      mem.set(key, { t: Date.now(), sales: null });
      return null;
    }
    const sales = salesFromCsv(await res.text());
    mem.set(key, { t: Date.now(), sales });
    try {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(sales));
    } catch {
      /* read-only disk: memory cache only */
    }
    return sales;
  } catch (e: any) {
    console.warn(`[DVF] ${url} failed: ${e.message}`);
    mem.set(key, { t: Date.now(), sales: null });
    return null;
  }
}

// ---------- Geocoding ----------
// DVF files for Lyon / Paris / Marseille are keyed by arrondissement INSEE code.
function arrondissementCode(postcode: string, citycode: string): string {
  if (/^690(0[1-9])$/.test(postcode)) return `6938${postcode.slice(-1)}`;
  if (/^75(0[1-9]|1\d|20)$/.test(postcode)) return `751${postcode.slice(-2)}`;
  if (/^13(00[1-9]|01[0-6])$/.test(postcode)) return `132${postcode.slice(-2)}`;
  return citycode;
}

const geoCache = new Map<string, Geo | null>();

export async function geocode(address: string, city: string, postalCode: string): Promise<Geo | null> {
  const key = `${address}|${city}|${postalCode}`.toLowerCase();
  if (geoCache.has(key)) return geoCache.get(key)!;
  const attempts: Array<{ q: string; type?: string }> = [];
  if (address.trim()) attempts.push({ q: `${address} ${postalCode} ${city}` });
  attempts.push({ q: `${city} ${postalCode}`, type: "municipality" });

  let result: Geo | null = null;
  for (const a of attempts) {
    try {
      const url = `${BAN_URL}/search/?q=${encodeURIComponent(a.q)}&limit=1${postalCode ? `&postcode=${encodeURIComponent(postalCode)}` : ""}${a.type ? `&type=${a.type}` : ""}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const f = (await res.json())?.features?.[0];
      if (!f?.properties?.citycode) continue;
      const precise = !a.type && (f.properties.score ?? 0) >= 0.6 && ["housenumber", "street"].includes(f.properties.type);
      const [lon, lat] = f.geometry?.coordinates || [null, null];
      result = {
        lat: precise ? lat : null,
        lon: precise ? lon : null,
        citycode: arrondissementCode(f.properties.postcode || postalCode, f.properties.citycode),
        city: f.properties.city || city,
        precise,
      };
      break;
    } catch (e: any) {
      console.warn(`[BAN] geocoding failed: ${e.message}`);
    }
  }
  geoCache.set(key, result);
  return result;
}

// ---------- Estimation ----------
function distanceM(la1: number, lo1: number, la2: number, lo2: number): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLa = toRad(la2 - la1);
  const dLo = toRad(lo2 - lo1);
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const monthLabel = (iso: string) => `${MONTHS[parseInt(iso.slice(5, 7), 10) - 1] || ""} ${iso.slice(0, 4)}`;

export function computeEstimate(
  sales: DvfSale[],
  q: { type: "apartment" | "house"; surface: number; geo: Geo; now?: Date },
): DvfEstimate | null {
  const now = q.now || new Date();
  const since = new Date(now.getTime() - 36 * 30.44 * 86400000).toISOString().slice(0, 10);
  const lo = q.type === "house" ? 0.6 : 0.65;
  const hi = q.type === "house" ? 1.6 : 1.5;

  let pool = sales
    .filter((s) => s.t === q.type && s.d >= since && s.s >= q.surface * lo && s.s <= q.surface * hi)
    .map((s) => ({
      ...s,
      dist: q.geo.precise && q.geo.lat != null && s.la != null && s.lo != null ? distanceM(q.geo.lat, q.geo.lon!, s.la, s.lo) : null,
    }));
  if (pool.length < 5) return null;

  // Drop absurd unit prices relative to the commune median
  const med0 = quantile([...pool].map((s) => s.ppm2).sort((a, b) => a - b), 0.5);
  pool = pool.filter((s) => s.ppm2 >= med0 * 0.5 && s.ppm2 <= med0 * 1.8);

  const tiers: Array<number | null> = q.geo.precise ? [300, 600, 1000, 2000, null] : [null];
  let chosen: typeof pool = [];
  let radius: number | null = null;
  for (const t of tiers) {
    const set = t === null ? pool : pool.filter((s) => s.dist !== null && s.dist <= t);
    if (set.length >= 10 || (t === null && set.length >= 5)) {
      chosen = set;
      radius = t;
      break;
    }
  }
  if (chosen.length < 5) return null;

  const ppm2 = chosen.map((s) => s.ppm2).sort((a, b) => a - b);
  const comparables = [...chosen]
    .sort((a, b) => (a.dist ?? 1e9) - (b.dist ?? 1e9) || b.d.localeCompare(a.d))
    .slice(0, 4)
    .map((s) => ({
      street: s.st || "Adresse non communiquée",
      month: monthLabel(s.d),
      surface: Math.round(s.s),
      rooms: s.r,
      price: s.p,
      ppm2: s.ppm2,
      distanceM: s.dist === null ? null : Math.round(s.dist / 10) * 10,
    }));
  const dates = chosen.map((s) => s.d).sort();
  return {
    medianM2: Math.round(quantile(ppm2, 0.5)),
    p25M2: Math.round(quantile(ppm2, 0.25)),
    p75M2: Math.round(quantile(ppm2, 0.75)),
    sampleSize: chosen.length,
    radiusM: radius,
    periodFrom: dates[0],
    periodTo: dates[dates.length - 1],
    precision: q.geo.precise ? "adresse" : "commune",
    commune: q.geo.city,
    comparables,
  };
}

export async function estimateFromDvf(q: {
  address?: string;
  city: string;
  postalCode: string;
  type: "apartment" | "house";
  surface: number;
}): Promise<DvfEstimate | null> {
  const geo = await geocode(q.address || "", q.city, q.postalCode);
  if (!geo) return null;
  const thisYear = new Date().getFullYear();
  const years = [thisYear, thisYear - 1, thisYear - 2, thisYear - 3];
  const loaded = await Promise.all(years.map((y) => loadCommuneYear(geo.citycode, y)));
  const seen = new Set<string>();
  const sales = loaded.flatMap((x) => x || []).filter((s) => {
    const k = `${s.d}|${s.p}|${s.s}|${s.st}|${s.la}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (sales.length === 0) return null;
  return computeEstimate(sales, { type: q.type, surface: q.surface, geo });
}

/** Warm the cache for the commune in the background (called at server start for the home market). */
export function prewarm(citycodes: string[]) {
  const y = new Date().getFullYear();
  for (const c of citycodes) for (const yr of [y, y - 1, y - 2]) void loadCommuneYear(c, yr);
}
