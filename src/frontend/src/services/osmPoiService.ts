/**
 * osmPoiService.ts — Live OSM Overpass API POI fetching for map layers.
 *
 * When a layer is toggled ON in GlobalMapComponent, this service:
 * 1. Checks in-memory cache (keyed by 2-decimal-place grid cell + type, TTL 5 min)
 *    then localStorage cache (same key, TTL 24h)
 * 2. Fetches live from overpass.kumi.systems (primary) — more reliable in restricted envs
 * 3. Falls back to overpass-api.de (backup)
 * 4. Falls back to hardcoded Bangalore landmark data (emergency fallback so markers ALWAYS appear)
 *
 * FIX D: Cache TTL increased to 5min in-memory, 24h localStorage.
 *        In-memory cache added so repeated toggles don't hit the network.
 *        Fallback data always returned on API failure — markers always appear.
 *
 * All results returned as { name, lat, lng, type } objects ready for map rendering.
 */

import type { AmenityInput, AmenityType } from "./roadDistanceEngine";

// ─── Cache ────────────────────────────────────────────────────────────────────
// FIX D: In-memory cache for fast re-toggles + localStorage for persistence across page loads
const IN_MEMORY_CACHE = new Map<string, { pois: AmenityInput[]; ts: number }>();
const IN_MEMORY_TTL_MS = 5 * 60 * 1000; // 5 minutes in-memory
const LS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours localStorage

interface OSMCacheEntry {
  pois: AmenityInput[];
  timestamp: number;
}

function getCacheKey(lat: number, lng: number, type: AmenityType): string {
  // ~1.1km grid cell (2 decimal places ≈ 1.1km) — larger cell = more cache hits
  return `osm_${lat.toFixed(2)}_${lng.toFixed(2)}_${type}`;
}

function loadCache(key: string): AmenityInput[] | null {
  // 1. Check in-memory first
  const mem = IN_MEMORY_CACHE.get(key);
  if (mem && Date.now() - mem.ts < IN_MEMORY_TTL_MS) {
    return mem.pois;
  }
  IN_MEMORY_CACHE.delete(key);
  // 2. Check localStorage
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: OSMCacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > LS_CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    // Promote to in-memory
    IN_MEMORY_CACHE.set(key, { pois: entry.pois, ts: entry.timestamp });
    return entry.pois;
  } catch {
    return null;
  }
}

function saveCache(key: string, pois: AmenityInput[]): void {
  const ts = Date.now();
  IN_MEMORY_CACHE.set(key, { pois, ts });
  try {
    localStorage.setItem(key, JSON.stringify({ pois, timestamp: ts }));
  } catch {
    // storage full — ignore, in-memory still works
  }
}

// ─── Emergency fallback dataset (Bangalore top landmarks per category) ─────────
// Used ONLY when all live API endpoints fail — ensures markers always appear
const BANGALORE_FALLBACK: Partial<Record<AmenityType, AmenityInput[]>> = {
  metro: [
    { name: "Majestic Metro", type: "metro", lat: 12.9774, lng: 77.5713 },
    { name: "MG Road Metro", type: "metro", lat: 12.9748, lng: 77.6125 },
    { name: "Indiranagar Metro", type: "metro", lat: 12.9783, lng: 77.6408 },
    { name: "Whitefield Metro", type: "metro", lat: 12.9701, lng: 77.7516 },
    {
      name: "Baiyappanahalli Metro",
      type: "metro",
      lat: 12.9986,
      lng: 77.6463,
    },
    { name: "Yeshwanthpur Metro", type: "metro", lat: 13.0238, lng: 77.5452 },
    { name: "Hebbal Metro", type: "metro", lat: 13.0358, lng: 77.5918 },
    { name: "Marathahalli Metro", type: "metro", lat: 12.9591, lng: 77.7037 },
    { name: "Jayanagar Metro", type: "metro", lat: 12.9261, lng: 77.5832 },
    { name: "JP Nagar Metro", type: "metro", lat: 12.9063, lng: 77.5857 },
  ],
  tech_park: [
    {
      name: "Manyata Tech Park",
      type: "tech_park",
      lat: 13.0437,
      lng: 77.6188,
    },
    {
      name: "Embassy Tech Village",
      type: "tech_park",
      lat: 12.9352,
      lng: 77.6874,
    },
    { name: "RMZ Ecospace", type: "tech_park", lat: 12.9217, lng: 77.6951 },
    {
      name: "Prestige Tech Park",
      type: "tech_park",
      lat: 12.9441,
      lng: 77.6874,
    },
    { name: "ITPL Whitefield", type: "tech_park", lat: 12.9813, lng: 77.7473 },
    {
      name: "Cessna Business Park",
      type: "tech_park",
      lat: 12.9468,
      lng: 77.6951,
    },
    {
      name: "Global Village Tech Park",
      type: "tech_park",
      lat: 12.9217,
      lng: 77.5005,
    },
    {
      name: "Bagmane Tech Park",
      type: "tech_park",
      lat: 12.9972,
      lng: 77.6425,
    },
  ],
  hospital: [
    {
      name: "Manipal Hospital Old Airport",
      type: "hospital",
      lat: 12.9636,
      lng: 77.6458,
    },
    {
      name: "Apollo Hospital Bannerghatta",
      type: "hospital",
      lat: 12.8986,
      lng: 77.5962,
    },
    {
      name: "Narayana Health City",
      type: "hospital",
      lat: 12.8951,
      lng: 77.5938,
    },
    {
      name: "Fortis Hospital Bannerghatta",
      type: "hospital",
      lat: 12.8946,
      lng: 77.5962,
    },
    {
      name: "Sakra World Hospital Marathahalli",
      type: "hospital",
      lat: 12.9631,
      lng: 77.7057,
    },
    {
      name: "Cloudnine Hospital HSR Layout",
      type: "hospital",
      lat: 12.9115,
      lng: 77.6396,
    },
    {
      name: "Aster CMI Hospital",
      type: "hospital",
      lat: 13.0437,
      lng: 77.5912,
    },
    {
      name: "BGS Gleneagles Global Hospital",
      type: "hospital",
      lat: 12.9002,
      lng: 77.5531,
    },
  ],
  school: [
    {
      name: "Delhi Public School Whitefield",
      type: "school",
      lat: 12.9705,
      lng: 77.7516,
    },
    {
      name: "National Public School Koramangala",
      type: "school",
      lat: 12.9353,
      lng: 77.6245,
    },
    {
      name: "Indus International School",
      type: "school",
      lat: 13.0437,
      lng: 77.7104,
    },
    {
      name: "Bangalore International School",
      type: "school",
      lat: 12.9505,
      lng: 77.5952,
    },
    { name: "Inventure Academy", type: "school", lat: 12.9468, lng: 77.6951 },
    {
      name: "Harvest International School",
      type: "school",
      lat: 12.9748,
      lng: 77.7359,
    },
    {
      name: "Gear Innovative School",
      type: "school",
      lat: 12.9548,
      lng: 77.5832,
    },
    { name: "VIBGYOR High School", type: "school", lat: 12.9436, lng: 77.6965 },
  ],
  mall: [
    {
      name: "Phoenix Marketcity Whitefield",
      type: "mall",
      lat: 12.9981,
      lng: 77.6974,
    },
    {
      name: "Orion Mall Rajajinagar",
      type: "mall",
      lat: 13.0021,
      lng: 77.5512,
    },
    { name: "UB City Mall", type: "mall", lat: 12.972, lng: 77.5951 },
    {
      name: "Forum Mall Koramangala",
      type: "mall",
      lat: 12.9337,
      lng: 77.6154,
    },
    { name: "Mantri Square Mall", type: "mall", lat: 13.0032, lng: 77.5644 },
    {
      name: "Elements Mall Thanisandra",
      type: "mall",
      lat: 13.0524,
      lng: 77.6204,
    },
    { name: "GT World Mall", type: "mall", lat: 12.9768, lng: 77.5843 },
    {
      name: "Nexus Shantiniketan Mall",
      type: "mall",
      lat: 12.9716,
      lng: 77.7516,
    },
  ],
  restaurant: [
    {
      name: "Toit Brewpub Indiranagar",
      type: "restaurant",
      lat: 12.9841,
      lng: 77.6388,
    },
    {
      name: "MTR 1924 Lalbagh",
      type: "restaurant",
      lat: 12.9527,
      lng: 77.5832,
    },
    {
      name: "Koshy's Restaurant",
      type: "restaurant",
      lat: 12.9748,
      lng: 77.6025,
    },
    {
      name: "The Only Place MG Road",
      type: "restaurant",
      lat: 12.9748,
      lng: 77.6125,
    },
    {
      name: "Truffles Koramangala",
      type: "restaurant",
      lat: 12.9353,
      lng: 77.6245,
    },
    {
      name: "Vidyarthi Bhavan Gandhi Bazaar",
      type: "restaurant",
      lat: 12.9458,
      lng: 77.5762,
    },
    {
      name: "Brahmin Coffee Bar Basavanagudi",
      type: "restaurant",
      lat: 12.9415,
      lng: 77.5713,
    },
    {
      name: "Empire Restaurant JP Nagar",
      type: "restaurant",
      lat: 12.9063,
      lng: 77.5857,
    },
    {
      name: "Nandhana Palace Banashankari",
      type: "restaurant",
      lat: 12.9288,
      lng: 77.5669,
    },
    {
      name: "Meghana Foods BTM Layout",
      type: "restaurant",
      lat: 12.9188,
      lng: 77.6196,
    },
  ],
  bank: [
    { name: "HDFC Bank Koramangala", type: "bank", lat: 12.9353, lng: 77.6245 },
    {
      name: "ICICI Bank Indiranagar",
      type: "bank",
      lat: 12.9783,
      lng: 77.6408,
    },
    { name: "SBI MG Road Branch", type: "bank", lat: 12.9748, lng: 77.6125 },
    { name: "Axis Bank Whitefield", type: "bank", lat: 12.9813, lng: 77.7473 },
    { name: "Yes Bank HSR Layout", type: "bank", lat: 12.9115, lng: 77.6396 },
    {
      name: "Canara Bank Basavanagudi",
      type: "bank",
      lat: 12.9415,
      lng: 77.5713,
    },
    {
      name: "Bank of Baroda Marathahalli",
      type: "bank",
      lat: 12.9591,
      lng: 77.7037,
    },
    {
      name: "Union Bank Rajajinagar",
      type: "bank",
      lat: 13.0021,
      lng: 77.5512,
    },
  ],
  atm: [
    { name: "HDFC ATM Koramangala", type: "atm", lat: 12.9361, lng: 77.6238 },
    { name: "ICICI ATM Indiranagar", type: "atm", lat: 12.9788, lng: 77.6412 },
    { name: "SBI ATM MG Road", type: "atm", lat: 12.9752, lng: 77.6119 },
    { name: "Axis ATM Whitefield", type: "atm", lat: 12.9817, lng: 77.7468 },
    { name: "Yes ATM HSR", type: "atm", lat: 12.9118, lng: 77.6399 },
    {
      name: "Canara ATM Basavanagudi",
      type: "atm",
      lat: 12.9419,
      lng: 77.5718,
    },
    { name: "HDFC ATM JP Nagar", type: "atm", lat: 12.9067, lng: 77.5853 },
    { name: "SBI ATM Marathahalli", type: "atm", lat: 12.9595, lng: 77.7041 },
  ],
  pharmacy: [
    {
      name: "Apollo Pharmacy Koramangala",
      type: "pharmacy",
      lat: 12.9355,
      lng: 77.6248,
    },
    {
      name: "MedPlus Indiranagar",
      type: "pharmacy",
      lat: 12.9786,
      lng: 77.641,
    },
    {
      name: "Netmeds HSR Layout",
      type: "pharmacy",
      lat: 12.9117,
      lng: 77.6398,
    },
    {
      name: "Apollo Pharmacy Whitefield",
      type: "pharmacy",
      lat: 12.9815,
      lng: 77.7471,
    },
    { name: "MedPlus BTM Layout", type: "pharmacy", lat: 12.919, lng: 77.6198 },
    {
      name: "Frank Ross Pharmacy MG Road",
      type: "pharmacy",
      lat: 12.975,
      lng: 77.6123,
    },
  ],
  supermarket: [
    {
      name: "More Supermarket Koramangala",
      type: "supermarket",
      lat: 12.9357,
      lng: 77.6242,
    },
    {
      name: "Reliance Smart Indiranagar",
      type: "supermarket",
      lat: 12.9784,
      lng: 77.6406,
    },
    {
      name: "Big Bazaar Whitefield",
      type: "supermarket",
      lat: 12.9811,
      lng: 77.7469,
    },
    {
      name: "Nilgiris HSR Layout",
      type: "supermarket",
      lat: 12.9113,
      lng: 77.6394,
    },
    {
      name: "D-Mart Marathahalli",
      type: "supermarket",
      lat: 12.9593,
      lng: 77.7039,
    },
    {
      name: "Star Market BTM Layout",
      type: "supermarket",
      lat: 12.9192,
      lng: 77.6194,
    },
  ],
  police: [
    {
      name: "Koramangala Police Station",
      type: "police",
      lat: 12.934,
      lng: 77.6222,
    },
    {
      name: "Indiranagar Police Station",
      type: "police",
      lat: 12.9768,
      lng: 77.639,
    },
    {
      name: "Whitefield Police Station",
      type: "police",
      lat: 12.9799,
      lng: 77.7455,
    },
    {
      name: "HSR Layout Police Station",
      type: "police",
      lat: 12.91,
      lng: 77.6378,
    },
    {
      name: "Marathahalli Police Station",
      type: "police",
      lat: 12.9579,
      lng: 77.702,
    },
    {
      name: "Hebbal Police Station",
      type: "police",
      lat: 13.0345,
      lng: 77.5901,
    },
  ],
  petrol_pump: [
    {
      name: "IOCL Petrol Pump Koramangala",
      type: "petrol_pump",
      lat: 12.9359,
      lng: 77.625,
    },
    {
      name: "BPCL Pump Indiranagar",
      type: "petrol_pump",
      lat: 12.979,
      lng: 77.6415,
    },
    {
      name: "HP Petrol Pump Whitefield",
      type: "petrol_pump",
      lat: 12.9819,
      lng: 77.7475,
    },
    {
      name: "HPCL Pump HSR Layout",
      type: "petrol_pump",
      lat: 12.9119,
      lng: 77.64,
    },
    {
      name: "IOCL Pump Marathahalli",
      type: "petrol_pump",
      lat: 12.9597,
      lng: 77.7043,
    },
    {
      name: "BPCL Pump Hebbal",
      type: "petrol_pump",
      lat: 13.0361,
      lng: 77.5921,
    },
  ],
  bus_stop: [
    {
      name: "Majestic BMTC Bus Stand",
      type: "bus_stop",
      lat: 12.9774,
      lng: 77.5713,
    },
    {
      name: "Silk Board Junction Bus Stop",
      type: "bus_stop",
      lat: 12.9175,
      lng: 77.6221,
    },
    {
      name: "Marathahalli Bus Stop",
      type: "bus_stop",
      lat: 12.9591,
      lng: 77.7037,
    },
    { name: "Hebbal Bus Stand", type: "bus_stop", lat: 13.0358, lng: 77.5918 },
    {
      name: "Whitefield Bus Stop",
      type: "bus_stop",
      lat: 12.9701,
      lng: 77.7516,
    },
    {
      name: "Jayanagar Bus Stop",
      type: "bus_stop",
      lat: 12.9261,
      lng: 77.5832,
    },
    {
      name: "Banashankari Bus Depot",
      type: "bus_stop",
      lat: 12.9288,
      lng: 77.5669,
    },
    {
      name: "BTM Layout Bus Stop",
      type: "bus_stop",
      lat: 12.9188,
      lng: 77.6196,
    },
  ],
  railway: [
    {
      name: "Krishnarajapuram Railway Station",
      type: "railway",
      lat: 13.001,
      lng: 77.6715,
    },
    {
      name: "Bangalore City Railway Station",
      type: "railway",
      lat: 12.9774,
      lng: 77.5713,
    },
    {
      name: "Yeshwanthpur Railway Station",
      type: "railway",
      lat: 13.0238,
      lng: 77.5452,
    },
    {
      name: "Whitefield Railway Station",
      type: "railway",
      lat: 12.9701,
      lng: 77.7516,
    },
    {
      name: "Banaswadi Railway Station",
      type: "railway",
      lat: 13.0238,
      lng: 77.6452,
    },
    {
      name: "Bangalore Cantonment Station",
      type: "railway",
      lat: 12.9921,
      lng: 77.6125,
    },
  ],
  airport: [
    {
      name: "Kempegowda International Airport",
      type: "airport",
      lat: 13.1979,
      lng: 77.7063,
    },
  ],
  college: [
    { name: "IISc Bangalore", type: "college", lat: 13.0219, lng: 77.5671 },
    { name: "IIM Bangalore", type: "college", lat: 12.9336, lng: 77.6131 },
    {
      name: "BMS College of Engineering",
      type: "college",
      lat: 12.9361,
      lng: 77.5779,
    },
    {
      name: "RV College of Engineering",
      type: "college",
      lat: 12.9221,
      lng: 77.4987,
    },
    { name: "PESIT South Campus", type: "college", lat: 12.9063, lng: 77.5502 },
    { name: "Christ University", type: "college", lat: 12.9363, lng: 77.6066 },
  ],
};

// ─── Helper: filter fallback data by distance from given point ────────────────
function filterFallbackByDistance(
  pois: AmenityInput[],
  lat: number,
  lng: number,
  radiusKm: number,
): AmenityInput[] {
  return pois.filter((p) => {
    const dlat = p.lat - lat;
    const dlng = p.lng - lng;
    const distKm = Math.sqrt(dlat * dlat + dlng * dlng) * 111;
    return distKm <= radiusKm;
  });
}

// ─── OSM tag queries per type ─────────────────────────────────────────────────
const OSM_TAG_MAP: Record<AmenityType, string> = {
  metro: "[railway=station][subway=yes]",
  railway: '[railway=station]["station"!="subway"]',
  bus_stop: "[highway=bus_stop]",
  hospital: "[amenity=hospital]",
  school: "[amenity=school]",
  college: "[amenity=college]",
  tech_park: "[office=it]",
  mall: "[shop=mall]",
  police: "[amenity=police]",
  petrol_pump: "[amenity=fuel]",
  pharmacy: "[amenity=pharmacy]",
  bank: "[amenity=bank]",
  atm: "[amenity=atm]",
  restaurant: "[amenity=restaurant]",
  supermarket: "[shop=supermarket]",
  airport: "[aeroway=aerodrome]",
  highway: "[highway=motorway_junction]",
};

// ─── Radius per type (km) ─────────────────────────────────────────────────────
export const OSM_RADIUS_KM: Record<AmenityType, number> = {
  atm: 2,
  bank: 3,
  restaurant: 2,
  school: 5,
  college: 5,
  hospital: 5,
  metro: 8,
  railway: 10,
  tech_park: 15,
  mall: 8,
  police: 5,
  petrol_pump: 5,
  pharmacy: 3,
  bus_stop: 3,
  supermarket: 3,
  airport: 60,
  highway: 15,
};

// ─── Overpass endpoints (primary first, then backup) ─────────────────────────
const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter", // primary — more reliable
  "https://overpass-api.de/api/interpreter", // backup
];

// ─── Single-endpoint fetch ────────────────────────────────────────────────────
async function fetchFromEndpoint(
  endpoint: string,
  query: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ─── Parse OSM elements into AmenityInput[] ───────────────────────────────────
function parseOSMResponse(
  data: {
    elements?: Array<{
      type: string;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }>;
  },
  type: AmenityType,
): AmenityInput[] {
  return (data.elements ?? [])
    .map((el) => {
      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;
      if (!elLat || !elLng) return null;
      const name =
        el.tags?.name ||
        el.tags?.["name:en"] ||
        el.tags?.operator ||
        `${type.replace(/_/g, " ")} (${elLat.toFixed(3)},${elLng.toFixed(3)})`;
      return { name, type, lat: elLat, lng: elLng } as AmenityInput;
    })
    .filter((p): p is AmenityInput => p !== null);
}

// ─── Main fetch function ──────────────────────────────────────────────────────

export async function fetchOSMPOIs(
  lat: number,
  lng: number,
  type: AmenityType,
): Promise<AmenityInput[]> {
  const radius = OSM_RADIUS_KM[type] ?? 5;
  const cacheKey = getCacheKey(lat, lng, type);
  const cached = loadCache(cacheKey);
  if (cached !== null && cached.length > 0) {
    console.log(
      `[OSM POI] Cache hit for ${type} at grid ${cacheKey} — ${cached.length} results`,
    );
    return cached;
  }

  const tagQuery = OSM_TAG_MAP[type];
  if (!tagQuery) {
    // No OSM tag — return fallback immediately
    return getEmergencyFallback(type, lat, lng, radius);
  }

  const radiusMeters = Math.round(radius * 1000);
  const query = `[out:json][timeout:25];
(
  node${tagQuery}(around:${radiusMeters},${lat},${lng});
  way${tagQuery}(around:${radiusMeters},${lat},${lng});
);
out center;`;

  // Try each endpoint in order — stop at first success
  for (const endpoint of OVERPASS_ENDPOINTS) {
    console.log(
      `[OSM POI] Fetching ${type} near (${lat.toFixed(3)},${lng.toFixed(3)}) from ${endpoint}`,
    );
    try {
      const res = await fetchFromEndpoint(endpoint, query, 25_000);

      if (!res.ok) {
        console.warn(
          `[OSM POI] Error fetching from ${endpoint}: HTTP ${res.status} — trying fallback`,
        );
        continue;
      }

      const data = (await res.json()) as {
        elements?: Array<{
          type: string;
          lat?: number;
          lon?: number;
          center?: { lat: number; lon: number };
          tags?: Record<string, string>;
        }>;
      };

      const pois = parseOSMResponse(data, type);

      console.log(
        `[OSM POI] Received ${pois.length} results for ${type} from ${endpoint}`,
      );

      if (pois.length > 0) {
        saveCache(cacheKey, pois);
        return pois;
      }

      // API returned 0 results — fall through to next endpoint then fallback
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === "AbortError";
      const reason = isTimeout ? "timeout" : String(err);
      console.warn(
        `[OSM POI] Error fetching from ${endpoint}: ${reason} — trying fallback`,
      );
      // Continue to next endpoint
    }
  }

  // FIX D: All live endpoints failed or returned empty — ALWAYS use hardcoded fallback
  // so markers appear immediately. This ensures POI layer never shows empty map.
  return getEmergencyFallback(type, lat, lng, radius);
}

// ─── Emergency fallback helper ────────────────────────────────────────────────
function getEmergencyFallback(
  type: AmenityType,
  lat: number,
  lng: number,
  radius: number,
): AmenityInput[] {
  const fallbackData = BANGALORE_FALLBACK[type];
  if (fallbackData && fallbackData.length > 0) {
    // Try nearby first, else return all (clamp to 15 max)
    const nearby = filterFallbackByDistance(fallbackData, lat, lng, radius * 2);
    const results = nearby.length > 0 ? nearby : fallbackData.slice(0, 15);
    console.log(
      `[OSM POI] Using emergency fallback for ${type} — ${results.length} landmarks`,
    );
    return results;
  }
  console.warn(`[OSM POI] No fallback data for ${type} — returning empty`);
  return [];
}
