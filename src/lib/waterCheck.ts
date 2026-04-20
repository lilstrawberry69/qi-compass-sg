// Wealth Qi water proximity check using Haversine distance
// against the curated OSM waterbodies GeoJSON in /public/waterbodies.geojson

import type { LatLng } from "./fengshui";
import { haversine } from "./fengshui";

export type WaterFeature = {
  type: "Feature";
  properties: Record<string, unknown> & { name?: string; water?: string; natural?: string };
  geometry: { type: "Point"; coordinates: [number, number] };
  id?: string;
};

export type WaterCollection = {
  type: "FeatureCollection";
  features: WaterFeature[];
};

export type NearestWater = {
  name: string;
  lat: number;
  lng: number;
  distanceM: number;
};

export type WealthQiResult = {
  wealthQi: boolean;
  nearest: NearestWater | null;
  thresholdM: number;
};

let cached: WaterFeature[] | null = null;

/** Load and cache the waterbodies GeoJSON (Point features). */
export async function loadWaterbodies(): Promise<WaterFeature[]> {
  if (cached) return cached;
  const res = await fetch("/waterbodies.geojson");
  if (!res.ok) throw new Error(`Failed to load waterbodies.geojson: ${res.status}`);
  const json = (await res.json()) as WaterCollection;
  cached = (json.features ?? []).filter(
    (f) => f.geometry?.type === "Point" && Array.isArray(f.geometry.coordinates)
  );
  return cached;
}

/**
 * Loops through the waterbodies and returns true if ANY point is within
 * `thresholdM` meters of the user's location (default 500m = Wealth Qi bonus).
 * Also returns the nearest waterbody for UI display.
 */
export async function checkWealthQi(
  user: LatLng,
  thresholdM = 500
): Promise<WealthQiResult> {
  const features = await loadWaterbodies();

  let nearest: NearestWater | null = null;
  let wealthQi = false;

  for (const f of features) {
    const [lng, lat] = f.geometry.coordinates;
    const d = haversine(user, { lat, lng });

    if (!nearest || d < nearest.distanceM) {
      nearest = {
        name:
          (f.properties?.name as string) ||
          (f.properties?.water as string) ||
          (f.properties?.natural as string) ||
          "Unnamed water",
        lat,
        lng,
        distanceM: d,
      };
    }

    if (d < thresholdM) {
      wealthQi = true;
    }
  }

  return { wealthQi, nearest, thresholdM };
}
