/**
 * unifiedEngine.ts — Single Entry Point for ALL Valuation Flows
 *
 * This is the ONLY file that should be imported by pages/components for valuations.
 * Wraps: ensembleEngine, demandEngine, dealEngine, rentEngine, explanationEngine
 *
 * Usage:
 *   import { valuateProperty } from '@/engines/unifiedEngine';
 *   const result = await valuateProperty({ locality, propertyType, area, ... });
 */

import { generateComparablesReasoning } from "../utils/explanationEngine";
import { getLocalityZone, getZoneMedianPSF } from "../utils/localityEngine";
import { estimateRent } from "../utils/rentEngine";
import { getAreaIntelligence } from "./areaIntelligenceEngine";
import { getDealScore } from "./dealEngine";
import { type DemandOutput, getDemandOutput } from "./demandEngine";
import { computeEnsemblePrice, savePriceSnapshot } from "./ensembleEngine";
import { getPricePrediction } from "./predictionEngine";
import type { ApartmentSubType } from "./psfLearningEngine";
import { getLocalityCoords } from "./valuationEngine";

// ─── Guidance value floor tables (mirrors ensembleEngine safeguard) ──────────────────
// Unified engine computes lowerBound/upperBound independently from ensembleEngine,
// so the guidance floor must also be enforced here.

const _GUIDANCE_PSF_BY_ZONE_UNIFIED: Record<string, number> = {
  "north-inner": 7800,
  "north-mid": 6200,
  "north-outer": 4500,
  "airport-corridor": 3800,
  northwest: 4200,
  "east-core": 8500,
  "east-mid": 6500,
  "east-outer": 5000,
  "east-peripheral": 3500,
  central: 9500,
  south: 5500,
  unknown: 3500,
};

const _GUIDANCE_TYPE_FACTOR_UNIFIED: Record<string, number> = {
  apartment: 1.0,
  villa: 0.95,
  plot: 0.85,
  commercial: 1.1,
};

function _getGuidancePSFForUnified(
  locality: string,
  propertyType: string,
): number {
  const zone = getLocalityZone(locality.trim().toLowerCase()) ?? "unknown";
  const base =
    _GUIDANCE_PSF_BY_ZONE_UNIFIED[zone] ??
    _GUIDANCE_PSF_BY_ZONE_UNIFIED.unknown;
  const t = propertyType.toLowerCase().trim();
  const factor =
    t === "villa" || t === "house" || t === "row house"
      ? _GUIDANCE_TYPE_FACTOR_UNIFIED.villa
      : t === "plot" || t === "land"
        ? _GUIDANCE_TYPE_FACTOR_UNIFIED.plot
        : t === "commercial" || t === "office" || t === "shop"
          ? _GUIDANCE_TYPE_FACTOR_UNIFIED.commercial
          : _GUIDANCE_TYPE_FACTOR_UNIFIED.apartment;
  return Math.round(base * factor);
}

/** Apply guidance PSF as hard floor: max(value, guidancePSF * sqft). */
function _applyGuidanceFloorTotal(
  totalValue: number,
  guidancePSF: number,
  sqft: number,
): number {
  const guidanceTotal = guidancePSF * sqft;
  return totalValue < guidanceTotal ? guidanceTotal : totalValue;
}

// ─── Public Input Type ──────────────────────────────────────────────────────────

export interface ValuationInput {
  locality: string;
  propertyType: "apartment" | "villa" | "plot" | "commercial";
  area: number; // sqft
  bhk?: string;
  age?: string;
  floor?: string;
  builder?: string;
  project?: string;
  apartmentSubType?: ApartmentSubType; // standalone | gated | township (required when propertyType === 'apartment')
  lat?: number;
  lng?: number;
}

// ─── Public Output Type ─────────────────────────────────────────────────────────

export interface ValuationOutput {
  // Core valuation
  estimatedValue: number; // total value in INR
  psf: number; // price per sqft
  lowerBound: number;
  upperBound: number;
  confidenceTier: "High" | "Medium" | "Low" | "VeryLow";
  confidencePercent: number; // 0-100

  // Pro enhancement data
  liquidityScore: number; // 0-100
  marketHeatIndex: "Very Cold" | "Cold" | "Warm" | "Hot" | "Very Hot";
  distressFlag: "Distress" | "Market Rate" | "Premium";
  investorIRR: number; // percentage e.g. 12.5

  // Additional context
  rentalYield: number; // percentage
  dealScore: number; // 0-100
  dealClassification: string;
  explanation: string;
  comparableCount: number;

  // Raw engine data for deeper display
  demandData?: DemandOutput;
  areaIntelligence?: ReturnType<typeof getAreaIntelligence>;

  // ── Layer breakdown (from ensembleEngine upgrade) ─────────────────────────
  layer1Value?: number; // Layer 1 ML ensemble output (PSF)
  layer2Value?: number; // Layer 2 comparable-weighted output (PSF)
  layer3Delta?: number; // Layer 3 net adjustment delta (PSF)
  exponentialDemandEffect?: number; // DemandWeight factor
  exponentialDistanceEffect?: number; // DistanceWeight factor
  layer1Weight?: number; // Normalised Layer 1 blend weight (0–1)
  layer2Weight?: number; // Normalised Layer 2 blend weight (0–1)
  layer3Weight?: number; // Normalised Layer 3 blend weight (0–1)
  outlierCount?: number; // Outliers removed from comparable pool
  featureCompleteness?: number; // 0–1 fraction of optional features supplied

  // ── Rental exponential (from rentEngine upgrade) ──────────────────────────
  rentDemandFactor?: number;
  rentDistanceFactor?: number;
  baseRent?: number;

  // ── Exponential forecasts (from predictionEngine upgrade) ─────────────────
  exponentialForecast6m?: number; // 6-month price forecast (total INR)
  exponentialForecast12m?: number; // 12-month price forecast (total INR)
  exponentialForecast24m?: number; // 24-month price forecast (total INR)
  trendSlope?: number; // Trend slope from market data (% / 6-month)
  growthWeight?: number; // Exponential growth weight exp(trendSlope)
}

// ─── Helper: parse bhk string to number ─────────────────────────────────────────

function parseBHK(bhk?: string): number | undefined {
  if (!bhk) return undefined;
  const n = Number.parseInt(bhk, 10);
  return Number.isNaN(n) ? undefined : n;
}

// ─── Helper: parse floor string to number ─────────────────────────────────────────

function parseFloor(floor?: string): number | undefined {
  if (!floor) return undefined;
  const n = Number.parseInt(floor, 10);
  return Number.isNaN(n) ? undefined : n;
}

// ─── Helper: parse age string to number ─────────────────────────────────────────

function parseAge(age?: string): number | undefined {
  if (!age) return undefined;
  const n = Number.parseFloat(age);
  return Number.isNaN(n) ? undefined : n;
}

// ─── Derive market heat index from demand score ─────────────────────────────────

function deriveMarketHeatIndex(
  demandScore: number,
): ValuationOutput["marketHeatIndex"] {
  if (demandScore >= 80) return "Very Hot";
  if (demandScore >= 65) return "Hot";
  if (demandScore >= 45) return "Warm";
  if (demandScore >= 25) return "Cold";
  return "Very Cold";
}

// ─── Derive distress flag by comparing PSF to zone median ───────────────────────

function deriveDistressFlag(
  psf: number,
  locality: string,
): ValuationOutput["distressFlag"] {
  const zone = getLocalityZone(locality);
  const zoneMedian = getZoneMedianPSF(zone);
  if (zoneMedian <= 0) return "Market Rate";
  const ratio = psf / zoneMedian;
  if (ratio < 0.75) return "Distress";
  if (ratio > 1.25) return "Premium";
  return "Market Rate";
}

// ─── Derive liquidity score from demand + deal ──────────────────────────────────
// High demand + fair/strong deal → high liquidity

function deriveLiquidityScore(demandScore: number, dealScore: number): number {
  // Weighted blend: demand (60%) + deal attractiveness (40%)
  const raw = demandScore * 0.6 + dealScore * 0.4;
  return Math.round(Math.min(Math.max(raw, 0), 100));
}

// ─── Derive IRR estimate ────────────────────────────────────────────────────────
// IRR = rental yield + appreciation estimate

function deriveInvestorIRR(
  rentalYield: number,
  locality: string,
  demandScore: number,
): number {
  // Use prediction engine's growth rate as appreciation proxy
  // Base appreciation from locality zone
  const zone = getLocalityZone(locality);
  const ZONE_APPRECIATION: Record<string, number> = {
    "north-inner": 7,
    "north-mid": 8,
    "north-outer": 9,
    "airport-corridor": 11,
    northwest: 8,
    "east-core": 8,
    "east-mid": 7,
    "east-outer": 6,
    "east-peripheral": 6,
    central: 5,
    south: 6,
    unknown: 6,
  };
  const baseAppreciation = ZONE_APPRECIATION[zone] ?? 6;
  // Demand boost: +0.5% per 10 demand points above 50
  const demandBoost = Math.max(0, (demandScore - 50) / 10) * 0.5;
  const annualAppreciation = baseAppreciation + demandBoost;
  const irr = rentalYield + annualAppreciation;
  return Math.round(irr * 10) / 10;
}

// ─── Map internal ConfidenceTier to output format ───────────────────────────────

function mapConfidenceTier(tier: string): ValuationOutput["confidenceTier"] {
  if (tier === "High") return "High";
  if (tier === "Medium") return "Medium";
  if (tier === "Low") return "Low";
  return "VeryLow";
}

// ─── Confidence range width ─────────────────────────────────────────────────────

function getRangeFactor(tier: ValuationOutput["confidenceTier"]): number {
  switch (tier) {
    case "High":
      return 0.05;
    case "Medium":
      return 0.08;
    case "Low":
      return 0.12;
    case "VeryLow":
      return 0.18;
    default:
      return 0.1;
  }
}

// ─── Main unified function ──────────────────────────────────────────────────────

export async function valuateProperty(
  input: ValuationInput,
): Promise<ValuationOutput> {
  const { locality, propertyType, area, builder, project } = input;

  // Resolve coordinates
  const localityCoords = getLocalityCoords(locality);
  const lat = input.lat ?? localityCoords.lat;
  const lng = input.lng ?? localityCoords.lng;

  const floorNum = parseFloor(input.floor);
  const ageNum = parseAge(input.age);
  const bhkNum = parseBHK(input.bhk);

  // ── Step 1: Ensemble price (core AVM) ─────────────────────────────────────
  const ensemble = computeEnsemblePrice({
    locality,
    lat,
    lng,
    propertyType,
    sqft: area,
    builder: builder || undefined,
    project: project || undefined,
    apartmentSubType: input.apartmentSubType,
    floorNumber: floorNum,
    propertyAge: ageNum,
  });

  const psf = ensemble.finalPrice;
  const estimatedValue = Math.round(psf * area);
  const confidenceTier = mapConfidenceTier(ensemble.confidenceTier);
  const rangeFactor = getRangeFactor(confidenceTier);

  // ── SAFEGUARD: Guidance Value Hard Floor applied to unified bounds ────────────────
  // ensembleEngine already guards the PSF-level bounds; unified also guards its own
  // total-value bounds (lowerBound = estimatedValue × (1-range), upper = × (1+range)).
  // final = max(ai_total, guidance_psf × sqft) — applied to all three bounds.
  const guidancePSF = _getGuidancePSFForUnified(locality, propertyType);
  const rawLower = Math.round(estimatedValue * (1 - rangeFactor));
  const rawUpper = Math.round(estimatedValue * (1 + rangeFactor));
  const lowerBound = _applyGuidanceFloorTotal(rawLower, guidancePSF, area);
  const upperBound = _applyGuidanceFloorTotal(rawUpper, guidancePSF, area);

  // Save snapshot for trend tracking
  savePriceSnapshot(locality, propertyType, psf);

  // ── Step 2: Demand output ──────────────────────────────────────────────────
  const demandData = getDemandOutput(lat, lng, locality);

  // ── Step 3: Deal score (using estimated value vs itself = market rate baseline)
  // We use a neutral listing price (equal to estimate) for the baseline deal score
  const dealOutput = getDealScore(estimatedValue, estimatedValue);
  const dealScore = dealOutput.score;
  const dealClassification = dealOutput.classification;

  // ── Step 4: Rental yield ────────────────────────────────────────────────────
  const rentEstimate = estimateRent({
    locality,
    bhk: bhkNum,
    area,
    propertyValue: estimatedValue,
    propertyType,
    floor: floorNum ?? 0,
  });

  const rentalYield = rentEstimate.hide ? 0 : rentEstimate.grossYieldPercent;

  // ── Step 5: Pro enhancements ────────────────────────────────────────────────
  const liquidityScore = deriveLiquidityScore(
    demandData.demandScore,
    dealScore,
  );
  const marketHeatIndex = deriveMarketHeatIndex(demandData.demandScore);
  const distressFlag = deriveDistressFlag(psf, locality);
  const investorIRR = deriveInvestorIRR(
    rentalYield,
    locality,
    demandData.demandScore,
  );

  // ── Step 6: Explanation ─────────────────────────────────────────────────────
  const prediction = getPricePrediction(estimatedValue, lat, lng, locality);

  const explanation = generateComparablesReasoning({
    locality,
    subject: {
      area,
      floor: floorNum,
      bhk: bhkNum,
    },
    compsUsed: ensemble.avmLayers.compCount,
    dataLevel: ensemble.dataLevel,
    confidenceTier: ensemble.confidenceTier as
      | "High"
      | "Medium"
      | "Low"
      | "Very Low",
    priceRange: [lowerBound, upperBound],
    medianPrice: estimatedValue,
  });

  // ── Step 7: Area intelligence (for deeper display) ─────────────────────────
  let areaIntelligence: ReturnType<typeof getAreaIntelligence> | undefined;
  try {
    areaIntelligence = getAreaIntelligence(locality, lat, lng);
  } catch {
    areaIntelligence = undefined;
  }

  // Consistency check: log if demand-based prediction disagrees significantly
  const predPsf = prediction.oneYearPrice / area;
  const drift = predPsf > 0 && psf > 0 ? Math.abs(predPsf - psf) / psf : 0;
  if (drift > 0.5) {
    console.warn(
      `[ValuBrix Unified] Prediction drift for "${locality}": AVM PSF=₹${psf} vs 1Y predicted PSF=₹${Math.round(predPsf)} (${(drift * 100).toFixed(1)}%). Using unified engine result.`,
    );
  }

  // ── Exponential forecasts (6m / 12m / 24m) ────────────────────────────────
  // Derived from prediction growth rate applied exponentially per interval
  const annualGrowth = prediction.pctGrowth1Y / 100 || 0.08;
  const trendSlope = ensemble.derivedInputs.pastTrend;
  const growthWeight = Math.round(Math.exp(trendSlope / 100) * 1000) / 1000;
  const exponentialForecast6m = Math.round(
    estimatedValue * (1 + annualGrowth / 2),
  );
  const exponentialForecast12m = Math.round(
    estimatedValue * (1 + annualGrowth),
  );
  const exponentialForecast24m = Math.round(
    estimatedValue * (1 + annualGrowth) ** 2,
  );

  // ── Rental exponential factors ─────────────────────────────────────────────
  const rentDemandFactor =
    Math.round(Math.exp((demandData.demandScore / 100) * 0.4) * 1000) / 1000;
  const rentDistanceFactor =
    Math.round(
      Math.exp(-Math.min(ensemble.derivedInputs.metroDistance * 0.3, 2)) * 1000,
    ) / 1000;

  return {
    estimatedValue,
    psf,
    lowerBound,
    upperBound,
    confidenceTier,
    confidencePercent: ensemble.confidenceScore,
    liquidityScore,
    marketHeatIndex,
    distressFlag,
    investorIRR,
    rentalYield,
    dealScore,
    dealClassification,
    explanation,
    comparableCount: ensemble.avmLayers.compCount,
    demandData,
    areaIntelligence,
    // ── Layer breakdown ──────────────────────────────────────────────────────
    layer1Value: ensemble.layer1Value,
    layer2Value: ensemble.layer2Value,
    layer3Delta: ensemble.layer3Delta,
    exponentialDemandEffect: ensemble.exponentialDemandEffect,
    exponentialDistanceEffect: ensemble.exponentialDistanceEffect,
    layer1Weight: ensemble.layer1Weight,
    layer2Weight: ensemble.layer2Weight,
    layer3Weight: ensemble.layer3Weight,
    outlierCount: ensemble.outlierCount,
    featureCompleteness: ensemble.featureCompleteness,
    // ── Rental exponential ───────────────────────────────────────────────────
    rentDemandFactor,
    rentDistanceFactor,
    baseRent: rentEstimate.hide ? undefined : rentEstimate.estimatedMonthlyRent,
    // ── Exponential forecasts ────────────────────────────────────────────────
    exponentialForecast6m,
    exponentialForecast12m,
    exponentialForecast24m,
    trendSlope,
    growthWeight,
  };
}

// ─── Convenience badge helpers ──────────────────────────────────────────────────
// Used by property cards to show smart badges

/** True if liquidity score >= 70 */
export function isHighLiquidity(output: ValuationOutput): boolean {
  return output.liquidityScore >= 70;
}

/** True if distress flag is "Distress" — i.e. price < 75% of zone median */
export function isDistressDeal(output: ValuationOutput): boolean {
  return output.distressFlag === "Distress";
}

/** True if gross rental yield >= 4% */
export function isHighYield(output: ValuationOutput): boolean {
  return output.rentalYield >= 4.0;
}

/** True if market heat is "Hot" or "Very Hot" */
export function isHotMarket(output: ValuationOutput): boolean {
  return (
    output.marketHeatIndex === "Hot" || output.marketHeatIndex === "Very Hot"
  );
}
