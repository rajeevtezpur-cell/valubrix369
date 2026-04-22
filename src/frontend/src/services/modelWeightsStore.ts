/**
 * modelWeightsStore.ts — Single source of truth for trained model weights.
 *
 * Implements in-memory + localStorage persistence for all property-type-segregated
 * ML model weights. Weights are computed once (at startup or on corpus change)
 * and reused for all subsequent inference calls — never recomputed per call.
 *
 * Cache key format: valubrix_model_weights_v2_{propertyType}_{modelType}_{region}
 * Stale threshold: 7 days (604800000 ms)
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type PropertyTypeKey = "apartment" | "villa" | "plot" | "commercial";
export type ModelTypeKey = "sale" | "rent";
export type RegionKey = "north" | "south" | "east" | "global";

export interface TrainedWeights {
  /** Regression coefficients, one per feature */
  coefficients: number[];
  /** Bias/intercept term */
  intercept: number;
  /** Feature names matching coefficients order */
  featureNames: string[];
  /** R² score on training data (0–1) */
  r2Score: number;
  /** Number of training samples used */
  sampleCount: number;
  /** Epoch ms when weights were trained */
  trainedAt: number;
  /** Mean Absolute Error (INR/sqft) */
  mae: number;
  /** Root Mean Squared Error (INR/sqft) */
  rmse: number;
  /** Locality → median PSF cache derived from training corpus */
  localityPSFCache: Record<string, number>;
  /** Builder → premium factor cache derived from training corpus */
  builderPremiumCache: Record<string, number>;
}

export interface WeightSet {
  propertyType: PropertyTypeKey;
  modelType: ModelTypeKey;
  region: RegionKey;
  weights: TrainedWeights;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const CACHE_KEY_PREFIX = "valubrix_model_weights_v2_";
const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── In-memory store ───────────────────────────────────────────────────────────

const _inMemoryStore = new Map<string, WeightSet>();
let _isTraining = false;
let _isReady = false;
let _trainingStartedAt: number | null = null;
const _readyCallbacks: Array<() => void> = [];

// ─── Key helpers ───────────────────────────────────────────────────────────────

function buildKey(
  propertyType: PropertyTypeKey,
  modelType: ModelTypeKey,
  region: RegionKey,
): string {
  return `${CACHE_KEY_PREFIX}${propertyType}_${modelType}_${region}`;
}

// ─── Storage operations ────────────────────────────────────────────────────────

/**
 * Persist a WeightSet to localStorage (with in-memory fallback if quota exceeded).
 */
export function saveWeights(
  propertyType: PropertyTypeKey,
  modelType: ModelTypeKey,
  region: RegionKey,
  weights: TrainedWeights,
): void {
  const set: WeightSet = { propertyType, modelType, region, weights };
  const key = buildKey(propertyType, modelType, region);

  // Always update in-memory store first
  _inMemoryStore.set(key, set);

  // Try localStorage persistence
  try {
    localStorage.setItem(key, JSON.stringify(set));
  } catch {
    // localStorage full or unavailable — in-memory only (silently degrade)
  }
}

/**
 * Load a WeightSet from in-memory cache first, then localStorage.
 * Returns null if not found or if weights are stale (> 7 days).
 */
export function loadWeights(
  propertyType: PropertyTypeKey,
  modelType: ModelTypeKey,
  region: RegionKey,
): WeightSet | null {
  const key = buildKey(propertyType, modelType, region);

  // Check in-memory first (fastest)
  const inMem = _inMemoryStore.get(key);
  if (inMem) {
    if (Date.now() - inMem.weights.trainedAt < STALE_THRESHOLD_MS) {
      return inMem;
    }
    // Stale — remove and fall through to retrain
    _inMemoryStore.delete(key);
  }

  // Try localStorage
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: WeightSet = JSON.parse(raw);
    if (parsed?.weights?.trainedAt == null) return null;
    if (Date.now() - parsed.weights.trainedAt >= STALE_THRESHOLD_MS) {
      localStorage.removeItem(key);
      return null;
    }
    // Populate in-memory cache from localStorage
    _inMemoryStore.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Check whether valid (non-stale) weights exist for a given key.
 */
export function hasWeights(
  propertyType: PropertyTypeKey,
  modelType: ModelTypeKey,
  region: RegionKey,
): boolean {
  return loadWeights(propertyType, modelType, region) !== null;
}

/**
 * Remove all ValuBrix model weight entries from localStorage and in-memory.
 */
export function clearAllWeights(): void {
  _inMemoryStore.clear();
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(CACHE_KEY_PREFIX)) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);
  } catch {
    // ignore
  }
  _isReady = false;
}

/**
 * Returns all localStorage keys for ValuBrix model weights.
 */
export function getAllWeightKeys(): string[] {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(CACHE_KEY_PREFIX)) keys.push(k);
    }
    return keys;
  } catch {
    return Array.from(_inMemoryStore.keys());
  }
}

// ─── Training state ────────────────────────────────────────────────────────────

/** Whether background model initialization is currently in progress. */
export function getIsTraining(): boolean {
  return _isTraining;
}

/** Whether all startup models have been trained and are ready for inference. */
export function getIsReady(): boolean {
  return _isReady;
}

/** Timestamp (ms) when background training started, or null if not started. */
export function getTrainingStartedAt(): number | null {
  return _trainingStartedAt;
}

/** Mark training as started. */
export function markTrainingStarted(): void {
  _isTraining = true;
  _trainingStartedAt = Date.now();
}

/** Mark training as complete and fire all registered onReady callbacks. */
export function markTrainingComplete(): void {
  _isTraining = false;
  _isReady = true;
  for (const cb of _readyCallbacks) {
    try {
      cb();
    } catch {
      // ignore callback errors
    }
  }
  _readyCallbacks.length = 0;
}

/**
 * Register a callback to be fired once model training is complete.
 * If already ready, the callback is called synchronously.
 */
export function onWeightsReady(cb: () => void): void {
  if (_isReady) {
    try {
      cb();
    } catch {
      // ignore
    }
    return;
  }
  _readyCallbacks.push(cb);
}

/**
 * Returns a Promise that resolves when weights are ready,
 * or after the given timeout (ms) — whichever comes first.
 */
export function waitForWeightsReady(timeoutMs = 3000): Promise<void> {
  if (_isReady) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    }, timeoutMs);
    onWeightsReady(() => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve();
      }
    });
  });
}

// ─── Stale threshold export (for callers that need it) ────────────────────────
export const WEIGHTS_STALE_THRESHOLD_MS = STALE_THRESHOLD_MS;
