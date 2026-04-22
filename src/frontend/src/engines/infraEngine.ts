// infraEngine.ts — Infrastructure proximity engine using OSRM driving distances
// All displayed distances and travel times come from OSRM driving profile.
// Haversine is used ONLY internally by osrmEngine for pre-filtering — never shown in UI.
// Coordinates: verified against Google Maps + official addresses (April 2026)

import {
  AIRPORTS,
  COLLEGES_REGISTRY,
  HIGHWAYS,
  MALLS_REGISTRY,
} from "../data/poiRegistry";
import { BUS_STOPS, RAILWAY_STATIONS } from "./mapLayersEngine";
import { haversineDistance } from "./metroEngine";
import { getOSRMDistances } from "./osrmEngine";
import type { POIInput } from "./osrmEngine";

// ─── Priority-based amenity loading ──────────────────────────────────────────

/**
 * Load order for distance queries.
 * HIGH categories load first (immediate UX feedback).
 * LOW categories are lazy-loaded after all others complete.
 */
export const AMENITY_LOAD_PRIORITY = [
  "atm",
  "bank",
  "restaurant",
  "school",
  "hospital",
  "metro",
  "petrol",
  "police",
  "mall",
  "airport",
  "highway",
] as const;

export type PriorityAmenityCategory = (typeof AMENITY_LOAD_PRIORITY)[number];

const PRIORITY_HIGH: PriorityAmenityCategory[] = [
  "atm",
  "bank",
  "restaurant",
  "school",
  "hospital",
];
const PRIORITY_MEDIUM: PriorityAmenityCategory[] = [
  "metro",
  "petrol",
  "police",
];
const PRIORITY_LOW: PriorityAmenityCategory[] = ["mall", "airport", "highway"];

/** Partial amenity result that may still be loading (for lazy-loaded categories). */
export interface LoadingInfraItem extends Partial<InfraItem> {
  name: string;
  isLoading: true;
  distance_km: null;
  duration_min: null;
}

type CategoryLoader = (lat: number, lng: number) => Promise<InfraItem[]>;

/**
 * Priority-based amenity loading orchestrator.
 *
 * - STEP 1: Immediately fire PRIORITY_HIGH (ATM/Bank/Restaurant/School/Hospital)
 *           Each result is pushed to UI the moment it resolves (not waiting for all).
 * - STEP 2: Fire PRIORITY_MEDIUM (Metro/Petrol/Police) with 100ms stagger each.
 *           Each result is pushed to UI as it resolves.
 * - STEP 3: Lazy-load PRIORITY_LOW (Mall/Airport/Highway) 200ms after medium,
 *           fire-and-forget. onUpdate fires when each resolves.
 *
 * LOW-priority categories emit a placeholder immediately so the UI shows
 * "Calculating..." while the real data loads.
 *
 * @param origin               Origin coordinates
 * @param loaders              Map of category → async loader function
 * @param onUpdate             Callback fired whenever a category's results are ready
 * @param onLoadingPlaceholder Optional callback fired for LOW-priority categories
 *                             before their real data loads, so the UI can show a spinner
 */
export async function loadAmenitiesWithPriority(
  origin: { lat: number; lng: number },
  loaders: Partial<Record<PriorityAmenityCategory, CategoryLoader>>,
  onUpdate: (category: PriorityAmenityCategory, items: InfraItem[]) => void,
  onLoadingPlaceholder?: (category: PriorityAmenityCategory) => void,
): Promise<void> {
  // ── STEP 1: High-priority — fire all immediately, push results as each resolves ──
  await Promise.all(
    PRIORITY_HIGH.filter((cat) => loaders[cat]).map(async (cat) => {
      const items = await loaders[cat]!(origin.lat, origin.lng);
      onUpdate(cat, items);
    }),
  );

  // ── STEP 2: Medium-priority — 100ms stagger between each call ───────────────
  for (const cat of PRIORITY_MEDIUM) {
    if (!loaders[cat]) continue;
    await new Promise((r) => setTimeout(r, 100));
    loaders[cat]!(origin.lat, origin.lng)
      .then((items) => onUpdate(cat, items))
      .catch(() => onUpdate(cat, []));
  }

  // Wait for medium-priority requests to get started before beginning low-priority
  await new Promise((r) => setTimeout(r, 200));

  // ── STEP 3: Lazy-load low-priority (Mall/Airport/Highway) — fire and forget ──
  // Emit placeholder immediately so UI shows "Calculating..." while data loads.
  for (const cat of PRIORITY_LOW) {
    if (!loaders[cat]) continue;
    // Signal to caller that this category is loading
    onLoadingPlaceholder?.(cat);
    loaders[cat]!(origin.lat, origin.lng)
      .then((items) => onUpdate(cat, items))
      .catch(() => onUpdate(cat, []));
    // 150ms stagger between lazy loads to avoid simultaneous OSRM calls
    await new Promise((r) => setTimeout(r, 150));
  }
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

export interface InfraItem {
  name: string;
  lat: number;
  lng: number;
  /** OSRM driving distance — USE THIS for display */
  osrmKm: number;
  /** OSRM driving time in minutes — USE THIS for display */
  osrmDurationMins: number;
  impactTag?: string;
  impactDescription?: string;
  // Backward compat — mirror OSRM values
  distKm: number; // = osrmKm
  travelMins: number; // = osrmDurationMins
  /** @deprecated use osrmKm */
  aerialKm?: number;
  /** @deprecated use osrmKm */
  roadKm?: number;
  /** @deprecated use osrmDurationMins */
  travelTimeMin?: number;
  /** @deprecated use osrmKm */
  distance?: number;
  weight?: number;
  rating?: number;
  type?: string;
  area?: string;
}

export const TECH_PARKS: TechPark[] = [
  // ── North Bangalore (highest weight — Manyata, Kirloskar, Hebbal) ────────────
  {
    name: "Manyata Tech Park",
    area: "Nagawara",
    zone: "North",
    lat: 13.0457,
    lng: 77.6231,
    weight: 1.0,
  },
  {
    name: "Embassy Manyata Business Park",
    area: "Nagawara",
    zone: "North",
    lat: 13.0457,
    lng: 77.6231,
    weight: 1.0,
  },
  {
    name: "Kirloskar Business Park",
    area: "Hebbal",
    zone: "North",
    lat: 13.03,
    lng: 77.5567,
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
    name: "RMZ Latitude",
    area: "Hebbal",
    zone: "North",
    lat: 13.0455,
    lng: 77.618,
    weight: 0.95,
  },
  {
    name: "Prestige Tech Cloud",
    area: "Outer Ring Road",
    zone: "East",
    lat: 12.9355,
    lng: 77.6926,
    weight: 0.95,
  },
  {
    name: "Hebbal CBD",
    area: "Hebbal",
    zone: "North",
    lat: 13.0358,
    lng: 77.597,
    weight: 0.9,
  },
  {
    name: "KIADB Aerospace SEZ",
    area: "Devanahalli",
    zone: "North",
    lat: 13.2085,
    lng: 77.7071,
    weight: 1.0,
  },
  {
    name: "Devanahalli Business Park",
    area: "Devanahalli",
    zone: "North",
    lat: 13.23,
    lng: 77.71,
    weight: 0.95,
  },
  {
    name: "Shell Technology Centre",
    area: "Bagalur",
    zone: "North",
    lat: 13.15,
    lng: 77.68,
    weight: 0.9,
  },
  // ── East Bangalore (ITPL, Bagmane, Whitefield) ────────────────────────────────
  {
    name: "ITPL (International Tech Park)",
    area: "Whitefield",
    zone: "East",
    lat: 12.9718,
    lng: 77.747,
    weight: 1.0,
  },
  {
    name: "Bagmane Tech Park",
    area: "CV Raman Nagar",
    zone: "East",
    lat: 13.0033,
    lng: 77.6268,
    weight: 1.0,
  },
  {
    name: "Bagmane Constellation",
    area: "ORR",
    zone: "East",
    lat: 12.97,
    lng: 77.66,
    weight: 1.0,
  },
  {
    name: "RMZ Ecoworld",
    area: "Bellandur",
    zone: "East",
    lat: 12.923,
    lng: 77.684,
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
    lat: 12.923,
    lng: 77.684,
    weight: 0.9,
  },
  {
    name: "Marathahalli Tech Corridor",
    area: "Marathahalli",
    zone: "East",
    lat: 12.9591,
    lng: 77.6971,
    weight: 0.9,
  },
  {
    name: "Whitefield Tech Hub",
    area: "Whitefield",
    zone: "East",
    lat: 12.97,
    lng: 77.748,
    weight: 1.0,
  },
  {
    name: "Whitefield Tech Corridor",
    area: "Whitefield",
    zone: "East",
    lat: 12.9698,
    lng: 77.7499,
    weight: 1.0,
  },
  {
    name: "Divyasree Technopolis",
    area: "Yemalur",
    zone: "East",
    lat: 12.95,
    lng: 77.68,
    weight: 0.9,
  },
  {
    name: "RGA Tech Park",
    area: "Sarjapur Road",
    zone: "East",
    lat: 12.91,
    lng: 77.7,
    weight: 0.85,
  },
  {
    name: "Sarjapur Road IT Corridor",
    area: "Sarjapur",
    zone: "East",
    lat: 12.8826,
    lng: 77.6969,
    weight: 0.95,
  },
  {
    name: "Outer Ring Road Tech Corridor",
    area: "ORR",
    zone: "East",
    lat: 12.9565,
    lng: 77.7001,
    weight: 1.0,
  },
  // ── South Bangalore (Electronic City) ────────────────────────────────────────
  {
    name: "Electronic City Phase 1",
    area: "Electronic City",
    zone: "South",
    lat: 12.8458,
    lng: 77.6678,
    weight: 1.0,
  },
  {
    name: "Electronic City Phase 2",
    area: "Electronic City",
    zone: "South",
    lat: 12.8325,
    lng: 77.6745,
    weight: 0.95,
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
    name: "Velankani Tech Park",
    area: "Electronic City",
    zone: "South",
    lat: 12.8455,
    lng: 77.6665,
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
  {
    name: "Kalyani Magnum Tech Park",
    area: "Bannerghatta Road",
    zone: "South",
    lat: 12.906,
    lng: 77.6,
    weight: 0.85,
  },
  // ── West / Central ────────────────────────────────────────────────────────────
  {
    name: "Global Village Tech Park",
    area: "RR Nagar",
    zone: "West",
    lat: 12.9145,
    lng: 77.504,
    weight: 0.9,
  },
  {
    name: "UB City Business District",
    area: "Central",
    zone: "Central",
    lat: 12.9753,
    lng: 77.5997,
    weight: 0.9,
  },
  {
    name: "Airport IT Corridor",
    area: "Devanahalli",
    zone: "North",
    lat: 13.1986,
    lng: 77.7066,
    weight: 0.9,
  },
  {
    name: "Devanahalli Aerospace SEZ",
    area: "Devanahalli",
    zone: "North",
    lat: 13.2085,
    lng: 77.7071,
    weight: 0.95,
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
    name: "Orchids International School ORR",
    type: "school",
    area: "Bellandur",
    zone: "East",
    lat: 12.95,
    lng: 77.65,
    rating: 4.3,
    weight: 0.8,
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
    name: "Delhi Public School North",
    type: "school",
    area: "Yelahanka",
    zone: "North",
    lat: 13.1,
    lng: 77.596,
    rating: 4.4,
    weight: 0.95,
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
    name: "St. Joseph's Boys High School",
    type: "school",
    area: "Central",
    zone: "Central",
    lat: 12.97,
    lng: 77.6,
    rating: 4.6,
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
    name: "Fortis Hospital Cunningham",
    type: "hospital",
    area: "Central",
    zone: "Central",
    lat: 12.99,
    lng: 77.59,
    rating: 4.4,
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
    name: "Narayana Multispeciality Hospital",
    type: "hospital",
    area: "Devanahalli",
    zone: "North",
    lat: 13.24,
    lng: 77.71,
    rating: 4.2,
    weight: 0.9,
  },
  {
    name: "Devanahalli Govt Hospital",
    type: "hospital",
    area: "Devanahalli",
    zone: "North",
    lat: 13.247,
    lng: 77.712,
    rating: 3.8,
    weight: 0.7,
  },
  {
    name: "BGS International School",
    type: "school",
    area: "Devanahalli",
    zone: "North",
    lat: 13.235,
    lng: 77.705,
    rating: 4.3,
    weight: 0.9,
  },
  {
    name: "VIBGYOR High School",
    type: "school",
    area: "Marathahalli",
    zone: "East",
    lat: 12.956,
    lng: 77.701,
    rating: 4.3,
    weight: 0.9,
  },
  {
    name: "Sparsh Hospital",
    type: "hospital",
    area: "Yeshwanthpur",
    zone: "North",
    lat: 13.0238,
    lng: 77.5555,
    rating: 4.3,
    weight: 0.9,
  },
  // ── BEL Circle / Jalahalli / Nagasandra area schools ──────────────────────
  {
    name: "Kendriya Vidyalaya BEL",
    type: "school",
    area: "BEL Circle",
    zone: "North",
    lat: 13.044,
    lng: 77.572,
    rating: 4.2,
    weight: 0.9,
  },
  {
    name: "National Public School Nagasandra",
    type: "school",
    area: "Nagasandra",
    zone: "North",
    lat: 13.056,
    lng: 77.524,
    rating: 4.3,
    weight: 0.9,
  },
  {
    name: "St Germain High School Jalahalli",
    type: "school",
    area: "Jalahalli",
    zone: "North",
    lat: 13.047,
    lng: 77.558,
    rating: 4.1,
    weight: 0.85,
  },
  {
    name: "Deeksha Learning Centre Mathikere",
    type: "school",
    area: "Mathikere",
    zone: "North",
    lat: 13.049,
    lng: 77.561,
    rating: 4.3,
    weight: 0.9,
  },
  {
    name: "Holy Family School Rajajinagar",
    type: "school",
    area: "Rajajinagar",
    zone: "North",
    lat: 12.993,
    lng: 77.555,
    rating: 4.2,
    weight: 0.85,
  },
];

// ─── Shared coordinate guard ─────────────────────────────────────────────────
// Returns true if coordinates are invalid or are the Bangalore-center fallback
// (which produces wrong distances for all locations).
function isInvalidCoord(lat: number, lng: number): boolean {
  if (!lat || !lng || (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01)) {
    return true;
  }
  // Reject obvious fallback: Bangalore center / MG Road area used as default
  const isBangaloreCenter =
    Math.abs(lat - 12.9716) < 0.02 && Math.abs(lng - 77.5946) < 0.02;
  const isOldFallback1 =
    Math.abs(lat - 12.97) < 0.01 && Math.abs(lng - 77.64) < 0.01;
  const isOldFallback2 =
    Math.abs(lat - 12.9698) < 0.01 && Math.abs(lng - 77.7499) < 0.01;
  if (isBangaloreCenter || isOldFallback1 || isOldFallback2) {
    console.warn(
      "[infraEngine] Rejecting fallback/default coordinates",
      lat,
      lng,
    );
    return true;
  }
  return false;
}

// ─── Internal helper: map OSRMResults → InfraItem[] ───────────────────────────

function buildInfraItems(
  osrmResults: Awaited<ReturnType<typeof getOSRMDistances>>,
  sourceMap?: Map<string, { weight?: number; rating?: number; area?: string }>,
): InfraItem[] {
  return osrmResults.map((r) => {
    const meta = sourceMap?.get(r.name) ?? {};
    return {
      name: r.name,
      lat: r.lat,
      lng: r.lng,
      osrmKm: r.osrmKm,
      osrmDurationMins: r.osrmDurationMins,
      impactTag: r.impactTag,
      impactDescription: r.impactDescription,
      // Backward compat
      distKm: r.osrmKm,
      travelMins: r.osrmDurationMins,
      aerialKm: r.osrmKm,
      roadKm: r.osrmKm,
      travelTimeMin: r.osrmDurationMins,
      distance: r.osrmKm,
      weight: meta.weight ?? 1.0,
      rating: meta.rating,
      area: r.area,
      type: r.type,
    };
  });
}

// ─── Async OSRM-powered infra functions ───────────────────────────────────────

/** Returns ALL nearest tech parks within 30km using OSRM driving distances. */
export async function getTopTechParks(
  originLat: number,
  originLng: number,
  _count?: number,
): Promise<InfraItem[]> {
  if (isInvalidCoord(originLat, originLng)) return [];

  // Pre-sort by haversine (nearest first) so we pass the geographically nearest parks
  // to OSRM — prevents far parks from crowding out near ones when list is long.
  const sorted = [...TECH_PARKS].sort(
    (a, b) =>
      haversineDistance(originLat, originLng, a.lat, a.lng) -
      haversineDistance(originLat, originLng, b.lat, b.lng),
  );

  const poiInputs: POIInput[] = sorted.map((t) => ({
    name: t.name,
    lat: t.lat,
    lng: t.lng,
    type: "tech_park" as const,
    area: t.area,
    impactTag: "IT demand driver",
    impactDescription: `${t.area} tech corridor — drives rental demand`,
  }));

  const weightMap = new Map(
    TECH_PARKS.map((t) => [t.name, { weight: t.weight, area: t.area }]),
  );
  // Use 30km radius so all Bangalore tech parks are reachable
  const results = await getOSRMDistances(originLat, originLng, poiInputs, 30);
  // Return ALL results — no artificial cap
  return buildInfraItems(results, weightMap);
}

/** Returns ALL nearest hospitals within 15km using OSRM driving distances. */
export async function getTopHospitals(
  originLat: number,
  originLng: number,
  _count?: number,
): Promise<InfraItem[]> {
  if (isInvalidCoord(originLat, originLng)) return [];

  const hospitals = AMENITIES.filter((a) => a.type === "hospital").sort(
    (a, b) =>
      haversineDistance(originLat, originLng, a.lat, a.lng) -
      haversineDistance(originLat, originLng, b.lat, b.lng),
  );
  const poiInputs: POIInput[] = hospitals.map((a) => ({
    name: a.name,
    lat: a.lat,
    lng: a.lng,
    type: "hospital" as const,
    area: a.area,
    impactTag: "Livability boost",
    impactDescription: `${a.area} — premium healthcare access`,
  }));

  const weightMap = new Map(
    hospitals.map((a) => [a.name, { weight: a.weight, rating: a.rating }]),
  );
  const results = await getOSRMDistances(originLat, originLng, poiInputs, 15);
  // Return ALL results — no artificial cap
  return buildInfraItems(results, weightMap);
}

/** Returns ALL nearest schools within 15km using OSRM driving distances. */
export async function getTopSchools(
  originLat: number,
  originLng: number,
  _count?: number,
): Promise<InfraItem[]> {
  if (isInvalidCoord(originLat, originLng)) return [];

  const schools = AMENITIES.filter((a) => a.type === "school").sort(
    (a, b) =>
      haversineDistance(originLat, originLng, a.lat, a.lng) -
      haversineDistance(originLat, originLng, b.lat, b.lng),
  );
  const poiInputs: POIInput[] = schools.map((a) => ({
    name: a.name,
    lat: a.lat,
    lng: a.lng,
    type: "school" as const,
    area: a.area,
    impactTag: "Family appeal",
    impactDescription: `${a.area} — top school proximity`,
  }));

  const weightMap = new Map(
    schools.map((a) => [a.name, { weight: a.weight, rating: a.rating }]),
  );
  const results = await getOSRMDistances(originLat, originLng, poiInputs, 15);
  // Return ALL results — no artificial cap
  return buildInfraItems(results, weightMap);
}

/** Returns ALL nearest bus stops within 10km using OSRM driving distances. */
export async function getTopBusStops(
  originLat: number,
  originLng: number,
  _count?: number,
): Promise<InfraItem[]> {
  if (isInvalidCoord(originLat, originLng)) return [];

  // Pre-sort by haversine — nearest bus stops first
  const sortedBusStops = [...BUS_STOPS].sort(
    (a, b) =>
      haversineDistance(originLat, originLng, a.lat, a.lng) -
      haversineDistance(originLat, originLng, b.lat, b.lng),
  );
  const poiInputs: POIInput[] = sortedBusStops.map((b) => ({
    name: b.name,
    lat: b.lat,
    lng: b.lng,
    type: "bus_stop" as const,
    impactTag: b.impactTag,
    impactDescription: b.impactDescription,
  }));

  const results = await getOSRMDistances(originLat, originLng, poiInputs, 10);
  // Return ALL results — no artificial cap
  return buildInfraItems(results);
}

/** Returns ALL nearest railway stations within 25km using OSRM driving distances. */
export async function getTopRailwayStations(
  originLat: number,
  originLng: number,
  _count?: number,
): Promise<InfraItem[]> {
  if (isInvalidCoord(originLat, originLng)) return [];

  // Pre-sort by haversine — nearest railway stations first
  const sortedRailway = [...RAILWAY_STATIONS].sort(
    (a, b) =>
      haversineDistance(originLat, originLng, a.lat, a.lng) -
      haversineDistance(originLat, originLng, b.lat, b.lng),
  );
  const poiInputs: POIInput[] = sortedRailway.map((r) => ({
    name: r.name,
    lat: r.lat,
    lng: r.lng,
    type: "railway" as const,
    impactTag: r.impactTag,
    impactDescription: r.impactDescription,
  }));

  const results = await getOSRMDistances(originLat, originLng, poiInputs, 25);
  // Return ALL results — no artificial cap
  return buildInfraItems(results);
}

/** Returns ALL nearest malls within 15km using OSRM driving distances. */
export async function getTopMalls(
  originLat: number,
  originLng: number,
  _count?: number,
): Promise<InfraItem[]> {
  if (isInvalidCoord(originLat, originLng)) return [];

  // Pre-sort by haversine — nearest malls first
  const sortedMalls = [...MALLS_REGISTRY].sort(
    (a, b) =>
      haversineDistance(originLat, originLng, a.lat, a.lng) -
      haversineDistance(originLat, originLng, b.lat, b.lng),
  );
  const poiInputs: POIInput[] = sortedMalls.map((m) => ({
    name: m.name,
    lat: m.lat,
    lng: m.lng,
    type: "mall" as const,
    impactTag: m.impactTag,
    impactDescription: m.impactDescription,
  }));

  // Use 15km radius for malls per spec
  const results = await getOSRMDistances(originLat, originLng, poiInputs, 15);
  // Return ALL results — no artificial cap
  return buildInfraItems(results);
}

/** Returns ALL nearest colleges within 15km using OSRM driving distances. */
export async function getTopColleges(
  originLat: number,
  originLng: number,
  _count?: number,
): Promise<InfraItem[]> {
  if (isInvalidCoord(originLat, originLng)) return [];

  // Pre-sort by haversine — nearest colleges first
  const sortedColleges = [...COLLEGES_REGISTRY].sort(
    (a, b) =>
      haversineDistance(originLat, originLng, a.lat, a.lng) -
      haversineDistance(originLat, originLng, b.lat, b.lng),
  );
  const poiInputs: POIInput[] = sortedColleges.map((c) => ({
    name: c.name,
    lat: c.lat,
    lng: c.lng,
    type: "college" as const,
    impactTag: c.impactTag,
    impactDescription: c.impactDescription,
  }));

  const results = await getOSRMDistances(originLat, originLng, poiInputs, 15);
  // Return ALL results — no artificial cap
  return buildInfraItems(results);
}

/** Returns nearest airports using OSRM driving distances. */
export async function getTopAirports(
  originLat: number,
  originLng: number,
  _count?: number,
): Promise<InfraItem[]> {
  if (isInvalidCoord(originLat, originLng)) return [];

  const poiInputs: POIInput[] = AIRPORTS.map((a) => ({
    name: a.name,
    lat: a.lat,
    lng: a.lng,
    type: "airport" as const,
    impactTag: a.impactTag,
    impactDescription: a.impactDescription,
  }));

  // CRITICAL: KIAL is ~22-40km from most Bangalore locations — use 60km radius
  // to ensure it's never filtered out by haversine pre-filter
  const results = await getOSRMDistances(originLat, originLng, poiInputs, 60);
  // Return ALL results — no artificial cap
  return buildInfraItems(results);
}

/** Returns ALL nearest highway access points within 20km using OSRM driving distances. */
export async function getTopHighways(
  originLat: number,
  originLng: number,
): Promise<InfraItem[]> {
  if (isInvalidCoord(originLat, originLng)) return [];

  // Pre-sort by haversine — nearest highway access points first
  const sortedHighways = [...HIGHWAYS].sort(
    (a, b) =>
      haversineDistance(originLat, originLng, a.lat, a.lng) -
      haversineDistance(originLat, originLng, b.lat, b.lng),
  );
  const poiInputs: POIInput[] = sortedHighways.map((h) => ({
    name: h.name,
    lat: h.lat,
    lng: h.lng,
    type: "highway" as const,
    impactTag: h.impactTag,
    impactDescription: h.impactDescription,
  }));

  const results = await getOSRMDistances(originLat, originLng, poiInputs, 20);
  // Return ALL results — no artificial cap
  return buildInfraItems(results);
}

// ─── Legacy MALLS export (kept for any direct imports) ───────────────────────

export const MALLS = MALLS_REGISTRY.map((m) => ({
  name: m.name,
  area: "",
  lat: m.lat,
  lng: m.lng,
}));

// ─── Legacy airport constant ─────────────────────────────────────────────────

export const AIRPORT_KIA = {
  name: "Kempegowda International Airport",
  lat: 13.1986,
  lng: 77.7066,
};

/**
 * @deprecated Use getTopAirports (async OSRM-based) instead.
 * Returns null — callers must migrate to getTopAirports().
 */
export function getAirportDistance(_lat: number, _lng: number): null {
  console.warn(
    "[ValuBrix] getAirportDistance is deprecated — use getTopAirports() (async)",
  );
  return null;
}

// ─── Score functions (use haversine internally for scoring — NOT for display) ─

/**
 * Tech score: exponential distance decay using exp(-distKm / 3.0) * 25 per hub.
 * Uses haversine INTERNALLY for scoring only — not displayed to users.
 */
export function getRawTechScore(lat: number, lng: number): number {
  if (!lat || !lng || (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01))
    return 0.1;

  const DECAY_CONSTANT = 3.0;
  const SCORE_PER_HUB = 25;
  const MAX_DIST_KM = 20;

  let totalScore = 0;
  for (const park of TECH_PARKS) {
    const distKm = haversineDistance(lat, lng, park.lat, park.lng);
    if (distKm > MAX_DIST_KM) continue;
    totalScore +=
      Math.exp(-distKm / DECAY_CONSTANT) * SCORE_PER_HUB * park.weight;
  }

  const score100 = Math.min(100, Math.round(totalScore));
  console.log(
    `[ValuBrix] TechScore: raw=${totalScore.toFixed(1)} → ${score100}/100 from (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
  );
  return Math.max(0.1, Math.min(1.0, score100 / 100));
}

/**
 * Metro score: exponential distance decay over all metro stations within 15km.
 * Uses haversine INTERNALLY for scoring only — not displayed to users.
 */
export function getRawMetroScore(lat: number, lng: number): number {
  if (!lat || !lng || (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01))
    return 0.1;

  const MAX_DIST_KM = 15;
  const DECAY_CONSTANT = 3.0;

  const METRO_COORDS: Array<{
    lat: number;
    lng: number;
    operational: boolean;
  }> = [
    { lat: 12.9753, lng: 77.6069, operational: true },
    { lat: 12.977, lng: 77.6173, operational: true },
    { lat: 12.9784, lng: 77.6408, operational: true },
    { lat: 12.99, lng: 77.6618, operational: true },
    { lat: 12.9965, lng: 77.6963, operational: true },
    { lat: 12.992, lng: 77.716, operational: true },
    { lat: 12.9698, lng: 77.7499, operational: true },
    { lat: 12.9763, lng: 77.5713, operational: true },
    { lat: 12.971, lng: 77.537, operational: true },
    { lat: 12.9117, lng: 77.4821, operational: true },
    { lat: 13.0522, lng: 77.5337, operational: true },
    { lat: 13.0276, lng: 77.5178, operational: true },
    { lat: 13.0234, lng: 77.5545, operational: true },
    { lat: 12.9904, lng: 77.5556, operational: true },
    { lat: 12.9257, lng: 77.5826, operational: true },
    { lat: 12.9155, lng: 77.5661, operational: true },
    { lat: 12.8856, lng: 77.5747, operational: true },
    { lat: 12.9166, lng: 77.6101, operational: true },
    { lat: 12.9171, lng: 77.6232, operational: true },
    { lat: 12.8399, lng: 77.677, operational: true },
    { lat: 12.8241, lng: 77.6816, operational: true },
    { lat: 13.1007, lng: 77.5963, operational: false },
    { lat: 13.0352, lng: 77.597, operational: false },
    { lat: 13.204, lng: 77.7081, operational: false },
  ];

  const stationsInRange = METRO_COORDS.filter(
    (m) => haversineDistance(lat, lng, m.lat, m.lng) <= MAX_DIST_KM,
  );

  if (stationsInRange.length === 0) return 0.1;

  const maxPossibleScore = stationsInRange.length;
  let rawScore = 0;

  for (const station of stationsInRange) {
    const distKm = haversineDistance(lat, lng, station.lat, station.lng);
    const weight = station.operational ? 1.0 : 0.5;
    rawScore += weight * Math.exp(-distKm / DECAY_CONSTANT);
  }

  const normalized = rawScore / maxPossibleScore;
  return Math.min(1.0, Math.max(0.1, normalized));
}

/**
 * Amenity score: exponential distance decay over hospitals + schools.
 * Uses haversine INTERNALLY for scoring only — not displayed to users.
 * Normalized to 0.2–1.0.
 */
export function getRawAmenityScore(lat: number, lng: number): number {
  if (!lat || !lng || (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01))
    return 0.2;

  let score = 0;
  let totalWeight = 0;

  for (const amenity of AMENITIES) {
    const distKm = haversineDistance(lat, lng, amenity.lat, amenity.lng);
    const decay = Math.exp(-0.25 * distKm);
    score += amenity.weight * decay * amenity.rating;
    totalWeight += amenity.weight * amenity.rating;
  }

  const normalized = totalWeight > 0 ? score / totalWeight : 0.2;
  return Math.max(0.2, Math.min(1.0, normalized));
}

// ─── New POI Interface ────────────────────────────────────────────────────────

interface SimplePOI {
  name: string;
  lat: number;
  lng: number;
  locality: string;
}

// ─── Police Stations ─────────────────────────────────────────────────────────

const POLICE_STATIONS: SimplePOI[] = [
  {
    name: "Yeshwanthpur Police Station",
    lat: 13.0249,
    lng: 77.556,
    locality: "Yeshwanthpur",
  },
  {
    name: "Hebbal Police Station",
    lat: 13.034,
    lng: 77.5956,
    locality: "Hebbal",
  },
  {
    name: "Banasawadi Police Station",
    lat: 13.0187,
    lng: 77.6455,
    locality: "Banasawadi",
  },
  {
    name: "Whitefield Police Station",
    lat: 12.9713,
    lng: 77.7508,
    locality: "Whitefield",
  },
  {
    name: "Electronic City Police Station",
    lat: 12.846,
    lng: 77.675,
    locality: "Electronic City",
  },
  {
    name: "Koramangala Police Station",
    lat: 12.9367,
    lng: 77.6128,
    locality: "Koramangala",
  },
  {
    name: "MG Road Police Station",
    lat: 12.9762,
    lng: 77.6033,
    locality: "MG Road",
  },
  {
    name: "Indiranagar Police Station",
    lat: 12.9753,
    lng: 77.6389,
    locality: "Indiranagar",
  },
  {
    name: "Rajajinagar Police Station",
    lat: 12.9951,
    lng: 77.5557,
    locality: "Rajajinagar",
  },
  {
    name: "Marathahalli Police Station",
    lat: 12.9591,
    lng: 77.7001,
    locality: "Marathahalli",
  },
  {
    name: "Jalahalli Police Station",
    lat: 13.0442,
    lng: 77.5598,
    locality: "Jalahalli",
  },
  {
    name: "Nagasandra Police Station",
    lat: 13.0594,
    lng: 77.5229,
    locality: "Nagasandra",
  },
];

// ─── Petrol Pumps ─────────────────────────────────────────────────────────────

const PETROL_PUMPS: SimplePOI[] = [
  {
    name: "HP Petrol Pump Yeshwanthpur",
    lat: 13.0254,
    lng: 77.554,
    locality: "Yeshwanthpur",
  },
  { name: "BPCL Pump Hebbal", lat: 13.0367, lng: 77.5965, locality: "Hebbal" },
  {
    name: "Indian Oil Nagasandra",
    lat: 13.0578,
    lng: 77.5239,
    locality: "Nagasandra",
  },
  {
    name: "HP Pump Indiranagar",
    lat: 12.9718,
    lng: 77.6408,
    locality: "Indiranagar",
  },
  {
    name: "BPCL Koramangala",
    lat: 12.9358,
    lng: 77.6233,
    locality: "Koramangala",
  },
  {
    name: "Indian Oil Whitefield",
    lat: 12.9679,
    lng: 77.7492,
    locality: "Whitefield",
  },
  {
    name: "HP Pump Electronic City",
    lat: 12.8432,
    lng: 77.6763,
    locality: "Electronic City",
  },
  {
    name: "BPCL Marathahalli",
    lat: 12.9574,
    lng: 77.6993,
    locality: "Marathahalli",
  },
  {
    name: "Indian Oil Rajajinagar",
    lat: 12.9942,
    lng: 77.5548,
    locality: "Rajajinagar",
  },
  {
    name: "HP Pump BTM Layout",
    lat: 12.9154,
    lng: 77.6099,
    locality: "BTM Layout",
  },
  {
    name: "Indian Oil Jalahalli Cross",
    lat: 13.0428,
    lng: 77.567,
    locality: "BEL Circle",
  },
];

// ─── Pharmacies ───────────────────────────────────────────────────────────────

const PHARMACIES: SimplePOI[] = [
  {
    name: "Apollo Pharmacy Yeshwanthpur",
    lat: 13.0243,
    lng: 77.5551,
    locality: "Yeshwanthpur",
  },
  { name: "MedPlus Hebbal", lat: 13.0351, lng: 77.5977, locality: "Hebbal" },
  {
    name: "Wellness Forever Indiranagar",
    lat: 12.9724,
    lng: 77.6415,
    locality: "Indiranagar",
  },
  {
    name: "Apollo Pharmacy Koramangala",
    lat: 12.9361,
    lng: 77.624,
    locality: "Koramangala",
  },
  {
    name: "MedPlus Whitefield",
    lat: 12.9695,
    lng: 77.7497,
    locality: "Whitefield",
  },
  {
    name: "Netmeds Marathahalli",
    lat: 12.9582,
    lng: 77.6997,
    locality: "Marathahalli",
  },
  {
    name: "Apollo Pharmacy Electronic City",
    lat: 12.8444,
    lng: 77.6754,
    locality: "Electronic City",
  },
  {
    name: "MedPlus Jayanagar",
    lat: 12.9252,
    lng: 77.5838,
    locality: "Jayanagar",
  },
  {
    name: "Wellness Forever Rajajinagar",
    lat: 12.9948,
    lng: 77.5543,
    locality: "Rajajinagar",
  },
  {
    name: "Apollo Pharmacy HSR Layout",
    lat: 12.9116,
    lng: 77.6475,
    locality: "HSR Layout",
  },
  {
    name: "MedPlus Nagasandra",
    lat: 13.058,
    lng: 77.523,
    locality: "Nagasandra",
  },
];

// ─── Supermarkets ─────────────────────────────────────────────────────────────

const SUPERMARKETS: SimplePOI[] = [
  {
    name: "Reliance Fresh Yeshwanthpur",
    lat: 13.0241,
    lng: 77.5548,
    locality: "Yeshwanthpur",
  },
  { name: "Big Bazaar Hebbal", lat: 13.0347, lng: 77.5981, locality: "Hebbal" },
  {
    name: "More Supermarket Indiranagar",
    lat: 12.9721,
    lng: 77.6417,
    locality: "Indiranagar",
  },
  {
    name: "Dmart Koramangala",
    lat: 12.9358,
    lng: 77.6236,
    locality: "Koramangala",
  },
  {
    name: "Dmart Whitefield",
    lat: 12.9687,
    lng: 77.7494,
    locality: "Whitefield",
  },
  {
    name: "Reliance Fresh Electronic City",
    lat: 12.8449,
    lng: 77.6758,
    locality: "Electronic City",
  },
  {
    name: "Big Bazaar Marathahalli",
    lat: 12.9579,
    lng: 77.6999,
    locality: "Marathahalli",
  },
  {
    name: "Dmart Bannerghatta Road",
    lat: 12.8978,
    lng: 77.5983,
    locality: "Bannerghatta Road",
  },
  {
    name: "More Supermarket Rajajinagar",
    lat: 12.9946,
    lng: 77.5546,
    locality: "Rajajinagar",
  },
  {
    name: "Reliance Fresh JP Nagar",
    lat: 12.9082,
    lng: 77.5862,
    locality: "JP Nagar",
  },
  {
    name: "Dmart Nagasandra",
    lat: 13.059,
    lng: 77.5225,
    locality: "Nagasandra",
  },
];

// ─── Restaurants ──────────────────────────────────────────────────────────────

const RESTAURANTS: SimplePOI[] = [
  {
    name: "MTR Yeshwanthpur",
    lat: 13.0247,
    lng: 77.5545,
    locality: "Yeshwanthpur",
  },
  {
    name: "Vidyarthi Bhavan Basavanagudi",
    lat: 12.9487,
    lng: 77.5731,
    locality: "Basavanagudi",
  },
  {
    name: "Koshy's Indiranagar",
    lat: 12.9729,
    lng: 77.642,
    locality: "Indiranagar",
  },
  {
    name: "Toit Indiranagar",
    lat: 12.9731,
    lng: 77.6425,
    locality: "Indiranagar",
  },
  {
    name: "Truffles Koramangala",
    lat: 12.9356,
    lng: 77.6242,
    locality: "Koramangala",
  },
  {
    name: "Meghana Foods Koramangala",
    lat: 12.9364,
    lng: 77.6232,
    locality: "Koramangala",
  },
  {
    name: "The Black Pearl Whitefield",
    lat: 12.9689,
    lng: 77.7496,
    locality: "Whitefield",
  },
  {
    name: "Barbeque Nation Marathahalli",
    lat: 12.9577,
    lng: 77.7003,
    locality: "Marathahalli",
  },
  {
    name: "CTR Malleshwaram",
    lat: 13.0047,
    lng: 77.5688,
    locality: "Malleshwaram",
  },
  {
    name: "Empire Restaurant MG Road",
    lat: 12.9759,
    lng: 77.6032,
    locality: "MG Road",
  },
  {
    name: "Udupi Krishna Nagasandra",
    lat: 13.0594,
    lng: 77.5229,
    locality: "Nagasandra",
  },
];

// ─── Banks ────────────────────────────────────────────────────────────────────

const BANKS: SimplePOI[] = [
  {
    name: "HDFC Bank Yeshwanthpur",
    lat: 13.0239,
    lng: 77.5553,
    locality: "Yeshwanthpur",
  },
  { name: "SBI Hebbal", lat: 13.0353, lng: 77.5975, locality: "Hebbal" },
  {
    name: "ICICI Bank Indiranagar",
    lat: 12.9726,
    lng: 77.6413,
    locality: "Indiranagar",
  },
  {
    name: "Axis Bank Koramangala",
    lat: 12.9362,
    lng: 77.6238,
    locality: "Koramangala",
  },
  {
    name: "HDFC Bank Whitefield",
    lat: 12.9681,
    lng: 77.7495,
    locality: "Whitefield",
  },
  {
    name: "Canara Bank Rajajinagar",
    lat: 12.9944,
    lng: 77.5549,
    locality: "Rajajinagar",
  },
  {
    name: "SBI Electronic City",
    lat: 12.8448,
    lng: 77.6756,
    locality: "Electronic City",
  },
  {
    name: "ICICI Marathahalli",
    lat: 12.9581,
    lng: 77.7002,
    locality: "Marathahalli",
  },
  {
    name: "HDFC Bank Jayanagar",
    lat: 12.9248,
    lng: 77.5835,
    locality: "Jayanagar",
  },
  {
    name: "State Bank Malleshwaram",
    lat: 13.0049,
    lng: 77.5686,
    locality: "Malleshwaram",
  },
  {
    name: "SBI BEL Circle",
    lat: 13.0428,
    lng: 77.567,
    locality: "BEL Circle",
  },
  {
    name: "HDFC Bank Nagasandra",
    lat: 13.059,
    lng: 77.5228,
    locality: "Nagasandra",
  },
];

// ─── ATMs ─────────────────────────────────────────────────────────────────────

const ATMS: SimplePOI[] = [
  {
    name: "SBI ATM Yeshwanthpur",
    lat: 13.0237,
    lng: 77.5557,
    locality: "Yeshwanthpur",
  },
  { name: "HDFC ATM Hebbal", lat: 13.0355, lng: 77.5979, locality: "Hebbal" },
  {
    name: "ICICI ATM Indiranagar",
    lat: 12.9728,
    lng: 77.6411,
    locality: "Indiranagar",
  },
  {
    name: "Axis ATM Koramangala",
    lat: 12.9364,
    lng: 77.6241,
    locality: "Koramangala",
  },
  {
    name: "HDFC ATM Whitefield",
    lat: 12.9683,
    lng: 77.7496,
    locality: "Whitefield",
  },
  {
    name: "SBI ATM Rajajinagar",
    lat: 12.9947,
    lng: 77.5544,
    locality: "Rajajinagar",
  },
  {
    name: "Bank of India ATM Electronic City",
    lat: 12.8443,
    lng: 77.6759,
    locality: "Electronic City",
  },
  {
    name: "ICICI ATM Marathahalli",
    lat: 12.9578,
    lng: 77.7,
    locality: "Marathahalli",
  },
  {
    name: "Canara ATM Jayanagar",
    lat: 12.925,
    lng: 77.584,
    locality: "Jayanagar",
  },
  {
    name: "HDFC ATM Malleshwaram",
    lat: 13.0044,
    lng: 77.5689,
    locality: "Malleshwaram",
  },
  {
    name: "SBI ATM BEL Circle",
    lat: 13.0428,
    lng: 77.567,
    locality: "BEL Circle",
  },
  {
    name: "ICICI ATM Nagasandra",
    lat: 13.0594,
    lng: 77.5229,
    locality: "Nagasandra",
  },
];

// ─── Helper: map SimplePOI[] to POIInput[] ────────────────────────────────────

function simplePOIsToInput(
  pois: SimplePOI[],
  type:
    | "police"
    | "petrol_pump"
    | "pharmacy"
    | "supermarket"
    | "restaurant"
    | "bank"
    | "atm",
  impactTag: string,
  impactDescriptionFn: (p: SimplePOI) => string,
): POIInput[] {
  return pois.map((p) => ({
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    type,
    impactTag,
    impactDescription: impactDescriptionFn(p),
  }));
}

// ─── New category helper functions (same pattern as getTopHospitals etc.) ─────

/** Returns ALL nearest police stations within radius using OSRM driving distances. */
export async function getTopPoliceStations(
  originLat: number,
  originLng: number,
  radiusKm = 8,
): Promise<InfraItem[]> {
  if (isInvalidCoord(originLat, originLng)) return [];

  const sorted = [...POLICE_STATIONS].sort(
    (a, b) =>
      haversineDistance(originLat, originLng, a.lat, a.lng) -
      haversineDistance(originLat, originLng, b.lat, b.lng),
  );
  const poiInputs = simplePOIsToInput(
    sorted,
    "police",
    "Safety infrastructure",
    (p) => `${p.locality} — nearest police station`,
  );
  const results = await getOSRMDistances(
    originLat,
    originLng,
    poiInputs,
    radiusKm,
  );
  // Return ALL results — no artificial cap
  return buildInfraItems(results);
}

/** Returns ALL nearest petrol pumps within radius using OSRM driving distances. */
export async function getTopPetrolPumps(
  originLat: number,
  originLng: number,
  radiusKm = 5,
): Promise<InfraItem[]> {
  if (isInvalidCoord(originLat, originLng)) return [];

  const sorted = [...PETROL_PUMPS].sort(
    (a, b) =>
      haversineDistance(originLat, originLng, a.lat, a.lng) -
      haversineDistance(originLat, originLng, b.lat, b.lng),
  );
  const poiInputs = simplePOIsToInput(
    sorted,
    "petrol_pump",
    "Daily convenience",
    (p) => `${p.locality} — fuel station`,
  );
  const results = await getOSRMDistances(
    originLat,
    originLng,
    poiInputs,
    radiusKm,
  );
  // Return ALL results — no artificial cap
  return buildInfraItems(results);
}

/** Returns ALL nearest pharmacies within radius using OSRM driving distances. */
export async function getTopPharmacies(
  originLat: number,
  originLng: number,
  radiusKm = 3,
): Promise<InfraItem[]> {
  if (isInvalidCoord(originLat, originLng)) return [];

  const sorted = [...PHARMACIES].sort(
    (a, b) =>
      haversineDistance(originLat, originLng, a.lat, a.lng) -
      haversineDistance(originLat, originLng, b.lat, b.lng),
  );
  const poiInputs = simplePOIsToInput(
    sorted,
    "pharmacy",
    "Healthcare access",
    (p) => `${p.locality} — pharmacy`,
  );
  const results = await getOSRMDistances(
    originLat,
    originLng,
    poiInputs,
    radiusKm,
  );
  // Return ALL results — no artificial cap
  return buildInfraItems(results);
}

/** Returns ALL nearest supermarkets within radius using OSRM driving distances. */
export async function getTopSupermarkets(
  originLat: number,
  originLng: number,
  radiusKm = 5,
): Promise<InfraItem[]> {
  if (isInvalidCoord(originLat, originLng)) return [];

  const sorted = [...SUPERMARKETS].sort(
    (a, b) =>
      haversineDistance(originLat, originLng, a.lat, a.lng) -
      haversineDistance(originLat, originLng, b.lat, b.lng),
  );
  const poiInputs = simplePOIsToInput(
    sorted,
    "supermarket",
    "Daily convenience",
    (p) => `${p.locality} — supermarket`,
  );
  const results = await getOSRMDistances(
    originLat,
    originLng,
    poiInputs,
    radiusKm,
  );
  // Return ALL results — no artificial cap
  return buildInfraItems(results);
}

/** Returns ALL nearest restaurants within radius using OSRM driving distances. */
export async function getTopRestaurants(
  originLat: number,
  originLng: number,
  radiusKm = 3,
): Promise<InfraItem[]> {
  if (isInvalidCoord(originLat, originLng)) return [];

  const sorted = [...RESTAURANTS].sort(
    (a, b) =>
      haversineDistance(originLat, originLng, a.lat, a.lng) -
      haversineDistance(originLat, originLng, b.lat, b.lng),
  );
  const poiInputs = simplePOIsToInput(
    sorted,
    "restaurant",
    "Lifestyle",
    (p) => `${p.locality} — dining`,
  );
  const results = await getOSRMDistances(
    originLat,
    originLng,
    poiInputs,
    radiusKm,
  );
  // Return ALL results — no artificial cap
  return buildInfraItems(results);
}

/** Returns ALL nearest banks within radius using OSRM driving distances. */
export async function getTopBanks(
  originLat: number,
  originLng: number,
  radiusKm = 3,
): Promise<InfraItem[]> {
  if (isInvalidCoord(originLat, originLng)) return [];

  const sorted = [...BANKS].sort(
    (a, b) =>
      haversineDistance(originLat, originLng, a.lat, a.lng) -
      haversineDistance(originLat, originLng, b.lat, b.lng),
  );
  const poiInputs = simplePOIsToInput(
    sorted,
    "bank",
    "Financial services",
    (p) => `${p.locality} — bank branch`,
  );
  const results = await getOSRMDistances(
    originLat,
    originLng,
    poiInputs,
    radiusKm,
  );
  // Return ALL results — no artificial cap
  return buildInfraItems(results);
}

/** Returns ALL nearest ATMs within radius using OSRM driving distances. */
export async function getTopATMs(
  originLat: number,
  originLng: number,
  radiusKm = 2,
): Promise<InfraItem[]> {
  if (isInvalidCoord(originLat, originLng)) return [];

  const sorted = [...ATMS].sort(
    (a, b) =>
      haversineDistance(originLat, originLng, a.lat, a.lng) -
      haversineDistance(originLat, originLng, b.lat, b.lng),
  );
  const poiInputs = simplePOIsToInput(
    sorted,
    "atm",
    "Financial services",
    (p) => `${p.locality} — ATM`,
  );
  const results = await getOSRMDistances(
    originLat,
    originLng,
    poiInputs,
    radiusKm,
  );
  // Return ALL results — no artificial cap
  return buildInfraItems(results);
}

// ─── Export new POI data arrays (for map rendering) ──────────────────────────

export {
  POLICE_STATIONS,
  PETROL_PUMPS,
  PHARMACIES,
  SUPERMARKETS,
  RESTAURANTS,
  BANKS,
  ATMS,
};
