// marketClassificationEngine.ts — Market area classification with strict validation
// Classifies areas as Emerging, Growth Corridor, Established, or Saturated.
// Validation prevents mislabeling (e.g., peripheral areas can never be Saturated).

import { getZoneType } from "./metroEngine";

export type MarketClassification =
  | "Emerging"
  | "Growth Corridor"
  | "Established"
  | "Saturated";

export type SupplyLevel = "low" | "medium" | "high";

export interface MarketClassificationInput {
  lat: number;
  lng: number;
  priceGrowthPercent: number; // e.g. 12 = 12% YoY growth
  supplyLevel: SupplyLevel;
  infraScore: number; // 0–100
  demandScore: number; // 0–100
}

export interface MarketClassificationResult {
  classification: MarketClassification;
  confidence: number; // 0–100
  reason: string;
  isValid: boolean;
  validationNote?: string;
}

/**
 * Classify an area using growth, supply, infra, and demand signals.
 * Strict validation prevents illogical labels.
 */
export function classifyMarket(
  input: MarketClassificationInput,
): MarketClassificationResult {
  const { lat, lng, priceGrowthPercent, supplyLevel, infraScore, demandScore } =
    input;
  const zone = getZoneType(lat, lng);

  // --- Initial classification ---
  let classification: MarketClassification;
  let reason: string;

  if (priceGrowthPercent >= 15 && supplyLevel === "low" && infraScore < 50) {
    classification = "Emerging";
    reason =
      "High growth potential with limited supply and developing infrastructure";
  } else if (
    priceGrowthPercent >= 8 &&
    priceGrowthPercent < 20 &&
    demandScore >= 60 &&
    infraScore >= 40
  ) {
    classification = "Growth Corridor";
    reason =
      "Strong demand growth with improving infrastructure and rising prices";
  } else if (
    priceGrowthPercent >= 5 &&
    priceGrowthPercent <= 14 &&
    infraScore >= 65 &&
    demandScore >= 55
  ) {
    classification = "Established";
    reason =
      "Mature market with stable growth, strong infrastructure, and steady demand";
  } else if (
    supplyLevel === "high" &&
    priceGrowthPercent < 8 &&
    demandScore < 50
  ) {
    classification = "Saturated";
    reason =
      "High supply with low demand growth and slowing price appreciation";
  } else if (priceGrowthPercent >= 12) {
    // Fallback: strong growth → Growth Corridor
    classification = "Growth Corridor";
    reason = "Above-average price growth signals emerging corridor";
  } else if (infraScore >= 70) {
    classification = "Established";
    reason = "Strong infrastructure base supports stable market";
  } else {
    // Default for developing / unclear areas
    classification = "Emerging";
    reason = "Developing area with growth potential";
  }

  // --- Strict validation rules ---
  let isValid = true;
  let validationNote: string | undefined;

  // Rule 1: Peripheral zones CANNOT be Saturated
  if (classification === "Saturated" && zone === "peripheral") {
    classification = "Emerging";
    reason =
      "Peripheral developing area reclassified from Saturated to Emerging";
    isValid = false;
    validationNote =
      "Peripheral areas cannot be Saturated — insufficient market maturity";
  }

  // Rule 2: Saturated + high growth is contradictory
  if (classification === "Saturated" && priceGrowthPercent > 12) {
    classification = "Growth Corridor";
    reason =
      "Reclassified: high price growth is inconsistent with Saturated market";
    isValid = false;
    validationNote = `Growth of ${priceGrowthPercent}% disqualifies Saturated classification`;
  }

  // Rule 3: Emerging + strong infra is contradictory
  if (classification === "Emerging" && infraScore > 75) {
    classification = "Established";
    reason =
      "Strong infrastructure base reclassified from Emerging to Established";
    isValid = false;
    validationNote = `Infra score ${infraScore} is too high for Emerging classification`;
  }

  // Rule 4: Established + very low growth → downgrade
  if (classification === "Established" && priceGrowthPercent < 5) {
    classification = "Saturated";
    reason = "Low price growth in mature area indicates market saturation";
    isValid = false;
    validationNote = `Growth of ${priceGrowthPercent}% in mature area suggests saturation`;
  }

  // Rule 5: Semi-urban areas with low infra and high growth should be Growth Corridor
  if (
    zone === "semiUrban" &&
    priceGrowthPercent >= 10 &&
    (classification === "Saturated" || classification === "Emerging")
  ) {
    classification = "Growth Corridor";
    reason = "Semi-urban area with strong growth corridor characteristics";
    isValid = false;
    validationNote =
      "Reclassified to Growth Corridor based on zone + growth signals";
  }

  const confidence = computeConfidence(
    priceGrowthPercent,
    supplyLevel,
    infraScore,
    demandScore,
  );

  return { classification, confidence, reason, isValid, validationNote };
}

function computeConfidence(
  priceGrowth: number,
  supply: SupplyLevel,
  infra: number,
  demand: number,
): number {
  // Higher confidence when signals are strong and consistent
  let score = 50;
  if (priceGrowth > 12) score += 15;
  else if (priceGrowth > 8) score += 10;
  else if (priceGrowth < 5) score -= 10;

  if (supply === "low") score += 10;
  else if (supply === "high") score += 5;

  if (infra > 70) score += 10;
  else if (infra < 30) score -= 5;

  if (demand > 70) score += 10;
  else if (demand < 40) score -= 5;

  return Math.min(Math.max(score, 20), 95);
}

/**
 * Derive market classification inputs from locality zone and known data.
 * Used when full signals aren't available.
 */
export function classifyFromLocality(
  lat: number,
  lng: number,
  localityName?: string,
): MarketClassificationResult {
  const zone = getZoneType(lat, lng);

  // Zone-based defaults
  let priceGrowthPercent: number;
  let supplyLevel: SupplyLevel;
  let infraScore: number;
  let demandScore: number;

  switch (zone) {
    case "urban":
      priceGrowthPercent = 8;
      supplyLevel = "medium";
      infraScore = 80;
      demandScore = 72;
      break;
    case "semiUrban":
      priceGrowthPercent = 12;
      supplyLevel = "medium";
      infraScore = 52;
      demandScore = 60;
      break;
    default: // peripheral
      priceGrowthPercent = 16;
      supplyLevel = "low";
      infraScore = 30;
      demandScore = 45;
      break;
  }

  // Known corridor overrides
  const lname = (localityName ?? "").toLowerCase();
  if (
    lname.includes("whitefield") ||
    lname.includes("sarjapur") ||
    lname.includes("bellandur") ||
    lname.includes("hebbal")
  ) {
    priceGrowthPercent = 11;
    infraScore = 72;
    demandScore = 75;
  } else if (
    lname.includes("devanahalli") ||
    lname.includes("bagalur") ||
    lname.includes("aerospace")
  ) {
    priceGrowthPercent = 18;
    infraScore = 38;
    demandScore = 50;
  } else if (lname.includes("electronic city") || lname.includes("hosur")) {
    priceGrowthPercent = 10;
    infraScore = 68;
    demandScore = 68;
  }

  return classifyMarket({
    lat,
    lng,
    priceGrowthPercent,
    supplyLevel,
    infraScore,
    demandScore,
  });
}
