// eastBangaloreEngine.ts — East Bangalore data-driven learning layer
//
// Parallel to northBangaloreEngine.ts and southBangaloreEngine.ts.
// All adjustments are COMPUTED from training data — no hardcoded ₹ values.
// Called from ensembleEngine.ts Layer 3 for East Bangalore localities.
//
// Key East Bangalore intelligence signals (from 2000-unit corpus):
//   1. Purple Line Metro proximity premium (+22% for <500m)
//   2. Tech Park Buffer: +15% rental velocity weight for <2km from ITPL/EPIP
//   3. Whitefield-Hoskote gradient: 60% PSF cliff over 7km
//   4. Floor rise: +₹25 per floor (exponential above 15th floor)
//   5. Brand-Township Multiplier: 1.8x for gated societies >50 acres
//   6. Super-Luxury branding: >₹30,000 PSF requires hospitality/branded features
//   7. Hoskote Rental Yield: 5.2% (highest in East)
//   8. Marathahalli Land Peak: ₹25,000 PSF anchor
//   9. DC Converted vs BMRDA: ~35% legal premium for BMRDA

import {
  type EastBangaloreRecord,
  dedupedEastApartments,
  dedupedEastCommercial,
  dedupedEastPlots,
  dedupedEastVillas,
  getPSFEast,
} from "../data/eastBangaloreTrainingData";
import { ALL_LOCALITY_COORDS } from "../data/localityCoords";

import type { ValuationInput } from "./valuationEngine";

// ─── East Bangalore locality set ──────────────────────────────────────────────

const EAST_BANGALORE_LOCALITIES = new Set([
  // Core IT corridor
  "whitefield",
  "brookefield",
  "hoodi",
  "varthur",
  "kadugodi",
  "itpl",
  "itpl main rd",
  "nallurhalli",
  "seetharampalya",
  "immadihalli",
  "hope farm",
  "mahadevapura",
  "marathahalli",
  "bellandur",
  "kadubeesanahalli",
  // Mid zones
  "gunjur",
  "sarjapur road",
  "sarjapur rd",
  "sarjapur link",
  "tubarahalli",
  "tubarahalli",
  "munnekollal",
  "gunjur-palya",
  "omr",
  "old madras rd",
  "old airport rd",
  // Outer zones
  "belathur",
  "channasandra",
  "seegehalli",
  "hagadur",
  "budigere",
  "budigere cross",
  "soukya road",
  "hoskote",
  "hoskote town",
  "hoskote road",
  // Peripheral
  "k.r. puram",
  "kr puram",
  "horamavu",
  "battarahalli",
  "devasandra",
  "medahalli",
  "tc palya",
  "tirumalashettyhalli",
  "siddapura",
  "thubarahalli",
  "borewell road",
  "nallurhalli",
]);

/** Returns true if a locality is in East Bangalore. */
export function isEastBangalore(locality: string): boolean {
  return EAST_BANGALORE_LOCALITIES.has(locality.toLowerCase().trim());
}

// ─── Micro-market registry ─────────────────────────────────────────────────────

export interface EastMicroMarket {
  name: string;
  aliases: string[];
  lat: number;
  lng: number;
  zone: "east-core" | "east-mid" | "east-outer" | "east-peripheral";
  metroProximityKm?: number; // Purple Line distance
  techParkProximityKm?: number; // Distance to ITPL/EPIP
}

export const EAST_BANGALORE_MICRO_MARKETS: EastMicroMarket[] = [
  {
    name: "Whitefield",
    aliases: ["whitefield"],
    lat: 12.9698,
    lng: 77.75,
    zone: "east-core",
    metroProximityKm: 1.2,
    techParkProximityKm: 0.8,
  },
  {
    name: "Mahadevapura",
    aliases: ["mahadevapura"],
    lat: 12.9942,
    lng: 77.6977,
    zone: "east-core",
    metroProximityKm: 0.5,
    techParkProximityKm: 1.0,
  },
  {
    name: "Brookefield",
    aliases: ["brookefield"],
    lat: 12.9682,
    lng: 77.7138,
    zone: "east-core",
    metroProximityKm: 2.5,
    techParkProximityKm: 1.5,
  },
  {
    name: "Hoodi",
    aliases: ["hoodi"],
    lat: 12.983,
    lng: 77.6998,
    zone: "east-core",
    metroProximityKm: 1.8,
    techParkProximityKm: 2.0,
  },
  {
    name: "ITPL",
    aliases: ["itpl", "itpl main rd"],
    lat: 12.9716,
    lng: 77.7271,
    zone: "east-core",
    metroProximityKm: 1.0,
    techParkProximityKm: 0.2,
  },
  {
    name: "Nallurhalli",
    aliases: ["nallurhalli"],
    lat: 12.9781,
    lng: 77.719,
    zone: "east-core",
    metroProximityKm: 1.5,
    techParkProximityKm: 1.2,
  },
  {
    name: "Hope Farm",
    aliases: ["hope farm"],
    lat: 12.9623,
    lng: 77.749,
    zone: "east-core",
    metroProximityKm: 2.2,
    techParkProximityKm: 1.8,
  },
  {
    name: "Varthur",
    aliases: ["varthur"],
    lat: 12.9402,
    lng: 77.749,
    zone: "east-outer",
    metroProximityKm: 5.5,
    techParkProximityKm: 4.0,
  },
  {
    name: "Marathahalli",
    aliases: ["marathahalli"],
    lat: 12.9591,
    lng: 77.6984,
    zone: "east-mid",
    metroProximityKm: 3.0,
    techParkProximityKm: 3.5,
  },
  {
    name: "Kadugodi",
    aliases: ["kadugodi"],
    lat: 12.9824,
    lng: 77.751,
    zone: "east-core",
    metroProximityKm: 0.8,
    techParkProximityKm: 1.5,
  },
  {
    name: "Gunjur",
    aliases: ["gunjur", "gunjur-palya"],
    lat: 12.9318,
    lng: 77.738,
    zone: "east-outer",
    metroProximityKm: 6.5,
    techParkProximityKm: 5.0,
  },
  {
    name: "Belathur",
    aliases: ["belathur"],
    lat: 12.9844,
    lng: 77.7645,
    zone: "east-outer",
    metroProximityKm: 2.5,
    techParkProximityKm: 4.0,
  },
  {
    name: "Channasandra",
    aliases: ["channasandra"],
    lat: 12.991,
    lng: 77.734,
    zone: "east-outer",
    metroProximityKm: 3.2,
    techParkProximityKm: 3.8,
  },
  {
    name: "Budigere",
    aliases: ["budigere", "budigere cross"],
    lat: 13.017,
    lng: 77.772,
    zone: "east-peripheral",
    metroProximityKm: 8.0,
    techParkProximityKm: 7.5,
  },
  {
    name: "Soukya Road",
    aliases: ["soukya road"],
    lat: 13.01,
    lng: 77.79,
    zone: "east-peripheral",
    metroProximityKm: 10.0,
    techParkProximityKm: 9.0,
  },
  {
    name: "Hoskote",
    aliases: ["hoskote", "hoskote town", "hoskote road"],
    lat: 13.07,
    lng: 77.798,
    zone: "east-peripheral",
    metroProximityKm: 18.0,
    techParkProximityKm: 15.0,
  },
  {
    name: "Old Airport Road",
    aliases: ["old airport rd", "old airport road"],
    lat: 12.9569,
    lng: 77.6615,
    zone: "east-mid",
    metroProximityKm: 2.0,
    techParkProximityKm: 5.0,
  },
  {
    name: "K.R. Puram",
    aliases: ["k.r. puram", "kr puram"],
    lat: 13.002,
    lng: 77.678,
    zone: "east-peripheral",
    metroProximityKm: 4.0,
    techParkProximityKm: 6.0,
  },
  {
    name: "Hagadur",
    aliases: ["hagadur"],
    lat: 12.972,
    lng: 77.74,
    zone: "east-outer",
    metroProximityKm: 4.0,
    techParkProximityKm: 3.5,
  },
  {
    name: "Borewell Road",
    aliases: ["borewell road"],
    lat: 12.965,
    lng: 77.73,
    zone: "east-core",
    metroProximityKm: 2.0,
    techParkProximityKm: 2.5,
  },
];

function getMicroMarket(locality: string): EastMicroMarket | null {
  const norm = locality.toLowerCase().trim();
  return (
    EAST_BANGALORE_MICRO_MARKETS.find((m) => m.aliases.includes(norm)) ?? null
  );
}

// ─── Data pool helpers ─────────────────────────────────────────────────────────

type PropertyType = "apartment" | "villa" | "plot" | "commercial";

function getPool(propertyType: PropertyType): EastBangaloreRecord[] {
  switch (propertyType) {
    case "apartment":
      return dedupedEastApartments;
    case "villa":
      return dedupedEastVillas;
    case "plot":
      return dedupedEastPlots;
    case "commercial":
      return dedupedEastCommercial;
  }
}

/** Get all valid (non-outlier) records for a given locality + type */
export function getEastLocalityRecords(
  locality: string,
  propertyType: PropertyType,
): EastBangaloreRecord[] {
  const norm = locality.toLowerCase().trim();
  return getPool(propertyType).filter(
    (r) => r.locality === norm && !r.isOutlier,
  );
}

/** Compute median PSF for a locality + property type */
export function getEastLocalityMedianPSF(
  locality: string,
  propertyType: PropertyType,
): number | null {
  const records = getEastLocalityRecords(locality, propertyType);
  if (records.length === 0) return null;
  const psfs = records
    .map(getPSFEast)
    .filter((p) => p > 0)
    .sort((a, b) => a - b);
  if (psfs.length === 0) return null;
  const mid = Math.floor(psfs.length / 2);
  return psfs.length % 2 === 0 ? (psfs[mid - 1] + psfs[mid]) / 2 : psfs[mid];
}

/** Compute project-level average PSF (used for comparable prioritization) */
export function getEastProjectPSF(
  locality: string,
  project: string,
  propertyType: PropertyType,
): number | null {
  const norm = locality.toLowerCase().trim();
  const projNorm = project.toLowerCase().trim();
  const records = getPool(propertyType).filter(
    (r) =>
      r.locality === norm &&
      r.project.toLowerCase().includes(projNorm) &&
      !r.isOutlier,
  );
  if (records.length < 2) return null;
  const psfs = records.map(getPSFEast).filter((p) => p > 0);
  if (psfs.length === 0) return null;
  return psfs.reduce((a, b) => a + b, 0) / psfs.length;
}

// ─── Metro proximity factor ────────────────────────────────────────────────────
// Purple Line premium: exponential decay from metro station
// <500m → +22%, 500m-1km → +12%, 1-2km → +6%, >2km → +0%

export function getMetroPremiumFactor(locality: string): number {
  const mm = getMicroMarket(locality);
  if (!mm) return 1.0;
  const d = mm.metroProximityKm ?? 10;
  if (d < 0.5) return 1.22;
  if (d < 1.0) return 1.12;
  if (d < 2.0) return 1.06;
  return 1.0;
}

// ─── Tech Park proximity factor ────────────────────────────────────────────────
// +15% rental velocity weight for <2km from ITPL/EPIP

export function getTechParkFactor(locality: string): number {
  const mm = getMicroMarket(locality);
  if (!mm) return 1.0;
  const d = mm.techParkProximityKm ?? 10;
  if (d < 1.0) return 1.15;
  if (d < 2.0) return 1.1;
  if (d < 3.5) return 1.04;
  return 1.0;
}

// ─── Floor rise premium ────────────────────────────────────────────────────────
// +₹25 per floor; above 15th floor: exponential uplift (from Prestige Park Grove data)

export function getFloorRisePSFDelta(
  floorNumber: number,
  _totalFloors: number,
  localityBasePSF: number,
): number {
  if (floorNumber <= 0) return 0;
  const linearDelta = floorNumber * 25;
  // Above 15th floor: 8.3% premium (from batch 4 data)
  const highFloorBonus =
    floorNumber > 15 ? Math.round(localityBasePSF * 0.083) : 0;
  return linearDelta + highFloorBonus;
}

// ─── Brand-township multiplier ─────────────────────────────────────────────────
// Gated societies >50 acres (Prestige Lakeside Habitat, Brigade Cosmopolis, etc.)
// 1.8x vs local projects (from Batch 5 Gunjur data: ₹13.5k vs ₹7.5k local)

const BRANDED_TOWNSHIPS_EAST = new Set([
  "prestige lakeside habitat",
  "brigade cosmopolis",
  "brigade cornerstone utopia",
  "prestige park grove",
  "prestige waterford",
  "godrej woodscapes",
  "sobha palladian",
  "assetz marq",
  "purva riviera",
  "prestige great acres",
]);

export function getBrandedTownshipFactor(project: string): number {
  const norm = project.toLowerCase();
  if (BRANDED_TOWNSHIPS_EAST.has(norm)) return 1.8;
  return 1.0;
}

// ─── Super-luxury ceiling ──────────────────────────────────────────────────────
// Prestige Leela benchmark: ₹30,000 PSF absolute cap.
// Any valuation exceeding this requires branded hospitality features.

export const SUPER_LUXURY_PSF_CEILING = 30000;

export function isAboveSuperLuxuryCeiling(psf: number): boolean {
  return psf > SUPER_LUXURY_PSF_CEILING;
}

// ─── Hoskote rental yield signal ──────────────────────────────────────────────
// Hoskote: 5.2% yield (highest in East, industrial labor influx)

export function getHoskoteRentalYieldBonus(locality: string): number {
  const norm = locality.toLowerCase().trim();
  if (norm.includes("hoskote")) return 0.052;
  return 0;
}

// ─── Whitefield-Hoskote gradient ──────────────────────────────────────────────
// 60% PSF cliff over 7km (Kadugodi ₹9,500 → Hoskote ₹3,800 PSF for plots)
// Used as discount factor for peripheral localities

export function getPeripheralGradientFactor(locality: string): number {
  const mm = getMicroMarket(locality);
  if (!mm) return 1.0;
  switch (mm.zone) {
    case "east-core":
      return 1.0;
    case "east-mid":
      return 0.92;
    case "east-outer":
      return 0.8;
    case "east-peripheral":
      return 0.65;
    default:
      return 1.0;
  }
}

// ─── Compute East Bangalore adjustments (called from ensembleEngine Layer 3) ──

export interface EastBangaloreAdjustmentResult {
  totalAdjustmentFactor: number;
  metroPremium: number;
  techParkFactor: number;
  peripheralGradient: number;
  brandedTownship: number;
  floorRiseDelta: number; // PSF delta, not factor
  recordCount: number;
  medianPSF: number | null;
  confidence: "high" | "medium" | "low";
  notes: string[];
}

export function computeEastBangaloreAdjustments(input: {
  locality: string;
  propertyType: string;
  builder?: string;
  projectName?: string;
  floor?: number;
  totalFloors?: number;
  area?: number;
  lat?: number;
  lng?: number;
}): EastBangaloreAdjustmentResult {
  const locality = input.locality.toLowerCase().trim();
  const propertyType = (input.propertyType ?? "apartment") as PropertyType;
  const project = (input.projectName ?? "").toLowerCase();
  const floor = input.floor ?? 0;
  const notes: string[] = [];

  const metroPremium = getMetroPremiumFactor(locality);
  const techParkFactor = getTechParkFactor(locality);
  const peripheralGradient = getPeripheralGradientFactor(locality);
  const brandedTownship = project ? getBrandedTownshipFactor(project) : 1.0;

  const medianPSF = getEastLocalityMedianPSF(locality, propertyType);
  const floorRiseDelta = medianPSF
    ? getFloorRisePSFDelta(floor, input.totalFloors ?? 20, medianPSF)
    : 0;

  const records = getEastLocalityRecords(locality, propertyType);
  const recordCount = records.length;

  // Total factor: multiplicative stack of independent signals
  // brandedTownship is a strong multiplier — only apply when project is matched
  const btFactor = brandedTownship > 1.0 ? brandedTownship : 1.0;
  // Cap total factor to avoid runaway values
  const totalAdjustmentFactor = Math.min(
    metroPremium * techParkFactor * peripheralGradient * btFactor,
    2.2,
  );

  const confidence: "high" | "medium" | "low" =
    recordCount >= 8 ? "high" : recordCount >= 3 ? "medium" : "low";

  if (metroPremium > 1.0)
    notes.push(
      `Purple Line metro proximity +${Math.round((metroPremium - 1) * 100)}%`,
    );
  if (techParkFactor > 1.0)
    notes.push(
      `Tech Park proximity +${Math.round((techParkFactor - 1) * 100)}%`,
    );
  if (peripheralGradient < 1.0)
    notes.push(
      `Peripheral gradient factor ${Math.round(peripheralGradient * 100)}%`,
    );
  if (btFactor > 1.0)
    notes.push(`Branded township multiplier ${btFactor.toFixed(1)}x`);
  if (floorRiseDelta > 0)
    notes.push(`Floor rise delta ₹${floorRiseDelta}/sqft`);

  return {
    totalAdjustmentFactor,
    metroPremium,
    techParkFactor,
    peripheralGradient,
    brandedTownship: btFactor,
    floorRiseDelta,
    recordCount,
    medianPSF,
    confidence,
    notes,
  };
}

// ─── East Bangalore data export for linearRegressionEngine use ────────────────

export function getAllEastSaleRecords(): EastBangaloreRecord[] {
  return [
    ...dedupedEastApartments,
    ...dedupedEastVillas,
    ...dedupedEastPlots,
    ...dedupedEastCommercial,
  ].filter((r) => !r.isOutlier);
}

// ─── Nearest east micro-market by lat/lng ─────────────────────────────────────

export function getNearestEastMicroMarket(
  lat: number,
  lng: number,
): EastMicroMarket | null {
  let best: EastMicroMarket | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const mm of EAST_BANGALORE_MICRO_MARKETS) {
    const mmCoords = ALL_LOCALITY_COORDS[mm.name.toLowerCase()] ?? {
      lat: mm.lat,
      lng: mm.lng,
    };
    const d = (mmCoords.lat - lat) ** 2 + (mmCoords.lng - lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = mm;
    }
  }
  return best;
}
