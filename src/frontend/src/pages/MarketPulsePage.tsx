import {
  Activity,
  ArrowDown,
  Flame,
  MapPin,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useState } from "react";
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
import SmartLocationSearch from "../components/SmartLocationSearch";
import type { LocationRecord } from "../data/locationData";

const CITY_TABS = ["All", "Bangalore", "Pune", "Delhi", "Hyderabad"] as const;
type CityTab = (typeof CITY_TABS)[number];

const hotNeighborhoods = [
  {
    name: "Sarjapur Road",
    demand: 94,
    city: "Bangalore",
    price: 7800,
    yield: 4.8,
    stage: "Growth Corridor",
  },
  {
    name: "Whitefield",
    demand: 91,
    city: "Bangalore",
    price: 8500,
    yield: 4.0,
    stage: "Established",
  },
  {
    name: "Yelahanka",
    demand: 87,
    city: "Bangalore",
    price: 5600,
    yield: 4.3,
    stage: "Emerging",
  },
  {
    name: "Electronic City",
    demand: 82,
    city: "Bangalore",
    price: 5400,
    yield: 5.1,
    stage: "Growth Corridor",
  },
  {
    name: "Baner",
    demand: 81,
    city: "Pune",
    price: 9200,
    yield: 3.9,
    stage: "Established",
  },
  {
    name: "Hebbal",
    demand: 79,
    city: "Bangalore",
    price: 7200,
    yield: 4.2,
    stage: "Growth Corridor",
  },
  {
    name: "Hinjewadi",
    demand: 76,
    city: "Pune",
    price: 7800,
    yield: 4.6,
    stage: "Growth Corridor",
  },
  {
    name: "Dwarka",
    demand: 74,
    city: "Delhi",
    price: 7200,
    yield: 4.1,
    stage: "Established",
  },
  {
    name: "Gachibowli",
    demand: 72,
    city: "Hyderabad",
    price: 6800,
    yield: 4.3,
    stage: "Growth Corridor",
  },
];

const fastestSelling = [
  { area: "Indiranagar", days: 28, trend: "hot", city: "Bangalore" },
  { area: "Koramangala", days: 32, trend: "hot", city: "Bangalore" },
  { area: "Whitefield", days: 35, trend: "rising", city: "Bangalore" },
  { area: "Baner, Pune", days: 38, trend: "rising", city: "Pune" },
  { area: "Koregaon Park", days: 42, trend: "stable", city: "Pune" },
  { area: "Dwarka, Delhi", days: 55, trend: "stable", city: "Delhi" },
];

const priceDrops = [
  { area: "Hebbal", pct: -6.2, city: "Bangalore" },
  { area: "Outer Ring Road", pct: -4.8, city: "Bangalore" },
  { area: "Kharadi, Pune", pct: -3.5, city: "Pune" },
  { area: "Noida Ext., Delhi", pct: -2.9, city: "Delhi" },
];

const rentalDemand = [
  { area: "Electronic City", yield: 5.1, city: "Bangalore" },
  { area: "Sarjapur Road", yield: 4.8, city: "Bangalore" },
  { area: "Hinjewadi, Pune", yield: 4.6, city: "Pune" },
  { area: "Whitefield", yield: 4.4, city: "Bangalore" },
  { area: "Dwarka, Delhi", yield: 4.1, city: "Delhi" },
];

const priceTrendData = [
  { area: "Sarjapur Rd", price: 7800 },
  { area: "Whitefield", price: 8500 },
  { area: "Indiranagar", price: 14200 },
  { area: "Koramangala", price: 13500 },
  { area: "Hebbal", price: 7200 },
  { area: "Yelahanka", price: 5600 },
];

const stageColor: Record<string, string> = {
  "Growth Corridor": "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
  Established: "text-blue-300 bg-blue-500/15 border-blue-500/30",
  Emerging: "text-amber-300 bg-amber-500/15 border-amber-500/30",
  Saturated: "text-red-300 bg-red-500/15 border-red-500/30",
};

export default function MarketPulsePage() {
  const [cityTab, setCityTab] = useState<CityTab>("All");
  const [selectedArea, setSelectedArea] = useState<
    (typeof hotNeighborhoods)[0] | null
  >(null);
  const [showMap, setShowMap] = useState(false);

  const filterByCity = <T extends { city: string }>(arr: T[]) =>
    cityTab === "All" ? arr : arr.filter((x) => x.city === cityTab);

  const handleLocationSelect = (loc: LocationRecord) => {
    const match = hotNeighborhoods.find((n) =>
      n.name.toLowerCase().includes(loc.name.toLowerCase()),
    );
    setSelectedArea(match ?? null);
  };

  return (
    <BuyerLayout>
      <div className="max-w-6xl mx-auto" data-ocid="market.pulse.page">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Activity size={22} className="text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">
                Live Market Pulse
              </h1>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>
            <p className="text-white/50 text-sm">
              Real-time market intelligence across Indian cities
            </p>
          </div>
        </div>

        {/* Smart Search */}
        <div className="mb-4">
          <SmartLocationSearch
            placeholder="Analyze a specific market area..."
            onSelect={handleLocationSelect}
          />
        </div>

        {/* Map toggle */}
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            data-ocid="market.map.toggle"
            onClick={() => setShowMap((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 text-sm transition-all"
          >
            <MapPin size={14} className="text-[#D4AF37]" />
            {showMap ? "Hide Map" : "Show Map"}
          </button>
        </div>

        {showMap && (
          <div className="mb-6 rounded-2xl overflow-hidden border border-white/10">
            <MapPanel
              onSelect={(loc) =>
                setSelectedArea(
                  hotNeighborhoods.find((n) =>
                    n.name.toLowerCase().includes(loc.toLowerCase()),
                  ) ?? null,
                )
              }
            />
          </div>
        )}

        {/* Selected area analysis */}
        {selectedArea && (
          <div className="mb-6 bg-gradient-to-r from-[#D4AF37]/10 to-white/5 border border-[#D4AF37]/30 rounded-2xl p-5">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="text-[#D4AF37] text-xs uppercase tracking-widest mb-1">
                  Selected Area Analysis
                </p>
                <h2 className="text-white text-xl font-bold">
                  {selectedArea.name}
                </h2>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${stageColor[selectedArea.stage] ?? "text-white/50 bg-white/5 border-white/20"}`}
                >
                  {selectedArea.stage}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-white/40 text-xs">Demand Score</p>
                  <p className="text-[#D4AF37] font-bold text-xl">
                    {selectedArea.demand}/100
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-white/40 text-xs">Price/sqft</p>
                  <p className="text-white font-bold text-xl">
                    ₹{selectedArea.price.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-white/40 text-xs">Rental Yield</p>
                  <p className="text-emerald-400 font-bold text-xl">
                    {selectedArea.yield}%
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedArea(null)}
              className="mt-3 text-white/30 hover:text-white/60 text-xs underline"
            >
              Clear selection
            </button>
          </div>
        )}

        {/* City Tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {CITY_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              data-ocid="market.city.tab"
              onClick={() => setCityTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                cityTab === tab
                  ? "bg-[#D4AF37] text-black"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Price Trend Bar Chart */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-white font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-[#D4AF37]" /> Price Comparison
            (₹/sqft)
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={priceTrendData}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="area"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#0d1526",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "#fff",
                }}
                formatter={(v: number) => [
                  `₹${v.toLocaleString()}/sqft`,
                  "Price",
                ]}
              />
              <Bar dataKey="price" radius={[4, 4, 0, 0]}>
                {priceTrendData.map((entry, i) => (
                  <Cell
                    key={entry.area}
                    fill={i % 2 === 0 ? "#D4AF37" : "#c9a84c"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hottest Neighborhoods */}
          <div
            data-ocid="market.hottest.panel"
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Flame size={18} className="text-orange-400" />
              <h2 className="text-white font-bold">Hottest Neighborhoods</h2>
            </div>
            <div className="space-y-3">
              {filterByCity(hotNeighborhoods)
                .slice(0, 6)
                .map((n, i) => (
                  <button
                    type="button"
                    key={n.name}
                    onClick={() => setSelectedArea(n)}
                    className="w-full flex items-center gap-3 hover:bg-white/5 rounded-xl px-2 py-1 transition-colors text-left"
                    data-ocid={`market.neighborhood.item.${i + 1}`}
                  >
                    <span className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-white text-sm font-medium">
                          {n.name}
                        </span>
                        <span className="text-[#D4AF37] text-xs font-mono">
                          {n.demand}/100
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#D4AF37] to-amber-400 rounded-full transition-all duration-1000"
                          style={{ width: `${n.demand}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-white/30 text-xs">{n.city}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Fastest Selling */}
          <div
            data-ocid="market.fastest.panel"
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Zap size={18} className="text-blue-400" />
              <h2 className="text-white font-bold">Fastest Selling Areas</h2>
            </div>
            <div className="space-y-2">
              {filterByCity(fastestSelling).map((s) => (
                <div
                  key={s.area}
                  className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3"
                >
                  <span className="text-white text-sm">{s.area}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 text-xs font-mono">
                      {s.days} days
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.trend === "hot"
                          ? "bg-red-500/20 text-red-300"
                          : s.trend === "rising"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-white/10 text-white/40"
                      }`}
                    >
                      {s.trend === "hot"
                        ? "🔥 Hot"
                        : s.trend === "rising"
                          ? "↑ Rising"
                          : "Stable"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Biggest Price Drops */}
          <div
            data-ocid="market.price_drops.panel"
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <ArrowDown size={18} className="text-green-400" />
              <h2 className="text-white font-bold">Biggest Price Drops</h2>
              <span className="text-white/40 text-xs">(Buy Opportunities)</span>
            </div>
            <div className="space-y-3">
              {filterByCity(priceDrops).map((d) => (
                <div
                  key={d.area}
                  className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3"
                >
                  <span className="text-white text-sm">{d.area}</span>
                  <span className="text-green-400 font-bold font-mono text-sm">
                    {d.pct}% this month
                  </span>
                </div>
              ))}
            </div>
            <p className="text-white/30 text-xs mt-4">
              * Price drops can indicate buying opportunities in stable markets
            </p>
          </div>

          {/* Rental Demand */}
          <div
            data-ocid="market.rental.panel"
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={18} className="text-purple-400" />
              <h2 className="text-white font-bold">Highest Rental Demand</h2>
            </div>
            <div className="space-y-3">
              {filterByCity(rentalDemand).map((r, i) => (
                <div key={r.area} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-white text-sm">{r.area}</span>
                      <span className="text-purple-300 text-xs font-mono">
                        {r.yield}% yield
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all duration-1000"
                        style={{ width: `${(r.yield / 6) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}

const hotNeighborhoodCoords: Record<string, [number, number]> = {
  "Sarjapur Road": [12.901, 77.688],
  Whitefield: [12.9698, 77.7499],
  Yelahanka: [13.1007, 77.5963],
  "Electronic City": [12.8399, 77.677],
  Baner: [18.5625, 73.7724],
  Hebbal: [13.035, 77.597],
  Hinjewadi: [18.5971, 73.7367],
  Dwarka: [28.5921, 77.046],
  Gachibowli: [17.4401, 78.3489],
};

function MapPanel({ onSelect }: { onSelect: (name: string) => void }) {
  const names = Object.keys(hotNeighborhoodCoords);
  return (
    <div className="p-4 bg-white/3 rounded-2xl border border-white/10">
      <p className="text-white/40 text-xs mb-3">Select a neighbourhood:</p>
      <div className="grid grid-cols-3 gap-2">
        {names.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onSelect(name)}
            className="px-2 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:border-[#D4AF37]/40 hover:text-white text-xs transition-all text-center"
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
