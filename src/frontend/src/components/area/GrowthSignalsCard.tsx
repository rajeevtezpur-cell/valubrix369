/**
 * GrowthSignalsCard.tsx — Growth signals and forecast for Location IQ
 * Shows 6M/3Y trend, upcoming infra projects, and classification tag.
 */

import { useMemo } from "react";
import { computePriceForecast } from "../../engines/priceForecastEngine";
import { getLocalityZone } from "../../utils/localityEngine";

const GOLD = "#D8B56A";

interface Props {
  locality: string;
  lat: number;
  lng: number;
  priceTrend1Y?: number;
  priceTrend3Y?: number;
  classification?: string;
  loading?: boolean;
}

function GrowthSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-40 rounded-lg bg-white/10" />
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-white/8" />
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 rounded-lg bg-white/8" />
        ))}
      </div>
    </div>
  );
}

// Zone-based infra projects — locality-specific
const ZONE_INFRA: Record<string, string[]> = {
  "north-inner": [
    "Nagawara Metro Station",
    "Hebbal Elevated Corridor",
    "ORR Signal-Free Corridor",
  ],
  "north-mid": [
    "Thanisandra Metro Extension",
    "Hennur Road Widening",
    "NH44 Access Road",
  ],
  "north-outer": [
    "Metro Phase 2B (Yelahanka)",
    "Peripheral Ring Road North",
    "Aerospace SEZ Road",
  ],
  "airport-corridor": [
    "Metro Phase 2B",
    "Peripheral Ring Road",
    "Devanahalli Industrial Corridor",
  ],
  northwest: [
    "Metro Green Line Extension",
    "BEL Road Widening",
    "NICE Road Connector",
  ],
  "east-core": [
    "Whitefield Metro Extension",
    "ITPL Road Widening",
    "Outer Ring Road Phase 3",
  ],
  "east-mid": [
    "ORR Signal-Free Corridor",
    "Sarjapur Metro Proposal",
    "Bellandur Lake Redevelopment",
  ],
  "east-outer": [
    "Panathur Road Widening",
    "Varthur Connector Road",
    "SEZ Access Improvements",
  ],
  "east-peripheral": [
    "Hoskote Industrial Access Road",
    "Budigere Road Upgrade",
    "NH 648 Widening",
  ],
  central: [
    "Metro Phase 3",
    "BBMP Road Widening Program",
    "Smart Signal Corridor",
  ],
  south: [
    "Namma Metro Yellow Line",
    "NICE Road Widening",
    "Electronic City Phase 3",
  ],
  unknown: [
    "Regional Road Infrastructure",
    "Suburban Train Proposals",
    "Smart City Upgrades",
  ],
};

function getInfraProjects(locality: string): string[] {
  const zone = getLocalityZone(locality);
  return ZONE_INFRA[zone] ?? ZONE_INFRA.unknown;
}

function getClassificationTag(classification: string): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  if (classification === "High Growth") {
    return {
      label: "🚀 Emerging growth corridor",
      color: "#10b981",
      bg: "rgba(16,185,129,0.1)",
      border: "rgba(16,185,129,0.25)",
    };
  }
  if (classification === "Emerging") {
    return {
      label: "📈 Rising market — early mover advantage",
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.1)",
      border: "rgba(245,158,11,0.25)",
    };
  }
  return {
    label: "📊 Stable market — steady appreciation",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.08)",
    border: "rgba(148,163,184,0.2)",
  };
}

export function GrowthSignalsCard({
  locality,
  priceTrend1Y,
  priceTrend3Y,
  classification,
  loading,
}: Props) {
  const forecast = useMemo(() => computePriceForecast(locality), [locality]);

  const trend1Y = priceTrend1Y ?? forecast.growthRates.oneYear;
  const trend3Y = priceTrend3Y ?? forecast.growthRates.threeYear;
  const trend6M = useMemo(() => {
    if (
      forecast.exponentialForecasts?.["6month"]?.baseGrowthPct !== undefined
    ) {
      return forecast.exponentialForecasts["6month"].baseGrowthPct;
    }
    return Math.round(trend1Y * 0.45 * 10) / 10;
  }, [forecast, trend1Y]);

  const classLabel =
    classification === "High Growth"
      ? "High Growth"
      : classification === "Emerging"
        ? "Emerging"
        : classification === "Saturated"
          ? "Saturated"
          : "Stable";
  const classTag = getClassificationTag(classLabel);
  const infraProjects = useMemo(() => getInfraProjects(locality), [locality]);

  // Bar chart data: relative heights for 6M / 1Y / 3Y base scenario
  const forecastBars = [
    { label: "6M", value: trend6M, color: "#60a5fa" },
    { label: "1Y", value: trend1Y, color: GOLD },
    { label: "3Y", value: trend3Y, color: "#10b981" },
  ];
  const maxBar = Math.max(...forecastBars.map((b) => Math.abs(b.value)), 1);

  if (loading) {
    return (
      <div className="rounded-2xl p-6 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50">
        <GrowthSkeleton />
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 md:p-6"
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(16,185,129,0.18)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.35)",
      }}
      data-ocid="area.growth_signals_card"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
          style={{
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.3)",
          }}
        >
          <span style={{ fontSize: 18 }}>📈</span>
        </div>
        <h2
          className="text-lg font-bold flex-1"
          style={{ fontFamily: "'Playfair Display', serif", color: GOLD }}
        >
          Growth Signals
        </h2>
      </div>

      {/* Trend stat chips */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "6M Trend", value: trend6M, suffix: "%" },
          { label: "1Y Trend", value: trend1Y, suffix: "%" },
          { label: "3Y Trend", value: trend3Y, suffix: "%" },
        ].map((stat) => {
          const isPos = stat.value >= 0;
          const color = isPos ? "#10b981" : "#ef4444";
          return (
            <div
              key={stat.label}
              className="rounded-xl p-3 text-center"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p className="text-white/40 text-[10px] mb-1 uppercase tracking-wide">
                {stat.label}
              </p>
              <p
                className="font-bold text-base"
                style={{ color, fontFamily: "'Playfair Display', serif" }}
              >
                {isPos ? "+" : ""}
                {stat.value.toFixed(1)}
                {stat.suffix}
              </p>
            </div>
          );
        })}
      </div>

      {/* Mini bar chart */}
      <div className="mb-5">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-3 font-semibold">
          Forecast Progression (Base Scenario)
        </p>
        <div className="flex items-end gap-3 h-20">
          {forecastBars.map((bar) => {
            const height = Math.max(
              10,
              Math.round((Math.abs(bar.value) / maxBar) * 64),
            );
            return (
              <div
                key={bar.label}
                className="flex flex-col items-center flex-1 gap-1"
              >
                <span
                  className="text-[10px] font-mono"
                  style={{ color: bar.color }}
                >
                  +{bar.value.toFixed(1)}%
                </span>
                <div
                  className="w-full rounded-t-lg transition-all duration-700"
                  style={{
                    height: `${height}px`,
                    backgroundColor: bar.color,
                    opacity: 0.8,
                  }}
                />
                <span className="text-[10px] text-white/50">{bar.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Infra */}
      <div className="mb-5">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-3 font-semibold">
          Upcoming Infrastructure
        </p>
        <div className="space-y-2">
          {infraProjects.map((proj) => (
            <div key={proj} className="flex items-center gap-2.5">
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: GOLD }}
              />
              <p className="text-white/70 text-sm">{proj}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Classification tag */}
      <div
        className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold"
        style={{
          color: classTag.color,
          background: classTag.bg,
          border: `1px solid ${classTag.border}`,
        }}
      >
        {classTag.label}
      </div>
    </div>
  );
}
