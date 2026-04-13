/**
 * aiEngine.ts — Single global AI valuation engine for ValuBrix.
 *
 * All portals (Seller, Buyer, Search, Detail, Area Intelligence) must import
 * computeAIValue() from this file. Never call valuationEngine or ensembleEngine
 * directly from page components.
 */

import {
  computeLearnedAmenityPremium,
  computeLearnedFacingPremium,
  computeLearnedGatedCommunityPremium,
  computeLearnedParkingPremium,
  computeLearnedRoadWidthPremium,
} from "../engines/ensembleEngine";
import { valuate } from "../engines/valuationEngine";

export interface AIValueInput {
  locality: string;
  city?: string;
  builder?: string;
  project?: string;
  area: number; // sq ft
  propertyType?: string; // apartment | villa | plot
  bhk?: number;
  floor?: number;
  isTopFloor?: boolean;
  sellerPrice?: number;
  facing?: string;
  amenities?: string[];
  parking?: number;
  propertyAge?: number;
  // Villa-specific
  isGatedCommunity?: boolean;
  roadWidth?: number;
  isCornerPlot?: boolean;
  // Plot-specific
  zoning?: string;
  far?: number;
  distToMainRoad?: number;
}

export interface AIValueOutput {
  lower: number;
  upper: number;
  median: number;
  confidence: number;
  confidenceTier: "High" | "Medium" | "Low" | "Very Low";
  dataLevel: string;
  label: "Fair Price" | "Overpriced" | "Undervalued";
}

// ─── Smoothing state ────────────────────────────────────────────────────────────────
// Prevents value flickering when user rapidly changes floor/facing/amenities.
// Smoothing is applied only within a 3-second window.
// Resets on locality change, new session, or >3 sec gap.
let _smoothingPrevMedian: number | null = null;
let _smoothingPrevLower: number | null = null;
let _smoothingPrevUpper: number | null = null;
let _smoothingLastTimestamp = 0;
let _smoothingLastLocality = "";

/**
 * computeAIValue — wraps the enterprise AVM (3-layer ensemble).
 * Returns price range, median, confidence, and fair/over/under label.
 *
 * Called ONCE at listing creation. Buyer portal reads stored values.
 */
export function computeAIValue(input: AIValueInput): AIValueOutput {
  const area = input.area > 0 ? input.area : 1000;

  const result = valuate({
    locality: input.locality,
    city: input.city || "Bangalore",
    builder: input.builder || "",
    builderName: input.builder,
    area,
    floor: input.floor ?? 5,
    isTopFloor: input.isTopFloor ?? false,
    propertyType: input.propertyType || "apartment",
    bhk: input.bhk || 2,
    listingPrice: input.sellerPrice,
    projectName: input.project,
  });

  const propType = input.propertyType || "apartment";
  const t = propType.toLowerCase();

  const lower = result.range[0];
  const upper = result.range[1];
  const median = result.fMV;
  const confidence = result.confidence;
  const confidenceTier =
    (result.transparency?.confidenceTier as AIValueOutput["confidenceTier"]) ??
    "Low";
  const dataLevel = result.transparency?.dataLevel ?? "Locality";

  // Learned adjustment factors — computed dynamically from real sale data.
  // Fall back to market-calibrated defaults when insufficient data.
  // NOTE: Floor adjustment is already applied inside valuate() via getFloorAdjustment().
  // Do NOT apply floor again here — that would double-count the floor premium.
  const locality = input.locality;

  // Type-aware adjustments: each premium applies only to the relevant property type

  // Facing premium: apartments only
  const facingMultiplier =
    t.includes("apart") || t.includes("flat") || t.includes("studio")
      ? computeLearnedFacingPremium(input.facing, locality, propType)
      : 1.0;

  // Amenities: apartments and villas (not plots/land)
  const amenitiesCount = input.amenities?.length ?? 0;
  const amenitiesMultiplier =
    !t.includes("plot") && !t.includes("land")
      ? computeLearnedAmenityPremium(amenitiesCount, locality, propType)
      : 1.0;

  // Parking: apartments and villas (not plots)
  const parkingMultiplier =
    !t.includes("plot") && !t.includes("land")
      ? computeLearnedParkingPremium(
          (input.parking ?? 0) >= 1,
          locality,
          propType,
        )
      : 1.0;

  // Gated community premium: villas only
  const gatedMultiplier =
    t.includes("villa") || t.includes("house") || t.includes("row")
      ? computeLearnedGatedCommunityPremium(input.isGatedCommunity, locality)
      : 1.0;

  // Road width premium: plots only
  const roadWidthMultiplier =
    t.includes("plot") || t.includes("land")
      ? computeLearnedRoadWidthPremium(input.roadWidth, locality)
      : 1.0;

  const adjustmentFactor =
    facingMultiplier *
    amenitiesMultiplier *
    parkingMultiplier *
    gatedMultiplier *
    roadWidthMultiplier;

  const adjustedLower = Math.round(lower * adjustmentFactor);
  const adjustedUpper = Math.round(upper * adjustmentFactor);
  const adjustedMedian = Math.round(median * adjustmentFactor);

  const label = getPriceLabel(input.sellerPrice, adjustedMedian);

  // ─── Smoothing ──────────────────────────────────────────────────────────────────
  // Apply only when: recomputing within 3s AND same locality AND session has a prior value
  // Prevents flickering when user rapidly changes floor/facing/amenities.
  const now = Date.now();
  const timeSinceLastComputation = now - _smoothingLastTimestamp;
  const isSameLocality = input.locality === _smoothingLastLocality;
  const isWithinWindow =
    timeSinceLastComputation <= 3000 && timeSinceLastComputation > 0;
  const hasPrevValue = _smoothingPrevMedian !== null;

  if (isWithinWindow && isSameLocality && hasPrevValue) {
    // Apply smoothing formula: 0.7 * new + 0.3 * previous
    const smoothedMedian = Math.round(
      0.7 * adjustedMedian + 0.3 * _smoothingPrevMedian!,
    );
    const smoothedLower = Math.round(
      0.7 * adjustedLower + 0.3 * _smoothingPrevLower!,
    );
    const smoothedUpper = Math.round(
      0.7 * adjustedUpper + 0.3 * _smoothingPrevUpper!,
    );

    // Update smoothing state
    _smoothingPrevMedian = smoothedMedian;
    _smoothingPrevLower = smoothedLower;
    _smoothingPrevUpper = smoothedUpper;
    _smoothingLastTimestamp = now;

    const smoothedLabel = getPriceLabel(input.sellerPrice, smoothedMedian);
    return {
      lower: smoothedLower,
      upper: smoothedUpper,
      median: smoothedMedian,
      confidence,
      confidenceTier,
      dataLevel,
      label: smoothedLabel,
    };
  }

  // Store current prediction for next smoothing window
  _smoothingPrevMedian = adjustedMedian;
  _smoothingPrevLower = adjustedLower;
  _smoothingPrevUpper = adjustedUpper;
  _smoothingLastTimestamp = now;
  _smoothingLastLocality = input.locality;

  return {
    lower: adjustedLower,
    upper: adjustedUpper,
    median: adjustedMedian,
    confidence,
    confidenceTier,
    dataLevel,
    label,
  };
}

/**
 * getPriceLabel — global rule for fair/over/under classification.
 * Same logic used in seller dashboard and buyer portal.
 *
 * if sellerPrice > aiMedian * 1.05 → Overpriced
 * if sellerPrice < aiMedian * 0.95 → Undervalued
 * else → Fair Price
 */
export function getPriceLabel(
  sellerPrice: number | undefined,
  aiMedian: number,
): "Fair Price" | "Overpriced" | "Undervalued" {
  if (!sellerPrice || !aiMedian) return "Fair Price";
  if (sellerPrice > aiMedian * 1.05) return "Overpriced";
  if (sellerPrice < aiMedian * 0.95) return "Undervalued";
  return "Fair Price";
}

/**
 * formatAIRange — human-readable price range string.
 */
export function formatAIRange(lower: number, upper: number): string {
  const fmt = (n: number) => {
    if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)} Cr`;
    if (n >= 100_000) return `₹${(n / 100_000).toFixed(0)} L`;
    return `₹${n.toLocaleString("en-IN")}`;
  };
  return `${fmt(lower)} – ${fmt(upper)}`;
}
