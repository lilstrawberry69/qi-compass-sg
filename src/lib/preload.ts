// Preload cache for the default postal code (018956).
// First visit fetches live data via Google APIs and stores it in localStorage,
// so subsequent visits hydrate synchronously with zero network.

import type { Amenity } from "./places";
import type { ScoreResult } from "./fengshui";
import type { UtilityScore } from "./utility";

export const DEFAULT_POSTAL = "018956";
const CACHE_KEY = "qiscan:preload:018956:v1";

export type PreloadShape = {
  place: { building: string; address: string; lat: number; lng: number };
  facingDeg: number | null;
  roadName: string | null;
  water: { name: string; distance: number; lat: number; lng: number; kind: string };
  qiScore: ScoreResult;
  amenities: Amenity[];
  utilityScore: UtilityScore;
  generatedAt: string;
};

export function readPreload(): PreloadShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PreloadShape;
  } catch {
    return null;
  }
}

export function writePreload(data: PreloadShape) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // quota / private mode — ignore
  }
}
