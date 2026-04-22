/**
 * reverseGeocode.ts — Never returns "Unknown".
 * Chain: Nominatim primary → address parts fallback → nearest locality → "Bangalore"
 * Results cached in localStorage keyed by lat/lng rounded to 3 decimals (24h TTL).
 */

import { ALL_LOCALITY_COORDS } from "../data/localityCoords";

const CACHE_KEY_PREFIX = "vb_rgc_";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  result: string;
  ts: number;
}

function cacheKey(lat: number, lng: number): string {
  return `${CACHE_KEY_PREFIX}${lat.toFixed(3)}_${lng.toFixed(3)}`;
}

function readCache(lat: number, lng: number): string | null {
  try {
    const raw = localStorage.getItem(cacheKey(lat, lng));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(lat, lng));
      return null;
    }
    return entry.result;
  } catch {
    return null;
  }
}

function writeCache(lat: number, lng: number, result: string): void {
  try {
    const entry: CacheEntry = { result, ts: Date.now() };
    localStorage.setItem(cacheKey(lat, lng), JSON.stringify(entry));
  } catch {
    /* ignore quota errors */
  }
}

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
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Find the nearest named locality from localityCoords by Haversine distance. */
function nearestLocality(lat: number, lng: number): string {
  let best = "Bangalore";
  let bestDist = Number.POSITIVE_INFINITY;
  for (const [name, coords] of Object.entries(ALL_LOCALITY_COORDS)) {
    const d = haversineKm(lat, lng, coords.lat, coords.lng);
    if (d < bestDist) {
      bestDist = d;
      best = name
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }
  return `Near ${best}`;
}

/**
 * Reverse geocode a lat/lng to a human-readable location name.
 * NEVER returns "Unknown" or empty string.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string> {
  // Check cache first
  const cached = readCache(lat, lng);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      {
        headers: { "Accept-Language": "en" },
      },
    );

    if (res.ok) {
      const data = await res.json();
      const addr = data?.address ?? {};

      // PRIMARY: Most specific suburb/neighbourhood/road
      const primary =
        addr.suburb ||
        addr.locality ||
        addr.neighbourhood ||
        addr.quarter ||
        addr.road;

      if (primary) {
        const city =
          addr.city || addr.town || addr.village || addr.county || "";
        const result = city ? `${primary}, ${city}` : primary;
        writeCache(lat, lng, result);
        return result;
      }

      // FALLBACK CHAIN 1: village/town/city level
      const level2 = addr.village || addr.town || addr.city;
      if (level2) {
        writeCache(lat, lng, level2);
        return level2;
      }

      // FALLBACK CHAIN 2: county/state_district
      const level3 = addr.county || addr.state_district;
      if (level3) {
        writeCache(lat, lng, level3);
        return level3;
      }

      // FALLBACK CHAIN 3: construct composite
      const suburb = addr.suburb || addr.neighbourhood;
      const cityFallback = addr.city || addr.town || "Bangalore";
      if (suburb) {
        const result = `${suburb}, ${cityFallback}`;
        writeCache(lat, lng, result);
        return result;
      }

      // FALLBACK CHAIN 4: display_name first 2 parts
      if (data?.display_name) {
        const parts = data.display_name.split(",").map((p: string) => p.trim());
        if (parts.length >= 2) {
          const result = `${parts[0]}, ${parts[1]}`;
          writeCache(lat, lng, result);
          return result;
        }
        if (parts[0]) {
          writeCache(lat, lng, parts[0]);
          return parts[0];
        }
      }
    }
  } catch {
    // Fall through to locality fallback
  }

  // FINAL FALLBACK: nearest locality from local database
  const fallback = nearestLocality(lat, lng);
  writeCache(lat, lng, fallback);
  return fallback;
}
