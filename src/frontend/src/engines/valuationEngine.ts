// valuationEngine.ts — Orchestrator
// Imports all sub-engines. Single source of truth for property valuation.

import { ALL_LOCALITY_COORDS } from "../data/localityCoords";
import { getBasePSF } from "../utils/localityEngine";
import { getDealScore } from "./dealEngine";
import { getDemandOutput } from "./demandEngine";
import {
  type InfraItem,
  getRawAmenityScore,
  getRawMetroScore,
  getRawTechScore,
  getTopHospitals,
  getTopSchools,
  getTopTechParks,
} from "./infraEngine";

import {
  type MetroResult,
  getMetroFactor,
  getNearestMetros,
  haversineDistance,
} from "./metroEngine";
import { getPricePrediction } from "./predictionEngine";
import { getRecommendation } from "./recommendationEngine";

export type { DealOutput, DealClassification } from "./dealEngine";
import { computeEnsemblePrice, savePriceSnapshot } from "./ensembleEngine";
export type { EnsembleOutput, EnsembleComponentScore } from "./ensembleEngine";

export type { PredictionOutput } from "./predictionEngine";
export type { RecommendationOutput } from "./recommendationEngine";
export type { AreaIntelligenceOutput } from "./areaIntelligenceEngine";
export { getAreaIntelligence } from "./areaIntelligenceEngine";
export { getDealScore } from "./dealEngine";
export { getPricePrediction } from "./predictionEngine";
export { getRecommendation } from "./recommendationEngine";

// Explicitly re-export haversineDistance for external use
export { haversineDistance };

// ─── Builder Dataset ──────────────────────────────────────────────────────────
const BUILDERS: Record<string, number> = {
  prestige: 1.1,
  sobha: 1.1,
  brigade: 1.08,
  "embassy group": 1.1,
  "salarpuria sattva": 1.05,
  "century real estate": 1.05,
  "assetz property group": 1.05,
  puravankara: 1.05,
  "godrej properties": 1.08,
  "mahindra lifespaces": 1.05,
  "shriram properties": 1.0,
  "ds max": 0.98,
  aratt: 0.98,
  "gopalan enterprises": 1.05,
  "nitesh estates": 1.05,
  "vaishnavi group": 1.05,
  "adarsh developers": 1.08,
  "total environment": 1.1,
  "concorde group": 1.05,
  "sumadhura group": 1.05,
  "kolte patil": 1.05,
  dlf: 1.1,
  "tata housing": 1.08,
  "ats infrastructure": 1.1,
  "m3m india": 1.1,
  "panchshil realty": 1.1,
  "kumar properties": 1.08,
  "vtp realty": 1.08,
  "shapoorji pallonji": 1.1,
  "lodha group": 1.1,
  "gera developments": 1.05,
};

// ─── Micro-location Weights ───────────────────────────────────────────────────
const MICRO_WEIGHTS: Record<string, number> = {
  "manyata tech park": 1.0,
  whitefield: 0.95,
  "sarjapur road": 0.95,
  hebbal: 0.95,
  indiranagar: 0.98,
  koramangala: 0.98,
  "hsr layout": 0.97,
  bellandur: 0.95,
  "electronic city": 0.9,
  devanahalli: 0.8,
  yelahanka: 0.85,
  nagawara: 0.95,
  thanisandra: 0.95,
  "hennur road": 0.92,
  marathahalli: 0.9,
  "kr puram": 0.88,
  "jp nagar": 0.9,
  jayanagar: 0.93,
  "bannerghatta road": 0.9,
  "btm layout": 0.92,
  rajajinagar: 0.9,
  "rt nagar": 0.88,
  jalahalli: 0.88,
  peenya: 0.85,
  yeshwanthpur: 0.9,
  default: 0.85,
};

function getBuilderScore(builder: string): number {
  const key = builder.toLowerCase();
  for (const [k, v] of Object.entries(BUILDERS)) {
    if (key.includes(k)) return v;
  }
  return 0.95; // Local builder default
}

function getMicroWeight(locality: string): number {
  const key = locality.toLowerCase();
  for (const [k, v] of Object.entries(MICRO_WEIGHTS)) {
    if (key.includes(k)) return v;
  }
  return MICRO_WEIGHTS.default;
}

// ─── Locality Coordinate Lookup ───────────────────────────────────────────────
/**
 * Returns coordinates for a named locality.
 * Uses fuzzy substring matching against the LOCALITY_COORDS map.
 * Falls back to Bangalore center ONLY for truly unknown localities — logs a warning.
 */
export function getLocalityCoords(locality: string): {
  lat: number;
  lng: number;
} {
  const key = locality.toLowerCase().trim();

  // Exact match first
  if (ALL_LOCALITY_COORDS[key]) {
    console.log(
      `[ValuBrix] Locality exact match: "${locality}" (${ALL_LOCALITY_COORDS[key].lat}, ${ALL_LOCALITY_COORDS[key].lng})`,
    );
    return ALL_LOCALITY_COORDS[key];
  }

  // Fuzzy substring match
  for (const [k, v] of Object.entries(ALL_LOCALITY_COORDS)) {
    if (key.includes(k) || k.includes(key)) {
      console.log(
        `[ValuBrix] Locality matched: "${locality}" → "${k}" (${v.lat}, ${v.lng})`,
      );
      return v;
    }
  }

  // Log when fallback is used — this is a potential data gap
  console.warn(
    `[ValuBrix] WARNING: No coordinates found for locality "${locality}". Using Bangalore center fallback. Distances will be inaccurate.`,
  );
  return { lat: 12.9716, lng: 77.5946 }; // Bangalore center — only if truly unknown
}

// ─── Full Valuation Input/Output ──────────────────────────────────────────────
export interface ValuationInput {
  locality: string;
  lat?: number;
  lng?: number;
  builder: string; // Pass empty string or omit when no builder selected — engine will use builderFactor=1.0
  builderName?: string;
  city: string;
  area: number; // sq ft
  floor: number;
  propertyType: string;
  bhk: number;
  listingPrice?: number;
  projectName?: string;
  isTopFloor?: boolean;
}

export interface ValuationTransparency {
  dataLevel: "Project" | "Builder" | "Locality" | "Global";
  propertyType: string;
  localityRecordCount: number;
  builderRecordCount: number;
  projectRecordCount: number;
  confidenceScore: number;
  confidenceTier: "High" | "Medium" | "Low" | "Very Low";
  isHighVariance: boolean;
  variationCV: number;
  reraContribution: boolean; // true if RERA data influenced the comparable sales
  // Ensemble breakdown
  ensembleComponents?: Array<{
    name: string;
    weight: number;
    price: number;
    confidence: number;
  }>;
  derivedInputs?: {
    demandScore: number;
    metroDistance: number;
    infraScore: number;
    pastTrend: number;
  };
}

export interface ValuationOutput {
  // Core
  fMV: number;
  range: [number, number];
  pricePerSqft: number;
  confidence: number;

  // Scores (0–100 for UI)
  scores: {
    tech: number;
    amenity: number;
    builder: number; // 0 when no builder selected — use builderScoreDisplay for UI
    location: number;
    demand: number;
    livability: number;
    metro: number;
    infra: number;
  };

  // Builder display fields — use these in UI, not raw scores.builder
  builderScoreDisplay: number | "Not Applied"; // "Not Applied" when no builder selected
  builderPremiumDisplay: number; // 0 when no builder selected

  // Factors (multipliers)
  factors: {
    locationFactor: number;
    builderFactor: number;
    demandFactor: number;
    livabilityFactor: number;
    metroFactor: number;
    microWeight: number;
  };

  // Infra breakdown
  infra: {
    nearestMetros: MetroResult[];
    topTechParks: InfraItem[];
    topHospitals: InfraItem[];
    topSchools: InfraItem[];
  };

  // Deal analysis
  deal: ReturnType<typeof getDealScore> | null;
  recommendation: ReturnType<typeof getRecommendation> | null;
  prediction: ReturnType<typeof getPricePrediction>;

  // Why this price
  priceExplanation: {
    basePrice: number;
    locationContrib: number; // %
    builderContrib: number;
    demandContrib: number;
    livabilityContrib: number;
  };

  metroDistance: number;
  nearestMetroName: string;
  basePrice: number;
  transparency: ValuationTransparency;
}

function getFloorAdjustment(floor: number, isTopFloor: boolean): number {
  if (isTopFloor) return 0.03;
  if (floor === 0) return -0.05;
  if (floor <= 2) return -0.02;
  if (floor <= 5) return 0;
  if (floor <= 10) return 0.02;
  if (floor <= 20) return 0.04;
  return 0.06; // 20+
}

/**
 * Main orchestrator. Runs all engines and returns the full valuation output.
 */
export function valuate(input: ValuationInput): ValuationOutput {
  const coords = {
    lat: input.lat ?? getLocalityCoords(input.locality).lat,
    lng: input.lng ?? getLocalityCoords(input.locality).lng,
  };

  // Debug logging for distance verification
  console.log(`[ValuBrix] Project: ${input.locality}`, coords.lat, coords.lng);

  // Use type-specific base PSF — single source of truth from localityEngine.
  // Plots use plot PSF, villas use villa PSF, apartments use apartment PSF — no cross-type mixing.
  const typeKey = ((): "apartment" | "villa" | "plot" | "commercial" => {
    const t = input.propertyType.toLowerCase().trim();
    if (t === "villa" || t === "house" || t === "row house") return "villa";
    if (t === "plot" || t === "land") return "plot";
    if (t === "commercial" || t === "office" || t === "shop")
      return "commercial";
    return "apartment";
  })();
  const basePrice = getBasePSF(input.locality, typeKey);
  // Only apply builder score when a specific builder is selected.
  // If builder is missing or "Unknown", use neutral factor (1.0).
  const builderSelected =
    input.builder &&
    input.builder.trim() !== "" &&
    input.builder.toLowerCase() !== "unknown";
  const builderFactor = builderSelected ? getBuilderScore(input.builder) : 1.0;
  const microWeight = getMicroWeight(input.locality);

  // Metro engine — async call deferred; use empty array as sync placeholder
  // Callers that need live OSRM distances should call getNearestMetros directly (async)
  const metros: MetroResult[] = [];

  const nearestMetro = metros[0];
  // Use haversine-based metro factor as sync fallback (OSRM data available async via getNearestMetros)
  const metroFactor = getMetroFactor(coords.lat, coords.lng);

  // Infra engines
  const techScore = getRawTechScore(coords.lat, coords.lng);
  const amenityScore = getRawAmenityScore(coords.lat, coords.lng);
  const metroScore = getRawMetroScore(coords.lat, coords.lng);

  // Tech parks — async; use empty array placeholder (OSRM data available async via getTopTechParks)
  const techParks: InfraItem[] = [];

  // Demand engine — gated on builder selection (R1)
  // If no builder selected, demand is Neutral (factor=1.0, score=50).
  const demandOutput = getDemandOutput(
    coords.lat,
    coords.lng,
    input.locality,
    builderSelected === true,
  );

  // Formula:
  // FinalPrice/sqft = BasePrice × LocationFactor × BuilderFactor × DemandFactor × LivabilityFactor
  const locationFactor = microWeight * metroFactor;
  const demandFactor = 1 + techScore * 0.15;
  const livabilityFactor = 1 + amenityScore * 0.1;

  // ─── Enterprise Ensemble Model ─────────────────────────────────────────────
  // Combines: 35% GB + 20% RF + 10% LR + 20% Comparables + 10% Project/Builder + 5% Trend
  // All derived inputs auto-computed from existing engines — no user input required.
  const ensemble = computeEnsemblePrice({
    locality: input.locality,
    lat: coords.lat,
    lng: coords.lng,
    propertyType: input.propertyType,
    sqft: input.area,
    builder: input.builder || input.builderName,
    project: input.projectName,
    floorNumber: input.floor,
    propertyAge: (input as unknown as { propertyAge?: number }).propertyAge,
  });

  const pricePerSqft = ensemble.finalPrice;
  const dataLevel = ensemble.dataLevel;
  const localityRecords = ensemble.localityRecordCount;
  const projectRecords = ensemble.projectRecordCount;
  const builderRecords = ensemble.builderRecordCount;
  const confidence = ensemble.confidenceScore;

  // Save price snapshot for market trend computation
  savePriceSnapshot(input.locality, input.propertyType, pricePerSqft);

  console.log(
    `[ValuBrix] 🎯 Ensemble price: ${pricePerSqft}/sqft | level=${dataLevel} | confidence=${confidence}% | demandScore=${ensemble.derivedInputs.demandScore} | metroKm=${ensemble.derivedInputs.metroDistance.toFixed(1)} | infraScore=${ensemble.derivedInputs.infraScore} | trend=${ensemble.derivedInputs.pastTrend.toFixed(1)}%`,
  );
  for (const c of ensemble.components) {
    if (c.price > 0) {
      console.log(`[ValuBrix]   ${c.name} (${c.weight}%): ₹${c.price}/sqft`);
    }
  }

  const rawFMV = Math.round(pricePerSqft * input.area);
  const floorAdj =
    input.propertyType === "apartment" || input.propertyType === "Apartment"
      ? getFloorAdjustment(input.floor, input.isTopFloor ?? false)
      : 0;
  const fMV = Math.round(rawFMV * (1 + floorAdj));
  // Dynamic range width based on confidence tier
  function getRangeFactor(tier: string): number {
    switch (tier) {
      case "High":
        return 0.05; // ±5%
      case "Medium":
        return 0.08; // ±8%
      case "Low":
        return 0.12; // ±12%
      case "Very Low":
        return 0.18; // ±18%
      default:
        return 0.1;
    }
  }

  const rangeFactor = getRangeFactor(ensemble.confidenceTier);
  const range: [number, number] = [
    Math.round(fMV * (1 - rangeFactor)),
    Math.round(fMV * (1 + rangeFactor)),
  ];

  // Deal score (only if listing price provided)
  const deal = input.listingPrice
    ? getDealScore(fMV, input.listingPrice)
    : null;

  // Price prediction
  const prediction = getPricePrediction(
    fMV,
    coords.lat,
    coords.lng,
    input.locality,
  );

  // Recommendation (only if deal score available)
  const locationScore = Math.round(locationFactor * 85);
  const recommendation = deal
    ? getRecommendation(
        deal.score,
        deal.classification,
        prediction.pctGrowth1Y,
        locationScore,
        demandOutput.demandScore,
        prediction.classification,
      )
    : null;

  // Why this price explanation
  const locationContrib = Math.round((locationFactor - 1) * 100);
  const builderContrib = Math.round((builderFactor - 1) * 100);
  const demandContrib = Math.round((demandFactor - 1) * 100);
  const livabilityContrib = Math.round((livabilityFactor - 1) * 100);

  return {
    fMV,
    range,
    pricePerSqft,
    confidence,
    scores: {
      tech: Math.round(techScore * 100),
      amenity: Math.round(amenityScore * 100),
      // Builder score: 0 (Not Applied) when no builder selected; otherwise normalized 0-100
      builder: builderSelected
        ? Math.min(100, Math.round(((builderFactor - 0.9) / 0.2) * 100))
        : 0,
      location: Math.round(locationFactor * 85),
      demand: demandOutput.demandScore,
      livability: Math.round(amenityScore * 100),
      metro: Math.round(metroScore * 100),
      // InfraScore = 0.4 * TechScore + 0.3 * MetroScore + 0.3 * AmenityScore
      infra: Math.round(
        (0.4 * techScore + 0.3 * metroScore + 0.3 * amenityScore) * 100,
      ),
    },
    // Builder display: "Not Applied" when no builder selected
    builderScoreDisplay: builderSelected
      ? Math.min(100, Math.round(((builderFactor - 0.9) / 0.2) * 100))
      : ("Not Applied" as const),
    builderPremiumDisplay: builderSelected
      ? Math.round((builderFactor - 1) * 100)
      : 0,
    factors: {
      locationFactor: Math.round(locationFactor * 100) / 100,
      builderFactor,
      demandFactor: Math.round(demandFactor * 100) / 100,
      livabilityFactor: Math.round(livabilityFactor * 100) / 100,
      metroFactor,
      microWeight,
    },
    infra: {
      nearestMetros: metros,
      topTechParks: techParks,
      topHospitals: [] as InfraItem[],
      topSchools: [] as InfraItem[],
    },
    deal,
    recommendation,
    prediction,
    priceExplanation: {
      basePrice,
      locationContrib,
      builderContrib,
      demandContrib,
      livabilityContrib,
    },
    metroDistance: nearestMetro?.distance ?? 0,
    nearestMetroName: nearestMetro?.name ?? "",
    basePrice,
    transparency: {
      dataLevel,
      propertyType: input.propertyType,
      localityRecordCount: localityRecords,
      builderRecordCount: builderRecords,
      projectRecordCount: projectRecords,
      confidenceScore: confidence,
      isHighVariance: ensemble.isHighVariance,
      variationCV: ensemble.variationCV,
      reraContribution: ensemble.reraContribution,
      confidenceTier: ensemble.confidenceTier,
      ensembleComponents: ensemble.components,
      derivedInputs: ensemble.derivedInputs,
    },
  };
}
