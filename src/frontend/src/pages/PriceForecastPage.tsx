import { useEffect, useState } from "react";
import BuyerLayout from "../components/BuyerLayout";
import SmartLocationSearch from "../components/SmartLocationSearch";
import type { LocationRecord } from "../data/locationData";
import { getDemandOutput } from "../engines/demandEngine";
import { getRawAmenityScore } from "../engines/infraEngine";
import {
  computeDynamicGrowthRate,
  getBaseMicroLocationPSF,
  getLocalityZone,
} from "../utils/localityEngine";

// ─── Known locality coordinates for engine calls ───────────────────────────

const LOCALITY_COORDS: Record<
  string,
  { lat: number; lng: number; city: string }
> = {
  // ── North Inner ─────────────────────────────────────────────────────────
  hebbal: { lat: 13.035, lng: 77.597, city: "Bangalore" },
  kempapura: { lat: 13.038, lng: 77.593, city: "Bangalore" },
  "sahakara nagar": { lat: 13.054, lng: 77.592, city: "Bangalore" },
  "hbr layout": { lat: 13.04, lng: 77.636, city: "Bangalore" },
  "hennur road": { lat: 13.05, lng: 77.627, city: "Bangalore" },
  hennur: { lat: 13.048, lng: 77.631, city: "Bangalore" },
  nagavara: { lat: 13.049, lng: 77.624, city: "Bangalore" },
  "manyata tech park": { lat: 13.046, lng: 77.619, city: "Bangalore" },
  "rt nagar": { lat: 13.022, lng: 77.591, city: "Bangalore" },

  // ── North Mid ───────────────────────────────────────────────────────────
  thanisandra: { lat: 13.065, lng: 77.624, city: "Bangalore" },
  kogilu: { lat: 13.073, lng: 77.612, city: "Bangalore" },
  kothanur: { lat: 13.082, lng: 77.596, city: "Bangalore" },
  vidyaranyapura: { lat: 13.073, lng: 77.567, city: "Bangalore" },
  doddabommasandra: { lat: 13.07, lng: 77.57, city: "Bangalore" },
  "k narayanapura": { lat: 13.044, lng: 77.605, city: "Bangalore" },
  amruthahalli: { lat: 13.041, lng: 77.576, city: "Bangalore" },
  "ganga nagar": { lat: 13.024, lng: 77.572, city: "Bangalore" },
  "banjara layout": { lat: 13.028, lng: 77.595, city: "Bangalore" },
  "rmv extension": { lat: 13.01, lng: 77.582, city: "Bangalore" },
  "rmv stage 2": { lat: 13.015, lng: 77.584, city: "Bangalore" },

  // ── North Outer ─────────────────────────────────────────────────────────
  jakkur: { lat: 13.076, lng: 77.59, city: "Bangalore" },
  yelahanka: { lat: 13.1, lng: 77.595, city: "Bangalore" },
  kattigenahalli: { lat: 13.09, lng: 77.6, city: "Bangalore" },
  anantapura: { lat: 13.085, lng: 77.573, city: "Bangalore" },
  kannur: { lat: 13.107, lng: 77.607, city: "Bangalore" },
  kalkere: { lat: 13.05, lng: 77.66, city: "Bangalore" },
  battarahalli: { lat: 13.03, lng: 77.67, city: "Bangalore" },

  // ── Airport Corridor ────────────────────────────────────────────────────
  bagalur: { lat: 13.165, lng: 77.726, city: "Bangalore" },
  devanahalli: { lat: 13.246, lng: 77.717, city: "Bangalore" },
  chikkajala: { lat: 13.14, lng: 77.65, city: "Bangalore" },
  shettigere: { lat: 13.17, lng: 77.68, city: "Bangalore" },
  sadahalli: { lat: 13.22, lng: 77.72, city: "Bangalore" },
  "ivc road": { lat: 13.15, lng: 77.7, city: "Bangalore" },

  // ── Northwest ───────────────────────────────────────────────────────────
  jalahalli: { lat: 13.025, lng: 77.541, city: "Bangalore" },
  rajanakunte: { lat: 13.08, lng: 77.555, city: "Bangalore" },
  abbigere: { lat: 13.045, lng: 77.513, city: "Bangalore" },
  yeshwanthpur: { lat: 13.0, lng: 77.548, city: "Bangalore" },
  rajajinagar: { lat: 12.991, lng: 77.553, city: "Bangalore" },

  // ── East Core ───────────────────────────────────────────────────────────
  whitefield: { lat: 12.9698, lng: 77.7499, city: "Bangalore" },
  kadugodi: { lat: 12.997, lng: 77.755, city: "Bangalore" },
  mahadevapura: { lat: 12.993, lng: 77.726, city: "Bangalore" },
  brookefield: { lat: 12.974, lng: 77.732, city: "Bangalore" },
  hoodi: { lat: 12.99, lng: 77.722, city: "Bangalore" },
  itpl: { lat: 12.985, lng: 77.728, city: "Bangalore" },
  kundalahalli: { lat: 12.977, lng: 77.732, city: "Bangalore" },
  nallurhalli: { lat: 12.975, lng: 77.748, city: "Bangalore" },

  // ── East Mid ────────────────────────────────────────────────────────────
  marathahalli: { lat: 12.958, lng: 77.701, city: "Bangalore" },
  "sarjapur road": { lat: 12.908, lng: 77.685, city: "Bangalore" },
  bellandur: { lat: 12.928, lng: 77.677, city: "Bangalore" },
  varthur: { lat: 12.942, lng: 77.733, city: "Bangalore" },
  panathur: { lat: 12.948, lng: 77.706, city: "Bangalore" },

  // ── East Outer ──────────────────────────────────────────────────────────
  gunjur: { lat: 12.929, lng: 77.747, city: "Bangalore" },
  balagere: { lat: 12.96, lng: 77.735, city: "Bangalore" },
  avalahalli: { lat: 12.97, lng: 77.72, city: "Bangalore" },

  // ── East Peripheral ─────────────────────────────────────────────────────
  "kr puram": { lat: 13.002, lng: 77.694, city: "Bangalore" },
  horamavu: { lat: 13.022, lng: 77.66, city: "Bangalore" },
  "budigere cross": { lat: 13.037, lng: 77.758, city: "Bangalore" },
  budigere: { lat: 13.031, lng: 77.749, city: "Bangalore" },
  dommasandra: { lat: 12.888, lng: 77.731, city: "Bangalore" },
  carmelaram: { lat: 12.894, lng: 77.73, city: "Bangalore" },
  hoskote: { lat: 13.073, lng: 77.798, city: "Bangalore" },

  // ── South ───────────────────────────────────────────────────────────────
  koramangala: { lat: 12.9352, lng: 77.6245, city: "Bangalore" },
  "hsr layout": { lat: 12.9116, lng: 77.6474, city: "Bangalore" },
  indiranagar: { lat: 12.9784, lng: 77.6408, city: "Bangalore" },
  jayanagar: { lat: 12.9248, lng: 77.5938, city: "Bangalore" },
  "electronic city": { lat: 12.839, lng: 77.677, city: "Bangalore" },
  "btm layout": { lat: 12.9165, lng: 77.616, city: "Bangalore" },
  "jp nagar": { lat: 12.9082, lng: 77.585, city: "Bangalore" },
  "bannerghatta road": { lat: 12.868, lng: 77.603, city: "Bangalore" },
  "kanakapura road": { lat: 12.881, lng: 77.571, city: "Bangalore" },

  // ── Central ─────────────────────────────────────────────────────────────
  domlur: { lat: 12.961, lng: 77.636, city: "Bangalore" },
  "mg road": { lat: 12.976, lng: 77.607, city: "Bangalore" },
  malleshwaram: { lat: 12.998, lng: 77.573, city: "Bangalore" },

  // ── Pune ────────────────────────────────────────────────────────────────
  baner: { lat: 18.566, lng: 73.787, city: "Pune" },
  wakad: { lat: 18.598, lng: 73.761, city: "Pune" },
  hinjewadi: { lat: 18.592, lng: 73.739, city: "Pune" },
  "koregaon park": { lat: 18.538, lng: 73.893, city: "Pune" },

  // ── Delhi NCR ───────────────────────────────────────────────────────────
  dwarka: { lat: 28.593, lng: 77.045, city: "Delhi NCR" },
};

function displayName(key: string): string {
  return key
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

type Horizon = "y1" | "y3" | "y5";
const HORIZON_LABELS: Record<Horizon, string> = {
  y1: "1 Year",
  y3: "3 Years",
  y5: "5 Years",
};
const PROP_MULTIPLIERS: Record<string, number> = {
  Flat: 1.0,
  Villa: 1.15,
  Plot: 1.3,
};

// ─── Compute dynamic locality data ──────────────────────────────────────────

function buildLocalityData() {
  return Object.keys(LOCALITY_COORDS).map((key) => {
    const coords = LOCALITY_COORDS[key];
    const currentPSF = getBaseMicroLocationPSF(key);
    const demand = getDemandOutput(coords.lat, coords.lng, key);
    const infraScore = Math.round(
      getRawAmenityScore(coords.lat, coords.lng) * 100,
    );
    const growth = computeDynamicGrowthRate(
      key,
      demand.demandScore,
      infraScore,
    );
    const zone = getLocalityZone(key);

    return {
      name: displayName(key),
      key,
      city: coords.city,
      current: currentPSF,
      y1: growth.y1,
      y3: growth.y3,
      y5: growth.y5,
      demandScore: demand.demandScore,
      infraScore,
      zone,
    };
  });
}

// ─── Mini sparkline chart ─────────────────────────────────────────────────────

function MiniChart({ data, color }: { data: number[]; color: string }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 200);
    return () => clearTimeout(t);
  }, []);
  const max = Math.max(...data);
  const w = 200;
  const h = 60;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h * 0.9}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14" aria-hidden="true">
      <defs>
        <linearGradient
          id={`grad${color.replace("#", "")}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={drawn ? 2 : 0}
        strokeLinejoin="round"
        style={{ transition: "stroke-width 0.5s" }}
      />
      <polygon
        points={`0,${h} ${points} ${w},${h}`}
        fill={`url(#grad${color.replace("#", "")})`}
        style={{ opacity: drawn ? 1 : 0, transition: "opacity 0.6s" }}
      />
    </svg>
  );
}

function buildTrendData(
  current: number,
  growthPct: number,
  points: number,
): number[] {
  const result: number[] = [];
  for (let i = 0; i <= points; i++) {
    result.push(Math.round(current * (1 + (growthPct / 100) * (i / points))));
  }
  return result;
}

// ─── Page component ──────────────────────────────────────────────────────────────

export default function PriceForecastPage() {
  const [horizon, setHorizon] = useState<Horizon>("y3");
  const [propType, setPropType] = useState<"Flat" | "Villa" | "Plot">("Flat");
  const [selectedCity, setSelectedCity] = useState("All");
  const [selectedLoc, setSelectedLoc] = useState<
    ReturnType<typeof buildLocalityData>[0] | null
  >(null);
  const [searchKey, setSearchKey] = useState("");

  // Build locality data from live engines (computed once per render cycle)
  const localities = buildLocalityData();

  const cities = ["All", ...Array.from(new Set(localities.map((l) => l.city)))];
  const multiplier = PROP_MULTIPLIERS[propType];

  const filtered = localities.filter((l) => {
    if (selectedCity !== "All" && l.city !== selectedCity) return false;
    if (searchKey && !l.name.toLowerCase().includes(searchKey.toLowerCase()))
      return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => b[horizon] - a[horizon]);

  const handleSearchSelect = (loc: LocationRecord) => {
    const qLower = loc.name.toLowerCase();
    const match =
      localities.find((l) => l.name.toLowerCase() === qLower) ??
      localities.find((l) => l.key === qLower) ??
      localities.find(
        (l) => l.key.includes(qLower) || qLower.includes(l.key),
      ) ??
      null;
    if (match) {
      setSelectedLoc(match);
      setSelectedCity("All");
      setSearchKey("");
    } else {
      setSearchKey(loc.name);
    }
  };

  const focusedLoc = selectedLoc ?? sorted[0] ?? null;

  return (
    <BuyerLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Price Forecast</h1>
          <p className="text-white/50">
            Dynamic growth projections derived from real PSF data, demand
            scores, and infra signals.
          </p>
          <p className="text-[#D4AF37]/60 text-xs mt-1">
            • Rates computed from localityEngine PSF + demandEngine +
            infraEngine — no static constants
          </p>
        </div>

        {/* Smart Search */}
        <div className="mb-6">
          <SmartLocationSearch
            placeholder="Search any locality for price forecast..."
            onSelect={handleSearchSelect}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex gap-2">
            {(["Flat", "Villa", "Plot"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPropType(t)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  propType === t
                    ? "bg-[#D4AF37] text-black"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="flex gap-2">
            {(["y1", "y3", "y5"] as Horizon[]).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizon(h)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  horizon === h
                    ? "bg-[#D4AF37] text-black"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {HORIZON_LABELS[h]}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {cities.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setSelectedCity(city)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedCity === city
                    ? "bg-blue-500/30 text-blue-300 border border-blue-500/50"
                    : "bg-white/5 text-white/40 hover:bg-white/10"
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* Featured analysis */}
        {focusedLoc && (
          <div className="bg-gradient-to-r from-[#D4AF37]/10 to-white/5 border border-[#D4AF37]/30 rounded-2xl p-6 mb-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[#D4AF37] text-xs uppercase tracking-widest mb-1">
                  Detailed Analysis
                </p>
                <h2 className="text-white text-xl font-bold">
                  {focusedLoc.name}
                </h2>
                <p className="text-white/40 text-sm">{focusedLoc.city}</p>
                <div className="flex gap-3 mt-2">
                  <span className="text-white/30 text-xs">
                    Demand: {focusedLoc.demandScore}/100
                  </span>
                  <span className="text-white/30 text-xs">
                    Infra: {focusedLoc.infraScore}/100
                  </span>
                  <span className="text-white/30 text-xs">
                    Zone: {focusedLoc.zone}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {(["y1", "y3", "y5"] as Horizon[]).map((h) => {
                  const growth = Math.round(focusedLoc[h] * multiplier);
                  const forecast = Math.round(
                    focusedLoc.current * multiplier * (1 + growth / 100),
                  );
                  return (
                    <div
                      key={h}
                      className={`text-center p-3 rounded-xl border ${
                        horizon === h
                          ? "border-[#D4AF37]/50 bg-[#D4AF37]/10"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      <p className="text-white/40 text-xs">
                        {HORIZON_LABELS[h]}
                      </p>
                      <p className="text-[#D4AF37] font-bold text-lg">
                        +{growth}%
                      </p>
                      <p className="text-white/60 text-xs">
                        ₹{Math.round(forecast / 1000)}K/sqft
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-4">
              <MiniChart
                data={buildTrendData(
                  focusedLoc.current * multiplier,
                  focusedLoc[horizon] * multiplier,
                  8,
                )}
                color="#D4AF37"
              />
              <div className="flex justify-between text-xs text-white/30 mt-1">
                <span>
                  Now ₹{Math.round((focusedLoc.current * multiplier) / 1000)}K
                </span>
                <span>
                  Forecast ₹
                  {Math.round(
                    (focusedLoc.current *
                      multiplier *
                      (1 + (focusedLoc[horizon] * multiplier) / 100)) /
                      1000,
                  )}
                  K / sqft
                </span>
              </div>
              {/* Scenario Cards */}
              <div className="mt-5">
                <p className="text-white/40 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span>AI Scenario Projections</span>
                  <span className="text-[#D4AF37]/60">
                    ({HORIZON_LABELS[horizon]})
                  </span>
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: "Conservative",
                      factor: 0.6,
                      color: "#60a5fa",
                      desc: "Low growth environment",
                    },
                    {
                      label: "Realistic",
                      factor: 1.0,
                      color: "#D4AF37",
                      desc: "Historical trend continues",
                    },
                    {
                      label: "Aggressive",
                      factor: 1.6,
                      color: "#22c55e",
                      desc: "Infra + demand surge",
                    },
                  ].map((scenario) => {
                    const scenarioGrowth = Math.round(
                      focusedLoc[horizon] * multiplier * scenario.factor,
                    );
                    const scenarioPrice = Math.round(
                      focusedLoc.current *
                        multiplier *
                        (1 + scenarioGrowth / 100),
                    );
                    return (
                      <div
                        key={scenario.label}
                        className="p-3 rounded-xl border border-white/10 bg-white/3"
                      >
                        <div
                          className="text-[10px] font-bold uppercase tracking-wider mb-1"
                          style={{ color: scenario.color }}
                        >
                          {scenario.label}
                        </div>
                        <div
                          className="text-lg font-bold font-mono"
                          style={{ color: scenario.color }}
                        >
                          +{scenarioGrowth}%
                        </div>
                        <div className="text-white/60 text-xs mt-0.5">
                          ₹{Math.round(scenarioPrice / 1000)}K/sqft
                        </div>
                        <div className="text-white/25 text-[9px] mt-1">
                          {scenario.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-white/20 text-[10px] mt-3 italic">
                  Dynamic projections from localityEngine PSF + demand/infra
                  scores. Not financial advice.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Locality grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((loc) => {
            const growth = Math.round(loc[horizon] * multiplier);
            const forecast = Math.round(
              loc.current * multiplier * (1 + growth / 100),
            );
            const isFocused = selectedLoc?.key === loc.key;
            return (
              <button
                type="button"
                key={loc.key}
                onClick={() => setSelectedLoc(isFocused ? null : loc)}
                className={`text-left bg-white/5 border rounded-2xl p-5 transition-all hover:-translate-y-0.5 ${
                  isFocused
                    ? "border-[#D4AF37]/50 bg-[#D4AF37]/8"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-white font-semibold">{loc.name}</p>
                    <p className="text-white/40 text-xs">{loc.city}</p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-lg ${
                      growth >= 30
                        ? "bg-green-500/20 text-green-300"
                        : growth >= 15
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-blue-500/20 text-blue-300"
                    }`}
                  >
                    +{growth}%
                  </span>
                </div>
                <MiniChart
                  data={buildTrendData(loc.current * multiplier, growth, 6)}
                  color={
                    growth >= 30
                      ? "#10b981"
                      : growth >= 15
                        ? "#D4AF37"
                        : "#60a5fa"
                  }
                />
                <div className="flex justify-between text-xs mt-2">
                  <span className="text-white/40">
                    Now: ₹{Math.round((loc.current * multiplier) / 1000)}K/sqft
                  </span>
                  <span className="text-[#D4AF37] font-semibold">
                    ₹{Math.round(forecast / 1000)}K
                  </span>
                </div>
                <div className="flex gap-2 mt-1">
                  <span className="text-white/20 text-[10px]">
                    D:{loc.demandScore}
                  </span>
                  <span className="text-white/20 text-[10px]">
                    I:{loc.infraScore}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {sorted.length === 0 && (
          <div className="text-center py-16 text-white/30">
            <p>No localities match your filters.</p>
            <button
              type="button"
              onClick={() => {
                setSearchKey("");
                setSelectedCity("All");
              }}
              className="mt-3 text-[#D4AF37] underline text-sm"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}
