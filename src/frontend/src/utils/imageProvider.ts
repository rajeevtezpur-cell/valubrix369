/**
 * imageProvider.ts — Locality-aware image selection for ValuBrix.
 *
 * Priority order:
 * 1. External real project images (if API key configured)
 * 2. Nearby project images within 3km (locality zone match)
 * 3. Curated local image pool (zone-based)
 * 4. Generic real estate fallback
 *
 * HARD FILTER (enforced at return stage):
 * - NEVER return any image whose category is not real_estate
 * - Allowed categories: apartment, residential_tower, gated_community,
 *   skyline, construction, aerial_city, real_estate_building
 * - Blocked: food, hotel, restaurant, mountain, beach, lifestyle, nature,
 *   vacation, landscape
 * - Final fallback: default real estate skyline (always safe)
 */

// ─── Category classification ─────────────────────────────────────────────────

type ImageCategory =
  | "real_estate_apartment"
  | "residential_tower"
  | "gated_community"
  | "skyline"
  | "construction"
  | "aerial_city"
  | "real_estate_building"
  | "unrelated";

/**
 * Classify an image URL by its filename/path keywords.
 * This is the deterministic vision-model substitute that runs at return stage.
 * A real vision API call can replace this when API key is available.
 */
function classifyImageURL(url: string): ImageCategory {
  const lower = url.toLowerCase();

  // Blocked patterns — non-real-estate
  const BLOCKED = [
    "food",
    "restaurant",
    "cafe",
    "hotel",
    "resort",
    "mountain",
    "beach",
    "sea",
    "ocean",
    "forest",
    "landscape",
    "nature",
    "travel",
    "vacation",
    "lifestyle",
    "wedding",
    "party",
    "fashion",
    "people",
    "portrait",
    "market",
    "shop",
    "retail",
    "grocery",
    // Common Unsplash IDs known to be non-real-estate
    "photo-1414235077428", // food
    "photo-1506905925346", // mountain
    "photo-1566073771259", // hotel pool
    "photo-1551632436", // lifestyle
  ];

  for (const blocked of BLOCKED) {
    if (lower.includes(blocked)) {
      return "unrelated";
    }
  }

  // Allowed patterns — real estate
  const ALLOWED_PATTERNS: Array<{ pattern: string; category: ImageCategory }> =
    [
      { pattern: "apartment", category: "real_estate_apartment" },
      { pattern: "tower", category: "residential_tower" },
      { pattern: "gated", category: "gated_community" },
      { pattern: "skyline", category: "skyline" },
      { pattern: "construction", category: "construction" },
      { pattern: "aerial", category: "aerial_city" },
      { pattern: "building", category: "real_estate_building" },
      { pattern: "locality", category: "real_estate_building" },
      { pattern: "area", category: "real_estate_building" },
      { pattern: "real-estate", category: "real_estate_building" },
      { pattern: "residential", category: "residential_tower" },
      { pattern: "complex", category: "gated_community" },
      { pattern: "society", category: "gated_community" },
      // Generated assets — always real estate (named with locality prefix)
      {
        pattern: "/assets/generated/locality-",
        category: "real_estate_building",
      },
      {
        pattern: "/assets/generated/valuation-",
        category: "real_estate_building",
      },
      {
        pattern: "/assets/generated/valubrix-",
        category: "real_estate_building",
      },
      // Zone-based local pool paths (all are real estate)
      { pattern: "/images/areas/", category: "real_estate_building" },
      { pattern: "hebbal", category: "real_estate_building" },
      { pattern: "whitefield", category: "real_estate_building" },
      { pattern: "thanisandra", category: "real_estate_building" },
      { pattern: "devanahalli", category: "real_estate_building" },
      { pattern: "koramangala", category: "real_estate_building" },
      { pattern: "indiranagar", category: "real_estate_building" },
      { pattern: "sarjapur", category: "real_estate_building" },
      { pattern: "yelahanka", category: "real_estate_building" },
      { pattern: "jalahalli", category: "real_estate_building" },
      { pattern: "baner", category: "real_estate_building" },
      { pattern: "hinjewadi", category: "real_estate_building" },
      { pattern: "koregaon", category: "real_estate_building" },
      { pattern: "dwarka", category: "real_estate_building" },
      { pattern: "south-delhi", category: "real_estate_building" },
    ];

  for (const { pattern, category } of ALLOWED_PATTERNS) {
    if (lower.includes(pattern)) return category;
  }

  // Unknown pattern — treat as unrelated (safe default)
  return "unrelated";
}

/**
 * Hard filter: returns the URL only if it passes the real_estate category check.
 * Returns null if blocked.
 */
function hardFilterImage(url: string): string | null {
  const category = classifyImageURL(url);
  if (category === "unrelated") {
    if (import.meta.env.DEV) {
      console.warn(`[imageProvider] Blocked non-real-estate image: ${url}`);
    }
    return null;
  }
  return url;
}

// ─── External provider hook ──────────────────────────────────────────────────

export interface ExternalImageProvider {
  fetchImages(locality: string, maxResults?: number): Promise<string[]>;
  isConfigured(): boolean;
}

let _externalProvider: ExternalImageProvider | null = null;

export function registerExternalImageProvider(
  provider: ExternalImageProvider,
): void {
  _externalProvider = provider;
}

// ─── Default real estate skyline fallback ───────────────────────────────────
// This image is ALWAYS safe — it is a generated residential skyline.
const DEFAULT_REAL_ESTATE_FALLBACK =
  "/assets/generated/valubrix-hero-bg.dim_1920x1080.jpg";

// ─── Curated local pool ─────────────────────────────────────────────────────
// All paths are real estate relevant.
// Zone keys mirror localityEngine.ts LOCALITY_ZONE_MAP.

const ZONE_IMAGE_POOL: Record<string, string[]> = {
  "north-inner": [
    "/assets/generated/locality-hebbal.dim_800x500.jpg",
    "/images/areas/north-inner-1.jpg",
    "/images/areas/hebbal-flyover.jpg",
    "/images/areas/manyata-tech-park.jpg",
  ],
  "north-mid": [
    "/assets/generated/locality-hebbal.dim_800x500.jpg",
    "/images/areas/north-mid-1.jpg",
    "/images/areas/thanisandra-main.jpg",
    "/images/areas/hennur-road.jpg",
  ],
  "north-outer": [
    "/assets/generated/locality-yelahanka.dim_800x500.jpg",
    "/images/areas/yelahanka-1.jpg",
    "/images/areas/north-outer-gated.jpg",
  ],
  "airport-corridor": [
    "/assets/generated/locality-devanahalli.dim_800x500.jpg",
    "/images/areas/airport-road.jpg",
    "/images/areas/devanahalli-1.jpg",
    "/images/areas/bagalur-1.jpg",
  ],
  northwest: [
    "/assets/generated/locality-jalahalli.dim_800x500.jpg",
    "/images/areas/jalahalli-1.jpg",
    "/images/areas/northwest-apt.jpg",
  ],
  "east-core": [
    "/assets/generated/locality-whitefield.dim_800x500.jpg",
    "/images/areas/whitefield-1.jpg",
    "/images/areas/whitefield-itpl.jpg",
    "/images/areas/mahadevapura-1.jpg",
  ],
  "east-mid": [
    "/assets/generated/locality-sarjapur.dim_800x500.jpg",
    "/images/areas/marathahalli-1.jpg",
    "/images/areas/sarjapur-1.jpg",
    "/images/areas/east-mid-apt.jpg",
  ],
  "east-outer": [
    "/assets/generated/locality-sarjapur.dim_800x500.jpg",
    "/images/areas/varthur-1.jpg",
    "/images/areas/panathur-1.jpg",
    "/images/areas/east-outer-gated.jpg",
  ],
  "east-peripheral": [
    "/assets/generated/locality-whitefield.dim_800x500.jpg",
    "/images/areas/kr-puram-1.jpg",
    "/images/areas/budigere-1.jpg",
  ],
  central: [
    "/assets/generated/locality-koramangala.dim_800x500.jpg",
    "/assets/generated/locality-indiranagar.dim_800x500.jpg",
    "/images/areas/central-bangalore.jpg",
  ],
  south: [
    "/assets/generated/locality-sarjapur.dim_800x500.jpg",
    "/images/areas/hsr-layout-1.jpg",
    "/images/areas/jayanagar-1.jpg",
    "/images/areas/south-bangalore.jpg",
  ],
  unknown: [
    "/assets/generated/locality-hebbal.dim_800x500.jpg",
    "/assets/generated/locality-whitefield.dim_800x500.jpg",
  ],
};

// ─── Zone mapping ────────────────────────────────────────────────────────────

const LOCALITY_TO_ZONE: Record<string, string> = {
  hebbal: "north-inner",
  kempapura: "north-inner",
  "sahakar nagar": "north-inner",
  "sahakara nagar": "north-inner",
  "rt nagar": "north-inner",
  amruthahalli: "north-inner",
  malleshwaram: "north-inner",
  thanisandra: "north-mid",
  nagavara: "north-mid",
  hennur: "north-mid",
  "hennur road": "north-mid",
  "manyata tech park": "north-mid",
  vidyaranyapura: "north-mid",
  doddabommasandra: "north-mid",
  yelahanka: "north-outer",
  jakkur: "north-outer",
  kattigenahalli: "north-outer",
  anantapura: "north-outer",
  bagalur: "airport-corridor",
  devanahalli: "airport-corridor",
  chikkajala: "airport-corridor",
  shettigere: "airport-corridor",
  jalahalli: "northwest",
  abbigere: "northwest",
  rajanakunte: "northwest",
  rajankunte: "northwest",
  whitefield: "east-core",
  kadugodi: "east-core",
  mahadevapura: "east-core",
  brookefield: "east-core",
  hoodi: "east-core",
  marathahalli: "east-mid",
  "aecs layout": "east-mid",
  "sarjapur road": "east-mid",
  bellandur: "east-mid",
  varthur: "east-outer",
  panathur: "east-outer",
  balagere: "east-outer",
  avalahalli: "east-outer",
  "kr puram": "east-peripheral",
  horamavu: "east-peripheral",
  "budigere cross": "east-peripheral",
  koramangala: "central",
  indiranagar: "central",
  "mg road": "central",
  hsr: "south",
  "hsr layout": "south",
  jayanagar: "south",
  bannerghatta: "south",
};

function getZoneForLocality(locality: string): string {
  return LOCALITY_TO_ZONE[locality.trim().toLowerCase()] ?? "unknown";
}

// ─── Image selection ─────────────────────────────────────────────────────────

export interface LocalityImage {
  url: string;
  source: "external" | "local" | "fallback";
  locality?: string;
  category?: string;
}

/**
 * Get the best available image for a locality.
 * HARD FILTER is applied at every return point.
 * Final fallback is always the default real estate skyline.
 */
export async function getLocalityImage(
  locality: string,
): Promise<LocalityImage> {
  // 1. External provider (real project images)
  if (_externalProvider?.isConfigured()) {
    try {
      const urls = await _externalProvider.fetchImages(locality, 5);
      for (const url of urls) {
        const passed = hardFilterImage(url);
        if (passed) {
          return { url: passed, source: "external", locality };
        }
      }
    } catch {
      // Fall through to local pool
    }
  }

  // 2. Local curated pool by zone — all pre-validated as real estate
  const zone = getZoneForLocality(locality);
  const pool = ZONE_IMAGE_POOL[zone] ?? ZONE_IMAGE_POOL.unknown;
  for (const url of pool) {
    const passed = hardFilterImage(url);
    if (passed) {
      return { url: passed, source: "local", locality };
    }
  }

  // 3. Hard fallback — default real estate skyline, always safe
  return { url: DEFAULT_REAL_ESTATE_FALLBACK, source: "fallback" };
}

/**
 * Get multiple ranked images for a locality.
 * HARD FILTER applied to every candidate.
 */
export async function getLocalityImages(
  locality: string,
  maxImages = 3,
): Promise<LocalityImage[]> {
  const results: LocalityImage[] = [];

  // 1. External provider
  if (_externalProvider?.isConfigured()) {
    try {
      const urls = await _externalProvider.fetchImages(locality, maxImages * 2);
      for (const url of urls) {
        if (results.length >= maxImages) break;
        const passed = hardFilterImage(url);
        if (passed) {
          results.push({ url: passed, source: "external", locality });
        }
      }
    } catch {
      // Fall through
    }
  }

  // 2. Local zone pool
  const zone = getZoneForLocality(locality);
  const pool = ZONE_IMAGE_POOL[zone] ?? ZONE_IMAGE_POOL.unknown;
  for (const url of pool) {
    if (results.length >= maxImages) break;
    const passed = hardFilterImage(url);
    if (passed && !results.find((r) => r.url === url)) {
      results.push({ url: passed, source: "local", locality });
    }
  }

  // 3. Fill remaining with the safe fallback
  while (results.length < maxImages) {
    if (!results.find((r) => r.url === DEFAULT_REAL_ESTATE_FALLBACK)) {
      results.push({ url: DEFAULT_REAL_ESTATE_FALLBACK, source: "fallback" });
    } else {
      break; // Avoid infinite loop if pool is genuinely empty
    }
  }

  return results.slice(0, maxImages);
}

/**
 * Synchronous version for non-async contexts (uses local pool only).
 * HARD FILTER applied.
 */
export function getLocalityImageSync(locality: string): LocalityImage {
  const zone = getZoneForLocality(locality);
  const pool = ZONE_IMAGE_POOL[zone] ?? ZONE_IMAGE_POOL.unknown;
  for (const url of pool) {
    const passed = hardFilterImage(url);
    if (passed) {
      return { url: passed, source: "local", locality };
    }
  }
  return { url: DEFAULT_REAL_ESTATE_FALLBACK, source: "fallback" };
}
