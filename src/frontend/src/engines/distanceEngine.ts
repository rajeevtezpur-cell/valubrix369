/**
 * distanceEngine.ts — Single Source of Truth for Distance Calculation
 *
 * MANDATORY ARCHITECTURE:
 * - ALL modules must use this file for distance display
 * - Haversine is BANNED for UI display (only allowed as pre-filter inside osrmEngine.ts)
 * - OSRM driving profile ONLY for all displayed distances + travel times
 * - On failure → return null (caller shows "Distance unavailable")
 *
 * OSRM URL convention: lng,lat (NOT lat,lng)
 */

const OSRM_BASE = "https://router.project-osrm.org";
const FETCH_TIMEOUT_MS = 10_000;

interface DistanceResult {
  distance_km: number;
  duration_min: number;
}

// ─── Per-pair cache (TTL: 7 minutes) ─────────────────────────────────────────

interface CacheEntry {
  result: DistanceResult;
  timestamp: number;
}

const CACHE_TTL_MS = 420_000; // 7 min
const pairCache = new Map<string, CacheEntry>();

function pairKey(
  oLat: number,
  oLng: number,
  dLat: number,
  dLng: number,
): string {
  return `${oLat.toFixed(4)},${oLng.toFixed(4)}->${dLat.toFixed(4)},${dLng.toFixed(4)}`;
}

function getCachedPair(key: string): DistanceResult | null {
  const e = pairCache.get(key);
  if (!e) return null;
  if (Date.now() - e.timestamp > CACHE_TTL_MS) {
    pairCache.delete(key);
    return null;
  }
  return e.result;
}

function setCachedPair(key: string, result: DistanceResult): void {
  pairCache.set(key, { result, timestamp: Date.now() });
}

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Get real driving distance and travel time between two points using OSRM.
 *
 * @param origin      { lat, lng } of the starting point
 * @param destination { lat, lng } of the destination
 * @returns { distance_km, duration_min } or null on failure
 *
 * IMPORTANT: OSRM expects coordinates as lng,lat in the URL — this function
 * handles that conversion internally. Callers always pass { lat, lng } objects.
 */
export async function getDistanceAndTime(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<DistanceResult | null> {
  // Log for verification (matches requirement in STEP 3)
  console.log(
    `[distanceEngine] origin: ${origin.lat} ${origin.lng} | dest: ${destination.lat} ${destination.lng}`,
  );

  // Validate inputs — guard against swapped lat/lng
  if (
    Math.abs(origin.lat) > 90 ||
    Math.abs(destination.lat) > 90 ||
    Math.abs(origin.lng) > 180 ||
    Math.abs(destination.lng) > 180
  ) {
    console.error("[distanceEngine] Invalid coordinates detected", {
      origin,
      destination,
    });
    return null;
  }

  const key = pairKey(origin.lat, origin.lng, destination.lat, destination.lng);
  const cached = getCachedPair(key);
  if (cached) return cached;

  try {
    // OSRM route URL: /route/v1/driving/{lng1},{lat1};{lng2},{lat2}
    // OSRM uses lng,lat order (NOT lat,lng)
    const url = `${OSRM_BASE}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response | null = null;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch {
      clearTimeout(timer);
      console.warn("[distanceEngine] Network error — returning null");
      return null;
    }
    clearTimeout(timer);

    if (!response || response.status === 429) {
      // Rate limited — wait 600ms and retry once
      await new Promise((r) => setTimeout(r, 600));
      try {
        const controller2 = new AbortController();
        const timer2 = setTimeout(() => controller2.abort(), FETCH_TIMEOUT_MS);
        response = await fetch(url, { signal: controller2.signal });
        clearTimeout(timer2);
      } catch {
        console.warn("[distanceEngine] Retry failed — returning null");
        return null;
      }
    }

    if (!response || !response.ok) {
      console.warn(
        "[distanceEngine] OSRM returned non-OK status:",
        response?.status,
      );
      return null;
    }

    const json = await response.json();
    if (json.code !== "Ok" || !json.routes?.length) {
      console.warn("[distanceEngine] OSRM code not Ok:", json.code);
      return null;
    }

    const route = json.routes[0];
    const distanceMeters: number = route.distance;
    const durationSec: number = route.duration;

    const result: DistanceResult = {
      distance_km: Number.parseFloat((distanceMeters / 1000).toFixed(1)),
      duration_min: Math.round(durationSec / 60),
    };

    console.log(
      `[distanceEngine] Result: ${result.distance_km} km, ${result.duration_min} mins`,
    );

    setCachedPair(key, result);
    return result;
  } catch (err) {
    console.warn("[distanceEngine] Unexpected error:", err);
    return null;
  }
}

/**
 * Clear all cached distance pairs (e.g., on location reset).
 */
export function clearDistanceCache(): void {
  pairCache.clear();
}
