// ValuBrix Deterministic Valuation Engine (Legacy)
// New modular engines are in ./engines/valuationEngine
// This file is kept for backward compatibility with existing pages.
// All scores derived from real seed data — no Math.random()

// Re-export new engine functions (types defined locally)
export {
  getAreaIntelligence,
  getDealScore,
  getPricePrediction,
  getRecommendation,
  getLocalityCoords as getNewLocalityCoords,
} from "./engines/valuationEngine";

import { getCoords } from "./data/localityCoords";
import {
  getRawAmenityScore,
  getRawTechScore,
  getTopTechParks,
} from "./engines/infraEngine";
import { getNearestMetros } from "./engines/metroEngine";
import { applyApartmentSubTypeMultiplier } from "./engines/psfLearningEngine";
// Import single-source-of-truth PSF and real tech/metro engines
import { getBasePSF } from "./utils/localityEngine";

export interface Metro {
  name: string;
  line: string;
  lat: number;
  lng: number;
}
export interface TechPark {
  name: string;
  area: string;
  zone: string;
  lat: number;
  lng: number;
  weight: number;
}
export interface Amenity {
  name: string;
  type: "school" | "hospital";
  area: string;
  zone: string;
  lat: number;
  lng: number;
  rating: number;
  weight: number;
}
export interface Builder {
  name: string;
  city: string;
  tier: string;
  score: number;
}
export interface MicroLocation {
  locality: string;
  zone: string;
  type: string;
  lat: number;
  lng: number;
  weight: number;
}

export interface ValuationInput {
  locality: string;
  lat?: number;
  lng?: number;
  builder: string;
  city: string;
  area: number;
  floor: number;
  propertyType: string;
  bhk: number;
  projectName?: string;
  /** GAP 1: Apartment sub-type — affects PSF multiplier (standalone: 0.88, gated: 1.0, township: 1.12) */
  apartmentSubType?: "standalone" | "gated" | "township";
}

export interface ValuationOutput {
  estimatedPrice: number;
  pricePerSqft: number;
  builderScore: number;
  techScore: number;
  amenityScore: number;
  microWeight: number;
  basePrice: number;
  metroDistance: number;
  techParkDistance: number;
  amenitiesCount: number;
  metroName: string;
  nearestTechPark: string;
  confidence: number;
  floorMultiplier: number;
  bhkMultiplier: number;
  typeMultiplier: number;
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

export const METROS: Metro[] = [
  { name: "Whitefield (Kadugodi)", line: "Purple", lat: 12.9994, lng: 77.7561 },
  { name: "Kadugodi Tree Park", line: "Purple", lat: 12.995, lng: 77.757 },
  { name: "Pattandur Agrahara", line: "Purple", lat: 12.99, lng: 77.745 },
  { name: "Sri Sathya Sai Hospital", line: "Purple", lat: 12.983, lng: 77.737 },
  { name: "Nallur Halli", line: "Purple", lat: 12.978, lng: 77.73 },
  { name: "Kundalahalli", line: "Purple", lat: 12.967, lng: 77.715 },
  { name: "Hoodi Junction", line: "Purple", lat: 12.992, lng: 77.716 },
  { name: "KR Puram", line: "Purple", lat: 13.0059, lng: 77.6971 },
  { name: "Baiyappanahalli", line: "Purple", lat: 12.9908, lng: 77.6525 },
  { name: "Indiranagar", line: "Purple", lat: 12.9784, lng: 77.6408 },
  { name: "MG Road", line: "Purple", lat: 12.9756, lng: 77.6066 },
  { name: "Majestic", line: "Purple", lat: 12.9763, lng: 77.5713 },
  { name: "Vijayanagar", line: "Purple", lat: 12.971, lng: 77.537 },
  { name: "Kengeri", line: "Purple", lat: 12.914, lng: 77.484 },
  { name: "Nagasandra", line: "Green", lat: 13.0475, lng: 77.4993 },
  { name: "Peenya Industry", line: "Green", lat: 13.032, lng: 77.514 },
  { name: "Yeshwanthpur", line: "Green", lat: 13.0235, lng: 77.5512 },
  { name: "Rajajinagar", line: "Green", lat: 12.9921, lng: 77.5564 },
  { name: "Jayanagar", line: "Green", lat: 12.929, lng: 77.583 },
  { name: "Banashankari", line: "Green", lat: 12.918, lng: 77.573 },
  { name: "Yelachenahalli", line: "Green", lat: 12.8856, lng: 77.5747 },
  { name: "Silk Institute", line: "Green", lat: 12.861, lng: 77.566 },
  { name: "BTM Layout", line: "Yellow", lat: 12.9166, lng: 77.6101 },
  { name: "Central Silk Board", line: "Yellow", lat: 12.9173, lng: 77.6228 },
  { name: "Bommanahalli", line: "Yellow", lat: 12.9, lng: 77.63 },
  { name: "Electronic City", line: "Yellow", lat: 12.8456, lng: 77.6603 },
  { name: "Bommasandra", line: "Yellow", lat: 12.8, lng: 77.7 },
];

export const TECH_PARKS: TechPark[] = [
  {
    name: "ITPL",
    area: "Whitefield",
    zone: "East",
    lat: 12.9856,
    lng: 77.7272,
    weight: 1.0,
  },
  {
    name: "Bagmane Tech Park",
    area: "CV Raman Nagar",
    zone: "East",
    lat: 12.9698,
    lng: 77.6491,
    weight: 1.0,
  },
  {
    name: "RMZ Ecoworld",
    area: "Bellandur",
    zone: "East",
    lat: 12.9198,
    lng: 77.6762,
    weight: 1.0,
  },
  {
    name: "Embassy Tech Village",
    area: "ORR",
    zone: "East",
    lat: 12.9349,
    lng: 77.6974,
    weight: 1.0,
  },
  {
    name: "Prestige Tech Park",
    area: "Outer Ring Road",
    zone: "East",
    lat: 12.917,
    lng: 77.673,
    weight: 0.9,
  },
  {
    name: "Electronic City Phase 1",
    area: "Electronic City",
    zone: "South",
    lat: 12.8399,
    lng: 77.677,
    weight: 1.0,
  },
  {
    name: "Infosys Campus",
    area: "Electronic City",
    zone: "South",
    lat: 12.845,
    lng: 77.66,
    weight: 1.0,
  },
  {
    name: "Wipro Campus",
    area: "Electronic City",
    zone: "South",
    lat: 12.84,
    lng: 77.665,
    weight: 1.0,
  },
  {
    name: "Manyata Tech Park",
    area: "Nagawara",
    zone: "North",
    lat: 13.0475,
    lng: 77.6228,
    weight: 1.0,
  },
  {
    name: "Embassy Manyata Business Park",
    area: "Nagawara",
    zone: "North",
    lat: 13.05,
    lng: 77.622,
    weight: 1.0,
  },
  {
    name: "Karle Town Centre",
    area: "Hebbal",
    zone: "North",
    lat: 13.04,
    lng: 77.62,
    weight: 1.0,
  },
  {
    name: "Kirloskar Business Park",
    area: "Hebbal",
    zone: "North",
    lat: 13.035,
    lng: 77.595,
    weight: 1.0,
  },
  {
    name: "KIADB Aerospace SEZ",
    area: "Devanahalli",
    zone: "North",
    lat: 13.2005,
    lng: 77.7099,
    weight: 1.0,
  },
  {
    name: "Global Village Tech Park",
    area: "RR Nagar",
    zone: "West",
    lat: 12.9145,
    lng: 77.504,
    weight: 0.9,
  },
  {
    name: "IBC Knowledge Park",
    area: "Bannerghatta Road",
    zone: "South",
    lat: 12.9279,
    lng: 77.6088,
    weight: 0.9,
  },
];

export const AMENITIES: Amenity[] = [
  {
    name: "Delhi Public School Whitefield",
    type: "school",
    area: "Whitefield",
    zone: "East",
    lat: 12.9698,
    lng: 77.7499,
    rating: 4.5,
    weight: 1.0,
  },
  {
    name: "National Public School",
    type: "school",
    area: "Indiranagar",
    zone: "East",
    lat: 12.978,
    lng: 77.64,
    rating: 4.6,
    weight: 1.0,
  },
  {
    name: "Greenwood High",
    type: "school",
    area: "Sarjapur",
    zone: "East",
    lat: 12.8826,
    lng: 77.7242,
    rating: 4.6,
    weight: 1.0,
  },
  {
    name: "Ryan International School",
    type: "school",
    area: "Sarjapur",
    zone: "East",
    lat: 12.912,
    lng: 77.687,
    rating: 4.2,
    weight: 0.9,
  },
  {
    name: "Manipal Hospital Whitefield",
    type: "hospital",
    area: "Whitefield",
    zone: "East",
    lat: 12.9698,
    lng: 77.75,
    rating: 4.7,
    weight: 1.0,
  },
  {
    name: "Sakra World Hospital",
    type: "hospital",
    area: "ORR",
    zone: "East",
    lat: 12.9275,
    lng: 77.6846,
    rating: 4.4,
    weight: 1.0,
  },
  {
    name: "Narayana Health City",
    type: "hospital",
    area: "Electronic City",
    zone: "South",
    lat: 12.8399,
    lng: 77.677,
    rating: 4.5,
    weight: 1.0,
  },
  {
    name: "Aster CMI Hospital",
    type: "hospital",
    area: "Hebbal",
    zone: "North",
    lat: 13.045,
    lng: 77.6,
    rating: 4.6,
    weight: 1.0,
  },
  {
    name: "Columbia Asia Hospital",
    type: "hospital",
    area: "Hebbal",
    zone: "North",
    lat: 13.0358,
    lng: 77.597,
    rating: 4.3,
    weight: 1.0,
  },
  {
    name: "Canadian International School",
    type: "school",
    area: "Yelahanka",
    zone: "North",
    lat: 13.11,
    lng: 77.62,
    rating: 4.7,
    weight: 1.0,
  },
  {
    name: "Vidyashilp Academy",
    type: "school",
    area: "Yelahanka",
    zone: "North",
    lat: 13.095,
    lng: 77.585,
    rating: 4.6,
    weight: 1.0,
  },
  {
    name: "Aster RV Hospital",
    type: "hospital",
    area: "Jayanagar",
    zone: "South",
    lat: 12.925,
    lng: 77.593,
    rating: 4.6,
    weight: 1.0,
  },
  {
    name: "Apollo Hospital Bannerghatta",
    type: "hospital",
    area: "Bannerghatta Road",
    zone: "South",
    lat: 12.9,
    lng: 77.6,
    rating: 4.5,
    weight: 1.0,
  },
  {
    name: "Bishop Cotton Boys School",
    type: "school",
    area: "Central",
    zone: "Central",
    lat: 12.96,
    lng: 77.6,
    rating: 4.7,
    weight: 1.0,
  },
  {
    name: "Manipal Hospital Old Airport",
    type: "hospital",
    area: "Central",
    zone: "Central",
    lat: 12.958,
    lng: 77.648,
    rating: 4.6,
    weight: 1.0,
  },
  {
    name: "National Public School HSR",
    type: "school",
    area: "HSR Layout",
    zone: "SE",
    lat: 12.91,
    lng: 77.65,
    rating: 4.6,
    weight: 1.0,
  },
  {
    name: "MS Ramaiah Memorial Hospital",
    type: "hospital",
    area: "Mathikere",
    zone: "North",
    lat: 13.03,
    lng: 77.56,
    rating: 4.5,
    weight: 1.0,
  },
  {
    name: "Cloudnine Hospital",
    type: "hospital",
    area: "Indiranagar",
    zone: "Central",
    lat: 12.9352,
    lng: 77.6145,
    rating: 4.5,
    weight: 0.9,
  },
  {
    name: "Fortis Hospital Bannerghatta",
    type: "hospital",
    area: "Bannerghatta Road",
    zone: "South",
    lat: 12.898,
    lng: 77.595,
    rating: 4.4,
    weight: 1.0,
  },
  {
    name: "Christ School",
    type: "school",
    area: "Bannerghatta Road",
    zone: "South",
    lat: 12.9005,
    lng: 77.605,
    rating: 4.5,
    weight: 1.0,
  },
];

export const BUILDERS: Builder[] = [
  { name: "Prestige", city: "Bangalore", tier: "A", score: 1.1 },
  { name: "Sobha", city: "Bangalore", tier: "A", score: 1.1 },
  { name: "Brigade", city: "Bangalore", tier: "A", score: 1.08 },
  { name: "Embassy Group", city: "Bangalore", tier: "A", score: 1.1 },
  { name: "Salarpuria Sattva", city: "Bangalore", tier: "B", score: 1.05 },
  { name: "Puravankara", city: "Bangalore", tier: "B", score: 1.05 },
  { name: "Godrej Properties", city: "Bangalore", tier: "A", score: 1.08 },
  { name: "Adarsh Developers", city: "Bangalore", tier: "A", score: 1.08 },
  { name: "Total Environment", city: "Bangalore", tier: "A", score: 1.1 },
  { name: "DLF", city: "Delhi NCR", tier: "A", score: 1.1 },
  { name: "Godrej Properties", city: "Delhi NCR", tier: "A", score: 1.1 },
  { name: "ATS Infrastructure", city: "Delhi NCR", tier: "A", score: 1.1 },
  { name: "M3M India", city: "Delhi NCR", tier: "A", score: 1.1 },
  { name: "Kolte Patil", city: "Pune", tier: "A", score: 1.08 },
  { name: "Panchshil Realty", city: "Pune", tier: "A", score: 1.1 },
  { name: "Lodha Group", city: "Pune", tier: "A", score: 1.1 },
  { name: "Shapoorji Pallonji", city: "Pune", tier: "A", score: 1.1 },
  { name: "Local Builder", city: "All", tier: "LOCAL", score: 0.95 },
];

export const MICRO_LOCATIONS: MicroLocation[] = [
  {
    locality: "Hebbal",
    zone: "North",
    type: "Premium",
    lat: 13.0358,
    lng: 77.597,
    weight: 0.95,
  },
  {
    locality: "Yelahanka",
    zone: "North",
    type: "Growth Zone",
    lat: 13.1007,
    lng: 77.5963,
    weight: 0.85,
  },
  {
    locality: "Jakkur",
    zone: "North",
    type: "Premium",
    lat: 13.07,
    lng: 77.61,
    weight: 0.92,
  },
  {
    locality: "Thanisandra",
    zone: "North",
    type: "High Growth",
    lat: 13.05,
    lng: 77.62,
    weight: 0.95,
  },
  {
    locality: "Hennur Road",
    zone: "North",
    type: "High Growth",
    lat: 13.05,
    lng: 77.65,
    weight: 0.95,
  },
  {
    locality: "Nagawara",
    zone: "North",
    type: "IT Influence",
    lat: 13.05,
    lng: 77.62,
    weight: 0.95,
  },
  {
    locality: "Manyata Tech Park Area",
    zone: "North",
    type: "IT Hub",
    lat: 13.0486,
    lng: 77.62,
    weight: 1.0,
  },
  {
    locality: "Devanahalli",
    zone: "North",
    type: "Future Growth",
    lat: 13.2,
    lng: 77.71,
    weight: 0.8,
  },
  {
    locality: "Whitefield",
    zone: "East",
    type: "IT Hub",
    lat: 12.9855,
    lng: 77.737,
    weight: 1.0,
  },
  {
    locality: "Sarjapur Road",
    zone: "East",
    type: "High Growth",
    lat: 12.91,
    lng: 77.7,
    weight: 0.95,
  },
  {
    locality: "Bellandur",
    zone: "East",
    type: "IT Influence",
    lat: 12.9352,
    lng: 77.6958,
    weight: 0.95,
  },
  {
    locality: "Marathahalli",
    zone: "East",
    type: "IT Hub",
    lat: 12.936,
    lng: 77.693,
    weight: 0.95,
  },
  {
    locality: "Indiranagar",
    zone: "Central",
    type: "Premium",
    lat: 12.9784,
    lng: 77.6408,
    weight: 1.0,
  },
  {
    locality: "Koramangala",
    zone: "Central",
    type: "Premium",
    lat: 12.9279,
    lng: 77.6271,
    weight: 1.0,
  },
  {
    locality: "HSR Layout",
    zone: "SE",
    type: "Premium",
    lat: 12.91,
    lng: 77.64,
    weight: 0.95,
  },
  {
    locality: "Electronic City",
    zone: "South",
    type: "IT Hub",
    lat: 12.8456,
    lng: 77.6603,
    weight: 0.9,
  },
  {
    locality: "Bannerghatta Road",
    zone: "South",
    type: "Growth Zone",
    lat: 12.9,
    lng: 77.6,
    weight: 0.88,
  },
  {
    locality: "Jayanagar",
    zone: "South",
    type: "Premium",
    lat: 12.929,
    lng: 77.583,
    weight: 0.95,
  },
  {
    locality: "Rajajinagar",
    zone: "West",
    type: "Mid",
    lat: 12.991,
    lng: 77.555,
    weight: 0.88,
  },
  {
    locality: "Hennur",
    zone: "North",
    type: "Growth Zone",
    lat: 13.04,
    lng: 77.64,
    weight: 0.92,
  },
];

// ─── Haversine ───────────────────────────────────────────────────────────────

export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Base Price ───────────────────────────────────────────────────────────────

export function getBasePricePerSqft(city: string, zone: string): number {
  const c = city.toLowerCase();
  const z = zone.toLowerCase();
  if (c.includes("bangalore") || c.includes("bengaluru")) {
    if (z === "central") return 11000;
    if (z === "east" || z === "se") return 9500;
    if (z === "north") return 8500;
    if (z === "south") return 7500;
    if (z === "west") return 6500;
    return 8500;
  }
  if (
    c.includes("delhi") ||
    c.includes("ncr") ||
    c.includes("gurgaon") ||
    c.includes("noida")
  ) {
    if (z === "prime" || z === "central") return 12000;
    return 8000;
  }
  if (c.includes("pune")) {
    if (z === "prime" || z === "central") return 8000;
    return 5500;
  }
  return 6000;
}

export function getFloorMultiplier(floor: number): number {
  if (floor <= 3) return 1.0;
  if (floor <= 7) return 1.02;
  if (floor <= 14) return 1.04;
  return 1.06;
}

export function getBhkMultiplier(bhk: number): number {
  if (bhk === 1) return 0.95;
  if (bhk === 2) return 1.0;
  if (bhk === 3) return 1.05;
  return 1.1;
}

export function getPropertyTypeMultiplier(type: string): number {
  const t = type.toLowerCase();
  if (t === "villa") return 1.15;
  if (t === "plot") return 0.85;
  if (t === "commercial") return 1.1;
  return 1.0;
}

// ─── Nearest Metro ────────────────────────────────────────────────────────────

export function getNearestMetro(
  lat: number,
  lng: number,
): { name: string; distance: number } {
  let nearest = METROS[0];
  let minDist = haversine(lat, lng, nearest.lat, nearest.lng);
  for (const m of METROS) {
    const d = haversine(lat, lng, m.lat, m.lng);
    if (d < minDist) {
      minDist = d;
      nearest = m;
    }
  }
  return { name: nearest.name, distance: Math.round(minDist * 10) / 10 };
}

// ─── Tech Park Score ─────────────────────────────────────────────────────────
// Exponential distance decay formula: score = Σ exp(-dist_km / 3.0) × weight
// Validate: Hebbal (13.0358, 77.5970) → Manyata ~1.5km → exp(-0.5) ≈ 0.607 → high score

export function getTechParkScore(
  lat: number,
  lng: number,
): { score: number; nearestPark: string; distance: number } {
  const withDist = TECH_PARKS.map((p) => ({
    ...p,
    dist: haversine(lat, lng, p.lat, p.lng),
  })).sort((a, b) => a.dist - b.dist);

  // Exponential decay: score contribution = exp(-dist / 3.0) * weight
  // Only include parks within 20km to avoid distant parks diluting local score
  const DECAY = 3.0;
  const MAX_DIST = 20;
  const inRange = withDist.filter((p) => p.dist <= MAX_DIST);
  if (inRange.length === 0) {
    return {
      score: 0.1,
      nearestPark: withDist[0]?.name ?? "N/A",
      distance: Math.round((withDist[0]?.dist ?? 0) * 10) / 10,
    };
  }

  let rawScore = 0;
  for (const p of inRange) {
    rawScore += Math.exp(-p.dist / DECAY) * p.weight;
  }
  // Normalize: maximum possible if every park was at 0km = inRange.length
  const normalized = rawScore / inRange.length;
  // Scale to 0–1 range (multiply by 2 since max contribution per park is ~1.0)
  const score = Math.min(1.0, Math.max(0.05, normalized * 2.0));

  return {
    score: Math.round(score * 100) / 100,
    nearestPark: withDist[0].name,
    distance: Math.round(withDist[0].dist * 10) / 10,
  };
}

// ─── Amenity Score ───────────────────────────────────────────────────────────

export function getAmenityScore(
  lat: number,
  lng: number,
): { score: number; count: number } {
  const RADIUS_KM = 3;
  const nearby = AMENITIES.filter(
    (a) => haversine(lat, lng, a.lat, a.lng) <= RADIUS_KM,
  );
  if (nearby.length === 0) return { score: 0, count: 0 };
  const rawSum = nearby.reduce((sum, a) => {
    const dist = Math.max(haversine(lat, lng, a.lat, a.lng), 0.1);
    return sum + (a.rating * a.weight) / dist;
  }, 0);
  const score = Math.min(1, rawSum / 50);
  return { score: Math.round(score * 100) / 100, count: nearby.length };
}

// ─── Builder Score ───────────────────────────────────────────────────────────

export function getBuilderScore(builderName: string, city: string): number {
  if (!builderName || !builderName.trim()) return 1.0; // neutral — no builder selected
  const name = builderName.toLowerCase().trim();
  const c = city.toLowerCase();
  const exact = BUILDERS.find(
    (b) => b.name.toLowerCase() === name && b.city.toLowerCase() === c,
  );
  if (exact) return exact.score;
  const cityMatch = BUILDERS.find(
    (b) =>
      b.name.toLowerCase() === name &&
      (b.city.toLowerCase().includes(c) || c.includes(b.city.toLowerCase())),
  );
  if (cityMatch) return cityMatch.score;
  const anyCity = BUILDERS.find((b) => b.name.toLowerCase() === name);
  if (anyCity) return anyCity.score;
  const partialName = BUILDERS.find(
    (b) =>
      name.includes(b.name.toLowerCase()) ||
      b.name.toLowerCase().includes(name),
  );
  if (partialName) return partialName.score;
  return 1.0; // unknown builder — neutral (no premium, no penalty)
}

// ─── Micro Location Weight ────────────────────────────────────────────────────

export function getMicroLocationWeight(locality: string): {
  weight: number;
  zone: string;
  type: string;
} {
  if (!locality) return { weight: 0.9, zone: "Unknown", type: "Mid" };
  const loc = locality.toLowerCase();
  const exact = MICRO_LOCATIONS.find((m) => m.locality.toLowerCase() === loc);
  if (exact)
    return { weight: exact.weight, zone: exact.zone, type: exact.type };
  const contains = MICRO_LOCATIONS.find(
    (m) =>
      loc.includes(m.locality.toLowerCase()) ||
      m.locality.toLowerCase().includes(loc),
  );
  if (contains)
    return {
      weight: contains.weight,
      zone: contains.zone,
      type: contains.type,
    };
  return { weight: 0.9, zone: "Unknown", type: "Mid" };
}

// ─── Main Valuation Function ──────────────────────────────────────────────────
// ─── V2 Interfaces ────────────────────────────────────────────────────────────

export interface ValuationResult {
  fMV: number;
  range: [number, number];
  pricePerSqft: number;
  scores: {
    tech: number;
    amenity: number;
    builder: number;
    location: number;
  };
  /** "Not Applied" when no builder selected; "Tier 1 Builder" | "Tier 2 Builder" | "Unknown Builder" when selected */
  builderScoreLabel: string;
  confidence: number;
  breakdown: {
    basePrice: number;
    locationFactor: number;
    builderFactor: number;
    demandFactor: number;
    livabilityFactor: number;
    metroFactor: number;
    microWeight: number;
    metroName: string;
    metroDistance: number;
    nearestTechPark: string;
    amenitiesCount: number;
  };
}

export interface ComparableSale {
  id: string;
  locality: string;
  project: string;
  propertyType: string;
  bhk: number;
  area: number;
  salePrice: number;
  pricePerSqft: number;
  saleDate: string;
  similarityScore: number;
  distance: string;
}

// ─── Unified Valuation Engine (valuateProperty) ───────────────────────────────
// FIX: Uses getBasePSF(locality, propertyType) from localityEngine as base.
// This ensures AI Valuation and Area Intelligence always show the same BasePSF.
// Plot → plot PSF (₹16K for Hebbal), Apartment → apartment PSF (₹11.5K for Hebbal).
// Tech score uses real exponential decay from infraEngine (same as Area Intelligence).

export function valuateProperty(input: ValuationInput): ValuationResult {
  const { locality, builder, city, area, floor, propertyType, bhk } = input;
  const apartmentSubType = input.apartmentSubType;

  // Resolve location coords — priority: input lat/lng → MICRO_LOCATIONS lookup → localityCoords → Bangalore centre
  const microLoc = MICRO_LOCATIONS.find(
    (m) =>
      m.locality.toLowerCase() === locality.toLowerCase() ||
      locality.toLowerCase().includes(m.locality.toLowerCase()) ||
      m.locality.toLowerCase().includes(locality.toLowerCase()),
  );
  // Try localityCoords as a secondary resolution when microLoc has no coords
  const coordsFromName =
    !input.lat && !microLoc?.lat ? getCoords(locality) : null;
  const lat = input.lat ?? microLoc?.lat ?? coordsFromName?.lat ?? 12.9716;
  const lng = input.lng ?? microLoc?.lng ?? coordsFromName?.lng ?? 77.5946;

  // ── BASE PRICE: single source of truth from localityEngine ─────────────────
  // Critical fix: must use per-type PSF, not zone-level generic prices.
  // Plot in Hebbal: getBasePSF("hebbal", "plot") = ₹16,000 (not ₹8,500)
  // Apartment in Hebbal: getBasePSF("hebbal", "apartment") = ₹11,500 (not ₹8,500)
  function getTypeKey(
    t: string,
  ): "apartment" | "villa" | "plot" | "commercial" {
    const tl = t.toLowerCase().trim();
    if (tl === "villa" || tl === "house" || tl === "row house") return "villa";
    if (tl === "plot" || tl === "land") return "plot";
    if (tl === "commercial" || tl === "office" || tl === "shop")
      return "commercial";
    return "apartment";
  }
  const typeKey = getTypeKey(propertyType);
  const rawBasePrice = getBasePSF(locality, typeKey);
  // GAP 1: Apply apartment sub-type multiplier (standalone: 0.88x, gated: 1.0x, township: 1.12x)
  const basePrice =
    typeKey === "apartment" && apartmentSubType
      ? applyApartmentSubTypeMultiplier(rawBasePrice, apartmentSubType)
      : rawBasePrice;

  if (typeKey === "apartment" && apartmentSubType) {
    console.log(
      `[ValuBrix] Apartment sub-type="${apartmentSubType}": basePSF ${rawBasePrice} → ${basePrice}`,
    );
  }

  // ── METRO: use real haversine distances via metroEngine ──────────────────────
  const metros = getNearestMetros(lat, lng, 3);
  const nearestMetro = metros[0];
  const metroDistance = nearestMetro?.aerialKm ?? 10;
  let metroFactor: number;
  if (metroDistance < 1) metroFactor = 1.08;
  else if (metroDistance < 3) metroFactor = 1.05;
  else if (metroDistance < 6) metroFactor = 1.02;
  else metroFactor = 0.98;

  const microWeight = microLoc?.weight ?? 0.9;
  const locationFactor = microWeight * metroFactor;

  // ── BUILDER: neutral (1.0) when no builder selected ─────────────────────────
  const builderSelected =
    !!builder?.trim() &&
    builder.toLowerCase() !== "unknown" &&
    builder.toLowerCase() !== "select builder";
  const builderFactor = builderSelected ? getBuilderScore(builder, city) : 1.0;

  function getBuilderScoreLabel(factor: number, selected: boolean): string {
    if (!selected) return "Not Applied";
    if (factor >= 1.1) return "Tier 1 Builder";
    if (factor >= 1.0) return "Tier 2 Builder";
    return "Unknown Builder";
  }
  const builderScoreLabel = getBuilderScoreLabel(
    builderFactor,
    builderSelected,
  );

  // ── TECH SCORE: use infraEngine exponential decay formula ───────────────────
  // Same function as Area Intelligence uses — guarantees consistent scores.
  // Hebbal (lat≈13.0358, lng≈77.597) → Manyata ~1.5km → score 70–90+
  const techScoreRaw = getRawTechScore(lat, lng); // returns 0–1 fraction
  const normalizedTechScore = techScoreRaw;

  // ── AMENITY SCORE: use infraEngine (same as Area Intelligence) ───────────────
  const amenityScoreRaw = getRawAmenityScore(lat, lng);
  const normalizedAmenityScore = amenityScoreRaw;

  // ── NEAREST TECH PARK for display ────────────────────────────────────────────
  const techParksForDisplay = getTopTechParks(lat, lng, 1);
  const nearestTechPark = techParksForDisplay[0]?.name ?? "N/A";
  const nearbyAmenitiesCount = Math.round(normalizedAmenityScore * 20); // proxy count

  // ── DEMAND & LIVABILITY FACTORS ───────────────────────────────────────────────
  const demandFactor = 1 + normalizedTechScore * 0.15;
  const livabilityFactor = 1 + normalizedAmenityScore * 0.1;

  // ── FLOOR / BHK / TYPE ADJUSTMENTS ───────────────────────────────────────────
  // Plots: no floor or BHK adjustment
  const isPlot = typeKey === "plot";
  const floorMult = isPlot ? 1.0 : getFloorMultiplier(floor);
  const bhkMult = isPlot ? 1.0 : getBhkMultiplier(bhk);
  // Type multiplier already baked into getBasePSF — only apply small residual
  const typeMult = 1.0; // getBasePSF already returns type-specific PSF

  // ── FINAL PRICE/SQFT ──────────────────────────────────────────────────────────
  const pricePerSqft = Math.round(
    basePrice *
      locationFactor *
      builderFactor *
      demandFactor *
      livabilityFactor *
      floorMult *
      bhkMult *
      typeMult,
  );
  const fMV = Math.round(pricePerSqft * area);
  const rangeLow = Math.round(fMV * 0.93);
  const rangeHigh = Math.round(fMV * 1.07);

  // ── CONFIDENCE SCORE ──────────────────────────────────────────────────────────
  const dataCoverage = microLoc ? 1.0 : 0.7;
  const techDensity = Math.min(normalizedTechScore, 1);
  const amenityDensity = Math.min(normalizedAmenityScore, 1);
  const builderReliability = builderFactor / 1.1;
  const confidence = Math.round(
    (0.35 * dataCoverage +
      0.25 * amenityDensity +
      0.25 * techDensity +
      0.15 * builderReliability) *
      100,
  );

  // ── SCORES 0–100 ───────────────────────────────────────────────────────────────
  const techScore100 = Math.min(100, Math.round(normalizedTechScore * 100));
  const amenityScore100 = Math.min(
    100,
    Math.round(normalizedAmenityScore * 100),
  );
  const builderScore100 = builderSelected
    ? Math.min(100, Math.round(((builderFactor - 0.9) / 0.2) * 100))
    : 0;
  const locationScore100 = Math.min(100, Math.round(locationFactor * 100));

  return {
    fMV,
    range: [rangeLow, rangeHigh],
    pricePerSqft,
    scores: {
      tech: Math.max(0, techScore100),
      amenity: Math.max(0, amenityScore100),
      builder: Math.max(0, builderScore100),
      location: Math.max(0, locationScore100),
    },
    builderScoreLabel,
    confidence: Math.min(100, Math.max(0, confidence)),
    breakdown: {
      basePrice,
      locationFactor: Math.round(locationFactor * 1000) / 1000,
      builderFactor: Math.round(builderFactor * 1000) / 1000,
      demandFactor: Math.round(demandFactor * 1000) / 1000,
      livabilityFactor: Math.round(livabilityFactor * 1000) / 1000,
      metroFactor,
      microWeight,
      metroName: nearestMetro?.name ?? "N/A",
      metroDistance,
      nearestTechPark,
      amenitiesCount: nearbyAmenitiesCount,
    },
  };
}

// ─── Comparable Sales Engine ──────────────────────────────────────────────────

// Deterministic pseudo-random using a seed string
function seededRandom(seed: string, index: number): number {
  let h = 0;
  const s = seed + index.toString();
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) % 10000) / 10000;
}

const COMPARABLE_PROJECTS: Record<string, string[]> = {
  Whitefield: [
    "Prestige Lakeside Habitat",
    "Sobha Silicon Oasis",
    "Brigade Cornerstone Utopia",
    "Purva Windermere",
    "Assetz Marq",
  ],
  Sarjapur: [
    "Sobha Dream Acres",
    "Godrej Splendour",
    "Salarpuria Sattva Aspire",
    "Provident Welworth City",
    "Assetz 63 Degree East",
  ],
  Hebbal: [
    "Sobha Clovelly",
    "Brigade Exotica",
    "Purva Zenium",
    "Godrej Aqua",
    "Embassy Springs",
  ],
  Koramangala: [
    "Prestige Shantiniketan",
    "Brigade Metropolis",
    "Shriram Signature",
    "Mantri Lithos",
    "Salarpuria Crown",
  ],
  HSR: [
    "Salarpuria Serenity",
    "Purva Primus",
    "Prestige Misty Waters",
    "Brigade Northridge",
    "Assetz Bloom",
  ],
  Electronic: [
    "Godrej United",
    "Shriram Samruddhi",
    "Purva Fountain Square",
    "Mantri Webcity",
    "DS Max Signature",
  ],
  Indiranagar: [
    "Prestige Edwardian",
    "Nitesh Buckingham Gate",
    "Embassy Residences",
    "Sobha Indraprastha",
  ],
  Default: [
    "Prestige Township",
    "Sobha Habitat",
    "Brigade Retreat",
    "Purva Panorama",
    "Godrej Reserve",
  ],
};

function getProjectList(locality: string): string[] {
  const key = Object.keys(COMPARABLE_PROJECTS).find((k) =>
    locality.toLowerCase().includes(k.toLowerCase()),
  );
  return COMPARABLE_PROJECTS[key ?? "Default"];
}

const MONTHS = [
  "Oct 2025",
  "Nov 2025",
  "Dec 2025",
  "Jan 2026",
  "Feb 2026",
  "Mar 2026",
];

export function getComparables(
  locality: string,
  city: string,
  propertyType: string,
  bhk: number,
): ComparableSale[] {
  const seed = `${locality}-${city}-${propertyType}-${bhk}`;
  const projects = getProjectList(locality);
  const microData = getMicroLocationWeight(locality);
  const zone = microData.zone;

  // Base price per sqft range
  const basePrice = getBasePricePerSqft(city, zone);
  const bhkAreaMap: Record<number, [number, number]> = {
    1: [500, 700],
    2: [900, 1200],
    3: [1300, 1700],
    4: [1800, 2400],
  };
  const [areaMin, areaMax] = bhkAreaMap[bhk] ?? [900, 1400];

  const count = 5 + (seededRandom(seed, 99) > 0.5 ? 1 : 0);
  const comps: ComparableSale[] = [];

  for (let i = 0; i < count; i++) {
    const r1 = seededRandom(seed, i * 7 + 1);
    const r2 = seededRandom(seed, i * 7 + 2);
    const r3 = seededRandom(seed, i * 7 + 3);
    const r4 = seededRandom(seed, i * 7 + 4);
    const r5 = seededRandom(seed, i * 7 + 5);

    const area = Math.round(areaMin + r1 * (areaMax - areaMin));
    const priceMult = 0.91 + r2 * 0.18; // ±9% around base
    const ppsf = Math.round(basePrice * priceMult);
    const salePrice = Math.round(ppsf * area);
    const distKm = 0.2 + r3 * 2.8;
    const monthIdx = Math.floor(r4 * MONTHS.length);
    const simScore = Math.round(70 + r5 * 28);
    const project = projects[i % projects.length];
    const bhkVar = bhk + (r2 > 0.7 ? (r2 > 0.85 ? 1 : 0) : 0);

    // Slightly vary locality for realism
    const locVariants = [
      locality,
      `${locality} Phase 2`,
      `${locality} Extension`,
      locality,
      locality,
    ];
    const compLocality = locVariants[i % locVariants.length];

    comps.push({
      id: `comp-${seed}-${i}`,
      locality: compLocality,
      project,
      propertyType,
      bhk: bhkVar,
      area,
      salePrice,
      pricePerSqft: ppsf,
      saleDate: MONTHS[monthIdx],
      similarityScore: simScore,
      distance: `${distKm.toFixed(1)} km`,
    });
  }

  return comps.sort((a, b) => b.similarityScore - a.similarityScore);
}
