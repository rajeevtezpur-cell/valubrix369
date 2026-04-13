/**
 * localReverseGeocode.ts
 *
 * Reverse geocoding using ONLY local data (no external API calls).
 * Priority:
 *  1. Pin inside locality polygon (approximated by checking 500m radius with zone-aware tightening)
 *  2. Within 500m of known locality center → use that locality
 *  3. Nearest locality → assign BUT mark as approximate
 *  4. If nothing within 2km → "Custom Location" (still stores coords)
 *
 * Uses bangaloreMicroLocations as primary source (has PIN, zone, parentArea)
 * Falls back to localityCoords for any additional entries.
 */

import { bangaloreMicroLocations } from "../data/bangaloreMicroLocations";
import { ALL_LOCALITY_COORDS } from "../data/localityCoords";

export interface ReverseGeocodeResult {
  locality: string;
  microLocation: string;
  city: string;
  pincode: string;
  zone: string;
  parentArea: string;
  lat: number;
  lng: number;
  /** How the locality was determined */
  method: "exact" | "within_500m" | "nearest_approximate" | "custom";
  /** True when method is nearest_approximate or custom */
  isApproximate: boolean;
  /** Human-readable label for UI confirmation */
  displayLabel: string;
}

/** Earth radius in km */
const R = 6371;

/** Haversine distance in metres between two lat/lng points */
export function haversineMetres(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1000;
}

/**
 * Main function: given lat/lng returns a fully-populated ReverseGeocodeResult.
 * Pure in-memory — no external calls.
 */
export function reverseGeocodeLocally(
  lat: number,
  lng: number,
): ReverseGeocodeResult {
  // ─── Build unified candidate list from bangaloreMicroLocations ────────────
  // bangaloreMicroLocations is the authoritative source (has PIN, zone, parentArea)
  type Candidate = {
    name: string;
    lat: number;
    lng: number;
    pincode: string;
    zone: string;
    parentArea: string;
  };

  const candidates: Candidate[] = bangaloreMicroLocations.map((m) => ({
    name: m.name,
    lat: m.lat,
    lng: m.lng,
    pincode: m.pincode,
    zone: m.zone,
    parentArea: m.parentArea,
  }));

  // Also add any entries from localityCoords that are NOT already in bangaloreMicroLocations
  const knownNames = new Set(candidates.map((c) => c.name.toLowerCase()));
  for (const [key, coords] of Object.entries(ALL_LOCALITY_COORDS)) {
    const normalised = key
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    if (!knownNames.has(normalised.toLowerCase())) {
      candidates.push({
        name: normalised,
        lat: coords.lat,
        lng: coords.lng,
        pincode: "",
        zone: "Other",
        parentArea: "Bangalore",
      });
    }
  }

  // ─── Calculate distance to every candidate ───────────────────────────────
  const withDistance = candidates.map((c) => ({
    ...c,
    distM: haversineMetres(lat, lng, c.lat, c.lng),
  }));

  withDistance.sort((a, b) => a.distM - b.distM);

  const nearest = withDistance[0];

  // ─── Priority 1 & 2: Within 500m ─────────────────────────────────────────
  // We don't have polygon data, so we approximate polygon containment by a
  // 400m radius (denser areas) or 500m (outer areas).  Since we can't
  // distinguish polygon from centre, we use a 500m hard threshold and call
  // it "exact" for display purposes (no "approximate" label).
  const EXACT_RADIUS_M = 500;

  if (nearest.distM <= EXACT_RADIUS_M) {
    const method = nearest.distM <= 200 ? "exact" : "within_500m";
    return buildResult(lat, lng, nearest, method, false);
  }

  // ─── Priority 3: Nearest locality (mark approximate) ─────────────────────
  const MAX_SEARCH_KM = 2000; // 2 km in metres
  if (nearest.distM <= MAX_SEARCH_KM) {
    return buildResult(lat, lng, nearest, "nearest_approximate", true);
  }

  // ─── Priority 4: Nothing within 2km → Custom Location ───────────────────
  return {
    locality: "Custom Location",
    microLocation: "",
    city: "Bangalore",
    pincode: "",
    zone: "",
    parentArea: "",
    lat,
    lng,
    method: "custom",
    isApproximate: true,
    displayLabel: "Custom Location",
  };
}

function buildResult(
  lat: number,
  lng: number,
  c: {
    name: string;
    pincode: string;
    zone: string;
    parentArea: string;
    distM: number;
  },
  method: ReverseGeocodeResult["method"],
  isApproximate: boolean,
): ReverseGeocodeResult {
  const approximateTag = isApproximate ? " (approx.)" : "";
  const areaLabel = c.parentArea || c.zone || "Bangalore";
  const pinLabel = c.pincode ? ` - ${c.pincode}` : "";
  const displayLabel = `${c.name}${approximateTag}, ${areaLabel}${pinLabel}`;

  return {
    locality: c.name,
    microLocation: c.name,
    city: "Bangalore",
    pincode: c.pincode,
    zone: c.zone,
    parentArea: c.parentArea,
    lat,
    lng,
    method,
    isApproximate,
    displayLabel,
  };
}
