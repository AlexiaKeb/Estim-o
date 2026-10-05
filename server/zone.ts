// Zone d'intervention : Lyon et un rayon autour (50 km par défaut). Sert à ne garder dans le parcours que les biens
// que la conseillère peut réellement visiter, pour ne pas payer (publicité) ni traiter des demandes hors secteur.

export const ZONE = {
  name: "Lyon",
  lat: 45.764,
  lon: 4.8357,
  radiusKm: Number(process.env.ZONE_RADIUS_KM) || 50,
};

export function distanceKm(la1: number, lo1: number, la2: number, lo2: number): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLa = toRad(la2 - la1);
  const dLo = toRad(lo2 - lo1);
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function zoneFromCoords(lat: number, lon: number): { inZone: boolean; distanceKm: number } {
  const d = distanceKm(ZONE.lat, ZONE.lon, lat, lon);
  return { inZone: d <= ZONE.radiusKm, distanceKm: Math.round(d) };
}

/**
 * Locates a property with the national address base and tells whether it is inside the zone.
 * Fails open (inZone: null) when the address service is unreachable: a real seller must never be turned away by an outage.
 */
export async function checkZone(q: { address?: string; city?: string; postalCode?: string }): Promise<{ inZone: boolean | null; distanceKm?: number }> {
  const base = process.env.BAN_API_URL || "https://api-adresse.data.gouv.fr";
  const tries = [`${q.address || ""} ${q.postalCode || ""} ${q.city || ""}`.trim(), `${q.city || ""} ${q.postalCode || ""}`.trim()].filter(Boolean);
  for (const text of tries) {
    try {
      const res = await fetch(`${base}/search/?q=${encodeURIComponent(text)}&limit=1${q.postalCode ? `&postcode=${encodeURIComponent(q.postalCode)}` : ""}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const f = (await res.json())?.features?.[0];
      const [lon, lat] = f?.geometry?.coordinates || [];
      if (typeof lat === "number" && typeof lon === "number") return zoneFromCoords(lat, lon);
    } catch {
      /* try the next query */
    }
  }
  return { inZone: null };
}
