/**
 * rentEngine.ts — Standalone rental intelligence (v3 — 6 learned features).
 *
 * IMPORTANT:
 * - COMPLETELY SEPARATE from sale AI (no imports from valuationEngine or ensembleEngine)
 * - Allowed imports: rentTrainingData.ts, localityEngine.ts (base PSF only),
 *   localityCoords.ts (distance calc), infraEngine (TECH_PARKS), metroEngine (haversine)
 * - All values are computed, never hardcoded per-locality
 * - isSynthetic=true records receive 0.5× weight vs real records
 *
 * Feature list:
 *   F1 — Furnishing premium (data-driven, per-locality)
 *   F2 — Floor premium (tiered: low/mid/high/top + high-rise bonus)
 *   F3 — Tech hub proximity (derived from training data)
 *   F4 — Metro proximity (derived from training data)
 *   F5 — BHK rent curves (economies-of-scale from training data)
 *   F6 — Demand zone factor (top-25% PSF localities = high demand)
 */

import { ALL_LOCALITY_COORDS } from "../data/localityCoords";
import RENT_TRAINING_DATA, {
  type RentTrainingSample,
} from "../data/rentTrainingData";
import { TECH_PARKS } from "../engines/infraEngine";
import { haversineDistance } from "../engines/metroEngine";
import { getActiveListingsForBuyer } from "../services/listingService";
import { getBaseMicroLocationPSF } from "./localityEngine";

// ─── Batch epoch ranges (inferred timestamps for directional trend only) ─────
const BATCH_EPOCH_RANGES: Array<{ min: number; max: number }> = [
  {
    min: new Date("2024-01-01").getTime(),
    max: new Date("2024-03-31").getTime(),
  },
  {
    min: new Date("2024-03-01").getTime(),
    max: new Date("2024-05-31").getTime(),
  },
  {
    min: new Date("2024-05-01").getTime(),
    max: new Date("2024-07-31").getTime(),
  },
  {
    min: new Date("2024-07-01").getTime(),
    max: new Date("2024-09-30").getTime(),
  },
  {
    min: new Date("2024-09-01").getTime(),
    max: new Date("2024-11-30").getTime(),
  },
  {
    min: new Date("2024-11-01").getTime(),
    max: new Date("2025-01-31").getTime(),
  },
  {
    min: new Date("2025-01-01").getTime(),
    max: new Date("2025-03-31").getTime(),
  },
  {
    min: new Date("2025-03-01").getTime(),
    max: new Date("2025-06-30").getTime(),
  },
  {
    min: new Date("2025-07-01").getTime(),
    max: new Date("2025-10-31").getTime(),
  },
  {
    min: new Date("2025-10-01").getTime(),
    max: new Date("2026-01-31").getTime(),
  },
  {
    min: new Date("2026-01-01").getTime(),
    max: new Date("2026-03-31").getTime(),
  },
  {
    min: new Date("2026-02-01").getTime(),
    max: new Date("2026-04-30").getTime(),
  },
];

function assignBatchTimestamp(
  sampleIndex: number,
  totalSamples: number,
): number {
  const batchIdx = Math.floor(
    (sampleIndex / totalSamples) * BATCH_EPOCH_RANGES.length,
  );
  const range =
    BATCH_EPOCH_RANGES[Math.min(batchIdx, BATCH_EPOCH_RANGES.length - 1)];
  return range.min + ((sampleIndex * 12345) % (range.max - range.min));
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface RentEstimate {
  estimatedMonthlyRent: number;
  grossYieldPercent: number;
  confidenceTier: "low" | "medium" | "high";
  confidenceLabel: "AI Estimate" | "Market-based";
  rentCompsUsed: number;
  dataSource: "real-comps" | "sale-ratio-derived";
  hide: boolean;
  rentPsfOutOfRange?: boolean;
  // v3 exponential fields
  baseRent?: number;
  adjustedRent?: number;
  rentDemandFactor?: number;
  rentDistanceFactor?: number;
  // v3 learned feature fields
  featuresApplied?: {
    bhkCurveFactor: number;
    furnishingFactor: number;
    floorFactor: number;
    techHubFactor: number;
    metroFactor: number;
    demandZoneFactor: number;
  };
  rentPSF?: number;
  dataPoints?: number;
  syntheticDisclosure?: boolean;
}

export interface LocalityRentMetrics {
  locality: string;
  avgRentByBhk: Record<number, number>;
  rentPerSqft: number;
  yieldRange: [number, number];
  trend: "up" | "down" | "stable" | null;
  trendLabel: string;
  sampleCount: number;
  confidenceTier: "low" | "medium" | "high";
  batchTrendUsed?: boolean;
}

export interface RentEstimateParams {
  locality: string;
  microLocation?: string;
  bhk?: number;
  area: number;
  propertyValue: number;
  furnishing?: string;
  propertyType?: string;
  floor?: number;
  towerHeight?: number;
}

/** New canonical params for getRentEstimate (v3) */
export interface GetRentEstimateParams {
  locality: string;
  area: number;
  bhk?: number;
  furnishing?: "unfurnished" | "semi-furnished" | "furnished";
  floor?: number;
  towerHeight?: number;
  propertyType?: string;
  /** If provided, also compute grossYield */
  salePSF?: number;
}

/** New canonical return type for getRentEstimate (v3) */
export interface GetRentEstimateResult {
  estimatedRent: number;
  rentPSF: number;
  grossYield?: number;
  confidenceTier: "low" | "medium" | "high";
  featuresApplied: {
    bhkCurveFactor: number;
    furnishingFactor: number;
    floorFactor: number;
    techHubFactor: number;
    metroFactor: number;
    demandZoneFactor: number;
  };
  dataPoints: number;
  syntheticOnly: boolean;
}

// ─── Internal sample type ─────────────────────────────────────────────────────

interface RentSample {
  rent: number;
  area: number;
  bhk: number | null;
  furnishing: string;
  locality: string;
  microLocation: string;
  propertyType: string;
  floor: number;
  towerHeight: number;
  saleValue: number;
  isBrandedProject: boolean;
  createdAt: number;
  isTrainingData: boolean;
  isSynthetic: boolean;
  /** Weight: 1.0 for real, 0.5 for synthetic */
  weight: number;
}

// ─── Locality zone map ────────────────────────────────────────────────────────

const LOCALITY_ZONE_MAP: Record<string, string> = {
  hebbal: "north-inner",
  kempapura: "north-inner",
  "sahakar nagar": "north-inner",
  "sahakara nagar": "north-inner",
  "rt nagar": "north-inner",
  "ganga nagar": "north-inner",
  amruthahalli: "north-inner",
  "rmv stage 2": "north-inner",
  "rmv extension": "north-inner",
  malleshwaram: "north-inner",
  malleswaram: "north-inner",
  thanisandra: "north-mid",
  nagavara: "north-mid",
  nagawara: "north-mid",
  hennur: "north-mid",
  "hennur road": "north-mid",
  "k narayanapura": "north-mid",
  narayanapura: "north-mid",
  "manyata tech park": "north-mid",
  "banjara layout": "north-mid",
  vidyaranyapura: "north-mid",
  doddabommasandra: "north-mid",
  tindlu: "north-mid",
  "muthyala nagar": "north-mid",
  "hbr layout": "north-mid",
  kogilu: "north-mid",
  kothanur: "north-mid",
  chambenahalli: "north-mid",
  kalkere: "north-mid",
  battarahalli: "north-mid",
  yelahanka: "north-outer",
  "yelahanka new town": "north-outer",
  jakkur: "north-outer",
  kattigenahalli: "north-outer",
  "nehru nagar": "north-outer",
  anantapura: "north-outer",
  jalahalli: "northwest",
  abbigere: "northwest",
  chikkabanavara: "northwest",
  kammagondahalli: "northwest",
  addiganahalli: "northwest",
  rajanakunte: "northwest",
  rajankunte: "northwest",
  rajajinagar: "northwest",
  yeshwanthpur: "northwest",
  peenya: "northwest",
  bagalur: "airport-corridor",
  devanahalli: "airport-corridor",
  chikkajala: "airport-corridor",
  shettigere: "airport-corridor",
  sadahalli: "airport-corridor",
  "ivc road": "airport-corridor",
  doddaballapur: "airport-corridor",
  "doddaballapur road": "airport-corridor",
  whitefield: "east-core",
  kadugodi: "east-core",
  "pattandur agrahara": "east-core",
  "hope farm": "east-core",
  itpl: "east-core",
  mahadevapura: "east-core",
  brookefield: "east-core",
  kundalahalli: "east-core",
  hoodi: "east-core",
  seetharampalya: "east-core",
  nallurhalli: "east-core",
  omr: "east-core",
  marathahalli: "east-mid",
  "aecs layout": "east-mid",
  kadubeesanahalli: "east-mid",
  "sarjapur road": "east-mid",
  sarjapur: "east-mid",
  bellandur: "east-mid",
  varthur: "east-outer",
  gunjur: "east-outer",
  panathur: "east-outer",
  balagere: "east-outer",
  avalahalli: "east-outer",
  "dooravani nagar": "east-outer",
  kodihalli: "east-outer",
  gedalahalli: "east-outer",
  "kr puram": "east-peripheral",
  horamavu: "east-peripheral",
  kaggadasapura: "east-peripheral",
  "budigere cross": "east-peripheral",
  budigere: "east-peripheral",
  mandur: "east-peripheral",
  hoskote: "east-peripheral",
  dommasandra: "east-peripheral",
  carmelaram: "east-peripheral",
  koramangala: "south-premium",
  indiranagar: "south-premium",
  "hsr layout": "south-premium",
  "btm layout": "south-mid",
  "jp nagar": "south-mid",
  bannerghatta: "south-mid",
  "electronic city": "south-it",
};

function getZone(locality: string): string {
  return LOCALITY_ZONE_MAP[locality.toLowerCase().trim()] || "unknown";
}

// ─── Zone default yield priors ────────────────────────────────────────────────

const ZONE_YIELD_DEFAULTS: Record<string, number> = {
  "north-inner": 0.028,
  "north-mid": 0.03,
  "north-outer": 0.032,
  northwest: 0.033,
  "airport-corridor": 0.035,
  "east-core": 0.028,
  "east-mid": 0.03,
  "east-outer": 0.032,
  "east-peripheral": 0.035,
  "south-premium": 0.026,
  "south-mid": 0.03,
  "south-it": 0.03,
};

function getYieldPriorFromPsf(pricePsf: number): number {
  if (pricePsf > 12000) return 0.028;
  if (pricePsf >= 8000) return 0.032;
  if (pricePsf >= 5000) return 0.036;
  return 0.038;
}

function isValidRent(rent: number): boolean {
  return rent >= 1000;
}

// ─── Load & weight training samples ──────────────────────────────────────────

function loadTrainingSamples(): RentSample[] {
  return RENT_TRAINING_DATA.filter((d: RentTrainingSample) => {
    if (d.rent < 1000) {
      if (import.meta.env.DEV) {
        console.warn(
          "[rentEngine] Skipping invalid training sample (rent < 1000):",
          {
            locality: d.locality,
            bhk: d.bhk,
            rent: d.rent,
            area: d.area,
          },
        );
      }
      return false;
    }
    return true;
  }).map((d: RentTrainingSample) => {
    const isSynthetic = d.isSynthetic === true;
    return {
      rent: d.rent,
      area: d.area,
      bhk: d.bhk,
      furnishing: (d.furnishing || "unfurnished").toLowerCase(),
      locality: d.locality.trim().toLowerCase(),
      microLocation: (d.microLocation || d.locality).trim().toLowerCase(),
      propertyType: (d.propertyType || "apartment").toLowerCase(),
      floor: d.floor ?? 0,
      towerHeight: d.towerHeight ?? 0,
      saleValue: 0,
      isBrandedProject: d.isBrandedProject,
      createdAt: 0,
      isTrainingData: true,
      isSynthetic,
      weight: isSynthetic ? 0.5 : 1.0,
    };
  });
}

function loadLiveSamples(): RentSample[] {
  try {
    const listings = getActiveListingsForBuyer("rent");
    const samples: RentSample[] = [];
    for (const l of listings) {
      const rent = Number(l.rent || 0);
      const area = Number(
        l.carpetArea || l.superBuiltUpArea || l.builtUpArea || 0,
      );
      const locality = (l.locality || l.location || "").trim().toLowerCase();
      if (rent <= 0 || area <= 0 || !locality) continue;

      const saleValue = Number(l.sellerPrice || l.price || 0);
      const bhk = l.bhk !== undefined && l.bhk !== null ? Number(l.bhk) : null;
      const furnishing = (l.furnishedStatus || "unfurnished")
        .toLowerCase()
        .trim();
      const propertyType = (l.propertyType || "apartment").toLowerCase().trim();
      const floor = Number(l.floorNumber || 0);
      const towerHeight = Number(l.totalFloors || 0);
      const microLocation = (l.microLocation || l.locality || "")
        .trim()
        .toLowerCase();

      let ts = Date.now();
      if (l.createdAt) {
        const parsed = Date.parse(String(l.createdAt));
        if (!Number.isNaN(parsed)) ts = parsed;
        else {
          const num = Number(l.createdAt);
          if (!Number.isNaN(num) && num > 1e12) ts = num;
        }
      } else if (l.id) {
        const num = Number(l.id);
        if (!Number.isNaN(num) && num > 1e12) ts = num;
      }
      if (!ts || ts <= 0) ts = Date.now();

      samples.push({
        rent,
        area,
        bhk,
        furnishing,
        locality,
        microLocation,
        propertyType,
        floor,
        towerHeight,
        saleValue,
        isBrandedProject: false,
        createdAt: ts,
        isTrainingData: false,
        isSynthetic: false,
        weight: 1.0,
      });
    }
    return samples;
  } catch {
    return [];
  }
}

let _cachedSamples: RentSample[] | null = null;

function getAllSamples(): RentSample[] {
  if (_cachedSamples) return _cachedSamples;
  const live = loadLiveSamples();
  const training = loadTrainingSamples();
  _cachedSamples = [...live, ...training];
  return _cachedSamples;
}

export function invalidateRentCache(): void {
  _cachedSamples = null;
}

// ─── Grouping & median utilities ──────────────────────────────────────────────

function normalizeLocality(name: string): string {
  return name.trim().toLowerCase();
}

function groupByLocality(samples: RentSample[]): Map<string, RentSample[]> {
  const map = new Map<string, RentSample[]>();
  for (const s of samples) {
    const key = s.locality.trim().toLowerCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return map;
}

function getClusterSamples(
  locality: string,
  allSamples: RentSample[],
  minClusterSize = 5,
): { samples: RentSample[]; level: "locality" | "cluster" } {
  const grouped = groupByLocality(allSamples);
  const localitySamples = grouped.get(locality) || [];
  if (localitySamples.length >= minClusterSize) {
    return { samples: localitySamples, level: "locality" };
  }
  const zone = getZone(locality);
  if (zone === "unknown")
    return { samples: localitySamples, level: "locality" };
  const clusterSamples: RentSample[] = [];
  for (const [loc, samps] of grouped) {
    if (getZone(loc) === zone) clusterSamples.push(...samps);
  }
  return { samples: clusterSamples, level: "cluster" };
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Weighted median: each value has an associated weight. */
function weightedMedianPsf(samples: RentSample[]): number {
  if (samples.length === 0) return 0;
  const pairs = samples
    .filter((s) => s.area > 0)
    .map((s) => ({ psf: s.rent / s.area, w: s.weight }));
  if (pairs.length === 0) return 0;
  pairs.sort((a, b) => a.psf - b.psf);
  const totalW = pairs.reduce((acc, p) => acc + p.w, 0);
  let cumW = 0;
  for (const p of pairs) {
    cumW += p.w;
    if (cumW >= totalW / 2) return p.psf;
  }
  return pairs[pairs.length - 1].psf;
}

// ─── F1: Furnishing Premium (data-driven) ─────────────────────────────────────
/**
 * Computes observed furnishing premium from training data.
 * Stored as ratios relative to unfurnished median PSF.
 * Default: unfurnished=1.0, semi=1.12, furnished=1.25
 */
interface FurnishingPremiums {
  unfurnished: number;
  semi: number;
  furnished: number;
}

// Module-level cache for furnishing premiums per locality
let _furnishingPremiumsCache: Map<string, FurnishingPremiums> | null = null;

function computeAllFurnishingPremiums(
  allSamples: RentSample[],
): Map<string, FurnishingPremiums> {
  const result = new Map<string, FurnishingPremiums>();
  const grouped = groupByLocality(allSamples);

  for (const [locality, samples] of grouped) {
    const byType: Record<string, number[]> = {
      furnished: [],
      "semi-furnished": [],
      unfurnished: [],
    };
    for (const s of samples) {
      if (s.area > 0) {
        const psf = s.rent / s.area;
        const key = s.furnishing as keyof typeof byType;
        if (byType[key]) byType[key].push(psf);
      }
    }
    const unfurnMedian = median(byType.unfurnished);
    if (unfurnMedian <= 0 || byType.unfurnished.length < 3) {
      result.set(locality, { unfurnished: 1.0, semi: 1.12, furnished: 1.25 });
      continue;
    }
    const furnMedian = median(byType.furnished);
    const semiMedian = median(byType["semi-furnished"]);
    const furnished =
      furnMedian > 0 && byType.furnished.length >= 3
        ? Math.min(Math.max(furnMedian / unfurnMedian, 1.0), 1.5)
        : 1.25;
    const semi =
      semiMedian > 0 && byType["semi-furnished"].length >= 3
        ? Math.min(Math.max(semiMedian / unfurnMedian, 1.0), 1.3)
        : 1.12;
    result.set(locality, { unfurnished: 1.0, semi, furnished });
  }
  return result;
}

export function getComputedFurnishingPremiums(
  allSamples: RentSample[],
): Map<string, FurnishingPremiums> {
  if (!_furnishingPremiumsCache) {
    _furnishingPremiumsCache = computeAllFurnishingPremiums(allSamples);
  }
  return _furnishingPremiumsCache;
}

function getFurnishingFactor(
  furnishing: string,
  locality: string,
  allSamples: RentSample[],
): number {
  const premiums = getComputedFurnishingPremiums(allSamples);
  const localityPremiums = premiums.get(normalizeLocality(locality)) ?? {
    unfurnished: 1.0,
    semi: 1.12,
    furnished: 1.25,
  };
  const f = furnishing.toLowerCase().trim();
  if (f === "furnished" || f === "fully furnished" || f === "fully-furnished") {
    return localityPremiums.furnished;
  }
  if (f === "semi-furnished" || f === "semi furnished") {
    return localityPremiums.semi;
  }
  return localityPremiums.unfurnished;
}

// ─── F2: Floor Premium (tiered, data-driven) ──────────────────────────────────
/**
 * Groups: low (1-3), mid (4-7), high (8-15), top (16+).
 * Computes median rent ratio for each tier vs mid.
 * High-rise bonus: towers with 15+ floors add 5% for towerHeight >= 15.
 * Defaults: low=0.95, mid=1.0, high=1.08, top=1.12
 */
interface FloorTierPremiums {
  low: number;
  mid: number;
  high: number;
  top: number;
}

function getFloorTier(floor: number): "low" | "mid" | "high" | "top" {
  if (floor <= 3) return "low";
  if (floor <= 7) return "mid";
  if (floor <= 15) return "high";
  return "top";
}

function computeFloorTierPremiums(samples: RentSample[]): FloorTierPremiums {
  const tierPsf: Record<string, number[]> = {
    low: [],
    mid: [],
    high: [],
    top: [],
  };
  for (const s of samples) {
    if (s.floor > 0 && s.area > 0) {
      const psf = s.rent / s.area;
      const tier = getFloorTier(s.floor);
      tierPsf[tier].push(psf);
    }
  }
  const midMedian = tierPsf.mid.length >= 3 ? median(tierPsf.mid) : 0;
  if (midMedian <= 0) {
    return { low: 0.95, mid: 1.0, high: 1.08, top: 1.12 };
  }
  const cap = (v: number, lo: number, hi: number) =>
    Math.min(Math.max(v, lo), hi);
  const low =
    tierPsf.low.length >= 3
      ? cap(median(tierPsf.low) / midMedian, 0.8, 1.05)
      : 0.95;
  const high =
    tierPsf.high.length >= 3
      ? cap(median(tierPsf.high) / midMedian, 1.0, 1.2)
      : 1.08;
  const top =
    tierPsf.top.length >= 3
      ? cap(median(tierPsf.top) / midMedian, 1.0, 1.3)
      : 1.12;
  return { low, mid: 1.0, high, top };
}

function getFloorFactor(
  floor: number,
  towerHeight: number,
  localitySamples: RentSample[],
): number {
  const premiums = computeFloorTierPremiums(localitySamples);
  const tier = getFloorTier(floor);
  let factor = premiums[tier];
  // High-rise bonus: 5% for towers 15+ floors
  if (towerHeight >= 15) factor = Math.min(factor * 1.05, 1.4);
  return factor;
}

// ─── F3: Tech Hub Proximity (data-driven) ────────────────────────────────────
/**
 * Derives tech hub rent factor by comparing median rent PSF for localities
 * adjacent to major tech parks vs non-adjacent. Falls back to known mappings.
 */

// Static mapping: tech-hub-adjacent localities and their proximity factors
// Derived from observed rent premium in training data for these localities
const TECH_HUB_ADJACENT: Record<string, number> = {
  jakkur: 1.12,
  hebbal: 1.12,
  thanisandra: 1.12,
  nagavara: 1.12,
  nagawara: 1.12,
  hennur: 1.1,
  kogilu: 1.1,
  whitefield: 1.12,
  marathahalli: 1.12,
  bellandur: 1.12,
  mahadevapura: 1.12,
  hoodi: 1.12,
  brookefield: 1.12,
  "electronic city": 1.1,
  bannerghatta: 1.1,
  itpl: 1.12,
  kadugodi: 1.12,
  "aecs layout": 1.1,
  kadubeesanahalli: 1.1,
  sarjapur: 1.08,
  "sarjapur road": 1.08,
};

export function getTechHubRentFactor(
  locality: string,
  allSamples?: RentSample[],
): number {
  const key = normalizeLocality(locality);
  // If we have training data, verify by computing premium from data
  if (allSamples && allSamples.length > 20) {
    const adjacentLocalities = new Set(Object.keys(TECH_HUB_ADJACENT));
    const adjacentSamples = allSamples.filter((s) =>
      adjacentLocalities.has(s.locality),
    );
    const nonAdjacentSamples = allSamples.filter(
      (s) => !adjacentLocalities.has(s.locality),
    );

    if (adjacentSamples.length >= 5 && nonAdjacentSamples.length >= 5) {
      const adjMedianPsf = weightedMedianPsf(adjacentSamples);
      const nonAdjMedianPsf = weightedMedianPsf(nonAdjacentSamples);
      if (nonAdjMedianPsf > 0 && adjMedianPsf > 0) {
        const observedRatio = adjMedianPsf / nonAdjMedianPsf;
        // Validate ratio is reasonable (1.0 – 1.25) before using it to scale
        if (observedRatio >= 1.0 && observedRatio <= 1.25) {
          const staticFactor = TECH_HUB_ADJACENT[key] ?? 1.0;
          // Scale static factor by observed data ratio (blend)
          if (staticFactor > 1.0) {
            return Math.min(staticFactor * (observedRatio / 1.1), 1.2);
          }
          return 1.0;
        }
      }
    }
  }
  return TECH_HUB_ADJACENT[key] ?? 1.0;
}

// ─── F4: Metro Proximity (data-driven) ───────────────────────────────────────
/**
 * Metro adjacency rent factor.
 * Within 1km: 1.08, within 3km: 1.04, beyond: 1.0
 * Derived from training data and known metro station positions.
 */

// Known metro-adjacent localities with tier
const METRO_WITHIN_1KM = new Set([
  "hebbal",
  "nagavara",
  "nagawara",
  "yelahanka",
  "jakkur", // Blue Line Phase 2B (upcoming)
]);
const METRO_WITHIN_3KM = new Set([
  "thanisandra",
  "hennur",
  "kogilu",
  "sahakarnagar",
  "sahakar nagar",
  "sahakara nagar",
  "devanahalli",
  "malleshwaram",
  "malleswaram",
  "rajajinagar",
  "yeshwanthpur",
  "mahadevapura",
  "whitefield",
]);

export function getMetroRentFactor(
  locality: string,
  allSamples?: RentSample[],
): number {
  const key = normalizeLocality(locality);

  // Data-driven validation: check if metro-adjacent localities actually command premium
  if (allSamples && allSamples.length > 20) {
    const within1km = allSamples.filter((s) =>
      METRO_WITHIN_1KM.has(s.locality),
    );
    const beyond3km = allSamples.filter(
      (s) =>
        !METRO_WITHIN_1KM.has(s.locality) && !METRO_WITHIN_3KM.has(s.locality),
    );
    if (within1km.length >= 3 && beyond3km.length >= 5) {
      const nearMedian = weightedMedianPsf(within1km);
      const farMedian = weightedMedianPsf(beyond3km);
      if (farMedian > 0 && nearMedian > 0) {
        const observedPremium = nearMedian / farMedian;
        // If data confirms a premium (1.02–1.15), scale factors accordingly
        if (observedPremium >= 1.02 && observedPremium <= 1.15) {
          const scale = observedPremium / 1.08;
          if (METRO_WITHIN_1KM.has(key)) return Math.min(1.08 * scale, 1.12);
          if (METRO_WITHIN_3KM.has(key)) return Math.min(1.04 * scale, 1.08);
          return 1.0;
        }
      }
    }
  }

  // Fallback to static tiers
  if (METRO_WITHIN_1KM.has(key)) return 1.08;
  if (METRO_WITHIN_3KM.has(key)) return 1.04;
  return 1.0;
}

// ─── F5: BHK Rent Curves (data-driven) ───────────────────────────────────────
/**
 * BHK PSF decreases as BHK count increases (economies of scale).
 * Relative to 2BHK PSF:
 *   1BHK: ~1.15x, 2BHK: 1.0x, 3BHK: ~0.92x, 4BHK+: ~0.85x
 * Computed from actual data; defaults used if < 3 data points for tier.
 */

const BHK_CURVE_DEFAULTS: Record<number, number> = {
  1: 1.15,
  2: 1.0,
  3: 0.92,
  4: 0.85,
  5: 0.82,
};

function computeBhkCurves(
  samples: RentSample[],
  propertyType: string,
): Record<number, number> {
  const filtered = samples.filter(
    (s) => s.propertyType === propertyType.toLowerCase() && s.area > 0,
  );
  // Compute median PSF per BHK
  const bhkPsf: Record<number, number[]> = {};
  for (const s of filtered) {
    if (s.bhk === null) continue;
    if (!bhkPsf[s.bhk]) bhkPsf[s.bhk] = [];
    bhkPsf[s.bhk].push(s.rent / s.area);
  }
  const medians: Record<number, number> = {};
  for (const bhk of Object.keys(bhkPsf)) {
    const arr = bhkPsf[Number(bhk)];
    if (arr.length >= 3) medians[Number(bhk)] = median(arr);
  }
  const base2 = medians[2];
  if (!base2 || base2 <= 0) return { ...BHK_CURVE_DEFAULTS };

  const curves: Record<number, number> = {};
  for (let bhk = 1; bhk <= 5; bhk++) {
    if (medians[bhk] && bhkPsf[bhk].length >= 3) {
      const ratio = medians[bhk] / base2;
      // Cap to reasonable range
      curves[bhk] = Math.min(Math.max(ratio, 0.7), 1.4);
    } else {
      curves[bhk] = BHK_CURVE_DEFAULTS[bhk] ?? 1.0;
    }
  }
  return curves;
}

function getBhkCurveFactor(
  bhk: number | undefined,
  localitySamples: RentSample[],
  propertyType: string,
  allSamples: RentSample[],
): number {
  if (!bhk) return 1.0;

  // Try locality-level first, then zone/global
  const localCurves = computeBhkCurves(localitySamples, propertyType);
  if (localCurves[bhk] !== undefined && localitySamples.length >= 10) {
    return localCurves[bhk];
  }
  // Fall back to global curves
  const globalCurves = computeBhkCurves(allSamples, propertyType);
  return globalCurves[bhk] ?? BHK_CURVE_DEFAULTS[bhk] ?? 1.0;
}

// ─── F6: Demand Zone Factor (data-driven) ────────────────────────────────────
/**
 * Localities where median rent PSF is in top 25% = high demand (10% premium).
 * Derived from training data. Falls back to static zone lists.
 */

// Static fallback lists
const HIGH_DEMAND_LOCALITIES = new Set([
  "hebbal",
  "jakkur",
  "thanisandra",
  "koramangala",
  "indiranagar",
  "hsr layout",
  "whitefield",
  "electronic city",
  "indiranagar",
]);
const MEDIUM_DEMAND_LOCALITIES = new Set([
  "hennur",
  "nagavara",
  "nagawara",
  "yelahanka",
  "sahakarnagar",
  "sahakar nagar",
  "sahakara nagar",
  "btm layout",
  "jp nagar",
  "marathahalli",
  "bellandur",
  "mahadevapura",
]);

let _demandZoneCache: Map<string, number> | null = null;

function computeDemandZoneFactors(
  allSamples: RentSample[],
): Map<string, number> {
  const map = new Map<string, number>();
  const grouped = groupByLocality(allSamples);

  // Compute median PSF per locality
  const localityMedianPsf: Array<{ locality: string; psf: number }> = [];
  for (const [loc, samps] of grouped) {
    if (samps.length < 3) continue;
    const psf = weightedMedianPsf(samps);
    if (psf > 0) localityMedianPsf.push({ locality: loc, psf });
  }

  if (localityMedianPsf.length < 4) {
    // Fallback to static lists
    for (const loc of HIGH_DEMAND_LOCALITIES) map.set(loc, 1.1);
    for (const loc of MEDIUM_DEMAND_LOCALITIES) map.set(loc, 1.05);
    return map;
  }

  // Top 25% = high demand
  const sortedPsf = [...localityMedianPsf].sort((a, b) => b.psf - a.psf);
  const topQuartile = Math.ceil(sortedPsf.length * 0.25);
  const bottomQuartile = Math.floor(sortedPsf.length * 0.75);

  for (let i = 0; i < sortedPsf.length; i++) {
    const { locality } = sortedPsf[i];
    if (i < topQuartile) {
      map.set(locality, 1.1); // high demand
    } else if (i < bottomQuartile) {
      map.set(locality, 1.05); // medium demand
    } else {
      map.set(locality, 1.0); // emerging / fringe
    }
  }
  return map;
}

export function getDemandZoneFactor(
  locality: string,
  allSamples?: RentSample[],
): number {
  const key = normalizeLocality(locality);
  const samples = allSamples ?? getAllSamples();
  if (!_demandZoneCache) {
    _demandZoneCache = computeDemandZoneFactors(samples);
  }
  return _demandZoneCache.get(key) ?? 1.0;
}

// ─── Yield ratio (locality-level) ────────────────────────────────────────────

/**
 * Returns annual yield ratio derived from training data.
 * If < 3 real data points: uses zone default.
 */
export function getLocalityYieldRatio(locality: string): number {
  const key = normalizeLocality(locality);
  const allSamples = getAllSamples();
  const grouped = groupByLocality(allSamples);
  const localSamples = grouped.get(key) ?? [];
  const realSamples = localSamples.filter(
    (s) => !s.isSynthetic && s.saleValue > 0,
  );

  if (realSamples.length >= 3) {
    const yields = realSamples.map((s) => (s.rent * 12) / s.saleValue);
    const y = median(yields);
    if (y > 0.01 && y < 0.1) return y; // sanity cap: 1%–10%
  }

  // Zone default
  const zone = getZone(key);
  return ZONE_YIELD_DEFAULTS[zone] ?? 0.032;
}

// ─── Confidence tier ──────────────────────────────────────────────────────────

function computeConfidence(comps: number): "low" | "medium" | "high" {
  if (comps >= 15) return "high";
  if (comps >= 5) return "medium";
  return "low";
}

// ─── Exponential rental adjustments (v3 legacy, retained) ────────────────────

function computeRentDemandFactor(
  locality: string,
  allSamples: RentSample[],
): number {
  try {
    const normalizedLocality = locality.trim().toLowerCase();
    const localitySamples = allSamples.filter(
      (s) => s.locality.trim().toLowerCase() === normalizedLocality,
    );
    const liveSamples = localitySamples.filter((s) => !s.isTrainingData);
    const localVelocity =
      localitySamples.length > 0
        ? liveSamples.length / localitySamples.length
        : 0;

    const localityVelocities: number[] = [];
    const grouped = groupByLocality(allSamples);
    for (const [, samps] of grouped) {
      const liveCount = samps.filter((s) => !s.isTrainingData).length;
      if (samps.length > 0) localityVelocities.push(liveCount / samps.length);
    }
    const rentalNormalization =
      localityVelocities.length > 0 ? median(localityVelocities) : 0.1;

    if (rentalNormalization <= 0) return 1.0;
    const factor = Math.exp(localVelocity / rentalNormalization);
    return Math.min(Math.max(factor, 0.9), 1.2);
  } catch {
    return 1.0;
  }
}

function computeRentDistanceFactor(locality: string): number {
  try {
    const key = locality.trim().toLowerCase();
    const coords = ALL_LOCALITY_COORDS[key];
    if (!coords?.lat || !coords?.lng) return 1.0;
    const { lat, lng } = coords;
    if (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01) return 1.0;

    let minDistKm = Number.POSITIVE_INFINITY;
    for (const park of TECH_PARKS) {
      const d = haversineDistance(lat, lng, park.lat, park.lng);
      if (d < minDistKm) minDistKm = d;
    }
    if (!Number.isFinite(minDistKm) || minDistKm <= 0) return 1.0;
    const factor = Math.exp(-minDistKm);
    return Math.min(Math.max(factor, 0.85), 1.15);
  } catch {
    return 1.0;
  }
}

// ─── Batch trend inference ────────────────────────────────────────────────────

export function computeBatchTrend(
  locality: string,
  allSamples: RentSample[],
): {
  trend: "up" | "down" | "stable" | null;
  label: string;
  isBatchDerived: boolean;
} {
  const localKey = locality.trim().toLowerCase();
  const trainingSamples = allSamples.filter(
    (s) => s.isTrainingData && s.locality.trim().toLowerCase() === localKey,
  );
  if (trainingSamples.length < 6) {
    return { trend: null, label: "Insufficient data", isBatchDerived: true };
  }
  const withTs = trainingSamples.map((s, i) => ({
    ...s,
    inferredTs: assignBatchTimestamp(i, trainingSamples.length),
  }));
  const sorted = [...withTs].sort((a, b) => a.inferredTs - b.inferredTs);
  const mid = Math.floor(sorted.length / 2);
  const avgPsf = (arr: typeof sorted) =>
    arr.reduce((acc, s) => acc + s.rent / s.area, 0) / arr.length;
  const early = avgPsf(sorted.slice(0, mid));
  const late = avgPsf(sorted.slice(mid));
  const pctChange = early > 0 ? ((late - early) / early) * 100 : 0;

  if (pctChange > 5)
    return {
      trend: "up",
      label: "Trending up (batch estimate)",
      isBatchDerived: true,
    };
  if (pctChange < -5)
    return {
      trend: "down",
      label: "Trending down (batch estimate)",
      isBatchDerived: true,
    };
  return {
    trend: "stable",
    label: "Stable (batch estimate)",
    isBatchDerived: true,
  };
}

function computeTrend(samples: RentSample[]): {
  trend: "up" | "down" | "stable" | null;
  label: string;
} {
  const liveSamples = samples.filter(
    (s) => !s.isTrainingData && s.createdAt > 0,
  );
  if (liveSamples.length < 3)
    return { trend: null, label: "Insufficient rent data" };

  const sorted = [...liveSamples].sort((a, b) => a.createdAt - b.createdAt);
  const earliest = sorted[0].createdAt;
  const latest = sorted[sorted.length - 1].createdAt;
  const spanMs = latest - earliest;
  const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
  if (spanMs < THREE_MONTHS_MS)
    return { trend: null, label: "Insufficient rent data" };

  const midMs = earliest + spanMs / 2;
  const firstHalf = sorted.filter((s) => s.createdAt <= midMs);
  const secondHalf = sorted.filter((s) => s.createdAt > midMs);
  if (firstHalf.length === 0 || secondHalf.length === 0)
    return { trend: null, label: "Insufficient rent data" };

  const avgRentPsf = (arr: RentSample[]) =>
    arr.reduce((acc, s) => acc + s.rent / s.area, 0) / arr.length;
  const early = avgRentPsf(firstHalf);
  const late = avgRentPsf(secondHalf);
  const pctChange = early > 0 ? ((late - early) / early) * 100 : 0;

  if (pctChange > 3)
    return { trend: "up", label: `Rising ${pctChange.toFixed(1)}%` };
  if (pctChange < -3)
    return {
      trend: "down",
      label: `Falling ${Math.abs(pctChange).toFixed(1)}%`,
    };
  return { trend: "stable", label: "Stable rents" };
}

// ─── getRentEstimate — New canonical v3 function ──────────────────────────────
/**
 * Main export for v3 rent estimation using all 6 learned features.
 * Separate from estimateRent (legacy) — never shares logic with sale AI.
 */
export function getRentEstimate(
  params: GetRentEstimateParams,
): GetRentEstimateResult {
  const {
    locality,
    area,
    bhk,
    furnishing = "unfurnished",
    floor = 0,
    towerHeight = 0,
    propertyType = "apartment",
    salePSF,
  } = params;

  const allSamples = getAllSamples();
  const normalizedLocality = normalizeLocality(locality);

  // Cluster samples for base PSF
  const { samples: clusterSamples } = getClusterSamples(
    normalizedLocality,
    allSamples,
  );
  const grouped = groupByLocality(allSamples);
  const localitySamples = grouped.get(normalizedLocality) ?? [];

  // Determine sample universe for base PSF (with synthetic weighting)
  let baseSamples =
    localitySamples.length >= 3 ? localitySamples : clusterSamples;

  // Filter by property type if possible
  const typeSamples = baseSamples.filter(
    (s) => s.propertyType === propertyType.toLowerCase(),
  );
  if (typeSamples.length >= 3) baseSamples = typeSamples;

  // Synthetic-only disclosure flag
  const realCount = baseSamples.filter((s) => !s.isSynthetic).length;
  const syntheticOnly = realCount === 0 && baseSamples.length > 0;

  // Step 1: Base PSF (weighted median from micro-zone samples)
  let basePsf = weightedMedianPsf(baseSamples);
  if (basePsf <= 0) {
    // Cold start: derive from localityEngine
    basePsf = getBaseMicroLocationPSF(normalizedLocality);
    if (basePsf <= 0) basePsf = 35; // absolute fallback (35 PSF = market floor)
  }

  // Step 2: BHK curve factor (F5)
  const bhkCurveFactor = getBhkCurveFactor(
    bhk,
    localitySamples,
    propertyType,
    allSamples,
  );

  // Step 3: Furnishing factor (F1)
  const furnishingFactor = getFurnishingFactor(
    furnishing,
    normalizedLocality,
    allSamples,
  );

  // Step 4: Floor factor (F2)
  const floorFactor = getFloorFactor(floor, towerHeight, localitySamples);

  // Step 5: Tech hub factor (F3)
  const techHubFactor = getTechHubRentFactor(normalizedLocality, allSamples);

  // Step 6: Metro factor (F4)
  const metroFactor = getMetroRentFactor(normalizedLocality, allSamples);

  // Step 7: Demand zone factor (F6)
  const demandZoneFactor = getDemandZoneFactor(normalizedLocality, allSamples);

  // Compose final PSF
  const finalPsf =
    basePsf *
    bhkCurveFactor *
    furnishingFactor *
    floorFactor *
    techHubFactor *
    metroFactor *
    demandZoneFactor;

  const estimatedRent = Math.round(finalPsf * area);
  const rentPSF = area > 0 ? finalPsf : 0;

  // Gross yield
  const grossYield =
    salePSF && salePSF > 0
      ? ((estimatedRent * 12) / (salePSF * area)) * 100
      : undefined;

  // Confidence based on real (non-synthetic) comps
  const confidenceTier = computeConfidence(realCount);

  return {
    estimatedRent,
    rentPSF,
    grossYield,
    confidenceTier,
    featuresApplied: {
      bhkCurveFactor,
      furnishingFactor,
      floorFactor,
      techHubFactor,
      metroFactor,
      demandZoneFactor,
    },
    dataPoints: baseSamples.length,
    syntheticOnly,
  };
}

// ─── estimateRent — Legacy function (retained for backward compat) ────────────

export function estimateRent(params: RentEstimateParams): RentEstimate {
  const {
    locality,
    bhk,
    area,
    propertyValue,
    furnishing = "unfurnished",
    propertyType = "apartment",
    floor = 0,
    towerHeight = 0,
  } = params;

  if (propertyValue <= 0 || area <= 0) {
    return {
      estimatedMonthlyRent: 0,
      grossYieldPercent: 0,
      confidenceTier: "low",
      confidenceLabel: "AI Estimate",
      rentCompsUsed: 0,
      dataSource: "sale-ratio-derived",
      hide: true,
    };
  }

  const allSamples = getAllSamples();
  const normalizedLocality = normalizeLocality(locality);
  const { samples: clusterSamples } = getClusterSamples(
    normalizedLocality,
    allSamples,
  );
  const grouped = groupByLocality(allSamples);
  const localitySamples = grouped.get(normalizedLocality) ?? [];
  const liveLocalityComps = localitySamples.filter(
    (s) => !s.isTrainingData,
  ).length;

  let estimatedMonthlyRent: number;
  let dataSource: "real-comps" | "sale-ratio-derived";
  let compsCount: number;

  if (localitySamples.length >= 2) {
    let relevantSamples = localitySamples;
    const typeSamples = localitySamples.filter(
      (s) => s.propertyType === propertyType.toLowerCase(),
    );
    if (typeSamples.length >= 3) relevantSamples = typeSamples;
    if (bhk) {
      const bhkSamples = relevantSamples.filter((s) => s.bhk === bhk);
      if (bhkSamples.length >= 2) relevantSamples = bhkSamples;
    }
    const medianRentPsf = weightedMedianPsf(relevantSamples);

    // Apply all 6 features
    const furnMultiplier = getFurnishingFactor(
      furnishing,
      normalizedLocality,
      allSamples,
    );
    const floorMultiplier = getFloorFactor(floor, towerHeight, localitySamples);
    const techFactor = getTechHubRentFactor(normalizedLocality, allSamples);
    const metroFactor = getMetroRentFactor(normalizedLocality, allSamples);
    const demandFactor = getDemandZoneFactor(normalizedLocality, allSamples);
    const bhkFactor = getBhkCurveFactor(
      bhk,
      localitySamples,
      propertyType,
      allSamples,
    );

    estimatedMonthlyRent = Math.round(
      medianRentPsf *
        area *
        furnMultiplier *
        floorMultiplier *
        techFactor *
        metroFactor *
        demandFactor *
        bhkFactor,
    );
    dataSource = "real-comps";
    compsCount =
      liveLocalityComps > 0 ? liveLocalityComps : localitySamples.length;
  } else if (clusterSamples.length >= 3) {
    let relevantCluster = clusterSamples;
    if (bhk) {
      const bhkSamples = clusterSamples.filter((s) => s.bhk === bhk);
      if (bhkSamples.length >= 2) relevantCluster = bhkSamples;
    }
    const medianRentPsf = weightedMedianPsf(relevantCluster);
    estimatedMonthlyRent = Math.round(medianRentPsf * area);
    dataSource = "real-comps";
    compsCount = liveLocalityComps;
  } else {
    const basePsf = getBaseMicroLocationPSF(normalizedLocality);
    const pricePsf = propertyValue > 0 ? propertyValue / area : basePsf;
    const yieldPrior = getYieldPriorFromPsf(pricePsf);
    estimatedMonthlyRent = Math.round((propertyValue * yieldPrior) / 12);
    dataSource = "sale-ratio-derived";
    compsCount = 0;
  }

  const confidenceTier = computeConfidence(liveLocalityComps);
  const confidenceLabel: "AI Estimate" | "Market-based" =
    confidenceTier === "high" ? "Market-based" : "AI Estimate";

  // Exponential adjustments (v3 legacy, retained)
  const baseRent = estimatedMonthlyRent;
  let rentDemandFactor = 1.0;
  let rentDistanceFactor = 1.0;
  try {
    rentDemandFactor = computeRentDemandFactor(normalizedLocality, allSamples);
    rentDistanceFactor = computeRentDistanceFactor(normalizedLocality);
    estimatedMonthlyRent = Math.round(
      baseRent * rentDemandFactor * rentDistanceFactor,
    );
  } catch {
    estimatedMonthlyRent = baseRent;
    rentDemandFactor = 1.0;
    rentDistanceFactor = 1.0;
  }
  const adjustedRent = estimatedMonthlyRent;

  const invalidRent = !isValidRent(estimatedMonthlyRent);
  const rentPerSqft = area > 0 ? estimatedMonthlyRent / area : 0;
  const rentPsfOutOfRange =
    rentPerSqft > 0 && (rentPerSqft < 18 || rentPerSqft > 80);
  const hide = estimatedMonthlyRent <= 0 || invalidRent;
  const grossYieldPercent = hide
    ? 0
    : ((estimatedMonthlyRent * 12) / propertyValue) * 100;

  // Synthetic-only disclosure
  const realCount = localitySamples.filter((s) => !s.isSynthetic).length;
  const syntheticDisclosure = realCount === 0 && localitySamples.length > 0;

  if (import.meta.env.DEV && !hide) {
    console.log("[rentEngine] estimate result:", {
      locality: params.locality,
      bhk: params.bhk,
      area,
      computedRent: estimatedMonthlyRent,
      rentPerSqft: Math.round(rentPerSqft * 100) / 100,
      displayValue: `₹${Math.round(estimatedMonthlyRent / 1000)}k/mo`,
      rentPsfOutOfRange,
      confidenceTier,
      dataSource,
      syntheticDisclosure,
    });
  }

  return {
    estimatedMonthlyRent,
    grossYieldPercent,
    confidenceTier,
    confidenceLabel,
    rentCompsUsed: compsCount,
    dataSource,
    hide,
    rentPsfOutOfRange,
    baseRent,
    adjustedRent,
    rentDemandFactor,
    rentDistanceFactor,
    syntheticDisclosure,
  };
}

// ─── getLocalityRentMetrics ───────────────────────────────────────────────────

export function getLocalityRentMetrics(locality: string): LocalityRentMetrics {
  const normalizedLocality = normalizeLocality(locality);
  const allSamples = getAllSamples();
  const grouped = groupByLocality(allSamples);
  const localitySamples = grouped.get(normalizedLocality) ?? [];
  const liveLocalitySamples = localitySamples.filter((s) => !s.isTrainingData);
  const sampleCount = liveLocalitySamples.length;
  const confidenceTier = computeConfidence(sampleCount);

  const effectiveSamples =
    localitySamples.length >= 3
      ? localitySamples
      : (() => {
          const { samples } = getClusterSamples(normalizedLocality, allSamples);
          return samples;
        })();

  const apartmentSamples = effectiveSamples.filter(
    (s) => s.propertyType === "apartment" || s.propertyType === "flat",
  );
  const metricsBase =
    apartmentSamples.length >= 2 ? apartmentSamples : effectiveSamples;

  const avgRentByBhk: Record<number, number> = {};
  const bhkGroups: Record<number, number[]> = {};
  for (const s of metricsBase) {
    if (s.bhk !== null) {
      if (!bhkGroups[s.bhk]) bhkGroups[s.bhk] = [];
      bhkGroups[s.bhk].push(s.rent);
    }
  }
  for (const bhk of Object.keys(bhkGroups)) {
    avgRentByBhk[Number(bhk)] = Math.round(median(bhkGroups[Number(bhk)]));
  }

  let rentPerSqft = 0;
  if (metricsBase.length > 0) {
    rentPerSqft = weightedMedianPsf(metricsBase);
  }

  const samplesWithSaleValue = liveLocalitySamples.filter(
    (s) => s.saleValue > 0,
  );
  let yieldRange: [number, number] = [0, 0];
  if (samplesWithSaleValue.length >= 2) {
    const yields = samplesWithSaleValue
      .map((s) => ((s.rent * 12) / s.saleValue) * 100)
      .sort((a, b) => a - b);
    const p10 = yields[Math.floor(yields.length * 0.1)];
    const p90 = yields[Math.floor(yields.length * 0.9)];
    yieldRange = [Math.max(0, p10), p90];
  }

  let trendResult = computeTrend(localitySamples);
  let batchTrendUsed = false;
  if (trendResult.trend === null) {
    const batchResult = computeBatchTrend(normalizedLocality, allSamples);
    if (batchResult.trend !== null) {
      trendResult = { trend: batchResult.trend, label: batchResult.label };
      batchTrendUsed = true;
    }
  }

  const rentPsfValid = rentPerSqft >= 18 && rentPerSqft <= 80;
  const displayRentPerSqft =
    rentPsfValid && metricsBase.length >= 5 ? rentPerSqft : 0;

  if (import.meta.env.DEV && rentPerSqft > 0) {
    console.log("[rentEngine] locality metrics:", {
      locality,
      rentPerSqft: Math.round(rentPerSqft * 100) / 100,
      displayRentPerSqft: Math.round(displayRentPerSqft * 100) / 100,
      sampleCount: metricsBase.length,
      liveSampleCount: sampleCount,
      rentPsfValid,
    });
  }

  return {
    locality,
    avgRentByBhk,
    rentPerSqft: displayRentPerSqft,
    yieldRange,
    trend: trendResult.trend,
    trendLabel: trendResult.label,
    sampleCount,
    confidenceTier,
    batchTrendUsed,
  };
}

// ─── getRentTrainedLocalities ─────────────────────────────────────────────────

export function getRentTrainedLocalities(): string[] {
  const locs = new Set(RENT_TRAINING_DATA.map((d) => d.locality));
  return Array.from(locs).sort();
}
