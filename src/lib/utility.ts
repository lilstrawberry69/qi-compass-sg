// Urban Utility scoring engine — Google Edition.
//
// Convenience Score (0-100):
//   +25  Transit Station (subway_station) within 500m
//   +20  School within 1km
//   +15  >3 Food options within 500m
//   +15  Park within 800m
//   base 25 (just for being in a populated area)

import type { Amenity } from "./places";

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
  waterDistanceM: number;
};

export function computeUtility({ amenities, waterDistanceM }: UtilityInput): UtilityScore {
  const notes: string[] = [];
  const base = 25;

  // +25 for a transit (subway) station within 500m
  const transit = amenities
    .filter((a) => a.category === "transport")
    .sort((a, b) => a.distanceM - b.distanceM)[0];
  let transport = 0;
  if (transit && transit.distanceM <= 500) {
    transport = 25;
    notes.push(`MRT ${transit.name} within ${Math.round(transit.distanceM)}m (+25)`);
  } else if (transit) {
    notes.push(`Nearest MRT ${transit.name} — ${Math.round(transit.distanceM)}m (no bonus)`);
  }

  // +20 for a school within 1km
  const school = amenities
    .filter((a) => a.category === "education")
    .sort((a, b) => a.distanceM - b.distanceM)[0];
  const education = school && school.distanceM <= 1000 ? 20 : 0;
  if (education) notes.push(`${school!.name} within 1km (+20)`);

  // +15 for >3 food options within 500m (food + fastfood combined)
  const foodNear = amenities.filter(
    (a) => (a.category === "food" || a.category === "fastfood") && a.distanceM <= 500
  );
  const food = foodNear.length > 3 ? 15 : 0;
  if (food) notes.push(`${foodNear.length} food options within 500m (+15)`);

  // +15 for a park within 800m
  const park = amenities
    .filter((a) => a.category === "greenery")
    .sort((a, b) => a.distanceM - b.distanceM)[0];
  const greenery = park && park.distanceM <= 800 ? 15 : 0;
  if (greenery) notes.push(`${park!.name} within 800m (+15)`);

  // Cross-reference with water Qi (small bonus)
  let bonus = 0;
  if (waterDistanceM <= 500) {
    bonus += 5;
    notes.push(`Water Qi within 500m reinforces greenery (+5)`);
  }

  // Yin conflict — within 200m of hospital (informational, no bonus to score)
  const hospitalNear = amenities.find(
    (a) => a.category === "medical" && a.distanceM <= 200
  );
  const yinConflict = {
    present: Boolean(hospitalNear),
    reason: hospitalNear
      ? `${hospitalNear.name} within ${Math.round(hospitalNear.distanceM)}m`
      : null,
  };

  const score = Math.min(100, base + transport + education + food + greenery + bonus);

  const radar = [
    { subject: "Transport", value: transport, fullMark: 25 },
    { subject: "Education", value: education, fullMark: 20 },
    { subject: "Food", value: food, fullMark: 15 },
    { subject: "Greenery", value: greenery, fullMark: 15 },
    { subject: "Medical", value: hospitalNear ? 10 : 0, fullMark: 10 },
    { subject: "Water", value: waterDistanceM <= 500 ? 5 : 0, fullMark: 5 },
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
