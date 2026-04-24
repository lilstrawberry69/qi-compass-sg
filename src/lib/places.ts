// Google Maps API helpers — Geocoding, Nearby Places, nearest road bearing.
//
// All calls require the Maps JS script to be loaded with libraries=places,geometry.
// We call Places via google.maps.places.PlacesService (browser-side, billed via
// the same restricted key as Maps JS).

import { bearing, type LatLng } from "./fengshui";
import { GOOGLE_MAPS_API_KEY } from "./google";

export type PlaceResult = {
  lat: number;
  lng: number;
  building: string;
  address: string;
  postal: string;
};

export type AmenityCategory =
  | "transport"
  | "education"
  | "food"
  | "fastfood"
  | "medical"
  | "greenery";

export type Amenity = {
  id: string;
  name: string;
  category: AmenityCategory;
  lat: number;
  lng: number;
  distanceM: number;
  placeId?: string;
  rating?: number;
};

// ---------------- Geocoding ----------------

export async function geocodePostal(postal: string): Promise<PlaceResult> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("Google Maps API key not set in src/lib/google.ts");
  }
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?components=country:SG|postal_code:${encodeURIComponent(postal)}` +
    `&key=${GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding request failed (${res.status})`);
  const data = await res.json();
  if (data.status !== "OK" || !data.results?.length) {
    throw new Error(data.error_message || `No address found for ${postal}.`);
  }
  const hit = data.results[0];
  const loc = hit.geometry.location;
  // Best building name from address components if available.
  const premise =
    hit.address_components?.find((c: any) => c.types?.includes("premise"))?.long_name ||
    hit.address_components?.find((c: any) => c.types?.includes("establishment"))?.long_name ||
    null;
  return {
    lat: loc.lat,
    lng: loc.lng,
    building: premise || hit.formatted_address.split(",")[0] || "Building",
    address: hit.formatted_address || "",
    postal,
  };
}

// ---------------- Nearby Search via PlacesService ----------------

function distanceM(a: LatLng, b: LatLng): number {
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

function getPlacesService(): google.maps.places.PlacesService {
  // PlacesService needs a DOM node (or a Map). A detached div is the standard trick.
  const node = document.createElement("div");
  return new google.maps.places.PlacesService(node);
}

function nearbySearch(
  request: google.maps.places.PlaceSearchRequest
): Promise<google.maps.places.PlaceResult[]> {
  return new Promise((resolve) => {
    const svc = getPlacesService();
    svc.nearbySearch(request, (results, status) => {
      if (
        status === google.maps.places.PlacesServiceStatus.OK ||
        status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS
      ) {
        resolve(results || []);
      } else {
        console.warn("[Places] nearbySearch failed:", status);
        resolve([]);
      }
    });
  });
}

const FAST_FOOD_BRANDS = ["mcdonald", "kfc", "burger king", "subway", "popeyes"];

function classifyFood(p: google.maps.places.PlaceResult): AmenityCategory {
  const name = (p.name || "").toLowerCase();
  if (FAST_FOOD_BRANDS.some((b) => name.includes(b))) return "fastfood";
  return "food";
}

function toAmenity(
  p: google.maps.places.PlaceResult,
  origin: LatLng,
  category: AmenityCategory,
  prefix: string
): Amenity | null {
  const loc = p.geometry?.location;
  if (!loc) return null;
  const lat = typeof loc.lat === "function" ? loc.lat() : (loc as any).lat;
  const lng = typeof loc.lng === "function" ? loc.lng() : (loc as any).lng;
  return {
    id: `${prefix}-${p.place_id || `${lat},${lng}`}`,
    name: p.name || "Unnamed",
    category,
    lat,
    lng,
    distanceM: distanceM(origin, { lat, lng }),
    placeId: p.place_id,
    rating: p.rating,
  };
}

export async function fetchAllAmenities(
  origin: LatLng,
  radiusM = 1000
): Promise<Amenity[]> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("[Places] Skipping — no Google API key set.");
    return [];
  }
  const center = new google.maps.LatLng(origin.lat, origin.lng);

  const [transit, schools, food, hospitals, parks] = await Promise.all([
    nearbySearch({ location: center, radius: 600, type: "subway_station" }),
    nearbySearch({ location: center, radius: radiusM, type: "school" }),
    nearbySearch({ location: center, radius: radiusM, type: "restaurant" }),
    nearbySearch({ location: center, radius: radiusM, type: "hospital" }),
    nearbySearch({ location: center, radius: radiusM, type: "park" }),
  ]);

  const out: Amenity[] = [];
  for (const p of transit) {
    const a = toAmenity(p, origin, "transport", "tx");
    if (a && a.distanceM <= 1000) out.push(a);
  }
  for (const p of schools) {
    const a = toAmenity(p, origin, "education", "ed");
    if (a && a.distanceM <= radiusM) out.push(a);
  }
  for (const p of food) {
    const a = toAmenity(p, origin, classifyFood(p), "fd");
    if (a && a.distanceM <= radiusM) out.push(a);
  }
  for (const p of hospitals) {
    const a = toAmenity(p, origin, "medical", "md");
    if (a && a.distanceM <= radiusM) out.push(a);
  }
  for (const p of parks) {
    const a = toAmenity(p, origin, "greenery", "pk");
    if (a && a.distanceM <= radiusM) out.push(a);
  }

  // De-duplicate by placeId
  const seen = new Set<string>();
  return out.filter((a) => {
    const key = a.placeId || a.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------- Nearest road bearing ----------------
// We cheat a little: query Places for nearby `route`-typed results, then geocode
// the nearest road's first formatted address back to a point and bearing-toward.
// This is good enough for "facing direction" inference and avoids a separate
// Roads API enablement.

export async function nearestRoadBearing(
  origin: LatLng
): Promise<{ deg: number | null; roadName: string | null }> {
  try {
    const center = new google.maps.LatLng(origin.lat, origin.lng);
    const results = await new Promise<google.maps.GeocoderResult[]>((resolve) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: center }, (res, status) => {
        if (status === "OK" && res) resolve(res);
        else resolve([]);
      });
    });

    // Find the closest result of type "route".
    let best: { lat: number; lng: number; name: string } | null = null;
    let bestDist = Infinity;
    for (const r of results) {
      if (!r.types?.includes("route")) continue;
      const loc = r.geometry?.location;
      if (!loc) continue;
      const lat = loc.lat();
      const lng = loc.lng();
      const d = distanceM(origin, { lat, lng });
      if (d < bestDist) {
        bestDist = d;
        const name =
          r.address_components?.find((c) => c.types.includes("route"))?.long_name ||
          r.formatted_address?.split(",")[0] ||
          "Nearest road";
        best = { lat, lng, name };
      }
    }

    if (!best) return { deg: null, roadName: null };
    return {
      deg: bearing(origin, { lat: best.lat, lng: best.lng }),
      roadName: best.name,
    };
  } catch (e) {
    console.warn("[nearestRoadBearing] failed:", e);
    return { deg: null, roadName: null };
  }
}
