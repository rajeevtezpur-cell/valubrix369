/**
 * explanationEngine.ts — Deterministic template-based text explanation engine.
 *
 * Generates area intelligence narratives, investor insights, and comparables
 * reasoning from structured valuation + rent data. No external API required.
 *
 * Architecture:
 * - Primary: template-based (deterministic, offline, consistent)
 * - Optional: LLMHook interface for future plug-in (DeepSeek / GPT)
 *
 * Usage:
 *   import { generateAreaNarrative, generateInvestorInsight } from './explanationEngine';
 */

// ─── LLM Hook Interface (optional plug-in for future use) ───────────────────

export interface LLMHook {
  /**
   * Called with a structured prompt. Returns enriched text.
   * If not registered or unavailable, falls back to template output.
   */
  generateText(
    prompt: string,
    context: Record<string, unknown>,
  ): Promise<string>;
  isAvailable(): boolean;
}

let _llmHook: LLMHook | null = null;

/** Register an optional LLM hook for richer explanations. */
export function registerLLMHook(hook: LLMHook): void {
  _llmHook = hook;
}

// ─── Mock LLM Hook (active by default — swap for DeepSeek/GPT when key available) ──

class MockLLMHook implements LLMHook {
  isAvailable(): boolean {
    return false; // Returns false = template always used by default
  }
  async generateText(
    _prompt: string,
    _context: Record<string, unknown>,
  ): Promise<string> {
    // Mock: returns empty string so caller falls back to template
    return "";
  }
}

/**
 * Register a real DeepSeek or OpenAI-compatible LLM hook.
 * Call this once at app startup when an API key is available.
 *
 * @param apiKey - DeepSeek API key (get from platform.deepseek.com)
 * @param baseUrl - API base URL (default: DeepSeek API)
 * @param model - Model name (default: 'deepseek-chat')
 */
export function registerDeepSeekHook(
  apiKey: string,
  baseUrl = "https://api.deepseek.com/v1",
  model = "deepseek-chat",
): void {
  const hook: LLMHook = {
    isAvailable: () => Boolean(apiKey),
    async generateText(
      prompt: string,
      context: Record<string, unknown>,
    ): Promise<string> {
      // Satisfy no-unused-vars: context may be used by future callers
      void context;
      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "You are a real estate investment analyst for the Bangalore property market. Be concise, factual, and use Indian market context. Keep responses under 3 sentences.",
              },
              { role: "user", content: prompt },
            ],
            max_tokens: 200,
            temperature: 0.3,
          }),
        });
        if (!response.ok) return "";
        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        return data.choices?.[0]?.message?.content ?? "";
      } catch {
        return "";
      }
    },
  };
  registerLLMHook(hook);
}

// Auto-register mock (no-op — templates used by default until a real key is registered)
registerLLMHook(new MockLLMHook());

// ─── Input types ─────────────────────────────────────────────────────────────

export interface AreaNarrativeInput {
  locality: string;
  investmentScore: number; // 0-100
  growthScore: number; // 0-100
  demandScore: number; // 0-100
  livabilityScore: number; // 0-100
  avgPricePerSqft: number;
  priceTrend1Y: number; // % growth
  grossYieldPercent?: number; // e.g. 3.2
  confidenceTier?: "low" | "medium" | "high";
  nearestMetro?: string;
  metroDistance?: number;
  classification?: "High Growth" | "Emerging" | "Saturated";
  growthDriver?: string;
}

export interface InvestorInsightInput {
  locality: string;
  estimatedMonthlyRent: number;
  grossYieldPercent: number;
  propertyValue: number;
  bhk?: number;
  area?: number;
  confidenceTier?: "low" | "medium" | "high";
  dataSource?: "real-comps" | "sale-ratio-derived";
}

export interface ComparableReasoningInput {
  locality: string;
  subject: {
    area: number;
    floor?: number;
    facing?: string;
    bhk?: number;
  };
  compsUsed: number;
  dataLevel: string; // "Project" | "Builder" | "Locality" | "City"
  confidenceTier: "High" | "Medium" | "Low" | "Very Low";
  priceRange: [number, number];
  medianPrice: number;
  sellerPrice?: number;
  label?: "Fair Price" | "Overpriced" | "Undervalued";
}

// ─── Template helpers ─────────────────────────────────────────────────────────

function fmtCrore(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(0)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function scoreToWord(
  score: number,
  labels: [string, string, string, string],
): string {
  if (score >= 75) return labels[0];
  if (score >= 55) return labels[1];
  if (score >= 35) return labels[2];
  return labels[3];
}

function trendSentence(pct: number): string {
  if (pct >= 12)
    return `prices have risen strongly by ${pct.toFixed(1)}% over the past year`;
  if (pct >= 6) return `prices have grown by ${pct.toFixed(1)}% year-on-year`;
  if (pct >= 2)
    return `prices have shown modest appreciation of ${pct.toFixed(1)}%`;
  if (pct < 0)
    return `prices have softened by ${Math.abs(pct).toFixed(1)}% over the past year`;
  return "prices have remained largely stable over the past year";
}

// ─── Area Narrative ──────────────────────────────────────────────────────────

/**
 * Generates a 2-3 sentence area intelligence narrative.
 * Example: "Hebbal is a high-demand micro-market in North Bangalore..."
 */
export function generateAreaNarrative(input: AreaNarrativeInput): string {
  const {
    locality,
    investmentScore,
    growthScore,
    demandScore,
    avgPricePerSqft,
    priceTrend1Y,
    grossYieldPercent,
    nearestMetro,
    metroDistance,
    classification,
  } = input;

  const investWord = scoreToWord(investmentScore, [
    "a top-rated investment zone",
    "a strong investment market",
    "an emerging investment area",
    "a low-priority zone",
  ]);
  const demandWord = scoreToWord(demandScore, [
    "very high",
    "strong",
    "moderate",
    "low",
  ]);
  const growthWord = scoreToWord(growthScore, [
    "exceptional price growth",
    "solid appreciation",
    "steady growth",
    "limited appreciation",
  ]);

  let narrative = `${locality} is ${investWord} in Bangalore, with ${demandWord} buyer demand and ${growthWord}. `;
  narrative += `At ₹${avgPricePerSqft.toLocaleString("en-IN")}/sqft, ${trendSentence(priceTrend1Y)}. `;

  if (nearestMetro && metroDistance !== undefined) {
    narrative += `The nearest metro station is ${nearestMetro} (~${metroDistance.toFixed(1)} km away), supporting rental demand. `;
  }

  if (grossYieldPercent && grossYieldPercent > 0) {
    const yieldWord =
      grossYieldPercent >= 4.5
        ? "high"
        : grossYieldPercent >= 3.5
          ? "healthy"
          : "moderate";
    narrative += `Rental yields are ${yieldWord} at ~${grossYieldPercent.toFixed(1)}% gross.`;
  } else if (classification === "High Growth") {
    narrative +=
      "Capital appreciation is the primary return driver in this market.";
  } else if (classification === "Saturated") {
    narrative +=
      "The market is mature \u2014 rental income rather than appreciation may be the better return.";
  }

  return narrative.trim();
}

// ─── Investor Insight ─────────────────────────────────────────────────────────

/**
 * Generates an investor-facing insight paragraph.
 * Example: "If you buy this 2BHK at ₹95L, expect ₹28,000/mo rental..."
 */
export function generateInvestorInsight(input: InvestorInsightInput): string {
  const {
    locality,
    estimatedMonthlyRent,
    grossYieldPercent,
    propertyValue,
    bhk,
    area,
    confidenceTier,
    dataSource,
  } = input;

  const bhkStr = bhk ? `${bhk} BHK ` : "";
  const areaStr = area ? ` (${area.toLocaleString("en-IN")} sqft)` : "";
  const isEstimate =
    dataSource === "sale-ratio-derived" || confidenceTier === "low";
  const labelSuffix = isEstimate
    ? " (AI Estimate \u2014 learning from live listings)"
    : " (Market-based)";

  let insight = `For a ${bhkStr}property in ${locality}${areaStr} at ${fmtCrore(propertyValue)}: `;
  insight += `expected monthly rent is approximately ₹${estimatedMonthlyRent.toLocaleString("en-IN")}/mo${labelSuffix}. `;

  if (grossYieldPercent > 0) {
    const paybackYears = (100 / grossYieldPercent).toFixed(1);
    insight += `This translates to a gross rental yield of ~${grossYieldPercent.toFixed(1)}% per year`;
    if (Number.parseFloat(paybackYears) <= 30) {
      insight += `, with rental income covering the full purchase cost in ~${paybackYears} years (ignoring appreciation).`;
    } else {
      insight +=
        ". Capital appreciation is likely the stronger component of total return for this property.";
    }
  }

  if (grossYieldPercent >= 4.5) {
    insight +=
      " This is a high-yield opportunity \u2014 prioritise tenant quality and maintenance.";
  } else if (grossYieldPercent >= 3.0) {
    insight +=
      " Yields are in line with Bangalore's mid-market. Appreciation is the likely primary return driver.";
  } else if (grossYieldPercent > 0 && grossYieldPercent < 2.5) {
    insight +=
      " Yields are below average \u2014 this locality may be better suited for long-term capital appreciation.";
  }

  return insight.trim();
}

// ─── Comparables Reasoning ─────────────────────────────────────────────────────

/**
 * Generates a 2-sentence explanation of how the AI valuation was computed.
 * Example: "Based on 8 comparable sales in Hebbal..."
 */
export function generateComparablesReasoning(
  input: ComparableReasoningInput,
): string {
  const {
    locality,
    subject,
    compsUsed,
    dataLevel,
    confidenceTier,
    priceRange,
    medianPrice,
    sellerPrice,
    label,
  } = input;

  const rangeStr = `${fmtCrore(priceRange[0])} \u2013 ${fmtCrore(priceRange[1])}`;
  const medianStr = fmtCrore(medianPrice);
  const floorStr = subject.floor ? ` on floor ${subject.floor}` : "";
  const bhkStr = subject.bhk ? `${subject.bhk} BHK, ` : "";
  const areaStr = `${subject.area.toLocaleString("en-IN")} sqft`;

  let reasoning = "";

  if (compsUsed >= 5) {
    reasoning =
      `Based on ${compsUsed} comparable ${dataLevel.toLowerCase()}-level sales in ${locality} ` +
      `(${bhkStr}${areaStr}${floorStr}), the market value range is ${rangeStr}, with a central estimate of ${medianStr}. `;
  } else if (compsUsed >= 1) {
    reasoning =
      `Using ${compsUsed} comparable sale${compsUsed > 1 ? "s" : ""} near ${locality}, ` +
      `supplemented by locality-level pricing data, the estimated range is ${rangeStr}. `;
  } else {
    reasoning =
      `No direct comparables were available for ${locality}. ` +
      `The valuation of ${rangeStr} is derived from locality-level price signals and ML regression. `;
  }

  if (confidenceTier === "High" || confidenceTier === "Medium") {
    reasoning += `Confidence is ${confidenceTier.toLowerCase()} \u2014 the estimate is well-supported by recent data.`;
  } else {
    reasoning +=
      "Confidence is limited. As more transactions occur in this micro-market, accuracy will improve.";
  }

  if (sellerPrice && label && label !== "Fair Price") {
    const sellerStr = fmtCrore(sellerPrice);
    if (label === "Overpriced") {
      reasoning += ` The asking price of ${sellerStr} is above the market range \u2014 consider negotiating down.`;
    } else if (label === "Undervalued") {
      reasoning += ` The asking price of ${sellerStr} is below the market median \u2014 this may be an opportunity.`;
    }
  }

  return reasoning.trim();
}

// ─── Async wrapper (uses LLM if available, else template) ────────────────────

/** Async version — uses LLM hook if registered and available, else template.
 *  @param persona - 'investor' (default) focuses on yield/ROI; 'homebuyer' focuses on livability.
 */
export async function generateAreaNarrativeAsync(
  input: AreaNarrativeInput,
  persona: "investor" | "homebuyer" = "investor",
): Promise<{ text: string; source: "llm" | "template" }> {
  const templateText = generateAreaNarrative(input);
  if (_llmHook?.isAvailable()) {
    try {
      const personaContext =
        persona === "investor"
          ? "Focus on rental yield, gross yield %, payback period, and capital appreciation potential."
          : "Focus on livability, metro connectivity, schools, safety, and community quality of life.";
      const prompt = `Write a 2-3 sentence ${persona === "investor" ? "investment" : "home-buying"} narrative for the locality "${input.locality}" in Bangalore. ${personaContext}`;
      const llmText = await _llmHook.generateText(
        prompt,
        input as unknown as Record<string, unknown>,
      );
      return { text: llmText || templateText, source: "llm" };
    } catch {
      // Fall through to template
    }
  }
  return { text: templateText, source: "template" };
}
