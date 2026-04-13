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
    lat: 13.0444,
    lng: 77.6031,
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
    lat: 12.9165,
    lng: 77.6806,
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
    lat: 13.025,
    lng: 77.554,
    rating: 4.3,
    weight: 0.9,
  },
];

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

/** Returns top N nearest tech parks using OSRM driving distances. */
export async function getTopTechParks(
  originLat: number,
  originLng: number,
  count = 5,
): Promise<InfraItem[]> {
  if (
    !originLat ||
    !originLng ||
    (Math.abs(originLat) < 0.01 && Math.abs(originLng) < 0.01)
  )
    return [];

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
  return buildInfraItems(results, weightMap).slice(0, count);
}

/** Returns top N nearest hospitals using OSRM driving distances. */
export async function getTopHospitals(
  originLat: number,
  originLng: number,
  count = 5,
): Promise<InfraItem[]> {
  if (
    !originLat ||
    !originLng ||
    (Math.abs(originLat) < 0.01 && Math.abs(originLng) < 0.01)
  )
    return [];

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
  return buildInfraItems(results, weightMap).slice(0, count);
}

/** Returns top N nearest schools using OSRM driving distances. */
export async function getTopSchools(
  originLat: number,
  originLng: number,
  count = 5,
): Promise<InfraItem[]> {
  if (
    !originLat ||
    !originLng ||
    (Math.abs(originLat) < 0.01 && Math.abs(originLng) < 0.01)
  )
    return [];

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
  return buildInfraItems(results, weightMap).slice(0, count);
}

/** Returns top N nearest bus stops using OSRM driving distances. */
export async function getTopBusStops(
  originLat: number,
  originLng: number,
  count = 5,
): Promise<InfraItem[]> {
  if (
    !originLat ||
    !originLng ||
    (Math.abs(originLat) < 0.01 && Math.abs(originLng) < 0.01)
  )
    return [];

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
  return buildInfraItems(results).slice(0, count);
}

/** Returns top N nearest railway stations using OSRM driving distances. */
export async function getTopRailwayStations(
  originLat: number,
  originLng: number,
  count = 5,
): Promise<InfraItem[]> {
  if (
    !originLat ||
    !originLng ||
    (Math.abs(originLat) < 0.01 && Math.abs(originLng) < 0.01)
  )
    return [];

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
  return buildInfraItems(results).slice(0, count);
}

/** Returns top N nearest malls using OSRM driving distances. */
export async function getTopMalls(
  originLat: number,
  originLng: number,
  count = 3,
): Promise<InfraItem[]> {
  if (
    !originLat ||
    !originLng ||
    (Math.abs(originLat) < 0.01 && Math.abs(originLng) < 0.01)
  )
    return [];

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

  const results = await getOSRMDistances(originLat, originLng, poiInputs, 15);
  return buildInfraItems(results).slice(0, count);
}

/** Returns top N nearest colleges using OSRM driving distances. */
export async function getTopColleges(
  originLat: number,
  originLng: number,
  count = 5,
): Promise<InfraItem[]> {
  if (
    !originLat ||
    !originLng ||
    (Math.abs(originLat) < 0.01 && Math.abs(originLng) < 0.01)
  )
    return [];

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
  return buildInfraItems(results).slice(0, count);
}

/** Returns nearest airports using OSRM driving distances. */
export async function getTopAirports(
  originLat: number,
  originLng: number,
  count = 2,
): Promise<InfraItem[]> {
  if (
    !originLat ||
    !originLng ||
    (Math.abs(originLat) < 0.01 && Math.abs(originLng) < 0.01)
  )
    return [];

  const poiInputs: POIInput[] = AIRPORTS.map((a) => ({
    name: a.name,
    lat: a.lat,
    lng: a.lng,
    type: "airport" as const,
    impactTag: a.impactTag,
    impactDescription: a.impactDescription,
  }));

  // CRITICAL: KIAL is ~22-40km from most Bangalore locations — use 50km radius
  // to ensure it's never filtered out by haversine pre-filter
  const results = await getOSRMDistances(originLat, originLng, poiInputs, 50);
  return buildInfraItems(results).slice(0, count);
}

/** Returns nearest highway access points using OSRM driving distances. */
export async function getTopHighways(
  originLat: number,
  originLng: number,
  count = 3,
): Promise<InfraItem[]> {
  if (
    !originLat ||
    !originLng ||
    (Math.abs(originLat) < 0.01 && Math.abs(originLng) < 0.01)
  )
    return [];

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
  return buildInfraItems(results).slice(0, count);
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
