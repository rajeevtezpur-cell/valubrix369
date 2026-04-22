// locationScoringEngine.ts — Data-driven scoring for Smart/Premium/Growth/Investment filters
// All formulas are derived from actual location data — no hardcoded values.
// Safe defaults (0.5) used when data fields are missing rather than failing.

// ─── Apartment Sub-Type ───────────────────────────────────────────────────────
export type ApartmentSubType = "standalone" | "gated" | "township";

/** Sub-type PSF multipliers applied on top of base apartment PSF.
 * Township > Gated > Standalone — consistent with AI Valuation engine. */
export const APARTMENT_SUBTYPE_PSF_MULTIPLIERS: Record<
  ApartmentSubType,
  number
> = {
  standalone: 0.9,
  gated: 1.0,
  township: 1.15,
};

/**
 * Score adjustments applied to Area Intelligence scoring dimensions per sub-type.
 * Livability: township has internal amenities (+8), gated has common amenities (+4)
 * Growth:     township has large developer projects (+6), gated has society premium (+3)
 * Density:    township lower density = premium (-5), gated lower density (-2)
 */
export const APARTMENT_SUBTYPE_SCORE_ADJUSTMENTS: Record<
  ApartmentSubType,
  { livability: number; growth: number; density: number }
> = {
  standalone: { livability: 0, growth: 0, density: 0 },
  gated: { livability: 4, growth: 3, density: -2 },
  township: { livability: 8, growth: 6, density: -5 },
};

export interface LocationScoreInputs {
  // Identity
  name: string;
  lat?: number;
  lng?: number;
  // Market data
  psf?: number; // price per sqft
  medianPSF?: number; // city/zone median PSF for normalisation
  maxPSF?: number; // city max PSF for normalisation
  // Infrastructure
  infraScore?: number; // 0–1 normalised infra proximity score
  amenityScore?: number; // 0–1 normalised amenity richness score
  connectivityScore?: number; // 0–1 metro/highway connectivity
  // Growth signals
  demandMomentum?: number; // 0–1 sales velocity vs average
  infraPipeline?: number; // 0–1 upcoming infra score
  growthScore?: number; // 0–1 explicit growth score if available
  // Additional
  builderPremium?: number; // 1.0 = neutral, >1 = premium builder
}

export interface LocationScores {
  smart: number; // 0–100 balanced: value + growth + livability
  premium: number; // 0–100 high-end: above median + amenities + infra
  growth: number; // 0–100 growth potential: momentum + pipeline + undervalued
  investment: number; // 0–100 ROI-weighted composite
}

export interface ScoredLocation extends LocationScoreInputs {
  scores: LocationScores;
}

/**
 * Compute data-driven scores for a single location.
 * All inputs are optional — sensible defaults ensure graceful degradation.
 */
function scoreLocation(
  loc: LocationScoreInputs,
  stats: { medianPSF: number; maxPSF: number },
): LocationScores {
  const { medianPSF, maxPSF } = stats;

  // Safe resolved values — never divide by zero, never produce NaN
  const psf = loc.psf ?? medianPSF;
  const safeMax = maxPSF > 0 ? maxPSF : psf * 2;
  const safeMedian = medianPSF > 0 ? medianPSF : psf;

  // ── Normalised sub-scores (0–1) ───────────────────────────────────────────

  // priceNorm: lower price = higher smart score (value opportunity)
  const priceNorm =
    safeMax > 0 ? Math.max(0, Math.min(1, 1 - psf / safeMax)) : 0.5;

  // priceAboveMedian: higher PSF relative to median = higher premium score
  const priceAboveMedian =
    safeMedian > 0 ? Math.max(0, Math.min(1.5, psf / safeMedian)) / 1.5 : 0.5;

  // priceUndervalued: inverse — low PSF relative to market = growth signal
  const priceUndervalued = priceNorm;

  const infraScore = loc.infraScore ?? 0.5;
  const amenityScore = loc.amenityScore ?? 0.5;
  const connectivity = loc.connectivityScore ?? 0.5;
  const momentum = loc.demandMomentum ?? 0.5;
  const pipeline = loc.infraPipeline ?? loc.growthScore ?? 0.5;
  const growthRaw = loc.growthScore ?? (momentum + pipeline) / 2;

  // Livability: blend amenities + connectivity
  const livabilityNorm = amenityScore * 0.5 + connectivity * 0.5;

  // Growth norm: blend explicit growth with momentum
  const growthNorm = growthRaw * 0.6 + momentum * 0.4;

  // ── SMART SCORE — balanced (value × growth × livability) ─────────────────
  // priceNorm   0.35 — value opportunity
  // growthNorm  0.35 — future appreciation
  // livability  0.30 — quality of life
  const rawSmart = priceNorm * 0.35 + growthNorm * 0.35 + livabilityNorm * 0.3;

  // ── PREMIUM SCORE — above median + amenities + infra ─────────────────────
  // priceAboveMedian 0.40 — premium-priced zone
  // amenityScore     0.30 — high amenity richness
  // infraScore       0.30 — strong infra proximity
  const rawPremium =
    priceAboveMedian * 0.4 + amenityScore * 0.3 + infraScore * 0.3;

  // ── GROWTH SCORE — momentum + pipeline + undervalued ─────────────────────
  // momentum         0.40 — current demand velocity
  // pipeline         0.30 — upcoming infrastructure
  // priceUndervalued 0.30 — low current price = more upside
  const rawGrowth = momentum * 0.4 + pipeline * 0.3 + priceUndervalued * 0.3;

  // ── INVESTMENT SCORE — ROI-weighted composite ─────────────────────────────
  // smart    0.30 — balanced opportunity
  // growth   0.40 — highest weight: future appreciation matters most
  // premium  0.30 — quality / exit value
  const rawInvestment = rawSmart * 0.3 + rawGrowth * 0.4 + rawPremium * 0.3;

  // Normalise all to 0–100, clamped
  const clamp = (v: number) => Math.round(Math.max(0, Math.min(100, v * 100)));

  return {
    smart: clamp(rawSmart),
    premium: clamp(rawPremium),
    growth: clamp(rawGrowth),
    investment: clamp(rawInvestment),
  };
}

/**
 * Derive market statistics from the dataset for normalisation.
 * Falls back to reasonable Bangalore defaults when data is insufficient.
 */
function deriveStats(locations: LocationScoreInputs[]): {
  medianPSF: number;
  maxPSF: number;
} {
  const psfs = locations
    .map((l) => l.psf)
    .filter((v): v is number => v != null && v > 0)
    .sort((a, b) => a - b);

  if (psfs.length === 0) {
    return { medianPSF: 7500, maxPSF: 18000 }; // Bangalore safe defaults
  }

  const mid = Math.floor(psfs.length / 2);
  const medianPSF =
    psfs.length % 2 === 0 ? (psfs[mid - 1] + psfs[mid]) / 2 : psfs[mid];
  const maxPSF = psfs[psfs.length - 1];

  return { medianPSF, maxPSF };
}

/**
 * Compute location scores for an array of locations.
 * Market stats (median, max PSF) are derived from the dataset itself — no hardcoding.
 * Locations without PSF data use the dataset median as their PSF.
 *
 * @param apartmentSubType - When provided and property type is apartment, adjusts
 *   scoring (livability/growth/density) per sub-type. Undefined = existing logic unchanged.
 */
export function computeLocationScores(
  locations: LocationScoreInputs[],
  marketData?: { medianPSF?: number; maxPSF?: number },
  apartmentSubType?: ApartmentSubType,
): ScoredLocation[] {
  const derived = deriveStats(locations);
  const stats = {
    medianPSF: marketData?.medianPSF ?? derived.medianPSF,
    maxPSF: marketData?.maxPSF ?? derived.maxPSF,
  };

  return locations.map((loc) => {
    const baseScores = scoreLocation(loc, stats);

    // Apply sub-type score adjustments when apartment sub-type is selected
    if (apartmentSubType) {
      const adj = APARTMENT_SUBTYPE_SCORE_ADJUSTMENTS[apartmentSubType];
      // Adjustments are in 0–100 point space, applied to the final clamped scores
      const clamp100 = (v: number) => Math.round(Math.max(0, Math.min(100, v)));
      return {
        ...loc,
        scores: {
          // Livability affects smart score (quality of life component)
          smart: clamp100(
            baseScores.smart + adj.livability * 0.3 + adj.growth * 0.35,
          ),
          // Premium: township/gated command higher premium due to amenities
          premium: clamp100(baseScores.premium + adj.livability * 0.25),
          // Growth: township/gated have stronger growth signals
          growth: clamp100(
            baseScores.growth + adj.growth * 0.4 + adj.density * 0.1,
          ),
          // Investment: composite of all three
          investment: clamp100(
            baseScores.investment +
              adj.livability * 0.15 +
              adj.growth * 0.2 +
              adj.density * 0.05,
          ),
        },
      };
    }

    return { ...loc, scores: baseScores };
  });
}

/**
 * Filter and sort locations by the selected level.
 * Returns top 60% of locations by score (floor: minimum 3 results).
 * When level is 'smart' and there are no filtering exclusions, returns all sorted.
 */
export function filterByLevel(
  locations: ScoredLocation[],
  level: "smart" | "premium" | "growth" | "investment",
): ScoredLocation[] {
  if (locations.length === 0) return [];

  const sorted = [...locations].sort(
    (a, b) => b.scores[level] - a.scores[level],
  );

  // Top 60% with a minimum floor of 3
  const cutoff = Math.max(3, Math.ceil(sorted.length * 0.6));
  return sorted.slice(0, cutoff);
}

/**
 * Score a single POI / location point given known context.
 * Used when individual DynamicPoiPins need scoring (e.g. from AreaIntelligencePage).
 */
export function scoreSingleLocation(
  name: string,
  psf: number,
  infraScore: number,
  amenityScore: number,
  growthScore: number,
  connectivityScore: number,
  allPSFs: number[],
): LocationScores {
  const psfs = allPSFs.filter((v) => v > 0).sort((a, b) => a - b);
  const mid = Math.floor(psfs.length / 2);
  const medianPSF =
    psfs.length > 0
      ? psfs.length % 2 === 0
        ? (psfs[mid - 1] + psfs[mid]) / 2
        : psfs[mid]
      : 7500;
  const maxPSF = psfs.length > 0 ? psfs[psfs.length - 1] : 18000;

  return scoreLocation(
    { name, psf, infraScore, amenityScore, growthScore, connectivityScore },
    { medianPSF, maxPSF },
  );
}
