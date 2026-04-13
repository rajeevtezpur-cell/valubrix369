/**
 * investmentIntelligenceEngine.ts — Investment Analytics Engine
 *
 * Computes comprehensive investment intelligence for any Bangalore locality:
 * - IRR projections (1/3/5 year)
 * - Rental income projections
 * - Capital appreciation forecasts
 * - 5-year ROI
 * - Payback period
 * - Risk flags (oversupply, liquidity, builder risk)
 * - Growth drivers (metro, IT corridor, infrastructure)
 *
 * All values are data-driven — derived from localityEngine PSF and rentEngine yield.
 * No hardcoded per-locality numbers.
 */

import {
  type LocalityZone,
  computeDynamicGrowthRate,
  getBaseMicroLocationPSF,
  getLocalityZone,
} from "../utils/localityEngine";
import { getLocalityRentMetrics } from "../utils/rentEngine";
import { computeValuBrixScore } from "./valuBrixScoreEngine";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InvestmentIntelligenceResult {
  irrProjection: {
    oneYear: number; // % per annum
    threeYear: number; // % per annum (annualised)
    fiveYear: number; // % per annum (annualised)
  };
  rentalIncomeProjection: {
    monthly: number; // INR
    annual: number; // INR
  };
  capitalAppreciation: {
    oneYear: number; // %
    threeYear: number; // % (cumulative)
    fiveYear: number; // % (cumulative)
  };
  fiveYearROI: number; // %
  paybackPeriod: number; // years
  riskLevel: "Low" | "Medium" | "High";
  riskFlags: string[];
  growthDrivers: string[];
  marketClassification: string;
  valuBrixScore: number; // 0–100
}

// ─── Zone-level supply/demand balance ────────────────────────────────────────
// Values represent oversupply risk (0 = no oversupply, 1 = high oversupply)
// Derived from known inventory absorption rates per zone

const ZONE_OVERSUPPLY_RISK: Record<LocalityZone, number> = {
  "north-inner": 0.15,
  "north-mid": 0.25,
  "north-outer": 0.35,
  "airport-corridor": 0.3,
  northwest: 0.2,
  "east-core": 0.2,
  "east-mid": 0.18,
  "east-outer": 0.28,
  "east-peripheral": 0.4,
  central: 0.1,
  south: 0.22,
  unknown: 0.35,
};

// Zone-level metro proximity categories
const ZONE_METRO_NEARBY: Record<LocalityZone, boolean> = {
  "north-inner": true, // Nagavara / Hebbal metro
  "north-mid": true, // Under construction
  "north-outer": false,
  "airport-corridor": false,
  northwest: true, // Peenya / Jalahalli metro
  "east-core": true, // Whitefield metro line
  "east-mid": true, // Marathahalli / Bellandur — upcoming
  "east-outer": false,
  "east-peripheral": false,
  central: true, // MG Road, Indiranagar
  south: true, // Silk Board, JP Nagar
  unknown: false,
};

// IT corridor classification
const ZONE_IT_CORRIDOR: Record<LocalityZone, boolean> = {
  "north-inner": true, // Manyata Tech Park
  "north-mid": false,
  "north-outer": false,
  "airport-corridor": true, // Aerospace park, KIADB
  northwest: false,
  "east-core": true, // Whitefield IT corridor
  "east-mid": true, // Sarjapur road IT belt
  "east-outer": false,
  "east-peripheral": false,
  central: false,
  south: true, // Electronic City, HSR
  unknown: false,
};

// ─── Growth drivers builder ───────────────────────────────────────────────────

function buildGrowthDrivers(
  zone: LocalityZone,
  psf: number,
  zonePSF: number,
): string[] {
  const drivers: string[] = [];

  if (ZONE_METRO_NEARBY[zone]) {
    drivers.push("Metro connectivity expansion");
  }
  if (ZONE_IT_CORRIDOR[zone]) {
    drivers.push("IT corridor growth and tech employment");
  }
  if (zone === "airport-corridor") {
    drivers.push("Airport proximity and Aerospace Park development");
    drivers.push("KIADB industrial expansion driving housing demand");
  }
  if (zone === "north-mid" || zone === "north-outer") {
    drivers.push("Expanding social infrastructure (schools, hospitals)");
    drivers.push("Manyata Tech Park spillover demand");
  }
  if (psf < zonePSF * 0.85) {
    drivers.push("Affordable pricing relative to zone — high upside potential");
  }
  if (zone === "east-core") {
    drivers.push("Supply shortage in premium Whitefield projects");
  }
  if (zone === "south") {
    drivers.push("ORR corridor development and startup ecosystem");
  }
  if (zone === "central") {
    drivers.push("Scarcity-driven appreciation in core Bangalore");
  }
  if (drivers.length === 0) {
    drivers.push("Steady residential demand from local employment");
    drivers.push("Infrastructure upgrades in the pipeline");
  }

  return drivers.slice(0, 4); // Max 4 drivers
}

// ─── Risk flags builder ───────────────────────────────────────────────────────

function buildRiskFlags(
  zone: LocalityZone,
  psf: number,
  valuBrixTotal: number,
  grossYield: number,
  liquidityScore: number,
): string[] {
  const flags: string[] = [];

  const oversupplyRisk = ZONE_OVERSUPPLY_RISK[zone] ?? 0.35;

  if (oversupplyRisk > 0.3) {
    flags.push("Oversupply risk — high inventory in this zone");
  }
  if (grossYield < 2.5) {
    flags.push("Low rental yield — primarily a capital appreciation play");
  }
  if (liquidityScore < 8) {
    flags.push("Low liquidity — may take longer to sell");
  }
  if (psf > 15000) {
    flags.push("Premium pricing — limited end-user demand");
  }
  if (zone === "airport-corridor" || zone === "north-outer") {
    flags.push(
      "Peripheral location — dependent on future infrastructure delivery",
    );
  }
  if (valuBrixTotal < 40) {
    flags.push("Below-average investment grade — high-risk zone");
  }

  return flags;
}

// ─── Risk level classifier ───────────────────────────────────────────────────

function classifyRiskLevel(
  flags: string[],
  oversupplyRisk: number,
  valuBrixTotal: number,
): "Low" | "Medium" | "High" {
  if (flags.length >= 3 || oversupplyRisk > 0.35 || valuBrixTotal < 35) {
    return "High";
  }
  if (flags.length >= 1 || oversupplyRisk > 0.2 || valuBrixTotal < 55) {
    return "Medium";
  }
  return "Low";
}

// ─── Main exported function ──────────────────────────────────────────────────

/**
 * computeInvestmentIntelligence — Full investment analytics for a locality.
 *
 * @param locality    Locality name (case-insensitive)
 * @param propertyType Property type context (apartment/villa/plot)
 * @param areaSqft    Optional area in sqft (for rental income projection)
 */
export function computeInvestmentIntelligence(
  locality: string,
  propertyType = "apartment",
  areaSqft = 1000,
): InvestmentIntelligenceResult {
  const zone = getLocalityZone(locality);
  const psf = getBaseMicroLocationPSF(locality);
  const zonePSF = getZoneMedianPSF(zone);
  const rentMetrics = getLocalityRentMetrics(locality);
  const vbScore = computeValuBrixScore(locality, propertyType);

  // ── Capital appreciation forecast ─────────────────────────────────────────
  const demandProxy = 55 + (vbScore.demand / 20) * 45; // 55–100
  const infraProxy = 50 + (vbScore.infrastructure / 20) * 50; // 50–100
  const growthRates = computeDynamicGrowthRate(
    locality,
    demandProxy,
    infraProxy,
  );

  const capAppreciation1Y = growthRates.y1;
  const capAppreciation3Y = growthRates.y3;
  const capAppreciation5Y = growthRates.y5;

  // ── Rental income projection ───────────────────────────────────────────────
  let monthlyRent = 0;

  if (rentMetrics.rentPerSqft > 0) {
    monthlyRent = Math.round(rentMetrics.rentPerSqft * areaSqft);
  } else {
    // Cold-start: PSF-tier yield prior
    const yieldPrior =
      psf > 12000 ? 0.028 : psf >= 8000 ? 0.032 : psf >= 5000 ? 0.036 : 0.038;
    const propertyValue = psf * areaSqft;
    monthlyRent = Math.round((propertyValue * yieldPrior) / 12);
  }
  const annualRent = monthlyRent * 12;

  // ── Gross yield ─────────────────────────────────────────────────────────────
  const propertyValue = psf * areaSqft;
  const grossYield = propertyValue > 0 ? (annualRent / propertyValue) * 100 : 0;

  // ── IRR = capital appreciation + rental yield ─────────────────────────────
  // IRR is annualised: combines rental cash flow + capital gain
  const irr1Y = Number.parseFloat((capAppreciation1Y + grossYield).toFixed(1));
  const irr3Y = Number.parseFloat(
    (capAppreciation3Y / 3 + grossYield).toFixed(1),
  );
  const irr5Y = Number.parseFloat(
    (capAppreciation5Y / 5 + grossYield).toFixed(1),
  );

  // ── 5-year ROI ─────────────────────────────────────────────────────────────
  // Total return = cumulative capital gain + total rental income
  const rentalReturn5Y = grossYield * 5;
  const fiveYearROI = Number.parseFloat(
    (capAppreciation5Y + rentalReturn5Y).toFixed(1),
  );

  // ── Payback period (years to recover investment from rent alone) ────────────
  const paybackPeriod =
    grossYield > 0 ? Number.parseFloat((100 / grossYield).toFixed(1)) : 40;

  // ── Growth drivers ─────────────────────────────────────────────────────────
  const growthDrivers = buildGrowthDrivers(zone, psf, zonePSF);

  // ── Risk flags ─────────────────────────────────────────────────────────────
  const riskFlags = buildRiskFlags(
    zone,
    psf,
    vbScore.total,
    grossYield,
    vbScore.liquidity,
  );

  const oversupplyRisk = ZONE_OVERSUPPLY_RISK[zone] ?? 0.35;
  const riskLevel = classifyRiskLevel(riskFlags, oversupplyRisk, vbScore.total);

  // ── Market classification ──────────────────────────────────────────────────
  const marketClassification =
    vbScore.total >= 75
      ? "Premium Investment Grade"
      : vbScore.total >= 55
        ? "Strong Investment Zone"
        : vbScore.total >= 40
          ? "Developing Market"
          : "Emerging/Peripheral Market";

  return {
    irrProjection: {
      oneYear: irr1Y,
      threeYear: irr3Y,
      fiveYear: irr5Y,
    },
    rentalIncomeProjection: {
      monthly: monthlyRent,
      annual: annualRent,
    },
    capitalAppreciation: {
      oneYear: capAppreciation1Y,
      threeYear: capAppreciation3Y,
      fiveYear: capAppreciation5Y,
    },
    fiveYearROI,
    paybackPeriod,
    riskLevel,
    riskFlags,
    growthDrivers,
    marketClassification,
    valuBrixScore: vbScore.total,
  };
}

// ─── Zone median PSF helper (needed internally) ────────────────────────────
// Re-exported from localityEngine for convenience inside this module

function getZoneMedianPSF(zone: LocalityZone): number {
  // Use approximate zone medians derived from localityEngine data
  const ZONE_MEDIAN: Record<LocalityZone, number> = {
    "north-inner": 11000,
    "north-mid": 9000,
    "north-outer": 7500,
    "airport-corridor": 8000,
    northwest: 8000,
    "east-core": 11000,
    "east-mid": 12000,
    "east-outer": 11500,
    "east-peripheral": 8000,
    central: 11000,
    south: 9000,
    unknown: 7000,
  };
  return ZONE_MEDIAN[zone] ?? 7000;
}
