import { Flame } from "lucide-react";
import React, { useMemo } from "react";
import { getDemandOutput } from "../../engines/demandEngine";
import type { ValuationOutput } from "../../engines/unifiedEngine";
import { ProCardSkeleton } from "./ProCardSkeleton";

interface Props {
  loading: boolean;
  locality: string;
  lat?: number;
  lng?: number;
  unifiedResult?: ValuationOutput;
}

type HeatLevel = "Cold" | "Warm" | "Hot" | "Very Hot";

function getHeatLevel(demandScore: number): {
  level: HeatLevel;
  flames: number;
  colorClass: string;
  barColor: string;
  description: string;
} {
  if (demandScore >= 75)
    return {
      level: "Very Hot",
      flames: 4,
      colorClass: "text-rose-400",
      barColor: "bg-rose-400",
      description: "Extremely high demand pressure",
    };
  if (demandScore >= 55)
    return {
      level: "Hot",
      flames: 3,
      colorClass: "text-orange-400",
      barColor: "bg-orange-400",
      description: "Strong buyer interest in this area",
    };
  if (demandScore >= 35)
    return {
      level: "Warm",
      flames: 2,
      colorClass: "text-amber-400",
      barColor: "bg-amber-400",
      description: "Moderate demand, stable market",
    };
  return {
    level: "Cold",
    flames: 1,
    colorClass: "text-sky-400",
    barColor: "bg-sky-400",
    description: "Low activity, buyer's market",
  };
}

const FLAME_KEYS = ["f0", "f1", "f2", "f3"] as const;

export function MarketHeatCard({
  loading,
  locality,
  lat = 12.9716,
  lng = 77.5946,
  unifiedResult,
}: Props) {
  const demand = useMemo(
    () => getDemandOutput(lat, lng, locality),
    [lat, lng, locality],
  );
  const heat = getHeatLevel(demand.demandScore);

  // Exponential growth data from unifiedResult (additive)
  const growthWeight = unifiedResult?.growthWeight;
  const trendSlope = unifiedResult?.trendSlope;

  if (loading) return <ProCardSkeleton height="168px" />;

  return (
    <div
      className="glass-card p-5 flex flex-col gap-3 min-h-[168px]"
      data-ocid="pro-market-heat-card"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "rgba(251,113,133,0.12)",
            border: "1px solid rgba(251,113,133,0.3)",
          }}
        >
          <Flame className={`w-5 h-5 ${heat.colorClass}`} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider gold-text">
            Market Heat Index
          </p>
          <p className="text-[11px] text-[#b9c6d8] mt-0.5">
            Current demand pressure in this micro-market
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`text-3xl font-bold font-['Playfair_Display'] ${heat.colorClass}`}
        >
          {heat.level}
        </span>
        <div className="flex gap-0.5 ml-1">
          {FLAME_KEYS.map((key, i) => (
            <Flame
              key={key}
              className={`w-4 h-4 ${i < heat.flames ? heat.colorClass : "text-white/15"}`}
              fill={i < heat.flames ? "currentColor" : "none"}
            />
          ))}
        </div>
      </div>

      <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${heat.barColor}`}
          style={{ width: `${demand.demandScore}%` }}
        />
      </div>

      <p className={`text-xs ${heat.colorClass}`}>{heat.description}</p>

      {/* Exponential growth factors from unifiedResult — additive */}
      {(growthWeight !== undefined || trendSlope !== undefined) && (
        <div className="space-y-1">
          {growthWeight !== undefined && (
            <div
              className="flex items-center justify-between px-2 py-1.5 rounded-lg"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                📊 Growth weight
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#D8B56A" }}>
                {growthWeight.toFixed(3)}×
              </span>
            </div>
          )}
          {trendSlope !== undefined && (
            <div
              className="flex items-center justify-between px-2 py-1.5 rounded-lg"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                📈 Trend slope
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: trendSlope >= 0 ? "#4ade80" : "#f87171",
                }}
              >
                {trendSlope >= 0 ? "+" : ""}
                {trendSlope.toFixed(1)}% / 6m
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
