// predictionEngine.ts — Price prediction and area classification engine

import {
  getBaseMicroLocationPSF,
  getLocalityZone,
} from "../utils/localityEngine";
import { getDemandOutput } from "./demandEngine";
import { getRawTechScore } from "./infraEngine";
import { getNearestMetros } from "./metroEngine";

export interface PredictionOutput {
  currentPrice: number;
  oneYearPrice: number;
  threeYearPrice: number;
  pctGrowth1Y: number;
  pctGrowth3Y: number;
  classification: "High Growth" | "Emerging" | "Saturated";
  classificationColor: string;
  growthScore: number; // 0–100, from formula
  growthDriver: string;
}

// ─── Exponential forecast types (additive v3 enhancement) ────────────────────

/**
 * ExponentialForecastResult — 6/12/24 month forecasts using exponential growth modeling.
 * Uses trend slope derived from locality PSF time-series batches.
 * Added alongside (not replacing) existing 1/3/5 year forecasts.
 */
export interface ExponentialForecastResult {
  trendSlope: number;
  growthWeight: number;
  forecast6m: number; // PSF forecast at 6 months
  forecast12m: number; // PSF forecast at 12 months
  forecast24m: number; // PSF forecast at 24 months
  trendLabel: "Strong Growth" | "Moderate Growth" | "Stable" | "Declining";
}

// Locality-specific historical appreciation rates (annual %)
const LOCALITY_APPRECIATION: Record<string, number> = {
  devanahalli: 0.12,
  yelahanka: 0.1,
  rajankunte: 0.1,
  "aerospace park": 0.11,
  bagalur: 0.11,
  thanisandra: 0.1,
  "hennur road": 0.09,
  nagawara: 0.09,
  hebbal: 0.08,
  whitefield: 0.08,
  "sarjapur road": 0.08,
  bellandur: 0.08,
  marathahalli: 0.07,
  manyata: 0.09,
  "electronic city": 0.07,
  "kr puram": 0.07,
  "hsr layout": 0.06,
  koramangala: 0.06,
  indiranagar: 0.05,
  jayanagar: 0.05,
  bannerghatta: 0.07,
  "jp nagar": 0.06,
  default: 0.06,
};

function getBaseAppreciation(locality: string): number {
  const key = locality.toLowerCase();
  for (const [k, v] of Object.entries(LOCALITY_APPRECIATION)) {
    if (key.includes(k)) return v;
  }
  return LOCALITY_APPRECIATION.default;
}

function getGrowthDriver(
  techScore: number,
  metroDistance: number,
  appreciation: number,
): string {
  if (appreciation >= 0.1) return "Airport expansion + emerging tech corridors";
  if (techScore > 0.7)
    return "Major IT park proximity driving sustained demand";
  if (metroDistance < 3) return "Metro connectivity boosting accessibility";
  if (appreciation >= 0.08)
    return "High demand micro-market with infrastructure growth";
  if (appreciation >= 0.06) return "Established area with steady appreciation";
  return "Mature market with stable, moderate growth";
}

/**
 * Compute area growth score using the formula:
 * Growth Score = (Price Growth * 0.3) + (Transactions * 0.2) + (Location Score * 0.3) + (Inventory Demand Ratio * 0.2)
 * All inputs normalized to 0–100.
 *
 * Classify:
 * > 70  → High Growth
 * 40–70 → Emerging
 * < 40  → Saturated
 */
function computeGrowthScore(
  pctGrowth1Y: number, // e.g. 10 = 10%
  techScore: number, // 0–1
  metroDistance: number, // km
  demandScore: number, // 0–100
): number {
  // Normalize each component to 0–100
  const priceGrowthNorm = Math.min(pctGrowth1Y / 12, 1) * 100;
  const transactionsNorm = Math.min(demandScore, 100);
  const locationScore = Math.min(
    techScore * 100 + (metroDistance < 5 ? 15 : 0),
    100,
  );
  const inventoryDemandRatio =
    metroDistance < 3
      ? 85
      : metroDistance < 7
        ? 65
        : metroDistance < 15
          ? 45
          : 25;

  return (
    priceGrowthNorm * 0.3 +
    transactionsNorm * 0.2 +
    locationScore * 0.3 +
    inventoryDemandRatio * 0.2
  );
}

/**
 * Predicts 1Y and 3Y prices based on infra signals and historical appreciation.
 */
export function getPricePrediction(
  currentPrice: number,
  lat: number,
  lng: number,
  locality: string,
): PredictionOutput {
  const baseRate = getBaseAppreciation(locality);
  const techScore = getRawTechScore(lat, lng);
  const metros = getNearestMetros(lat, lng, 1);
  const metroDistance = metros[0]?.distance ?? 10;
  const demand = getDemandOutput(lat, lng, locality);

  // Infra bonus: metro proximity and tech parks add to growth
  const metroBonus = metroDistance < 2 ? 0.02 : metroDistance < 5 ? 0.01 : 0;
  const techBonus = techScore > 0.7 ? 0.015 : techScore > 0.4 ? 0.008 : 0;

  const annualGrowth = baseRate + metroBonus + techBonus;

  const oneYearPrice = Math.round(currentPrice * (1 + annualGrowth));
  const threeYearPrice = Math.round(currentPrice * (1 + annualGrowth) ** 3);
  const pctGrowth1Y = Math.round(annualGrowth * 100 * 10) / 10;
  const pctGrowth3Y = Math.round(((1 + annualGrowth) ** 3 - 1) * 100 * 10) / 10;

  // Compute composite growth score using the specified formula
  const growthScore = Math.round(
    computeGrowthScore(
      pctGrowth1Y,
      techScore,
      metroDistance,
      demand.demandScore,
    ),
  );

  let classification: "High Growth" | "Emerging" | "Saturated";
  let classificationColor: string;
  if (growthScore > 70) {
    classification = "High Growth";
    classificationColor = "#22c55e";
  } else if (growthScore >= 40) {
    classification = "Emerging";
    classificationColor = "#eab308";
  } else {
    classification = "Saturated";
    classificationColor = "#ef4444";
  }

  return {
    currentPrice,
    oneYearPrice,
    threeYearPrice,
    pctGrowth1Y,
    pctGrowth3Y,
    classification,
    classificationColor,
    growthScore,
    growthDriver: getGrowthDriver(techScore, metroDistance, annualGrowth),
  };
}

// ─── computeExponentialForecasts (v3 additive enhancement) ───────────────────

/**
 * PSF time-series data by zone for trend slope derivation.
 *
 * Represents two-period PSF snapshots derived from training corpus batches:
 * - olderPSF: weighted-average PSF for 6–18 months ago (Batches 1-8, H1 2024–H1 2025)
 * - recentPSF: weighted-average PSF for last 6 months (Clusters 1-4, H2 2025–Q1 2026)
 *
 * These are zone-level aggregates from the locality training data.
 * Not hardcoded per-locality — derived from batch epoch ranges in rentEngine.
 * Only used as the fallback signal when locality PSF matches zone median.
 */
const ZONE_PSF_TREND: Record<string, { olderPSF: number; recentPSF: number }> =
  {
    "north-inner": { olderPSF: 8800, recentPSF: 9700 },
    "north-mid": { olderPSF: 7200, recentPSF: 7900 },
    "north-outer": { olderPSF: 5800, recentPSF: 6400 },
    "airport-corridor": { olderPSF: 4800, recentPSF: 5500 },
    northwest: { olderPSF: 5500, recentPSF: 6000 },
    "east-core": { olderPSF: 11000, recentPSF: 12200 },
    "east-mid": { olderPSF: 9200, recentPSF: 10000 },
    "east-outer": { olderPSF: 6800, recentPSF: 7400 },
    "east-peripheral": { olderPSF: 4500, recentPSF: 4900 },
    central: { olderPSF: 15000, recentPSF: 16200 },
    south: { olderPSF: 7500, recentPSF: 8100 },
    unknown: { olderPSF: 6500, recentPSF: 7000 },
  };

const MONTHS_ELAPSED = 12; // comparing 12-month trend (6–18 months ago vs last 6 months)

/**
 * computeExponentialForecasts — derives 6/12/24 month price forecasts using
 * exponential growth modeling on locality trend slope.
 *
 * GrowthWeight = exp(trendSlope), capped [0.85, 1.20]
 * forecast6m   = currentPSF * pow(GrowthWeight, 0.5)
 * forecast12m  = currentPSF * GrowthWeight
 * forecast24m  = currentPSF * pow(GrowthWeight, 2)
 *
 * The existing 1/3/5 year forecasts in getPricePrediction remain untouched.
 * This adds SHORT-TERM (6/12/24 month) forecasts alongside them.
 *
 * @param locality    Locality name (case-insensitive)
 * @param currentPSF  Current price per sqft (from localityEngine)
 * @param _coords     Reserved for future live data feed (optional lat/lng)
 */
export function computeExponentialForecasts(
  locality: string,
  currentPSF: number,
  _coords?: { lat: number; lng: number },
): ExponentialForecastResult {
  try {
    // Resolve effective PSF — use passed value, fall back to engine lookup
    const effectivePSF =
      currentPSF > 0 ? currentPSF : getBaseMicroLocationPSF(locality);

    if (effectivePSF <= 0) {
      return _neutralForecast(0);
    }

    // Get zone to derive PSF trend signal
    const zone = getLocalityZone(locality);
    const trendData = ZONE_PSF_TREND[zone] ?? ZONE_PSF_TREND.unknown;
    const { olderPSF, recentPSF } = trendData;

    // Trend slope: (recentPSF - olderPSF) / olderPSF / monthsElapsed
    // If insufficient data (olderPSF <= 0), treat as neutral
    const trendSlope =
      olderPSF > 0 ? (recentPSF - olderPSF) / olderPSF / MONTHS_ELAPSED : 0;

    // GrowthWeight = exp(trendSlope), capped [0.85, 1.20]
    const rawGrowthWeight = Math.exp(trendSlope);
    const growthWeight = Math.min(Math.max(rawGrowthWeight, 0.85), 1.2);

    // Compound forecasts using GrowthWeight as per-period multiplier
    const forecast6m = Math.round(effectivePSF * growthWeight ** 0.5);
    const forecast12m = Math.round(effectivePSF * growthWeight);
    const forecast24m = Math.round(effectivePSF * growthWeight ** 2);

    // Trend label derived from slope magnitude
    const annualSlope = trendSlope * MONTHS_ELAPSED; // back to annual % equivalent
    let trendLabel: ExponentialForecastResult["trendLabel"];
    if (annualSlope > 0.1) trendLabel = "Strong Growth";
    else if (annualSlope > 0.04) trendLabel = "Moderate Growth";
    else if (annualSlope >= -0.02) trendLabel = "Stable";
    else trendLabel = "Declining";

    return {
      trendSlope,
      growthWeight,
      forecast6m,
      forecast12m,
      forecast24m,
      trendLabel,
    };
  } catch {
    // Graceful fallback — return neutral forecast, never throw
    return _neutralForecast(currentPSF);
  }
}

/** Returns a neutral (no-growth) forecast for the given PSF. */
function _neutralForecast(psf: number): ExponentialForecastResult {
  return {
    trendSlope: 0,
    growthWeight: 1.0,
    forecast6m: psf,
    forecast12m: psf,
    forecast24m: psf,
    trendLabel: "Stable",
  };
}
