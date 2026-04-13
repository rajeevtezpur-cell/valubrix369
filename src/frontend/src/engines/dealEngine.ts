// dealEngine.ts — Deal Score computation engine

export type DealClassification =
  | "Strong Buy"
  | "Good Deal"
  | "Fair Price"
  | "Overpriced";

export interface DealOutput {
  score: number; // 0–100
  classification: DealClassification;
  classificationColor: string;
  pctDiff: number; // positive = undervalued, negative = overpriced
  label: string; // e.g. "12% undervalued"
}

/**
 * Computes deal score comparing fair value (AI estimate) to listing price.
 * Score = ((FairValue - ListingPrice) / FairValue) * 100, clamped to 0–100.
 */
export function getDealScore(
  fairValue: number,
  listingPrice: number,
): DealOutput {
  const raw = ((fairValue - listingPrice) / fairValue) * 100;
  // Map raw to 0-100: raw 30 = score 100, raw -30 = score 0
  const score = Math.round(Math.min(Math.max(50 + raw * 1.67, 0), 100));
  const pctDiff = Math.round(raw * 10) / 10;

  let classification: DealClassification;
  let classificationColor: string;

  if (score >= 75) {
    classification = "Strong Buy";
    classificationColor = "#22c55e";
  } else if (score >= 60) {
    classification = "Good Deal";
    classificationColor = "#84cc16";
  } else if (score >= 40) {
    classification = "Fair Price";
    classificationColor = "#eab308";
  } else {
    classification = "Overpriced";
    classificationColor = "#ef4444";
  }

  const label =
    pctDiff > 0
      ? `${pctDiff.toFixed(1)}% undervalued`
      : pctDiff < 0
        ? `${Math.abs(pctDiff).toFixed(1)}% overpriced`
        : "At market value";

  return { score, classification, classificationColor, pctDiff, label };
}
