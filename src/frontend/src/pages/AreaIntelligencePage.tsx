/**
 * AreaIntelligencePage.tsx — Location IQ AI Research Report
 *
 * Receives: locality (string), city (string), propertyType? (string), lat/lng? (coords)
 * Layout: Single vertical scrolling page — 9 stacked premium glassmorphism sections.
 * Engines: areaIntelligenceEngine + priceForecastEngine + valuBrixScoreEngine + investmentIntelligenceEngine
 * NEVER uses valuationEngine — locality-only intelligence, no property inputs.
 */

import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Building,
  Building2,
  CheckCircle,
  ChevronRight,
  Heart,
  Landmark,
  MapPin,
  Navigation,
  School,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import AnalyzingOverlay from "../components/AnalyzingOverlay";
import GlobalMapComponent, {
  type DynamicPoiPin,
} from "../components/GlobalMapComponent";
import { ConnectivityScoreCard } from "../components/area/ConnectivityScoreCard";
import { EmploymentEngineCard } from "../components/area/EmploymentEngineCard";
import { FullGeoIntelligenceCard } from "../components/area/FullGeoIntelligenceCard";
import { GrowthSignalsCard } from "../components/area/GrowthSignalsCard";
import { LiveabilityScoreCard } from "../components/area/LiveabilityScoreCard";
import { getCoords } from "../data/localityCoords";
import {
  type AllPropertyTypeIntelligence,
  type PropertyTypeIntelligence,
  getAllPropertyTypeIntelligence,
  getAreaIntelligence,
  getPropertyTypeIntelligence,
} from "../engines/areaIntelligenceEngine";
import {
  type InfraItem,
  getTopBusStops,
  getTopHospitals,
  getTopMalls,
  getTopRailwayStations,
  getTopSchools,
  getTopTechParks,
} from "../engines/infraEngine";
import { computeInvestmentIntelligence } from "../engines/investmentIntelligenceEngine";
import { type MetroResult, getNearestMetros } from "../engines/metroEngine";
import { computePriceForecast } from "../engines/priceForecastEngine";
import { computeValuBrixScore } from "../engines/valuBrixScoreEngine";
import {
  getBaseMedianPSF,
  getBasePSF,
  getLocalityCoords,
  getLocalityZone,
} from "../utils/localityEngine";
import { getLocalityRentMetrics } from "../utils/rentEngine";

// ─── Gold token ───────────────────────────────────────────────────────────────
const GOLD = "#D8B56A";
const GOLD_DIM = "#B78F3B";
const NAVY = "#071A2F";

// ─── Glassmorphism card helper ────────────────────────────────────────────────
function GlassCard({
  children,
  className = "",
  accentColor,
  "data-ocid": ocid,
}: {
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
  "data-ocid"?: string;
}) {
  return (
    <div
      data-ocid={ocid}
      className={`rounded-2xl p-5 md:p-6 ${className}`}
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
        border: `1px solid ${accentColor ? `${accentColor}30` : "rgba(255,255,255,0.08)"}`,
        boxShadow: "0 4px 32px rgba(0,0,0,0.35)",
      }}
    >
      {children}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({
  icon,
  title,
  badge,
  trendDir,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  trendDir?: "up" | "down" | "stable";
}) {
  const trendEl =
    trendDir === "up" ? (
      <span className="text-emerald-400 flex items-center gap-0.5 text-sm font-semibold">
        <TrendingUp size={15} /> Rising
      </span>
    ) : trendDir === "down" ? (
      <span className="text-red-400 flex items-center gap-0.5 text-sm font-semibold">
        <TrendingDown size={15} /> Falling
      </span>
    ) : trendDir === "stable" ? (
      <span className="text-amber-400 flex items-center gap-0.5 text-sm font-semibold">
        → Stable
      </span>
    ) : null;

  return (
    <div className="flex items-center gap-3 mb-5">
      <div
        className="flex items-center justify-center w-9 h-9 rounded-xl"
        style={{
          background: "rgba(216,181,106,0.12)",
          border: `1px solid ${GOLD}30`,
        }}
      >
        <span style={{ color: GOLD }}>{icon}</span>
      </div>
      <h2
        className="text-lg md:text-xl font-bold text-white flex-1"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {title}
      </h2>
      {badge && (
        <span
          className="text-xs px-2.5 py-1 rounded-full font-semibold"
          style={{
            background: "rgba(216,181,106,0.12)",
            color: GOLD,
            border: `1px solid ${GOLD}35`,
          }}
        >
          {badge}
        </span>
      )}
      {trendEl}
    </div>
  );
}

// ─── Mini bar chart (PSF forecast bars) ──────────────────────────────────────
function ForecastBarChart({
  current,
  y1,
  y3,
  y5,
}: {
  current: number;
  y1: number;
  y3: number;
  y5: number;
}) {
  const max = Math.max(current, y1, y3, y5) * 1.05;
  const bars = [
    { label: "Now", value: current, color: "#6b7280" },
    { label: "1Y", value: y1, color: "#60a5fa" },
    { label: "3Y", value: y3, color: GOLD },
    { label: "5Y", value: y5, color: "#10b981" },
  ];
  return (
    <div className="flex items-end gap-2 h-28 mt-3">
      {bars.map((b) => (
        <div key={b.label} className="flex flex-col items-center flex-1 gap-1">
          <span className="text-[10px] text-white/50 font-mono">
            ₹{Math.round(b.value / 1000)}k
          </span>
          <div
            className="w-full rounded-t-lg transition-all duration-700"
            style={{
              height: `${Math.round((b.value / max) * 80)}px`,
              backgroundColor: b.color,
              opacity: 0.85,
            }}
          />
          <span className="text-[10px] font-medium" style={{ color: b.color }}>
            {b.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Progress bar with label ──────────────────────────────────────────────────
function MetricBar({
  label,
  value,
  max = 100,
  color = GOLD,
  suffix = "",
}: {
  label: string;
  value: number;
  max?: number;
  color?: string;
  suffix?: string;
}) {
  const pct = Math.round(Math.min((value / max) * 100, 100));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-white/60">{label}</span>
        <span className="font-semibold" style={{ color }}>
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Yield color helper ───────────────────────────────────────────────────────
function yieldColor(y: number): string {
  if (y >= 4) return "#10b981";
  if (y >= 2) return "#f59e0b";
  return "#ef4444";
}

// ─── Heat color (0-100 scale, blue→yellow→red) ────────────────────────────────
function heatColor(score: number): string {
  if (score >= 75) return "#ef4444";
  if (score >= 60) return "#f97316";
  if (score >= 45) return "#f59e0b";
  if (score >= 30) return "#60a5fa";
  return "#6b7280";
}

// ─── ValuBrix Score circular gauge (SVG conic) ────────────────────────────────
function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const r = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score / 100, 1);
  const stroke = pct * circ;
  const tierColor =
    score >= 75
      ? "#10b981"
      : score >= 55
        ? GOLD
        : score >= 35
          ? "#f59e0b"
          : "#ef4444";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto"
    >
      <title>ValuBrix score gauge</title>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="10"
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={tierColor}
        strokeWidth="10"
        strokeDasharray={`${stroke} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 1.2s ease" }}
      />
      <text
        x={cx}
        y={cy + 7}
        textAnchor="middle"
        fill={tierColor}
        fontSize={size < 100 ? "22" : "28"}
        fontWeight="700"
        fontFamily="monospace"
      >
        {score}
      </text>
    </svg>
  );
}

// ─── Distance pill ────────────────────────────────────────────────────────────
function DistancePill({
  icon,
  label,
  distance,
  score,
}: {
  icon: React.ReactNode;
  label: string;
  distance: number | null;
  score: number;
}) {
  const connColor =
    score >= 70 ? "#10b981" : score >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <div
      className="flex items-center gap-3 rounded-xl p-3"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
        style={{ background: "rgba(216,181,106,0.1)" }}
      >
        <span style={{ color: GOLD }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white/80 text-sm font-medium truncate">{label}</p>
        <p className="text-white/40 text-xs">
          {distance !== null
            ? `${distance.toFixed(1)} km away`
            : "Distance unavailable"}
        </p>
      </div>
      <div
        className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
        style={{
          color: connColor,
          background: `${connColor}18`,
          border: `1px solid ${connColor}30`,
        }}
      >
        {score}
      </div>
    </div>
  );
}

// ─── Rate breakdown row ───────────────────────────────────────────────────────
interface RateRow {
  type: string;
  priceRange: string;
  avgRent: string;
  yield: number;
}

function RateBreakdownTable({ rows }: { rows: RateRow[] }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm min-w-[420px]">
        <thead>
          <tr>
            {["Property Type", "Price Range", "Avg Rent/mo", "Yield"].map(
              (h) => (
                <th
                  key={h}
                  className="text-left py-2 px-2 text-white/40 text-xs font-semibold uppercase tracking-wide border-b border-white/8"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.type}
              className="border-b border-white/5 hover:bg-white/3 transition-colors"
            >
              <td className="py-3 px-2 text-white/80 font-medium">
                {row.type}
              </td>
              <td className="py-3 px-2 text-white/60">{row.priceRange}</td>
              <td className="py-3 px-2 text-white/60">{row.avgRent}</td>
              <td className="py-3 px-2">
                <span
                  className="font-bold text-sm"
                  style={{ color: yieldColor(row.yield) }}
                >
                  {row.yield.toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Amenity list item ────────────────────────────────────────────────────────
function AmenityItem({
  name,
  distance,
  mins,
}: {
  name: string;
  distance: number | null;
  mins?: number | null;
}) {
  const distLabel =
    distance !== null
      ? mins != null
        ? `${distance.toFixed(1)} km • ${mins} mins`
        : `${distance.toFixed(1)} km`
      : "Distance unavailable";
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-white/70 text-sm">{name}</span>
      <span
        className="text-xs px-2 py-0.5 rounded-full ml-2 shrink-0"
        style={{
          background:
            distance !== null
              ? "rgba(216,181,106,0.1)"
              : "rgba(255,255,255,0.05)",
          color: distance !== null ? GOLD : "rgba(255,255,255,0.3)",
        }}
      >
        {distLabel}
      </span>
    </div>
  );
}

// ─── Risk badge ───────────────────────────────────────────────────────────────
function RiskBadge({ level }: { level: "Low" | "Medium" | "High" }) {
  const cfg = {
    Low: {
      bg: "bg-emerald-500/15",
      border: "border-emerald-500/30",
      color: "text-emerald-400",
    },
    Medium: {
      bg: "bg-amber-500/15",
      border: "border-amber-500/30",
      color: "text-amber-400",
    },
    High: {
      bg: "bg-red-500/15",
      border: "border-red-500/30",
      color: "text-red-400",
    },
  };
  const c = cfg[level];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${c.bg} ${c.border} ${c.color}`}
    >
      <AlertTriangle size={11} />
      {level} Risk
    </span>
  );
}

// ─── Connectivity score helper ────────────────────────────────────────────────
function computeConnScore(distKm: number, maxKm: number): number {
  return Math.round(Math.max(0, Math.min(100, (1 - distKm / maxKm) * 100)));
}

// ─── Rate breakdown derivation ────────────────────────────────────────────────
function deriveRateBreakdown(
  psf: number,
  rentMetrics: ReturnType<typeof getLocalityRentMetrics>,
): RateRow[] {
  // Typical size ranges per type (sqft)
  const sizes: Record<string, { min: number; max: number; bhk?: number }> = {
    "1 RK / Studio": { min: 350, max: 550 },
    "1 BHK": { min: 550, max: 750, bhk: 1 },
    "2 BHK": { min: 900, max: 1200, bhk: 2 },
    "3 BHK": { min: 1300, max: 1700, bhk: 3 },
    Villa: { min: 2200, max: 3500 },
    Plot: { min: 1200, max: 2400 },
    Commercial: { min: 600, max: 1200 },
  };

  const plotDiscount = 0.65; // plots trade at PSF discount
  const villaMultiplier = 1.15; // villas at premium
  const commercialMultiplier = 1.3;

  return Object.entries(sizes).map(([type, sz]) => {
    let basePSF = psf;
    if (type === "Plot") basePSF = psf * plotDiscount;
    else if (type === "Villa") basePSF = psf * villaMultiplier;
    else if (type === "Commercial") basePSF = psf * commercialMultiplier;

    const priceMin = Math.round((basePSF * sz.min) / 100000) * 100000;
    const priceMax = Math.round((basePSF * sz.max) / 100000) * 100000;
    const fmtPrice = (v: number) =>
      v >= 10000000
        ? `₹${(v / 10000000).toFixed(1)}Cr`
        : `₹${(v / 100000).toFixed(0)}L`;

    // Rent: use known BHK data if available, else infer from rent/sqft
    let monthlyRent = 0;
    if (sz.bhk && rentMetrics.avgRentByBhk[sz.bhk]) {
      monthlyRent = rentMetrics.avgRentByBhk[sz.bhk];
    } else if (rentMetrics.rentPerSqft > 0) {
      monthlyRent = Math.round(
        rentMetrics.rentPerSqft * ((sz.min + sz.max) / 2),
      );
    } else {
      // cold-start: yield-from-PSF
      const yieldPrior =
        basePSF > 12000
          ? 0.028
          : basePSF >= 8000
            ? 0.032
            : basePSF >= 5000
              ? 0.036
              : 0.038;
      monthlyRent = Math.round(
        (basePSF * ((sz.min + sz.max) / 2) * yieldPrior) / 12,
      );
    }

    // Plots and commercial have different yield logic
    if (type === "Plot") monthlyRent = 0;
    if (type === "Commercial") monthlyRent = Math.round(monthlyRent * 1.5);

    const midPrice = basePSF * ((sz.min + sz.max) / 2);
    const annualRent = monthlyRent * 12;
    const grossYield =
      midPrice > 0 && annualRent > 0 ? (annualRent / midPrice) * 100 : 0;

    const fmtRent =
      type === "Plot" ? "N/A" : `₹${monthlyRent.toLocaleString("en-IN")}/mo`;

    return {
      type,
      priceRange: `${fmtPrice(priceMin)} – ${fmtPrice(priceMax)}`,
      avgRent: fmtRent,
      yield: Number(grossYield.toFixed(1)),
    };
  });
}

// ─── Property Intelligence: Primary + Comparison section ──────────────────────

type IntelType = "apartment" | "villa" | "plot";

function TrendArrow({ pct }: { pct: number }) {
  if (pct > 0)
    return (
      <span className="flex items-center gap-0.5 text-emerald-400 text-xs font-semibold">
        <TrendingUp size={12} />+{pct.toFixed(1)}%
      </span>
    );
  if (pct < 0)
    return (
      <span className="flex items-center gap-0.5 text-red-400 text-xs font-semibold">
        <TrendingDown size={12} />
        {pct.toFixed(1)}%
      </span>
    );
  return <span className="text-white/40 text-xs font-semibold">→ Stable</span>;
}

function DemandBadge({ score }: { score: number }) {
  const level = score >= 70 ? "High" : score >= 45 ? "Medium" : "Low";
  const cfg = {
    High: {
      bg: "rgba(16,185,129,0.12)",
      border: "rgba(16,185,129,0.3)",
      color: "#10b981",
    },
    Medium: {
      bg: "rgba(245,158,11,0.12)",
      border: "rgba(245,158,11,0.3)",
      color: "#f59e0b",
    },
    Low: {
      bg: "rgba(239,68,68,0.12)",
      border: "rgba(239,68,68,0.3)",
      color: "#ef4444",
    },
  }[level];
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
      }}
    >
      {level} Demand
    </span>
  );
}

const TYPE_CONFIG: Record<
  IntelType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  apartment: {
    label: "Apartment",
    icon: <Building2 size={15} />,
    color: "#60a5fa",
  },
  villa: { label: "Villa", icon: <Building size={15} />, color: GOLD },
  plot: { label: "Plot", icon: <Landmark size={15} />, color: "#a78bfa" },
};

function PrimaryTypeCard({
  type,
  intel,
  demandScore,
  growthScore,
  priceTrend1Y,
}: {
  type: IntelType;
  intel: PropertyTypeIntelligence;
  demandScore: number;
  growthScore: number;
  priceTrend1Y: number;
}) {
  const cfg = TYPE_CONFIG[type];
  const noData = intel.avgPSF === null;

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4 h-full"
      data-ocid={`area_intel.primary_card.${type}`}
      style={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(16px)",
        border: `1px solid ${cfg.color}30`,
        borderLeft: `3px solid ${cfg.color}`,
        boxShadow: `0 4px 32px rgba(0,0,0,0.3), inset 0 1px 0 ${cfg.color}15`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color: cfg.color }}>{cfg.icon}</span>
          <span className="text-white/80 font-semibold text-sm">
            {cfg.label}
          </span>
        </div>
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
          style={{
            background: `${GOLD}15`,
            border: `1px solid ${GOLD}35`,
            color: GOLD,
          }}
        >
          <Sparkles size={9} /> PRIMARY
        </span>
      </div>

      {noData ? (
        <div
          className="flex-1 flex items-center justify-center rounded-xl py-6"
          style={{
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.15)",
          }}
        >
          <div className="text-center">
            <AlertTriangle size={20} className="text-amber-400 mx-auto mb-2" />
            <p className="text-amber-300/70 text-sm font-medium">
              Data unavailable
            </p>
            <p className="text-white/30 text-xs mt-1">
              No {type} transactions for this locality
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Base Market PSF — hero metric */}
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1">
              Base Market PSF
              <span
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] cursor-help flex-shrink-0"
                style={{
                  background: "rgba(216,181,106,0.2)",
                  color: "rgba(216,181,106,0.8)",
                }}
                title="PSF = Price per square foot. This is the price per square foot of built-up area."
              >
                ℹ
              </span>
            </p>
            <p
              className="text-3xl font-bold"
              style={{
                color: cfg.color,
                fontFamily: "'Playfair Display', serif",
              }}
            >
              ₹{(intel.avgPSF ?? 0).toLocaleString("en-IN")}
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-xl p-3"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p className="text-white/40 text-[10px] uppercase tracking-wide mb-1">
                Monthly Rent
              </p>
              <p className="text-white font-semibold text-sm">
                {type === "plot"
                  ? "N/A"
                  : intel.avgRent !== null
                    ? `₹${intel.avgRent.toLocaleString("en-IN")}`
                    : "Data unavailable"}
              </p>
            </div>
            <div
              className="rounded-xl p-3"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p className="text-white/40 text-[10px] uppercase tracking-wide mb-1">
                Rental Yield
              </p>
              <p
                className="font-semibold text-sm"
                style={{
                  color:
                    type === "plot"
                      ? "rgba(255,255,255,0.4)"
                      : intel.yield !== null
                        ? yieldColor(intel.yield)
                        : "rgba(255,255,255,0.3)",
                }}
              >
                {type === "plot"
                  ? "Appreciation"
                  : intel.yield !== null
                    ? `${intel.yield}%`
                    : "N/A"}
              </p>
            </div>
          </div>

          {/* Trend + badges row */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span className="text-white/40 text-[10px]">6M Trend</span>
              <TrendArrow pct={priceTrend1Y / 2} />
            </div>
            <DemandBadge score={demandScore} />
          </div>

          {/* Growth potential */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/40">Growth Potential (12M)</span>
              <span style={{ color: GOLD }} className="font-semibold">
                +{growthScore.toFixed(0)}%
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(growthScore, 100)}%`,
                  backgroundColor: GOLD,
                }}
              />
            </div>
          </div>

          {/* Liquidity */}
          <div className="flex items-center justify-between">
            <span className="text-white/40 text-xs">Liquidity Score</span>
            <span className="text-white/80 text-sm font-semibold">
              {Math.round(demandScore / 10)}/10
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function ComparisonCard({
  type,
  intel,
  primaryPSF,
  priceTrend1Y,
}: {
  type: IntelType;
  intel: PropertyTypeIntelligence;
  primaryPSF: number | null;
  priceTrend1Y: number;
}) {
  const cfg = TYPE_CONFIG[type];
  const noData = intel.avgPSF === null;

  // Compare vs primary
  const compareBadge = () => {
    if (primaryPSF === null || intel.avgPSF === null) return null;
    const diff = ((intel.avgPSF - primaryPSF) / primaryPSF) * 100;
    if (Math.abs(diff) < 5) {
      return (
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{
            background: "rgba(245,158,11,0.12)",
            color: "#f59e0b",
            border: "1px solid rgba(245,158,11,0.25)",
          }}
        >
          Similar
        </span>
      );
    }
    if (diff > 0) {
      return (
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{
            background: "rgba(239,68,68,0.1)",
            color: "#f87171",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          Higher
        </span>
      );
    }
    return (
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
        style={{
          background: "rgba(16,185,129,0.1)",
          color: "#34d399",
          border: "1px solid rgba(16,185,129,0.2)",
        }}
      >
        Lower
      </span>
    );
  };

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${cfg.color}18`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span style={{ color: cfg.color, opacity: 0.8 }}>{cfg.icon}</span>
          <span className="text-white/60 text-xs font-semibold">
            {cfg.label}
          </span>
        </div>
        {compareBadge()}
      </div>

      {noData ? (
        <p className="text-white/25 text-xs italic">Data unavailable</p>
      ) : (
        <>
          <p className="font-bold text-sm" style={{ color: cfg.color }}>
            ₹{(intel.avgPSF ?? 0).toLocaleString("en-IN")}/sqft
          </p>
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            <span>
              Yield:{" "}
              <span
                style={{
                  color:
                    type === "plot"
                      ? "rgba(255,255,255,0.4)"
                      : intel.yield !== null
                        ? yieldColor(intel.yield)
                        : "rgba(255,255,255,0.3)",
                }}
              >
                {type === "plot"
                  ? "Land"
                  : intel.yield !== null
                    ? `${intel.yield}%`
                    : "N/A"}
              </span>
            </span>
            <span className="opacity-30">·</span>
            <TrendArrow pct={priceTrend1Y / 2} />
          </div>
        </>
      )}
    </div>
  );
}

function PropertyIntelligenceSection({
  locality,
  selectedType,
  allTypeIntel,
  singleTypeIntel,
}: {
  locality: string;
  selectedType: "apartment" | "villa" | "plot" | null;
  allTypeIntel: AllPropertyTypeIntelligence;
  singleTypeIntel: PropertyTypeIntelligence | null;
}) {
  const psf = useMemo(() => getBaseMedianPSF(locality), [locality]);
  // Derive approximate scores for primary card display
  const growthScore = Math.round(Math.min(18, psf / 1000) * 5.5);
  const demandScore = Math.round(Math.min(100, psf / 150));

  // priceTrend1Y approximation from PSF tier
  const priceTrend1Y =
    psf > 12000 ? 11.5 : psf > 8000 ? 9.5 : psf > 5000 ? 8.0 : 6.5;

  const ALL_TYPES: IntelType[] = ["apartment", "villa", "plot"];

  // Case 1: No type selected — show 3-equal-column grid
  if (!selectedType) {
    return (
      <GlassCard
        data-ocid="area_intel.property_intelligence.section"
        accentColor={GOLD}
      >
        <SectionHeader
          icon={<Building size={18} />}
          title="Property Intelligence"
        />
        <p className="text-white/40 text-sm mb-4">
          See how <span className="text-white/70 font-medium">{locality}</span>{" "}
          compares across property types
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ALL_TYPES.map((t) => (
            <PrimaryTypeCard
              key={t}
              type={t}
              intel={allTypeIntel[t]}
              demandScore={demandScore}
              growthScore={growthScore}
              priceTrend1Y={priceTrend1Y}
            />
          ))}
        </div>
      </GlassCard>
    );
  }

  // Case 2: Type selected — primary (65%) + comparison strip (35%)
  const primaryType = selectedType as IntelType;
  const comparisonTypes = ALL_TYPES.filter((t) => t !== primaryType);
  const primaryIntel = singleTypeIntel ?? allTypeIntel[primaryType];

  return (
    <GlassCard
      data-ocid="area_intel.property_intelligence.section"
      accentColor={GOLD}
    >
      <SectionHeader
        icon={<Building size={18} />}
        title="Property Intelligence"
        badge={`${primaryType.charAt(0).toUpperCase() + primaryType.slice(1)} Focus`}
      />
      <p className="text-white/40 text-sm mb-4">
        See how <span className="text-white/70 font-medium">{locality}</span>{" "}
        compares across property types
      </p>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Primary card — 65% */}
        <div className="md:w-[65%]">
          <PrimaryTypeCard
            type={primaryType}
            intel={primaryIntel}
            demandScore={demandScore}
            growthScore={growthScore}
            priceTrend1Y={priceTrend1Y}
          />
        </div>

        {/* Comparison strip — 35% */}
        <div
          className="md:w-[35%] flex flex-col gap-3"
          data-ocid="area_intel.comparison_strip"
        >
          <p className="text-white/30 text-[10px] uppercase tracking-widest">
            Comparison
          </p>
          {comparisonTypes.map((t, i) => (
            <div key={t}>
              <ComparisonCard
                type={t}
                intel={allTypeIntel[t]}
                primaryPSF={primaryIntel.avgPSF}
                priceTrend1Y={priceTrend1Y}
              />
              {i < comparisonTypes.length - 1 && (
                <div
                  className="my-2 h-px"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                />
              )}
            </div>
          ))}
          <button
            type="button"
            className="mt-auto text-xs flex items-center gap-1 transition-colors"
            style={{ color: `${GOLD}80` }}
            onClick={() => {
              // scroll to existing property type overview section
              document
                .querySelector(
                  "[data-ocid='area_intel.property_type_overview.section']",
                )
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            data-ocid="area_intel.comparison_strip.compare_detail_link"
          >
            <ArrowUpRight size={12} />
            Compare in detail ↓
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function AreaIntelligencePage() {
  const navigate = useNavigate();

  // Support both URL params and search-string params
  // Route: /area/intelligence?locality=Whitefield&city=Bangalore&propertyType=apartment
  const searchParams = useSearch({ strict: false }) as {
    locality?: string;
    city?: string;
    propertyType?: string;
    lat?: string;
    lng?: string;
  };

  const locality = searchParams.locality || "Whitefield";
  const city = searchParams.city || "Bangalore";
  const propertyType = searchParams.propertyType;
  const lat = searchParams.lat ? Number(searchParams.lat) : undefined;
  const lng = searchParams.lng ? Number(searchParams.lng) : undefined;

  // ── Task 2: Type filter — only 3 supported types (no commercial)
  const [activeTypeFilter, setActiveTypeFilter] = useState<
    "apartment" | "villa" | "plot" | null
  >(null);

  // Effective type = URL param > active filter button > null (blended)
  // Normalize URL property type to only allowed 3 types
  const normalizedPropertyType =
    propertyType === "apartment" ||
    propertyType === "villa" ||
    propertyType === "plot"
      ? propertyType
      : null;
  const effectiveType = normalizedPropertyType ?? activeTypeFilter;

  // ── Compute all intelligence (memoized) ─────────────────────────────────────
  const psf = useMemo(() => getBaseMedianPSF(locality), [locality]);
  const zone = useMemo(() => getLocalityZone(locality), [locality]);

  // Task 2: All-type intelligence (for overview cards when no type selected)
  const allTypeIntel = useMemo<AllPropertyTypeIntelligence>(
    () => getAllPropertyTypeIntelligence(locality),
    [locality],
  );

  // Task 2: Single-type intelligence when a filter is active
  const singleTypeIntel = useMemo<PropertyTypeIntelligence | null>(() => {
    if (!effectiveType) return null;
    return getPropertyTypeIntelligence(locality, effectiveType);
  }, [locality, effectiveType]);

  const areaIntel = useMemo(() => {
    // Priority: URL lat/lng → localityCoords data lookup → getLocalityCoords → zone-based fallback
    const lookupCoords = getCoords(locality) ?? getLocalityCoords(locality);
    const coordLat =
      lat ??
      lookupCoords?.lat ??
      (zone === "east-core"
        ? 12.9698
        : zone === "north-inner"
          ? 13.0358
          : 12.97);
    const coordLng =
      lng ??
      lookupCoords?.lng ??
      (zone === "east-core"
        ? 77.7499
        : zone === "north-inner"
          ? 77.597
          : 77.64);
    // R2: pass normalizedPropertyType so engine can return blended mode when not selected
    return getAreaIntelligence(
      locality,
      coordLat,
      coordLng,
      normalizedPropertyType ?? undefined,
    );
  }, [locality, lat, lng, zone, normalizedPropertyType]);

  const priceForecast = useMemo(
    () => computePriceForecast(locality, normalizedPropertyType ?? undefined),
    [locality, normalizedPropertyType],
  );
  const valuBrixScore = useMemo(
    () => computeValuBrixScore(locality, normalizedPropertyType ?? undefined),
    [locality, normalizedPropertyType],
  );
  const investmentIntel = useMemo(
    () =>
      computeInvestmentIntelligence(
        locality,
        normalizedPropertyType ?? "apartment",
        1000,
      ),
    [locality, normalizedPropertyType],
  );
  const rentMetrics = useMemo(
    () => getLocalityRentMetrics(locality),
    [locality],
  );

  const rateBreakdown = useMemo(
    () => deriveRateBreakdown(psf, rentMetrics),
    [psf, rentMetrics],
  );

  // ── Distance data ────────────────────────────────────────────────────────────
  // These are deprecated stubs from the engine — areaIntel.nearestMetros[] is empty (async populated below)
  // Do NOT use areaIntel.nearestMetros, topTechParks, topHospitals, topSchools — they are always []

  // ── Resolve base property coordinates
  // CRITICAL: coordLat/coordLng MUST be null when no real coords found.
  // Do NOT fall back to Bangalore center — that causes OSRM to run from the wrong point.
  const localityCoords = useMemo(() => {
    // Try multiple lookup strategies for case-insensitive resolution
    const lookupCoords =
      getCoords(locality) ??
      getCoords(locality.toLowerCase()) ??
      getCoords(locality.toLowerCase().trim()) ??
      getLocalityCoords(locality) ??
      getLocalityCoords(locality.toLowerCase().trim());

    let coordLat: number | null = null;
    let coordLng: number | null = null;
    let resolvedFrom = "notFound";

    if (
      lat !== undefined &&
      lng !== undefined &&
      !Number.isNaN(lat) &&
      !Number.isNaN(lng) &&
      lat !== 0 &&
      lng !== 0
    ) {
      coordLat = lat;
      coordLng = lng;
      resolvedFrom = "urlParams";
    } else if (lookupCoords?.lat && lookupCoords?.lng) {
      coordLat = lookupCoords.lat;
      coordLng = lookupCoords.lng;
      resolvedFrom = "getCoords";
    }

    console.log(
      `[Area Intelligence] Resolved coords for ${locality}: ${coordLat}, ${coordLng} (from: ${resolvedFrom})`,
    );

    // mapDisplayLat/mapDisplayLng used ONLY for map center rendering (not OSRM)
    // OSRM uses srcLat/srcLng which are null-guarded separately
    const mapDisplayLat = coordLat ?? 12.9716;
    const mapDisplayLng = coordLng ?? 77.5946;

    return {
      // OSRM-safe: null when no real coords — srcLat/srcLng must check hasRealCoords
      coordLat,
      coordLng,
      // Map display only (never passed to OSRM):
      mapDisplayLat,
      mapDisplayLng,
      hasRealCoords: coordLat !== null,
    };
  }, [lat, lng, locality]);

  // ── Location source hook (property vs current GPS location) ──────────────────
  // Pass null when coords unknown — prevents useLocationSource from falling to wrong default
  const propertyCoords = useMemo(
    () =>
      localityCoords.hasRealCoords &&
      localityCoords.coordLat !== null &&
      localityCoords.coordLng !== null
        ? { lat: localityCoords.coordLat, lng: localityCoords.coordLng }
        : null,
    [
      localityCoords.hasRealCoords,
      localityCoords.coordLat,
      localityCoords.coordLng,
    ],
  );

  // Source coordinates for OSRM — null when no real coords available.
  // Always use property coords (current location feature removed)
  const srcLat = useMemo((): number | null => {
    if (propertyCoords?.lat) return propertyCoords.lat;
    return null;
  }, [propertyCoords]);

  const srcLng = useMemo((): number | null => {
    if (propertyCoords?.lng) return propertyCoords.lng;
    return null;
  }, [propertyCoords]);

  // ── OSRM-fetched POI state ────────────────────────────────────────────────────
  const [osrmMetros, setOsrmMetros] = useState<MetroResult[]>([]);
  const [osrmTechParks, setOsrmTechParks] = useState<InfraItem[]>([]);
  const [osrmHospitals, setOsrmHospitals] = useState<InfraItem[]>([]);
  const [osrmSchools, setOsrmSchools] = useState<InfraItem[]>([]);
  const [osrmRailway, setOsrmRailway] = useState<InfraItem[]>([]);
  const [osrmBusStops, setOsrmBusStops] = useState<InfraItem[]>([]);
  const [topMalls, setTopMalls] = useState<InfraItem[]>([]);
  const [airportDist, setAirportDist] = useState<InfraItem | null>(null);
  const [osrmLoading, setOsrmLoading] = useState(true);

  // FIX 4: Default to "metro" so map shows pins on initial load (not null/empty)
  const [activeMapCategory, setActiveMapCategory] = useState<string | null>(
    "metro",
  );

  // Fetch all POIs via OSRM when source coords change
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — only re-run when source coords change
  useEffect(() => {
    const lat0 = srcLat;
    const lng0 = srcLng;

    // CRITICAL GUARD: Do not run OSRM if coords are null (no real location resolved)
    if (lat0 === null || lng0 === null) {
      console.warn(
        "[Area Intelligence] No coordinates resolved — OSRM fetch blocked. Select a real location.",
      );
      setOsrmLoading(false);
      return;
    }

    // TypeScript narrowing: lat0/lng0 are confirmed non-null after the guard above
    const safeLat: number = lat0;
    const safeLng: number = lng0;

    let cancelled = false;
    setOsrmLoading(true);
    console.log(
      `[Area Intelligence] OSRM source: ${safeLat}, ${safeLng} | locality: ${locality}`,
    );

    // STEP 5 FIX: 10-second safety net — if all OSRM calls hang, force-clear loading state
    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        console.warn(
          "[AreaIntelligence] OSRM timeout — force-clearing loading state",
        );
        setOsrmLoading(false);
      }
    }, 10_000);

    // Sequential fetcher with 80ms delay between calls to avoid OSRM 429 rate-limiting.
    // Retry logic is handled inside getOSRMDistances (via fetchWithRetry in osrmEngine).
    // NEVER use Promise.all for 8+ concurrent OSRM calls.
    async function sequentialFetch<T>(
      fn: () => Promise<T>,
      fallback: T,
      delayMs = 80,
    ): Promise<T> {
      await new Promise((r) => setTimeout(r, delayMs));
      return fn().catch(() => fallback);
    }

    async function fetchAllPOIs() {
      try {
        // Step 1: metros (highest priority — fire first, no pre-delay)
        const metros = await getNearestMetros(safeLat, safeLng, 5).catch(
          () => [] as MetroResult[],
        );
        if (cancelled) return;
        setOsrmMetros(metros);

        // Steps 2-8: sequential with 80ms gap between each call
        const techParks = await sequentialFetch(
          () => getTopTechParks(safeLat, safeLng, 5),
          [] as InfraItem[],
        );
        if (cancelled) return;
        setOsrmTechParks(techParks);

        const hospitals = await sequentialFetch(
          () => getTopHospitals(safeLat, safeLng, 5),
          [] as InfraItem[],
        );
        if (cancelled) return;
        setOsrmHospitals(hospitals);

        const schools = await sequentialFetch(
          () => getTopSchools(safeLat, safeLng, 5),
          [] as InfraItem[],
        );
        if (cancelled) return;
        setOsrmSchools(schools);

        const railway = await sequentialFetch(
          () => getTopRailwayStations(safeLat, safeLng, 5),
          [] as InfraItem[],
        );
        if (cancelled) return;
        setOsrmRailway(railway);

        const busStops = await sequentialFetch(
          () => getTopBusStops(safeLat, safeLng, 5),
          [] as InfraItem[],
        );
        if (cancelled) return;
        setOsrmBusStops(busStops);

        const malls = await sequentialFetch(
          () => getTopMalls(safeLat, safeLng, 3),
          [] as InfraItem[],
        );
        if (cancelled) return;
        setTopMalls(malls);

        const airports = await sequentialFetch(
          () =>
            import("../engines/infraEngine").then(({ getTopAirports }) =>
              getTopAirports(safeLat, safeLng, 1),
            ),
          [] as InfraItem[],
        );
        if (cancelled) return;
        setAirportDist(airports[0] ?? null);

        // QA verification log
        console.log(
          `[Area Intelligence] Fetched ${metros.length} metros, ${busStops.length} bus stops, ${techParks.length} tech parks, ${hospitals.length} hospitals, ${schools.length} schools, ${railway.length} railway`,
        );

        // Ensure map shows metro pins by default on load
        setActiveMapCategory((prev) => prev ?? "metro");
      } catch (e) {
        console.warn("[OSRM] fetchAllPOIs error", e);
      } finally {
        if (!cancelled) {
          clearTimeout(safetyTimer);
          setOsrmLoading(false);
        }
      }
    }

    fetchAllPOIs();
    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [srcLat, srcLng]);

  // ── OSRM-only distances (Haversine distKm is NEVER shown in UI) ──────────────
  // If OSRM returns null/undefined → show "Distance unavailable" via null
  const nearestMetro = osrmMetros[0] ?? null;
  const nearestTechPark = osrmTechParks[0] ?? null;
  const nearestHospital = osrmHospitals[0] ?? null;
  const nearestSchool = osrmSchools[0] ?? null;

  // osrmKm only — never distKm fallback
  const metroKm: number | null = nearestMetro?.osrmKm ?? null;
  const techKm: number | null = nearestTechPark?.osrmKm ?? null;
  const hospitalKm: number | null = nearestHospital?.osrmKm ?? null;
  const schoolKm: number | null = nearestSchool?.osrmKm ?? null;
  const nearestMall = topMalls[0] ?? null;
  const mallKm: number | null = nearestMall?.osrmKm ?? null;
  const airportKm: number | null = airportDist?.osrmKm ?? null;

  // Connectivity scores — use 0 when OSRM data is not yet available (null → score 0, not fake 35/100)
  const connMetro = metroKm !== null ? computeConnScore(metroKm, 10) : 0;
  const connTech = techKm !== null ? computeConnScore(techKm, 15) : 0;
  const connHospital =
    hospitalKm !== null ? computeConnScore(hospitalKm, 8) : 0;
  const connSchool = schoolKm !== null ? computeConnScore(schoolKm, 6) : 0;
  const connMall = mallKm !== null ? computeConnScore(mallKm, 8) : 0;
  const overallConn = Math.round(
    connMetro * 0.3 +
      connTech * 0.2 +
      connHospital * 0.2 +
      connSchool * 0.15 +
      connMall * 0.15,
  );

  // ── Rent intelligence derived values ─────────────────────────────────────────
  const expectedRent =
    rentMetrics.avgRentByBhk[2] ??
    (psf > 0 ? Math.round((psf * 1000 * 0.032) / 12) : 0);
  const rentalYield =
    rentMetrics.yieldRange[0] > 0
      ? (rentMetrics.yieldRange[0] + rentMetrics.yieldRange[1]) / 2
      : ((expectedRent * 12) / (psf * 1000)) * 100;
  const tenantDemand =
    areaIntel.demandScore >= 70
      ? "High"
      : areaIntel.demandScore >= 50
        ? "Medium"
        : "Low";
  const furnishingPremium = areaIntel.investmentScore >= 65 ? 18 : 12;
  const timeToRent =
    areaIntel.demandScore >= 70
      ? "<2 weeks"
      : areaIntel.demandScore >= 50
        ? "2–4 weeks"
        : "1–2 months";
  const rentTrend =
    rentMetrics.trend ?? (areaIntel.priceTrend1Y > 8 ? "up" : "stable");

  // ── Market heat & geo derived values ─────────────────────────────────────────
  const marketHeat = Math.round(
    areaIntel.investmentScore * 0.4 +
      areaIntel.demandScore * 0.35 +
      areaIntel.growthScore * 0.25,
  );
  const liquidityScore = valuBrixScore.liquidity * 5;
  const supplyClass =
    marketHeat >= 70
      ? "Undersupplied"
      : marketHeat >= 45
        ? "Balanced"
        : "Oversupplied";
  const investmentSentiment =
    valuBrixScore.total >= 65
      ? "Bullish"
      : valuBrixScore.total >= 45
        ? "Neutral"
        : "Cautious";

  // ── Amenity lists — OSRM data only (no Haversine distKm in display) ─────────
  // osrmHospitals / osrmSchools / osrmMetros are populated via the useEffect above
  const hospitalList = osrmHospitals
    .slice(0, 4)
    .map((h) => ({ name: h.name, dist: h.osrmKm, mins: h.osrmDurationMins }));

  const schoolList = osrmSchools
    .slice(0, 4)
    .map((s) => ({ name: s.name, dist: s.osrmKm, mins: s.osrmDurationMins }));

  const metroList = osrmMetros.slice(0, 3).map((m) => ({
    name: m.name,
    dist: m.osrmKm,
    mins: m.osrmDurationMins,
  }));

  const railwayList = osrmRailway.slice(0, 3).map((r) => ({
    name: r.name,
    dist: r.osrmKm,
    mins: r.osrmDurationMins,
  }));

  const busStopList = osrmBusStops.slice(0, 3).map((b) => ({
    name: b.name,
    dist: b.osrmKm,
    mins: b.osrmDurationMins,
  }));

  const techParkList = osrmTechParks.slice(0, 3).map((t) => ({
    name: t.name,
    dist: t.osrmKm,
    mins: t.osrmDurationMins,
  }));

  const mallList =
    topMalls.length > 0
      ? topMalls.map((m) => ({
          name: m.name,
          dist: m.osrmKm,
          mins: m.osrmDurationMins,
        }))
      : [];

  // mallList populated above — osrmLoading used in JSX

  // FIX 4: Build dynamicPoiPins from the active category's state.
  // When activeMapCategory is null ("All"), return all categories combined.
  const dynamicPoiPins = useMemo<DynamicPoiPin[]>(() => {
    const allMetroPins: DynamicPoiPin[] = osrmMetros.map((m) => ({
      category: "metro",
      name: m.name,
      lat: m.lat,
      lng: m.lng,
      distanceKm: m.osrmKm ?? undefined,
      durationMins: m.osrmDurationMins ?? undefined,
    }));
    const allRailwayPins: DynamicPoiPin[] = osrmRailway.map((r) => ({
      category: "railway",
      name: r.name,
      lat: r.lat,
      lng: r.lng,
      distanceKm: r.osrmKm ?? undefined,
      durationMins: r.osrmDurationMins ?? undefined,
    }));
    const allHospitalPins: DynamicPoiPin[] = osrmHospitals.map((h) => ({
      category: "hospital",
      name: h.name,
      lat: h.lat,
      lng: h.lng,
      distanceKm: h.osrmKm ?? undefined,
      durationMins: h.osrmDurationMins ?? undefined,
    }));
    const allSchoolPins: DynamicPoiPin[] = osrmSchools.map((s) => ({
      category: "school",
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      distanceKm: s.osrmKm ?? undefined,
      durationMins: s.osrmDurationMins ?? undefined,
    }));
    const allBusPins: DynamicPoiPin[] = osrmBusStops.map((b) => ({
      category: "bus_stop",
      name: b.name,
      lat: b.lat,
      lng: b.lng,
      distanceKm: b.osrmKm ?? undefined,
      durationMins: b.osrmDurationMins ?? undefined,
    }));
    const allTechPins: DynamicPoiPin[] = osrmTechParks.map((t) => ({
      category: "tech_park",
      name: t.name,
      lat: t.lat,
      lng: t.lng,
      distanceKm: t.osrmKm ?? undefined,
      durationMins: t.osrmDurationMins ?? undefined,
    }));
    const allMallPins: DynamicPoiPin[] = topMalls.map((m) => ({
      category: "mall",
      name: m.name,
      lat: m.lat,
      lng: m.lng,
      distanceKm: m.osrmKm ?? undefined,
      durationMins: m.osrmDurationMins ?? undefined,
    }));

    // Null = "All" → combine all categories (capped per category for clarity)
    if (!activeMapCategory) {
      const combined = [
        ...allMetroPins.slice(0, 3),
        ...allTechPins.slice(0, 2),
        ...allHospitalPins.slice(0, 2),
        ...allSchoolPins.slice(0, 2),
        ...allRailwayPins.slice(0, 2),
        ...allBusPins.slice(0, 2),
        ...allMallPins.slice(0, 1),
      ];
      console.log(
        `[Area Intelligence] Map pins count: ${combined.length} (category: all)`,
      );
      return combined;
    }

    let pins: DynamicPoiPin[] = [];
    switch (activeMapCategory) {
      case "metro":
        pins = allMetroPins;
        break;
      case "railway":
        pins = allRailwayPins;
        break;
      case "hospital":
        pins = allHospitalPins;
        break;
      case "school":
        pins = allSchoolPins;
        break;
      case "bus_stop":
        pins = allBusPins;
        break;
      case "tech_park":
        pins = allTechPins;
        break;
      case "mall":
        pins = allMallPins;
        break;
      default:
        break;
    }

    console.log(
      `[Area Intelligence] Map pins count: ${pins.length} (category: ${activeMapCategory})`,
    );
    return pins;
  }, [
    activeMapCategory,
    osrmMetros,
    osrmRailway,
    osrmHospitals,
    osrmSchools,
    osrmBusStops,
    osrmTechParks,
    topMalls,
  ]);

  // ── Analyzing overlay + animated entrance ────────────────────────────────────
  const [showAnalyzing, setShowAnalyzing] = useState(true);
  const [resultsVisible, setResultsVisible] = useState(false);
  const overlayDoneRef = useRef(false);

  // Show analyzing overlay for min 1.5s on mount, then reveal results
  useEffect(() => {
    if (!overlayDoneRef.current) return;
    setResultsVisible(true);
  }, []);

  const handleOverlayComplete = () => {
    overlayDoneRef.current = true;
    setShowAnalyzing(false);
    // Small delay for smooth transition
    setTimeout(() => setResultsVisible(true), 80);
  };

  const fadeCls = `transition-all duration-700 ${resultsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <AnalyzingOverlay
        module="area"
        isVisible={showAnalyzing}
        dataReady={true}
        onComplete={handleOverlayComplete}
      />
      <div
        className="min-h-screen"
        style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, #0A2040 50%, #091B35 100%)`,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* ── Sticky Nav ──────────────────────────────────────────────────────────── */}
        <nav
          className="sticky top-0 z-50 flex items-center gap-4 px-4 md:px-8 py-3"
          style={{
            background: "rgba(7,26,47,0.88)",
            backdropFilter: "blur(20px)",
            borderBottom: `1px solid ${GOLD}20`,
          }}
        >
          <button
            type="button"
            onClick={() => navigate({ to: "/area/discover" })}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            data-ocid="area_intel.nav.back_button"
          >
            <ArrowLeft size={18} />
            <span className="text-sm hidden sm:inline">Back</span>
          </button>
          <a
            href="/"
            className="flex items-center gap-2"
            data-ocid="area_intel.nav.logo"
          >
            <img
              src="/assets/valubrix-logo.png"
              alt="ValuBrix"
              className="h-8 w-auto object-contain"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (!img.src.includes("uploads")) {
                  img.src =
                    "/assets/uploads/5EB5878E-7937-4598-9486-6156F9B2EB9F-3-1.png";
                }
              }}
            />
          </a>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">
              {locality}
            </p>
            <p className="text-white/40 text-xs">{city} · Location IQ</p>
          </div>
          <span
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{
              background: `${GOLD}15`,
              color: GOLD,
              border: `1px solid ${GOLD}30`,
            }}
          >
            <Sparkles size={11} /> AI Report
          </span>
        </nav>

        {/* ── Hero banner ────────────────────────────────────────────────────────── */}
        <div
          className="relative px-4 md:px-8 pt-8 pb-6"
          style={{
            background:
              "linear-gradient(180deg, rgba(216,181,106,0.07) 0%, transparent 100%)",
            borderBottom: `1px solid ${GOLD}18`,
          }}
        >
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={15} style={{ color: GOLD }} />
              <span className="text-white/50 text-sm">{city}, Karnataka</span>
            </div>
            <h1
              className="text-3xl md:text-4xl font-bold text-white mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {locality}
            </h1>
            <p className="text-white/50 text-sm mb-4">
              Zone:{" "}
              <span className="text-white/70 font-medium capitalize">
                {zone.replace(/-/g, " ")}
              </span>
              {propertyType && (
                <>
                  {" · "}
                  <span className="text-white/70 font-medium capitalize">
                    {propertyType}
                  </span>
                </>
              )}
            </p>

            {/* Quick stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: effectiveType
                    ? `${effectiveType.charAt(0).toUpperCase() + effectiveType.slice(1)} Base PSF`
                    : "Base Market PSF",
                  tooltip: effectiveType
                    ? `PSF = Price per square foot. This is the ${effectiveType} PSF from verified registry transactions for this locality.`
                    : "PSF = Price per square foot. Weighted median across all property types for this locality.",
                  value: effectiveType
                    ? `₹${getBasePSF(locality, effectiveType).toLocaleString("en-IN")}`
                    : `₹${psf.toLocaleString("en-IN")}`,
                  color: GOLD,
                },
                {
                  label: "1Y Growth",
                  value: `+${priceForecast.growthRates.oneYear.toFixed(1)}%`,
                  color: "#10b981",
                },
                {
                  label: "ValuBrix Score",
                  value: `${valuBrixScore.total}/100`,
                  color: "#60a5fa",
                },
                {
                  label:
                    effectiveType === "plot"
                      ? "Capital Appreciation"
                      : "Rental Yield",
                  value:
                    effectiveType === "plot"
                      ? `+${priceForecast.growthRates.oneYear.toFixed(1)}% / yr`
                      : `${rentalYield.toFixed(1)}%`,
                  color:
                    effectiveType === "plot"
                      ? "#10b981"
                      : yieldColor(rentalYield),
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl px-4 py-3 relative group"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <p className="text-white/40 text-xs mb-0.5 flex items-center gap-1">
                    {s.label}
                    {"tooltip" in s && s.tooltip && (
                      <span
                        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] cursor-help"
                        style={{
                          background: "rgba(216,181,106,0.2)",
                          color: "rgba(216,181,106,0.8)",
                        }}
                        title={s.tooltip}
                      >
                        ℹ
                      </span>
                    )}
                  </p>
                  <p className="font-bold text-lg" style={{ color: s.color }}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main scrolling content ────────────────────────────────────────────── */}
        <div
          className={`max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6 ${fadeCls}`}
        >
          {/* ═══════════════════════════════════════════════════════════════════
            NEW: Property Intelligence — Primary + Comparison View
        ════════════════════════════════════════════════════════════════════ */}
          <PropertyIntelligenceSection
            locality={locality}
            selectedType={
              (effectiveType as "apartment" | "villa" | "plot" | null) ?? null
            }
            allTypeIntel={allTypeIntel}
            singleTypeIntel={singleTypeIntel}
          />

          {/* ═══════════════════════════════════════════════════════════════════
            SECTION 0 — Location IQ Map (Full Layer Stack + Smart Pins)
        ════════════════════════════════════════════════════════════════════ */}
          <GlassCard
            data-ocid="area_intel.location_iq_map.section"
            accentColor="#3b82f6"
          >
            <SectionHeader
              icon={<MapPin size={18} />}
              title="Location IQ Map"
              badge="Full Intelligence"
            />
            <p className="text-white/40 text-xs mb-3">
              Toggle layers and smart pins to explore price heatmaps, rental
              yield, growth zones, metro connectivity, infrastructure, and POI
              density for {locality}.
            </p>

            {/* ROOT CAUSE 3 FIX: Category filter pills — clicking connects to map POI display */}
            <div
              className="flex flex-wrap gap-2 mb-3"
              data-ocid="area_intel.map.category_filters"
            >
              {(
                [
                  { key: null, label: "All", color: "#6b7280" },
                  { key: "metro", label: "🚇 Metro", color: "#3B82F6" },
                  { key: "railway", label: "🚂 Railway", color: "#8B5CF6" },
                  { key: "hospital", label: "🏥 Hospital", color: "#EF4444" },
                  { key: "school", label: "🏫 School", color: "#22C55E" },
                  { key: "tech_park", label: "💼 Tech Park", color: "#EAB308" },
                  { key: "bus_stop", label: "🚌 Bus Stop", color: "#F97316" },
                  { key: "mall", label: "🛍️ Mall", color: "#EC4899" },
                ] as const
              ).map((btn) => {
                const isActive = activeMapCategory === btn.key;
                const isLoading = isActive && osrmLoading && btn.key !== null;
                return (
                  <button
                    key={String(btn.key)}
                    type="button"
                    onClick={() => setActiveMapCategory(btn.key)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1"
                    data-ocid={`area_intel.map.filter.${btn.key ?? "all"}`}
                    style={{
                      background: isActive
                        ? `${btn.color}28`
                        : "rgba(255,255,255,0.05)",
                      border: `1px solid ${isActive ? btn.color : "rgba(255,255,255,0.12)"}`,
                      color: isActive ? btn.color : "rgba(255,255,255,0.5)",
                    }}
                  >
                    {isLoading && (
                      <span className="inline-block w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin" />
                    )}
                    {btn.label}
                  </button>
                );
              })}
            </div>
            {/* Active category info */}
            {osrmLoading && (
              <p className="text-white/30 text-xs mb-3 flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full border border-white/20 border-t-white/40 animate-spin" />
                Loading nearby places…
              </p>
            )}
            {!osrmLoading && activeMapCategory && dynamicPoiPins.length > 0 && (
              <p className="text-white/40 text-xs mb-3">
                Showing {dynamicPoiPins.length}{" "}
                {activeMapCategory === null
                  ? "nearby places"
                  : activeMapCategory.replace("_", " ")}{" "}
                near {locality}
              </p>
            )}
            {!osrmLoading && !localityCoords.hasRealCoords && (
              <p className="text-amber-400/70 text-xs mb-3 flex items-center gap-1.5">
                <span>⚠</span>
                Coordinates not found for "{locality}". Try selecting via the
                discover page.
              </p>
            )}
            {/* Rigid wrapper prevents map from compressing when overlay panels open */}
            <div
              style={{
                position: "relative",
                height: 340,
                minHeight: 340,
                maxHeight: 340,
                flexShrink: 0,
                flexGrow: 0,
                overflow: "hidden",
              }}
            >
              <GlobalMapComponent
                mode="area-intelligence"
                center={[
                  localityCoords.mapDisplayLat,
                  localityCoords.mapDisplayLng,
                ]}
                zoom={13}
                height="340px"
                showLayerToggle={false}
                hideLevelSelector={true}
                hideInfraPanel={true}
                hideInfraLegend={true}
                hideClickHint={true}
                hideSmartPinsLegend={true}
                disableDefaultSmartPins={true}
                dynamicPoiPins={dynamicPoiPins}
                activePoiCategory={activeMapCategory ?? undefined}
                onLocationSelect={(lat, lng, name) => {
                  // handled internally
                  void lat;
                  void lng;
                  void name;
                }}
              />
            </div>
          </GlassCard>

          {/* ═══════════════════════════════════════════════════════════════════
            TASK 2: Property Type Overview (shown when no type selected)
            OR single-type focused view (when type filter active)
        ════════════════════════════════════════════════════════════════════ */}
          <GlassCard
            data-ocid="area_intel.property_type_overview.section"
            accentColor={GOLD}
          >
            <SectionHeader
              icon={<Building size={18} />}
              title={
                !propertyType
                  ? effectiveType
                    ? `${effectiveType.charAt(0).toUpperCase() + effectiveType.slice(1)} Intelligence`
                    : "Property Type Overview"
                  : `${propertyType.charAt(0).toUpperCase() + propertyType.slice(1)} Intelligence`
              }
              badge={
                !propertyType
                  ? effectiveType
                    ? "Focused View"
                    : "All Types"
                  : "Type Selected"
              }
            />

            {/* Filter buttons — only shown when no URL propertyType set */}
            {!propertyType && (
              <div
                className="flex flex-wrap gap-2 mb-4"
                data-ocid="area_intel.property_type_overview.filter_row"
              >
                {(
                  [
                    { key: null, label: "All Types", color: GOLD },
                    {
                      key: "apartment" as const,
                      label: "Apartment",
                      color: "#60a5fa",
                    },
                    { key: "villa" as const, label: "Villa", color: GOLD },
                    { key: "plot" as const, label: "Plot", color: "#a78bfa" },
                  ] as const
                ).map((btn) => {
                  const isActive = activeTypeFilter === btn.key;
                  return (
                    <button
                      key={String(btn.key)}
                      type="button"
                      onClick={() => setActiveTypeFilter(btn.key)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                      data-ocid={`area_intel.property_type_overview.filter_btn.${btn.key ?? "all"}`}
                      style={{
                        background: isActive
                          ? `${btn.color}22`
                          : "rgba(255,255,255,0.05)",
                        border: `1px solid ${isActive ? btn.color : "rgba(255,255,255,0.12)"}`,
                        color: isActive ? btn.color : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {btn.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Single-type focused view */}
            {effectiveType && singleTypeIntel ? (
              <div
                className="rounded-2xl p-5"
                data-ocid="area_intel.property_type_overview.single_type_card"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <p className="text-white/40 text-xs uppercase tracking-wide mb-4">
                  {effectiveType.charAt(0).toUpperCase() +
                    effectiveType.slice(1)}{" "}
                  — {locality}
                  {singleTypeIntel.sampleCount > 0
                    ? ` (${singleTypeIntel.sampleCount} data point${singleTypeIntel.sampleCount > 1 ? "s" : ""})`
                    : ""}
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-white/40 text-xs mb-1 flex items-center gap-1">
                      Base Market PSF
                      <span
                        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] cursor-help flex-shrink-0"
                        style={{
                          background: "rgba(216,181,106,0.2)",
                          color: "rgba(216,181,106,0.8)",
                        }}
                        title="PSF = Price per square foot. This is the price per square foot of built-up area."
                      >
                        ℹ
                      </span>
                    </p>
                    <p
                      className="text-2xl font-bold"
                      style={{
                        color: GOLD,
                        fontFamily: "'Playfair Display', serif",
                      }}
                    >
                      {singleTypeIntel.avgPSF !== null
                        ? `₹${singleTypeIntel.avgPSF.toLocaleString("en-IN")}`
                        : "Data unavailable"}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs mb-1">Avg Rent/mo</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {singleTypeIntel.avgRent !== null
                        ? `₹${singleTypeIntel.avgRent.toLocaleString("en-IN")}`
                        : effectiveType === "plot"
                          ? "N/A (land)"
                          : "Data unavailable"}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs mb-1">Gross Yield</p>
                    <p
                      className="text-2xl font-bold"
                      style={{
                        color:
                          singleTypeIntel.yield !== null
                            ? yieldColor(singleTypeIntel.yield)
                            : "rgba(255,255,255,0.3)",
                      }}
                    >
                      {singleTypeIntel.yield !== null
                        ? `${singleTypeIntel.yield}%`
                        : effectiveType === "plot"
                          ? "Appreciation"
                          : "Data unavailable"}
                    </p>
                  </div>
                </div>
                {singleTypeIntel.avgPSF === null && (
                  <div
                    className="mt-3 rounded-xl px-4 py-3 flex items-center gap-2"
                    style={{
                      background: "rgba(245,158,11,0.08)",
                      border: "1px solid rgba(245,158,11,0.2)",
                    }}
                  >
                    <AlertTriangle
                      size={14}
                      className="text-amber-400 flex-shrink-0"
                    />
                    <p className="text-amber-300/80 text-xs">
                      No {effectiveType} transaction data available for{" "}
                      {locality}. Data unavailable — not estimated.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* All-types overview grid */
              <div>
                <div
                  className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4"
                  data-ocid="area_intel.property_type_overview.cards_grid"
                >
                  {(
                    [
                      {
                        key: "apartment" as const,
                        label: "Apartment",
                        icon: <Building2 size={16} />,
                        color: "#60a5fa",
                        data: allTypeIntel.apartment,
                      },
                      {
                        key: "villa" as const,
                        label: "Villa",
                        icon: <Building size={16} />,
                        color: GOLD,
                        data: allTypeIntel.villa,
                      },
                      {
                        key: "plot" as const,
                        label: "Plot",
                        icon: <Landmark size={16} />,
                        color: "#a78bfa",
                        data: allTypeIntel.plot,
                      },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className="rounded-xl p-4 flex flex-col gap-2 cursor-pointer transition-all hover:scale-[1.02] text-left"
                      data-ocid={`area_intel.property_type_overview.card.${item.key}`}
                      onClick={() => setActiveTypeFilter(item.key)}
                      style={{
                        background: `${item.color}08`,
                        border: `1px solid ${item.color}25`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span style={{ color: item.color }}>{item.icon}</span>
                        <span className="text-white/70 text-sm font-semibold">
                          {item.label}
                        </span>
                      </div>
                      <div>
                        <p className="text-white/40 text-[10px] uppercase tracking-wide flex items-center gap-1">
                          Base Market PSF
                          <span
                            className="inline-flex items-center justify-center w-3 h-3 rounded-full text-[8px] cursor-help flex-shrink-0"
                            style={{
                              background: "rgba(216,181,106,0.2)",
                              color: "rgba(216,181,106,0.8)",
                            }}
                            title="PSF = Price per square foot. This is the price per square foot of built-up area."
                          >
                            ℹ
                          </span>
                        </p>
                        <p
                          className="font-bold text-base"
                          style={{ color: item.color }}
                        >
                          {item.data.avgPSF !== null
                            ? `₹${item.data.avgPSF.toLocaleString("en-IN")}`
                            : "Data unavailable"}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/40 text-[10px] uppercase tracking-wide">
                          {item.key === "plot" ? "Yield Type" : "Avg Rent/mo"}
                        </p>
                        <p className="text-white/60 text-sm font-medium">
                          {item.key === "plot"
                            ? "Appreciation"
                            : item.data.avgRent !== null
                              ? `₹${item.data.avgRent.toLocaleString("en-IN")}`
                              : "Data unavailable"}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/40 text-[10px] uppercase tracking-wide">
                          Yield
                        </p>
                        <p
                          className="text-sm font-bold"
                          style={{
                            color:
                              item.data.yield !== null
                                ? yieldColor(item.data.yield)
                                : "rgba(255,255,255,0.3)",
                          }}
                        >
                          {item.key === "plot"
                            ? "Land Only"
                            : item.data.yield !== null
                              ? `${item.data.yield}%`
                              : "Data unavailable"}
                        </p>
                      </div>
                      {item.data.avgPSF === null && (
                        <p className="text-white/25 text-[10px] italic">
                          No data for this locality
                        </p>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-white/30 text-xs">
                  Click a card or use filter buttons above to see detailed
                  single-type analysis. Showing stricty-segregated data — no
                  type mixing.
                </p>
              </div>
            )}
          </GlassCard>

          {/* ═══════════════════════════════════════════════════════════════════
            AREA INTELLIGENCE 2.0 — Connectivity, Employment, Growth, Livability
        ════════════════════════════════════════════════════════════════════ */}
          <div className="grid md:grid-cols-2 gap-6">
            <ConnectivityScoreCard
              lat={localityCoords.mapDisplayLat}
              lng={localityCoords.mapDisplayLng}
              locality={locality}
              metros={osrmMetros}
              airportOsrmKm={airportKm}
            />
            <EmploymentEngineCard
              lat={localityCoords.mapDisplayLat}
              lng={localityCoords.mapDisplayLng}
              locality={locality}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <GrowthSignalsCard
              locality={locality}
              lat={localityCoords.mapDisplayLat}
              lng={localityCoords.mapDisplayLng}
              priceTrend1Y={areaIntel.priceTrend1Y}
              priceTrend3Y={areaIntel.priceTrend3Y}
              classification={areaIntel.classification}
            />
            <LiveabilityScoreCard
              lat={localityCoords.mapDisplayLat}
              lng={localityCoords.mapDisplayLng}
              locality={locality}
              isLoading={osrmLoading}
              schools={osrmSchools}
              hospitals={osrmHospitals}
              malls={topMalls}
            />
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
            SECTION 1 — Price Intelligence
        ════════════════════════════════════════════════════════════════════ */}
          <GlassCard
            data-ocid="area_intel.price_intelligence.section"
            accentColor={GOLD}
          >
            <SectionHeader
              icon={<TrendingUp size={18} />}
              title="Price Intelligence"
              badge={`${priceForecast.confidenceLevel} Confidence`}
              trendDir={
                priceForecast.growthRates.oneYear > 5
                  ? "up"
                  : priceForecast.growthRates.oneYear > 0
                    ? "stable"
                    : "down"
              }
            />

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                {/* R2: Show blended PSF + rent by property type when no type selected */}
                {areaIntel.blendedMode && areaIntel.blendedPSF ? (
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
                      Price & Rent by Property Type
                    </p>
                    <div className="space-y-2">
                      {[
                        {
                          label: "Apartment",
                          psf: areaIntel.blendedPSF.apartment,
                          color: "#60a5fa",
                          // Derive 2BHK rent: rentMetrics or yield estimate
                          rent: rentMetrics.avgRentByBhk[2]
                            ? `₹${rentMetrics.avgRentByBhk[2].toLocaleString("en-IN")}/mo`
                            : rentMetrics.rentPerSqft > 0
                              ? `₹${Math.round(rentMetrics.rentPerSqft * 1000).toLocaleString("en-IN")}/mo`
                              : `₹${Math.round((areaIntel.blendedPSF.apartment * 1000 * 0.032) / 12).toLocaleString("en-IN")}/mo`,
                          yield: rentMetrics.avgRentByBhk[2]
                            ? (
                                ((rentMetrics.avgRentByBhk[2] * 12) /
                                  (areaIntel.blendedPSF.apartment * 1000)) *
                                100
                              ).toFixed(1)
                            : "3.0",
                        },
                        {
                          label: "Villa",
                          psf: areaIntel.blendedPSF.villa,
                          color: GOLD,
                          rent: `₹${Math.round((areaIntel.blendedPSF.villa * 2500 * 0.028) / 12).toLocaleString("en-IN")}/mo`,
                          yield: "2.8",
                        },
                        {
                          label: "Plot",
                          psf: areaIntel.blendedPSF.plot,
                          color: "#a78bfa",
                          rent: "N/A",
                          yield: "N/A (appreciation)",
                        },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="rounded-xl px-3 py-3"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.07)",
                          }}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-white/70 text-sm font-semibold">
                              {row.label}
                            </span>
                            <span
                              className="font-bold text-base"
                              style={{ color: row.color }}
                            >
                              ₹{row.psf.toLocaleString("en-IN")}/sqft
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-white/40">
                            <span>
                              Rent:{" "}
                              <span className="text-white/60">{row.rent}</span>
                            </span>
                            <span>·</span>
                            <span>
                              Yield:{" "}
                              <span style={{ color: row.color }}>
                                {row.yield}
                                {typeof row.yield === "string" &&
                                row.yield.includes("N/A")
                                  ? ""
                                  : "%"}
                              </span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-white/30 text-xs mt-2">
                      Select a property type above for single-type detailed view
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wide mb-1 flex items-center gap-1">
                      Base Market PSF
                      <span
                        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] cursor-help flex-shrink-0"
                        style={{
                          background: "rgba(216,181,106,0.2)",
                          color: "rgba(216,181,106,0.8)",
                        }}
                        title="PSF = Price per square foot. This is the price per square foot of built-up area."
                      >
                        ℹ
                      </span>
                    </p>
                    <p
                      className="text-3xl font-bold"
                      style={{
                        color: GOLD,
                        fontFamily: "'Playfair Display', serif",
                      }}
                    >
                      ₹{psf.toLocaleString("en-IN")}
                    </p>
                    <p className="text-white/40 text-xs mt-1">
                      per sq ft · {city}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[
                    {
                      label: "1 Year",
                      value: `+${priceForecast.growthRates.oneYear.toFixed(1)}%`,
                      psf: priceForecast.forecast.oneYear,
                    },
                    {
                      label: "3 Years",
                      value: `+${priceForecast.growthRates.threeYear.toFixed(1)}%`,
                      psf: priceForecast.forecast.threeYear,
                    },
                    {
                      label: "5 Years",
                      value: `+${priceForecast.growthRates.fiveYear.toFixed(1)}%`,
                      psf: priceForecast.forecast.fiveYear,
                    },
                  ].map((f) => (
                    <div
                      key={f.label}
                      className="rounded-xl p-3 text-center"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <p className="text-white/40 text-[10px] mb-1">
                        {f.label}
                      </p>
                      <p className="text-emerald-400 font-bold text-sm">
                        {f.value}
                      </p>
                      <p className="text-white/50 text-[10px] mt-0.5">
                        ₹{Math.round(f.psf / 1000)}k/sqft
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-white/40 text-xs uppercase tracking-wide mb-1">
                  Forecast Progression
                </p>
                <ForecastBarChart
                  current={psf}
                  y1={priceForecast.forecast.oneYear}
                  y3={priceForecast.forecast.threeYear}
                  y5={priceForecast.forecast.fiveYear}
                />
              </div>
            </div>

            <div className="mt-5">
              <p className="text-white/40 text-xs uppercase tracking-wide mb-3">
                Growth Drivers
              </p>
              <div className="space-y-2">
                {priceForecast.growthDrivers.map((d) => (
                  <div key={d} className="flex items-start gap-2">
                    <ChevronRight
                      size={14}
                      style={{ color: GOLD }}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <p className="text-white/70 text-sm">{d}</p>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="mt-4 p-3 rounded-xl text-sm text-white/60 italic"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderLeft: `3px solid ${GOLD}50`,
              }}
            >
              {priceForecast.marketOutlook}
            </div>
          </GlassCard>

          {/* ═══════════════════════════════════════════════════════════════════
            SECTION 2 — Rent Intelligence
        ════════════════════════════════════════════════════════════════════ */}
          <GlassCard
            data-ocid="area_intel.rent_intelligence.section"
            accentColor="#10b981"
          >
            <SectionHeader
              icon={<Building2 size={18} />}
              title="Rent Intelligence"
              trendDir={rentTrend as "up" | "down" | "stable"}
            />

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wide mb-1">
                    Expected Monthly Rent (2 BHK)
                  </p>
                  <p
                    className="text-3xl font-bold text-emerald-400"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    ₹{expectedRent.toLocaleString("en-IN")}
                  </p>
                  <p className="text-white/40 text-xs mt-1">
                    per month estimate
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-white/40 text-[10px] uppercase">
                      Rental Yield
                    </p>
                    <p
                      className="text-xl font-bold"
                      style={{ color: yieldColor(rentalYield) }}
                    >
                      {rentalYield.toFixed(1)}%
                    </p>
                  </div>
                  <div
                    className="h-10 w-px mx-1"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  />
                  <div>
                    <p className="text-white/40 text-[10px] uppercase">
                      Tenant Demand
                    </p>
                    <p
                      className="text-xl font-bold"
                      style={{
                        color:
                          tenantDemand === "High"
                            ? "#10b981"
                            : tenantDemand === "Medium"
                              ? "#f59e0b"
                              : "#ef4444",
                      }}
                    >
                      {tenantDemand}
                    </p>
                  </div>
                  <div
                    className="h-10 w-px mx-1"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  />
                  <div>
                    <p className="text-white/40 text-[10px] uppercase">
                      Time to Rent
                    </p>
                    <p className="text-sm font-semibold text-white/80">
                      {timeToRent}
                    </p>
                  </div>
                </div>

                <div
                  className="rounded-xl p-3 flex items-center gap-3"
                  style={{
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.2)",
                  }}
                >
                  <Zap size={16} className="text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-white/80 text-sm font-medium">
                      Furnishing Premium
                    </p>
                    <p className="text-emerald-400 text-xs">
                      +{furnishingPremium}% for fully furnished
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-white/40 text-xs uppercase tracking-wide">
                  Rent by BHK
                </p>
                {[1, 2, 3].map((bhk) => {
                  const r =
                    rentMetrics.avgRentByBhk[bhk] ??
                    Math.round(
                      expectedRent * (bhk === 1 ? 0.65 : bhk === 3 ? 1.45 : 1),
                    );
                  const yld =
                    ((r * 12) /
                      (psf * (bhk === 1 ? 650 : bhk === 2 ? 1050 : 1500))) *
                    100;
                  return (
                    <div
                      key={bhk}
                      className="flex items-center justify-between rounded-xl px-4 py-3"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <span className="text-white/60 text-sm">{bhk} BHK</span>
                      <span className="text-white font-semibold">
                        ₹{r.toLocaleString("en-IN")}/mo
                      </span>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: yieldColor(yld) }}
                      >
                        {yld.toFixed(1)}% yield
                      </span>
                    </div>
                  );
                })}

                {rentMetrics.yieldRange[0] > 0 && (
                  <div className="mt-2">
                    <MetricBar
                      label="Yield Range"
                      value={Math.round(rentalYield * 10)}
                      max={60}
                      color={yieldColor(rentalYield)}
                      suffix=""
                    />
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

          {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3 — Rate Breakdown
        ════════════════════════════════════════════════════════════════════ */}
          <GlassCard data-ocid="area_intel.rate_breakdown.section">
            <SectionHeader
              icon={<Building size={18} />}
              title="Rate Breakdown by Property Type"
            />
            <RateBreakdownTable rows={rateBreakdown} />
            <p className="text-white/30 text-xs mt-3">
              * Derived from zone PSF median · Rental yield estimates based on
              market data · Plots typically no rental income
            </p>
          </GlassCard>

          {/* ═══════════════════════════════════════════════════════════════════
            SECTION 4 — Geo Intelligence
        ════════════════════════════════════════════════════════════════════ */}
          <GlassCard
            data-ocid="area_intel.geo_intelligence.section"
            accentColor="#60a5fa"
          >
            <SectionHeader
              icon={<Activity size={18} />}
              title="Geo Intelligence"
            />

            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <MetricBar
                  label="Demand vs Supply"
                  value={areaIntel.demandScore}
                  color={
                    areaIntel.demandScore >= 70
                      ? "#10b981"
                      : areaIntel.demandScore >= 50
                        ? "#f59e0b"
                        : "#ef4444"
                  }
                  suffix=""
                />
                <MetricBar
                  label="Liquidity Score"
                  value={liquidityScore}
                  color="#60a5fa"
                  suffix=""
                />
                <MetricBar
                  label="Growth Potential"
                  value={areaIntel.growthScore}
                  color={GOLD}
                  suffix=""
                />
                <MetricBar
                  label="Investment Score"
                  value={areaIntel.investmentScore}
                  color="#a78bfa"
                  suffix=""
                />
              </div>

              <div className="space-y-3">
                {[
                  {
                    label: "Growth Potential",
                    value:
                      areaIntel.growthScore >= 70
                        ? "Excellent"
                        : areaIntel.growthScore >= 55
                          ? "High"
                          : areaIntel.growthScore >= 40
                            ? "Medium"
                            : "Low",
                    color:
                      areaIntel.growthScore >= 70
                        ? "#10b981"
                        : areaIntel.growthScore >= 55
                          ? GOLD
                          : areaIntel.growthScore >= 40
                            ? "#f59e0b"
                            : "#ef4444",
                  },
                  {
                    label: "Market Classification",
                    value: areaIntel.classification,
                    color:
                      areaIntel.classification === "High Growth"
                        ? "#10b981"
                        : areaIntel.classification === "Emerging"
                          ? GOLD
                          : "#f59e0b",
                  },
                  {
                    label: "Demand Pressure",
                    value:
                      areaIntel.demandScore >= 70
                        ? "High"
                        : areaIntel.demandScore >= 50
                          ? "Moderate"
                          : "Low",
                    color: areaIntel.demandScore >= 70 ? "#10b981" : "#f59e0b",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <span className="text-white/50 text-sm">{item.label}</span>
                    <span
                      className="font-bold text-sm"
                      style={{ color: item.color }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}

                <div
                  className="rounded-xl p-3 text-sm text-white/60"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <p className="text-white/40 text-xs uppercase mb-1">
                    Growth Driver
                  </p>
                  <p>{areaIntel.growthDriver}</p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* ═══════════════════════════════════════════════════════════════════
            SECTION 5 — Distance Intelligence
        ════════════════════════════════════════════════════════════════════ */}
          <GlassCard
            data-ocid="area_intel.distance_intelligence.section"
            accentColor="#a78bfa"
          >
            <SectionHeader
              icon={<Navigation size={18} />}
              title="Distance Intelligence"
              badge={`Connectivity: ${overallConn}/100`}
            />

            {/* Location source toggle */}

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              <DistancePill
                icon={<Zap size={16} />}
                label={nearestMetro?.name ?? "Nearest Metro"}
                distance={metroKm}
                score={connMetro}
              />
              <DistancePill
                icon={<Building2 size={16} />}
                label={nearestTechPark?.name ?? "IT Hub"}
                distance={techKm}
                score={connTech}
              />
              <DistancePill
                icon={<Heart size={16} />}
                label={nearestHospital?.name ?? "Hospital"}
                distance={hospitalKm}
                score={connHospital}
              />
              <DistancePill
                icon={<School size={16} />}
                label={nearestSchool?.name ?? "School"}
                distance={schoolKm}
                score={connSchool}
              />
              <DistancePill
                icon={<ShoppingBag size={16} />}
                label={nearestMall?.name ?? "Shopping Mall"}
                distance={mallKm}
                score={connMall}
              />
              {airportKm !== null && (
                <DistancePill
                  icon={<Navigation size={16} />}
                  label="Kempegowda International Airport"
                  distance={airportKm}
                  score={computeConnScore(airportKm, 50)}
                />
              )}
            </div>

            <div className="mt-4">
              <MetricBar
                label="Overall Connectivity Score"
                value={overallConn}
                color={
                  overallConn >= 70
                    ? "#10b981"
                    : overallConn >= 50
                      ? GOLD
                      : "#ef4444"
                }
                suffix="/100"
              />
            </div>
          </GlassCard>

          {/* ═══════════════════════════════════════════════════════════════════
            SECTION 6 — Amenities Nearby
        ════════════════════════════════════════════════════════════════════ */}
          <GlassCard data-ocid="area_intel.amenities.section">
            <SectionHeader
              icon={<Landmark size={18} />}
              title="Amenities Nearby"
            />

            {/* Location source toggle — above the POI list */}

            {/* Loading indicator */}
            {osrmLoading && (
              <p className="text-white/30 text-xs mb-3 flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full border border-white/20 border-t-white/60 animate-spin" />
                Calculating driving distances…
              </p>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Schools */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <School size={14} style={{ color: "#60a5fa" }} />
                  <p className="text-white/60 text-sm font-semibold uppercase tracking-wide">
                    Schools
                  </p>
                </div>
                {schoolList.length > 0 ? (
                  schoolList.map((s) => (
                    <AmenityItem
                      key={s.name}
                      name={s.name}
                      distance={s.dist}
                      mins={s.mins}
                    />
                  ))
                ) : (
                  <p className="text-white/30 text-sm">
                    {osrmLoading ? "Loading…" : "No data available"}
                  </p>
                )}
              </div>

              {/* Hospitals */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Heart size={14} style={{ color: "#f87171" }} />
                  <p className="text-white/60 text-sm font-semibold uppercase tracking-wide">
                    Hospitals
                  </p>
                </div>
                {hospitalList.length > 0 ? (
                  hospitalList.map((h) => (
                    <AmenityItem
                      key={h.name}
                      name={h.name}
                      distance={h.dist}
                      mins={h.mins}
                    />
                  ))
                ) : (
                  <p className="text-white/30 text-sm">
                    {osrmLoading ? "Loading…" : "No data available"}
                  </p>
                )}
              </div>

              {/* Metro Stations */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} style={{ color: GOLD }} />
                  <p className="text-white/60 text-sm font-semibold uppercase tracking-wide">
                    Metro Stations
                  </p>
                </div>
                {metroList.length > 0 ? (
                  metroList.map((m) => (
                    <AmenityItem
                      key={m.name}
                      name={m.name}
                      distance={m.dist}
                      mins={m.mins}
                    />
                  ))
                ) : (
                  <p className="text-white/30 text-sm">
                    {osrmLoading ? "Loading…" : "No metro data available"}
                  </p>
                )}
              </div>

              {/* Malls */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingBag size={14} style={{ color: "#a78bfa" }} />
                  <p className="text-white/60 text-sm font-semibold uppercase tracking-wide">
                    Malls
                  </p>
                </div>
                {mallList.length > 0 ? (
                  mallList.map((m) => (
                    <AmenityItem
                      key={m.name}
                      name={m.name}
                      distance={m.dist}
                      mins={m.mins}
                    />
                  ))
                ) : (
                  <p className="text-white/30 text-sm">
                    {osrmLoading ? "Loading…" : "No data available"}
                  </p>
                )}
              </div>

              {/* Railway Stations */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Navigation size={14} style={{ color: "#34d399" }} />
                  <p className="text-white/60 text-sm font-semibold uppercase tracking-wide">
                    Railway Stations
                  </p>
                </div>
                {railwayList.length > 0 ? (
                  railwayList.map((r) => (
                    <AmenityItem
                      key={r.name}
                      name={r.name}
                      distance={r.dist}
                      mins={r.mins}
                    />
                  ))
                ) : (
                  <p className="text-white/30 text-sm">
                    {osrmLoading ? "Loading…" : "No data available"}
                  </p>
                )}
              </div>

              {/* Tech Parks */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={14} style={{ color: "#f59e0b" }} />
                  <p className="text-white/60 text-sm font-semibold uppercase tracking-wide">
                    Tech Parks
                  </p>
                </div>
                {techParkList.length > 0 ? (
                  techParkList.map((t) => (
                    <AmenityItem
                      key={t.name}
                      name={t.name}
                      distance={t.dist}
                      mins={t.mins}
                    />
                  ))
                ) : (
                  <p className="text-white/30 text-sm">
                    {osrmLoading ? "Loading…" : "No data available"}
                  </p>
                )}
              </div>

              {/* Bus Stops */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ArrowUpRight size={14} style={{ color: "#fb923c" }} />
                  <p className="text-white/60 text-sm font-semibold uppercase tracking-wide">
                    Bus Stops
                  </p>
                </div>
                {busStopList.length > 0 ? (
                  busStopList.map((b) => (
                    <AmenityItem
                      key={b.name}
                      name={b.name}
                      distance={b.dist}
                      mins={b.mins}
                    />
                  ))
                ) : (
                  <p className="text-white/30 text-sm">
                    {osrmLoading ? "Loading…" : "No data available"}
                  </p>
                )}
              </div>
            </div>
          </GlassCard>

          {/* ═══════════════════════════════════════════════════════════════════
            SECTION 7 — Market Heat
        ════════════════════════════════════════════════════════════════════ */}
          <GlassCard
            data-ocid="area_intel.market_heat.section"
            accentColor={heatColor(marketHeat)}
          >
            <SectionHeader
              icon={<Activity size={18} />}
              title="Market Heat"
              badge={investmentSentiment}
            />

            <div className="grid md:grid-cols-2 gap-6 items-start">
              {/* Heat gauge */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className="relative w-40 h-20 overflow-hidden"
                  style={{ borderRadius: "80px 80px 0 0" }}
                >
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        "conic-gradient(from 180deg, #3b82f6 0%, #f59e0b 50%, #ef4444 100%)",
                      opacity: 0.3,
                    }}
                  />
                  <div
                    className="absolute inset-3 rounded-full"
                    style={{ background: NAVY }}
                  />
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-16 w-1 rounded-full origin-bottom transition-transform duration-1000"
                    style={{
                      background: heatColor(marketHeat),
                      transform: `rotate(${(marketHeat / 100) * 180 - 90}deg)`,
                    }}
                  />
                </div>
                <div className="text-center">
                  <p
                    className="text-4xl font-bold"
                    style={{
                      color: heatColor(marketHeat),
                      fontFamily: "'Playfair Display', serif",
                    }}
                  >
                    {marketHeat}
                  </p>
                  <p className="text-white/40 text-xs">Heat Index / 100</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    label: "Supply Classification",
                    value: supplyClass,
                    color:
                      supplyClass === "Undersupplied"
                        ? "#10b981"
                        : supplyClass === "Balanced"
                          ? GOLD
                          : "#ef4444",
                  },
                  {
                    label: "Investment Sentiment",
                    value: investmentSentiment,
                    color:
                      investmentSentiment === "Bullish"
                        ? "#10b981"
                        : investmentSentiment === "Neutral"
                          ? GOLD
                          : "#f59e0b",
                  },
                  {
                    label: "Demand Pressure",
                    value:
                      areaIntel.demandScore >= 70
                        ? "Strong"
                        : areaIntel.demandScore >= 50
                          ? "Moderate"
                          : "Weak",
                    color: areaIntel.demandScore >= 70 ? "#10b981" : "#f59e0b",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <span className="text-white/50 text-sm">{item.label}</span>
                    <span
                      className="font-bold text-sm"
                      style={{ color: item.color }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}

                {/* Risk flags */}
                {investmentIntel.riskFlags.length > 0 && (
                  <div
                    className="rounded-xl p-3 space-y-1.5"
                    style={{
                      background: "rgba(239,68,68,0.06)",
                      border: "1px solid rgba(239,68,68,0.2)",
                    }}
                  >
                    <p className="text-red-400 text-xs font-semibold uppercase tracking-wide mb-2">
                      Risk Flags
                    </p>
                    {investmentIntel.riskFlags.map((f) => (
                      <div key={f} className="flex items-start gap-1.5">
                        <AlertTriangle
                          size={12}
                          className="text-red-400 mt-0.5 flex-shrink-0"
                        />
                        <p className="text-red-300/80 text-xs">{f}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

          {/* ═══════════════════════════════════════════════════════════════════
            SECTION 8 — ValuBrix Score
        ════════════════════════════════════════════════════════════════════ */}
          <GlassCard
            data-ocid="area_intel.valubrix_score.section"
            accentColor={GOLD}
          >
            <SectionHeader
              icon={<Sparkles size={18} />}
              title="ValuBrix Score"
            />

            <div className="grid md:grid-cols-2 gap-6 items-center">
              {/* Circular gauge */}
              <div className="flex flex-col items-center gap-4">
                <ScoreGauge score={valuBrixScore.total} size={140} />
                <div className="text-center">
                  <span
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold"
                    style={{
                      background:
                        valuBrixScore.tier === "Excellent"
                          ? "rgba(16,185,129,0.15)"
                          : valuBrixScore.tier === "Good"
                            ? "rgba(216,181,106,0.15)"
                            : valuBrixScore.tier === "Average"
                              ? "rgba(245,158,11,0.15)"
                              : "rgba(239,68,68,0.15)",
                      color:
                        valuBrixScore.tier === "Excellent"
                          ? "#10b981"
                          : valuBrixScore.tier === "Good"
                            ? GOLD
                            : valuBrixScore.tier === "Average"
                              ? "#f59e0b"
                              : "#ef4444",
                      border: "1px solid currentColor",
                    }}
                  >
                    <CheckCircle size={12} />
                    {valuBrixScore.tier}
                  </span>
                </div>
                <p className="text-white/50 text-sm text-center max-w-xs leading-relaxed">
                  {valuBrixScore.interpretation}
                </p>
              </div>

              {/* Score breakdown */}
              <div className="space-y-3">
                {[
                  {
                    label: "Growth",
                    score: valuBrixScore.growth,
                    detail: valuBrixScore.breakdown.growthLabel,
                    color: "#10b981",
                  },
                  {
                    label: "Liquidity",
                    score: valuBrixScore.liquidity,
                    detail: valuBrixScore.breakdown.liquidityLabel,
                    color: "#60a5fa",
                  },
                  {
                    label: "Yield",
                    score: valuBrixScore.yield,
                    detail: valuBrixScore.breakdown.yieldLabel,
                    color: yieldColor(rentalYield),
                  },
                  {
                    label: "Demand",
                    score: valuBrixScore.demand,
                    detail: valuBrixScore.breakdown.demandLabel,
                    color: "#a78bfa",
                  },
                  {
                    label: "Infrastructure",
                    score: valuBrixScore.infrastructure,
                    detail: valuBrixScore.breakdown.infraLabel,
                    color: GOLD,
                  },
                ].map((c) => (
                  <div key={c.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/60">{c.label}</span>
                      <span className="font-bold" style={{ color: c.color }}>
                        {c.score}/20
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(c.score / 20) * 100}%`,
                          backgroundColor: c.color,
                        }}
                      />
                    </div>
                    <p className="text-white/35 text-[10px]">{c.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* ═══════════════════════════════════════════════════════════════════
            SECTION 9 — Investment Intelligence
        ════════════════════════════════════════════════════════════════════ */}
          <GlassCard
            data-ocid="area_intel.investment_intelligence.section"
            accentColor="#10b981"
          >
            <SectionHeader
              icon={<ArrowUpRight size={18} />}
              title="Investment Intelligence"
            />

            <div className="grid md:grid-cols-3 gap-4 mb-5">
              {/* IRR */}
              <div
                className="rounded-xl p-4"
                style={{
                  background: "rgba(16,185,129,0.06)",
                  border: "1px solid rgba(16,185,129,0.2)",
                }}
              >
                <p className="text-white/40 text-xs uppercase tracking-wide mb-3">
                  IRR Projection
                </p>
                {[
                  {
                    label: "1 Year",
                    value: investmentIntel.irrProjection.oneYear,
                  },
                  {
                    label: "3 Year",
                    value: investmentIntel.irrProjection.threeYear,
                  },
                  {
                    label: "5 Year",
                    value: investmentIntel.irrProjection.fiveYear,
                  },
                ].map((r) => (
                  <div
                    key={r.label}
                    className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0"
                  >
                    <span className="text-white/50 text-sm">{r.label}</span>
                    <span className="text-emerald-400 font-bold">
                      {r.value}% p.a.
                    </span>
                  </div>
                ))}
              </div>

              {/* Capital Appreciation */}
              <div
                className="rounded-xl p-4"
                style={{
                  background: "rgba(216,181,106,0.06)",
                  border: `1px solid ${GOLD}30`,
                }}
              >
                <p className="text-white/40 text-xs uppercase tracking-wide mb-3">
                  Capital Appreciation
                </p>
                {[
                  {
                    label: "1 Year",
                    value: investmentIntel.capitalAppreciation.oneYear,
                  },
                  {
                    label: "3 Year",
                    value: investmentIntel.capitalAppreciation.threeYear,
                  },
                  {
                    label: "5 Year",
                    value: investmentIntel.capitalAppreciation.fiveYear,
                  },
                ].map((r) => (
                  <div
                    key={r.label}
                    className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0"
                  >
                    <span className="text-white/50 text-sm">{r.label}</span>
                    <span className="font-bold" style={{ color: GOLD }}>
                      {r.value}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Rental Income + ROI */}
              <div
                className="rounded-xl p-4"
                style={{
                  background: "rgba(96,165,250,0.06)",
                  border: "1px solid rgba(96,165,250,0.2)",
                }}
              >
                <p className="text-white/40 text-xs uppercase tracking-wide mb-3">
                  Returns (per 1000 sqft)
                </p>
                {[
                  {
                    label: "Monthly Rent",
                    value: `₹${investmentIntel.rentalIncomeProjection.monthly.toLocaleString("en-IN")}`,
                    color: "#60a5fa",
                  },
                  {
                    label: "Annual Rent",
                    value: `₹${Math.round(investmentIntel.rentalIncomeProjection.annual / 1000)}k`,
                    color: "#60a5fa",
                  },
                  {
                    label: "5-Year ROI",
                    value: `${investmentIntel.fiveYearROI}%`,
                    color: "#10b981",
                  },
                  {
                    label: "Payback Period",
                    value: `${investmentIntel.paybackPeriod} yrs`,
                    color: GOLD,
                  },
                ].map((r) => (
                  <div
                    key={r.label}
                    className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0"
                  >
                    <span className="text-white/50 text-sm">{r.label}</span>
                    <span
                      className="font-bold text-sm"
                      style={{ color: r.color }}
                    >
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk + Growth Drivers */}
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <RiskBadge level={investmentIntel.riskLevel} />
                  <span className="text-white/40 text-xs">
                    {investmentIntel.marketClassification}
                  </span>
                </div>
                {investmentIntel.riskFlags.length > 0 && (
                  <div className="space-y-1.5">
                    {investmentIntel.riskFlags.map((f) => (
                      <div key={f} className="flex items-start gap-2">
                        <AlertTriangle
                          size={12}
                          className="text-amber-400 mt-0.5 flex-shrink-0"
                        />
                        <p className="text-white/50 text-xs">{f}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wide mb-3">
                  Growth Drivers
                </p>
                <div className="space-y-1.5">
                  {investmentIntel.growthDrivers.map((d) => (
                    <div key={d} className="flex items-start gap-2">
                      <CheckCircle
                        size={12}
                        style={{ color: GOLD }}
                        className="mt-0.5 flex-shrink-0"
                      />
                      <p className="text-white/60 text-xs">{d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* ── CTA: Start Valuation ──────────────────────────────────────────────── */}
          {/* ═══════════════════════════════════════════════════════════════════
            PREMIUM: Full Geo Intelligence
        ════════════════════════════════════════════════════════════════════ */}
          <FullGeoIntelligenceCard
            locality={locality}
            lat={localityCoords.mapDisplayLat}
            lng={localityCoords.mapDisplayLng}
            propertyType={propertyType}
          />

          {/* ── CTA: Start Valuation ──────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3 pb-6">
            <button
              type="button"
              onClick={() => navigate({ to: "/valuation" })}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-black transition-all hover:scale-[1.02] hover:shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DIM} 100%)`,
              }}
              data-ocid="area_intel.cta.valuation_button"
            >
              <Sparkles size={16} />
              Start RealWorth AI Valuation
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/area/discover" })}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white/80 transition-all hover:bg-white/8"
              style={{ border: `1px solid ${GOLD}30` }}
              data-ocid="area_intel.cta.new_search_button"
            >
              <ArrowLeft size={16} />
              Search Another Area
            </button>
          </div>

          {/* Footer credit */}
          <p className="text-center text-white/20 text-xs pb-4">
            AI Research Report ·{" "}
            {new Date().toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
            })}{" "}
            ·{" "}
            <a
              href="https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=valubrix"
              className="hover:text-white/40 transition-colors"
            >
              Built with caffeine.ai
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
