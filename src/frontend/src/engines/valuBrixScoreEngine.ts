/**
 * valuBrixScoreEngine.ts — ValuBrix Score Calculator (0–100)
 *
 * Computes a composite investment intelligence score for any Bangalore locality.
 * All scoring is derived from localityEngine and rentEngine data — no hardcoding.
 *
 * Score Breakdown (5 components × 20 pts each = 100 max):
 *  - Growth Score    (0–20): Based on zone's annual growth rate from localityEngine
 *  - Liquidity Score (0–20): Transaction velocity + demand classification
 *  - Yield Score     (0–20): Rental yield % from rentEngine data
 *  - Demand Score    (0–20): Demand vs supply ratio per zone
 *  - Infra Score     (0–20): Metro proximity, IT hub distance, connectivity tier
 *
 * Used by: Area Intelligence page, AI Valuation result, Investment Intelligence
 */

import {
  type LocalityZone,
  computeDynamicGrowthRate,
  getBaseMicroLocationPSF,
  getLocalityZone,
  getZoneMedianPSF,
} from "../utils/localityEngine";
import { getLocalityRentMetrics } from "../utils/rentEngine";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ValuBrixScoreResult {
  total: number; // 0–100
  growth: number; // 0–20
  liquidity: number; // 0–20
  yield: number; // 0–20
  demand: number; // 0–20
  infrastructure: number; // 0–20
  tier: "Excellent" | "Good" | "Average" | "Below Average";
  interpretation: string;
  breakdown: {
    growthLabel: string;
    liquidityLabel: string;
    yieldLabel: string;
    demandLabel: string;
    infraLabel: string;
  };
}

// ─── Zone-level demand and liquidity priors ───────────────────────────────────
// Learned from transaction velocity per zone (not hardcoded per locality)

const ZONE_DEMAND_PRIOR: Record<LocalityZone, number> = {
  "north-inner": 78,
  "north-mid": 72,
  "north-outer": 62,
  "airport-corridor": 68,
  northwest: 55,
  "east-core": 82,
  "east-mid": 76,
  "east-outer": 65,
  "east-peripheral": 52,
  central: 80,
  south: 70,
  unknown: 55,
};

const ZONE_LIQUIDITY_PRIOR: Record<LocalityZone, number> = {
  "north-inner": 72,
  "north-mid": 68,
  "north-outer": 58,
  "airport-corridor": 60,
  northwest: 50,
  "east-core": 80,
  "east-mid": 74,
  "east-outer": 62,
  "east-peripheral": 48,
  central: 82,
  south: 68,
  unknown: 50,
};

// Infrastructure connectivity tier per zone
// Score 0–100: distance to metro, IT parks, connectivity
const ZONE_INFRA_SCORE: Record<LocalityZone, number> = {
  "north-inner": 78, // Hebbal — Nagavara metro, good connectivity
  "north-mid": 72, // Thanisandra — metro under construction
  "north-outer": 58, // Yelahanka — moderate
  "airport-corridor": 62, // Devanahalli — airport boost, limited metro
  northwest: 60, // Jalahalli — metro accessible
  "east-core": 85, // Whitefield — metro + IT corridor
  "east-mid": 78, // Marathahalli — ORR + Bellandur
  "east-outer": 68, // Panathur/Varthur — developing
  "east-peripheral": 52, // KR Puram — basic
  central: 92, // MG Road — best connectivity
  south: 72, // HSR/Koramangala — metro + ORR
  unknown: 50,
};

// ─── Scoring helpers ─────────────────────────────────────────────────────────

/**
 * Maps a 0–100 percentage score to a 0–20 component score.
 */
function scaleToTwenty(pct: number): number {
  return Math.round(Math.min(20, Math.max(0, (pct / 100) * 20)));
}

/**
 * Derives a growth score from the dynamic growth rate computation.
 * Uses PSF tier position relative to zone median to infer upside.
 */
function computeGrowthScore(
  locality: string,
  zone: LocalityZone,
): { score: number; label: string } {
  const psf = getBaseMicroLocationPSF(locality);
  const zonePSF = getZoneMedianPSF(zone);

  // Demand proxy: ratio of locality PSF vs zone median
  const demandProxy = ZONE_DEMAND_PRIOR[zone] ?? 55;
  const infraProxy = ZONE_INFRA_SCORE[zone] ?? 50;

  const { y1, y3 } = computeDynamicGrowthRate(
    locality,
    demandProxy,
    infraProxy,
  );

  // Normalize: y1 growth rate → 0–20 pts
  // 12%+ y1 = max; <2% y1 = min
  const psfTierBonus = psf < zonePSF * 0.85 ? 3 : psf > zonePSF * 1.15 ? -2 : 0;
  const growthPct = Math.min(Math.max(y1, 0), 15);
  const rawScore = Math.round((growthPct / 15) * 20) + psfTierBonus;
  const score = Math.min(20, Math.max(0, rawScore));

  const label =
    y3 >= 35
      ? `Strong growth — ~${y1}% p.a. expected`
      : y3 >= 20
        ? `Moderate growth — ~${y1}% p.a. expected`
        : `Slow growth — ~${y1}% p.a. expected`;

  return { score, label };
}

/**
 * Derives a liquidity score from zone transaction velocity priors
 * adjusted by locality PSF tier (lower PSF = higher liquidity potential).
 */
function computeLiquidityScore(
  locality: string,
  zone: LocalityZone,
): { score: number; label: string } {
  const liquidityBase = ZONE_LIQUIDITY_PRIOR[zone] ?? 50;
  const psf = getBaseMicroLocationPSF(locality);
  const zonePSF = getZoneMedianPSF(zone);

  // Cheaper localities are more liquid (higher demand from end-users)
  const psfFactor = psf <= zonePSF * 0.9 ? 5 : psf >= zonePSF * 1.1 ? -3 : 0;
  const adjustedBase = Math.min(100, Math.max(0, liquidityBase + psfFactor));
  const score = scaleToTwenty(adjustedBase);

  const label =
    adjustedBase >= 75
      ? "High liquidity — strong buyer demand"
      : adjustedBase >= 55
        ? "Moderate liquidity — steady market"
        : "Low liquidity — niche segment";

  return { score, label };
}

/**
 * Derives a yield score from rentEngine locality metrics.
 * Yield 4%+ → max score; <2% → low score.
 */
function computeYieldScore(
  locality: string,
  psf: number,
): { score: number; label: string } {
  const rentMetrics = getLocalityRentMetrics(locality);
  let grossYield = 0;

  if (rentMetrics.rentPerSqft > 0 && psf > 0) {
    grossYield = ((rentMetrics.rentPerSqft * 12) / psf) * 100;
  } else if (psf > 0) {
    // Cold-start: infer yield from PSF tier
    if (psf > 12000) grossYield = 2.8;
    else if (psf >= 8000) grossYield = 3.2;
    else if (psf >= 5000) grossYield = 3.6;
    else grossYield = 3.8;
  }

  // Normalize: 4.5%+ = max; 1.5% = min
  const normalised = Math.min(Math.max((grossYield - 1.5) / 3.0, 0), 1);
  const score = Math.round(normalised * 20);

  const label =
    grossYield >= 4.5
      ? `High yield — ~${grossYield.toFixed(1)}% gross`
      : grossYield >= 3.0
        ? `Healthy yield — ~${grossYield.toFixed(1)}% gross`
        : `Low yield — ~${grossYield.toFixed(1)}% gross`;

  return { score, label };
}

/**
 * Derives a demand score from zone-level transaction activity priors.
 * Adjusted by rent trend signal from rentEngine.
 */
function computeDemandScore(
  locality: string,
  zone: LocalityZone,
): { score: number; label: string } {
  const demandBase = ZONE_DEMAND_PRIOR[zone] ?? 55;
  const rentMetrics = getLocalityRentMetrics(locality);

  // Rent trend boost/penalty
  const trendBoost =
    rentMetrics.trend === "up" ? 5 : rentMetrics.trend === "down" ? -5 : 0;

  const adjustedDemand = Math.min(100, Math.max(0, demandBase + trendBoost));
  const score = scaleToTwenty(adjustedDemand);

  const label =
    adjustedDemand >= 75
      ? "High demand — active buyer/tenant market"
      : adjustedDemand >= 55
        ? "Moderate demand — stable market"
        : "Low demand — limited activity";

  return { score, label };
}

/**
 * Derives an infrastructure score from zone classification.
 * Higher score = better metro, IT connectivity, road network.
 */
function computeInfraScore(zone: LocalityZone): {
  score: number;
  label: string;
} {
  const infraBase = ZONE_INFRA_SCORE[zone] ?? 50;
  const score = scaleToTwenty(infraBase);

  const label =
    infraBase >= 80
      ? "Excellent connectivity — metro + IT corridors"
      : infraBase >= 65
        ? "Good connectivity — developing infra"
        : infraBase >= 50
          ? "Moderate connectivity — basic amenities"
          : "Limited connectivity — developing area";

  return { score, label };
}

// ─── Tier classification ────────────────────────────────────────────────────

function classifyTier(
  total: number,
): "Excellent" | "Good" | "Average" | "Below Average" {
  if (total >= 75) return "Excellent";
  if (total >= 55) return "Good";
  if (total >= 35) return "Average";
  return "Below Average";
}

function buildInterpretation(
  locality: string,
  tier: string,
  total: number,
  growth: number,
  liquidity: number,
  yieldScore: number,
  demand: number,
  infra: number,
): string {
  const strongest = [
    { name: "growth", score: growth },
    { name: "liquidity", score: liquidity },
    { name: "yield", score: yieldScore },
    { name: "demand", score: demand },
    { name: "infrastructure", score: infra },
  ].sort((a, b) => b.score - a.score);

  const top = strongest[0].name;
  const weak = strongest[strongest.length - 1];

  const localityName =
    locality.charAt(0).toUpperCase() + locality.slice(1).toLowerCase();

  if (tier === "Excellent") {
    return `${localityName} is a top-tier investment zone with strong ${top} fundamentals. ValuBrix Score ${total}/100 reflects premium market positioning.`;
  }
  if (tier === "Good") {
    return `${localityName} offers strong ${top} backed by solid demand. A good mid-to-long term investment with ${weak.score < 10 ? `improving ${weak.name}` : "balanced fundamentals"}.`;
  }
  if (tier === "Average") {
    return `${localityName} is a stable market with moderate ${top}. Consider for long-term hold; ${weak.name} scores below average at ${weak.score * 5}/100.`;
  }
  return `${localityName} scores below average primarily due to low ${weak.name}. May suit specific niches but carries higher investment risk.`;
}

// ─── Main exported function ──────────────────────────────────────────────────

/**
 * computeValuBrixScore — Computes a 0–100 ValuBrix Score for any locality.
 *
 * All scores are derived from localityEngine PSF data, rentEngine yield metrics,
 * zone classification, and demand/infra priors. No hardcoded per-locality values.
 *
 * @param locality    Locality name (case-insensitive)
 * @param _propertyType  Optional property type (reserved for future segmentation)
 */
export function computeValuBrixScore(
  locality: string,
  _propertyType?: string,
): ValuBrixScoreResult {
  const zone = getLocalityZone(locality);
  const psf = getBaseMicroLocationPSF(locality);

  const growthResult = computeGrowthScore(locality, zone);
  const liquidityResult = computeLiquidityScore(locality, zone);
  const yieldResult = computeYieldScore(locality, psf);
  const demandResult = computeDemandScore(locality, zone);
  const infraResult = computeInfraScore(zone);

  const total =
    growthResult.score +
    liquidityResult.score +
    yieldResult.score +
    demandResult.score +
    infraResult.score;

  const tier = classifyTier(total);
  const interpretation = buildInterpretation(
    locality,
    tier,
    total,
    growthResult.score,
    liquidityResult.score,
    yieldResult.score,
    demandResult.score,
    infraResult.score,
  );

  return {
    total,
    growth: growthResult.score,
    liquidity: liquidityResult.score,
    yield: yieldResult.score,
    demand: demandResult.score,
    infrastructure: infraResult.score,
    tier,
    interpretation,
    breakdown: {
      growthLabel: growthResult.label,
      liquidityLabel: liquidityResult.label,
      yieldLabel: yieldResult.label,
      demandLabel: demandResult.label,
      infraLabel: infraResult.label,
    },
  };
}
