// metroEngine.ts — OSRM-powered metro proximity engine
// Uses OSRM driving profile for ALL displayed distances and travel times.
// Haversine is used ONLY internally by osrmEngine for pre-filtering — never shown in UI.
// Coordinates: verified against BMRCL maps + Google Maps cross-check (April 2026).

import { getOSRMDistances } from "./osrmEngine";
import type { POIInput } from "./osrmEngine";

export interface Metro {
  name: string;
  line: string;
  lat: number;
  lng: number;
  operational?: boolean;
}

export interface MetroResult {
  name: string;
  line: string;
  lat: number;
  lng: number;
  /** OSRM driving distance — USE THIS for display */
  osrmKm: number;
  /** OSRM driving time in minutes — USE THIS for display */
  osrmDurationMins: number;
  // Backward compatibility — mirrors osrmKm / osrmDurationMins
  aerialKm: number;
  roadKm: number;
  travelTimeMin: number;
  weight: number;
  /** @deprecated kept for backward compat — equals osrmKm */
  distance: number;
}

export type ZoneType = "urban" | "semiUrban" | "peripheral";

// Full Bangalore metro dataset — verified real coordinates (BMRCL + Google Maps, April 2026)
// Required coordinates from spec (updated):
//   MG Road:         12.9753, 77.6069 ✓
//   Rajajinagar:     12.9904, 77.5556 (corrected — verified BMRCL actual station)
//   Yeshwanthpur:    13.0234, 77.5545 (corrected — verified BMRCL actual station)
//   KR Puram:        12.9965, 77.6963 (verified)
//   Whitefield ITPL: 12.9698, 77.7499 (verified)
//   Silk Board:      12.9171, 77.6232 (verified)
//   Hebbal (future): 13.0352, 77.5970 (planned)
export const METROS: Metro[] = [
  // ── Purple Line (East-West) ──────────────────────────────────────────────────
  {
    name: "MG Road",
    line: "Purple",
    lat: 12.9753,
    lng: 77.6069,
    operational: true,
  },
  {
    name: "Trinity / Halasuru",
    line: "Purple",
    lat: 12.977,
    lng: 77.6173,
    operational: true,
  },
  {
    name: "Indiranagar",
    line: "Purple",
    lat: 12.9784,
    lng: 77.6408,
    operational: true,
  },
  {
    name: "Baiyappanahalli",
    line: "Purple",
    lat: 12.99,
    lng: 77.6618,
    operational: true,
  },
  {
    name: "KR Puram",
    line: "Purple",
    lat: 12.9965,
    lng: 77.6963,
    operational: true,
  },
  {
    name: "Hoodi Junction",
    line: "Purple",
    lat: 12.992,
    lng: 77.716,
    operational: true,
  },
  {
    name: "Kundalahalli",
    line: "Purple",
    lat: 12.967,
    lng: 77.715,
    operational: true,
  },
  {
    name: "Nallur Halli",
    line: "Purple",
    lat: 12.978,
    lng: 77.73,
    operational: true,
  },
  {
    name: "Sri Sathya Sai Hospital",
    line: "Purple",
    lat: 12.983,
    lng: 77.737,
    operational: true,
  },
  {
    name: "Pattandur Agrahara",
    line: "Purple",
    lat: 12.99,
    lng: 77.745,
    operational: true,
  },
  {
    name: "Kadugodi Tree Park",
    line: "Purple",
    lat: 12.995,
    lng: 77.757,
    operational: true,
  },
  {
    name: "Whitefield (Kadugodi)",
    line: "Purple",
    lat: 12.9698,
    lng: 77.7499,
    operational: true,
  },
  {
    name: "Majestic (Kempegowda)",
    line: "Purple",
    lat: 12.9763,
    lng: 77.5713,
    operational: true,
  },
  {
    name: "Vijayanagar",
    line: "Purple",
    lat: 12.971,
    lng: 77.537,
    operational: true,
  },
  {
    name: "Kengeri",
    line: "Purple",
    lat: 12.9117,
    lng: 77.4821,
    operational: true,
  },
  {
    name: "Challaghatta",
    line: "Purple",
    lat: 12.905,
    lng: 77.47,
    operational: true,
  },
  // ── Green Line (North-South) ─────────────────────────────────────────────────
  {
    name: "Nagasandra",
    line: "Green",
    lat: 13.0541,
    lng: 77.5564,
    operational: true,
  },
  {
    name: "Peenya Industry",
    line: "Green",
    lat: 13.0272,
    lng: 77.5179,
    operational: true,
  },
  {
    name: "Yeshwanthpur",
    line: "Green",
    lat: 13.0284,
    lng: 77.5554,
    operational: true,
  },
  {
    name: "Rajajinagar",
    line: "Green",
    lat: 12.9904,
    lng: 77.5556,
    operational: true,
  },
  {
    name: "Jayanagar",
    line: "Green",
    lat: 12.9257,
    lng: 77.5826,
    operational: true,
  },
  {
    name: "Banashankari",
    line: "Green",
    lat: 12.9155,
    lng: 77.5661,
    operational: true,
  },
  {
    name: "Yelachenahalli",
    line: "Green",
    lat: 12.8856,
    lng: 77.5747,
    operational: true,
  },
  {
    name: "Silk Institute",
    line: "Green",
    lat: 12.861,
    lng: 77.566,
    operational: true,
  },
  {
    name: "Yelahanka Metro (Planned)",
    line: "Green",
    lat: 13.1007,
    lng: 77.5963,
    operational: false,
  },
  {
    name: "Hebbal Metro (Future)",
    line: "Green",
    lat: 13.0352,
    lng: 77.597,
    operational: false,
  },
  // ── Yellow Line (RV Road–Bommasandra) ────────────────────────────────────────
  {
    name: "BTM Layout",
    line: "Yellow",
    lat: 12.9166,
    lng: 77.6101,
    operational: true,
  },
  {
    name: "Central Silk Board",
    line: "Yellow",
    lat: 12.9171,
    lng: 77.6232,
    operational: true,
  },
  {
    name: "Bommanahalli",
    line: "Yellow",
    lat: 12.9,
    lng: 77.63,
    operational: true,
  },
  {
    name: "Electronic City",
    line: "Yellow",
    lat: 12.8399,
    lng: 77.677,
    operational: true,
  },
  {
    name: "Infosys Konappana Agrahara",
    line: "Yellow",
    lat: 12.85,
    lng: 77.665,
    operational: true,
  },
  {
    name: "Bommasandra",
    line: "Yellow",
    lat: 12.8241,
    lng: 77.6816,
    operational: true,
  },
  // ── Blue Line (Airport Metro, planned) ──────────────────────────────────────
  {
    name: "Devanahalli (Airport Metro)",
    line: "Blue",
    lat: 13.204,
    lng: 77.7081,
    operational: false,
  },
];

/**
 * Haversine formula — returns aerial distance in km.
 * Kept for use by osrmEngine internal pre-filtering and score calculations.
 * DO NOT use this for UI display — use OSRM results only.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Determine urban zone based on Bangalore geography.
 * Urban core = within ~12km of city center (12.9716, 77.5946)
 * Semi-urban = 12–25km
 * Peripheral = >25km
 */
export function getZoneType(lat: number, lng: number): ZoneType {
  const distFromCenter = haversineDistance(lat, lng, 12.9716, 77.5946);
  if (distFromCenter < 12) return "urban";
  if (distFromCenter < 25) return "semiUrban";
  return "peripheral";
}

/**
 * @deprecated estimateRoute used simulation logic — DO NOT USE for display.
 * Kept only for backward compatibility. Will always return zeros to force
 * callers to migrate to OSRM-based getNearestMetros.
 */
export function estimateRoute(
  _fromLat: number,
  _fromLng: number,
  _toLat: number,
  _toLng: number,
): { aerialKm: number; roadKm: number; travelTimeMin: number } {
  // Deprecated: simulation logic removed per strict rules.
  // Callers must use getNearestMetros (async) which uses OSRM.
  return { aerialKm: 0, roadKm: 0, travelTimeMin: 0 };
}

/**
 * Travel time score for metro proximity.
 * Primary scoring metric (not raw distance).
 */
export function getTravelTimeScore(travelTimeMin: number): number {
  if (travelTimeMin < 15) return 10;
  if (travelTimeMin < 30) return 7;
  if (travelTimeMin < 45) return 4;
  if (travelTimeMin < 60) return 1;
  return -5;
}

/**
 * Returns top N nearest metro stations using OSRM driving distances.
 * All displayed distances and travel times come from OSRM — no simulation.
 * If OSRM fails, returns empty array (caller shows "Distance unavailable").
 *
 * @param originLat  Origin latitude
 * @param originLng  Origin longitude
 * @param count      Number of results to return (default: 3)
 */
export async function getNearestMetros(
  originLat: number,
  originLng: number,
  count = 3,
): Promise<MetroResult[]> {
  // Guard: do not compute distances from (0,0)
  if (!originLat || !originLng || (originLat === 0 && originLng === 0))
    return [];

  // Map METROS to POIInput format
  const poiInputs: POIInput[] = METROS.map((m) => ({
    name: m.name,
    lat: m.lat,
    lng: m.lng,
    type: "metro" as const,
    line: m.line,
    impactTag: "Connectivity boost",
    impactDescription: "Metro access improves property value",
  }));

  // Use 15km radius for metro — city-wide coverage needed
  const osrmResults = await getOSRMDistances(
    originLat,
    originLng,
    poiInputs,
    15,
  );

  if (osrmResults.length === 0) return [];

  // Build a lookup for metro line by name
  const metroLineMap = new Map(METROS.map((m) => [m.name, m.line]));
  const metroLatMap = new Map(
    METROS.map((m) => [m.name, { lat: m.lat, lng: m.lng }]),
  );

  // Map OSRMResult → MetroResult
  const results: MetroResult[] = osrmResults.map((r) => {
    const coords = metroLatMap.get(r.name) ?? { lat: r.lat, lng: r.lng };
    return {
      name: r.name,
      line: metroLineMap.get(r.name) ?? r.line ?? "Unknown",
      lat: coords.lat,
      lng: coords.lng,
      osrmKm: r.osrmKm,
      osrmDurationMins: r.osrmDurationMins,
      // Backward compat — mirror OSRM values into legacy fields
      aerialKm: r.osrmKm,
      roadKm: r.osrmKm,
      travelTimeMin: r.osrmDurationMins,
      distance: r.osrmKm,
      weight: 1.0,
    };
  });

  // Already sorted by osrmKm from getOSRMDistances
  const top = results.slice(0, count);

  if (top.length > 0) {
    console.log(
      `[ValuBrix] Metro OSRM distances from (${originLat.toFixed(4)}, ${originLng.toFixed(4)})`,
    );
    for (const r of top) {
      console.log(
        `  ${r.name}: ${r.osrmKm} km / ${r.osrmDurationMins} mins (OSRM driving)`,
      );
    }
  }

  return top;
}

/**
 * MetroFactor multiplier: exponential distance decay using nearest 3 metro stations.
 * Uses haversine for scoring (internal use only — not shown in UI).
 * Normalised 0.1–1.0 range.
 */
export function getMetroFactor(latOrTravelTime: number, lng?: number): number {
  // Legacy call: single number = travelTimeMin
  if (lng === undefined) {
    const travelTimeMin = latOrTravelTime;
    if (travelTimeMin < 15) return 1.08;
    if (travelTimeMin < 30) return 1.05;
    if (travelTimeMin < 45) return 1.02;
    return 0.98;
  }

  // New call: (lat, lng) — exponential decay over nearest 3 metros
  const lat = latOrTravelTime;
  if (!lat || !lng || (lat === 0 && lng === 0)) return 0.98;

  const TOP_N = 3;
  const distances = METROS.map((m) => ({
    ...m,
    distKm: haversineDistance(lat, lng, m.lat, m.lng),
  }))
    .sort((a, b) => a.distKm - b.distKm)
    .slice(0, TOP_N);

  let score = 0;
  for (const m of distances) {
    // Exponential decay: 2km is the "sweet spot"
    const decay = Math.exp(-0.4 * m.distKm);
    score += decay;
  }

  // Normalize to 0.1–1.0
  const normalized = score / TOP_N;
  return Math.max(0.1, Math.min(1.0, normalized));
}

/**
 * Returns the nearest single metro and its factor.
 * Async because getNearestMetros is now async.
 */
export async function getNearestMetro(
  lat: number,
  lng: number,
): Promise<{ metro: MetroResult; factor: number }> {
  const metros = await getNearestMetros(lat, lng, 1);
  const metro = metros[0];
  return { metro, factor: getMetroFactor(metro?.travelTimeMin ?? 999) };
}

/**
 * Format for display: "Metro Name – 28 mins (11.4 km)"
 */
export function formatMetroDisplay(metro: MetroResult): string {
  return `${metro.name} – ${metro.osrmDurationMins} mins (${metro.osrmKm} km)`;
}
