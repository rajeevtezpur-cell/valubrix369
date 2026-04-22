/**
 * roadDistanceEngine.ts — SINGLE SOURCE OF TRUTH for all distance calculations.
 *
 * STRICT RULES:
 * - ALL displayed distances must come from OSRM (driving profile)
 * - Haversine is ONLY allowed for pre-filtering POIs within radius — NEVER shown in UI
 * - On OSRM failure: fallback = haversine * 1.3 road factor (tagged as 'fallback')
 * - Never return 0km as a valid distance
 * - Always validate coordinates before calling OSRM
 *
 * OSRM URL convention: lng,lat order (NOT lat,lng)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DistanceResult {
  distance_km: number;
  duration_min: number;
  source: "osrm" | "fallback";
}

export type AmenityType =
  | "metro"
  | "railway"
  | "bus_stop"
  | "hospital"
  | "school"
  | "college"
  | "tech_park"
  | "mall"
  | "airport"
  | "highway"
  | "police"
  | "petrol_pump"
  | "pharmacy"
  | "supermarket"
  | "restaurant"
  | "bank"
  | "atm";

export interface AmenityInput {
  name: string;
  type: AmenityType;
  lat: number;
  lng: number;
  /** Optional metadata fields */
  impactTag?: string;
  impactDescription?: string;
  line?: string;
  area?: string;
}

export interface AmenityWithDistance extends AmenityInput {
  distanceKm: number;
  durationMin: number;
  source: "osrm" | "fallback";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OSRM_BASE = "https://router.project-osrm.org";
const FETCH_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const ROAD_FACTOR = 1.3; // haversine → estimated road distance
const AVG_SPEED_KMH = 25; // average city driving speed

// ─── Memory Cache ─────────────────────────────────────────────────────────────

interface CacheEntry {
  result: DistanceResult;
  timestamp: number;
}

const distanceCache = new Map<string, CacheEntry>();

function makeCacheKey(
  oLat: number,
  oLng: number,
  dLat: number,
  dLng: number,
): string {
  return `${oLat.toFixed(5)}_${oLng.toFixed(5)}_${dLat.toFixed(5)}_${dLng.toFixed(5)}`;
}

function getFromCache(key: string): DistanceResult | null {
  const entry = distanceCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    distanceCache.delete(key);
    return null;
  }
  return entry.result;
}

export function cacheDistance(key: string, result: DistanceResult): void {
  distanceCache.set(key, { result, timestamp: Date.now() });
}

// ─── Coordinate validation ────────────────────────────────────────────────────

function isValidCoord(lat: number, lng: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

// ─── Haversine (exported — allowed for pre-filtering only) ───────────────────

export function haversineKm(
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

// ─── Fetch with timeout ───────────────────────────────────────────────────────

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(
  url: string,
  retries = 2,
): Promise<Response | null> {
  for (let i = 0; i < retries; i++) {
    const res = await fetchWithTimeout(url);
    if (!res) continue;
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
      continue;
    }
    return res;
  }
  return null;
}

// ─── Core: Single point-to-point OSRM call ────────────────────────────────────

/**
 * Get real driving distance and travel time between two points.
 * Uses OSRM driving profile. Falls back to road-factor haversine on failure.
 * Never returns 0km as a valid distance (guards against OSRM road-snap bug).
 *
 * @param origin       { lat, lng } of starting point
 * @param destination  { lat, lng } of destination
 * @returns DistanceResult or null if coordinates invalid
 */
export async function getRoadDistance(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<DistanceResult | null> {
  if (
    !isValidCoord(origin.lat, origin.lng) ||
    !isValidCoord(destination.lat, destination.lng)
  ) {
    console.warn("[roadDistanceEngine] Invalid coordinates", {
      origin,
      destination,
    });
    return null;
  }

  console.log(
    `[roadDistanceEngine] origin: ${origin.lat},${origin.lng} | dest: ${destination.lat},${destination.lng}`,
  );

  const key = makeCacheKey(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng,
  );
  const cached = getFromCache(key);
  if (cached) return cached;

  // OSRM expects: lng,lat (NOT lat,lng)
  const url = `${OSRM_BASE}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`;

  try {
    const res = await fetchWithRetry(url, 2);

    if (res?.ok) {
      const json = await res.json();
      if (json.code === "Ok" && json.routes?.length) {
        const route = json.routes[0];
        const distMeters: number = route.distance;
        const durSecs: number = route.duration;
        const distKm = Number.parseFloat((distMeters / 1000).toFixed(1));
        const durMin = Math.round(durSecs / 60);

        // Guard: OSRM sometimes snaps origin+dest to same road node → 0km
        const aerial = haversineKm(
          origin.lat,
          origin.lng,
          destination.lat,
          destination.lng,
        );
        if (distKm === 0 && aerial > 0.1) {
          console.warn(
            `[roadDistanceEngine] OSRM returned 0km but aerial=${aerial.toFixed(2)}km — using fallback`,
          );
          const fallbackKm = Number.parseFloat(
            (aerial * ROAD_FACTOR).toFixed(1),
          );
          const fallbackMin = Math.round((fallbackKm / AVG_SPEED_KMH) * 60);
          const fallback: DistanceResult = {
            distance_km: fallbackKm,
            duration_min: fallbackMin,
            source: "fallback",
          };
          cacheDistance(key, fallback);
          return fallback;
        }

        const result: DistanceResult = {
          distance_km: distKm,
          duration_min: durMin,
          source: "osrm",
        };
        console.log(
          `[roadDistanceEngine] OSRM result: ${distKm}km ${durMin}mins`,
        );
        cacheDistance(key, result);
        return result;
      }
    }
  } catch {
    // fall through to fallback
  }

  // Fallback: road-factor haversine
  const aerial = haversineKm(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng,
  );
  const fallbackKm = Number.parseFloat((aerial * ROAD_FACTOR).toFixed(1));
  const fallbackMin = Math.round((fallbackKm / AVG_SPEED_KMH) * 60);
  console.log(
    `[roadDistanceEngine] OSRM failed, using fallback: ${fallbackKm}km`,
  );
  const fallback: DistanceResult = {
    distance_km: fallbackKm,
    duration_min: fallbackMin,
    source: "fallback",
  };
  cacheDistance(key, fallback);
  return fallback;
}

/**
 * Returns travel time in minutes only. Calls getRoadDistance internally.
 */
export async function getTravelTime(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<number | null> {
  const result = await getRoadDistance(origin, destination);
  return result ? result.duration_min : null;
}

// ─── Batch: OSRM Table API for multiple amenities ────────────────────────────

/**
 * Call OSRM for an array of destinations in sequential batches of `batchSize`.
 * Each batch is sent sequentially (not in parallel) with a 100ms delay between
 * batches to avoid rate-limiting on the public OSRM server.
 *
 * @param origin       Source location
 * @param destinations All destination amenities (will be chunked)
 * @param batchSize    Max destinations per OSRM table call (default 10)
 * @returns            All results merged and sorted by distance ascending
 */
export async function batchOSRMCalls(
  origin: { lat: number; lng: number },
  destinations: AmenityInput[],
  batchSize = 10,
): Promise<AmenityWithDistance[]> {
  if (!isValidCoord(origin.lat, origin.lng)) return [];
  if (!destinations.length) return [];

  const results: AmenityWithDistance[] = [];

  for (let i = 0; i < destinations.length; i += batchSize) {
    const batch = destinations.slice(i, i + batchSize);
    const batchResults = await _batchOSRMTable(origin, batch);
    results.push(...batchResults);

    // 100ms courtesy delay between batches to avoid rate-limiting
    if (i + batchSize < destinations.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  // Sort by distanceKm ascending
  return results.sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Calculate distances from one origin to many amenities.
 * Uses OSRM table API in sequential batches of 10 (via batchOSRMCalls).
 * Pre-filters by haversine radius before calling OSRM.
 * Falls back per-amenity on OSRM failure.
 * Returns all results sorted by distance ascending. Caller decides how many to show.
 *
 * @param origin        Source location
 * @param amenities     List of amenity POIs
 * @param maxRadiusKm   Haversine pre-filter radius (NOT shown in UI)
 */
export async function getAmenitiesWithDistance(
  origin: { lat: number; lng: number },
  amenities: AmenityInput[],
  maxRadiusKm: number,
): Promise<AmenityWithDistance[]> {
  if (!isValidCoord(origin.lat, origin.lng)) return [];
  if (!amenities.length) return [];

  // Step 1: Pre-filter by haversine radius (never shown in UI)
  const nearby = amenities.filter(
    (a) =>
      isValidCoord(a.lat, a.lng) &&
      haversineKm(origin.lat, origin.lng, a.lat, a.lng) <= maxRadiusKm,
  );
  if (!nearby.length) return [];

  // Step 2: Batch in chunks of 10 sequentially with 100ms gap to avoid rate limiting
  return batchOSRMCalls(origin, nearby, 10);
}

async function _batchOSRMTable(
  origin: { lat: number; lng: number },
  amenities: AmenityInput[],
): Promise<AmenityWithDistance[]> {
  if (!amenities.length) return [];

  // Build OSRM Table API URL: origin is index 0, destinations are 1..N
  // OSRM expects: lng,lat
  const originCoord = `${origin.lng},${origin.lat}`;
  const destCoords = amenities.map((a) => `${a.lng},${a.lat}`).join(";");
  const allCoords = `${originCoord};${destCoords}`;
  const url = `${OSRM_BASE}/table/v1/driving/${allCoords}?sources=0&annotations=distance,duration`;

  console.log(
    `[roadDistanceEngine] Batch table: ${amenities.length} destinations from ${origin.lat},${origin.lng}`,
  );

  try {
    const res = await fetchWithRetry(url, 2);

    if (res?.ok) {
      const json = await res.json();
      if (json.code === "Ok" && json.durations?.[0]) {
        const durRow: number[] = json.durations[0];
        const distRow: number[] | null = json.distances?.[0] ?? null;

        return amenities
          .map((a, i) => {
            const durSec = durRow[i];
            const distM = distRow?.[i] ?? null;

            if (durSec == null || durSec < 0) {
              return _fallbackAmenity(origin, a);
            }

            const distKm =
              distM != null && distM >= 0
                ? Number.parseFloat((distM / 1000).toFixed(1))
                : Number.parseFloat(((durSec / 3600) * 30).toFixed(1)); // 30km/h estimate if no distance

            const durMin = Math.round(durSec / 60);

            // Guard: OSRM road-snap 0km bug
            const aerial = haversineKm(origin.lat, origin.lng, a.lat, a.lng);
            if (distKm === 0 && aerial > 0.1) {
              return _fallbackAmenity(origin, a);
            }

            return {
              ...a,
              distanceKm: distKm,
              durationMin: durMin,
              source: "osrm" as const,
            };
          })
          .filter((r): r is AmenityWithDistance => r !== null);
      }
    }
  } catch {
    // fall through to per-amenity fallback
  }

  // OSRM table failed — fallback each individually
  console.warn(
    "[roadDistanceEngine] OSRM table failed, using per-amenity fallback",
  );
  return amenities.map((a) => _fallbackAmenity(origin, a));
}

function _fallbackAmenity(
  origin: { lat: number; lng: number },
  a: AmenityInput,
): AmenityWithDistance {
  const aerial = haversineKm(origin.lat, origin.lng, a.lat, a.lng);
  const fallbackKm = Number.parseFloat((aerial * ROAD_FACTOR).toFixed(1));
  const fallbackMin = Math.round((fallbackKm / AVG_SPEED_KMH) * 60);
  return {
    ...a,
    distanceKm: fallbackKm,
    durationMin: fallbackMin,
    source: "fallback" as const,
  };
}

// ─── Display utility ──────────────────────────────────────────────────────────

/**
 * Format distance for display: "2.3 km • 7 mins"
 */
export function formatDistance(km: number, mins: number): string {
  return `${km.toFixed(1)} km • ${Math.round(mins)} mins`;
}
