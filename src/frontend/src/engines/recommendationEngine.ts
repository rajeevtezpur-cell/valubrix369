// recommendationEngine.ts — AI Buy/Sell/Hold recommendation engine

import type { DealClassification } from "./dealEngine";

export interface RecommendationOutput {
  action: "Strong Buy" | "Buy" | "Hold" | "Avoid";
  actionColor: string;
  text: string;
  confidence: number; // 0–100
}

/**
 * Generates a human-readable AI recommendation based on multiple signals.
 */
export function getRecommendation(
  dealScore: number,
  dealClassification: DealClassification,
  pctGrowth1Y: number,
  locationScore: number, // 0–100
  demandScore: number, // 0–100
  growthClassification: "High Growth" | "Emerging" | "Saturated",
): RecommendationOutput {
  // Composite signal
  const composite =
    dealScore * 0.4 +
    Math.min(pctGrowth1Y * 10, 100) * 0.25 +
    locationScore * 0.2 +
    demandScore * 0.15;

  if (composite >= 70 && growthClassification === "High Growth") {
    return {
      action: "Strong Buy",
      actionColor: "#22c55e",
      text: `Strong Buy — High growth area with ${dealClassification === "Strong Buy" ? "significantly undervalued" : "favorable"} pricing. Ideal for long-term investment.`,
      confidence: Math.min(Math.round(composite), 95),
    };
  }
  if (composite >= 60) {
    return {
      action: "Buy",
      actionColor: "#84cc16",
      text: `Good Buy — ${growthClassification} area with ${dealClassification.toLowerCase()} pricing. Strong fundamentals support appreciation.`,
      confidence: Math.min(Math.round(composite), 90),
    };
  }
  if (composite >= 45) {
    return {
      action: "Hold",
      actionColor: "#eab308",
      text: `Hold — Fair pricing with ${growthClassification.toLowerCase()} growth outlook. Reasonable entry if buying for self-use.`,
      confidence: Math.min(Math.round(composite), 80),
    };
  }
  return {
    action: "Avoid",
    actionColor: "#ef4444",
    text: `Avoid — ${dealClassification === "Overpriced" ? "Property is overpriced" : "Below-average fundamentals"} with limited near-term upside. Better opportunities available.`,
    confidence: Math.min(Math.round(composite), 75),
  };
}
