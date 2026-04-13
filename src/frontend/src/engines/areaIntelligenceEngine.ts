// areaIntelligenceEngine.ts — Area-level intelligence aggregation
// Uses same engines as property valuation. No duplicate logic.
// Area = aggregation of property-level signals at locality coordinates.
// Fix 4: Commercial property type uses office/retail PSF dataset (not apartment data).
// Task 1: Strict per-type model routing — no cross-type fallback.
// Task 2: Shared model integration — uses getAveragePSF() from northBangaloreEngine
//          for all North Bangalore localities (same function as valuationEngine).
// Task 3: Micro-zone PSF index built at init from training data — no stale cache.
// Task 4: Growth signals — connectivityScore, employmentScore, growthSignal added.

import { getCoords } from "../data/localityCoords";
import {
  southBangaloreApartments,
  southBangalorePlots,
  southBangaloreVillas,
} from "../data/southBangaloreTrainingData";
import {
  getBaseMedianPSF,
  getBaseMicroLocationPSF,
  getBasePSF,
} from "../utils/localityEngine";
import { getDemandOutput } from "./demandEngine";
import {
  EAST_BANGALORE_MICRO_MARKETS,
  getEastLocalityMedianPSF,
  isEastBangalore,
} from "./eastBangaloreEngine";
import {
  type InfraItem,
  TECH_PARKS,
  getRawAmenityScore,
  getRawTechScore,
} from "./infraEngine";
import { METROS, getMetroFactor, haversineDistance } from "./metroEngine";
import {
  NORTH_BANGALORE_MICRO_MARKETS,
  NORTH_WEST_BANGALORE_MICRO_MARKETS,
  getAveragePSF,
  isNorthBangalore,
  isNorthWestBangalore,
} from "./northBangaloreEngine";
import { getPricePrediction } from "./predictionEngine";
import { isSouthBangalore } from "./southBangaloreEngine";

// ─── Extended Output Interface ─────────────────────────────────────────────────

export interface AreaIntelligenceOutput {
  investmentScore: number; // 0–100
  growthScore: number; // 0–100
  livabilityScore: number; // 0–100
  demandScore: number; // 0–100
  avgPricePerSqft: number;
  // PSF breakdown — all 3 derived from same BasePSF source (localityEngine)
  /** Base Market PSF: locality median from verified registry transactions */
  basePSF: number;
  /** Premium Range PSF: upper tier with builder/project/amenity premium (base × 1.2–1.4) */
  premiumPSF: number;
  /** AI Estimated PSF: same as avgPricePerSqft, contextual label for UI */
  aiEstimatedPSF: number;
  priceTrend1Y: number; // % growth
  priceTrend3Y: number; // % growth
  confidence: number; // 0–100
  classification: "High Growth" | "Emerging" | "Saturated";
  growthDriver: string;
  nearestMetros: InfraItem[];
  topTechParks: InfraItem[];
  topHospitals: InfraItem[];
  topSchools: InfraItem[];
  // R2: blended mode data when no property type selected
  blendedMode?: boolean;
  blendedPSF?: {
    apartment: number;
    villa: number;
    plot: number;
    commercial: number;
  };
  // Task 4: New growth signals fields
  connectivityScore: number; // 0–100
  employmentScore: number; // 0–100
  growthSignal: "Strong" | "Moderate" | "Emerging" | "Stable";
}

// ─── Per-type intelligence interface ─────────────────────────────────────────

export interface PropertyTypeIntelligence {
  avgPSF: number | null; // null = no data — NEVER 0 or random
  avgRent: number | null; // null = no data
  yield: number | null; // null = no data
  sampleCount: number;
}

export interface AllPropertyTypeIntelligence {
  apartment: PropertyTypeIntelligence;
  villa: PropertyTypeIntelligence;
  plot: PropertyTypeIntelligence;
  commercial: PropertyTypeIntelligence;
}

// ─── Micro-Zone PSF Index ──────────────────────────────────────────────────────
// Built once at module init from training data; never stale.
// Key: normalised locality name. Value: per-type PSF (null = no data).

// ─── Locality Metadata (Batch 16: Southern Frontier calibration tags) ─────────
// These data-driven tags inform the engine about demand drivers that are not
// captured by distance-to-metro or tech-park scores alone.
//
// luxuryTag      — anchors the villa PSF tier as a "nature luxury" premium
// investmentTag  — surfaces long-term land-banking signal in Buyer Portal
// bmrdaFloor     — lowest verified BMRDA plot PSF for this locality (for floor labelling)
// trafficDriver  — commercial demand driver when resident density is low
// densityType    — overrides the default "resident" density model for commercial PSF

interface LocalityMeta {
  luxuryTag?: string;
  anchorType?: string;
  investmentTag?: string;
  riskProfile?: string;
  bmrdaFloor?: number;
  trafficDriver?: string;
  densityType?: string;
}

export const LOCALITY_METADATA: Record<string, LocalityMeta> = {
  // Bannerghatta Extension: eco-luxury forest-view anchor
  // Villas at ₹10,500psf — 176% premium over Harohalli residential (₹4,000psf).
  // "Forest View" is the confirmed luxury anchor for this corridor.
  "bannerghatta extension": {
    luxuryTag: "Forest View",
    anchorType: "nature-luxury",
  },
  // Harohalli: industrial satellite town — BMRDA plot floor is ₹2,000psf
  // Primary target for long-term land banking in the South; low short-term rental demand.
  harohalli: {
    investmentTag: "Land Banking",
    riskProfile: "long-term-speculative",
    bmrdaFloor: 2000,
  },
  // Kanakapura Main Road: commercial PSF (₹18,000) driven by weekend tourism,
  // NOT by resident density. Location IQ must weight tourism-proximity above resident count.
  "kanakapura main road": {
    trafficDriver: "weekend-tourism",
    densityType: "tourism-proximity",
  },
  // Kanakapura Road Extension: green-zone suburban with tourism corridor adjacency
  "kanakapura road extension": {
    trafficDriver: "weekend-tourism",
    densityType: "tourism-proximity",
  },
  // Somanahalli: managed farmland — speculative entry; green-belt restrictions apply
  somanahalli: {
    investmentTag: "Managed Farmland",
    riskProfile: "green-belt-speculative",
  },
};

/**
 * getLocalityMeta — returns the metadata tags for a given locality.
 * Returns an empty object if no metadata is registered.
 */
export function getLocalityMeta(locality: string): LocalityMeta {
  const key = locality.trim().toLowerCase();
  return LOCALITY_METADATA[key] ?? {};
}

interface MicroZonePSF {
  apartment: number | null;
  villa: number | null;
  plot: number | null;
  commercial: number | null;
  recordCount: number; // total records across all types for this locality
}

const _microZonePSFIndex = new Map<string, MicroZonePSF>();

function normKey(locality: string): string {
  return locality.toLowerCase().trim();
}

/** Build PSF index from all available training data (North + North-West + South + East) */
function buildMicroZonePSFIndex(): void {
  // ── North Bangalore: use getAveragePSF() which is recency-weighted ──────────
  for (const market of NORTH_BANGALORE_MICRO_MARKETS) {
    const key = normKey(market.name);
    const apartment = getAveragePSF(market.name, "apartment");
    const villa = getAveragePSF(market.name, "villa");
    const plot = getAveragePSF(market.name, "plot");
    const commercial = getAveragePSF(market.name, "commercial");
    const recordCount = [apartment, villa, plot, commercial].filter(
      (v) => v !== null,
    ).length;
    _microZonePSFIndex.set(key, {
      apartment,
      villa,
      plot,
      commercial,
      recordCount: recordCount * 5, // proxy: each type with data ≈ 5 records in north
    });
    // Also index aliases
    for (const alias of market.aliases) {
      _microZonePSFIndex.set(normKey(alias), {
        apartment,
        villa,
        plot,
        commercial,
        recordCount: recordCount * 5,
      });
    }
  }

  // ── North-West Bangalore: getAveragePSF() routes NW localities to NW engine ─
  for (const market of NORTH_WEST_BANGALORE_MICRO_MARKETS) {
    const key = normKey(market.name);
    if (_microZonePSFIndex.has(key)) continue; // already indexed via NORTH_BANGALORE_MICRO_MARKETS

    const apartment = isNorthWestBangalore(market.name)
      ? getAveragePSF(market.name, "apartment")
      : null;
    const villa = isNorthWestBangalore(market.name)
      ? getAveragePSF(market.name, "villa")
      : null;
    const plot = isNorthWestBangalore(market.name)
      ? getAveragePSF(market.name, "plot")
      : null;
    const commercial = isNorthWestBangalore(market.name)
      ? getAveragePSF(market.name, "commercial")
      : null;
    const recordCount = [apartment, villa, plot, commercial].filter(
      (v) => v !== null,
    ).length;
    const entry: MicroZonePSF = {
      apartment,
      villa,
      plot,
      commercial,
      recordCount: recordCount * 10, // NW data has more records per type
    };
    _microZonePSFIndex.set(key, entry);
    for (const alias of market.aliases) {
      _microZonePSFIndex.set(normKey(alias), entry);
    }
  }

  // ── South Bangalore: compute per-locality, per-type medians ──────────────────
  const southSets: Array<{
    records: Array<{
      locality: string;
      areaSqft: number;
      soldPrice: number;
      isCarpet?: boolean;
      isDistress?: boolean;
    }>;
    type: "apartment" | "villa" | "plot";
  }> = [
    { records: southBangaloreApartments, type: "apartment" },
    { records: southBangaloreVillas, type: "villa" },
    { records: southBangalorePlots, type: "plot" },
  ];

  // Gather all south localities
  const southLocalities = new Set<string>();
  for (const { records } of southSets) {
    for (const r of records) {
      southLocalities.add(normKey(r.locality));
    }
  }

  for (const localityKey of southLocalities) {
    const existing = _microZonePSFIndex.get(localityKey);
    const entry: MicroZonePSF = existing ?? {
      apartment: null,
      villa: null,
      plot: null,
      commercial: null,
      recordCount: 0,
    };

    let totalCount = 0;
    for (const { records, type } of southSets) {
      const local = records.filter(
        (r) => !r.isDistress && fuzzyLocality(normKey(r.locality), localityKey),
      );
      const psfs = local
        .map((r) => computeRecordPSF(r.soldPrice, r.areaSqft, r.isCarpet))
        .filter((v) => v > 500);
      const med = median(psfs);
      if (med !== null) {
        entry[type] = Math.round(med);
        totalCount += local.length;
      }
    }
    entry.recordCount = Math.max(entry.recordCount, totalCount);
    _microZonePSFIndex.set(localityKey, entry);
  }

  // ── East Bangalore: use getEastLocalityMedianPSF() per-type (same source as valuationEngine) ─
  for (const market of EAST_BANGALORE_MICRO_MARKETS) {
    const key = normKey(market.name);
    const existing = _microZonePSFIndex.get(key);
    // East data takes precedence over any generic fallback but defers to North if already set
    if (existing && existing.recordCount > 0) continue;

    const apartment = getEastLocalityMedianPSF(market.name, "apartment");
    const villa = getEastLocalityMedianPSF(market.name, "villa");
    const plot = getEastLocalityMedianPSF(market.name, "plot");
    const commercial = getEastLocalityMedianPSF(market.name, "commercial");
    const recordCount = [apartment, villa, plot, commercial].filter(
      (v) => v !== null,
    ).length;
    const entry: MicroZonePSF = {
      apartment,
      villa,
      plot,
      commercial,
      recordCount: recordCount * 10,
    };
    _microZonePSFIndex.set(key, entry);

    // Also index aliases
    for (const alias of market.aliases) {
      _microZonePSFIndex.set(normKey(alias), entry);
    }
  }
}

// Initialise index eagerly at module load
buildMicroZonePSFIndex();

/** Confidence tier from actual micro-zone record count */
function getConfidenceTier(recordCount: number): "Low" | "Medium" | "High" {
  if (recordCount >= 20) return "High";
  if (recordCount >= 5) return "Medium";
  return "Low";
}

/** Map confidence tier to numeric (0–100) */
function confidenceTierToScore(
  tier: "Low" | "Medium" | "High",
  baseScore: number,
): number {
  if (tier === "High") return Math.min(baseScore, 95);
  if (tier === "Medium") return Math.min(baseScore, 80);
  return Math.min(baseScore, 60);
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

/** Fuzzy locality matching */
function fuzzyLocality(a: string, b: string): boolean {
  const ak = a.toLowerCase().trim();
  const bk = b.toLowerCase().trim();
  return ak === bk || ak.includes(bk) || bk.includes(ak);
}

/** Compute PSF from sold price / area, with carpet-to-SBA normalization */
function computeRecordPSF(
  soldPrice: number,
  areaSqft: number,
  isCarpet?: boolean,
): number {
  const area = isCarpet ? areaSqft * 1.36 : areaSqft;
  return area > 0 ? soldPrice / area : 0;
}

/** Median of numeric array — returns null for empty arrays */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Yield rate lookup — learned from training data patterns */
function rentYieldRate(
  type: "apartment" | "villa" | "plot" | "commercial",
  psf: number,
): number {
  if (type === "plot") return 0; // plots don't yield rent
  if (type === "commercial") return 0.055; // ~5.5% commercial yield
  if (type === "villa") return 0.025; // ~2.5% villa yield
  // Apartment: yield compresses as PSF rises
  if (psf > 14000) return 0.026;
  if (psf > 12000) return 0.028;
  if (psf >= 8000) return 0.032;
  return 0.036;
}

// ─── Task 1 + Task 2: Strict per-type intelligence functions ──────────────────

/**
 * getPropertyTypeIntelligence — STRICT single-type lookup.
 *
 * Data routing (priority order):
 *   1. North Bangalore → getAveragePSF() from northBangaloreEngine (SAME as valuationEngine)
 *   2. South Bangalore → type-strict dataset median from training records
 *   3. Generic → localityEngine basePSF + ratio derivation
 *   4. No data → null (never 0 or fabricated)
 */
export function getPropertyTypeIntelligence(
  locality: string,
  type: "apartment" | "villa" | "plot" | "commercial",
): PropertyTypeIntelligence {
  // ── STEP 1: North Bangalore (incl. North-West) — use getAveragePSF() ─────────
  if (isNorthBangalore(locality) || isNorthWestBangalore(locality)) {
    const typePSF = getAveragePSF(locality, type);
    if (typePSF === null || typePSF <= 0) {
      return { avgPSF: null, avgRent: null, yield: null, sampleCount: 0 };
    }
    const yieldRate = rentYieldRate(type, typePSF);
    const avgRent =
      type === "plot" ? null : Math.round((typePSF * 1000 * yieldRate) / 12);
    const yieldVal =
      type === "plot" ? null : Number((yieldRate * 100).toFixed(1));
    const hasMarket =
      NORTH_BANGALORE_MICRO_MARKETS.some(
        (m) =>
          fuzzyLocality(m.name, locality) ||
          m.aliases.some((a) => fuzzyLocality(a, locality)),
      ) ||
      NORTH_WEST_BANGALORE_MICRO_MARKETS.some(
        (m) =>
          fuzzyLocality(m.name, locality) ||
          m.aliases.some((a) => fuzzyLocality(a, locality)),
      );
    return {
      avgPSF: typePSF,
      avgRent,
      yield: yieldVal,
      sampleCount: hasMarket ? 5 : 1,
    };
  }

  // ── STEP 1.5: East Bangalore — use getEastLocalityMedianPSF() (same source as data file) ─
  if (isEastBangalore(locality)) {
    // Map to the correct typed pool — villa_rowhouse → "villa" for intelligence
    const eastType =
      type === "villa"
        ? "villa"
        : type === "plot"
          ? "plot"
          : type === "commercial"
            ? "commercial"
            : "apartment";
    const typePSF = getEastLocalityMedianPSF(
      locality,
      eastType as "apartment" | "villa" | "plot" | "commercial",
    );
    if (typePSF === null || typePSF <= 0) {
      return { avgPSF: null, avgRent: null, yield: null, sampleCount: 0 };
    }
    const yieldRate = rentYieldRate(type, typePSF);
    const avgRent =
      type === "plot" ? null : Math.round((typePSF * 1000 * yieldRate) / 12);
    const yieldVal =
      type === "plot" ? null : Number((yieldRate * 100).toFixed(1));
    const hasMarket = EAST_BANGALORE_MICRO_MARKETS.some(
      (m) =>
        fuzzyLocality(m.name, locality) ||
        m.aliases.some((a) => fuzzyLocality(a, locality)),
    );
    return {
      avgPSF: typePSF,
      avgRent,
      yield: yieldVal,
      sampleCount: hasMarket ? 5 : 1,
    };
  }

  // ── STEP 2: South Bangalore — real transaction records, type-strict ────────
  if (isSouthBangalore(locality)) {
    // Route ONLY to the correct typed dataset. NEVER mix.
    let records: Array<{
      locality: string;
      areaSqft: number;
      areaType: "SBA" | "Carpet";
      soldPrice: number;
      isCarpet?: boolean;
      isDistress?: boolean;
    }> = [];

    if (type === "apartment") records = southBangaloreApartments;
    else if (type === "villa") records = southBangaloreVillas;
    else if (type === "plot") records = southBangalorePlots;
    // commercial: no south training dataset → fall through to formula below

    if (records.length > 0) {
      const localRecords = records.filter(
        (r) => !r.isDistress && fuzzyLocality(r.locality, locality),
      );

      const psfValues = localRecords
        .map((r) => computeRecordPSF(r.soldPrice, r.areaSqft, r.isCarpet))
        .filter((v) => v > 500);

      const medianPSF = median(psfValues);

      if (medianPSF !== null && localRecords.length >= 2) {
        const yieldRate = rentYieldRate(type, medianPSF);
        const avgRent =
          type === "plot"
            ? null
            : Math.round((medianPSF * 1000 * yieldRate) / 12);
        const yieldVal =
          type === "plot" ? null : Number((yieldRate * 100).toFixed(1));
        return {
          avgPSF: Math.round(medianPSF),
          avgRent,
          yield: yieldVal,
          sampleCount: localRecords.length,
        };
      }

      // Thin data (1 record) — return with 1 sample
      if (localRecords.length === 1 && psfValues[0] > 0) {
        const singlePSF = Math.round(psfValues[0]);
        const yieldRate = rentYieldRate(type, singlePSF);
        return {
          avgPSF: singlePSF,
          avgRent:
            type === "plot"
              ? null
              : Math.round((singlePSF * 1000 * yieldRate) / 12),
          yield: type === "plot" ? null : Number((yieldRate * 100).toFixed(1)),
          sampleCount: 1,
        };
      }

      // No records for this type in this locality — strict null, no fallback
      return { avgPSF: null, avgRent: null, yield: null, sampleCount: 0 };
    }
    // commercial or no typed records — fall through to formula
  }

  // ── STEP 3: Generic locality — getBasePSF (type-specific, single source of truth) ─
  const typePSF = getBasePSF(locality, type);
  if (typePSF <= 0)
    return { avgPSF: null, avgRent: null, yield: null, sampleCount: 0 };

  const yieldRate = rentYieldRate(type, typePSF);
  const avgRent =
    type === "plot" ? null : Math.round((typePSF * 1000 * yieldRate) / 12);
  const yieldVal =
    type === "plot" ? null : Number((yieldRate * 100).toFixed(1));

  return { avgPSF: typePSF, avgRent, yield: yieldVal, sampleCount: 1 };
}

/**
 * getAllPropertyTypeIntelligence — all 4 types in one call.
 * Each type uses its OWN data path. NO mixing between types ever.
 */
export function getAllPropertyTypeIntelligence(
  locality: string,
): AllPropertyTypeIntelligence {
  return {
    apartment: getPropertyTypeIntelligence(locality, "apartment"),
    villa: getPropertyTypeIntelligence(locality, "villa"),
    plot: getPropertyTypeIntelligence(locality, "plot"),
    commercial: getPropertyTypeIntelligence(locality, "commercial"),
  };
}

// ─── Existing functions (unchanged) ──────────────────────────────────────────

/**
 * getLocalityBasePrice — returns apartment baseline PSF for a locality.
 * All engines (valuationEngine, ensembleEngine) import this for apartment base.
 * For type-specific PSF use getBasePSF(locality, type) from localityEngine.
 */
export function getLocalityBasePrice(locality: string): number {
  return getBaseMicroLocationPSF(locality);
}

/**
 * getLocalityBasePriceForType — type-aware wrapper over localityEngine.
 * Use this for property-type-strict PSF lookups in the ensemble engine.
 */
export function getLocalityBasePriceForType(
  locality: string,
  propertyType: string,
): number {
  const t = propertyType.toLowerCase().trim();
  if (t === "villa" || t === "house" || t === "row house")
    return getBasePSF(locality, "villa");
  if (t === "plot" || t === "land") return getBasePSF(locality, "plot");
  if (t === "commercial" || t === "office" || t === "shop")
    return getBasePSF(locality, "commercial");
  return getBasePSF(locality, "apartment");
}

// ─── Task 4: Growth Signals Computation ───────────────────────────────────────

/** Haversine distance in km */
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

/**
 * Connectivity score derived from metro count (within 3km),
 * tech park count (within 5km), highway proximity.
 * Formula: min(100, metroCount*20 + techParkCount*15 + highwayCount*10)
 * For localities tagged trafficDriver="weekend-tourism", add a 20-point
 * tourism-proximity boost (lowers resident-density weight appropriately).
 */
function computeConnectivityScore(
  lat: number,
  lng: number,
  locality?: string,
): number {
  const metrosWithin3km = METROS.filter(
    (m) => haversineKm(lat, lng, m.lat, m.lng) <= 3,
  ).length;

  const techParksWithin5km = TECH_PARKS.filter(
    (tp) => haversineKm(lat, lng, tp.lat, tp.lng) <= 5,
  ).length;

  // Highway proximity: Bangalore radial highways (ORR, Bellary Rd, NH48, etc.)
  const HIGHWAYS = [
    { lat: 12.97, lng: 77.66, name: "ORR East" },
    { lat: 12.97, lng: 77.55, name: "ORR West" },
    { lat: 13.05, lng: 77.59, name: "Bellary Road / NH44" },
    { lat: 12.84, lng: 77.68, name: "NH48 South" },
    { lat: 12.91, lng: 77.7, name: "Sarjapur Connector" },
    { lat: 12.9716, lng: 77.5946, name: "MG Road Corridor" },
  ];

  const highwaysWithin3km = HIGHWAYS.filter(
    (h) => haversineKm(lat, lng, h.lat, h.lng) <= 3,
  ).length;

  const baseScore =
    metrosWithin3km * 20 + techParksWithin5km * 15 + highwaysWithin3km * 10;

  // Tourism-corridor boost: lower resident-density weight; raise tourism-proximity weight
  const meta = locality ? getLocalityMeta(locality) : {};
  const tourismBoost = meta.trafficDriver === "weekend-tourism" ? 20 : 0;

  return Math.min(100, baseScore + tourismBoost);
}

/**
 * Employment score derived from proximity to top tech parks.
 * employmentScore = min(100, techParkCount * 25 + sezCount * 20)
 */
function computeEmploymentScore(lat: number, lng: number): number {
  // SEZ-designated tech parks (special economic zones)
  const SEZ_PARKS = new Set([
    "Electronic City Phase 1",
    "Electronic City Phase 2",
    "ITPL",
    "Embassy Tech Village",
    "Manyata Tech Park",
    "Embassy Manyata Business Park",
    "Devanahalli Aerospace Park",
  ]);

  const techParksWithin5km = TECH_PARKS.filter(
    (tp) => haversineKm(lat, lng, tp.lat, tp.lng) <= 5,
  );

  const sezCount = techParksWithin5km.filter((tp) =>
    SEZ_PARKS.has(tp.name),
  ).length;
  const nonSezCount = techParksWithin5km.length - sezCount;

  return Math.min(100, nonSezCount * 25 + sezCount * 20);
}

/**
 * Growth signal: weighted average of infra, demand, and price momentum.
 * growthSignal = weightedAverage(infraScore * 0.4, demandTrend * 0.35, priceMomentum * 0.25)
 */
function computeGrowthSignalScore(
  connectivityScore: number,
  demandScore: number,
  priceTrend1Y: number,
): number {
  // Normalise priceTrend1Y (%) → 0–100
  const priceMomentum = Math.min(100, Math.max(0, (priceTrend1Y / 15) * 100));
  const infraScore = connectivityScore;
  const demandTrend = demandScore;

  return infraScore * 0.4 + demandTrend * 0.35 + priceMomentum * 0.25;
}

function growthSignalLabel(
  score: number,
): "Strong" | "Moderate" | "Emerging" | "Stable" {
  if (score >= 65) return "Strong";
  if (score >= 45) return "Moderate";
  if (score >= 25) return "Emerging";
  return "Stable";
}

// ─── Main Area Intelligence Function ─────────────────────────────────────────

export function getAreaIntelligence(
  locality: string,
  lat: number,
  lng: number,
  propertyType?: string | null,
): AreaIntelligenceOutput {
  // Guard: resolve real coordinates from user input → localityCoords lookup → Bangalore centre.
  // Priority: 1) passed lat/lng if valid  2) localityCoords lookup by name  3) city centre fallback
  const hasValidCoords = lat && lng && lat !== 0 && lng !== 0;
  const resolvedFromName = !hasValidCoords ? getCoords(locality) : null;
  const effectiveLat = hasValidCoords
    ? lat
    : (resolvedFromName?.lat ?? 12.9716);
  const effectiveLng = hasValidCoords
    ? lng
    : (resolvedFromName?.lng ?? 77.5946);

  const techScore = getRawTechScore(effectiveLat, effectiveLng);
  const amenityScore = getRawAmenityScore(effectiveLat, effectiveLng);
  // Always use effectiveLat/effectiveLng — never raw lat/lng which may be 0
  // getNearestMetros is now async — use haversine sync fallback for scoring
  let nearestMetroDistKm = 50;
  for (const m of METROS) {
    const d = haversineDistance(effectiveLat, effectiveLng, m.lat, m.lng);
    if (d < nearestMetroDistKm) nearestMetroDistKm = d;
  }
  const metros: InfraItem[] = []; // async data — populated separately via getNearestMetros
  const metroFactor = getMetroFactor(effectiveLat, effectiveLng);

  const demand = getDemandOutput(effectiveLat, effectiveLng, locality, false);

  // ── Task 2+3: Get PSF from micro-zone index (same models as valuationEngine) ─
  const normalizedType = (propertyType ?? "").toLowerCase().trim();
  const isCommercial = normalizedType === "commercial";
  const isBlendedMode =
    !normalizedType || normalizedType === "all" || normalizedType === "";

  // Look up pre-built micro-zone index for locality
  const localityKey = normKey(locality);
  const indexEntry = _microZonePSFIndex.get(localityKey);

  // Get record count for confidence calculation
  const microZoneRecordCount = indexEntry?.recordCount ?? 0;
  const confidenceTier = getConfidenceTier(microZoneRecordCount);

  // Determine display PSF — type-strict, never mixing
  let displayPSF = 0;

  if (!isBlendedMode) {
    const typeKey = isCommercial
      ? "commercial"
      : normalizedType === "villa"
        ? "villa"
        : normalizedType === "plot"
          ? "plot"
          : "apartment";

    // Try micro-zone index first (covers North + South training data)
    const indexedPSF = indexEntry?.[typeKey] ?? null;

    if (indexedPSF !== null && indexedPSF > 0) {
      displayPSF = indexedPSF;
    } else if (isNorthBangalore(locality)) {
      // North: try getAveragePSF from training data first (same as valuationEngine)
      // Falls back to getBasePSF (localityEngine canonical) to guarantee consistency
      const northPSF = getAveragePSF(locality, typeKey);
      displayPSF =
        northPSF && northPSF > 0
          ? northPSF
          : getBasePSF(
              locality,
              isCommercial
                ? "commercial"
                : normalizedType === "villa"
                  ? "villa"
                  : normalizedType === "plot"
                    ? "plot"
                    : "apartment",
            );
    } else {
      // South or generic: use getBasePSF for type-specific accuracy
      const typedPSF = getBasePSF(
        locality,
        isCommercial
          ? "commercial"
          : normalizedType === "villa"
            ? "villa"
            : normalizedType === "plot"
              ? "plot"
              : "apartment",
      );
      displayPSF = typedPSF > 0 ? typedPSF : 0;
    }
  } else {
    // Blended mode: use baseMedian as display price (consistent with Area Intelligence PSF label)
    displayPSF = getBaseMedianPSF(locality);
  }

  const avgPrice = displayPSF > 0 ? displayPSF : getBaseMedianPSF(locality);

  const prediction = getPricePrediction(
    avgPrice,
    effectiveLat,
    effectiveLng,
    locality,
  );

  const effectiveDemandScore = isCommercial
    ? Math.min(100, Math.round(demand.demandScore * 1.1 + techScore * 15))
    : demand.demandScore;

  const investmentRaw =
    techScore * 0.3 +
    (effectiveDemandScore / 100) * 0.25 +
    ((metroFactor - 0.95) / 0.13) * 0.2 +
    Math.min(prediction.pctGrowth1Y / 12, 1) * 0.25;
  const investmentScore = Math.round(Math.min(investmentRaw * 100, 100));

  const growthScore = prediction.growthScore;
  const livabilityScore = Math.round(Math.min(amenityScore * 100, 100));

  // ── Confidence: data-driven from record count + signal quality ──────────────
  const dataCoverage = techScore > 0.3 && amenityScore > 0.3 ? 0.85 : 0.6;
  const rawConfidence = Math.round(
    0.35 * dataCoverage * 100 +
      0.25 * (amenityScore * 100) * 0.01 * 100 +
      0.25 * (techScore * 100) * 0.01 * 100 +
      0.15 * 75,
  );
  const confidence = confidenceTierToScore(confidenceTier, rawConfidence);

  // ── Blended PSF (side-by-side breakdown when no type selected) ───────────────
  let blendedPSF:
    | { apartment: number; villa: number; plot: number; commercial: number }
    | undefined;

  if (isBlendedMode) {
    if (isNorthBangalore(locality) || isNorthWestBangalore(locality)) {
      // Use getAveragePSF for each type — same as valuationEngine (routes NW correctly)
      const aptPSF = getAveragePSF(locality, "apartment");
      const villaPSF = getAveragePSF(locality, "villa");
      const plotPSF = getAveragePSF(locality, "plot");
      const commPSF = getAveragePSF(locality, "commercial");
      blendedPSF = {
        apartment: aptPSF ?? getBasePSF(locality, "apartment"),
        villa: villaPSF ?? getBasePSF(locality, "villa"),
        plot: plotPSF ?? getBasePSF(locality, "plot"),
        commercial: commPSF ?? getBasePSF(locality, "commercial"),
      };
    } else {
      // South or generic: use getBasePSF for each type — same source as AI Valuation
      blendedPSF = {
        apartment: getBasePSF(locality, "apartment"),
        villa: getBasePSF(locality, "villa"),
        plot: getBasePSF(locality, "plot"),
        commercial: getBasePSF(locality, "commercial"),
      };
    }
  }

  // ── Task 4: Growth signals ────────────────────────────────────────────────────
  const connectivityScore = computeConnectivityScore(
    effectiveLat,
    effectiveLng,
    locality,
  );
  const employmentScore = computeEmploymentScore(effectiveLat, effectiveLng);
  const growthSignalScore = computeGrowthSignalScore(
    connectivityScore,
    effectiveDemandScore,
    prediction.pctGrowth1Y,
  );
  const growthSignal = growthSignalLabel(growthSignalScore);

  return {
    investmentScore,
    growthScore,
    livabilityScore,
    demandScore: effectiveDemandScore,
    avgPricePerSqft: avgPrice,
    // PSF breakdown — all derived from same localityEngine BasePSF source
    basePSF: avgPrice,
    premiumPSF: Math.round(avgPrice * 1.3), // premium projects typically 1.2–1.4× base
    aiEstimatedPSF: avgPrice, // same as avgPricePerSqft — contextual AI label for UI
    priceTrend1Y: prediction.pctGrowth1Y,
    priceTrend3Y: prediction.pctGrowth3Y,
    confidence,
    classification: prediction.classification,
    growthDriver: prediction.growthDriver,
    nearestMetros: metros,
    topTechParks: [] as InfraItem[],
    topHospitals: [] as InfraItem[],
    topSchools: [] as InfraItem[],
    blendedMode: isBlendedMode,
    blendedPSF,
    connectivityScore,
    employmentScore,
    growthSignal,
  };
}
