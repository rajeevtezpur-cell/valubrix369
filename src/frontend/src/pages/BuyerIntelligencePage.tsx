import { ArrowUpDown, BarChart3, Download, MapPin, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BuyerLayout from "../components/BuyerLayout";
import LocationSelectMap from "../components/LocationSelectMap";
import SmartLocationSearch from "../components/SmartLocationSearch";
import type { LocationRecord } from "../data/locationData";
import { getDemandOutput } from "../engines/demandEngine";
import { getRawAmenityScore } from "../engines/infraEngine";
import {
  computeDynamicGrowthRate,
  getBaseMicroLocationPSF,
  getLocalityZone,
} from "../utils/localityEngine";
import { estimateRent } from "../utils/rentEngine";

// ─── Dynamic neighbourhood data ───────────────────────────────────────────────
// All data is aggregated from localityEngine + demandEngine + rentEngine
// No static arrays.

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
};

function displayName(key: string): string {
  return key
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function buildNeighbourhoodData() {
  return Object.entries(LOCALITY_COORDS).map(([key, coords]) => {
    const psf = getBaseMicroLocationPSF(key);
    const demand = getDemandOutput(coords.lat, coords.lng, key);
    const infraScore = Math.round(
      getRawAmenityScore(coords.lat, coords.lng) * 100,
    );
    const growth = computeDynamicGrowthRate(
      key,
      demand.demandScore,
      infraScore,
    );
    // Gross yield = (monthly rent × 12) / (psf × 1000) × 100
    const rentResult = estimateRent({
      locality: key,
      bhk: 2,
      area: 1000,
      propertyValue: psf * 1000,
      propertyType: "apartment",
      furnishing: "Semi Furnished",
    });
    const monthlyRent = rentResult?.estimatedMonthlyRent || 0;
    const grossYield =
      psf > 0 && monthlyRent > 0
        ? Math.round(((monthlyRent * 12) / (psf * 1000)) * 1000) / 10
        : 0;

    // Investment score: demand + infra + growth composite
    const investScore = Math.round(
      demand.demandScore * 0.4 +
        infraScore * 0.3 +
        Math.min(growth.y3 / 0.55, 100) * 0.3,
    );

    // YoY change label from y1 rate
    const change = `+${growth.y1}%`;

    return {
      locality: displayName(key),
      key,
      city: coords.city,
      price: psf,
      change,
      demand: demand.demandScore,
      invest: Math.min(investScore, 100),
      infra: infraScore,
      grossYield,
      positive: true,
    };
  });
}

type SortKey = "price" | "demand" | "invest" | "infra" | "grossYield";

function useCountUp(target: number, duration = 1500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

export default function BuyerIntelligencePage() {
  const [sortKey, setSortKey] = useState<SortKey>("invest");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState<
    ReturnType<typeof buildNeighbourhoodData>[0] | null
  >(null);
  const [showMap, setShowMap] = useState(false);

  // Build dynamic neighbourhood data from engines
  const neighbourhoods = useMemo(() => buildNeighbourhoodData(), []);

  // Dynamic KPI strip
  const avgPSF = useMemo(
    () =>
      Math.round(
        neighbourhoods.reduce((s, n) => s + n.price, 0) / neighbourhoods.length,
      ),
    [neighbourhoods],
  );
  const avgDemand = useMemo(
    () =>
      Math.round(
        neighbourhoods.reduce((s, n) => s + n.demand, 0) /
          neighbourhoods.length,
      ),
    [neighbourhoods],
  );
  const avgYield = useMemo(() => {
    const valid = neighbourhoods.filter((n) => n.grossYield > 0);
    return valid.length > 0
      ? Math.round(
          (valid.reduce((s, n) => s + n.grossYield, 0) / valid.length) * 10,
        ) / 10
      : 0;
  }, [neighbourhoods]);

  const animAvgPSF = useCountUp(avgPSF);
  const animAvgDemand = useCountUp(avgDemand);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sorted = [...neighbourhoods].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortAsc ? diff : -diff;
  });

  const handleSearchSelect = (loc: LocationRecord) => {
    const qLower = loc.name.toLowerCase();
    const match =
      neighbourhoods.find((n) => n.locality.toLowerCase() === qLower) ??
      neighbourhoods.find((n) => n.key === qLower) ??
      neighbourhoods.find(
        (n) => n.key.includes(qLower) || qLower.includes(n.key),
      ) ??
      null;
    setSelectedLoc(match ?? null);
  };

  const topFive = [...neighbourhoods]
    .sort((a, b) => b.invest - a.invest)
    .slice(0, 5);

  const comparables = selectedLoc
    ? neighbourhoods
        .filter((n) => n.city === selectedLoc.city && n.key !== selectedLoc.key)
        .slice(0, 3)
    : [];

  // Generate AI market summary from dynamic data
  const topLocality = topFive[0]?.locality ?? "Sarjapur Road";
  const highGrowthLocalities = neighbourhoods
    .filter((n) => n.invest >= 80)
    .map((n) => n.locality)
    .slice(0, 3)
    .join(", ");
  const aiSummary = `Bangalore's market shows strong momentum. ${topLocality} leads investment scores. ${
    highGrowthLocalities
      ? `High-growth corridors: ${highGrowthLocalities}. `
      : ""
  }Average gross yield across tracked micro-markets: ${avgYield}%. Average demand score: ${avgDemand}/100. Data sourced from localityEngine, demandEngine, and rentEngine.`;

  return (
    <BuyerLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white font-mono tracking-tight">
            <span className="text-[#D4AF37]">[</span> REAL ESTATE INTELLIGENCE
            TERMINAL <span className="text-[#D4AF37]">]</span>
          </h1>
          <p className="text-white/40 text-sm mt-0.5 font-mono">
            Bangalore Market — Dynamic Analytics • localityEngine + demandEngine
            + rentEngine
          </p>
        </div>

        {/* Dynamic KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "Avg Price / sqft",
              value: `₹${animAvgPSF.toLocaleString()}`,
              sub: "localityEngine median",
            },
            {
              label: "Localities Tracked",
              value: String(neighbourhoods.length),
              sub: "Active data",
            },
            {
              label: "Avg Demand Score",
              value: `${animAvgDemand}/100`,
              sub: "demandEngine",
            },
            {
              label: "Avg Gross Yield",
              value: `${avgYield}%`,
              sub: "rentEngine estimate",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 font-mono"
            >
              <p className="text-white/40 text-xs uppercase tracking-widest">
                {stat.label}
              </p>
              <p className="text-[#D4AF37] text-2xl font-bold mt-1">
                {stat.value}
              </p>
              <p className="text-white/30 text-xs mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Smart Search */}
        <div className="mb-4">
          <SmartLocationSearch
            placeholder="Search any locality for detailed intelligence..."
            onSelect={handleSearchSelect}
          />
        </div>

        {/* Map toggle + controls */}
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowMap((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 text-sm transition-all"
          >
            <MapPin size={14} className="text-[#D4AF37]" />
            {showMap ? "Hide Map" : "Select on Map"}
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 text-sm transition-all"
          >
            <Download size={14} /> Export
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 text-sm transition-all"
          >
            <Share2 size={14} /> Share
          </button>
        </div>

        {showMap && (
          <div className="mb-6">
            <LocationSelectMap
              height="300px"
              onLocationSelect={(result) => {
                if (result.locality) {
                  const qLower = result.locality.name.toLowerCase();
                  const match =
                    neighbourhoods.find(
                      (n) => n.locality.toLowerCase() === qLower,
                    ) ??
                    neighbourhoods.find((n) => n.key === qLower) ??
                    neighbourhoods.find(
                      (n) => n.key.includes(qLower) || qLower.includes(n.key),
                    ) ??
                    null;
                  setSelectedLoc(match);
                }
              }}
            />
          </div>
        )}

        {/* Selected location */}
        {selectedLoc && (
          <div className="mb-6 bg-gradient-to-r from-[#D4AF37]/10 to-white/5 border border-[#D4AF37]/30 rounded-2xl p-5">
            <p className="text-[#D4AF37] text-xs uppercase tracking-widest mb-2">
              Location Intelligence
            </p>
            <div className="flex flex-wrap items-start gap-6">
              <div>
                <h2 className="text-white text-xl font-bold">
                  {selectedLoc.locality}
                </h2>
                <p className="text-white/40 text-sm">
                  {selectedLoc.city} • Zone:{" "}
                  {selectedLoc.key ? getLocalityZone(selectedLoc.key) : ""}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1">
                <div>
                  <p className="text-white/40 text-xs">Price/sqft</p>
                  <p className="text-[#D4AF37] font-bold text-lg">
                    ₹{selectedLoc.price.toLocaleString()}
                  </p>
                  <p className="text-emerald-400 text-xs">
                    {selectedLoc.change} Y1
                  </p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Demand</p>
                  <p className="text-white font-bold text-lg">
                    {selectedLoc.demand}/100
                  </p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Invest Score</p>
                  <p className="text-white font-bold text-lg">
                    {selectedLoc.invest}/100
                  </p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Infra Score</p>
                  <p className="text-white font-bold text-lg">
                    {selectedLoc.infra}/100
                  </p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Gross Yield</p>
                  <p className="text-emerald-400 font-bold text-lg">
                    {selectedLoc.grossYield}%
                  </p>
                </div>
              </div>
            </div>
            {comparables.length > 0 && (
              <div className="mt-4">
                <p className="text-white/40 text-xs mb-2">
                  Comparable Areas in {selectedLoc.city}
                </p>
                <div className="flex gap-3 flex-wrap">
                  {comparables.map((c) => (
                    <button
                      type="button"
                      key={c.key}
                      onClick={() => setSelectedLoc(c)}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/70 hover:border-[#D4AF37]/40 transition-colors"
                    >
                      {c.locality} · ₹{c.price.toLocaleString()} · {c.invest}
                      /100
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSelectedLoc(null)}
              className="mt-3 text-white/30 text-xs underline hover:text-white/60"
            >
              Clear
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Sortable table */}
          <div className="lg:col-span-3">
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
                <BarChart3 size={16} className="text-[#D4AF37]" />
                <h2 className="text-white font-bold text-sm">
                  Neighbourhood Intelligence Table
                </h2>
                <span className="ml-auto text-white/20 text-xs font-mono">
                  {neighbourhoods.length} localities
                </span>
              </div>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-xs font-mono">
                  <thead className="sticky top-0 bg-[#0A0F1E] z-10">
                    <tr className="text-white/30 border-b border-white/10">
                      <th className="text-left px-4 py-3">Locality</th>
                      {(
                        [
                          "price",
                          "demand",
                          "invest",
                          "infra",
                          "grossYield",
                        ] as SortKey[]
                      ).map((k) => (
                        <th key={k} className="text-right px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleSort(k)}
                            className="flex items-center gap-1 ml-auto hover:text-white/70 transition-colors"
                          >
                            {k === "grossYield"
                              ? "Yield"
                              : k.charAt(0).toUpperCase() + k.slice(1)}
                            <ArrowUpDown size={10} />
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((n) => (
                      <tr
                        key={n.key}
                        onClick={() => setSelectedLoc(n)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && setSelectedLoc(n)
                        }
                        className={`border-b border-white/5 cursor-pointer transition-colors ${
                          selectedLoc?.key === n.key
                            ? "bg-[#D4AF37]/8 border-[#D4AF37]/20"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="text-white font-semibold">
                            {n.locality}
                          </div>
                          <div className="text-white/30">{n.city}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-[#D4AF37]">
                            ₹{n.price.toLocaleString()}
                          </span>
                          <div className="text-xs text-emerald-400">
                            {n.change}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-white">
                          {n.demand}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-lg ${
                              n.invest >= 85
                                ? "bg-emerald-500/20 text-emerald-300"
                                : n.invest >= 75
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-blue-500/20 text-blue-300"
                            }`}
                          >
                            {n.invest}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-white">
                          {n.infra}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-emerald-400">
                            {n.grossYield > 0 ? `${n.grossYield}%` : "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-white/50 text-xs uppercase tracking-widest mb-4">
                Top Investment Scores
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={topFive}
                  layout="vertical"
                  margin={{ left: -10, right: 10, top: 0, bottom: 0 }}
                >
                  <XAxis
                    type="number"
                    domain={[50, 100]}
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="locality"
                    type="category"
                    tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0d1526",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="invest" radius={[0, 4, 4, 0]}>
                    {topFive.map((entry, i) => (
                      <Cell
                        key={entry.key}
                        fill={i === 0 ? "#D4AF37" : "#856b24"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Dynamic AI Market Summary */}
            <div className="bg-white/5 border border-[#D4AF37]/20 rounded-2xl p-5">
              <p className="text-[#D4AF37] text-xs uppercase tracking-widest mb-3">
                AI Market Summary
              </p>
              <p className="text-white/60 text-sm leading-relaxed">
                {aiSummary}
              </p>
            </div>
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}
