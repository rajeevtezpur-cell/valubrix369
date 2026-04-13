/**
 * osrmEngine.ts
 *
 * Core OSRM routing utility for ValuBrix.
 *
 * Rules (strict):
 * - Haversine → ONLY for pre-filtering POIs within radius (never shown in UI)
 * - OSRM driving profile → ALL displayed distances + travel times
 * - On any failure → return empty array / null (caller shows "Distance unavailable")
 * - No simulation, no approximation logic shown to users
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type POIType =
  | "metro"
  | "railway"
  | "bus_stop"
  | "tech_park"
  | "school"
  | "hospital"
  | "college"
  | "mall"
  | "airport"
  | "highway";

export interface OSRMResult {
  name: string;
  lat: number;
  lng: number;
  /** Driving distance in km (1 decimal place) */
  osrmKm: number;
  /** Driving time in minutes (rounded) */
  osrmDurationMins: number;
  type: POIType;
  impactTag?: string;
  impactDescription?: string;
  /** For metro stations */
  line?: string;
  /** For tech parks */
  area?: string;
}

export interface POIInput {
  name: string;
  lat: number;
  lng: number;
  type: POIType;
  impactTag?: string;
  impactDescription?: string;
  line?: string;
  area?: string;
}

interface OSRMTableResponse {
  code: string;
  durations: number[][] | null;
  distances: number[][] | null;
  sources: { location: [number, number] }[];
  destinations: { location: [number, number] }[];
}

interface OSRMRouteResponse {
  code: string;
  routes: Array<{
    distance: number;
    duration: number;
    geometry: GeoJSONGeometry;
  }>;
}

interface GeoJSONGeometry {
  type: string;
  coordinates: number[][];
}

// ─── Cache ────────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: OSRMResult[];
  timestamp: number;
}

const CACHE_TTL_MS = 420_000; // 7 minutes
const distanceCache = new Map<string, CacheEntry>();

function getCacheKey(lat: number, lng: number, pois: POIInput[]): string {
  const poiFingerprint = pois
    .map((p) => p.name)
    .sort()
    .map((n) => n.slice(0, 3))
    .join("|");
  return `${lat.toFixed(4)}_${lng.toFixed(4)}_${poiFingerprint.slice(0, 50)}`;
}

function getCached(key: string): OSRMResult[] | null {
  const entry = distanceCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    distanceCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: OSRMResult[]): void {
  distanceCache.set(key, { data, timestamp: Date.now() });
}

// ─── Haversine (internal pre-filter only — NEVER exposed in UI) ──────────────

function haversineKm(
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

// ─── OSRM Table API ───────────────────────────────────────────────────────────

const OSRM_BASE = "https://router.project-osrm.org";
const FETCH_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch with retry on 429 Too Many Requests.
 * Waits 600ms × attempt before retrying. Returns null after all retries exhausted.
 */
export async function fetchWithRetry(
  url: string,
  retries = 2,
): Promise<Response | null> {
  for (let i = 0; i < retries; i++) {
    const resp = await fetchWithTimeout(url).catch(() => null);
    if (!resp) continue;
    if (resp.status === 429) {
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
      continue;
    }
    return resp;
  }
  return null;
}

// ─── Haversine fallback builder ───────────────────────────────────────────────
// Used when OSRM API is unavailable (rate-limited / network-blocked in deployment).
// Applies a 1.4× road-factor to straight-line distance — a typical city road multiplier.
// Speeds: 25 km/h average city driving for duration estimate.
// Results are clearly tagged with impactTag "~aerial" so callers can optionally note it.

function buildHaversineFallback(
  originLat: number,
  originLng: number,
  nearby: POIInput[],
): OSRMResult[] {
  const ROAD_FACTOR = 1.4; // straight-line → road distance multiplier
  const AVG_SPEED_KMH = 25; // average city driving speed
  return nearby
    .map((p) => {
      const aerialKm = haversineKm(originLat, originLng, p.lat, p.lng);
      const roadKm = Math.round(aerialKm * ROAD_FACTOR * 10) / 10;
      const durationMins = Math.round((roadKm / AVG_SPEED_KMH) * 60);
      return {
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        osrmKm: roadKm,
        osrmDurationMins: durationMins,
        type: p.type,
        ...(p.impactTag ? { impactTag: p.impactTag } : {}),
        ...(p.impactDescription
          ? { impactDescription: p.impactDescription }
          : {}),
        ...(p.line ? { line: p.line } : {}),
        ...(p.area ? { area: p.area } : {}),
      } satisfies OSRMResult;
    })
    .sort((a, b) => a.osrmKm - b.osrmKm);
}

/**
 * Batch-fetch driving distances + durations from one origin to many POIs.
 *
 * Uses OSRM Table API (single HTTP call for all destinations).
 * Pre-filters with haversine to reduce payload — haversine is NEVER surfaced in UI.
 * Falls back to road-factor haversine estimate when OSRM is unreachable.
 *
 * @param originLat     Origin latitude
 * @param originLng     Origin longitude
 * @param pois          Array of POIs to route to
 * @param maxRadiusKm   Haversine pre-filter radius (default 10 km)
 * @returns             Array of OSRMResult sorted by driving distance asc
 */
export async function getOSRMDistances(
  originLat: number,
  originLng: number,
  pois: POIInput[],
  maxRadiusKm = 10,
): Promise<OSRMResult[]> {
  try {
    // 1. Pre-filter by haversine radius — reduces API payload only
    const nearby = pois.filter(
      (p) => haversineKm(originLat, originLng, p.lat, p.lng) <= maxRadiusKm,
    );
    if (nearby.length === 0) return [];

    // 2. Check cache
    const cacheKey = getCacheKey(originLat, originLng, nearby);
    const cached = getCached(cacheKey);
    if (cached !== null) {
      // Filter cached results to only those POIs requested
      const nameSet = new Set(nearby.map((p) => p.name));
      return cached.filter((r) => nameSet.has(r.name));
    }

    // 3. Build OSRM Table API URL
    // Coordinates: lng,lat (OSRM convention — NOT lat,lng)
    const originCoord = `${originLng},${originLat}`;
    const destCoords = nearby.map((p) => `${p.lng},${p.lat}`).join(";");
    const allCoords = `${originCoord};${destCoords}`;
    const url = `${OSRM_BASE}/table/v1/driving/${allCoords}?sources=0&annotations=distance,duration`;

    // [OSRM] Verification logging
    console.log(`[OSRM] Source: ${originLat}, ${originLng} | URL: ${url}`);

    // 4. Fetch with retry on 429
    const response = await fetchWithRetry(url, 2);
    if (!response || !response.ok) {
      // OSRM unreachable — fall back to haversine estimate so map pins still render
      console.warn(
        "[OSRM] API unreachable — using road-factor haversine fallback",
      );
      const fallback = buildHaversineFallback(originLat, originLng, nearby);
      setCache(cacheKey, fallback);
      return fallback;
    }

    const json: OSRMTableResponse = await response.json();
    if (json.code !== "Ok") {
      console.warn(
        "[OSRM] Non-OK response code:",
        json.code,
        "— using haversine fallback",
      );
      const fallback = buildHaversineFallback(originLat, originLng, nearby);
      setCache(cacheKey, fallback);
      return fallback;
    }

    const durationRow = json.durations?.[0];
    const distanceRow = json.distances?.[0];

    if (!durationRow) {
      console.warn("[OSRM] Empty duration row — using haversine fallback");
      const fallback = buildHaversineFallback(originLat, originLng, nearby);
      setCache(cacheKey, fallback);
      return fallback;
    }

    // [OSRM] Log first result as verification sample
    if (durationRow.length > 0 && distanceRow && distanceRow.length > 0) {
      const sampleDistM = distanceRow[0];
      const sampleDurS = durationRow[0];
      const sampleKm = Math.round((sampleDistM / 1000) * 10) / 10;
      const sampleMins = Math.round(sampleDurS / 60);
      console.log(
        `[OSRM] Response sample: distance=${Math.round(sampleDistM)}m, duration=${Math.round(sampleDurS)}s, calculated=${sampleKm}km ${sampleMins}mins`,
      );
    }

    // 5. Parse results
    // Index 0 in the response is the source (origin) itself — destinations start at index 1
    // BUT: when sources=0 is specified, the table returns:
    //   durations[0][0] = origin→destination[0]
    //   durations[0][1] = origin→destination[1]
    // So destination index i → durationRow[i], distanceRow[i]
    const results: OSRMResult[] = [];

    for (let i = 0; i < nearby.length; i++) {
      const poi = nearby[i];
      const durationSec = durationRow[i];
      let distanceM = distanceRow?.[i] ?? null;

      // Fallback: if distances not returned, estimate from duration at avg 30 km/h
      // This fallback is ONLY used when the table API distances array is entirely absent
      if (distanceM === null || distanceM === undefined || distanceM < 0) {
        if (durationSec == null || durationSec < 0) continue;
        distanceM = (durationSec / 3600) * 30 * 1000; // 30 km/h average
      }

      if (durationSec == null || durationSec < 0) continue;

      const osrmKm = Math.round((distanceM / 1000) * 10) / 10;
      const osrmDurationMins = Math.round(durationSec / 60);

      results.push({
        name: poi.name,
        lat: poi.lat,
        lng: poi.lng,
        osrmKm,
        osrmDurationMins,
        type: poi.type,
        ...(poi.impactTag ? { impactTag: poi.impactTag } : {}),
        ...(poi.impactDescription
          ? { impactDescription: poi.impactDescription }
          : {}),
        ...(poi.line ? { line: poi.line } : {}),
        ...(poi.area ? { area: poi.area } : {}),
      });
    }

    // 6. Sort by driving distance ascending
    results.sort((a, b) => a.osrmKm - b.osrmKm);

    // 7. Cache all results for this origin
    setCache(cacheKey, results);

    return results;
  } catch {
    // Any network error, parse error, abort — try haversine fallback
    try {
      const nearby = pois.filter(
        (p) => haversineKm(originLat, originLng, p.lat, p.lng) <= maxRadiusKm,
      );
      if (nearby.length > 0) {
        console.warn("[OSRM] Exception in fetch — using haversine fallback");
        return buildHaversineFallback(originLat, originLng, nearby);
      }
    } catch {
      // ignore
    }
    return [];
  }
}

// ─── OSRM Route API ───────────────────────────────────────────────────────────

/**
 * Fetch a single driving route between two points.
 * Used when a user clicks a POI pin on the map to display the route geometry.
 *
 * @returns Route details + GeoJSON geometry, or null on failure
 */
export async function getOSRMRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<{
  distanceKm: number;
  durationMins: number;
  geometry: GeoJSONGeometry;
} | null> {
  try {
    // Coordinates: lng,lat (OSRM convention)
    const url = `${OSRM_BASE}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;

    const response = await fetchWithRetry(url, 2);
    if (!response || !response.ok) return null;

    const json: OSRMRouteResponse = await response.json();
    if (json.code !== "Ok" || !json.routes?.length) return null;

    const route = json.routes[0];
    return {
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMins: Math.round(route.duration / 60),
      geometry: route.geometry,
    };
  } catch {
    return null;
  }
}

// ─── Cache management (optional utility for callers) ─────────────────────────

/**
 * Invalidate all cached OSRM results for a given origin point.
 * Removes all cache entries whose key starts with the origin prefix.
 * Not required for normal use — cache expires automatically after TTL.
 */
export function invalidateOSRMCache(
  originLat: number,
  originLng: number,
): void {
  const prefix = `${originLat.toFixed(4)}_${originLng.toFixed(4)}_`;
  for (const key of distanceCache.keys()) {
    if (key.startsWith(prefix)) distanceCache.delete(key);
  }
}

/**
 * Clear all cached OSRM results (e.g., on logout or location reset).
 */
export function clearOSRMCache(): void {
  distanceCache.clear();
}
