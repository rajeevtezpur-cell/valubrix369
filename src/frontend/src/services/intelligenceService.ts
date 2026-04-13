/**
 * intelligenceService.ts
 * Wraps backend actor calls for all intelligence engines.
 * Backend is the ONLY source of truth. No frontend fallback logic.
 * If backend is unavailable, an explicit error is thrown.
 */

export interface ValuationResult {
  priceMin: number;
  priceMax: number;
  bestPrice: number;
  confidence: number;
  confidenceReason: string;
  breakdown: {
    comparables: number;
    location: number;
    demand: number;
    infra: number;
    comparablesUsed: number;
    pricePerSqft: number;
  };
  localityFound: boolean;
}

export interface ForecastResult {
  conservative: number;
  realistic: number;
  aggressive: number;
  basePrice: number;
  growthRate: number;
  disclaimer: string;
}

export interface DealScoreResult {
  dealScore: number;
  fairValue: number;
  priceGap: number;
  demandScore: number;
  liquidityScore: number;
  dealTag: string;
  expectedDaysToSell: number;
}

export interface RentalResult {
  rentMin: number;
  rentMax: number;
  avgRent: number;
  yieldPercent: number;
  vacancyRate: number;
  rentalConfidence: number;
  avgRentPerSqft: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function bigintToNum(v: unknown): number {
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  return 0;
}

function requireActor(actor: any, method: string): void {
  if (!actor || typeof actor[method] !== "function") {
    throw new Error(
      `Backend unavailable: ${method} not found. Please ensure the backend is deployed and seeded.`,
    );
  }
}

// ─── Seeding ─────────────────────────────────────────────────────────────────

let seeded = false;

export async function ensureSeeded(actor: any): Promise<void> {
  if (seeded) return;
  requireActor(actor, "isIntelligenceSeeded");
  const isSeededRaw = await actor.isIntelligenceSeeded();
  const isSeeded = typeof isSeededRaw === "boolean" ? isSeededRaw : false;
  if (!isSeeded) {
    requireActor(actor, "seedIntelligenceData");
    await actor.seedIntelligenceData();
  }
  seeded = true;
}

// ─── Valuation ───────────────────────────────────────────────────────────────

export async function computeValuation(
  actor: any,
  locality: string,
  propertyType: string,
  sqft: number,
  age: number,
  amenitiesCount: number,
): Promise<ValuationResult> {
  requireActor(actor, "computeValuation");
  const r = await actor.computeValuation(
    locality,
    propertyType,
    BigInt(Math.round(sqft)),
    BigInt(Math.round(age)),
    BigInt(Math.round(amenitiesCount)),
  );
  return {
    priceMin: bigintToNum(r.priceMin),
    priceMax: bigintToNum(r.priceMax),
    bestPrice: bigintToNum(r.bestPrice),
    confidence: bigintToNum(r.confidence),
    confidenceReason: r.confidenceReason ?? "",
    breakdown: {
      comparables: bigintToNum(r.breakdown?.comparablesContribution),
      location: bigintToNum(r.breakdown?.locationContribution),
      demand: bigintToNum(r.breakdown?.demandContribution),
      infra: bigintToNum(r.breakdown?.infraContribution),
      comparablesUsed: bigintToNum(r.breakdown?.comparablesUsed),
      pricePerSqft: bigintToNum(r.breakdown?.pricePerSqft),
    },
    localityFound: !!r.localityFound,
  };
}

// ─── Forecast ────────────────────────────────────────────────────────────────

export async function getForecast(
  actor: any,
  locality: string,
  propertyType: string,
): Promise<ForecastResult> {
  requireActor(actor, "getForecast");
  const r = await actor.getForecast(locality, propertyType);
  return {
    conservative: bigintToNum(r.conservative),
    realistic: bigintToNum(r.realistic),
    aggressive: bigintToNum(r.aggressive),
    basePrice: bigintToNum(r.basePrice),
    growthRate: bigintToNum(r.growthRate),
    disclaimer: r.disclaimer ?? "",
  };
}

// ─── Deal Score ───────────────────────────────────────────────────────────────

export async function getDealScoreFromBackend(
  actor: any,
  listingId: number,
): Promise<DealScoreResult> {
  requireActor(actor, "getDealScore");
  const r = await actor.getDealScore(BigInt(listingId));
  return {
    dealScore: bigintToNum(r.dealScore),
    fairValue: bigintToNum(r.fairValue),
    priceGap: bigintToNum(r.priceGap),
    demandScore: bigintToNum(r.demandScore),
    liquidityScore: bigintToNum(r.liquidityScore),
    dealTag: r.dealTag ?? "Good",
    expectedDaysToSell: bigintToNum(r.expectedDaysToSell),
  };
}

// ─── Rental Intelligence ──────────────────────────────────────────────────────

export async function getRentalIntelligence(
  actor: any,
  locality: string,
): Promise<RentalResult> {
  requireActor(actor, "getRentalIntelligence");
  const r = await actor.getRentalIntelligence(locality);
  return {
    rentMin: bigintToNum(r.rentMin),
    rentMax: bigintToNum(r.rentMax),
    avgRent: bigintToNum(r.avgRent),
    yieldPercent: bigintToNum(r.yieldPercent),
    vacancyRate: bigintToNum(r.vacancyRate),
    rentalConfidence: bigintToNum(r.rentalConfidence),
    avgRentPerSqft: bigintToNum(r.avgRentPerSqft),
  };
}

// ─── Feedback Tracking ───────────────────────────────────────────────────────

export async function trackFeedback(
  actor: any,
  listingId: number,
  eventType: string,
): Promise<void> {
  try {
    if (actor && typeof actor.trackFeedback === "function") {
      await actor.trackFeedback(BigInt(listingId), eventType);
    }
  } catch {
    // Feedback tracking is best-effort, silent fail is acceptable
  }
}

// ─── Record Daily Snapshot ───────────────────────────────────────────────────

export async function recordSnapshot(
  actor: any,
  locality: string,
): Promise<void> {
  try {
    if (actor && typeof actor.recordDailySnapshot === "function") {
      await actor.recordDailySnapshot(locality);
    }
  } catch {
    // Snapshot recording is best-effort
  }
}

// ─── Batch Update Demand Signals ──────────────────────────────────────────────

export async function batchUpdateDemand(actor: any): Promise<void> {
  try {
    if (actor && typeof actor.batchUpdateDemandSignals === "function") {
      await actor.batchUpdateDemandSignals();
    }
  } catch {
    // Best-effort
  }
}
