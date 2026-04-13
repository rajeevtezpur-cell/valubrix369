import { useState } from "react";
import BuyerLayout from "../components/BuyerLayout";
import SmartLocationSearch from "../components/SmartLocationSearch";
import type { LocationRecord } from "../data/locationData";
import { getDemandOutput } from "../engines/demandEngine";
import { getBaseMicroLocationPSF } from "../utils/localityEngine";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface NegotiationResult {
  suggestedOfferLow: number;
  suggestedOfferHigh: number;
  maxOffer: number;
  confidence: "High" | "Medium" | "Low";
  marketCondition: "Buyer" | "Neutral" | "Seller";
  discountPct: number;
  strategyText: string;
  openingMove: string;
  walkAwayPrice: number;
}

// ─── Negotiation engine ────────────────────────────────────────────────────

function computeNegotiation(
  listedPrice: number,
  aiValue: number,
  demandScore: number,
  daysOnMarket: number,
  compLow: number,
  compHigh: number,
): NegotiationResult {
  // Market condition from demand score
  const marketCondition: NegotiationResult["marketCondition"] =
    demandScore >= 75 ? "Seller" : demandScore >= 45 ? "Neutral" : "Buyer";

  // Base discount from AI valuation gap
  const aiGap = (listedPrice - aiValue) / aiValue; // positive = overpriced
  const domFactor = daysOnMarket > 90 ? 0.06 : daysOnMarket > 45 ? 0.03 : 0;
  const demandDiscount =
    marketCondition === "Buyer"
      ? 0.07
      : marketCondition === "Neutral"
        ? 0.04
        : 0.02;

  // Total discount budget
  const totalDiscountMax = Math.max(
    aiGap + domFactor + demandDiscount,
    demandDiscount, // always at least demand-based discount
  );

  // Suggested offer range: split discount budget
  const discountHigh = Math.min(totalDiscountMax, 0.18); // never suggest >18% below listed
  const discountLow = Math.max(discountHigh - 0.04, 0.01);

  const suggestedOfferHigh = Math.round(listedPrice * (1 - discountLow));
  const suggestedOfferLow = Math.round(listedPrice * (1 - discountHigh));
  const maxOffer = Math.min(
    aiValue,
    Math.round(listedPrice * (1 - discountLow * 0.5)),
  );
  const walkAwayPrice = Math.round(aiValue * 1.05); // never pay more than 5% above AI

  // Clamp max offer to comp range
  const clampedMax = compHigh > 0 ? Math.min(maxOffer, compHigh) : maxOffer;

  // Confidence from data quality
  const confidence: NegotiationResult["confidence"] =
    compLow > 0 && compHigh > 0 ? "High" : aiValue > 0 ? "Medium" : "Low";

  // Strategy text — merged into single template literals
  let strategyText = "";
  let openingMove = "";

  if (marketCondition === "Buyer") {
    strategyText = `Buyer's market — demand score ${demandScore}/100. You have strong negotiating leverage. ${
      daysOnMarket > 45
        ? `Property has been listed ${daysOnMarket} days, increasing seller urgency. `
        : ""
    }${aiGap > 0.05 ? `Listed ${Math.round(aiGap * 100)}% above AI value. ` : ""}Start at ${Math.round(discountHigh * 100)}% below ask.`;
    openingMove = `Open at ₹${formatPriceShort(suggestedOfferLow)}. Anchor with comps showing ₹${formatPriceShort(compLow)}–₹${formatPriceShort(compHigh)} range. Walk away if seller won't go below ₹${formatPriceShort(walkAwayPrice)}.`;
  } else if (marketCondition === "Neutral") {
    strategyText = `Neutral market — demand score ${demandScore}/100. Reasonable negotiation possible. ${
      aiGap > 0.03
        ? `Listed ${Math.round(aiGap * 100)}% above AI value — cite comps. `
        : ""
    }Start ${Math.round(discountHigh * 100)}% below ask and be ready to meet at ₹${formatPriceShort(suggestedOfferHigh)}.`;
    openingMove = `Open at ₹${formatPriceShort(suggestedOfferLow)}. Offer quick decision in exchange for price movement. Target final price ₹${formatPriceShort(suggestedOfferHigh)}.`;
  } else {
    strategyText = `Seller's market — demand score ${demandScore}/100. Limited negotiation room. ${
      aiGap < -0.02
        ? "Property is actually underpriced vs AI value — seller may counter firm. "
        : ""
    }Focus on non-price terms: possession date, parking, white goods.`;
    openingMove = `Open close to ask at ₹${formatPriceShort(suggestedOfferHigh)}. Negotiate on terms rather than price. Max offer: ₹${formatPriceShort(clampedMax)}.`;
  }

  return {
    suggestedOfferLow,
    suggestedOfferHigh,
    maxOffer: clampedMax,
    confidence,
    marketCondition,
    discountPct: Math.round(discountHigh * 100),
    strategyText,
    openingMove,
    walkAwayPrice,
  };
}

function formatPriceShort(p: number): string {
  if (!p || p <= 0) return "N/A";
  if (p >= 10_000_000) return `${(p / 10_000_000).toFixed(2)} Cr`;
  if (p >= 100_000) return `${(p / 100_000).toFixed(1)}L`;
  return `₹${p.toLocaleString("en-IN")}`;
}

function formatPriceFull(p: number): string {
  if (!p || p <= 0) return "—";
  return `₹${formatPriceShort(p)}`;
}

// ─── Known locality coordinates ────────────────────────────────────────────────

const LOCALITY_LAT_LNG: Record<string, [number, number]> = {
  whitefield: [12.9698, 77.7499],
  hebbal: [13.035, 77.597],
  thanisandra: [13.065, 77.624],
  yelahanka: [13.1, 77.595],
  devanahalli: [13.246, 77.717],
  koramangala: [12.9352, 77.6245],
  indiranagar: [12.9784, 77.6408],
  marathahalli: [12.958, 77.701],
  "sarjapur road": [12.908, 77.685],
  "electronic city": [12.839, 77.677],
  bagalur: [13.165, 77.726],
  panathur: [12.948, 77.706],
};

function getLocalityDemand(locality: string): number {
  const key = locality.toLowerCase().trim();
  const coords = LOCALITY_LAT_LNG[key] ?? [13.0, 77.6];
  return getDemandOutput(coords[0], coords[1], locality).demandScore;
}

function parseLakhs(raw: string): number {
  const n = Number.parseFloat(raw.replace(/[^0-9.]/g, ""));
  if (Number.isNaN(n)) return 0;
  // If number looks like crores (e.g. 1.05), convert
  if (raw.toLowerCase().includes("cr")) return Math.round(n * 10_000_000);
  if (raw.toLowerCase().includes("l")) return Math.round(n * 100_000);
  // If raw number > 10000, treat as full INR, else treat as lakhs
  if (n > 10_000) return Math.round(n);
  return Math.round(n * 100_000);
}

// ─── Page component ──────────────────────────────────────────────────────────────

export default function NegotiationAdvisorPage() {
  const [form, setForm] = useState({
    locality: "",
    listedPrice: "",
    aiValue: "",
    daysOnMarket: "30",
    compLow: "",
    compHigh: "",
  });
  const [result, setResult] = useState<NegotiationResult | null>(null);
  const [autoAIValue, setAutoAIValue] = useState(0);

  const handleLocationSelect = (loc: LocationRecord) => {
    const basePSF = getBaseMicroLocationPSF(loc.name);
    // Auto-suggest AI value based on 1000 sqft standard unit
    setAutoAIValue(basePSF * 1000);
    setForm((f) => ({ ...f, locality: loc.name }));
  };

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const handleCompute = () => {
    const listedPrice = parseLakhs(form.listedPrice);
    const rawAI = parseLakhs(form.aiValue);
    const aiValue = rawAI > 0 ? rawAI : autoAIValue;
    const demandScore = form.locality ? getLocalityDemand(form.locality) : 50;
    const daysOnMarket = Number.parseInt(form.daysOnMarket) || 30;
    const compLow = parseLakhs(form.compLow);
    const compHigh = parseLakhs(form.compHigh);

    if (listedPrice <= 0 || aiValue <= 0) return;

    const res = computeNegotiation(
      listedPrice,
      aiValue,
      demandScore,
      daysOnMarket,
      compLow,
      compHigh,
    );
    setResult(res);
  };

  const confidenceColor =
    result?.confidence === "High"
      ? "#10b981"
      : result?.confidence === "Medium"
        ? "#D4AF37"
        : "#60a5fa";
  const mktColor =
    result?.marketCondition === "Buyer"
      ? "#10b981"
      : result?.marketCondition === "Seller"
        ? "#ef4444"
        : "#f59e0b";

  return (
    <BuyerLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Negotiation Advisor
          </h1>
          <p className="text-white/50">
            AI-powered negotiation strategy based on market conditions, AI
            valuation, and comparable data.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input panel */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
            <h2 className="text-white font-bold text-sm uppercase tracking-widest">
              Property Details
            </h2>

            {/* Locality — SmartLocationSearch has its own input, label is decorative */}
            <div>
              <p className="text-white/40 text-xs mb-1.5">Locality</p>
              <SmartLocationSearch
                placeholder="Search locality..."
                onSelect={handleLocationSelect}
              />
              {form.locality && (
                <p className="text-white/30 text-xs mt-1">
                  Base PSF: ₹
                  {getBaseMicroLocationPSF(form.locality).toLocaleString()}/sqft
                  • Demand: {getLocalityDemand(form.locality)}/100
                </p>
              )}
            </div>

            {/* Listed Price */}
            <div>
              <label
                htmlFor="neg-listed-price"
                className="text-white/40 text-xs mb-1.5 block"
              >
                Listed Price
              </label>
              <input
                id="neg-listed-price"
                type="text"
                placeholder="e.g. 95L or 1.05Cr or 9500000"
                value={form.listedPrice}
                onChange={(e) => set("listedPrice", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-[#D4AF37]/50"
              />
            </div>

            {/* AI Value */}
            <div>
              <label
                htmlFor="neg-ai-value"
                className="text-white/40 text-xs mb-1.5 block"
              >
                AI Value
                {autoAIValue > 0 && (
                  <button
                    type="button"
                    onClick={() => set("aiValue", String(autoAIValue))}
                    className="ml-2 text-[#D4AF37]/70 underline"
                  >
                    Use auto: ₹{formatPriceShort(autoAIValue)}
                  </button>
                )}
              </label>
              <input
                id="neg-ai-value"
                type="text"
                placeholder="e.g. 88L or 9500000 (from AI Valuation)"
                value={form.aiValue}
                onChange={(e) => set("aiValue", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-[#D4AF37]/50"
              />
            </div>

            {/* Days on market */}
            <div>
              <label
                htmlFor="neg-days-on-market"
                className="text-white/40 text-xs mb-1.5 block"
              >
                Days on Market
              </label>
              <input
                id="neg-days-on-market"
                type="number"
                min="0"
                placeholder="30"
                value={form.daysOnMarket}
                onChange={(e) => set("daysOnMarket", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-[#D4AF37]/50"
              />
            </div>

            {/* Comparable range */}
            <div>
              <p className="text-white/40 text-xs mb-1.5">
                Comparable Range (optional)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  aria-label="Comparable range low"
                  placeholder="Low e.g. 85L"
                  value={form.compLow}
                  onChange={(e) => set("compLow", e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-[#D4AF37]/50"
                />
                <input
                  type="text"
                  aria-label="Comparable range high"
                  placeholder="High e.g. 1.1Cr"
                  value={form.compHigh}
                  onChange={(e) => set("compHigh", e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleCompute}
              disabled={!form.listedPrice}
              data-ocid="negotiation.submit_button"
              className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-[#D4AF37] text-black hover:bg-[#c9a430] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Compute Negotiation Strategy
            </button>
          </div>

          {/* Result panel */}
          <div>
            {!result && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center h-full flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                  <span className="text-[#D4AF37] text-2xl">🤝</span>
                </div>
                <p className="text-white/50 text-sm">
                  Enter property details on the left to get a negotiation
                  strategy.
                </p>
                <div className="text-white/20 text-xs space-y-1 text-left">
                  <p>• Listed price + AI value = deal gap analysis</p>
                  <p>• Locality demand score shapes strategy</p>
                  <p>• Days on market increases your leverage</p>
                  <p>• Comp range provides walk-away price</p>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {/* Summary card */}
                <div className="bg-gradient-to-r from-[#D4AF37]/10 to-white/5 border border-[#D4AF37]/30 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[#D4AF37] text-sm font-bold uppercase tracking-widest">
                      Strategy Output
                    </h2>
                    <div className="flex gap-2">
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: `${mktColor}20`, color: mktColor }}
                      >
                        {result.marketCondition} Market
                      </span>
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{
                          background: `${confidenceColor}20`,
                          color: confidenceColor,
                        }}
                      >
                        {result.confidence} Confidence
                      </span>
                    </div>
                  </div>

                  {/* Offer range */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-white/40 text-xs mb-1">
                        Suggested Offer Range
                      </p>
                      <p className="text-white font-bold text-xl">
                        {formatPriceFull(result.suggestedOfferLow)}
                      </p>
                      <p className="text-white/50 text-sm">
                        to {formatPriceFull(result.suggestedOfferHigh)}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-white/40 text-xs mb-1">
                        Max Offer (AI-capped)
                      </p>
                      <p className="text-[#D4AF37] font-bold text-xl">
                        {formatPriceFull(result.maxOffer)}
                      </p>
                      <p className="text-white/40 text-xs mt-1">
                        Walk away &gt; {formatPriceFull(result.walkAwayPrice)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-3 mb-3">
                    <p className="text-white/40 text-xs mb-1 uppercase tracking-wider">
                      Discount to Ask
                    </p>
                    <p className="text-white font-bold">
                      {result.discountPct}% below listed price
                    </p>
                  </div>
                </div>

                {/* Strategy text */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <p className="text-white/40 text-xs uppercase tracking-widest mb-3">
                    Market Analysis
                  </p>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {result.strategyText}
                  </p>
                </div>

                {/* Opening move */}
                <div className="bg-white/5 border border-[#D4AF37]/20 rounded-2xl p-5">
                  <p className="text-[#D4AF37] text-xs uppercase tracking-widest mb-3">
                    Opening Move
                  </p>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {result.openingMove}
                  </p>
                </div>

                <p className="text-white/20 text-[10px] italic px-1">
                  Based on localityEngine PSF, demandEngine score, and
                  comparable range. Not financial advice.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}
