import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download, Loader2, Shield, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import GlobalNav from "../components/GlobalNav";
import SmartLocationSearch from "../components/SmartLocationSearch";
import { useAdmin } from "../context/AdminContext";
import type { LocationRecord } from "../data/locationData";
import {
  type ValuationResult,
  getComparables,
  valuateProperty,
} from "../valuationEngine";

type Grade = "A" | "B" | "C";

function formatPrice(p: number) {
  if (p >= 10000000) return `₹${(p / 10000000).toFixed(2)} Cr`;
  if (p >= 100000) return `₹${(p / 100000).toFixed(1)} L`;
  return `₹${p.toLocaleString("en-IN")}`;
}

function getGrade(confidence: number): Grade {
  if (confidence >= 75) return "A";
  if (confidence >= 55) return "B";
  return "C";
}

const gradeColor = { A: "emerald", B: "amber", C: "red" };
const gradeLabel = { A: "Low Risk", B: "Moderate Risk", C: "High Risk" };

export default function BankValuationPage() {
  const navigate = useNavigate();
  const { incrementBankReports } = useAdmin();
  const [address, setAddress] = useState("");
  const [survey, setSurvey] = useState("");
  const [regNo, setRegNo] = useState("");
  const [area, setArea] = useState("1200");
  const [bhk, setBhk] = useState(3);
  const [builder, setBuilder] = useState("");
  const [askingPrice, setAskingPrice] = useState(""); // optional, for risk flag
  const [location, setLocation] = useState<LocationRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [comps, setComps] = useState<ReturnType<typeof getComparables>>([]);

  const handleRun = () => {
    if (!address.trim()) return;
    setLoading(true);
    setTimeout(() => {
      const locality = location?.name ?? "Whitefield";
      const city = location?.city ?? "Bangalore";
      const v2 = valuateProperty({
        locality,
        builder: builder || "",
        city,
        area: Number(area) || 1200,
        floor: 3,
        propertyType: "flat",
        bhk,
      });
      setResult(v2);
      setComps(getComparables(locality, city, "flat", bhk));
      setLoading(false);
    }, 2000);
  };

  const handleReport = () => {
    if (!result) return;
    incrementBankReports();
    try {
      const history = JSON.parse(
        localStorage.getItem("valubrix_bank_reports") || "[]",
      );
      history.push({
        id: `r_${Date.now()}`,
        date: new Date().toLocaleDateString("en-IN"),
        property: address,
        officer:
          JSON.parse(localStorage.getItem("valubrix_bank_officer") || "{}")
            .name || "Officer",
        fmv: formatPrice(result.fMV),
        grade: getGrade(result.confidence),
      });
      localStorage.setItem("valubrix_bank_reports", JSON.stringify(history));
    } catch {
      /* ignore */
    }
    alert(
      `Bank Valuation Report\n\nProperty: ${address}\nFMV: ${formatPrice(result.fMV)}\nRange: ${formatPrice(result.range[0])} – ${formatPrice(result.range[1])}\nConfidence: ${result.confidence}%\nRisk Grade: ${getGrade(result.confidence)} (${gradeLabel[getGrade(result.confidence)]})\n\nReport saved to history.`,
    );
  };

  const grade = result ? getGrade(result.confidence) : "A";
  const gc = gradeColor[grade];

  // Risk flag: based on grade OR asking price vs FMV
  const getRiskFlag = () => {
    if (!result) return null;
    if (askingPrice && result.fMV > 0) {
      const asking = Number(askingPrice) * 100000;
      if (asking > result.fMV * 1.1) return "OVERPRICED RISK";
    }
    if (grade === "C") return "HIGH RISK";
    if (grade === "B") return "MODERATE RISK";
    return "SAFE";
  };

  const riskFlag = getRiskFlag();
  const riskFlagColor =
    riskFlag === "SAFE"
      ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
      : riskFlag === "MODERATE RISK"
        ? "text-yellow-400 bg-yellow-500/15 border-yellow-500/30"
        : "text-red-400 bg-red-500/15 border-red-500/30";

  const ltvTable = result
    ? [
        { pct: 60, amount: formatPrice(Math.round(result.fMV * 0.6)) },
        { pct: 75, amount: formatPrice(Math.round(result.fMV * 0.75)) },
        { pct: 80, amount: formatPrice(Math.round(result.fMV * 0.8)) },
      ]
    : [];

  // Confidence badge color
  const confColor =
    result && result.confidence >= 80
      ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
      : result && result.confidence >= 60
        ? "text-yellow-400 bg-yellow-500/15 border-yellow-500/30"
        : "text-red-400 bg-red-500/15 border-red-500/30";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1F] to-[#121B35]">
      <GlobalNav />
      <div className="pt-24 pb-16 px-4 max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => navigate({ to: "/bank" })}
          className="flex items-center gap-2 text-white/50 hover:text-white mb-6 text-sm transition-colors"
        >
          <ArrowLeft size={16} /> Back to Bank Portal
        </button>
        <h1 className="text-2xl font-bold text-white mb-6">
          Single Property Valuation
        </h1>

        {!result && !loading && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur space-y-4">
            <div>
              <label
                htmlFor="bv-address"
                className="text-white/70 text-sm mb-1 block"
              >
                Property Address *
              </label>
              <input
                id="bv-address"
                data-ocid="bank.valuation.address.input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full property address"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="bv-survey"
                  className="text-white/70 text-sm mb-1 block"
                >
                  Survey Number
                </label>
                <input
                  id="bv-survey"
                  value={survey}
                  onChange={(e) => setSurvey(e.target.value)}
                  placeholder="e.g. SY/123/2A"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>
              <div>
                <label
                  htmlFor="bv-regno"
                  className="text-white/70 text-sm mb-1 block"
                >
                  Registration Number
                </label>
                <input
                  id="bv-regno"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  placeholder="e.g. KAR-2023-004"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>
            </div>
            <div>
              <p className="text-white/70 text-sm mb-1">Location</p>
              <SmartLocationSearch
                onSelect={setLocation}
                placeholder="Search locality or city"
              />
            </div>
            {/* Market Asking Price (optional) */}
            <div>
              <label
                htmlFor="bv-asking"
                className="text-white/70 text-sm mb-1 block"
              >
                Market Asking Price in Lakhs{" "}
                <span className="text-white/40">
                  (optional — for Risk Flag)
                </span>
              </label>
              <input
                id="bv-asking"
                data-ocid="bank.valuation.asking_price.input"
                type="number"
                value={askingPrice}
                onChange={(e) => setAskingPrice(e.target.value)}
                placeholder="e.g. 150 for ₹1.50 Cr"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="bv-area"
                  className="text-white/70 text-sm mb-1 block"
                >
                  Built-up Area (sqft)
                </label>
                <input
                  id="bv-area"
                  data-ocid="bank.valuation.area.input"
                  type="number"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. 1200"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>
              <div>
                <label
                  htmlFor="bv-bhk"
                  className="text-white/70 text-sm mb-1 block"
                >
                  BHK
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((b) => (
                    <button
                      key={b}
                      type="button"
                      data-ocid={`bank.valuation.bhk.toggle.${b}`}
                      onClick={() => setBhk(b)}
                      className={`flex-1 py-3 rounded-xl text-xs font-medium border transition-all ${bhk === b ? "bg-[#D4AF37] text-black border-[#D4AF37]" : "bg-white/5 text-white/60 border-white/10 hover:border-white/20"}`}
                    >
                      {b}
                      {b === 4 ? "+" : ""}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label
                  htmlFor="bv-builder"
                  className="text-white/70 text-sm mb-1 block"
                >
                  Builder Name
                </label>
                <input
                  id="bv-builder"
                  data-ocid="bank.valuation.builder.input"
                  value={builder}
                  onChange={(e) => setBuilder(e.target.value)}
                  placeholder="e.g. Prestige"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>
            </div>
            <button
              type="button"
              data-ocid="bank.valuation.submit_button"
              onClick={handleRun}
              className="w-full py-3 bg-[#D4AF37] hover:bg-[#B8960C] text-black font-bold rounded-xl transition-all hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"
            >
              Run AI Valuation
            </button>
          </div>
        )}

        {loading && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 backdrop-blur text-center">
            <Loader2
              size={40}
              className="text-[#D4AF37] animate-spin mx-auto mb-4"
            />
            <p className="text-white font-semibold text-lg">
              Scanning property data…
            </p>
            <p className="text-white/40 text-sm mt-2">
              Running AI Valuation Engine
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-4" data-ocid="bank.valuation.results.panel">
            {/* Risk Flag Banner (NEW) */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center justify-between p-4 rounded-2xl border ${riskFlagColor}`}
              data-ocid="bank.valuation.risk_flag.panel"
            >
              <div className="flex items-center gap-3">
                <Shield size={20} />
                <div>
                  <p className="font-bold text-sm">{riskFlag}</p>
                  <p className="text-xs opacity-70">
                    {riskFlag === "SAFE"
                      ? "Property value aligns with market benchmarks"
                      : riskFlag === "MODERATE RISK"
                        ? "Some data uncertainty — verify with field inspection"
                        : "Asking price significantly exceeds AI fair value"}
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${confColor}`}
              >
                {result.confidence}% Confidence
              </span>
            </motion.div>

            {/* FMV Header */}
            <div className="grid grid-cols-3 gap-4">
              <div
                className={`bg-${gc}-400/10 border border-${gc}-400/30 rounded-2xl p-5 text-center col-span-3 sm:col-span-1`}
              >
                <p className="text-white/50 text-xs mb-1">Fair Market Value</p>
                <p className={`text-3xl font-bold font-mono text-${gc}-400`}>
                  {formatPrice(result.fMV)}
                </p>
                <p className="text-white/30 text-xs mt-1">
                  ₹{result.pricePerSqft.toLocaleString("en-IN")}/sqft
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                <p className="text-white/50 text-xs mb-1">Price Range</p>
                <p className="text-white font-bold text-sm">
                  {formatPrice(result.range[0])}
                </p>
                <p className="text-white/30 text-xs">to</p>
                <p className="text-white font-bold text-sm">
                  {formatPrice(result.range[1])}
                </p>
              </div>
              <div
                className={`bg-${gc}-400/10 border border-${gc}-400/30 rounded-2xl p-5 text-center`}
              >
                <p className="text-white/50 text-xs mb-1">Risk Grade</p>
                <p className={`text-3xl font-bold text-${gc}-400`}>{grade}</p>
                <p className={`text-${gc}-400/70 text-xs mt-1`}>
                  {gradeLabel[grade]}
                </p>
              </div>
            </div>

            {/* Score Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Tech Score",
                  value: result.scores.tech,
                  color: "#60a5fa",
                  notApplied: false,
                },
                {
                  label: "Amenity Score",
                  value: result.scores.amenity,
                  color: "#a78bfa",
                  notApplied: false,
                },
                {
                  label: "Builder Score",
                  value: result.scores.builder,
                  color:
                    result.builderScoreLabel === "Not Applied"
                      ? "#6b7280"
                      : "#D4AF37",
                  notApplied: result.builderScoreLabel === "Not Applied",
                },
                {
                  label: "Location Score",
                  value: result.scores.location,
                  color: "#34d399",
                  notApplied: false,
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white/5 border border-white/10 rounded-xl p-3 text-center"
                >
                  {s.notApplied ? (
                    <div className="text-sm font-semibold text-white/40 mt-1">
                      Not Applied
                    </div>
                  ) : (
                    <div
                      className="text-xl font-bold font-mono"
                      style={{ color: s.color }}
                    >
                      {s.value}
                    </div>
                  )}
                  <div className="text-white/40 text-[10px] mt-0.5">
                    {s.label}
                  </div>
                  {s.notApplied ? (
                    <div className="mt-1 text-[10px] text-white/25">
                      Not factored
                    </div>
                  ) : (
                    <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${s.value}%`,
                          backgroundColor: s.color,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Confidence */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-white/60 text-sm font-medium">
                  Confidence Score
                </span>
                <span
                  className={`font-bold font-mono text-xs px-2.5 py-1 rounded-full border ${confColor}`}
                >
                  {result.confidence}%
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#D4AF37]/60 to-[#D4AF37]"
                  style={{ width: `${result.confidence}%` }}
                />
              </div>
            </div>

            {/* Factor Breakdown */}
            <div className="bg-white/5 border border-[#D4AF37]/15 rounded-2xl p-5">
              <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-[#D4AF37]" /> Valuation
                Factor Breakdown
              </h3>
              <div className="space-y-3">
                {[
                  {
                    label: "Base Price/sqft",
                    value: `₹${result.breakdown.basePrice.toLocaleString("en-IN")}`,
                    bar: (result.breakdown.basePrice / 12000) * 100,
                  },
                  {
                    label: "Location Factor",
                    value: `×${result.breakdown.locationFactor.toFixed(3)}`,
                    bar: result.breakdown.locationFactor * 80,
                  },
                  {
                    label: "Builder Factor",
                    value: `×${result.breakdown.builderFactor.toFixed(2)}`,
                    bar: ((result.breakdown.builderFactor - 0.9) / 0.2) * 100,
                  },
                  {
                    label: "Demand Factor",
                    value: `×${result.breakdown.demandFactor.toFixed(3)}`,
                    bar: ((result.breakdown.demandFactor - 1) / 0.15) * 100,
                  },
                  {
                    label: "Livability Factor",
                    value: `×${result.breakdown.livabilityFactor.toFixed(3)}`,
                    bar: ((result.breakdown.livabilityFactor - 1) / 0.1) * 100,
                  },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <div className="w-36 text-white/50 text-xs shrink-0">
                      {row.label}
                    </div>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#D4AF37]/50 to-[#D4AF37] rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(0, row.bar))}%`,
                        }}
                      />
                    </div>
                    <div className="w-24 text-right text-[#D4AF37] text-xs font-mono shrink-0">
                      {row.value}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-white/30 text-xs">
                <div>
                  📍 Metro: {result.breakdown.metroName} (
                  {result.breakdown.metroDistance} km)
                </div>
                <div>🏢 {result.breakdown.nearestTechPark}</div>
                <div>
                  🏥 Amenities within 5km: {result.breakdown.amenitiesCount}
                </div>
                <div>Metro Factor: ×{result.breakdown.metroFactor}</div>
              </div>
            </div>

            {/* LTV Table */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield size={16} className="text-[#D4AF37]" />
                <h3 className="text-white font-semibold text-sm">
                  Loan-to-Value (LTV) Analysis
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 text-xs">
                    <th className="text-left pb-2">LTV Ratio</th>
                    <th className="text-left pb-2">Max Loan Amount</th>
                    <th className="text-left pb-2">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {ltvTable.map(({ pct, amount }) => (
                    <tr key={pct}>
                      <td className="py-2.5 text-white/80 font-mono">{pct}%</td>
                      <td className="py-2.5 text-[#D4AF37] font-bold font-mono">
                        {amount}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            pct <= 60
                              ? "bg-green-400/15 text-green-400"
                              : pct <= 75
                                ? "bg-yellow-400/15 text-yellow-400"
                                : "bg-orange-400/15 text-orange-400"
                          }`}
                        >
                          {pct <= 60
                            ? "Conservative"
                            : pct <= 75
                              ? "Standard"
                              : "Aggressive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-white/40 text-xs">
                  Risk Factors: High liquidity area · Stable price trend · Good
                  transaction density
                </p>
              </div>
            </div>

            {/* Comparable Sales */}
            {comps.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h3 className="text-white font-semibold text-sm mb-4">
                  Comparable Recent Transactions
                </h3>
                <div className="space-y-2">
                  {comps.slice(0, 5).map((c, i) => (
                    <div
                      key={c.id}
                      data-ocid={`bank.valuation.comparable.item.${i + 1}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-white/80 text-xs font-medium truncate">
                          {c.project}
                        </div>
                        <div className="text-white/30 text-xs mt-0.5">
                          {c.bhk}BHK · {c.area.toLocaleString()} sqft ·{" "}
                          {c.distance} · {c.saleDate}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[#D4AF37] font-bold text-sm font-mono">
                          {c.salePrice >= 10000000
                            ? `₹${(c.salePrice / 10000000).toFixed(2)}Cr`
                            : `₹${(c.salePrice / 100000).toFixed(1)}L`}
                        </div>
                        <div className="text-white/30 text-xs">
                          ₹{c.pricePerSqft.toLocaleString()}/sqft
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                data-ocid="bank.valuation.report.primary_button"
                onClick={handleReport}
                className="flex-1 py-3 bg-[#D4AF37] hover:bg-[#B8960C] text-black font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <Download size={16} /> Generate Report
              </button>
              <button
                type="button"
                data-ocid="bank.valuation.new.secondary_button"
                onClick={() => {
                  setResult(null);
                  setComps([]);
                  setAddress("");
                }}
                className="flex-1 py-3 bg-white/5 border border-white/10 text-white/70 rounded-xl"
              >
                New Valuation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
