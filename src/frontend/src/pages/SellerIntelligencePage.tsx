import { MapPin } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import SellerLayout from "../components/SellerLayout";
import SmartLocationSearch from "../components/SmartLocationSearch";
import type { LocationRecord } from "../data/locationData";

const MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const PRICE_TREND: Record<string, number[]> = {
  "6M": [7800, 8000, 8200, 8400, 8600, 8750],
  "1Y": [6800, 7000, 7200, 7400, 7600, 8750],
  "3Y": [5200, 5800, 6400, 7000, 7600, 8750],
};

const MOVERS_UP = [
  { area: "Devanahalli", change: "+11.4%" },
  { area: "Yelahanka", change: "+9.2%" },
  { area: "Whitefield", change: "+8.2%" },
];
const MOVERS_DOWN = [
  { area: "Old Airport Road", change: "-3.1%" },
  { area: "Jayanagar", change: "-1.8%" },
  { area: "BTM Layout", change: "-1.2%" },
];

const BASE_NEIGH = [
  {
    name: "Whitefield",
    psf: 9200,
    change: "+8.2%",
    demand: 88,
    competition: "High",
  },
  {
    name: "Sarjapur Road",
    psf: 8400,
    change: "+6.5%",
    demand: 84,
    competition: "Medium",
  },
  {
    name: "Indiranagar",
    psf: 11200,
    change: "+4.1%",
    demand: 91,
    competition: "Very High",
  },
  {
    name: "Koramangala",
    psf: 12500,
    change: "+3.8%",
    demand: 89,
    competition: "Very High",
  },
  {
    name: "HSR Layout",
    psf: 9800,
    change: "+5.9%",
    demand: 82,
    competition: "High",
  },
  {
    name: "Devanahalli",
    psf: 6200,
    change: "+11.4%",
    demand: 74,
    competition: "Low",
  },
  {
    name: "Electronic City",
    psf: 7100,
    change: "+4.7%",
    demand: 79,
    competition: "Medium",
  },
  {
    name: "Yelahanka",
    psf: 6800,
    change: "+9.2%",
    demand: 77,
    competition: "Low",
  },
];

function CountUp({
  end,
  prefix,
  suffix,
}: { end: number; prefix: string; suffix: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(end / 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setVal(end);
        clearInterval(timer);
      } else setVal(start);
    }, 20);
    return () => clearInterval(timer);
  }, [end]);
  return (
    <span>
      {prefix}
      {val.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function SellerIntelligencePage() {
  const [range, setRange] = useState("6M");
  const [selectedLocation, setSelectedLocation] =
    useState<LocationRecord | null>(null);
  const [selectedPropertyType, setSelectedPropertyType] = useState("Apartment");

  const seed = selectedLocation ? selectedLocation.name.length % 5 : 0;
  const priceMult = 1 + seed * 0.04;

  const trend = useMemo(() => {
    return PRICE_TREND[range].map((v) => Math.round(v * priceMult));
  }, [range, priceMult]);

  const neigh = useMemo(() => {
    if (!selectedLocation) return BASE_NEIGH;
    const derived = [
      {
        name: selectedLocation.name,
        psf: Math.round(7000 + seed * 800),
        change: `+${(7 + seed).toFixed(1)}%`,
        demand: 75 + seed * 4,
        competition: ["Low", "Medium", "High"][seed % 3],
      },
      ...BASE_NEIGH.slice(0, 7),
    ];
    return derived;
  }, [selectedLocation, seed]);

  const maxV = Math.max(...trend);
  const minV = Math.min(...trend) - 500;

  const STATS = [
    {
      label: "Avg Price / sqft",
      end: Math.round(8750 * priceMult),
      prefix: "₹",
      suffix: "",
    },
    {
      label: "Active Listings Nearby",
      end: 142 + seed * 10,
      prefix: "",
      suffix: "",
    },
    { label: "Sold This Month", end: 38 + seed * 3, prefix: "", suffix: "" },
    {
      label: "Avg Days-to-Sell",
      end: Math.max(20, 42 - seed * 2),
      prefix: "",
      suffix: " days",
    },
  ];

  return (
    <SellerLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Seller Intelligence <span className="text-[#D4AF37]">Terminal</span>
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Market analytics for informed pricing decisions
          </p>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-white/50 text-xs mb-2 flex items-center gap-1.5">
              <MapPin size={12} className="text-[#D4AF37]" /> Location
            </p>
            <SmartLocationSearch
              placeholder="Search locality, area or city..."
              onSelect={(loc) => setSelectedLocation(loc)}
            />
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-white/50 text-xs mb-2">Property Type</p>
            <div className="flex gap-2 flex-wrap">
              {["Apartment", "Villa", "Plot", "Commercial"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedPropertyType(t)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    selectedPropertyType === t
                      ? "bg-[#D4AF37] text-black"
                      : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -3 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center"
              data-ocid={`seller.intelligence.stat.item.${i + 1}`}
            >
              <p className="text-white/40 text-xs mb-1">{s.label}</p>
              <p className="text-[#D4AF37] text-xl font-bold">
                <CountUp end={s.end} prefix={s.prefix} suffix={s.suffix} />
              </p>
            </motion.div>
          ))}
        </div>

        {/* Price Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold">
              Market Price Trend (₹/sqft){" "}
              {selectedLocation ? `— ${selectedLocation.name}` : ""}
            </h2>
            <div className="flex gap-2">
              {["6M", "1Y", "3Y"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  data-ocid="seller.intelligence.range.toggle"
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    range === r
                      ? "bg-[#D4AF37] text-black"
                      : "bg-white/5 text-white/50 hover:bg-white/10"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <svg
            viewBox="0 0 500 130"
            className="w-full"
            preserveAspectRatio="none"
            role="img"
            aria-label="Market price trend"
          >
            <title>Market price trend</title>
            {trend.map((v, i) => {
              const x = (i / (trend.length - 1)) * 480 + 10;
              const y = 110 - ((v - minV) / (maxV - minV)) * 100;
              const nx = ((i + 1) / (trend.length - 1)) * 480 + 10;
              const ny =
                i < trend.length - 1
                  ? 110 - ((trend[i + 1] - minV) / (maxV - minV)) * 100
                  : y;
              return (
                <g key={`trend-${MONTHS[i]}`}>
                  {i < trend.length - 1 && (
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
                    ₹{(v / 1000).toFixed(1)}k
                  </text>
                  <text
                    x={x}
                    y={125}
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

        {/* Neighbourhood Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
        >
          <div className="p-5 border-b border-white/10">
            <h2 className="text-white font-bold">Neighbourhood Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {[
                    "Area",
                    "₹/sqft",
                    "YoY Change",
                    "Demand",
                    "Competition",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-white/40 text-xs font-medium px-4 py-3"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {neigh.map((n, i) => (
                  <tr
                    key={n.name}
                    className={`border-b border-white/5 hover:bg-white/3 transition-colors ${
                      i === 0 && selectedLocation ? "bg-[#D4AF37]/5" : ""
                    }`}
                  >
                    <td
                      className={`px-4 py-3 text-sm font-medium ${
                        i === 0 && selectedLocation
                          ? "text-[#D4AF37]"
                          : "text-white"
                      }`}
                    >
                      {n.name}
                    </td>
                    <td className="px-4 py-3 text-white/70 text-sm">
                      ₹{n.psf.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm font-medium ${n.change.startsWith("+") ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {n.change}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#D4AF37] rounded-full"
                            style={{ width: `${n.demand}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/50">
                          {n.demand}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          n.competition === "Very High"
                            ? "bg-red-500/20 text-red-400"
                            : n.competition === "High"
                              ? "bg-orange-500/20 text-orange-400"
                              : n.competition === "Medium"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {n.competition}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Market Movers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-5"
          >
            <h3 className="text-white font-semibold mb-3">Top Movers (↑)</h3>
            {MOVERS_UP.map((m) => (
              <div
                key={m.area}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <span className="text-white/70 text-sm">{m.area}</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {m.change}
                </span>
              </div>
            ))}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-5"
          >
            <h3 className="text-white font-semibold mb-3">
              Declining Areas (↓)
            </h3>
            {MOVERS_DOWN.map((m) => (
              <div
                key={m.area}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <span className="text-white/70 text-sm">{m.area}</span>
                <span className="text-red-400 font-bold text-sm">
                  {m.change}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </SellerLayout>
  );
}
