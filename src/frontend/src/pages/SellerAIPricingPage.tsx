import { Brain, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import SellerLayout from "../components/SellerLayout";

const BASE_RATE: Record<string, number> = {
  Apartment: 9200,
  Villa: 12000,
  Plot: 4500,
  Commercial: 8500,
};
const BHK_MULT: Record<string, number> = {
  "1": 0.85,
  "2": 1.0,
  "3": 1.1,
  "4": 1.2,
};

const MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

export default function SellerAIPricingPage() {
  const [propertyType, setPropertyType] = useState("Apartment");
  const [bhk, setBhk] = useState("3");
  const [area, setArea] = useState(1450);

  const estimatedCr = useMemo(() => {
    const rate = BASE_RATE[propertyType] ?? 9200;
    const mult = BHK_MULT[bhk] ?? 1.0;
    return ((area * rate * mult) / 10000000).toFixed(2);
  }, [propertyType, bhk, area]);

  const marketAvg = useMemo(() => {
    const rate = (BASE_RATE[propertyType] ?? 9200) * 0.95;
    const mult = BHK_MULT[bhk] ?? 1.0;
    return ((area * rate * mult) / 10000000).toFixed(2);
  }, [propertyType, bhk, area]);

  const trendBase = [118, 121, 124, 127, 129, 132];
  const trendMult = (BASE_RATE[propertyType] ?? 9200) / 9200;
  const TREND = trendBase.map((v) => Math.round(v * trendMult));
  const maxVal = Math.max(...TREND);
  const minVal = Math.min(...TREND) - 5;

  const STATS = [
    {
      label: "AI Estimated Value",
      value: `₹${estimatedCr} Cr`,
      sub: `vs Market Avg ₹${marketAvg} Cr`,
      color: "text-[#D4AF37]",
    },
    {
      label: "Market Price Range",
      value: `₹${(+marketAvg * 0.95).toFixed(2)}–${(+marketAvg * 1.05).toFixed(2)} Cr`,
      sub: "Based on comparables",
      color: "text-blue-400",
    },
    {
      label: "Demand Score",
      value: propertyType === "Villa" ? "85 / 100" : "78 / 100",
      sub: "High demand area",
      color: "text-emerald-400",
    },
    {
      label: "Days-to-Sell",
      value: propertyType === "Plot" ? "52 days" : "36 days",
      sub: "Avg in area: 42 days",
      color: "text-purple-400",
    },
  ];

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            AI <span className="text-[#D4AF37]">Pricing Intelligence</span>
          </h1>
          <p className="text-white/40 text-sm mt-1">
            AI-powered pricing insights for your property
          </p>
        </div>

        {/* Input Controls */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5"
        >
          <h2 className="text-white font-semibold mb-4">Property Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label
                htmlFor="ai-type"
                className="text-white/50 text-xs mb-1.5 block"
              >
                Property Type
              </label>
              <select
                id="ai-type"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/40"
              >
                {Object.keys(BASE_RATE).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="pricing-bhk"
                className="text-white/50 text-xs mb-1.5 block"
              >
                BHK
              </label>
              <select
                id="pricing-bhk"
                value={bhk}
                onChange={(e) => setBhk(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/40"
              >
                {["1", "2", "3", "4"].map((b) => (
                  <option key={b} value={b}>
                    {b} BHK
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="ai-area"
                className="text-white/50 text-xs mb-1.5 block"
              >
                Area (sq ft)
              </label>
              <input
                id="ai-area"
                type="number"
                value={area}
                onChange={(e) => setArea(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/40"
                min={100}
                max={10000}
              />
            </div>
            <div className="flex items-end">
              <div className="w-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl px-3 py-2.5">
                <p className="text-[#D4AF37] text-xs">Estimated Value</p>
                <p className="text-[#D4AF37] text-lg font-bold">
                  ₹{estimatedCr} Cr
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ y: -3 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-4"
            >
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-white/40 text-xs mt-1">{s.label}</p>
              <p className="text-white/30 text-xs">{s.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Price Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Price Trend (Lakhs)</h2>
            <div className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-emerald-400" />
              <span className="text-emerald-400 text-sm font-bold">
                +11.9% (6M)
              </span>
            </div>
          </div>
          <svg
            viewBox="0 0 500 100"
            className="w-full"
            preserveAspectRatio="none"
            style={{ height: 100 }}
            role="img"
            aria-label="Price trend"
          >
            <title>Price trend</title>
            {TREND.map((v, i) => {
              const x = (i / (TREND.length - 1)) * 480 + 10;
              const y = 85 - ((v - minVal) / (maxVal - minVal)) * 70;
              const nx = ((i + 1) / (TREND.length - 1)) * 480 + 10;
              const ny =
                i < TREND.length - 1
                  ? 85 - ((TREND[i + 1] - minVal) / (maxVal - minVal)) * 70
                  : y;
              return (
                <g key={`tr-${MONTHS[i]}`}>
                  {i < TREND.length - 1 && (
                    <line
                      x1={x}
                      y1={y}
                      x2={nx}
                      y2={ny}
                      stroke="#D4AF37"
                      strokeWidth="2"
                    />
                  )}
                  <circle cx={x} cy={y} r="4" fill="#D4AF37" />
                  <text
                    x={x}
                    y={y - 8}
                    textAnchor="middle"
                    fill="#D4AF37"
                    fontSize="9"
                  >
                    {v}L
                  </text>
                  <text
                    x={x}
                    y={98}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.3)"
                    fontSize="8"
                  >
                    {MONTHS[i]}
                  </text>
                </g>
              );
            })}
          </svg>
        </motion.div>

        {/* Comp Data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5"
        >
          <h2 className="text-white font-semibold mb-4">
            Price Comparison (per sq ft)
          </h2>
          {[
            {
              label: "Your Property",
              psf: Math.round(BASE_RATE[propertyType] * (BHK_MULT[bhk] ?? 1)),
              highlight: true,
            },
            {
              label: "Area Average",
              psf: Math.round(BASE_RATE[propertyType] * 0.95),
              highlight: false,
            },
            {
              label: "Top Comparable",
              psf: Math.round(BASE_RATE[propertyType] * 1.03),
              highlight: false,
            },
            {
              label: "Lowest Nearby",
              psf: Math.round(BASE_RATE[propertyType] * 0.86),
              highlight: false,
            },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0"
            >
              <span
                className={`text-sm flex-1 ${row.highlight ? "text-[#D4AF37] font-bold" : "text-white/60"}`}
              >
                {row.label}
              </span>
              <span
                className={`text-sm font-mono ${row.highlight ? "text-[#D4AF37] font-bold" : "text-white/60"}`}
              >
                ₹{row.psf.toLocaleString()}/sqft
              </span>
              {row.highlight ? (
                <TrendingUp size={14} className="text-emerald-400" />
              ) : (
                <TrendingDown size={14} className="text-white/30" />
              )}
            </div>
          ))}
        </motion.div>

        {/* AI Advisor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center">
              <Brain size={16} className="text-[#D4AF37]" />
            </div>
            <h2 className="text-[#D4AF37] font-semibold">AI Pricing Advisor</h2>
          </div>
          <p className="text-white/60 text-sm">
            Based on current market conditions for {bhk} BHK {propertyType} at{" "}
            {area.toLocaleString()} sq ft, the optimal listing price is{" "}
            <span className="text-[#D4AF37] font-bold">₹{estimatedCr} Cr</span>.
            {+estimatedCr > +marketAvg
              ? " Your pricing is above market average — highlight unique features to justify the premium."
              : " Your pricing is competitive and likely to attract serious buyers quickly."}
          </p>
        </motion.div>
      </div>
    </SellerLayout>
  );
}
