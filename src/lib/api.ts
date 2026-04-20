// API helpers: OneMap (Singapore postal code → location) + Overpass (nearest road)

import type { LatLng } from "./fengshui";
import { bearing } from "./fengshui";

export type OneMapResult = {
  lat: number;
  lng: number;
  building: string;
  address: string;
  postal: string;
};

export async function lookupPostal(postalCode: string): Promise<OneMapResult> {
  const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(
    postalCode
  )}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OneMap request failed (${res.status})`);
  const data = await res.json();
  const hit = data?.results?.[0];
  if (!hit) throw new Error("No address found for that postal code.");
  return {
    lat: parseFloat(hit.LATITUDE),
    lng: parseFloat(hit.LONGITUDE),
    building: hit.BUILDING && hit.BUILDING !== "NIL" ? hit.BUILDING : hit.SEARCHVAL || "Building",
    address: hit.ADDRESS || "",
    postal: hit.POSTAL || postalCode,
  };
}

// Query Overpass for road segments within ~150m and return facing bearing toward the nearest one.
export async function nearestRoadBearing(point: LatLng): Promise<{ deg: number | null; roadName: string | null }> {
  const radius = 150;
  const query = `[out:json][timeout:15];
way(around:${radius},${point.lat},${point.lng})[highway~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|service)$"];
out geom 40;`;

  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];

  let data: any = null;
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(query),
      });
      if (res.ok) {
        data = await res.json();
        break;
      }
    } catch {
      // try next
    }
  }
  if (!data?.elements?.length) return { deg: null, roadName: null };

  // Find nearest segment across all ways
  let bestDist = Infinity;
  let bestPoint: LatLng | null = null;
  let bestRoad: string | null = null;

  for (const el of data.elements) {
    const geom: { lat: number; lon: number }[] = el.geometry || [];
    const name: string | undefined = el.tags?.name || el.tags?.ref;
    for (let i = 0; i < geom.length - 1; i++) {
      const a = { lat: geom[i].lat, lng: geom[i].lon };
      const b = { lat: geom[i + 1].lat, lng: geom[i + 1].lon };
      const proj = projectPointOnSegment(point, a, b);
      const d = haversineMeters(point, proj);
      if (d < bestDist) {
        bestDist = d;
        bestPoint = proj;
        bestRoad = name || el.tags?.highway || null;
      }
    }
  }
  if (!bestPoint) return { deg: null, roadName: null };

  // Facing direction = from building toward nearest road point
  return { deg: bearing(point, bestPoint), roadName: bestRoad };
}

// --- small geometry utils (kept here to avoid circular imports) ---

function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
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

// Project point P onto segment AB on a local equirectangular plane
function projectPointOnSegment(p: LatLng, a: LatLng, b: LatLng): LatLng {
  const lat0 = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(lat0);
  const ax = a.lng * mPerDegLng, ay = a.lat * mPerDegLat;
  const bx = b.lng * mPerDegLng, by = b.lat * mPerDegLat;
  const px = p.lng * mPerDegLng, py = p.lat * mPerDegLat;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const x = ax + t * dx, y = ay + t * dy;
  return { lat: y / mPerDegLat, lng: x / mPerDegLng };
}
