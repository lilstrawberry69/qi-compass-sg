// OneMap Theme API client + mock fast-food generator.
// NOTE: paste your OneMap access token below. Tokens are visible in the client bundle
// (per user's choice). For production, move this into a Lovable Cloud edge function.

import type { LatLng } from "./fengshui";
import { haversine } from "./fengshui";

export const ONEMAP_TOKEN = ""; // <-- paste OneMap access token here

export type AmenityCategory =
  | "education"
  | "food"
  | "medical"
  | "greenery"
  | "transport"
  | "fastfood";

export type Amenity = {
  id: string;
  name: string;
  category: AmenityCategory;
  theme: string;
  lat: number;
  lng: number;
  distanceM: number;
  address?: string;
};

export const THEME_MAP: { theme: string; category: AmenityCategory }[] = [
  { theme: "kindergartens", category: "education" },
  { theme: "primary_schools", category: "education" },
  { theme: "hawkercentre", category: "food" },
  { theme: "chas_clinics", category: "medical" },
  { theme: "moh_hospitals", category: "medical" },
  { theme: "nationalparks", category: "greenery" },
  { theme: "mrtstation", category: "transport" },
];

/** Build a rough lat/lng bbox covering `radiusM` around the point. */
function bbox(point: LatLng, radiusM: number): string {
  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.cos((point.lat * Math.PI) / 180));
  const latMin = point.lat - dLat;
  const latMax = point.lat + dLat;
  const lngMin = point.lng - dLng;
  const lngMax = point.lng + dLng;
  // OneMap expects: latMin,lngMin,latMax,lngMax
  return `${latMin},${lngMin},${latMax},${lngMax}`;
}

type ThemeRow = {
  NAME?: string;
  DESCRIPTION?: string;
  ADDRESSBLOCKHOUSENUMBER?: string;
  ADDRESSSTREETNAME?: string;
  LatLng?: string; // "lat,lng"
  Latitude?: string;
  Longitude?: string;
};

/** Fetch a single OneMap theme around the point. */
async function fetchTheme(
  theme: string,
  point: LatLng,
  radiusM: number
): Promise<ThemeRow[]> {
  if (!ONEMAP_TOKEN) return [];
  const url = `https://www.onemap.gov.sg/api/public/themesvc/retrieveTheme?queryName=${encodeURIComponent(
    theme
  )}&extents=${bbox(point, radiusM)}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${ONEMAP_TOKEN}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Response shape: { SrchResults: [ {FeatCount,Theme_Name,...}, ...rows ] }
    const rows: ThemeRow[] = Array.isArray(data?.SrchResults)
      ? data.SrchResults.slice(1)
      : [];
    return rows;
  } catch {
    return [];
  }
}

function parseLatLng(row: ThemeRow): LatLng | null {
  if (row.LatLng && row.LatLng.includes(",")) {
    const [la, ln] = row.LatLng.split(",").map((s) => parseFloat(s.trim()));
    if (Number.isFinite(la) && Number.isFinite(ln)) return { lat: la, lng: ln };
  }
  if (row.Latitude && row.Longitude) {
    const la = parseFloat(row.Latitude);
    const ln = parseFloat(row.Longitude);
    if (Number.isFinite(la) && Number.isFinite(ln)) return { lat: la, lng: ln };
  }
  return null;
}

/** Fetch all OneMap themes within radiusM of the point and flatten into Amenities. */
export async function fetchAllAmenities(
  point: LatLng,
  radiusM = 1000
): Promise<Amenity[]> {
  const tasks = THEME_MAP.map(async ({ theme, category }) => {
    const rows = await fetchTheme(theme, point, radiusM);
    const out: Amenity[] = [];
    rows.forEach((r, i) => {
      const ll = parseLatLng(r);
      if (!ll) return;
      const d = haversine(point, ll);
      if (d > radiusM) return;
      out.push({
        id: `${theme}-${i}`,
        name: r.NAME || r.DESCRIPTION || theme,
        category,
        theme,
        lat: ll.lat,
        lng: ll.lng,
        distanceM: d,
        address: [r.ADDRESSBLOCKHOUSENUMBER, r.ADDRESSSTREETNAME]
          .filter(Boolean)
          .join(" "),
      });
    });
    return out;
  });

  const results = await Promise.all(tasks);
  const live = results.flat();

  // Fast food (mocked per user choice) + fallback if OneMap token empty
  const fastFood = mockFastFood(point, radiusM);
  const fallback = live.length === 0 ? mockAmenities(point, radiusM) : [];

  return [...live, ...fastFood, ...fallback];
}

/** Mock McDonald's / KFC / Burger King points within radius. */
export function mockFastFood(point: LatLng, radiusM: number): Amenity[] {
  const brands = ["McDonald's", "KFC", "Burger King", "McDonald's", "KFC"];
  return brands.map((name, i) => {
    const angle = (i / brands.length) * 2 * Math.PI + 0.4;
    const r = radiusM * (0.3 + 0.15 * i);
    const lat = point.lat + (Math.cos(angle) * r) / 111320;
    const lng =
      point.lng +
      (Math.sin(angle) * r) / (111320 * Math.cos((point.lat * Math.PI) / 180));
    return {
      id: `ff-${i}`,
      name,
      category: "fastfood" as AmenityCategory,
      theme: "fastfood",
      lat,
      lng,
      distanceM: r,
    };
  });
}

/** Fallback mock dataset when no token is available, so the Utility tab still works. */
function mockAmenities(point: LatLng, radiusM: number): Amenity[] {
  const seed: Array<[string, AmenityCategory, string, number, number]> = [
    ["Little Bloom Kindergarten", "education", "kindergartens", 0.35, 20],
    ["Sunshine Primary School", "education", "primary_schools", 0.7, 110],
    ["Maxwell Food Centre", "food", "hawkercentre", 0.45, 200],
    ["Hong Lim Market", "food", "hawkercentre", 0.6, 80],
    ["Chinatown Hawker", "food", "hawkercentre", 0.8, 300],
    ["Healthway Clinic", "medical", "chas_clinics", 0.4, 60],
    ["SGH Outram", "medical", "moh_hospitals", 0.9, 150],
    ["Pearl's Hill Park", "greenery", "nationalparks", 0.55, 250],
    ["Outram Park MRT", "transport", "mrtstation", 0.3, 320],
  ];
  return seed.map(([name, category, theme, frac, bearingDeg], i) => {
    const rad = (bearingDeg * Math.PI) / 180;
    const r = radiusM * frac;
    const lat = point.lat + (Math.cos(rad) * r) / 111320;
    const lng =
      point.lng +
      (Math.sin(rad) * r) / (111320 * Math.cos((point.lat * Math.PI) / 180));
    return {
      id: `mock-${i}`,
      name,
      category,
      theme,
      lat,
      lng,
      distanceM: r,
    };
  });
}
