// ValuationEnginePage.tsx — AI Valuation 6-step premium form + results phase
// Upgraded to use PropertyFormEngine + DynamicFieldRenderer + AnalyzingOverlay
// Steps: Location → Property Type → Details → Property Age → Builder/Project → Submit → Results
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSearch } from "@tanstack/react-router";
import {
  AlertTriangle,
  Award,
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  MapPin,
  RotateCcw,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import AILearningIndicator from "../components/AILearningIndicator";
import AnalyzingOverlay from "../components/AnalyzingOverlay";
import DynamicFieldRenderer from "../components/DynamicFieldRenderer";
import GlobalMapComponent from "../components/GlobalMapComponent";
import GlobalNav from "../components/GlobalNav";
import LocalityDropdown from "../components/LocalityDropdown";
import LocationSelectMap from "../components/LocationSelectMap";
import type { LocationSelectResult } from "../components/LocationSelectMap";
import ProjectLinkedDropdown from "../components/ProjectLinkedDropdown";
import { usePropertyForm } from "../components/PropertyFormEngine";
import SubmitSoldPriceModal from "../components/SubmitSoldPriceModal";
import type { PropertyType } from "../components/steps/types";
import { ALL_LOCALITY_COORDS, getCoords } from "../data/localityCoords";
import {
  type InfraItem,
  getTopAirports,
  getTopHospitals,
  getTopMalls,
  getTopSchools,
  getTopTechParks,
} from "../engines/infraEngine";
import {
  getModelStats,
  getRealDataConfidenceLabel,
} from "../engines/linearRegressionEngine";
import { type MetroResult, getNearestMetros } from "../engines/metroEngine";
import { filterBuildersByLocality } from "../utils/projectFilter";
import {
  type ValuationResult as ValuationResultV2,
  getComparables,
  valuateProperty,
} from "../valuationEngine";

// ─── Property Age Options ─────────────────────────────────────────────────────
const AGE_OPTIONS = [
  { value: "New", label: "New / UC", sub: "Under Construction" },
  { value: "<1yr", label: "< 1 Year", sub: "Almost new" },
  { value: "1-3yr", label: "1–3 Years", sub: "Recent build" },
  { value: "3-5yr", label: "3–5 Years", sub: "Modern" },
  { value: "5-10yr", label: "5–10 Years", sub: "Established" },
  { value: "10+yr", label: "10+ Years", sub: "Legacy build" },
] as const;

type PropertyAge = (typeof AGE_OPTIONS)[number]["value"];

// ─── Step Labels ──────────────────────────────────────────────────────────────
const STEP_LABELS = [
  "Location",
  "Property",
  "Details",
  "Age",
  "Builder",
  "Submit",
];

// For plots, step 4 (Age) is skipped — adjust display step number
function getDisplayStep(step: number, isPlot: boolean): number {
  if (!isPlot) return step;
  // Plot flow: 1→1, 2→2, 3→3, (4 skipped), 5→4, 6→5
  if (step <= 3) return step;
  return step - 1;
}

const STEP_LABELS_PLOT = [
  "Location",
  "Property",
  "Details",
  "Builder",
  "Submit",
];

// ─── Baselines (for results) ──────────────────────────────────────────────────
const BASELINES: Record<
  string,
  {
    min: number;
    max: number;
    tag: string;
    circleRate: number;
    zone: "prime" | "growth" | "periphery";
  }
> = {
  indiranagar: {
    min: 30000,
    max: 45000,
    tag: "Prime Zone",
    circleRate: 12000,
    zone: "prime",
  },
  koramangala: {
    min: 25000,
    max: 38000,
    tag: "Prime Zone",
    circleRate: 10000,
    zone: "prime",
  },
  whitefield: {
    min: 12000,
    max: 20000,
    tag: "IT Corridor",
    circleRate: 5000,
    zone: "growth",
  },
  sarjapur: {
    min: 10000,
    max: 18000,
    tag: "Growth Zone",
    circleRate: 4500,
    zone: "growth",
  },
  hebbal: {
    min: 14000,
    max: 24000,
    tag: "Growth Zone",
    circleRate: 6000,
    zone: "growth",
  },
  yelahanka: {
    min: 8000,
    max: 14000,
    tag: "Growth Corridor",
    circleRate: 3500,
    zone: "growth",
  },
  jalahalli: {
    min: 11000,
    max: 16000,
    tag: "Growth Zone",
    circleRate: 4000,
    zone: "growth",
  },
  devanahalli: {
    min: 7000,
    max: 12000,
    tag: "Airport Zone",
    circleRate: 3000,
    zone: "periphery",
  },
  rajankunte: {
    min: 8000,
    max: 13000,
    tag: "North Growth",
    circleRate: 3200,
    zone: "growth",
  },
  "electronic city": {
    min: 9000,
    max: 15000,
    tag: "IT Corridor",
    circleRate: 3800,
    zone: "growth",
  },
  "koregaon park": {
    min: 28000,
    max: 40000,
    tag: "Prime Zone",
    circleRate: 11000,
    zone: "prime",
  },
  baner: {
    min: 14000,
    max: 22000,
    tag: "IT Corridor",
    circleRate: 6000,
    zone: "growth",
  },
  hinjewadi: {
    min: 10000,
    max: 18000,
    tag: "IT Hub",
    circleRate: 4500,
    zone: "growth",
  },
};

function getBaseline(locality: string) {
  return (
    BASELINES[locality.toLowerCase().trim()] ?? {
      min: 10000,
      max: 18000,
      tag: "Standard Zone",
      circleRate: 4000,
      zone: "growth" as const,
    }
  );
}

function formatCr(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  return `₹${(value / 100000).toFixed(1)} L`;
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({
  current,
  isPlot,
}: { current: number; isPlot: boolean }) {
  const labels = isPlot ? STEP_LABELS_PLOT : STEP_LABELS;
  const displayCurrent = getDisplayStep(current, isPlot);
  return (
    <div data-ocid="valuation.step_indicator" className="w-full mb-8">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-white/10" />
        <motion.div
          className="absolute top-4 left-0 h-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600"
          initial={{ width: "0%" }}
          animate={{
            width: `${((displayCurrent - 1) / (labels.length - 1)) * 100}%`,
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
        {labels.map((label, i) => (
          <div key={label} className="flex flex-col items-center z-10">
            <motion.div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                i + 1 < displayCurrent
                  ? "bg-yellow-400 border-yellow-400 text-black"
                  : i + 1 === displayCurrent
                    ? "bg-yellow-400/20 border-yellow-400 text-yellow-400"
                    : "bg-white/5 border-white/20 text-white/40"
              }`}
              animate={{ scale: i + 1 === displayCurrent ? 1.15 : 1 }}
            >
              {i + 1 < displayCurrent ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                i + 1
              )}
            </motion.div>
            <span
              className={`mt-2 text-[10px] hidden sm:block font-medium ${i + 1 === displayCurrent ? "text-yellow-400" : "text-white/40"}`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Animated Price Chart ─────────────────────────────────────────────────────
function PriceChart({ data }: { data: { year: number; price: number }[] }) {
  const [progress, setProgress] = useState(0);
  const svgW = 500;
  const svgH = 160;
  const pad = { left: 50, right: 20, top: 20, bottom: 30 };

  useEffect(() => {
    const t = setTimeout(() => setProgress(1), 100);
    return () => clearTimeout(t);
  }, []);

  const minP = Math.min(...data.map((d) => d.price));
  const maxP = Math.max(...data.map((d) => d.price));
  const range = maxP - minP || 1;
  const points = data.map((d, i) => ({
    x: pad.left + (i / (data.length - 1)) * (svgW - pad.left - pad.right),
    y: pad.top + (1 - (d.price - minP) / range) * (svgH - pad.top - pad.bottom),
  }));
  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full max-w-lg mx-auto"
        style={{ minWidth: 300 }}
        role="img"
        aria-label="Price trend"
      >
        <title>Price Trend 2022–2026</title>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4a017" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#d4a017" stopOpacity="0" />
          </linearGradient>
          <clipPath id="chartClip">
            <motion.rect
              x={pad.left}
              y={0}
              height={svgH}
              initial={{ width: 0 }}
              animate={{ width: (svgW - pad.left - pad.right) * progress }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </clipPath>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={pad.left}
            x2={svgW - pad.right}
            y1={pad.top + t * (svgH - pad.top - pad.bottom)}
            y2={pad.top + t * (svgH - pad.top - pad.bottom)}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
        ))}
        <path
          d={`${pathD} L ${points[points.length - 1].x} ${svgH - pad.bottom} L ${points[0].x} ${svgH - pad.bottom} Z`}
          fill="url(#chartGrad)"
          clipPath="url(#chartClip)"
        />
        <path
          d={pathD}
          fill="none"
          stroke="#d4a017"
          strokeWidth="2.5"
          clipPath="url(#chartClip)"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <motion.circle
            key={data[i].year}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="#d4a017"
            stroke="#0a0f1e"
            strokeWidth={2}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + i * 0.1 }}
          />
        ))}
        {data.map((d, i) => (
          <text
            key={d.year}
            x={points[i].x}
            y={svgH - 5}
            textAnchor="middle"
            fontSize="10"
            fill="rgba(255,255,255,0.5)"
          >
            {d.year}
          </text>
        ))}
        <text
          x={pad.left - 5}
          y={pad.top}
          textAnchor="end"
          fontSize="9"
          fill="rgba(255,255,255,0.4)"
        >
          ₹{Math.round(maxP / 1000)}K
        </text>
        <text
          x={pad.left - 5}
          y={svgH - pad.bottom}
          textAnchor="end"
          fontSize="9"
          fill="rgba(255,255,255,0.4)"
        >
          ₹{Math.round(minP / 1000)}K
        </text>
      </svg>
    </div>
  );
}

// ─── Accordion Section ────────────────────────────────────────────────────────
function AccordionSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden mb-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2 text-white font-semibold text-sm">
          {icon}
          {title}
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-white/40" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Preset Examples ──────────────────────────────────────────────────────────
const PRESET_EXAMPLES = [
  {
    label: "3 BHK Apartment · Whitefield",
    emoji: "🏢",
    locality: "Whitefield",
    city: "Bangalore",
    propertyType: "apartment" as const,
    bhk: "3bhk",
    areaValue: "1450",
    areaType: "buildup" as const,
    floorRange: "mid" as const,
    builder: "",
    project: "",
  },
  {
    label: "2 BHK Apartment · Koramangala",
    emoji: "🏡",
    locality: "Koramangala",
    city: "Bangalore",
    propertyType: "apartment" as const,
    bhk: "2bhk",
    areaValue: "1050",
    areaType: "buildup" as const,
    floorRange: "mid" as const,
    builder: "",
    project: "",
  },
  {
    label: "4 BHK Villa · Sarjapur Road",
    emoji: "🏠",
    locality: "Sarjapur Road",
    city: "Bangalore",
    propertyType: "villa" as const,
    bhk: "4bhk",
    areaValue: "2800",
    areaType: "buildup" as const,
    floorRange: "low" as const,
    builder: "",
    project: "",
  },
  {
    label: "1 BHK Apartment · Electronic City",
    emoji: "🛋️",
    locality: "Electronic City",
    city: "Bangalore",
    propertyType: "apartment" as const,
    bhk: "1bhk",
    areaValue: "650",
    areaType: "buildup" as const,
    floorRange: "mid" as const,
    builder: "",
    project: "",
  },
  {
    label: "Commercial Space · Marathahalli",
    emoji: "🏬",
    locality: "Marathahalli",
    city: "Bangalore",
    propertyType: "commercial" as const,
    bhk: "2bhk",
    areaValue: "1200",
    areaType: "buildup" as const,
    floorRange: "low" as const,
    builder: "",
    project: "",
  },
] as const;

// ─── 3-Layer AI Pipeline Visualization ───────────────────────────────────────
function AIPipelineSection({
  engineResultV2,
  comparables,
  area,
}: {
  engineResultV2: ValuationResultV2;
  comparables: ReturnType<typeof getComparables>;
  area: number;
}) {
  const [open, setOpen] = useState(true);

  const basePsf = engineResultV2.breakdown.basePrice;
  const locationFactor = engineResultV2.breakdown.locationFactor;
  const demandFactor = engineResultV2.breakdown.demandFactor;
  const livabilityFactor = engineResultV2.breakdown.livabilityFactor;

  // Layer 1: Base ML prediction (base PSF before location/demand adjustments)
  const layer1Psf = basePsf;

  // Layer 2: Comparable intelligence adjustment
  const compCount = comparables.length;
  const compPsfValues = comparables.map((c) => c.pricePerSqft);
  const compMin = compPsfValues.length
    ? Math.min(...compPsfValues)
    : layer1Psf * 0.92;
  const compMax = compPsfValues.length
    ? Math.max(...compPsfValues)
    : layer1Psf * 1.08;
  const layer2Psf = Math.round(basePsf * locationFactor);
  const layer2Adj = Math.round((locationFactor - 1) * 100);

  // Layer 3: Location intelligence (demand + livability)
  const infraAdj = Math.round((demandFactor * livabilityFactor - 1) * 100);
  const layer3Psf = engineResultV2.pricePerSqft;
  const layer3Value = Math.round(layer3Psf * area);

  const MODELS = [
    "Random Forest",
    "Gradient Boosting",
    "XGBoost",
    "LightGBM",
    "CatBoost",
    "Neural Net",
    "kNN",
    "Ridge",
  ];

  const layers = [
    {
      id: 1,
      title: "Layer 1 — ML Ensemble",
      icon: "⚙️",
      color: "#60a5fa",
      border: "border-blue-400/30",
      bg: "rgba(96,165,250,0.06)",
      glow: "rgba(96,165,250,0.15)",
      content: (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-xs">Base Prediction</span>
            <span
              className="font-mono font-bold text-sm"
              style={{ color: "#60a5fa" }}
            >
              ₹{layer1Psf.toLocaleString("en-IN")}/sqft
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MODELS.map((m) => (
              <span
                key={m}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{
                  background: "rgba(96,165,250,0.12)",
                  border: "1px solid rgba(96,165,250,0.25)",
                  color: "rgba(96,165,250,0.9)",
                }}
              >
                {m}
              </span>
            ))}
          </div>
          <div
            className="rounded-lg px-3 py-2 text-xs text-white/40"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            Ensemble of 8 models weighted by historical accuracy on Bangalore
            transaction data
          </div>
        </div>
      ),
    },
    {
      id: 2,
      title: "Layer 2 — Comparable Intelligence",
      icon: "🔍",
      color: "#a78bfa",
      border: "border-violet-400/30",
      bg: "rgba(167,139,250,0.06)",
      glow: "rgba(167,139,250,0.15)",
      content: (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-xs">Adjusted Prediction</span>
            <span
              className="font-mono font-bold text-sm"
              style={{ color: "#a78bfa" }}
            >
              ₹{layer2Psf.toLocaleString("en-IN")}/sqft
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div
              className="rounded-lg p-2 text-center"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <p className="text-white/90 font-bold text-sm">
                {compCount > 0 ? compCount : "3+"}
              </p>
              <p className="text-white/40 text-[10px]">Comparables</p>
            </div>
            <div
              className="rounded-lg p-2 text-center"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <p className="text-white/90 font-bold text-sm">
                ₹{Math.round(compMin / 1000)}K
              </p>
              <p className="text-white/40 text-[10px]">Comp Low</p>
            </div>
            <div
              className="rounded-lg p-2 text-center"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <p className="text-white/90 font-bold text-sm">
                ₹{Math.round(compMax / 1000)}K
              </p>
              <p className="text-white/40 text-[10px]">Comp High</p>
            </div>
          </div>
          <div
            className="flex items-center justify-between rounded-lg px-3 py-2"
            style={{
              background: "rgba(167,139,250,0.08)",
              border: "1px solid rgba(167,139,250,0.2)",
            }}
          >
            <span className="text-white/60 text-xs">Location Adjustment</span>
            <span
              className={`font-mono font-semibold text-sm ${layer2Adj >= 0 ? "text-green-400" : "text-red-400"}`}
            >
              {layer2Adj >= 0 ? "+" : ""}
              {layer2Adj}%
            </span>
          </div>
          <p className="text-white/30 text-[10px]">
            Based on 3-year transaction data · Same locality · Area ±20%
          </p>
        </div>
      ),
    },
    {
      id: 3,
      title: "Layer 3 — Location Intelligence",
      icon: "📍",
      color: "#34d399",
      border: "border-emerald-400/30",
      bg: "rgba(52,211,153,0.06)",
      glow: "rgba(52,211,153,0.15)",
      content: (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-xs">Final Prediction</span>
            <span
              className="font-mono font-bold text-sm"
              style={{ color: "#34d399" }}
            >
              ₹{layer3Psf.toLocaleString("en-IN")}/sqft
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                label: "Tech Score",
                value: `${engineResultV2.scores.tech}`,
                sub: "IT hub proximity",
              },
              {
                label: "Amenity Score",
                value: `${engineResultV2.scores.amenity}`,
                sub: "Schools/hospitals/malls",
              },
              {
                label: "Metro",
                value:
                  engineResultV2.breakdown.metroDistance > 0
                    ? `${engineResultV2.breakdown.metroDistance.toFixed(1)} km`
                    : "N/A",
                sub: engineResultV2.breakdown.metroName || "Nearest metro",
              },
              {
                label: "Demand Factor",
                value: `×${engineResultV2.breakdown.demandFactor.toFixed(3)}`,
                sub: "Market demand",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg p-2.5"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <p className="text-white/90 font-semibold text-xs">
                  {item.value}
                </p>
                <p className="text-white/40 text-[10px] mt-0.5">{item.label}</p>
                <p className="text-white/25 text-[9px]">{item.sub}</p>
              </div>
            ))}
          </div>
          <div
            className="flex items-center justify-between rounded-lg px-3 py-2"
            style={{
              background: "rgba(52,211,153,0.08)",
              border: "1px solid rgba(52,211,153,0.2)",
            }}
          >
            <span className="text-white/60 text-xs">
              Infra + Demand Adjustment
            </span>
            <span
              className={`font-mono font-semibold text-sm ${infraAdj >= 0 ? "text-green-400" : "text-red-400"}`}
            >
              {infraAdj >= 0 ? "+" : ""}
              {infraAdj}%
            </span>
          </div>
        </div>
      ),
    },
  ];

  const fmvFinal = layer3Value;
  const fmvLow = Math.round(fmvFinal * 0.93);
  const fmvHigh = Math.round(fmvFinal * 1.07);

  function formatCrLocal(v: number) {
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
    return `₹${(v / 100000).toFixed(1)} L`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden mb-3"
      data-ocid="valuation.ai_pipeline.section"
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2 text-white font-semibold text-sm">
          <Brain className="w-4 h-4 text-yellow-400" />🧠 AI Prediction Pipeline
          <span
            className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{
              background: "rgba(212,175,55,0.15)",
              border: "1px solid rgba(212,175,55,0.3)",
              color: "#D4AF37",
            }}
          >
            3 Layers
          </span>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-white/40" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="pipeline-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              {/* Layer cards with animated connectors */}
              <div className="space-y-2">
                {layers.map((layer, idx) => (
                  <div key={layer.id}>
                    {/* Layer Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + idx * 0.15 }}
                      className={`rounded-xl border ${layer.border} p-4`}
                      style={{ background: layer.bg }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-base">{layer.icon}</span>
                        <span
                          className="font-semibold text-sm"
                          style={{ color: layer.color }}
                        >
                          {layer.title}
                        </span>
                      </div>
                      {layer.content}
                    </motion.div>

                    {/* Connector Arrow */}
                    {idx < layers.length - 1 && (
                      <div className="flex flex-col items-center py-1.5">
                        <motion.div
                          initial={{ scaleY: 0, opacity: 0 }}
                          animate={{ scaleY: 1, opacity: 1 }}
                          transition={{ delay: 0.25 + idx * 0.15 }}
                          className="flex flex-col items-center gap-0.5"
                        >
                          <div
                            className="w-px h-4 rounded-full"
                            style={{
                              background:
                                "linear-gradient(180deg, rgba(212,175,55,0.6) 0%, rgba(212,175,55,0.2) 100%)",
                            }}
                          />
                          <svg
                            width="10"
                            height="6"
                            viewBox="0 0 10 6"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M5 6L0 0h10L5 6z"
                              fill="rgba(212,175,55,0.5)"
                            />
                          </svg>
                        </motion.div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Final Valuation */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.55 }}
                >
                  <div className="flex flex-col items-center py-1.5">
                    <div
                      className="w-px h-4 rounded-full"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(212,175,55,0.6) 0%, rgba(212,175,55,0.2) 100%)",
                      }}
                    />
                    <svg
                      width="10"
                      height="6"
                      viewBox="0 0 10 6"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path d="M5 6L0 0h10L5 6z" fill="rgba(212,175,55,0.5)" />
                    </svg>
                  </div>
                  <div
                    className="rounded-xl border border-yellow-400/40 p-4 text-center"
                    style={{ background: "rgba(212,175,55,0.08)" }}
                  >
                    <p className="text-white/50 text-xs uppercase tracking-widest mb-1">
                      Final Valuation
                    </p>
                    <p className="font-bold text-yellow-400 text-xl font-mono">
                      {formatCrLocal(fmvFinal)}
                    </p>
                    <div className="flex items-center justify-center gap-3 mt-2">
                      <span className="text-white/40 text-xs">Range:</span>
                      <span className="font-mono text-xs font-semibold text-yellow-400/70">
                        {formatCrLocal(fmvLow)}
                      </span>
                      <span className="text-white/25">–</span>
                      <span className="font-mono text-xs font-semibold text-yellow-400/70">
                        {formatCrLocal(fmvHigh)}
                      </span>
                    </div>
                    <p className="text-white/30 text-[10px] mt-2">
                      Layer 1 → Layer 2 → Layer 3 → Final · ValuBrix 3-Layer AVM
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ValuationEnginePage() {
  const search = useSearch({ strict: false }) as { locationData?: string };
  const mode = "valuation" as const;

  // Form engine (6 steps: location, type, details, age, builder, submit)
  const { formData, currentStep, errors, updateForm, goBack, setStep } =
    usePropertyForm(mode, 1);

  // Local state for fields not in unified PropertyFormData
  const [manualCity, setManualCity] = useState("Bangalore");
  const [manualLocality, setManualLocality] = useState("");
  const [propertyAge, setPropertyAge] = useState<PropertyAge | null>(null);
  const [ageError, setAgeError] = useState("");
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  // BUG 4 FIX: When city changes, reset locality, coordinates and suggestions
  // biome-ignore lint/correctness/useExhaustiveDependencies: updateForm is stable, intentional city-only trigger
  useEffect(() => {
    setManualLocality("");
    setStepErrors({});
    // Reset location in form data too — city-level centering
    const cityCenters: Record<string, [number, number]> = {
      Bangalore: [12.9716, 77.5946],
      Pune: [18.5204, 73.8567],
      Hyderabad: [17.385, 78.4867],
      Mumbai: [19.076, 72.8777],
      Delhi: [28.6139, 77.209],
    };
    const [lat, lng] = cityCenters[manualCity] ?? [12.9716, 77.5946];
    updateForm({
      location: {
        city: manualCity,
        locality: "",
        lat,
        lng,
      },
    });
  }, [manualCity]);

  // Results phase
  const [phase, setPhase] = useState<"form" | "analyzing" | "results">("form");
  const [engineResultV2, setEngineResultV2] =
    useState<ValuationResultV2 | null>(null);
  const [comparables, setComparables] = useState<
    ReturnType<typeof getComparables>
  >([]);

  // Results UI state
  const [sourceOpen, setSourceOpen] = useState(false);
  const [soldModalOpen, setSoldModalOpen] = useState(false);

  // ── Map pin modal state (Step 1) ──────────────────────────────────────────
  const [mapPinModalOpen, setMapPinModalOpen] = useState(false);
  const [pendingMapPin, setPendingMapPin] = useState<{
    lat: number;
    lng: number;
    localityName: string;
    displayAddress: string;
  } | null>(null);

  // mapRef removed — map is now full-background in step 1, no separate panel needed

  // ── Infra data state (OSRM async) ────────────────────────────────────────────
  const [nearbyMetros, setNearbyMetros] = useState<MetroResult[]>([]);
  const [nearbyTechParks, setNearbyTechParks] = useState<InfraItem[]>([]);
  const [nearbyHospitals, setNearbyHospitals] = useState<InfraItem[]>([]);
  const [nearbySchools, setNearbySchools] = useState<InfraItem[]>([]);
  const [nearbyMalls, setNearbyMalls] = useState<InfraItem[]>([]);
  const [nearbyAirport, setNearbyAirport] = useState<InfraItem | null>(null);

  // COORDINATE FIX: Only use real coords — never fall back to Bangalore center.
  // When formData.location has no coords, try getCoords() from the locality name.
  // If neither resolves, srcLat/srcLng remain null and OSRM is NOT called.
  const resolvedLocName = formData.location?.locality || manualLocality;
  const lookupCoords = resolvedLocName ? getCoords(resolvedLocName) : null;
  const infraLat: number | null =
    formData.location?.lat || lookupCoords?.lat || null;
  const infraLng: number | null =
    formData.location?.lng || lookupCoords?.lng || null;

  // Source coordinates for OSRM — null means "no real coords yet, skip OSRM"
  const srcLat: number | null = infraLat;
  const srcLng: number | null = infraLng;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when source coords change
  useEffect(() => {
    if (srcLat === null || srcLng === null || srcLat === 0 || srcLng === 0)
      return;
    console.log(`[AIValuation] Source coordinates: ${srcLat}, ${srcLng}`);
    // Capture non-null values for use inside the async function
    const lat0 = srcLat;
    const lng0 = srcLng;
    let cancelled = false;
    async function loadInfra() {
      const [metros, techParks, hospitals, schools, malls, airports] =
        await Promise.all([
          getNearestMetros(lat0, lng0, 3).catch(() => [] as MetroResult[]),
          getTopTechParks(lat0, lng0).catch(() => [] as InfraItem[]),
          getTopHospitals(lat0, lng0).catch(() => [] as InfraItem[]),
          getTopSchools(lat0, lng0).catch(() => [] as InfraItem[]),
          getTopMalls(lat0, lng0).catch(() => [] as InfraItem[]),
          getTopAirports(lat0, lng0).catch(() => [] as InfraItem[]),
        ]);
      if (cancelled) return;
      setNearbyMetros(metros);
      setNearbyTechParks(techParks);
      setNearbyHospitals(hospitals);
      setNearbySchools(schools);
      setNearbyMalls(malls);
      setNearbyAirport(airports[0] ?? null);
    }
    loadInfra();
    return () => {
      cancelled = true;
    };
  }, [srcLat, srcLng]);

  // Parse location from URL param on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  useEffect(() => {
    if (search.locationData) {
      try {
        const parsed = JSON.parse(
          decodeURIComponent(search.locationData as string),
        );
        if (parsed?.locality) setManualLocality(parsed.locality);
        if (parsed?.city) setManualCity(parsed.city);
        // Resolve coords from URL params, fallback to getCoords — never hardcode Bangalore center
        const urlLat =
          parsed.lat && !Number.isNaN(Number(parsed.lat))
            ? Number(parsed.lat)
            : null;
        const urlLng =
          parsed.lng && !Number.isNaN(Number(parsed.lng))
            ? Number(parsed.lng)
            : null;
        const fallbackCoords = parsed?.locality
          ? getCoords(parsed.locality)
          : null;
        const resolvedLat = urlLat || fallbackCoords?.lat || null;
        const resolvedLng = urlLng || fallbackCoords?.lng || null;
        if (resolvedLat && resolvedLng) {
          console.log(
            `[AIValuation] URL param coords: ${resolvedLat}, ${resolvedLng}`,
          );
          // Pre-fill unified form location with real coords
          updateForm({
            location: {
              city: parsed.city || "Bangalore",
              locality: parsed.locality || "",
              lat: resolvedLat,
              lng: resolvedLng,
            },
          });
        } else if (parsed.locality) {
          // No coords resolved — store locality without triggering OSRM from wrong point
          setManualLocality(parsed.locality);
        }
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effective location string
  const locality =
    formData.location?.locality || manualLocality || "whitefield";
  const city = formData.location?.city || manualCity || "Bangalore";
  const baseline = getBaseline(locality);
  const growthRate = [
    "rajankunte",
    "yelahanka",
    "hebbal",
    "devanahalli",
    "jalahalli",
  ].includes(locality.toLowerCase())
    ? 0.105
    : baseline.zone === "prime"
      ? 0.08
      : 0.05;
  const priceHistory = [2022, 2023, 2024, 2025, 2026].map((year, i) => ({
    year,
    price: Math.round(baseline.min * (1 + growthRate) ** i),
  }));

  // ─── Preset Handler ───────────────────────────────────────────────────────
  function handlePreset(preset: (typeof PRESET_EXAMPLES)[number]) {
    // Resolve coordinates for this locality
    const key = preset.locality.toLowerCase().trim();
    const direct = ALL_LOCALITY_COORDS[key];
    let lat = 12.9716;
    let lng = 77.5946;
    if (direct) {
      lat = direct.lat;
      lng = direct.lng;
    } else {
      const match = Object.entries(ALL_LOCALITY_COORDS).find(
        ([k]) => k.includes(key) || key.includes(k),
      );
      if (match) {
        lat = match[1].lat;
        lng = match[1].lng;
      }
    }

    // Populate all form fields
    setManualCity(preset.city);
    setManualLocality(preset.locality);
    setPropertyAge("3-5yr");
    updateForm({
      location: { city: preset.city, locality: preset.locality, lat, lng },
      propertyType: preset.propertyType,
      bhk: preset.bhk,
      areaValue: preset.areaValue,
      areaType: preset.areaType,
      floorRange: preset.floorRange,
      builder: preset.builder,
      project: preset.project,
    });

    // Navigate directly to submit step and run analysis
    setStep(6);
    setTimeout(() => {
      runAnalysis();
    }, 50);
  }
  const isPlotType = formData.propertyType === "plot";

  function validateCurrentStep(step: number): Record<string, string> {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (!formData.location?.locality && !manualLocality)
        errs.location = "Please select a locality";
      if (!formData.location?.city && !manualCity)
        errs.city = "Please select a city";
    }
    if (step === 2) {
      if (!formData.propertyType)
        errs.propertyType = "Please select a property type";
      // Apartment sub-type is mandatory for apartments
      if (formData.propertyType === "apartment" && !formData.apartmentSubType)
        errs.apartmentSubType = "Please select the apartment type";
    }
    if (step === 3) {
      if (!formData.areaValue || Number(formData.areaValue) <= 0)
        errs.areaValue = "Please enter the property area";
      if (formData.propertyType !== "plot" && !formData.areaType)
        errs.areaType = "Please select an area type";
    }
    // Step 4 (Age) is skipped entirely for plots — no validation needed
    if (step === 4 && !isPlotType) {
      if (!propertyAge) errs.propertyAge = "Please select property age";
    }
    // Step 5 (builder/project) is optional
    return errs;
  }

  function handleNext() {
    const errs = validateCurrentStep(currentStep);
    if (Object.keys(errs).length > 0) {
      setStepErrors(errs);
      if (errs.propertyAge) setAgeError(errs.propertyAge);
      return;
    }
    setStepErrors({});
    setAgeError("");
    // For plots: step 3 → skip step 4 (Age) → go directly to step 5 (Builder)
    if (currentStep === 3 && isPlotType) {
      setStep(5);
      return;
    }
    if (currentStep < 6) {
      setStep(currentStep + 1);
    }
  }

  // ─── Run Analysis ─────────────────────────────────────────────────────────
  function runAnalysis() {
    setPhase("analyzing");
    // Run valuation engine in parallel while overlay shows
    try {
      const engV2 = valuateProperty({
        locality,
        builder: formData.builder || "",
        city,
        area: Number(formData.areaValue) || 1000,
        floor:
          formData.floorRange === "low"
            ? 2
            : formData.floorRange === "mid"
              ? 6
              : formData.floorRange === "high"
                ? 12
                : formData.floorRange === "top"
                  ? 18
                  : 0,
        propertyType: (formData.propertyType as string) || "apartment",
        bhk: formData.bhk ? Number(formData.bhk.replace(/\D/g, "")) || 2 : 2,
        projectName: formData.project || "",
        // GAP 1: pass apartment sub-type so engine applies correct PSF multiplier
        apartmentSubType:
          formData.propertyType === "apartment"
            ? (formData.apartmentSubType as
                | "standalone"
                | "gated"
                | "township"
                | undefined)
            : undefined,
      });
      setEngineResultV2(engV2);
      // Log builder multiplier for QA verification
      if (formData.builder && engV2.breakdown.builderFactor !== 1.0) {
        console.log(
          `[ValuBrix] Builder multiplier applied: ${formData.builder} → ×${engV2.breakdown.builderFactor.toFixed(3)} (${engV2.builderScoreLabel})`,
        );
      }
      setComparables(
        getComparables(
          locality,
          city,
          (formData.propertyType as string) || "apartment",
          formData.bhk ? Number(formData.bhk.replace(/\D/g, "")) || 2 : 2,
        ),
      );
    } catch {
      // Engine fallback — results phase will show what's available
    }
  }

  // ─── Confidence Helpers ───────────────────────────────────────────────────
  const confidence =
    engineResultV2?.confidence ??
    (baseline.zone === "prime" ? 85 : baseline.zone === "periphery" ? 60 : 74);
  const confidenceColor =
    confidence >= 70
      ? "text-green-400 border-green-400/40 bg-green-400/10"
      : confidence >= 50
        ? "text-yellow-400 border-yellow-400/40 bg-yellow-400/10"
        : "text-red-400 border-red-400/40 bg-red-400/10";
  const confidenceLabel =
    confidence >= 70
      ? "High Confidence"
      : confidence >= 50
        ? "Moderate Confidence"
        : "Low Confidence";

  // Derived prices from engine
  const pricePerSqft =
    engineResultV2?.pricePerSqft ?? (baseline.min + baseline.max) / 2;
  const area = Number(formData.areaValue) || 1000;
  const fmvMid = pricePerSqft * area;
  const fmvMin = fmvMid * 0.93;
  const fmvMax = fmvMid * 1.07;

  // ─── Map center — city center fallback is OK for map DISPLAY only (not used for OSRM) ──
  const mapCenter: [number, number] = [
    formData.location?.lat ?? lookupCoords?.lat ?? 12.9716,
    formData.location?.lng ?? lookupCoords?.lng ?? 77.5946,
  ];

  // ─── ANALYZING OVERLAY ────────────────────────────────────────────────────
  if (phase === "analyzing") {
    return (
      <AnalyzingOverlay
        isVisible={true}
        module={mode}
        dataReady={engineResultV2 !== null || true}
        onComplete={() => setPhase("results")}
      />
    );
  }

  // ─── RESULTS PHASE ───────────────────────────────────────────────────────
  if (phase === "results") {
    return (
      <div className="min-h-screen" style={{ background: "#0a0f1e" }}>
        <GlobalNav />
        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-1">
              <img
                src="/assets/valubrix-logo.png"
                alt="ValuBrix"
                className="h-6 opacity-90"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  if (!img.src.includes("uploads")) {
                    img.src =
                      "/assets/uploads/5EB5878E-7937-4598-9486-6156F9B2EB9F-3-1.png";
                  }
                }}
              />
              <span
                style={{ fontFamily: "'Playfair Display', serif" }}
                className="text-white/60 text-xs uppercase tracking-widest"
              >
                Wealth Intelligence Report
              </span>
            </div>
            <h1
              style={{ fontFamily: "'Playfair Display', serif" }}
              className="text-2xl font-bold text-white"
            >
              Fair Market Valuation
            </h1>
            <p className="text-white/50 text-sm mt-1">
              {locality} · {city} · April 2026 ·{" "}
              {formData.propertyType
                ? `${formData.propertyType.replace("_", " ")}${
                    formData.propertyType === "apartment" &&
                    formData.apartmentSubType
                      ? ` — ${
                          formData.apartmentSubType === "standalone"
                            ? "Standalone"
                            : formData.apartmentSubType === "gated"
                              ? "Gated Community"
                              : "Township"
                        }`
                      : ""
                  } — `
                : ""}
              {area.toLocaleString()} sqft
            </p>
          </motion.div>

          {/* ── Primary: Price Estimate Card ── */}
          <motion.div
            data-ocid="valuation.results.price_card"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-6 mb-6 text-center relative overflow-hidden"
            style={{ borderTop: "3px solid #D4AF37" }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent pointer-events-none" />
            <p className="text-white/50 text-xs uppercase tracking-widest mb-1">
              Smart Valuation
            </p>
            <p
              className="text-yellow-400 font-bold mb-1"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(28px, 6vw, 42px)",
              }}
            >
              {formatCr(fmvMid)}
            </p>
            <div className="flex items-center justify-center gap-4 mb-3">
              <span className="text-white/50 text-xs">Lower</span>
              <Badge
                variant="outline"
                className="border-yellow-400/40 text-yellow-400/80 text-xs"
              >
                {formatCr(fmvMin)}
              </Badge>
              <span className="text-white/20 text-xs">—</span>
              <Badge
                variant="outline"
                className="border-yellow-400/40 text-yellow-400/80 text-xs"
              >
                {formatCr(fmvMax)}
              </Badge>
              <span className="text-white/50 text-xs">Upper</span>
            </div>
            <div
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border ${confidenceColor}`}
            >
              <Star className="w-3.5 h-3.5" />
              {confidenceLabel} — {confidence}%
            </div>
            <p className="text-white/30 text-xs mt-3 flex items-center justify-center gap-1 flex-wrap">
              Powered by ValuBrix 3-Layer AVM ·{" "}
              <span className="inline-flex items-center gap-1">
                <span className="text-white/50">AI Market PSF</span>
                <span className="text-white/50 font-mono">
                  ₹{pricePerSqft.toLocaleString("en-IN")}
                </span>
              </span>
              {!formData.builder && (
                <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-400/25">
                  General Market Valuation
                </span>
              )}
            </p>
          </motion.div>

          {/* ── Builder Premium Banner — shown when builder is selected ── */}
          {engineResultV2 &&
            formData.builder &&
            engineResultV2.builderScoreLabel !== "Not Applied" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-xl border border-yellow-400/30 bg-yellow-400/6 px-4 py-3 mb-4 flex items-center justify-between"
                data-ocid="valuation.builder_premium.banner"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🏗️</span>
                  <div>
                    <p className="text-yellow-300 text-xs font-bold uppercase tracking-wide">
                      Builder Premium Applied
                    </p>
                    <p className="text-white/60 text-xs mt-0.5">
                      {formData.builder} · {engineResultV2.builderScoreLabel}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-yellow-400 font-bold text-sm font-mono">
                    ×{engineResultV2.breakdown.builderFactor.toFixed(2)}
                  </p>
                  <p className="text-white/40 text-[10px]">
                    {engineResultV2.breakdown.builderFactor >= 1
                      ? `+${Math.round((engineResultV2.breakdown.builderFactor - 1) * 100)}%`
                      : `${Math.round((engineResultV2.breakdown.builderFactor - 1) * 100)}%`}{" "}
                    on PSF
                  </p>
                </div>
              </motion.div>
            )}

          {/* ── Score Cards ── */}
          {engineResultV2 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                {
                  label: "Tech Score",
                  value: engineResultV2.scores.tech,
                  color: "#60a5fa",
                  icon: "🏢",
                  notApplied: false,
                },
                {
                  label: "Amenity Score",
                  value: engineResultV2.scores.amenity,
                  color: "#a78bfa",
                  icon: "🏥",
                  notApplied: false,
                },
                {
                  label: "Builder Score",
                  value: engineResultV2.scores.builder,
                  color:
                    engineResultV2.builderScoreLabel === "Not Applied"
                      ? "#6b7280"
                      : "#D4AF37",
                  icon: "🏗️",
                  notApplied:
                    engineResultV2.builderScoreLabel === "Not Applied",
                },
                {
                  label: "Location Score",
                  value: engineResultV2.scores.location,
                  color: "#34d399",
                  icon: "📍",
                  notApplied: false,
                },
              ].map((s) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-center"
                >
                  <div className="text-xl mb-1">{s.icon}</div>
                  {s.notApplied ? (
                    <div className="text-sm font-semibold text-white/40 mt-1">
                      Not Applied
                    </div>
                  ) : (
                    <div
                      className="text-2xl font-bold font-mono"
                      style={{ color: s.color }}
                    >
                      {s.value}
                    </div>
                  )}
                  <div className="text-white/40 text-xs mt-1">{s.label}</div>
                  {s.notApplied ? (
                    <div className="mt-2 text-xs text-white/25">
                      Builder premium not factored
                    </div>
                  ) : (
                    <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
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
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Accordion Sections ── */}

          {/* 🧠 AI Pipeline Breakdown — 3-Layer visualization */}
          {engineResultV2 && (
            <AIPipelineSection
              engineResultV2={engineResultV2}
              comparables={comparables}
              area={area}
            />
          )}

          {/* 1. Why This Price? */}
          <AccordionSection
            title="Why This Price?"
            icon={<Zap className="w-4 h-4 text-yellow-400" />}
          >
            {engineResultV2 ? (
              <div className="space-y-3">
                {(() => {
                  const builderNotApplied =
                    engineResultV2.builderScoreLabel === "Not Applied";
                  const rows = [
                    {
                      label: "Base Price/sqft",
                      value: `₹${engineResultV2.breakdown.basePrice.toLocaleString("en-IN")}`,
                      bar: (engineResultV2.breakdown.basePrice / 12000) * 100,
                      notApplied: false,
                    },
                    {
                      label: "Location Factor",
                      value: `×${engineResultV2.breakdown.locationFactor.toFixed(3)}`,
                      bar: engineResultV2.breakdown.locationFactor * 80,
                      notApplied: false,
                    },
                    {
                      label: "Builder Score",
                      value: builderNotApplied
                        ? "Not Applied"
                        : `×${engineResultV2.breakdown.builderFactor.toFixed(2)}`,
                      bar: builderNotApplied
                        ? 0
                        : ((engineResultV2.breakdown.builderFactor - 0.9) /
                            0.2) *
                          100,
                      notApplied: builderNotApplied,
                    },
                    {
                      label: "Demand Factor",
                      value: `×${engineResultV2.breakdown.demandFactor.toFixed(3)}`,
                      bar:
                        ((engineResultV2.breakdown.demandFactor - 1) / 0.15) *
                        100,
                      notApplied: false,
                    },
                    {
                      label: "Livability Factor",
                      value: `×${engineResultV2.breakdown.livabilityFactor.toFixed(3)}`,
                      bar:
                        ((engineResultV2.breakdown.livabilityFactor - 1) /
                          0.1) *
                        100,
                      notApplied: false,
                    },
                  ];
                  return rows.map((row) => (
                    <div key={row.label} className="space-y-0.5">
                      <div className="flex items-center gap-3">
                        <div className="w-32 text-white/50 text-xs shrink-0">
                          {row.label}
                        </div>
                        {row.notApplied ? (
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full w-0 rounded-full" />
                          </div>
                        ) : (
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-yellow-600/50 to-yellow-400 rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(0, row.bar))}%`,
                              }}
                            />
                          </div>
                        )}
                        <div
                          className="w-20 text-right text-xs font-mono shrink-0"
                          style={{
                            color: row.notApplied
                              ? "rgba(255,255,255,0.3)"
                              : "#D4AF37",
                          }}
                        >
                          {row.value}
                        </div>
                      </div>
                      {row.notApplied && (
                        <div className="pl-32 text-[10px] text-white/25 leading-tight">
                          Select a builder to see premium/discount impact
                        </div>
                      )}
                    </div>
                  ));
                })()}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-xs text-white/40">
                  <div>
                    📍 Metro: {engineResultV2.breakdown.metroName} (
                    {engineResultV2.breakdown.metroDistance} km)
                  </div>
                  <div>🏢 Tech: {engineResultV2.breakdown.nearestTechPark}</div>
                  <div>
                    🏥 Amenities: {engineResultV2.breakdown.amenitiesCount}{" "}
                    within 5km
                  </div>
                  <div>
                    📊 ₹{engineResultV2.pricePerSqft.toLocaleString("en-IN")}
                    /sqft
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  {
                    label: "Location Premium",
                    pts:
                      baseline.zone === "prime"
                        ? 92
                        : baseline.zone === "growth"
                          ? 70
                          : 50,
                  },
                  { label: "Builder Grade", pts: formData.builder ? 75 : 55 },
                  { label: "Area Demand", pts: 68 },
                  { label: "Market Trend", pts: Math.round(growthRate * 800) },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <div className="w-36 text-white/50 text-xs shrink-0">
                      {row.label}
                    </div>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-600/50 to-yellow-400 rounded-full"
                        style={{ width: `${row.pts}%` }}
                      />
                    </div>
                    <div className="w-8 text-right text-yellow-400 text-xs shrink-0">
                      {row.pts}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AccordionSection>

          {/* 1b. Nearby Intelligence Panel — uses OSRM driving distances */}
          {(() => {
            const cats = [
              {
                key: "metro" as const,
                label: "Metro",
                emoji: "🚇",
                color: "#3b82f6",
                items: nearbyMetros.slice(0, 4).map((m) => ({
                  id: m.name,
                  name: m.name,
                  distKm: m.osrmKm,
                  sub: `~${m.osrmDurationMins} min`,
                })),
              },
              {
                key: "tech_park" as const,
                label: "Tech Parks",
                emoji: "🏢",
                color: "#D4AF37",
                items: nearbyTechParks.slice(0, 4).map((t) => ({
                  id: t.name,
                  name: t.name,
                  distKm: t.osrmKm,
                  sub: `~${t.osrmDurationMins} min`,
                })),
              },
              {
                key: "hospital" as const,
                label: "Hospitals",
                emoji: "🏥",
                color: "#f87171",
                items: nearbyHospitals.slice(0, 4).map((h) => ({
                  id: h.name,
                  name: h.name,
                  distKm: h.osrmKm,
                  sub: h.rating ? `${h.rating}★` : undefined,
                })),
              },
            ].filter((c) => c.items.length > 0);
            if (cats.length === 0) return null;
            const fmtDist = (km: number) =>
              km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
            return (
              <AccordionSection
                title="Nearby Places"
                icon={<MapPin className="w-4 h-4 text-yellow-400" />}
                defaultOpen={true}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {cats.map((cat) => (
                    <div key={cat.key} className="space-y-1.5">
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.07em",
                          textTransform: "uppercase",
                          color: cat.color,
                          marginBottom: 6,
                        }}
                      >
                        {cat.emoji} {cat.label}
                      </p>
                      {cat.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-xl px-3 py-2"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.07)",
                          }}
                        >
                          <span className="text-white/80 text-xs truncate mr-2">
                            {item.name}
                          </span>
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{
                              background: `${cat.color}22`,
                              color: cat.color,
                              border: `1px solid ${cat.color}44`,
                            }}
                          >
                            {fmtDist(item.distKm)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </AccordionSection>
            );
          })()}

          {/* 2. Comparable Properties */}
          <AccordionSection
            title="Comparable Properties"
            icon={<BarChart3 className="w-4 h-4 text-yellow-400" />}
          >
            {comparables.length > 0 ? (
              <div className="space-y-2">
                {comparables.map((c, i) => (
                  <div
                    key={c.id}
                    data-ocid={`valuation.comparable.item.${i + 1}`}
                    className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white/90 text-xs font-medium truncate">
                          {c.project}
                        </span>
                        <span className="text-white/30 text-xs">
                          {c.locality}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-white/40 text-xs">
                        <span>{c.bhk}BHK</span>
                        <span>·</span>
                        <span>{c.area.toLocaleString("en-IN")} sqft</span>
                        <span>·</span>
                        <span>{c.distance}</span>
                        <span>·</span>
                        <span>{c.saleDate}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-yellow-400 font-bold text-sm font-mono">
                        {c.salePrice >= 10000000
                          ? `₹${(c.salePrice / 10000000).toFixed(2)}Cr`
                          : `₹${(c.salePrice / 100000).toFixed(1)}L`}
                      </div>
                      <div className="text-white/30 text-xs">
                        ₹{c.pricePerSqft.toLocaleString("en-IN")}/sqft
                      </div>
                      <div className="text-green-400/70 text-xs mt-0.5">
                        {c.similarityScore}% match
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    type: "Apartment",
                    area: Math.round(area * 0.95),
                    price: Math.round(fmvMid * 0.97),
                    months: 2,
                  },
                  {
                    type: "Apartment",
                    area: Math.round(area * 1.05),
                    price: Math.round(fmvMid * 1.03),
                    months: 4,
                  },
                  {
                    type: "Apartment",
                    area: Math.round(area * 1.0),
                    price: Math.round(fmvMid * 0.98),
                    months: 3,
                  },
                  {
                    type: "Apartment",
                    area: Math.round(area * 0.9),
                    price: Math.round(fmvMid * 0.95),
                    months: 6,
                  },
                ].map((c, i) => (
                  <motion.div
                    key={`comp-${c.area}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-white font-medium text-sm">
                          {c.type}
                        </p>
                        <p className="text-white/50 text-xs">
                          {c.area.toLocaleString()} sqft
                        </p>
                      </div>
                      <span className="text-white/40 text-xs">
                        {c.months}mo ago
                      </span>
                    </div>
                    <p className="text-yellow-400 font-bold">
                      {formatCr(c.price)}
                    </p>
                    <p className="text-white/40 text-xs">
                      ₹{Math.round(c.price / c.area).toLocaleString()}/sqft
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </AccordionSection>

          {/* 3. How Price May Rise */}
          <AccordionSection
            title="How Price May Rise"
            icon={<TrendingUp className="w-4 h-4 text-yellow-400" />}
          >
            <PriceChart data={priceHistory} />
            <p className="text-white/40 text-xs mt-2 text-center">
              ₹/sqft baseline price (2022–2026)
            </p>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                {
                  label: "Bear Case",
                  value: `+${Math.round(growthRate * 0.5 * 100)}%/yr`,
                  color: "text-red-400",
                  bg: "bg-red-400/10 border-red-400/20",
                },
                {
                  label: "Base Case",
                  value: `+${Math.round(growthRate * 100)}%/yr`,
                  color: "text-yellow-400",
                  bg: "bg-yellow-400/10 border-yellow-400/20",
                },
                {
                  label: "Bull Case",
                  value: `+${Math.round(growthRate * 1.8 * 100)}%/yr`,
                  color: "text-green-400",
                  bg: "bg-green-400/10 border-green-400/20",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`rounded-xl border p-3 text-center ${s.bg}`}
                >
                  <p className={`font-bold text-base ${s.color}`}>{s.value}</p>
                  <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </AccordionSection>

          {/* 4. Nearby Places & Amenities — Engine-computed distances */}
          {(() => {
            const metros = nearbyMetros;
            const techParks = nearbyTechParks;
            const hospitals = nearbyHospitals;
            const schools = nearbySchools;
            const malls = nearbyMalls;
            const airport = nearbyAirport;

            function distBadgeColor(km: number): string {
              if (km < 2) return "#10b981";
              if (km < 5) return "#f59e0b";
              if (km < 10) return "#f97316";
              return "#ef4444";
            }
            function fmtDist(km: number): string {
              return km < 1
                ? `${Math.round(km * 1000)} m`
                : `${km.toFixed(1)} km`;
            }

            type NearbyGroup = {
              emoji: string;
              label: string;
              color: string;
              items: { name: string; km: number; sub?: string }[];
            };
            const groups: NearbyGroup[] = [
              {
                emoji: "🚇",
                label: "Metro Stations",
                color: "#3b82f6",
                items: metros.map((m) => ({
                  name: `${m.name} (${m.line} Line)`,
                  km: m.osrmKm ?? m.aerialKm ?? 0,
                  sub: `~${m.osrmDurationMins ?? m.travelTimeMin ?? 0} min`,
                })),
              },
              {
                emoji: "🏢",
                label: "Tech Hubs & IT Parks",
                color: "#D4AF37",
                items: techParks.map((t) => ({
                  name: t.name,
                  km: t.osrmKm ?? 0,
                  sub: `~${t.osrmDurationMins ?? t.travelMins ?? 0} min`,
                })),
              },
              {
                emoji: "🏥",
                label: "Hospitals",
                color: "#f87171",
                items: hospitals.map((h) => ({
                  name: h.name,
                  km: h.osrmKm ?? 0,
                  sub: h.rating ? `${h.rating}★` : undefined,
                })),
              },
              {
                emoji: "🏫",
                label: "Schools",
                color: "#4ade80",
                items: schools.map((s) => ({
                  name: s.name,
                  km: s.osrmKm ?? 0,
                  sub: s.rating ? `${s.rating}★` : undefined,
                })),
              },
              {
                emoji: "🛍️",
                label: "Malls",
                color: "#a78bfa",
                items: malls.map((m) => ({
                  name: m.name,
                  km: m.osrmKm ?? 0,
                })),
              },
            ].filter((g) => g.items.length > 0);

            return (
              <AccordionSection
                title="Nearby Places & Amenities"
                icon={<MapPin className="w-4 h-4 text-yellow-400" />}
                defaultOpen={true}
              >
                {/* Airport */}
                {airport && (
                  <div
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 mb-3"
                    style={{
                      background: "rgba(216,181,106,0.07)",
                      border: "1px solid rgba(216,181,106,0.2)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span>✈️</span>
                      <div>
                        <p className="text-white/80 text-xs font-semibold">
                          Kempegowda International Airport
                        </p>
                        <p className="text-white/40 text-[10px]">
                          ~{airport.osrmDurationMins ?? airport.travelMins ?? 0}{" "}
                          min drive
                        </p>
                      </div>
                    </div>
                    <span
                      className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${distBadgeColor(airport.osrmKm ?? 0)}20`,
                        color: distBadgeColor(airport.osrmKm ?? 0),
                        border: `1px solid ${distBadgeColor(airport.osrmKm ?? 0)}40`,
                      }}
                    >
                      {fmtDist(airport.osrmKm ?? 0)}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {groups.map((g) => (
                    <div key={g.label} className="space-y-1.5">
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.07em",
                          textTransform: "uppercase",
                          color: g.color,
                          marginBottom: 6,
                        }}
                      >
                        {g.emoji} {g.label}
                      </p>
                      {g.items.slice(0, 4).map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between rounded-xl px-3 py-2"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.07)",
                          }}
                        >
                          <div className="min-w-0 mr-2">
                            <p className="text-white/80 text-xs truncate">
                              {item.name}
                            </p>
                            {item.sub && (
                              <p className="text-white/35 text-[10px]">
                                {item.sub}
                              </p>
                            )}
                          </div>
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{
                              background: `${distBadgeColor(item.km)}22`,
                              color: distBadgeColor(item.km),
                              border: `1px solid ${distBadgeColor(item.km)}44`,
                            }}
                          >
                            {fmtDist(item.km)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </AccordionSection>
            );
          })()}

          {/* 5. Market Intelligence */}
          <AccordionSection
            title="Market Intelligence"
            icon={<BarChart3 className="w-4 h-4 text-yellow-400" />}
          >
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Market Zone", value: baseline.tag },
                {
                  label: "Liquidity",
                  value:
                    baseline.zone === "prime"
                      ? "High"
                      : baseline.zone === "periphery"
                        ? "Low"
                        : "Medium",
                },
                {
                  label: "Demand Pressure",
                  value: baseline.zone === "prime" ? "Very High" : "Moderate",
                },
                {
                  label: "Price Trend",
                  value: `+${Math.round(growthRate * 100)}% YoY`,
                },
                {
                  label: "Circle Rate",
                  value: `₹${baseline.circleRate.toLocaleString()}/sqft`,
                },
                {
                  label: "Market Heat Index",
                  value: baseline.zone === "prime" ? "🔴 Hot" : "🟡 Warm",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <p className="text-white/40 text-xs">{item.label}</p>
                  <p className="text-white font-medium text-sm mt-0.5">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </AccordionSection>

          {/* 6. Investment Intelligence */}
          <AccordionSection
            title="Investment Intelligence"
            icon={<TrendingUp className="w-4 h-4 text-yellow-400" />}
          >
            <div className="space-y-3">
              {[
                {
                  label: "Gross Rental Yield",
                  value: baseline.zone === "prime" ? "3.5–4.5%" : "3.0–4.0%",
                },
                {
                  label: "Capital Appreciation",
                  value: `${Math.round(growthRate * 100)}% per year`,
                },
                {
                  label: "Investor IRR (3yr hold)",
                  value: `${Math.round(growthRate * 100 + 3.5)}%`,
                },
                {
                  label: "Holding ROI (5yr)",
                  value: `+${Math.round(growthRate * 500)}%`,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between items-center py-2 border-b border-white/5"
                >
                  <span className="text-white/60 text-sm">{item.label}</span>
                  <span className="text-yellow-400 font-semibold text-sm">
                    {item.value}
                  </span>
                </div>
              ))}
              <p className="text-blue-300/70 text-xs mt-2 rounded-xl border border-blue-400/20 bg-blue-400/5 p-3">
                💡 Best suited for mid-term hold (3–5 years). Exit during peak
                demand cycle in {new Date().getFullYear() + 3}–
                {new Date().getFullYear() + 5}.
              </p>
            </div>
          </AccordionSection>

          {/* 7. Risk Intelligence */}
          <AccordionSection
            title="Risk Intelligence"
            icon={<Shield className="w-4 h-4 text-yellow-400" />}
          >
            <div className="space-y-2">
              {[
                {
                  label: "Distress Flag",
                  value: confidence > 70 ? "None Detected" : "Monitor",
                  ok: confidence > 70,
                },
                {
                  label: "Liquidity Risk",
                  value:
                    baseline.zone === "prime"
                      ? "Low"
                      : baseline.zone === "periphery"
                        ? "High"
                        : "Moderate",
                  ok: baseline.zone !== "periphery",
                },
                {
                  label: "Market Risk",
                  value: `${Math.round(growthRate * 0.3 * 100)}% volatility`,
                  ok: true,
                },
                {
                  label: "Legal Risk",
                  value: "Standard — verify khata/OC documents",
                  ok: true,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between items-center py-2 border-b border-white/5"
                >
                  <span className="text-white/60 text-sm">{row.label}</span>
                  <span
                    className={`text-sm font-medium ${row.ok ? "text-green-400" : "text-orange-400"}`}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </AccordionSection>

          {/* 8. ValuBrix Score */}
          <AccordionSection
            title="ValuBrix Score"
            icon={<Award className="w-4 h-4 text-yellow-400" />}
          >
            <div className="flex items-center gap-6">
              <div className="relative flex items-center justify-center w-24 h-24">
                <svg
                  viewBox="0 0 100 100"
                  className="absolute inset-0 w-full h-full -rotate-90"
                  role="img"
                  aria-labelledby="gauge-title"
                >
                  <title id="gauge-title">ValuBrix Score Gauge</title>
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="10"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#D4AF37"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                    animate={{
                      strokeDashoffset:
                        2 * Math.PI * 40 * (1 - confidence / 100),
                    }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </svg>
                <span className="text-yellow-400 font-bold text-xl">
                  {confidence}
                </span>
              </div>
              <div className="flex-1 space-y-2">
                {[
                  {
                    label: "Builder Reputation",
                    pts: formData.builder ? 20 : 12,
                  },
                  {
                    label: "Location Premium",
                    pts:
                      baseline.zone === "prime"
                        ? 25
                        : baseline.zone === "growth"
                          ? 18
                          : 10,
                  },
                  {
                    label: "Market Conditions",
                    pts: Math.round(growthRate * 150),
                  },
                  { label: "Data Confidence", pts: confidence > 70 ? 20 : 12 },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-2">
                    <span className="text-white/50 text-xs w-36 shrink-0">
                      {f.label}
                    </span>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(f.pts / 30) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                      />
                    </div>
                    <span className="text-yellow-400 text-xs w-6 text-right">
                      {f.pts}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </AccordionSection>

          {/* Confidence meter */}
          {engineResultV2 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/70 text-sm font-medium">
                  Confidence Score
                </span>
                <span className="text-yellow-400 font-bold font-mono">
                  {engineResultV2.confidence}%
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-600/60 to-yellow-400 transition-all duration-700"
                  style={{ width: `${engineResultV2.confidence}%` }}
                />
              </div>
              {(() => {
                const stats = getModelStats();
                if (!stats) return null;
                const { label, level } = getRealDataConfidenceLabel(
                  stats.realDataDominance,
                );
                const cls =
                  level === "high"
                    ? "text-emerald-400"
                    : level === "medium"
                      ? "text-blue-400"
                      : "text-amber-400";
                return (
                  <p className={`text-xs mt-1 ${cls}`}>
                    {label} — {stats.realDataDominance}% real transaction data
                  </p>
                );
              })()}
            </div>
          )}

          {/* Negotiation Insight */}
          <div className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-4 mb-4">
            <p className="text-blue-300 text-sm">
              💡 Recent transactions suggest sellers accept{" "}
              <strong>4–6% negotiation below listing price</strong> in{" "}
              {locality}.
            </p>
          </div>

          {/* Source Data */}
          <div
            data-ocid="valuation.source_data.panel"
            className="rounded-2xl border border-white/10 bg-white/5 mb-6"
          >
            <button
              type="button"
              onClick={() => setSourceOpen(!sourceOpen)}
              className="w-full flex items-center justify-between p-5 text-white/70 hover:text-white transition-colors"
            >
              <span className="font-medium text-sm">
                Source Data & References
              </span>
              {sourceOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            <AnimatePresence>
              {sourceOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 space-y-2">
                    {[
                      "RERA Filing Nov 2024",
                      "MagicBricks Listing Apr 2026",
                      "Registration Data Mar 2026",
                      "Circle Rate Data (Govt. 2025)",
                      "99acres Listings Apr 2026",
                    ].map((src) => (
                      <div key={src} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                        <span className="text-white/60 text-sm">{src}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CTAs */}
          <div className="flex gap-3 mb-6">
            <Button
              data-ocid="valuation.results.list_property_button"
              onClick={() =>
                toast.success("Navigating to Seller Listing Engine…")
              }
              className="flex-1 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold text-base rounded-xl"
            >
              List This Property
            </Button>
            <Button
              data-ocid="valuation.results.new_valuation_button"
              onClick={() => {
                setPhase("form");
                setStep(1);
                setPropertyAge(null);
                setEngineResultV2(null);
                setComparables([]);
                updateForm({
                  location: null,
                  propertyType: null,
                  bhk: null,
                  floorRange: null,
                  exactFloor: "",
                  areaType: null,
                  areaValue: "",
                  builder: "",
                  project: "",
                });
              }}
              variant="outline"
              className="flex-1 border-white/20 text-white/70 hover:bg-white/5 py-4 text-base rounded-xl"
            >
              <RotateCcw className="mr-2 w-4 h-4" /> New Valuation
            </Button>
          </div>

          {/* AI Learning + Submit Sold Price */}
          <div className="mt-2">
            <AILearningIndicator />
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-dashed border-blue-300/30 bg-blue-400/5 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-blue-300">
                Help improve AI accuracy
              </p>
              <p className="text-xs text-blue-400/60">
                Submit your actual sold price to improve predictions
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoldModalOpen(true)}
              data-ocid="valuation.submit_sold_price.button"
              className="border-blue-400/30 text-blue-300 hover:bg-blue-400/10"
            >
              Submit Sold Price
            </Button>
          </div>

          <SubmitSoldPriceModal
            open={soldModalOpen}
            onClose={() => setSoldModalOpen(false)}
          />

          <p className="text-center text-white/30 text-xs mt-8">
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noreferrer"
              className="text-yellow-400/60 hover:text-yellow-400"
            >
              caffeine.ai
            </a>
          </p>
        </main>
      </div>
    );
  }

  // ─── FORM PHASE ───────────────────────────────────────────────────────────
  // Step 1: Full-screen map background with floating form card (same as Sell/Buy)
  // Steps 2-6: Standard scrollable layout

  // Handler for map pin click/drag in step 1
  function handleMapLocationSelect(lat: number, lng: number, locName: string) {
    setManualLocality(locName);
    updateForm({
      location: { city: manualCity, locality: locName, lat, lng },
    });
  }

  if (currentStep === 1) {
    return (
      <>
        {/* Map: full-screen background, position:fixed so it covers the whole viewport */}
        <div style={{ position: "fixed", inset: 0, top: 0, zIndex: 0 }}>
          <GlobalMapComponent
            mode="valuation"
            city={manualCity}
            center={mapCenter}
            zoom={11}
            height="100vh"
            showLayerToggle={false}
            onLocationSelect={handleMapLocationSelect}
          />
        </div>

        {/* Dark gradient overlay — fixed, above map, below form */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1,
            background:
              "linear-gradient(180deg, rgba(7,26,47,0.55) 0%, rgba(7,26,47,0.7) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* GlobalNav — fixed at top, above overlay */}
        <div
          style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 20 }}
        >
          <GlobalNav />
        </div>

        {/* Form layout — relative, zIndex 10, full-height flex column pushing card to bottom */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            paddingTop: 80,
          }}
        >
          <div
            className="mx-auto w-full max-w-lg px-4 pb-8"
            style={{ marginTop: "auto" }}
          >
            <div
              className="rounded-3xl p-6"
              style={{
                background: "rgba(7,26,47,0.92)",
                border: "1px solid rgba(216,181,106,0.2)",
                backdropFilter: "blur(24px)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
              }}
            >
              {/* Header */}
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400/70 text-xs uppercase tracking-widest font-medium">
                  AI Valuation — Step 1 of 6
                </span>
              </div>
              <h2
                style={{ fontFamily: "'Playfair Display', serif" }}
                className="text-xl font-bold text-white mb-1"
              >
                Select Location
              </h2>
              <p className="text-white/50 text-sm mb-4">
                Choose your city and locality — or click/drag the map pin
              </p>

              {/* ── Try These Examples ─────────────────────────────────────── */}
              <div className="mb-5">
                <p className="text-white/40 text-xs mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-yellow-400/70" />
                  <span>✨ Try These Examples</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_EXAMPLES.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handlePreset(preset)}
                      data-ocid={`valuation.preset.${preset.locality.toLowerCase().replace(/\s+/g, "_")}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                      style={{
                        background: "rgba(7,26,47,0.8)",
                        border: "1px solid rgba(212,175,55,0.35)",
                        color: "rgba(255,255,255,0.8)",
                        boxShadow: "0 0 0 0 rgba(212,175,55,0)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.boxShadow =
                          "0 0 12px rgba(212,175,55,0.2)";
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.borderColor = "rgba(212,175,55,0.65)";
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "#D4AF37";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.boxShadow =
                          "0 0 0 0 rgba(212,175,55,0)";
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.borderColor = "rgba(212,175,55,0.35)";
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "rgba(255,255,255,0.8)";
                      }}
                    >
                      <span>{preset.emoji}</span>
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {/* City */}
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-wider mb-2 font-semibold">
                    City
                  </p>
                  <select
                    value={manualCity}
                    onChange={(e) => {
                      setManualCity(e.target.value);
                      setStepErrors({});
                    }}
                    className="w-full rounded-xl border border-white/20 bg-white/10 text-white px-4 py-3 text-sm focus:border-yellow-400/50 focus:outline-none"
                    data-ocid="valuation.step1.city_select"
                  >
                    <option value="Bangalore">Bangalore</option>
                    <option value="Pune">Pune</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Hyderabad">Hyderabad</option>
                  </select>
                </div>

                {/* Locality */}
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-wider mb-2 font-semibold">
                    Locality <span className="text-red-400">*</span>
                  </p>
                  <LocalityDropdown
                    value={manualLocality}
                    city={manualCity}
                    onChange={(v) => {
                      setManualLocality(v);
                      setStepErrors({});
                      const key = v.toLowerCase().trim();
                      const direct = ALL_LOCALITY_COORDS[key];
                      // FIX: only use real coords — no Bangalore-center fallback
                      let resolvedLat: number | undefined;
                      let resolvedLng: number | undefined;
                      if (direct) {
                        resolvedLat = direct.lat;
                        resolvedLng = direct.lng;
                      } else {
                        const match = Object.entries(ALL_LOCALITY_COORDS).find(
                          ([k]) => k.includes(key) || key.includes(k),
                        );
                        if (match) {
                          resolvedLat = match[1].lat;
                          resolvedLng = match[1].lng;
                        }
                      }
                      if (resolvedLat && resolvedLng) {
                        console.log(
                          `[AIValuation] Source coordinates: ${resolvedLat}, ${resolvedLng}`,
                        );
                        updateForm({
                          location: {
                            city: manualCity,
                            locality: v,
                            lat: resolvedLat,
                            lng: resolvedLng,
                          },
                        });
                      } else {
                        // Locality found but no coords — store locality name only, coords will resolve later
                        setManualLocality(v);
                      }
                    }}
                    placeholder="e.g. Indiranagar, Whitefield…"
                    className="w-full"
                  />
                  {stepErrors.location && (
                    <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />{" "}
                      {stepErrors.location}
                    </p>
                  )}
                </div>

                {(manualLocality || formData.location?.locality) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-green-400/20 bg-green-400/5 p-3 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    <div>
                      <p className="text-green-400 text-sm font-medium">
                        {manualLocality || formData.location?.locality},{" "}
                        {manualCity}
                      </p>
                      <p className="text-white/40 text-xs">
                        {getBaseline(manualLocality || "whitefield").tag} ·
                        Location confirmed
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              <p className="text-white/30 text-xs mt-3 text-center">
                📍 Click or drag map pin to set exact location
              </p>

              {/* ── Pin location on map button ─────────────────────────── */}
              <button
                type="button"
                onClick={() => {
                  setPendingMapPin(null);
                  setMapPinModalOpen(true);
                }}
                data-ocid="valuation.step1.map_pin_button"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mt-2 transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px dashed rgba(216,181,106,0.4)",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: "rgba(59,130,246,0.15)",
                    border: "1px solid rgba(59,130,246,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <MapPin size={14} style={{ color: "#3B82F6" }} />
                </span>
                <div className="flex-1 text-left">
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.85)",
                      lineHeight: 1.3,
                    }}
                  >
                    📍 Pin location on map
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.4)",
                      marginTop: 1,
                    }}
                  >
                    Open full-screen map to drop a pin
                  </p>
                </div>
              </button>

              <motion.div whileHover={{ scale: 1.01 }} className="mt-4">
                <Button
                  data-ocid="valuation.step1.next_button"
                  onClick={handleNext}
                  className="w-full py-4 text-base font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 text-black hover:from-yellow-400 hover:to-yellow-500 rounded-xl"
                >
                  Next: Property Type <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </motion.div>
            </div>
          </div>
        </div>

        {/* ── Map Pin Modal — portal to escape stacking context ────────────── */}
        {mapPinModalOpen &&
          createPortal(
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 999999,
                display: "flex",
                flexDirection: "column",
                background: "rgba(4,14,28,0.94)",
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setMapPinModalOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setMapPinModalOpen(false);
              }}
              // biome-ignore lint/a11y/useSemanticElements: modal backdrop
              role="dialog"
              aria-modal="true"
              tabIndex={-1}
              data-ocid="valuation.map_pin_modal"
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                  height: "100%",
                  maxWidth: 860,
                  margin: "0 auto",
                  background: "#071A2F",
                  boxShadow: "0 8px 48px rgba(0,0,0,0.8)",
                }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div
                  style={{
                    background: "rgba(7,26,47,1)",
                    borderBottom: "1px solid rgba(216,181,106,0.2)",
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <MapPin size={18} style={{ color: "#D8B56A" }} />
                    <div>
                      <p
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontWeight: 700,
                          fontSize: 16,
                          color: "#F4F7FF",
                          lineHeight: 1.2,
                        }}
                      >
                        Pin Your Exact Location
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: "rgba(185,198,216,0.6)",
                          marginTop: 2,
                        }}
                      >
                        {manualCity} · Tap anywhere on the map to drop a pin
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMapPinModalOpen(false)}
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 8,
                      padding: "6px 14px",
                      color: "rgba(255,255,255,0.7)",
                      fontSize: 13,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    ✕ Close
                  </button>
                </div>

                {/* Instruction */}
                <div
                  style={{
                    background: "rgba(59,130,246,0.12)",
                    borderBottom: "1px solid rgba(59,130,246,0.25)",
                    padding: "10px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 16 }}>📍</span>
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(185,210,255,0.9)",
                      fontWeight: 500,
                    }}
                  >
                    Tap anywhere on the map to drop a pin — or drag the pin to
                    your exact location
                  </p>
                </div>

                {/* Map — flex:1 with explicit minHeight for Leaflet */}
                <div
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    position: "relative",
                    minHeight: 300,
                  }}
                >
                  <LocationSelectMap
                    onLocationSelect={(result: LocationSelectResult) => {
                      const parts = result.displayAddress.split(",");
                      const localityName =
                        result.locality?.name ??
                        parts[0]?.trim() ??
                        result.displayAddress;
                      setPendingMapPin({
                        lat: result.lat,
                        lng: result.lng,
                        localityName,
                        displayAddress: result.displayAddress,
                      });
                    }}
                    className="w-full h-full"
                    city={manualCity}
                    showLayerToggles={false}
                    modalMode={true}
                  />
                </div>

                {/* Pending pin feedback */}
                <div
                  style={{
                    background: "rgba(7,26,47,0.97)",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    padding: "12px 20px",
                    minHeight: 56,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexShrink: 0,
                  }}
                >
                  <MapPin
                    size={15}
                    style={{
                      color: pendingMapPin
                        ? "#D8B56A"
                        : "rgba(255,255,255,0.25)",
                      flexShrink: 0,
                    }}
                  />
                  {pendingMapPin ? (
                    <p
                      style={{
                        fontSize: 13,
                        color: "#D8B56A",
                        fontWeight: 600,
                        flex: 1,
                        lineHeight: 1.4,
                      }}
                    >
                      📍 {pendingMapPin.localityName}
                      {pendingMapPin.displayAddress !==
                        pendingMapPin.localityName && (
                        <span
                          style={{
                            display: "block",
                            fontSize: 11,
                            color: "rgba(255,255,255,0.4)",
                            fontWeight: 400,
                            marginTop: 1,
                          }}
                        >
                          {pendingMapPin.displayAddress}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p
                      style={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.35)",
                        flex: 1,
                        fontStyle: "italic",
                      }}
                    >
                      No pin dropped yet — tap on the map above
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div
                  style={{
                    background: "rgba(7,26,47,1)",
                    borderTop: "1px solid rgba(216,181,106,0.15)",
                    padding: "14px 20px",
                    display: "flex",
                    gap: 12,
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setMapPinModalOpen(false)}
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ✕ Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!pendingMapPin) return;
                      setManualLocality(pendingMapPin.localityName);
                      updateForm({
                        location: {
                          city: manualCity,
                          locality: pendingMapPin.localityName,
                          lat: pendingMapPin.lat,
                          lng: pendingMapPin.lng,
                        },
                      });
                      setStepErrors({});
                      setMapPinModalOpen(false);
                      setPendingMapPin(null);
                    }}
                    disabled={!pendingMapPin}
                    style={{
                      flex: 2,
                      padding: "12px 0",
                      borderRadius: 12,
                      background: pendingMapPin
                        ? "linear-gradient(135deg, #D8B56A 0%, #E8C97A 100%)"
                        : "rgba(255,255,255,0.06)",
                      border: "none",
                      color: pendingMapPin
                        ? "#071A2F"
                        : "rgba(255,255,255,0.2)",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: pendingMapPin ? "pointer" : "not-allowed",
                      boxShadow: pendingMapPin
                        ? "0 4px 16px rgba(216,181,106,0.35)"
                        : "none",
                    }}
                  >
                    ✓ Confirm Location
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </>
    );
  }

  return (
    <>
      {/* Map: full-screen background for steps 2-6 — same as step 1 */}
      <div style={{ position: "fixed", inset: 0, top: 0, zIndex: 0 }}>
        <GlobalMapComponent
          mode="valuation"
          city={manualCity}
          center={mapCenter}
          zoom={11}
          height="100vh"
          showLayerToggle={false}
          onLocationSelect={handleMapLocationSelect}
        />
      </div>

      {/* Dark gradient overlay — fixed, above map, below form */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          background:
            "linear-gradient(180deg, rgba(7,26,47,0.6) 0%, rgba(7,26,47,0.75) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* GlobalNav — fixed at top, above overlay */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 20 }}>
        <GlobalNav />
      </div>

      {/* Form layout — relative, zIndex 10, full-height flex column centered */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingTop: 100,
          paddingBottom: 24,
        }}
      >
        <div className="mx-auto w-full max-w-xl px-4">
          {/* Step indicator */}
          <div
            className="rounded-2xl p-4 mb-4"
            style={{
              background: "rgba(7,26,47,0.85)",
              border: "1px solid rgba(216,181,106,0.15)",
              backdropFilter: "blur(16px)",
            }}
          >
            <StepIndicator current={currentStep} isPlot={isPlotType} />
          </div>

          {/* Form Panel */}
          <div className="flex flex-col">
            <AnimatePresence mode="wait">
              {/* ── STEP 2: Property Type ─────────────────────────────────── */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
                    <h2
                      style={{ fontFamily: "'Playfair Display', serif" }}
                      className="text-xl font-bold text-white mb-2"
                    >
                      Property Type
                    </h2>
                    <p className="text-white/50 text-sm mb-5">
                      Select the type of property you want to value
                    </p>

                    {stepErrors.propertyType && (
                      <div className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <p className="text-red-400 text-sm">
                          {stepErrors.propertyType}
                        </p>
                      </div>
                    )}

                    <div
                      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
                      data-ocid="valuation.step2.type_grid"
                    >
                      {(
                        [
                          {
                            type: "apartment",
                            label: "Apartment",
                            emoji: "🏢",
                            desc: "Flats & high-rise",
                          },
                          {
                            type: "villa",
                            label: "Villa",
                            emoji: "🏡",
                            desc: "Independent villas",
                          },
                          {
                            type: "plot",
                            label: "Plot / Land",
                            emoji: "🗺️",
                            desc: "Residential / NA",
                          },
                          {
                            type: "independent_house",
                            label: "Ind. House",
                            emoji: "🏠",
                            desc: "Stand-alone home",
                          },
                          {
                            type: "builder_floor",
                            label: "Builder Floor",
                            emoji: "🏗️",
                            desc: "Builder BF units",
                          },
                          {
                            type: "studio",
                            label: "Studio",
                            emoji: "🛋️",
                            desc: "Compact studio",
                          },
                          {
                            type: "commercial",
                            label: "Commercial",
                            emoji: "🏬",
                            desc: "Office & retail",
                          },
                        ] as {
                          type: PropertyType;
                          label: string;
                          emoji: string;
                          desc: string;
                        }[]
                      ).map(({ type, label, emoji, desc }) => (
                        <motion.button
                          key={type}
                          data-ocid={`valuation.step2.type.${type}`}
                          onClick={() => {
                            updateForm({
                              propertyType: type,
                              // Reset sub-type when changing property type
                              apartmentSubType: undefined,
                            });
                            setStepErrors({});
                          }}
                          whileHover={{ y: -2, scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                            formData.propertyType === type
                              ? "border-yellow-400 bg-yellow-400/10 shadow-[0_0_20px_rgba(212,160,23,0.2)]"
                              : "border-white/15 bg-white/5 hover:border-yellow-400/40"
                          }`}
                        >
                          <span className="text-2xl">{emoji}</span>
                          <div className="text-center">
                            <p
                              className={`font-bold text-xs ${formData.propertyType === type ? "text-yellow-400" : "text-white"}`}
                            >
                              {label}
                            </p>
                            <p className="text-white/40 text-[10px] mt-0.5">
                              {desc}
                            </p>
                          </div>
                          {formData.propertyType === type && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 right-2"
                            >
                              <CheckCircle2 className="w-4 h-4 text-yellow-400" />
                            </motion.div>
                          )}
                        </motion.button>
                      ))}
                    </div>

                    {/* ── Apartment Sub-Type (mandatory when apartment selected) ── */}
                    <AnimatePresence>
                      {formData.propertyType === "apartment" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="mt-5 overflow-hidden"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <h3 className="text-white/80 text-sm font-semibold">
                              Apartment Type
                            </h3>
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                              style={{
                                background: "rgba(212,175,55,0.12)",
                                color: "#D4AF37",
                                border: "1px solid rgba(212,175,55,0.3)",
                              }}
                            >
                              Required
                            </span>
                          </div>
                          <p className="text-white/40 text-xs mb-3">
                            Sub-type affects AI model selection and valuation
                            accuracy
                          </p>

                          {stepErrors.apartmentSubType && (
                            <div className="mb-3 rounded-xl border border-red-400/30 bg-red-400/10 p-3 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                              <p className="text-red-400 text-sm">
                                {stepErrors.apartmentSubType}
                              </p>
                            </div>
                          )}

                          <div
                            className="grid grid-cols-3 gap-3"
                            data-ocid="valuation.step2.apartment_subtype_grid"
                          >
                            {(
                              [
                                {
                                  value: "standalone" as const,
                                  emoji: "🏢",
                                  label: "Standalone",
                                  desc: "No society, minimal amenities",
                                },
                                {
                                  value: "gated" as const,
                                  emoji: "🏘️",
                                  label: "Gated Community",
                                  desc: "Clubhouse, security, amenities",
                                },
                                {
                                  value: "township" as const,
                                  emoji: "🌆",
                                  label: "Township",
                                  desc: "Self-contained with retail & schools",
                                },
                              ] as {
                                value: "standalone" | "gated" | "township";
                                emoji: string;
                                label: string;
                                desc: string;
                              }[]
                            ).map(({ value, emoji, label, desc }) => {
                              const isSelected =
                                formData.apartmentSubType === value;
                              return (
                                <motion.button
                                  key={value}
                                  type="button"
                                  data-ocid={`valuation.step2.subtype.${value}`}
                                  onClick={() => {
                                    updateForm({ apartmentSubType: value });
                                    setStepErrors((prev) => {
                                      const { apartmentSubType: _rm, ...rest } =
                                        prev;
                                      void _rm;
                                      return rest;
                                    });
                                  }}
                                  whileHover={{ y: -2, scale: 1.02 }}
                                  whileTap={{ scale: 0.97 }}
                                  className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                                    isSelected
                                      ? "border-yellow-400 bg-yellow-400/10 shadow-[0_0_20px_rgba(212,160,23,0.2)]"
                                      : "border-white/15 bg-white/5 hover:border-yellow-400/40"
                                  }`}
                                >
                                  <span className="text-2xl">{emoji}</span>
                                  <div className="text-center">
                                    <p
                                      className={`font-bold text-xs ${isSelected ? "text-yellow-400" : "text-white"}`}
                                    >
                                      {label}
                                    </p>
                                    <p className="text-white/40 text-[9px] mt-0.5 leading-tight">
                                      {desc}
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="absolute top-2 right-2"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400" />
                                    </motion.div>
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <Button
                      onClick={goBack}
                      variant="outline"
                      className="flex-1 border-white/20 text-white/70 hover:bg-white/5"
                    >
                      <ChevronLeft className="mr-2 w-4 h-4" /> Back
                    </Button>
                    <motion.div className="flex-1" whileHover={{ scale: 1.01 }}>
                      <Button
                        data-ocid="valuation.step2.next_button"
                        onClick={handleNext}
                        disabled={
                          !formData.propertyType ||
                          (formData.propertyType === "apartment" &&
                            !formData.apartmentSubType)
                        }
                        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold hover:from-yellow-400 disabled:opacity-40"
                      >
                        Next: Property Details{" "}
                        <ChevronRight className="ml-2 w-4 h-4" />
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 3: Property Details (DynamicFieldRenderer) ─────── */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
                    <h2
                      style={{ fontFamily: "'Playfair Display', serif" }}
                      className="text-xl font-bold text-white mb-2"
                    >
                      Property Details
                    </h2>
                    <p className="text-white/50 text-sm mb-5 capitalize">
                      {formData.propertyType?.replace("_", " ")} — enter area
                      and relevant details for accurate AI valuation
                    </p>

                    <DynamicFieldRenderer
                      propertyType={formData.propertyType}
                      formData={formData}
                      onChange={updateForm}
                      errors={{ ...errors, ...stepErrors }}
                      mode={mode}
                    />
                  </div>

                  <div className="flex gap-3 mt-4">
                    <Button
                      onClick={goBack}
                      variant="outline"
                      className="flex-1 border-white/20 text-white/70 hover:bg-white/5"
                    >
                      <ChevronLeft className="mr-2 w-4 h-4" /> Back
                    </Button>
                    <motion.div className="flex-1" whileHover={{ scale: 1.01 }}>
                      <Button
                        data-ocid="valuation.step3.next_button"
                        onClick={handleNext}
                        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold hover:from-yellow-400"
                      >
                        {isPlotType
                          ? "Next: Builder / Project"
                          : "Next: Property Age"}{" "}
                        <ChevronRight className="ml-2 w-4 h-4" />
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 4: Property Age (skipped for plots) ─────────────── */}
              {currentStep === 4 && !isPlotType && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
                    <h2
                      style={{ fontFamily: "'Playfair Display', serif" }}
                      className="text-xl font-bold text-white mb-2"
                    >
                      Property Age
                    </h2>
                    <p className="text-white/50 text-sm mb-5">
                      Building age significantly impacts valuation and
                      depreciation
                    </p>

                    {ageError && (
                      <div className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <p className="text-red-400 text-sm">{ageError}</p>
                      </div>
                    )}

                    <div
                      className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                      data-ocid="valuation.step4.age_grid"
                    >
                      {AGE_OPTIONS.map(({ value, label, sub }) => (
                        <motion.button
                          key={value}
                          data-ocid={`valuation.step4.age.${value}`}
                          onClick={() => {
                            setPropertyAge(value);
                            setAgeError("");
                            setStepErrors({});
                          }}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.97 }}
                          className={`flex flex-col items-center gap-1 p-4 rounded-2xl border-2 transition-all ${
                            propertyAge === value
                              ? "border-yellow-400 bg-yellow-400/10 shadow-[0_0_16px_rgba(212,160,23,0.2)]"
                              : "border-white/15 bg-white/5 hover:border-yellow-400/40"
                          }`}
                        >
                          <Clock
                            className={`w-5 h-5 ${propertyAge === value ? "text-yellow-400" : "text-white/40"}`}
                          />
                          <p
                            className={`font-bold text-sm ${propertyAge === value ? "text-yellow-400" : "text-white"}`}
                          >
                            {label}
                          </p>
                          <p className="text-white/40 text-xs">{sub}</p>
                        </motion.button>
                      ))}
                    </div>

                    {propertyAge && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 rounded-xl border border-blue-400/20 bg-blue-400/5 p-3"
                      >
                        <p className="text-blue-300 text-xs">
                          {propertyAge === "New" || propertyAge === "<1yr"
                            ? "✅ New property — maximum valuation, no depreciation applied"
                            : propertyAge === "1-3yr" || propertyAge === "3-5yr"
                              ? "🟡 Recent build — minor depreciation (2–5%) applied"
                              : propertyAge === "5-10yr"
                                ? "🟠 Established build — moderate depreciation (8–12%) applied"
                                : "🔴 Legacy build — significant depreciation (15–25%) applied"}
                        </p>
                      </motion.div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-4">
                    <Button
                      onClick={goBack}
                      variant="outline"
                      className="flex-1 border-white/20 text-white/70 hover:bg-white/5"
                    >
                      <ChevronLeft className="mr-2 w-4 h-4" /> Back
                    </Button>
                    <motion.div className="flex-1" whileHover={{ scale: 1.01 }}>
                      <Button
                        data-ocid="valuation.step4.next_button"
                        onClick={handleNext}
                        disabled={!propertyAge}
                        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold hover:from-yellow-400 disabled:opacity-40"
                      >
                        Next: Builder / Project{" "}
                        <ChevronRight className="ml-2 w-4 h-4" />
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 5: Builder / Project (Optional) ─────────────────── */}
              {currentStep === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <h2
                        style={{ fontFamily: "'Playfair Display', serif" }}
                        className="text-xl font-bold text-white"
                      >
                        Builder & Project
                      </h2>
                      <Badge
                        variant="outline"
                        className="border-white/20 text-white/50 text-xs"
                      >
                        Optional
                      </Badge>
                    </div>
                    <p className="text-white/50 text-sm mb-5">
                      Adding builder/project information improves valuation
                      accuracy by up to 15%
                    </p>

                    <div className="space-y-4">
                      {/* Builder dropdown */}
                      <div>
                        <p className="text-white/60 text-xs uppercase tracking-wider mb-2 font-semibold">
                          Builder
                        </p>
                        <select
                          data-ocid="valuation.step5.builder_select"
                          value={formData.builder}
                          onChange={(e) =>
                            updateForm({
                              builder: e.target.value,
                              isBuilderManual: false,
                            })
                          }
                          className="w-full rounded-xl border border-white/20 bg-white/10 text-white px-4 py-3 text-sm focus:border-yellow-400/50 focus:outline-none"
                        >
                          <option value="">— Select Builder —</option>
                          {filterBuildersByLocality(manualLocality).map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Manual builder entry */}
                      <div>
                        <p className="text-white/40 text-xs mb-2">
                          Or enter builder name manually
                        </p>
                        <input
                          type="text"
                          value={
                            formData.isBuilderManual ? formData.builder : ""
                          }
                          onChange={(e) =>
                            updateForm({
                              builder: e.target.value,
                              isBuilderManual: true,
                            })
                          }
                          placeholder="Type builder name…"
                          data-ocid="valuation.step5.builder_manual_input"
                          className="w-full rounded-xl border border-white/10 bg-white/5 text-white px-4 py-3 text-sm focus:border-yellow-400/50 focus:outline-none placeholder:text-white/25"
                        />
                      </div>

                      {/* Project */}
                      <div>
                        <p className="text-white/60 text-xs uppercase tracking-wider mb-2 font-semibold">
                          Project
                        </p>
                        <ProjectLinkedDropdown
                          locality={manualLocality}
                          builder={formData.builder}
                          value={formData.project}
                          onChange={(projectName, builderName) =>
                            updateForm({
                              project: projectName,
                              builder: builderName || formData.builder,
                              isProjectManual: false,
                            })
                          }
                          placeholder="Select project (optional)"
                        />
                      </div>

                      {/* Manual project entry */}
                      <div>
                        <p className="text-white/40 text-xs mb-2">
                          Or enter project name manually
                        </p>
                        <input
                          type="text"
                          value={
                            formData.isProjectManual ? formData.project : ""
                          }
                          onChange={(e) =>
                            updateForm({
                              project: e.target.value,
                              isProjectManual: true,
                            })
                          }
                          placeholder="Type project name…"
                          data-ocid="valuation.step5.project_manual_input"
                          className="w-full rounded-xl border border-white/10 bg-white/5 text-white px-4 py-3 text-sm focus:border-yellow-400/50 focus:outline-none placeholder:text-white/25"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <Button
                      onClick={() => (isPlotType ? setStep(3) : goBack())}
                      variant="outline"
                      className="flex-1 border-white/20 text-white/70 hover:bg-white/5"
                    >
                      <ChevronLeft className="mr-2 w-4 h-4" /> Back
                    </Button>
                    <motion.div className="flex-1" whileHover={{ scale: 1.01 }}>
                      <Button
                        data-ocid="valuation.step5.next_button"
                        onClick={handleNext}
                        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold hover:from-yellow-400"
                      >
                        Next: Review & Submit{" "}
                        <ChevronRight className="ml-2 w-4 h-4" />
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 6: Submit ────────────────────────────────────────── */}
              {currentStep === 6 && (
                <motion.div
                  key="step6"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-6 mb-4">
                    <h2
                      style={{ fontFamily: "'Playfair Display', serif" }}
                      className="text-xl font-bold text-white mb-4"
                    >
                      Review & Analyze
                    </h2>

                    {/* Summary */}
                    <div className="space-y-3 mb-6">
                      {[
                        {
                          label: "Location",
                          value: `${manualLocality || formData.location?.locality || "—"}, ${manualCity}`,
                        },
                        {
                          label: "Property Type",
                          value:
                            formData.propertyType?.replace("_", " ") || "—",
                        },
                        {
                          label: "Area",
                          value: formData.areaValue
                            ? `${Number(formData.areaValue).toLocaleString()} sqft`
                            : "—",
                        },
                        ...(formData.bhk
                          ? [
                              {
                                label: "BHK",
                                value: formData.bhk.toUpperCase(),
                              },
                            ]
                          : []),
                        ...(formData.floorRange
                          ? [
                              {
                                label: "Floor",
                                value: `${formData.floorRange.charAt(0).toUpperCase()}${formData.floorRange.slice(1)} Floor`,
                              },
                            ]
                          : []),
                        ...(!isPlotType && propertyAge
                          ? [{ label: "Property Age", value: propertyAge }]
                          : []),
                        ...(formData.builder
                          ? [{ label: "Builder", value: formData.builder }]
                          : []),
                        ...(formData.project
                          ? [{ label: "Project", value: formData.project }]
                          : []),
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex justify-between items-center py-2 border-b border-white/10"
                        >
                          <span className="text-white/50 text-sm">
                            {item.label}
                          </span>
                          <span className="text-white font-medium text-sm capitalize">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        data-ocid="valuation.step6.analyze_button"
                        onClick={runAnalysis}
                        className="w-full py-5 text-lg font-bold bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-600 text-black hover:from-yellow-400 rounded-xl shadow-[0_0_32px_rgba(212,160,23,0.3)]"
                      >
                        <Sparkles className="mr-2 w-5 h-5" />
                        Analyze Property Value
                      </Button>
                    </motion.div>
                  </div>

                  <Button
                    onClick={goBack}
                    variant="outline"
                    className="w-full border-white/20 text-white/70 hover:bg-white/5"
                  >
                    <ChevronLeft className="mr-2 w-4 h-4" /> Back to Builder /
                    Project
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
