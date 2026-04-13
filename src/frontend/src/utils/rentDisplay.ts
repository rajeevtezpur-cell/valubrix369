/**
 * rentDisplay.ts — Shared rent formatting helpers for ValuBrix.
 *
 * VISIBILITY RULE (enforced here):
 * - If rent samples >= 5 → ALWAYS show rent metrics
 * - Only hide if: no data OR parsing error (rent < 1000)
 * - Do NOT hide based on clamp range — clamp only adds a warning label
 *
 * Rules:
 * - Monthly rent must ALWAYS show as full INR value (₹14,000)
 * - Rent/sqft is a SEPARATE metric (₹14/sqft) — never confuse the two
 */

/**
 * Format a monthly rent value in INR.
 * Input: full value in INR (e.g. 14000, 28000, 125000)
 * Output: compact readable string (₹14k, ₹28k, ₹1.25L)
 *
 * @example fmtMonthlyRent(14000) → "₹14k"
 * @example fmtMonthlyRent(125000) → "₹1.25L"
 * @example fmtMonthlyRent(0) → "—"
 */
export function fmtMonthlyRent(n: number): string {
  if (!n || n <= 0) return "—";
  if (n >= 100_000)
    return `₹${(n / 100_000).toFixed(2).replace(/\.?0+$/, "")}L`;
  if (n >= 1_000) return `₹${Math.round(n / 1_000)}k`;
  return `₹${n.toLocaleString("en-IN")}`;
}

/**
 * Format a rent-per-sqft value.
 * Input: rent/sqft (e.g. 14, 28, 45)
 * Output: "₹14/sqft" with optional warning if outside ₹18–₹80
 *
 * IMPORTANT: Never returns null just because value is outside range.
 * Returns the value with a warning flag instead.
 * Caller decides whether to show a "⚠ Estimated" label.
 *
 * @example fmtRentPerSqft(14) → "₹14/sqft" (with outOfRange=true)
 * @example fmtRentPerSqft(28) → "₹28/sqft" (outOfRange=false)
 */
export function fmtRentPerSqft(psf: number): string | null {
  if (!psf || psf <= 0) return null; // no data → hide
  return `₹${Math.round(psf)}/sqft`;
}

/**
 * Returns true if rent/sqft value is outside the expected Bangalore range.
 * Use to show a warning label, NOT to hide the value.
 */
export function isRentPerSqftOutOfRange(psf: number): boolean {
  return psf < 18 || psf > 80;
}

/**
 * Full display block for a rent estimate.
 * Returns both monthly rent and per-sqft as separate labeled strings.
 *
 * VISIBILITY RULE (enforced here):
 * - hide=false whenever sampleCount >= 5 AND monthlyRent >= 1000
 * - hide=true only if rent < 1000 (parsing error) OR no data at all
 * - Out-of-range psf is flagged as a warning, NOT hidden
 */
export interface RentDisplayBlock {
  monthlyLabel: string | null; // e.g. "₹28k/mo"
  perSqftLabel: string | null; // e.g. "₹28/sqft" — null only if area=0
  perSqftOutOfRange: boolean; // true → show warning, NOT hide
  confidenceLabel: string; // "AI Estimate" | "Market-based"
  hide: boolean; // true only on parsing error or zero data
}

export function getRentDisplayBlock(
  monthlyRent: number,
  area: number,
  confidenceLabel: "AI Estimate" | "Market-based",
  sampleCount: number,
): RentDisplayBlock {
  // Sanity: rent < 1000 is always invalid (unit bug) → hide
  if (!monthlyRent || monthlyRent < 1000) {
    if (import.meta.env.DEV) {
      console.warn("[rentDisplay] Invalid rent value (<1000):", {
        inputRent: monthlyRent,
        sampleCount,
      });
    }
    return {
      monthlyLabel: null,
      perSqftLabel: null,
      perSqftOutOfRange: false,
      confidenceLabel: "AI Estimate",
      hide: true,
    };
  }

  const rentPerSqft = area > 0 ? monthlyRent / area : 0;

  if (import.meta.env.DEV) {
    console.log("[rentDisplay]", {
      inputRent: monthlyRent,
      computedRent: monthlyRent,
      rentPerSqft: Math.round(rentPerSqft * 100) / 100,
      displayValue: fmtMonthlyRent(monthlyRent),
      sampleCount,
    });
  }

  // Monthly rent — ALWAYS show if valid
  const monthlyLabel = `${fmtMonthlyRent(monthlyRent)}/mo`;

  // Per-sqft — show if area > 0; flag as out-of-range if needed (but do not hide)
  let perSqftLabel: string | null = null;
  let perSqftOutOfRange = false;

  if (area > 0 && rentPerSqft > 0) {
    perSqftLabel = fmtRentPerSqft(rentPerSqft);
    perSqftOutOfRange = isRentPerSqftOutOfRange(rentPerSqft);
  }

  // VISIBILITY RULE: show unless explicitly no data
  // sampleCount < 5 does NOT cause hide — it just keeps confidenceLabel as "AI Estimate"
  const effectiveConfidence =
    sampleCount >= 5 ? confidenceLabel : "AI Estimate";

  return {
    monthlyLabel,
    perSqftLabel,
    perSqftOutOfRange,
    confidenceLabel: effectiveConfidence,
    hide: false, // Only set to true for invalid rent above
  };
}

/**
 * Legacy compat: same as fmtMonthlyRent.
 */
export const fmtRent = fmtMonthlyRent;
