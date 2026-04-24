// Singapore Feng Shui scoring helpers (Google Edition).
//
// Period 9 (2024–2043) Wealth Auspicious facing: South sector 150°–210°.
// We keep the local waterbodies.json-style list for proximity since Google
// Places doesn't reliably enumerate "reservoir" centroids in SG.

export type LatLng = { lat: number; lng: number };

export type Waterbody = { name: string; lat: number; lng: number; kind: string };

export const SG_WATERBODIES: Waterbody[] = [
  { name: "Marina Reservoir", lat: 1.2897, lng: 103.8632, kind: "Reservoir" },
  { name: "Marina Bay", lat: 1.2830, lng: 103.8607, kind: "Bay" },
  { name: "Kallang Basin", lat: 1.3030, lng: 103.8720, kind: "Basin" },
  { name: "Singapore River", lat: 1.2879, lng: 103.8476, kind: "River" },
  { name: "MacRitchie Reservoir", lat: 1.3417, lng: 103.8253, kind: "Reservoir" },
  { name: "Lower Peirce Reservoir", lat: 1.3700, lng: 103.8200, kind: "Reservoir" },
  { name: "Upper Peirce Reservoir", lat: 1.3700, lng: 103.8050, kind: "Reservoir" },
  { name: "Bedok Reservoir", lat: 1.3398, lng: 103.9320, kind: "Reservoir" },
  { name: "Jurong Lake", lat: 1.3380, lng: 103.7270, kind: "Lake" },
  { name: "Pandan Reservoir", lat: 1.3170, lng: 103.7470, kind: "Reservoir" },
  { name: "Lower Seletar Reservoir", lat: 1.3970, lng: 103.8330, kind: "Reservoir" },
  { name: "Upper Seletar Reservoir", lat: 1.4080, lng: 103.8050, kind: "Reservoir" },
  { name: "Punggol Waterway", lat: 1.4030, lng: 103.9080, kind: "Waterway" },
  { name: "Sungei Serangoon", lat: 1.3870, lng: 103.9100, kind: "River" },
  { name: "Sungei Punggol", lat: 1.4150, lng: 103.9050, kind: "River" },
  { name: "Geylang River", lat: 1.3050, lng: 103.8830, kind: "River" },
  { name: "Rochor Canal", lat: 1.3030, lng: 103.8550, kind: "Canal" },
  { name: "East Coast (sea)", lat: 1.3010, lng: 103.9120, kind: "Sea" },
  { name: "West Coast (sea)", lat: 1.2900, lng: 103.7600, kind: "Sea" },
  { name: "Sentosa Waterfront", lat: 1.2494, lng: 103.8303, kind: "Sea" },
  { name: "Pulau Ubin Strait", lat: 1.4100, lng: 103.9700, kind: "Strait" },
  { name: "Bukit Timah Canal", lat: 1.3300, lng: 103.7900, kind: "Canal" },
];

const R = 6371000;

export function haversine(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearestWaterbody(point: LatLng) {
  let best = SG_WATERBODIES[0];
  let bestDist = haversine(point, best);
  for (const w of SG_WATERBODIES.slice(1)) {
    const d = haversine(point, w);
    if (d < bestDist) {
      best = w;
      bestDist = d;
    }
  }
  return { water: best, distance: bestDist };
}

export function bearing(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function compass16(deg: number): string {
  const dirs = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW",
  ];
  return dirs[Math.round(deg / 22.5) % 16];
}

// Period 9 South sector per master prompt: 150° – 210°.
export function isPeriod9Auspicious(deg: number | null): boolean {
  if (deg == null) return false;
  return deg >= 150 && deg <= 210;
}

export type ScoreInput = {
  waterDistanceM: number;
  facingDeg: number | null;
  hasRoad: boolean;
};

export type ScoreResult = {
  score: number;
  waterPoints: number;
  facingPoints: number;
  basePoints: number;
  facingLabel: string;
  facingClass: "wealth" | "neutral" | "support";
  summary: string;
  notes: string[];
};

export function computeQiScore({ waterDistanceM, facingDeg, hasRoad }: ScoreInput): ScoreResult {
  const notes: string[] = [];
  const basePoints = 50;

  let waterPoints = 0;
  if (waterDistanceM <= 500) waterPoints = 20;
  else if (waterDistanceM <= 1500)
    waterPoints = Math.round((1 - (waterDistanceM - 500) / 1000) * 20);
  if (waterPoints > 0)
    notes.push(`Water element ${Math.round(waterDistanceM)}m away (+${waterPoints})`);
  else notes.push(`No major water within 1.5km`);

  let facingPoints = 0;
  let facingLabel = "Unknown facing";
  let facingClass: ScoreResult["facingClass"] = "neutral";

  if (facingDeg == null || !hasRoad) {
    facingLabel = "Facing direction unknown";
    notes.push("No nearby road found to infer facing");
  } else {
    const d = facingDeg;
    if (isPeriod9Auspicious(d)) {
      facingPoints = 30;
      facingLabel = "South — Auspicious for Period 9";
      facingClass = "wealth";
      notes.push(`Period 9 South facing (${Math.round(d)}°) (+30)`);
    } else if ((d >= 120 && d < 150) || (d > 210 && d <= 240)) {
      facingPoints = 18;
      facingLabel = "Near-South — Supportive";
      facingClass = "support";
      notes.push(`Near-South facing (${Math.round(d)}°) (+18)`);
    } else if (d >= 45 && d <= 135) {
      facingPoints = 12;
      facingLabel = "East-leaning — Growth";
      facingClass = "support";
      notes.push(`East-leaning facing (${Math.round(d)}°) (+12)`);
    } else {
      facingPoints = 6;
      facingLabel = "Neutral facing";
      notes.push(`Neutral facing (${Math.round(d)}°) (+6)`);
    }
  }

  const score = Math.min(100, basePoints + waterPoints + facingPoints);

  let summary = "";
  if (score >= 85) summary = "Exceptional Qi — strong wealth and water alignment.";
  else if (score >= 70) summary = "Auspicious Qi — favourable energetic balance.";
  else if (score >= 55) summary = "Balanced Qi — neutral, with room to enhance.";
  else summary = "Subdued Qi — consider water features or directional cures.";

  return { score, waterPoints, facingPoints, basePoints, facingLabel, facingClass, summary, notes };
}
