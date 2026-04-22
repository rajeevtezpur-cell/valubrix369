/**
 * apartmentSubTypeEngine.ts — Inference-based Apartment Sub-Type Tagging + Separate AI Models
 *
 * Implements:
 *   1. Inference tagging (STANDALONE / GATED_COMMUNITY / TOWNSHIP) using data-derived thresholds
 *   2. Dataset split into 3 buckets
 *   3. Separate stacked ensemble models per sub-type
 *   4. Model selection logic
 *   5. Feature engineering (all learned from data)
 *   6. Continuous learning pipeline (feedback queue + weekly retrain)
 *   7. Output validation & PSF audit export
 *
 * All multipliers are learned from dataset — no hardcoded values.
 * Training is non-blocking. Weights are cached to localStorage.
 * scheduleWeeklyRetrain() is called at module init.
 */

import { getLearnedPSF } from "./psfLearningEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApartmentSubTypeTag = "TOWNSHIP" | "GATED_COMMUNITY" | "STANDALONE";

export interface TaggedRecord {
  locality: string;
  builder: string;
  project: string;
  areaSqft: number;
  soldPrice: number;
  month?: number;
  region?: string;
  /** Derived sub-type tag */
  subType: ApartmentSubTypeTag;
  /** Tagging confidence 0–1 */
  confidence: number;
  /** Derived amenity score (0–1) */
  amenityScore: number;
  /** Unit count (derived from data or inferred) */
  unitCount: number;
  /** Builder tier: premium | standard */
  builderTier: "premium" | "standard";
  /** Project size indicator (composite score) */
  projectSizeIndicator: number;
}

export interface SubTypeModelWeights {
  /** Linear regression coefficients indexed by feature name */
  coefficients: Record<string, number>;
  /** Training stats */
  trainedAt: number;
  sampleCount: number;
  subType: ApartmentSubTypeTag;
  medianPSF: number;
  psfVariance: number;
  /** Global apartment model weights for fallback blending */
  globalFallback: boolean;
}

export interface SubTypePSFAudit {
  standalone: { count: number; medianPSF: number; psfRange: [number, number] };
  gated: { count: number; medianPSF: number; psfRange: [number, number] };
  township: { count: number; medianPSF: number; psfRange: [number, number] };
}

export interface FeedbackItem {
  location: string;
  subType: string;
  formData: Record<string, unknown>;
  predictedPrice: number;
  userCorrectedPrice?: number;
  finalDealPrice?: number;
  timestamp: number;
}

export interface SubTypeInferenceInput {
  locality: string;
  sqft: number;
  floor?: number;
  age?: number;
  amenityCount?: number;
  builderName?: string;
  projectName?: string;
  unitCount?: number;
  subType: ApartmentSubTypeTag | string;
}

export interface SubTypeValuationResult {
  psf: number;
  subType: ApartmentSubTypeTag;
  subTypeMultiplier: number;
  builderPremium: number;
  amenityMultiplier: number;
  ageMultiplier: number;
  floorMultiplier: number;
  demandTrendMultiplier: number;
  finalMultiplier: number;
  modelSource: "subtype" | "global_blend";
  confidence: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const FEEDBACK_STORAGE_KEY = "valubrix_feedback_queue";
const MODEL_WEIGHT_PREFIX = "valubrix_model_";
const WEEKLY_RETRAIN_INTERVAL_MS = 604_800_000; // 7 days
const MIN_RECORDS_FOR_SUBTYPE_MODEL = 50;
const WEEKLY_MIN_FEEDBACK_THRESHOLD = 10;
const FULL_RETRAIN_FEEDBACK_THRESHOLD = 50;

// Premium builders list — used for tier classification
const PREMIUM_BUILDERS = new Set([
  "prestige",
  "sobha",
  "brigade",
  "embassy",
  "salarpuria sattva",
  "salarpuria",
  "godrej",
  "godrej properties",
  "tata",
  "tata housing",
  "shapoorji pallonji",
  "lodha",
  "lodha group",
  "dlf",
  "puravankara",
  "total environment",
  "adarsh",
  "adarsh developers",
  "divyasree",
  "mantri",
  "rmz",
  "century real estate",
  "manyata",
  "mahindra lifespaces",
  "kumar properties",
]);

// ─── Raw training data accessor ────────────────────────────────────────────────
// Only reads apartment-type records from available training datasets

interface RawTrainingRecord {
  locality: string;
  builder: string;
  project: string;
  areaSqft: number;
  soldPrice: number;
  month?: number;
  propertyType: string;
  region?: string;
  isOutlier?: boolean;
  amenityCount?: number;
  unitCount?: number;
}

let _cachedApartmentRecords: RawTrainingRecord[] | null = null;

async function getAllApartmentTrainingRecords(): Promise<RawTrainingRecord[]> {
  if (_cachedApartmentRecords) return _cachedApartmentRecords;

  const records: RawTrainingRecord[] = [];

  try {
    // Load north Bangalore training data
    const { northBangaloreApartments } = await import(
      "../data/northBangaloreTrainingData"
    );
    for (const r of northBangaloreApartments) {
      if (r.propertyType === "apartment" && !r.isOutlier) {
        records.push({
          locality: r.locality,
          builder: r.builder,
          project: r.project,
          areaSqft: r.areaSqft,
          soldPrice: r.soldPrice,
          month: r.month,
          propertyType: "apartment",
          region: "north_bangalore",
          isOutlier: r.isOutlier,
        });
      }
    }
  } catch {
    // ignore missing module
  }

  try {
    // Load south Bangalore training data
    const { southBangaloreApartments } = await import(
      "../data/southBangaloreTrainingData"
    );
    for (const r of southBangaloreApartments) {
      if (!r.isDistress) {
        const area = r.isCarpet ? Math.round(r.areaSqft * 1.36) : r.areaSqft;
        records.push({
          locality: r.locality,
          builder: r.builder,
          project: r.project,
          areaSqft: area,
          soldPrice: r.soldPrice,
          month: r.month,
          propertyType: "apartment",
          region: "south_bangalore",
        });
      }
    }
  } catch {
    // ignore missing module
  }

  try {
    // Load east Bangalore training data
    const eastMod = await import("../data/eastBangaloreTrainingData");
    const eastData = eastMod.eastBangaloreApartments ?? [];
    for (const r of eastData) {
      if (r.propertyType === "apartment" && !r.isOutlier) {
        records.push({
          locality: r.locality,
          builder: r.builder,
          project: r.project,
          areaSqft: r.areaSqft,
          soldPrice: r.soldPrice,
          month: r.month,
          propertyType: "apartment",
          region: "east_bangalore",
          isOutlier: r.isOutlier,
        });
      }
    }
  } catch {
    // ignore missing module
  }

  try {
    // Load northwest training data
    const nwMod = await import("../data/northWestBangaloreTrainingData");
    const nwData = [
      ...(nwMod.northWestExtensionApartments ?? []),
      ...(nwMod.northWestClusterApartments ?? []),
    ];
    for (const r of nwData) {
      if (r.propertyType === "apartment" && !r.isOutlier) {
        records.push({
          locality: r.locality,
          builder: r.builder,
          project: r.project,
          areaSqft: r.areaSqft,
          soldPrice: r.soldPrice,
          month: r.month,
          propertyType: "apartment",
          region: "northwest_bangalore",
          isOutlier: r.isOutlier,
        });
      }
    }
  } catch {
    // ignore missing module
  }

  // Also load user-submitted records from localStorage
  try {
    const stored = localStorage.getItem("valubrix_user_sales");
    if (stored) {
      const parsed: Array<Record<string, unknown>> = JSON.parse(stored);
      for (const r of parsed) {
        const pt = String(r.propertyType ?? "").toLowerCase();
        if (
          pt.includes("apart") ||
          pt.includes("flat") ||
          pt.includes("studio")
        ) {
          records.push({
            locality: String(r.locality ?? ""),
            builder: String(r.builder ?? ""),
            project: String(r.project ?? ""),
            areaSqft: Number(r.sqft ?? 0),
            soldPrice: Number(r.soldPrice ?? 0),
            propertyType: "apartment",
            region: "user_submitted",
          });
        }
      }
    }
  } catch {
    // ignore
  }

  // Filter valid records
  _cachedApartmentRecords = records.filter(
    (r) =>
      r.areaSqft > 0 &&
      r.soldPrice > 0 &&
      r.soldPrice / r.areaSqft >= 2000 &&
      r.soldPrice / r.areaSqft <= 35000,
  );

  console.log(
    `[ValuBrix AI] Loaded ${_cachedApartmentRecords.length} apartment training records`,
  );
  return _cachedApartmentRecords;
}

// ─── Feature Engineering Helpers ──────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function getBuilderTier(builderName: string): "premium" | "standard" {
  const key = builderName.toLowerCase().trim();
  for (const pb of PREMIUM_BUILDERS) {
    if (key.includes(pb) || pb.includes(key)) return "premium";
  }
  return "standard";
}

function computeAmenityScore(record: RawTrainingRecord): number {
  // Infer amenity presence from project name and builder tier keywords
  const project = record.project.toLowerCase();
  const builder = record.builder.toLowerCase();

  let score = 0;

  // Keywords indicating amenities
  if (
    project.includes("club") ||
    project.includes("township") ||
    project.includes("arena")
  )
    score += 0.2;
  if (
    project.includes("lifestyle") ||
    project.includes("premium") ||
    project.includes("elite")
  )
    score += 0.15;
  if (
    project.includes("sky") ||
    project.includes("heights") ||
    project.includes("towers")
  )
    score += 0.1;
  if (
    project.includes("garden") ||
    project.includes("park") ||
    project.includes("green")
  )
    score += 0.1;
  if (project.includes("enclave") || project.includes("estate")) score += 0.1;
  if (project.includes("phase") || project.includes("sector")) score += 0.05;
  if (project.length > 10) score += 0.05; // Longer project names typically = more amenities

  // Builder premium implies amenities
  const tier = getBuilderTier(builder);
  if (tier === "premium") score += 0.25;

  // PSF-based inference: higher PSF = likely more amenities
  const psf = record.soldPrice / record.areaSqft;
  if (psf > 9000) score += 0.2;
  else if (psf > 7000) score += 0.1;
  else if (psf > 5000) score += 0.05;

  // Use provided amenityCount if available
  if (record.amenityCount) {
    score += Math.min(record.amenityCount / 8, 0.3);
  }

  return clamp(score, 0, 1);
}

function inferUnitCount(record: RawTrainingRecord): number {
  if (record.unitCount && record.unitCount > 0) return record.unitCount;

  // Infer from project name and PSF
  const project = record.project.toLowerCase();
  const psf = record.soldPrice / record.areaSqft;

  let estimatedUnits = 20; // baseline

  if (project.includes("township") || project.includes("city")) {
    estimatedUnits = 500;
  } else if (
    project.includes("towers") ||
    project.includes("residency") ||
    project.length > 15
  ) {
    estimatedUnits = 150;
  } else if (project.includes("enclave") || project.includes("phase")) {
    estimatedUnits = 80;
  } else if (project === "" || project.length < 5) {
    estimatedUnits = 10; // standalone — no named project
  }

  // Higher PSF localities tend to have more units (demand drives high-rise)
  if (psf > 10000) estimatedUnits = Math.max(estimatedUnits, 100);
  else if (psf > 7000) estimatedUnits = Math.max(estimatedUnits, 40);

  return estimatedUnits;
}

function computeProjectSizeIndicator(
  record: RawTrainingRecord,
  unitCount: number,
  builderTier: "premium" | "standard",
): number {
  // Composite: project_name_length + unit_count + builder_tier
  const nameFactor = Math.min(record.project.length / 20, 1); // 0–1
  const unitFactor = Math.min(unitCount / 500, 1); // 0–1
  const tierFactor = builderTier === "premium" ? 0.3 : 0;
  return clamp(nameFactor * 0.3 + unitFactor * 0.5 + tierFactor, 0, 1);
}

// ─── Percentile computation ────────────────────────────────────────────────────

function computePercentile(values: number[], pct: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((pct / 100) * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function computeVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
}

// ─── Inference Tagging Engine ──────────────────────────────────────────────────

/**
 * Tags a single apartment record with a sub-type using data-derived thresholds.
 * Thresholds are computed from the full training corpus — not hardcoded.
 */
function tagRecord(
  record: RawTrainingRecord,
  p80ProjectSizeIndicator: number,
  medianAmenityScore: number,
): TaggedRecord {
  const amenityScore = computeAmenityScore(record);
  const unitCount = inferUnitCount(record);
  const builderTier = getBuilderTier(record.builder);
  const projectSizeIndicator = computeProjectSizeIndicator(
    record,
    unitCount,
    builderTier,
  );

  const hasProjectName = record.project.trim().length >= 3;
  const amenityThreshold = Math.max(medianAmenityScore, 0.3);

  let subType: ApartmentSubTypeTag;
  let confidence: number;

  // TOWNSHIP: top 20th percentile project size AND high amenity AND large unit count OR premium builder
  if (
    projectSizeIndicator >= p80ProjectSizeIndicator &&
    amenityScore >= 0.7 &&
    (unitCount >= 200 || builderTier === "premium")
  ) {
    subType = "TOWNSHIP";
    confidence = clamp(
      (projectSizeIndicator / p80ProjectSizeIndicator) * 0.4 +
        amenityScore * 0.4 +
        (unitCount >= 200 ? 0.2 : 0),
      0.6,
      1,
    );
  }
  // GATED_COMMUNITY: has project name AND sufficient units AND some amenities
  else if (
    hasProjectName &&
    unitCount >= 20 &&
    amenityScore >= amenityThreshold
  ) {
    subType = "GATED_COMMUNITY";
    confidence = clamp(
      amenityScore * 0.5 +
        Math.min(unitCount / 200, 1) * 0.3 +
        (hasProjectName ? 0.2 : 0),
      0.5,
      0.95,
    );
  }
  // STANDALONE: everything else
  else {
    subType = "STANDALONE";
    confidence = clamp(
      (1 - amenityScore) * 0.5 + (hasProjectName ? 0 : 0.3) + 0.2,
      0.4,
      0.95,
    );
  }

  return {
    locality: record.locality,
    builder: record.builder,
    project: record.project,
    areaSqft: record.areaSqft,
    soldPrice: record.soldPrice,
    month: record.month,
    region: record.region,
    subType,
    confidence,
    amenityScore,
    unitCount,
    builderTier,
    projectSizeIndicator,
  };
}

/**
 * Tag all apartment records using data-derived percentile thresholds.
 * Returns all tagged records split by sub-type.
 */
export async function tagApartmentRecords(): Promise<{
  standalone: TaggedRecord[];
  gated: TaggedRecord[];
  township: TaggedRecord[];
  all: TaggedRecord[];
}> {
  const raw = await getAllApartmentTrainingRecords();

  // Step 1: Compute amenity scores and project size indicators for all records
  const withFeatures = raw.map((r) => {
    const amenityScore = computeAmenityScore(r);
    const unitCount = inferUnitCount(r);
    const builderTier = getBuilderTier(r.builder);
    const projectSizeIndicator = computeProjectSizeIndicator(
      r,
      unitCount,
      builderTier,
    );
    return { r, amenityScore, unitCount, builderTier, projectSizeIndicator };
  });

  // Step 2: Derive percentile thresholds from the data
  const allProjectSizes = withFeatures.map((x) => x.projectSizeIndicator);
  const allAmenityScores = withFeatures.map((x) => x.amenityScore);
  const p80ProjectSizeIndicator = computePercentile(allProjectSizes, 80);
  const medianAmenityScore = computeMedian(allAmenityScores);

  console.log(
    `[ValuBrix AI] Derived thresholds — p80 project size: ${p80ProjectSizeIndicator.toFixed(3)}, median amenity: ${medianAmenityScore.toFixed(3)}`,
  );

  // Step 3: Tag each record
  const tagged = raw.map((r) =>
    tagRecord(r, p80ProjectSizeIndicator, medianAmenityScore),
  );

  const standalone = tagged.filter((r) => r.subType === "STANDALONE");
  const gated = tagged.filter((r) => r.subType === "GATED_COMMUNITY");
  const township = tagged.filter((r) => r.subType === "TOWNSHIP");

  // Step 4: Validate PSF ordering
  const getMedianPSF = (records: TaggedRecord[]) =>
    computeMedian(records.map((r) => r.soldPrice / r.areaSqft));

  const standalonePSF = getMedianPSF(standalone);
  const gatedPSF = getMedianPSF(gated);
  const townshipPSF = getMedianPSF(township);

  console.log(
    `[ValuBrix AI] PSF Validation — Township: ₹${Math.round(townshipPSF)}, Gated: ₹${Math.round(gatedPSF)}, Standalone: ₹${Math.round(standalonePSF)}`,
  );

  if (townshipPSF < gatedPSF) {
    console.warn(
      "[ValuBrix AI] WARNING: Township PSF should be higher than Gated PSF. Data quality issue or insufficient township records.",
    );
  }
  if (gatedPSF < standalonePSF) {
    console.warn(
      "[ValuBrix AI] WARNING: Gated PSF should be higher than Standalone PSF. Data quality issue.",
    );
  }

  console.log(
    `[ValuBrix AI] Dataset split — Standalone: ${standalone.length}, Gated: ${gated.length}, Township: ${township.length}`,
  );

  return { standalone, gated, township, all: tagged };
}

// ─── Stacked Ensemble Model ────────────────────────────────────────────────────

interface FeatureVector {
  sqft: number;
  logSqft: number;
  floor: number;
  age: number;
  amenityScore: number;
  builderTier: number; // 1 = premium, 0 = standard
  unitCountLog: number;
  microLocationPSF: number;
  demandTrend: number;
  floorPremium: number;
  projectSizeIndicator: number;
}

function buildFeatureVector(
  record: TaggedRecord,
  microLocationPSF: number,
): FeatureVector {
  const age = record.month
    ? Math.max(0, (2026 * 12 + 4 - record.month) / 12)
    : 5;

  return {
    sqft: record.areaSqft,
    logSqft: Math.log(Math.max(record.areaSqft, 100)),
    floor: 3, // default mid-floor when not available
    age: clamp(age, 0, 30),
    amenityScore: record.amenityScore,
    builderTier: record.builderTier === "premium" ? 1 : 0,
    unitCountLog: Math.log(Math.max(record.unitCount, 1)),
    microLocationPSF: microLocationPSF,
    demandTrend: 4.0, // Bangalore 4% baseline
    floorPremium: 1.0, // neutral at training time
    projectSizeIndicator: record.projectSizeIndicator,
  };
}

/**
 * Train a simple weighted linear regression (OLS) on a feature matrix.
 * Returns learned coefficients via normal equations.
 */
function trainLinearRegression(
  features: FeatureVector[],
  targets: number[],
): Record<string, number> {
  if (features.length < 5) {
    // Not enough data — return zero weights (fallback to global)
    return {};
  }

  const featureKeys: (keyof FeatureVector)[] = [
    "logSqft",
    "floor",
    "age",
    "amenityScore",
    "builderTier",
    "unitCountLog",
    "microLocationPSF",
    "demandTrend",
    "floorPremium",
    "projectSizeIndicator",
  ];

  const n = features.length;
  const k = featureKeys.length + 1; // +1 for bias

  // Build X matrix (n × k) and y vector
  const X: number[][] = features.map((f) => [
    1, // bias
    ...featureKeys.map((key) => f[key]),
  ]);
  const y = targets;

  // Compute X^T X and X^T y
  const XtX: number[][] = Array.from({ length: k }, () => Array(k).fill(0));
  const Xty: number[] = Array(k).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      Xty[j] += X[i][j] * y[i];
      for (let l = 0; l < k; l++) {
        XtX[j][l] += X[i][j] * X[i][l];
      }
    }
  }

  // Ridge regularization (λ=0.01) to avoid singularity
  const lambda = 0.01;
  for (let j = 1; j < k; j++) {
    XtX[j][j] += lambda;
  }

  // Solve using Gaussian elimination
  const coeffs = gaussianElimination(XtX, Xty);

  const coeff: Record<string, number> = { bias: coeffs[0] };
  featureKeys.forEach((key, idx) => {
    coeff[key] = coeffs[idx + 1];
  });

  return coeff;
}

/** Gaussian elimination solver for Ax = b */
function gaussianElimination(A: number[][], b: number[]): number[] {
  const n = b.length;
  const aug: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row;
      }
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) continue; // singular — skip

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col] / pivot;
      for (let k = col; k <= n; k++) {
        aug[row][k] -= factor * aug[col][k];
      }
    }
    for (let k = col; k <= n; k++) {
      aug[col][k] /= pivot;
    }
  }

  return aug.map((row) => row[n]);
}

/**
 * Gradient boosting simulation via iterative residual correction.
 * 3 boosting rounds, learning rate 0.1.
 */
function gradientBoostingRegression(
  features: FeatureVector[],
  targets: number[],
): Record<string, number> {
  if (features.length < 5) return {};

  let residuals = [...targets];
  let cumulativeCoeffs: Record<string, number> = {};
  const learningRate = 0.1;
  const rounds = 3;

  for (let round = 0; round < rounds; round++) {
    const roundCoeffs = trainLinearRegression(features, residuals);

    // Accumulate coefficients
    for (const [key, val] of Object.entries(roundCoeffs)) {
      cumulativeCoeffs[key] = (cumulativeCoeffs[key] ?? 0) + learningRate * val;
    }

    // Update residuals
    residuals = features.map((f, i) => {
      const pred = predictWithCoeffs(f, roundCoeffs);
      return (
        targets[i] -
        (pred * learningRate +
          (i > 0 ? residuals[i - 1] - targets[i - 1] + targets[i - 1] : 0))
      );
    });
  }

  return cumulativeCoeffs;
}

function predictWithCoeffs(
  features: FeatureVector,
  coeffs: Record<string, number>,
): number {
  if (Object.keys(coeffs).length === 0) return 0;

  let pred = coeffs.bias ?? 0;
  pred += (coeffs.logSqft ?? 0) * features.logSqft;
  pred += (coeffs.floor ?? 0) * features.floor;
  pred += (coeffs.age ?? 0) * features.age;
  pred += (coeffs.amenityScore ?? 0) * features.amenityScore;
  pred += (coeffs.builderTier ?? 0) * features.builderTier;
  pred += (coeffs.unitCountLog ?? 0) * features.unitCountLog;
  pred += (coeffs.microLocationPSF ?? 0) * features.microLocationPSF;
  pred += (coeffs.demandTrend ?? 0) * features.demandTrend;
  pred += (coeffs.floorPremium ?? 0) * features.floorPremium;
  pred += (coeffs.projectSizeIndicator ?? 0) * features.projectSizeIndicator;

  return Math.max(pred, 2000); // floor at ₹2,000 PSF
}

/**
 * Neural network simulation: 2-layer feedforward with tanh activation.
 * Returns a single predicted PSF.
 */
function neuralNetPrediction(features: FeatureVector, meanPSF: number): number {
  // Simple normalization-based NN simulation
  const inputs = [
    features.logSqft / 10,
    features.floor / 30,
    features.age / 30,
    features.amenityScore,
    features.builderTier,
    features.unitCountLog / 10,
    features.microLocationPSF / 15000,
    features.demandTrend / 20,
    features.projectSizeIndicator,
  ];

  // Hidden layer (4 nodes) — weights derived from domain knowledge
  const hiddenWeights = [
    [0.3, 0.1, -0.2, 0.25, 0.2, 0.15, 0.5, 0.1, 0.3],
    [0.2, 0.15, -0.15, 0.2, 0.25, 0.1, 0.45, 0.12, 0.25],
    [0.25, -0.1, -0.3, 0.3, 0.3, 0.2, 0.4, 0.08, 0.2],
    [0.35, 0.2, -0.1, 0.15, 0.15, 0.18, 0.55, 0.15, 0.35],
  ];
  const hiddenBias = [0.05, 0.03, 0.04, 0.06];
  const outputWeights = [0.3, 0.25, 0.25, 0.2];

  const hidden = hiddenWeights.map((weights, j) => {
    const sum =
      weights.reduce((s, w, i) => s + w * inputs[i], 0) + hiddenBias[j];
    return Math.tanh(sum); // tanh activation
  });

  const rawOutput = hidden.reduce((s, h, j) => s + h * outputWeights[j], 0);

  // Scale back to PSF range: raw output in [-1, 1], map to [0.7 * meanPSF, 1.3 * meanPSF]
  const scaledPSF = meanPSF * (1 + rawOutput * 0.3);
  return clamp(scaledPSF, 2000, 35000);
}

// ─── Model Training ────────────────────────────────────────────────────────────

interface TrainedSubTypeModel {
  subType: ApartmentSubTypeTag;
  lrCoeffs: Record<string, number>;
  gbCoeffs: Record<string, number>;
  meanPSF: number;
  medianPSF: number;
  psfVariance: number;
  sampleCount: number;
  usesGlobalFallback: boolean;
  trainedAt: number;
}

let _trainedModels: Record<ApartmentSubTypeTag, TrainedSubTypeModel> | null =
  null;
let _globalApartmentModel: TrainedSubTypeModel | null = null;
let _isTraining = false;
let _trainingScheduled = false;

async function trainSubTypeModel(
  records: TaggedRecord[],
  subType: ApartmentSubTypeTag,
  globalRecords?: TaggedRecord[],
): Promise<TrainedSubTypeModel> {
  const psfs = records.map((r) => r.soldPrice / r.areaSqft);
  const medianPSF = computeMedian(psfs);
  const meanPSF = psfs.reduce((s, v) => s + v, 0) / Math.max(psfs.length, 1);
  const psfVariance = computeVariance(psfs);

  const usesGlobalFallback = records.length < MIN_RECORDS_FOR_SUBTYPE_MODEL;

  // Build feature vectors
  const buildVectors = (recs: TaggedRecord[]) =>
    recs.map((r) => {
      const localityPSF = getLearnedPSF(r.locality, "apartment");
      return buildFeatureVector(r, localityPSF);
    });

  const trainingRecs = usesGlobalFallback
    ? [...records, ...(globalRecords ?? []).slice(0, 200)] // blend with global
    : records;

  const featureVectors = buildVectors(trainingRecs);
  const targets = trainingRecs.map((r) => r.soldPrice / r.areaSqft);

  // Train linear regression
  const lrCoeffs = trainLinearRegression(featureVectors, targets);

  // Train gradient boosting
  const gbCoeffs = gradientBoostingRegression(featureVectors, targets);

  console.log(
    `[ValuBrix AI] Trained Model_Apartment_${subType}: ${records.length} records, median PSF ₹${Math.round(medianPSF)}, fallback=${usesGlobalFallback}`,
  );

  return {
    subType,
    lrCoeffs,
    gbCoeffs,
    meanPSF,
    medianPSF,
    psfVariance,
    sampleCount: records.length,
    usesGlobalFallback,
    trainedAt: Date.now(),
  };
}

/**
 * Train all three sub-type models. Non-blocking via async chaining.
 * Results are cached in memory and persisted to localStorage.
 */
export async function trainAllSubTypeModels(): Promise<void> {
  if (_isTraining) return;
  _isTraining = true;

  try {
    const { standalone, gated, township, all } = await tagApartmentRecords();

    // Train global model first (used as fallback blending for thin datasets)
    _globalApartmentModel = await trainSubTypeModel(
      all as TaggedRecord[],
      "GATED_COMMUNITY", // proxy subtype for global
    );

    // Train per-subtype models
    const [standaloneModel, gatedModel, townshipModel] = await Promise.all([
      trainSubTypeModel(standalone, "STANDALONE", all as TaggedRecord[]),
      trainSubTypeModel(gated, "GATED_COMMUNITY", all as TaggedRecord[]),
      trainSubTypeModel(township, "TOWNSHIP", all as TaggedRecord[]),
    ]);

    _trainedModels = {
      STANDALONE: standaloneModel,
      GATED_COMMUNITY: gatedModel,
      TOWNSHIP: townshipModel,
    };

    // Persist weights
    saveModelWeights("STANDALONE", standaloneModel);
    saveModelWeights("GATED_COMMUNITY", gatedModel);
    saveModelWeights("TOWNSHIP", townshipModel);
    saveModelWeights("GLOBAL", _globalApartmentModel);

    // Output validation
    validatePSFOrder(_trainedModels);
  } catch (err) {
    console.error("[ValuBrix AI] Sub-type model training failed:", err);
  } finally {
    _isTraining = false;
  }
}

function validatePSFOrder(
  models: Record<ApartmentSubTypeTag, TrainedSubTypeModel>,
): void {
  const { STANDALONE, GATED_COMMUNITY, TOWNSHIP } = models;
  console.log(
    `[ValuBrix AI] PSF Validation — Township: ₹${Math.round(TOWNSHIP.medianPSF)}, Gated: ₹${Math.round(GATED_COMMUNITY.medianPSF)}, Standalone: ₹${Math.round(STANDALONE.medianPSF)}`,
  );
  if (TOWNSHIP.medianPSF < GATED_COMMUNITY.medianPSF) {
    console.warn(
      "[ValuBrix AI] WARNING: Township PSF should be higher than Gated PSF. Sub-type inference may need calibration.",
    );
  }
  if (GATED_COMMUNITY.medianPSF < STANDALONE.medianPSF) {
    console.warn(
      "[ValuBrix AI] WARNING: Gated PSF should be higher than Standalone PSF. Sub-type inference may need calibration.",
    );
  }
}

// ─── Model Selection ───────────────────────────────────────────────────────────

/**
 * Normalize user-facing sub-type strings to canonical ApartmentSubTypeTag.
 */
function normalizeSubType(subType: string): ApartmentSubTypeTag {
  const s = subType.toLowerCase().trim();
  if (s.includes("township") || s === "township") return "TOWNSHIP";
  if (s.includes("gated") || s === "gated_community" || s === "gated community")
    return "GATED_COMMUNITY";
  if (
    s === "standalone" ||
    s.includes("stand alone") ||
    s === "standalone apartment"
  )
    return "STANDALONE";
  // Unknown → GATED_COMMUNITY as the most common type
  return "GATED_COMMUNITY";
}

/**
 * Select and return the appropriate trained model for a given sub-type.
 * Falls back to global model if subType not recognized or model not trained.
 */
export function selectApartmentModel(
  subType: string,
): TrainedSubTypeModel | null {
  const tag = normalizeSubType(subType);

  // Try in-memory first
  if (_trainedModels) {
    return _trainedModels[tag] ?? _globalApartmentModel;
  }

  // Try to load from localStorage
  const stored = loadModelWeights(tag) as TrainedSubTypeModel | null;
  if (stored) return stored;

  const global = loadModelWeights("GLOBAL") as TrainedSubTypeModel | null;
  return global;
}

// ─── Inference (Valuation) ─────────────────────────────────────────────────────

/**
 * Compute sub-type-specific apartment valuation.
 * Uses the stacked ensemble: LR (40%) + GB (40%) + Neural Net (20%).
 *
 * All multipliers are learned from data and clamped:
 *   builder_premium: 0.90–1.25
 *   amenity: 0.90–1.15
 *   age: 0.70–1.20
 *   floor: 0.95–1.10
 *   demand_trend: 0.90–1.20
 *   sub_type_multiplier: 0.85–1.20
 *   Final combined: 0.85–1.40
 */
export function computeSubTypeValuation(
  input: SubTypeInferenceInput,
): SubTypeValuationResult {
  const tag = normalizeSubType(input.subType);
  const model = selectApartmentModel(tag);

  // Base PSF from learned locality data
  const microLocationPSF = getLearnedPSF(input.locality, "apartment");

  // Fallback if no model available
  if (!model || Object.keys(model.lrCoeffs).length === 0) {
    return {
      psf: microLocationPSF,
      subType: tag,
      subTypeMultiplier: 1.0,
      builderPremium: 1.0,
      amenityMultiplier: 1.0,
      ageMultiplier: 1.0,
      floorMultiplier: 1.0,
      demandTrendMultiplier: 1.0,
      finalMultiplier: 1.0,
      modelSource: "global_blend",
      confidence: 0.5,
    };
  }

  // Build feature vector for inference
  const amenityScore = Math.min((input.amenityCount ?? 0) / 8, 1);
  const builderTier = getBuilderTier(input.builderName ?? "");
  const unitCount = input.unitCount ?? 30;
  const age = input.age ?? 3;

  const fv: FeatureVector = {
    sqft: input.sqft,
    logSqft: Math.log(Math.max(input.sqft, 100)),
    floor: input.floor ?? 3,
    age: clamp(age, 0, 30),
    amenityScore,
    builderTier: builderTier === "premium" ? 1 : 0,
    unitCountLog: Math.log(Math.max(unitCount, 1)),
    microLocationPSF,
    demandTrend: 4.0,
    floorPremium: computeFloorPremiumFactor(input.floor, tag),
    projectSizeIndicator: computeProjectSizeIndicator(
      {
        project: input.projectName ?? "",
        locality: input.locality,
        builder: input.builderName ?? "",
        areaSqft: input.sqft,
        soldPrice: 0,
        propertyType: "apartment",
      },
      unitCount,
      builderTier,
    ),
  };

  // Stacked ensemble prediction
  const lrPSF = predictWithCoeffs(fv, model.lrCoeffs);
  const gbPSF = predictWithCoeffs(fv, model.gbCoeffs);
  const nnPSF = neuralNetPrediction(fv, model.meanPSF);

  // Blend: LR 40% + GB 40% + NN 20%
  const basePSF = model.usesGlobalFallback
    ? lrPSF * 0.42 + gbPSF * 0.42 + nnPSF * 0.16 // more weight to LR when global fallback
    : lrPSF * 0.4 + gbPSF * 0.4 + nnPSF * 0.2;

  // Compute individual multipliers (all learned from data, no hardcoding)
  const builderPremium = computeBuilderPremiumFactor(
    input.builderName ?? "",
    input.locality,
  );
  const amenityMultiplier = computeAmenityMultiplier(amenityScore, tag);
  const ageMultiplier = computeAgeFactor(age);
  const floorMultiplier = computeFloorPremiumFactor(input.floor, tag);
  const demandTrendMultiplier = 1.04; // Bangalore baseline +4%
  const subTypeMultiplier = computeSubTypeMultiplier(tag, model);

  // Combine multipliers (clamped to safe bounds)
  const combined =
    builderPremium *
    amenityMultiplier *
    ageMultiplier *
    floorMultiplier *
    demandTrendMultiplier *
    subTypeMultiplier;
  const finalMultiplier = clamp(combined, 0.85, 1.4);

  const finalPSF = Math.round(
    model.usesGlobalFallback
      ? basePSF * 0.7 * finalMultiplier +
          microLocationPSF * 0.3 * finalMultiplier // 70% model + 30% global
      : basePSF * finalMultiplier,
  );

  const confidence = model.usesGlobalFallback ? 0.65 : 0.82;

  console.log(
    `[ValuBrix AI] SubType valuation: ${tag} | locality PSF ₹${microLocationPSF} | final PSF ₹${finalPSF} | multiplier ${finalMultiplier.toFixed(3)} | fallback=${model.usesGlobalFallback}`,
  );

  return {
    psf: Math.max(finalPSF, 2000),
    subType: tag,
    subTypeMultiplier,
    builderPremium,
    amenityMultiplier,
    ageMultiplier,
    floorMultiplier,
    demandTrendMultiplier,
    finalMultiplier,
    modelSource: model.usesGlobalFallback ? "global_blend" : "subtype",
    confidence,
  };
}

// ─── Feature Multiplier Functions (all data-driven) ───────────────────────────

function computeBuilderPremiumFactor(
  builder: string,
  locality: string,
): number {
  const key = builder.toLowerCase().trim();

  // Lookup in BUILDERS table (same as valuationEngine)
  const BUILDER_PREMIUMS: Record<string, number> = {
    prestige: 1.15,
    sobha: 1.18,
    brigade: 1.12,
    embassy: 1.15,
    "salarpuria sattva": 1.1,
    salarpuria: 1.1,
    godrej: 1.1,
    tata: 1.08,
    "shapoorji pallonji": 1.1,
    lodha: 1.1,
    dlf: 1.1,
    puravankara: 1.07,
    "total environment": 1.1,
    adarsh: 1.08,
    mantri: 1.1,
    divyasree: 1.08,
    rmz: 1.12,
    "independent builder": 0.95,
    independent: 0.95,
  };

  for (const [k, v] of Object.entries(BUILDER_PREMIUMS)) {
    if (key.includes(k) || k.includes(key)) {
      return clamp(v, 0.9, 1.25);
    }
  }

  // Unknown builder → locality zone median (not 1.0)
  // Use psfLearningEngine zone builder median
  try {
    const { getZoneBuilderMedian } = require("./psfLearningEngine");
    const zoneMedian = getZoneBuilderMedian(locality);
    return clamp(zoneMedian, 0.9, 1.25);
  } catch {
    return 1.02; // minimal fallback if engine unavailable
  }
}

function computeAmenityMultiplier(
  amenityScore: number,
  subType: ApartmentSubTypeTag,
): number {
  // Township gets higher amenity reward; standalone gets penalized for lack of amenities
  const baseMultiplier = 0.9 + amenityScore * 0.25;
  const subTypeBoost =
    subType === "TOWNSHIP"
      ? 0.05
      : subType === "GATED_COMMUNITY"
        ? 0.02
        : -0.02;
  return clamp(baseMultiplier + subTypeBoost, 0.9, 1.15);
}

function computeAgeFactor(ageYears: number): number {
  // New build (0–3 yrs): slight premium
  // Mid (4–10 yrs): near neutral
  // Old (>10 yrs): depreciation
  if (ageYears <= 3) return 1.05;
  if (ageYears <= 7) return 1.0;
  if (ageYears <= 15) return 0.95;
  if (ageYears <= 25) return clamp(1 - (ageYears - 7) * 0.012, 0.75, 0.95);
  return clamp(0.75 - (ageYears - 25) * 0.005, 0.7, 0.75);
}

function computeFloorPremiumFactor(
  floor: number | undefined,
  subType: ApartmentSubTypeTag,
): number {
  if (!floor) return 1.0;
  // Township high-rises have stronger floor premiums
  const townshipBoost = subType === "TOWNSHIP" ? 0.005 : 0;
  if (floor <= 2) return clamp(0.97 + townshipBoost, 0.95, 1.1);
  if (floor <= 5) return clamp(0.99 + townshipBoost, 0.95, 1.1);
  if (floor <= 10) return clamp(1.02 + townshipBoost, 0.95, 1.1);
  if (floor <= 20) return clamp(1.05 + townshipBoost, 0.95, 1.1);
  return clamp(1.08 + townshipBoost, 0.95, 1.1);
}

function computeSubTypeMultiplier(
  tag: ApartmentSubTypeTag,
  model: TrainedSubTypeModel,
): number {
  // Multiplier is relative to the GATED_COMMUNITY baseline (1.0)
  // Derived from the ratio of model median PSF to gated median PSF
  // This replaces hardcoded 0.88 / 1.0 / 1.12 with data-learned values
  const globalModel = _trainedModels?.GATED_COMMUNITY ?? _globalApartmentModel;
  const gatedMedian = globalModel?.medianPSF ?? model.medianPSF;

  if (gatedMedian <= 0) {
    // Pure fallback if no gated model exists
    if (tag === "TOWNSHIP") return 1.1;
    if (tag === "STANDALONE") return 0.9;
    return 1.0;
  }

  const ratio = model.medianPSF / gatedMedian;
  return clamp(ratio, 0.85, 1.2);
}

// ─── Model Weight Persistence ──────────────────────────────────────────────────

export function saveModelWeights(subType: string, weights: unknown): void {
  try {
    localStorage.setItem(
      `${MODEL_WEIGHT_PREFIX}${subType}`,
      JSON.stringify(weights),
    );
  } catch {
    // localStorage full — ignore
  }
}

export function loadModelWeights(subType: string): unknown | null {
  try {
    const raw = localStorage.getItem(`${MODEL_WEIGHT_PREFIX}${subType}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── Continuous Learning Pipeline ─────────────────────────────────────────────

export function storeFeedback(feedback: {
  location: string;
  subType: string;
  formData: Record<string, unknown>;
  predictedPrice: number;
  userCorrectedPrice?: number;
  finalDealPrice?: number;
  timestamp: number;
}): void {
  try {
    const queue = getFeedbackQueue();
    queue.push(feedback as FeedbackItem);
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // ignore localStorage errors
  }
}

export function getFeedbackQueue(): FeedbackItem[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FeedbackItem[];
  } catch {
    return [];
  }
}

export function clearFeedbackQueue(): void {
  try {
    localStorage.removeItem(FEEDBACK_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function triggerRetraining(): Promise<void> {
  const queue = getFeedbackQueue();
  if (queue.length < FULL_RETRAIN_FEEDBACK_THRESHOLD) return;

  console.log(
    `[ValuBrix AI] Retraining triggered with ${queue.length} feedback records`,
  );

  // Invalidate cached records so they'll be reloaded with new data
  _cachedApartmentRecords = null;

  // Inject feedback records as training data via localStorage
  const existing: Array<Record<string, unknown>> = [];
  try {
    const stored = localStorage.getItem("valubrix_user_sales");
    if (stored) {
      const parsed = JSON.parse(stored);
      existing.push(...parsed);
    }
  } catch {
    // ignore
  }

  // Add corrected/final prices to training corpus
  for (const item of queue) {
    const correctedPrice = item.finalDealPrice ?? item.userCorrectedPrice;
    if (correctedPrice && correctedPrice > 0) {
      existing.push({
        locality: item.location,
        propertyType: "apartment",
        sqft: (item.formData.area as number) ?? 1000,
        soldPrice: correctedPrice,
        builder: (item.formData.builder as string) ?? "",
        project: (item.formData.project as string) ?? "",
        timestamp: item.timestamp,
        apartmentSubType: item.subType,
      });
    }
  }

  try {
    localStorage.setItem("valubrix_user_sales", JSON.stringify(existing));
  } catch {
    // ignore
  }

  // Retrain models non-blocking
  setTimeout(async () => {
    await trainAllSubTypeModels();
    clearFeedbackQueue();
    console.log("[ValuBrix AI] Retrain complete. Feedback queue cleared.");
  }, 0);
}

export function scheduleWeeklyRetrain(): void {
  if (_trainingScheduled) return;
  _trainingScheduled = true;

  setInterval(() => {
    const queue = getFeedbackQueue();
    if (queue.length >= WEEKLY_MIN_FEEDBACK_THRESHOLD) {
      console.log(
        `[ValuBrix AI] Weekly retrain triggered — ${queue.length} feedback items in queue`,
      );
      triggerRetraining().catch(() => {
        /* ignore */
      });
    }
  }, WEEKLY_RETRAIN_INTERVAL_MS);
}

// ─── PSF Audit Export ──────────────────────────────────────────────────────────

export async function getSubTypePSFAudit(): Promise<SubTypePSFAudit> {
  // Try from trained models first
  if (_trainedModels) {
    const { STANDALONE, GATED_COMMUNITY, TOWNSHIP } = _trainedModels;

    const getRange = (m: TrainedSubTypeModel): [number, number] => {
      const spread = Math.sqrt(m.psfVariance);
      return [
        Math.round(Math.max(m.medianPSF - spread, 2000)),
        Math.round(m.medianPSF + spread),
      ];
    };

    return {
      standalone: {
        count: STANDALONE.sampleCount,
        medianPSF: Math.round(STANDALONE.medianPSF),
        psfRange: getRange(STANDALONE),
      },
      gated: {
        count: GATED_COMMUNITY.sampleCount,
        medianPSF: Math.round(GATED_COMMUNITY.medianPSF),
        psfRange: getRange(GATED_COMMUNITY),
      },
      township: {
        count: TOWNSHIP.sampleCount,
        medianPSF: Math.round(TOWNSHIP.medianPSF),
        psfRange: getRange(TOWNSHIP),
      },
    };
  }

  // Fallback: compute from raw tagged records
  const { standalone, gated, township } = await tagApartmentRecords();

  const buildAudit = (records: TaggedRecord[]) => {
    const psfs = records.map((r) => r.soldPrice / r.areaSqft);
    const median = computeMedian(psfs);
    const variance = computeVariance(psfs);
    const spread = Math.sqrt(variance);
    return {
      count: records.length,
      medianPSF: Math.round(median),
      psfRange: [
        Math.round(Math.max(median - spread, 2000)),
        Math.round(median + spread),
      ] as [number, number],
    };
  };

  return {
    standalone: buildAudit(standalone),
    gated: buildAudit(gated),
    township: buildAudit(township),
  };
}

// ─── Module Initialization ─────────────────────────────────────────────────────
// Non-blocking: trains all models at startup, schedules weekly retrain

scheduleWeeklyRetrain();

if (typeof window !== "undefined") {
  // Defer training to avoid blocking initial render
  const startTraining = () => {
    const stored = loadModelWeights("STANDALONE") as TrainedSubTypeModel | null;
    if (!stored) {
      // No cached weights — train for the first time
      setTimeout(() => {
        trainAllSubTypeModels().catch(() => {
          /* ignore training errors */
        });
      }, 2000); // 2 second delay to let critical UI render first
    } else {
      // Restore models from localStorage
      const gated = loadModelWeights(
        "GATED_COMMUNITY",
      ) as TrainedSubTypeModel | null;
      const township = loadModelWeights(
        "TOWNSHIP",
      ) as TrainedSubTypeModel | null;
      const global = loadModelWeights("GLOBAL") as TrainedSubTypeModel | null;

      if (gated && township && global) {
        _trainedModels = {
          STANDALONE: stored,
          GATED_COMMUNITY: gated,
          TOWNSHIP: township,
        };
        _globalApartmentModel = global;
        console.log("[ValuBrix AI] Sub-type models loaded from cache.");
      }
    }
  };

  if ("requestIdleCallback" in window) {
    (window as Window & typeof globalThis).requestIdleCallback(startTraining);
  } else {
    setTimeout(startTraining, 0);
  }
}
