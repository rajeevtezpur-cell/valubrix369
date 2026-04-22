import { Home, MapPin, TrendingUp, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import AuditPanel from "../components/AuditPanel";
import BuyerLayout from "../components/BuyerLayout";
import GlobalMapComponent from "../components/GlobalMapComponent";
import LocalityDropdown from "../components/LocalityDropdown";
import { fmtMonthlyRent as fmtRent } from "../utils/rentDisplay";

// fmtRent imported from rentDisplay.ts

interface BhkRent {
  one: [number, number];
  two: [number, number];
  three: [number, number];
}

interface Locality {
  name: string;
  city: string;
  coords: [number, number];
  yield: number;
  avgRent: number;
  occupancy: number;
  bhkRent: BhkRent;
  pricePerSqft: number;
  tenantProfile: string[];
  growthYoY: number;
}

const LOCALITIES: Locality[] = [
  {
    name: "Koramangala",
    city: "Bangalore",
    coords: [12.9352, 77.6245],
    yield: 4.6,
    avgRent: 38000,
    occupancy: 94,
    bhkRent: {
      one: [18000, 24000],
      two: [30000, 42000],
      three: [50000, 70000],
    },
    pricePerSqft: 9800,
    tenantProfile: ["IT/Tech", "Startups"],
    growthYoY: 12.4,
  },
  {
    name: "Indiranagar",
    city: "Bangalore",
    coords: [12.9784, 77.6408],
    yield: 4.2,
    avgRent: 42000,
    occupancy: 91,
    bhkRent: {
      one: [20000, 28000],
      two: [35000, 48000],
      three: [58000, 80000],
    },
    pricePerSqft: 10500,
    tenantProfile: ["IT/Tech", "Family"],
    growthYoY: 10.8,
  },
  {
    name: "Whitefield",
    city: "Bangalore",
    coords: [12.9698, 77.7499],
    yield: 4.8,
    avgRent: 32000,
    occupancy: 89,
    bhkRent: {
      one: [14000, 20000],
      two: [24000, 34000],
      three: [38000, 55000],
    },
    pricePerSqft: 8500,
    tenantProfile: ["IT/Tech", "Family"],
    growthYoY: 14.2,
  },
  {
    name: "Electronic City",
    city: "Bangalore",
    coords: [12.8399, 77.677],
    yield: 5.1,
    avgRent: 22000,
    occupancy: 88,
    bhkRent: {
      one: [10000, 15000],
      two: [16000, 24000],
      three: [26000, 38000],
    },
    pricePerSqft: 5400,
    tenantProfile: ["IT/Tech", "Students"],
    growthYoY: 11.6,
  },
  {
    name: "Hebbal",
    city: "Bangalore",
    coords: [13.035, 77.597],
    yield: 4.2,
    avgRent: 30000,
    occupancy: 85,
    bhkRent: {
      one: [13000, 18000],
      two: [22000, 32000],
      three: [35000, 50000],
    },
    pricePerSqft: 7200,
    tenantProfile: ["IT/Tech", "Family"],
    growthYoY: 13.1,
  },
  {
    name: "HSR Layout",
    city: "Bangalore",
    coords: [12.9116, 77.6389],
    yield: 4.5,
    avgRent: 34000,
    occupancy: 92,
    bhkRent: {
      one: [16000, 22000],
      two: [27000, 38000],
      three: [44000, 62000],
    },
    pricePerSqft: 9200,
    tenantProfile: ["IT/Tech", "Startups"],
    growthYoY: 11.8,
  },
  {
    name: "Sarjapur Road",
    city: "Bangalore",
    coords: [12.901, 77.688],
    yield: 4.9,
    avgRent: 28000,
    occupancy: 90,
    bhkRent: {
      one: [12000, 17000],
      two: [20000, 30000],
      three: [32000, 46000],
    },
    pricePerSqft: 7800,
    tenantProfile: ["IT/Tech", "Family"],
    growthYoY: 15.3,
  },
  {
    name: "Devanahalli",
    city: "Bangalore",
    coords: [13.25, 77.71],
    yield: 5.2,
    avgRent: 18000,
    occupancy: 82,
    bhkRent: { one: [8000, 12000], two: [13000, 19000], three: [22000, 32000] },
    pricePerSqft: 4800,
    tenantProfile: ["IT/Tech", "Family"],
    growthYoY: 18.6,
  },
  {
    name: "Hinjewadi",
    city: "Pune",
    coords: [18.5971, 73.7367],
    yield: 4.6,
    avgRent: 26000,
    occupancy: 87,
    bhkRent: {
      one: [11000, 16000],
      two: [18000, 26000],
      three: [30000, 44000],
    },
    pricePerSqft: 7800,
    tenantProfile: ["IT/Tech", "Family"],
    growthYoY: 13.4,
  },
  {
    name: "Baner",
    city: "Pune",
    coords: [18.5625, 73.7724],
    yield: 3.9,
    avgRent: 35000,
    occupancy: 90,
    bhkRent: {
      one: [16000, 22000],
      two: [27000, 38000],
      three: [45000, 62000],
    },
    pricePerSqft: 9200,
    tenantProfile: ["IT/Tech", "Family"],
    growthYoY: 9.8,
  },
  {
    name: "Koregaon Park",
    city: "Pune",
    coords: [18.5362, 73.8955],
    yield: 3.6,
    avgRent: 48000,
    occupancy: 88,
    bhkRent: {
      one: [22000, 30000],
      two: [38000, 54000],
      three: [65000, 90000],
    },
    pricePerSqft: 13000,
    tenantProfile: ["IT/Tech", "Expats"],
    growthYoY: 8.2,
  },
  {
    name: "Gurgaon Sector 45",
    city: "Delhi",
    coords: [28.4089, 77.0433],
    yield: 3.8,
    avgRent: 40000,
    occupancy: 85,
    bhkRent: {
      one: [18000, 25000],
      two: [32000, 46000],
      three: [55000, 78000],
    },
    pricePerSqft: 8500,
    tenantProfile: ["IT/Tech", "Corporates"],
    growthYoY: 9.6,
  },
  {
    name: "Andheri",
    city: "Mumbai",
    coords: [19.1136, 72.8697],
    yield: 4.2,
    avgRent: 52000,
    occupancy: 92,
    bhkRent: {
      one: [24000, 34000],
      two: [42000, 60000],
      three: [72000, 100000],
    },
    pricePerSqft: 16000,
    tenantProfile: ["IT/Tech", "Corporates"],
    growthYoY: 8.8,
  },
];

function nameSimilarity(name: string, query: string): number {
  const n = name.toLowerCase();
  const q = query.toLowerCase().trim();
  if (n === q) return 100;
  if (n.startsWith(q)) return 80;
  if (n.includes(q)) return 60;
  let common = 0;
  for (const c of q) if (n.includes(c)) common++;
  return Math.round((common / Math.max(n.length, q.length)) * 40);
}

const RECENT_KEY = "rental_recent_searches";
function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveRecent(name: string) {
  const prev = getRecent().filter((r) => r !== name);
  localStorage.setItem(RECENT_KEY, JSON.stringify([name, ...prev].slice(0, 5)));
}

function LocalityCard({
  loc,
  index,
  isSelected,
  isExpanded,
  onSelect,
  onExpand,
}: {
  loc: Locality;
  index: number;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onExpand: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      data-ocid={`rental.item.${index + 1}`}
      className={`rounded-2xl border transition-all cursor-pointer ${
        isSelected
          ? "border-[#D4AF37]/50 bg-[#D4AF37]/5"
          : "border-white/10 bg-white/5 hover:border-white/20"
      }`}
      onClick={onSelect}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-white font-bold">{loc.name}</h3>
            <p className="text-white/40 text-xs">{loc.city}</p>
          </div>
          <span
            className="text-xs px-2 py-1 rounded-lg font-bold"
            style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37" }}
          >
            {loc.yield}% yield
          </span>
        </div>

        {/* BHK Rent Breakdown */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">1 BHK</span>
            <span className="text-white font-semibold">
              {fmtRent(loc.bhkRent.one[0])} – {fmtRent(loc.bhkRent.one[1])}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">2 BHK</span>
            <span className="text-white font-semibold">
              {fmtRent(loc.bhkRent.two[0])} – {fmtRent(loc.bhkRent.two[1])}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">3 BHK</span>
            <span className="text-white font-semibold">
              {fmtRent(loc.bhkRent.three[0])} – {fmtRent(loc.bhkRent.three[1])}
            </span>
          </div>
        </div>

        {/* Occupancy bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white/40">Occupancy</span>
            <span className="text-white">{loc.occupancy}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${loc.occupancy}%`,
                background:
                  loc.occupancy > 88
                    ? "#10b981"
                    : loc.occupancy > 75
                      ? "#D4AF37"
                      : "#ef4444",
              }}
            />
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/10 pt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Avg Price/sqft</span>
                <span className="text-white font-semibold">
                  ₹{loc.pricePerSqft.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Tenant Profile</span>
                <span className="text-white">
                  {loc.tenantProfile.join(", ")}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">YoY Growth</span>
                <span className="text-green-400 font-bold">
                  +{loc.growthYoY}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Vacancy Rate</span>
                <span className="text-white">
                  {Math.round(Math.max(3, 15 - loc.occupancy / 10))}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Rental Confidence</span>
                <span
                  className="font-bold"
                  style={{
                    color:
                      loc.occupancy > 88
                        ? "#22c55e"
                        : loc.occupancy > 75
                          ? "#D4AF37"
                          : "#ef4444",
                  }}
                >
                  {loc.occupancy > 88
                    ? "High"
                    : loc.occupancy > 75
                      ? "Moderate"
                      : "Low"}
                </span>
              </div>
              {/* Audit Panel */}
              <AuditPanel
                title="Rental Intelligence Analysis"
                confidence={Math.round(40 + loc.occupancy * 0.55)}
                confidenceReason={
                  loc.occupancy > 88
                    ? "High occupancy — strong rental market"
                    : loc.occupancy > 75
                      ? "Moderate demand signals"
                      : "Low occupancy — limited data"
                }
                breakdown={[
                  {
                    label: "Avg Rent",
                    value: `${fmtRent(loc.avgRent)}/mo`,
                    contribution: 40,
                    explanation: "Based on 2BHK comparables",
                  },
                  {
                    label: "Rental Yield",
                    value: `${loc.yield}%`,
                    contribution: 30,
                    explanation: "Annual rent / property value",
                  },
                  {
                    label: "Occupancy",
                    value: `${loc.occupancy}%`,
                    contribution: 20,
                    explanation: "Demand vs supply density",
                  },
                  {
                    label: "Price/sqft",
                    value: `₹${loc.pricePerSqft.toLocaleString()}`,
                    contribution: 10,
                    explanation: "Normalized rental price benchmark",
                  },
                ]}
                disclaimer="Rental estimates derived from locality comparables. Actual rents may vary. Not financial advice."
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-5 pb-3 flex justify-end">
        <button
          type="button"
          data-ocid={`rental.expand.${index + 1}`}
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
        >
          {isExpanded ? "▲ Less" : "▼ More details"}
        </button>
      </div>
    </motion.div>
  );
}

export default function RentalYieldPage() {
  const [sortBy, setSortBy] = useState<"yield" | "occupancy" | "rentMax">(
    "yield",
  );
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [expandedName, setExpandedName] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [query, setQuery] = useState("");
  const [noDataMessage, setNoDataMessage] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecent);

  const matchedLocalities = query.trim()
    ? LOCALITIES.filter(
        (l) =>
          l.name.toLowerCase().includes(query.toLowerCase()) ||
          l.city.toLowerCase().includes(query.toLowerCase()),
      )
    : [];

  const closestLocalities =
    matchedLocalities.length === 0 && query.trim()
      ? [...LOCALITIES]
          .sort(
            (a, b) =>
              nameSimilarity(b.name, query) - nameSimilarity(a.name, query),
          )
          .slice(0, 3)
      : [];

  const filteredLocalities = selectedName
    ? LOCALITIES.filter((l) => l.name === selectedName)
    : LOCALITIES;

  const sorted = [...filteredLocalities].sort((a, b) => {
    if (sortBy === "yield") return b.yield - a.yield;
    if (sortBy === "occupancy") return b.occupancy - a.occupancy;
    return b.bhkRent.two[1] - a.bhkRent.two[1];
  });

  // Dynamic summary stats computed from LOCALITIES data
  const bestYield = [...LOCALITIES].sort((a, b) => b.yield - a.yield)[0];
  const highestRent = [...LOCALITIES].sort(
    (a, b) => b.bhkRent.two[1] - a.bhkRent.two[1],
  )[0];
  const bestOccupancy = [...LOCALITIES].sort(
    (a, b) => b.occupancy - a.occupancy,
  )[0];

  const summaryStats = [
    {
      label: "Best Rental Yield",
      value: `${bestYield.yield}%`,
      sub: `${bestYield.name}, ${bestYield.city}`,
      icon: TrendingUp,
      color: "#10b981",
    },
    {
      label: "Highest Avg Rent",
      value: `₹${Math.round(highestRent.bhkRent.two[1] / 1000)}k`,
      sub: `${highestRent.name}, ${highestRent.city}`,
      icon: Home,
      color: "#D4AF37",
    },
    {
      label: "Best Occupancy",
      value: `${bestOccupancy.occupancy}%`,
      sub: `${bestOccupancy.name}, ${bestOccupancy.city}`,
      icon: Users,
      color: "#60a5fa",
    },
  ];

  function selectLocality(name: string) {
    setSelectedName(name);
    setQuery(name);
    setShowDropdown(false);
    saveRecent(name);
    setRecentSearches(getRecent());
  }

  function clearSearch() {
    setSelectedName(null);
    setQuery("");
    setShowDropdown(false);
  }

  return (
    <BuyerLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Rental Yield & Rent Intelligence
          </h1>
          <p className="text-white/50">
            BHK-wise rent breakdown, yield, and deep area insights.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-5" data-ocid="rental.search_input">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <MapPin size={16} className="text-white/40 shrink-0" />
            <LocalityDropdown
              value={query}
              onChange={(name) => {
                setQuery(name);
                selectLocality(name);
              }}
              placeholder="Search any locality, area, or city…"
              className="flex-1"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="text-white/30 hover:text-white/70"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Dropdown */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute left-0 right-0 top-full mt-2 rounded-xl overflow-hidden z-50"
                style={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {/* Autocomplete matches */}
                {matchedLocalities.length > 0 && (
                  <div>
                    {matchedLocalities.map((loc) => (
                      <button
                        key={loc.name}
                        type="button"
                        onMouseDown={() => selectLocality(loc.name)}
                        className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors"
                      >
                        <MapPin size={13} className="text-white/30 shrink-0" />
                        <span className="text-white text-sm">{loc.name}</span>
                        <span className="ml-auto text-xs text-white/30">
                          {loc.city}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* No match — show closest */}
                {closestLocalities.length > 0 && (
                  <div>
                    <p className="px-4 py-2 text-xs text-amber-400/80 border-b border-white/5">
                      No exact match — showing closest areas
                    </p>
                    {closestLocalities.map((loc) => (
                      <button
                        key={loc.name}
                        type="button"
                        onMouseDown={() => selectLocality(loc.name)}
                        className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors"
                      >
                        <MapPin
                          size={13}
                          className="text-amber-400/50 shrink-0"
                        />
                        <span className="text-white/80 text-sm">
                          {loc.name}
                        </span>
                        <span className="ml-auto text-xs text-white/30">
                          {loc.city}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Recent searches */}
                {!query.trim() && recentSearches.length > 0 && (
                  <div>
                    <p className="px-4 py-2 text-xs text-white/30 border-b border-white/5">
                      Recent
                    </p>
                    {recentSearches.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onMouseDown={() => selectLocality(name)}
                        className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors"
                      >
                        <span className="text-white/30 text-xs">↩</span>
                        <span className="text-white/80 text-sm">{name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {!query.trim() && recentSearches.length === 0 && (
                  <p className="px-4 py-3 text-xs text-white/30">
                    Type to search localities…
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex gap-2">
            {(["yield", "occupancy", "rentMax"] as const).map((key) => (
              <button
                key={key}
                type="button"
                data-ocid={`rental.sort.${key}.button`}
                onClick={() => setSortBy(key)}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background:
                    sortBy === key ? "#D4AF37" : "rgba(255,255,255,0.05)",
                  color: sortBy === key ? "#000" : "rgba(255,255,255,0.5)",
                }}
              >
                {key === "yield"
                  ? "Best Yield"
                  : key === "occupancy"
                    ? "Best Occupancy"
                    : "Highest Rent"}
              </button>
            ))}
          </div>
          <button
            type="button"
            data-ocid="rental.map.toggle"
            onClick={() => setShowMap((v) => !v)}
            className="ml-auto px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
            style={{
              background: showMap
                ? "rgba(59,130,246,0.2)"
                : "rgba(255,255,255,0.05)",
              color: showMap ? "#60a5fa" : "rgba(255,255,255,0.5)",
              border: showMap
                ? "1px solid rgba(59,130,246,0.4)"
                : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <MapPin size={13} />
            {showMap ? "Hide Map" : "Map View"}
          </button>
          {selectedName && (
            <button
              type="button"
              onClick={clearSearch}
              className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              <X size={12} /> Clear filter
            </button>
          )}
        </div>

        {/* Map Panel */}
        <AnimatePresence>
          {showMap && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 300, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="overflow-hidden rounded-2xl mb-6 relative"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {noDataMessage && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-500/50 text-red-200 text-xs px-4 py-2 rounded-xl backdrop-blur-sm shadow-lg">
                  {noDataMessage}
                </div>
              )}
              <GlobalMapComponent
                mode="explore"
                height="300px"
                center={
                  selectedName
                    ? (LOCALITIES.find((l) => l.name === selectedName)
                        ?.coords ?? [12.9716, 77.5946])
                    : [12.9716, 77.5946]
                }
                zoom={selectedName ? 13 : 11}
                showLayerToggle={true}
                onLocationSelect={(_lat, _lng, displayName) => {
                  const match = LOCALITIES.find(
                    (l) =>
                      l.name.toLowerCase() === displayName.toLowerCase() ||
                      displayName.toLowerCase().includes(l.name.toLowerCase()),
                  );
                  if (match) {
                    setSelectedName(match.name);
                    setQuery(match.name);
                    setNoDataMessage(null);
                  } else {
                    setNoDataMessage(
                      "No sufficient data for this micro-location",
                    );
                  }
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {sorted.map((loc, i) => (
            <LocalityCard
              key={loc.name}
              loc={loc}
              index={i}
              isSelected={selectedName === loc.name}
              isExpanded={expandedName === loc.name}
              onSelect={() =>
                setSelectedName((prev) => (prev === loc.name ? null : loc.name))
              }
              onExpand={() =>
                setExpandedName((prev) => (prev === loc.name ? null : loc.name))
              }
            />
          ))}
        </div>

        {/* Summary Stats — dynamic from LOCALITIES data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {summaryStats.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-4 px-5 py-4 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${item.color}18` }}
              >
                <item.icon size={18} style={{ color: item.color }} />
              </div>
              <div>
                <p className="text-white/40 text-xs">{item.label}</p>
                <p className="text-xl font-bold" style={{ color: item.color }}>
                  {item.value}
                </p>
                <p className="text-white/30 text-xs">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BuyerLayout>
  );
}
