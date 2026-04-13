import { ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import React, { useMemo, useState } from "react";
import type { ValuationOutput } from "../../engines/unifiedEngine";
import type { ValuationOutput as LegacyValuationOutput } from "../../engines/valuationEngine";
import { ProCardSkeleton } from "./ProCardSkeleton";

interface Props {
  loading: boolean;
  valuation?: LegacyValuationOutput;
  unifiedResult?: ValuationOutput;
}

type ConfidenceLabel = "High" | "Moderate" | "Low" | "Very Low";

const TIER_MAP: Record<string, { label: ConfidenceLabel; score: number }> = {
  High: { label: "High", score: 88 },
  Medium: { label: "Moderate", score: 68 },
  Low: { label: "Low", score: 45 },
  "Very Low": { label: "Very Low", score: 22 },
};

const TIER_STYLE: Record<
  ConfidenceLabel,
  {
    color: string;
    bar: string;
    iconBg: string;
    iconBorder: string;
    emoji: string;
  }
> = {
  High: {
    color: "text-emerald-400",
    bar: "bg-emerald-400",
    iconBg: "rgba(52,211,153,0.12)",
    iconBorder: "rgba(52,211,153,0.3)",
    emoji: "🟢",
  },
  Moderate: {
    color: "text-amber-400",
    bar: "bg-amber-400",
    iconBg: "rgba(251,191,36,0.12)",
    iconBorder: "rgba(251,191,36,0.3)",
    emoji: "🟡",
  },
  Low: {
    color: "text-sky-400",
    bar: "bg-sky-400",
    iconBg: "rgba(56,189,248,0.12)",
    iconBorder: "rgba(56,189,248,0.3)",
    emoji: "🔵",
  },
  "Very Low": {
    color: "text-rose-400",
    bar: "bg-rose-400",
    iconBg: "rgba(251,113,133,0.12)",
    iconBorder: "rgba(251,113,133,0.3)",
    emoji: "🔴",
  },
};

function getConfidenceData(
  valuation: LegacyValuationOutput | undefined,
  unifiedResult: ValuationOutput | undefined,
): {
  label: ConfidenceLabel;
  score: number;
  compCount: number;
} {
  const tier = valuation?.transparency.confidenceTier ?? "Low";
  const mapped = TIER_MAP[tier] ?? TIER_MAP.Low;
  const score = unifiedResult?.confidencePercent ?? mapped.score;
  const count =
    unifiedResult?.comparableCount ??
    ((valuation?.transparency.projectRecordCount ?? 0) ||
      (valuation?.transparency.builderRecordCount ?? 0) ||
      (valuation?.transparency.localityRecordCount ?? 0));
  return { label: mapped.label, score: Math.min(score, 95), compCount: count };
}

function getRecencyLabel(comparableCount: number): {
  label: string;
  good: boolean;
} {
  if (comparableCount >= 15)
    return { label: "Rich recent data (15+ records)", good: true };
  if (comparableCount >= 8)
    return { label: "Good recent data (8+ records)", good: true };
  if (comparableCount >= 3)
    return { label: "Limited recent data (3–7 records)", good: false };
  return { label: "Minimal recent data", good: false };
}

export function ConfidenceMeterCard({
  loading,
  valuation,
  unifiedResult,
}: Props) {
  const { label, score, compCount } = useMemo(
    () => getConfidenceData(valuation, unifiedResult),
    [valuation, unifiedResult],
  );
  const style = TIER_STYLE[label];
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);

  if (loading) return <ProCardSkeleton height="200px" />;

  const featureCompleteness = unifiedResult?.featureCompleteness;
  const builderMatch = !!(
    valuation?.transparency?.dataLevel === "Project" ||
    unifiedResult?.comparableCount
  );
  const recency = getRecencyLabel(compCount);
  const hasCompleteData =
    featureCompleteness !== undefined
      ? featureCompleteness >= 0.8
      : builderMatch;

  const reasons: Array<{ text: string; good: boolean }> = [
    {
      text:
        compCount > 0
          ? `${compCount} comparable propert${compCount === 1 ? "y" : "ies"} found`
          : "No comparable properties found",
      good: compCount >= 5,
    },
    { text: recency.label, good: recency.good },
    {
      text: builderMatch
        ? "Builder/project data matched"
        : "No builder/project match",
      good: builderMatch,
    },
    {
      text: hasCompleteData
        ? "Complete property data"
        : "Partial property data used",
      good: hasCompleteData,
    },
  ];

  const improvementTips: string[] = [];
  if (!builderMatch)
    improvementTips.push("Add builder name for better accuracy");
  if (compCount < 5)
    improvementTips.push("More transactions needed in this locality");
  if (!hasCompleteData)
    improvementTips.push("Fill in all property details for higher confidence");
  if (improvementTips.length === 0)
    improvementTips.push("Data quality is good — keep details up to date");

  return (
    <div
      className="glass-card p-5 flex flex-col gap-3"
      data-ocid="pro-confidence-meter-card"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: style.iconBg,
            border: `1px solid ${style.iconBorder}`,
          }}
        >
          <ShieldCheck className={`w-5 h-5 ${style.color}`} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider gold-text">
            Confidence Meter
          </p>
          <p className="text-[11px] text-[#b9c6d8] mt-0.5">
            Accuracy confidence of AI valuation
          </p>
        </div>
      </div>

      {/* Score + tier label with emoji */}
      <div className="flex items-end gap-2">
        <span
          className={`text-4xl font-bold font-['Playfair_Display'] ${style.color}`}
        >
          {score}%
        </span>
        <span
          className={`text-sm font-bold ${style.color} mb-1 flex items-center gap-1`}
        >
          <span>{style.emoji}</span>
          <span>{label} Confidence</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${style.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Reasons list */}
      <div className="space-y-1.5">
        {reasons.map((r) => (
          <div key={r.text} className="flex items-center gap-2">
            <div
              className="w-1 h-full self-stretch rounded-full flex-shrink-0"
              style={{
                minHeight: 16,
                background: r.good
                  ? "rgba(52,211,153,0.7)"
                  : "rgba(251,113,133,0.7)",
              }}
            />
            <span
              className="text-[11px]"
              style={{
                color: r.good
                  ? "rgba(52,211,153,0.85)"
                  : "rgba(251,113,133,0.8)",
              }}
            >
              {r.good ? "✓" : "⚠"} {r.text}
            </span>
          </div>
        ))}
      </div>

      {/* Expandable breakdown */}
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.07)",
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={() => setBreakdownOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2"
          style={{ cursor: "pointer", background: "none", border: "none" }}
          aria-expanded={breakdownOpen}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(216,181,106,0.7)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            Confidence Breakdown
          </span>
          {breakdownOpen ? (
            <ChevronUp size={11} style={{ color: "rgba(255,255,255,0.35)" }} />
          ) : (
            <ChevronDown
              size={11}
              style={{ color: "rgba(255,255,255,0.35)" }}
            />
          )}
        </button>
        {breakdownOpen && (
          <div className="px-3 pb-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                Comparable count: {compCount}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#60a5fa" }}>
                30% weight
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                Data recency:{" "}
                {compCount >= 8 ? "Good" : compCount >= 3 ? "Fair" : "Stale"}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#D8B56A" }}>
                25% weight
              </span>
            </div>
            {featureCompleteness !== undefined && (
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                  Feature completeness: {Math.round(featureCompleteness * 100)}%
                </span>
                <span
                  style={{ fontSize: 10, fontWeight: 700, color: "#4ade80" }}
                >
                  25% weight
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                Builder match: {builderMatch ? "Yes" : "No"}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa" }}>
                15% weight
              </span>
            </div>
          </div>
        )}
      </div>

      {/* "What improves this?" expandable tips */}
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          borderRadius: 10,
          border: "1px solid rgba(216,181,106,0.12)",
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={() => setTipsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2"
          style={{ cursor: "pointer", background: "none", border: "none" }}
          aria-expanded={tipsOpen}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(216,181,106,0.6)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            What improves this?
          </span>
          {tipsOpen ? (
            <ChevronUp size={11} style={{ color: "rgba(216,181,106,0.4)" }} />
          ) : (
            <ChevronDown size={11} style={{ color: "rgba(216,181,106,0.4)" }} />
          )}
        </button>
        {tipsOpen && (
          <div className="px-3 pb-3 space-y-1.5">
            {improvementTips.slice(0, 2).map((tip) => (
              <div key={tip} className="flex items-start gap-1.5">
                <span style={{ color: "#D8B56A", fontSize: 10, marginTop: 2 }}>
                  →
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>
                  {tip}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
