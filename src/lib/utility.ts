// Urban Utility scoring engine — cross-references water Qi with greenery.

import type { Amenity } from "./onemap";

export type UtilityScore = {
  score: number; // 0-100
  base: number;
  transport: number;
  education: number;
  food: number;
  greenery: number;
  bonus: number;
  yinConflict: { present: boolean; reason: string | null };
  notes: string[];
  radar: { subject: string; value: number; fullMark: number }[];
};

export type UtilityInput = {
  amenities: Amenity[];
  waterDistanceM: number; // from the Feng Shui water check
};

export function computeUtility({ amenities, waterDistanceM }: UtilityInput): UtilityScore {
  const notes: string[] = [];
  const base = 30;

  // MRT / Transport — +25 if any station within 500m
  const transportNear = amenities
    .filter((a) => a.category === "transport")
    .sort((a, b) => a.distanceM - b.distanceM)[0];
  let transport = 0;
  if (transportNear && transportNear.distanceM <= 500) {
    transport = 25;
    notes.push(`MRT ${transportNear.name} within ${Math.round(transportNear.distanceM)}m (+25)`);
  } else if (transportNear) {
    notes.push(`Nearest MRT ${transportNear.name} — ${Math.round(transportNear.distanceM)}m (no bonus)`);
  }

  // Education — +20 if a primary school within 1km
  const primary = amenities.find(
    (a) => a.theme === "primary_schools" && a.distanceM <= 1000
  );
  const education = primary ? 20 : 0;
  if (primary) notes.push(`Primary school ${primary.name} within 1km (+20)`);

  // Food — +15 if >2 hawker centres found
  const hawkers = amenities.filter((a) => a.theme === "hawkercentre");
  const food = hawkers.length > 2 ? 15 : Math.min(hawkers.length * 5, 10);
  if (hawkers.length > 2) notes.push(`${hawkers.length} hawker centres nearby (+15)`);

  // Greenery — +10 if a national park within 800m. Cross-reference water Qi.
  const park = amenities
    .filter((a) => a.category === "greenery")
    .sort((a, b) => a.distanceM - b.distanceM)[0];
  let greenery = 0;
  if (park && park.distanceM <= 800) {
    greenery = 10;
    notes.push(`${park.name} within 800m (+10)`);
  }
  // Water Qi cross-reference: within 500m of water counts as a +5 "blue-green" bonus.
  let bonus = 0;
  if (waterDistanceM <= 500) {
    bonus += 5;
    notes.push(`Water Qi within 500m reinforces greenery (+5)`);
  }

  // Yin conflict — within 200m of hospital (proxy for cemetery)
  const hospitalNear = amenities.find(
    (a) => a.theme === "moh_hospitals" && a.distanceM <= 200
  );
  const yinConflict = {
    present: Boolean(hospitalNear),
    reason: hospitalNear
      ? `${hospitalNear.name} within ${Math.round(hospitalNear.distanceM)}m`
      : null,
  };
  if (hospitalNear) {
    bonus += 5;
    notes.push(`High medical accessibility (+5) — hospital within 200m`);
  }

  const score = Math.min(100, base + transport + education + food + greenery + bonus);

  const radar = [
    { subject: "Transport", value: transport, fullMark: 25 },
    { subject: "Education", value: education, fullMark: 20 },
    { subject: "Food", value: food, fullMark: 15 },
    { subject: "Medical", value: hospitalNear ? 10 : 0, fullMark: 10 },
    { subject: "Greenery", value: greenery, fullMark: 10 },
    { subject: "Fast Food", value: amenities.filter((a) => a.category === "fastfood").length > 0 ? 5 : 0, fullMark: 5 },
  ];

  return {
    score,
    base,
    transport,
    education,
    food,
    greenery,
    bonus,
    yinConflict,
    notes,
    radar,
  };
}
