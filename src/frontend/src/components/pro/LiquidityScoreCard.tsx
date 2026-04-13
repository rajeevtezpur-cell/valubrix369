import { Droplets } from "lucide-react";
import React, { useMemo } from "react";
import { getDealScore } from "../../engines/dealEngine";
import { getDemandOutput } from "../../engines/demandEngine";
import type { ValuationOutput } from "../../engines/unifiedEngine";
import type { ValuationOutput as LegacyValuationOutput } from "../../engines/valuationEngine";
import { ProCardSkeleton } from "./ProCardSkeleton";

interface Props {
  loading: boolean;
  valuation?: LegacyValuationOutput;
  unifiedResult?: ValuationOutput;
  locality: string;
  lat?: number;
  lng?: number;
}

function computeLiquidityScore(
  valuation: LegacyValuationOutput | undefined,
  locality: string,
  lat: number,
  lng: number,
): number {
  const demand = getDemandOutput(lat, lng, locality);
  const demandContrib = demand.demandScore * 0.45;

  let dealContrib = 20;
  if (valuation?.deal) {
    dealContrib = Math.round((valuation.deal.score / 100) * 30);
  }

  const confidence = valuation?.confidence ?? 50;
  const confContrib = Math.round((confidence / 100) * 25);

  return Math.min(Math.round(demandContrib + dealContrib + confContrib), 100);
}

function getColor(score: number): { text: string; bar: string; label: string } {
  if (score >= 70)
    return {
      text: "text-emerald-400",
      bar: "bg-emerald-400",
      label: "High Liquidity",
    };
  if (score >= 40)
    return {
      text: "text-amber-400",
      bar: "bg-amber-400",
      label: "Moderate Liquidity",
    };
  return { text: "text-rose-400", bar: "bg-rose-400", label: "Low Liquidity" };
}

export function LiquidityScoreCard({
  loading,
  valuation,
  unifiedResult,
  locality,
  lat = 12.9716,
  lng = 77.5946,
}: Props) {
  // Always call hooks before any early return
  const score = useMemo(
    () => computeLiquidityScore(valuation, locality, lat, lng),
    [valuation, locality, lat, lng],
  );
  const { text, bar, label } = getColor(score);

  // Use unifiedResult for enhanced display if available
  const demandFactor = unifiedResult?.exponentialDemandEffect;

  if (loading) return <ProCardSkeleton height="168px" />;

  return (
    <div
      className="glass-card p-5 flex flex-col gap-3 min-h-[168px]"
      data-ocid="pro-liquidity-card"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "rgba(216,181,106,0.15)",
            border: "1px solid rgba(216,181,106,0.3)",
          }}
        >
          <Droplets className="w-5 h-5 gold-text" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider gold-text">
            Liquidity Score
          </p>
          <p className="text-[11px] text-[#b9c6d8] mt-0.5">
            How quickly this property can be sold
          </p>
        </div>
      </div>

      <div className={`text-4xl font-bold font-['Playfair_Display'] ${text}`}>
        {score}
        <span className="text-lg font-normal text-[#b9c6d8] ml-1">/100</span>
      </div>

      <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${bar}`}
          style={{ width: `${score}%` }}
        />
      </div>

      <p className={`text-xs font-semibold ${text}`}>{label}</p>

      {/* Demand factor from exponential model — additive */}
      {demandFactor !== undefined && (
        <div
          className="flex items-center justify-between px-2 py-1.5 rounded-lg"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
            📈 Demand factor
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#4ade80" }}>
            {demandFactor.toFixed(3)}×
          </span>
        </div>
      )}
    </div>
  );
}
