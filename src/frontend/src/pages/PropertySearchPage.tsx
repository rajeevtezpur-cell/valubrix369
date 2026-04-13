import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  Filter,
  Home,
  Map as MapIcon,
  MapPin,
  Maximize2,
  Search,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import GlobalNav from "../components/GlobalNav";
import SmartLocationSearch from "../components/SmartLocationSearch";
import type { LocationRecord } from "../data/locationData";
import {
  MOCK_LISTINGS,
  type MockListing,
  formatPrice,
  getAllListings,
} from "../data/mockListings";

const BADGE_COLORS: Record<string, string> = {
  "High Liquidity": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Golden Verified": "bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30",
  "High Value Asset": "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

const BASE_PRICES: Record<string, number> = {
  Bangalore: 9000,
  Pune: 7500,
  Delhi: 8500,
};

function getDealLabel(listing: MockListing): { label: string; color: string } {
  const base = BASE_PRICES[listing.city] || 9000;
  const area = listing.carpetArea || listing.plotArea || 1000;
  const aiVal = base * area;
  if (listing.price < aiVal * 0.9)
    return {
      label: "Good Deal",
      color: "bg-green-500/20 text-green-300 border-green-500/30",
    };
  if (listing.price > aiVal * 1.1)
    return {
      label: "Overpriced",
      color: "bg-red-500/20 text-red-300 border-red-500/30",
    };
  return {
    label: "Fair Price",
    color: "bg-white/10 text-white/50 border-white/20",
  };
}

const BLR_ZONES = [
  {
    id: "north",
    label: "North",
    price: "₹7,200/sqft",
    listings: 42,
    demand: 79,
    x: 180,
    y: 60,
    w: 160,
    h: 100,
    ocid: "search.zone.north.map_marker",
  },
  {
    id: "east",
    label: "East",
    price: "₹9,800/sqft",
    listings: 68,
    demand: 91,
    x: 300,
    y: 140,
    w: 140,
    h: 120,
    ocid: "search.zone.east.map_marker",
  },
  {
    id: "south",
    label: "South",
    price: "₹8,500/sqft",
    listings: 55,
    demand: 85,
    x: 160,
    y: 240,
    w: 150,
    h: 100,
    ocid: "search.zone.south.map_marker",
  },
  {
    id: "central",
    label: "Central",
    price: "₹12,400/sqft",
    listings: 28,
    demand: 94,
    x: 190,
    y: 145,
    w: 130,
    h: 90,
    ocid: "search.zone.central.map_marker",
  },
  {
    id: "west",
    label: "West",
    price: "₹5,800/sqft",
    listings: 31,
    demand: 71,
    x: 50,
    y: 160,
    w: 140,
    h: 110,
    ocid: "search.zone.west.map_marker",
  },
];

function BangaloreMap({
  selected,
  onSelect,
}: { selected: string | null; onSelect: (z: string | null) => void }) {
  return (
    <div className="relative w-full" style={{ paddingBottom: "55%" }}>
      <svg
        viewBox="0 0 480 340"
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Bangalore zone map showing property prices by region"
      >
        <title>Bangalore Zone Map</title>
        {/* Background */}
        <rect width="480" height="340" fill="rgba(10,15,31,0.6)" rx="16" />
        <text
          x="240"
          y="20"
          textAnchor="middle"
          fill="rgba(255,255,255,0.2)"
          fontSize="11"
        >
          Bangalore
        </text>

        {BLR_ZONES.map((z) => {
          const isSelected = selected === z.id;
          const isHot = z.demand >= 90;
          return (
            <g key={z.id}>
              <rect
                data-ocid={z.ocid}
                x={z.x}
                y={z.y}
                width={z.w}
                height={z.h}
                rx="10"
                fill={
                  isSelected ? "rgba(212,175,55,0.25)" : "rgba(212,175,55,0.06)"
                }
                stroke={
                  isSelected
                    ? "#D4AF37"
                    : isHot
                      ? "rgba(212,175,55,0.4)"
                      : "rgba(255,255,255,0.12)"
                }
                strokeWidth={isSelected ? 2 : 1}
                tabIndex={0}
                className="cursor-pointer transition-all"
                onKeyDown={(e) =>
                  e.key === "Enter" && onSelect(selected === z.id ? null : z.id)
                }
                onClick={() => onSelect(selected === z.id ? null : z.id)}
              />
              {/* Zone Label */}
              <text
                x={z.x + z.w / 2}
                y={z.y + z.h / 2 - 10}
                textAnchor="middle"
                fill={isSelected ? "#D4AF37" : "rgba(255,255,255,0.8)"}
                fontSize="12"
                fontWeight="600"
                className="pointer-events-none"
              >
                {z.label}
              </text>
              <text
                x={z.x + z.w / 2}
                y={z.y + z.h / 2 + 6}
                textAnchor="middle"
                fill="rgba(255,255,255,0.4)"
                fontSize="9"
                className="pointer-events-none"
              >
                {z.listings} listings
              </text>
              {/* Price Bubble */}
              <rect
                x={z.x + z.w / 2 - 34}
                y={z.y - 20}
                width="68"
                height="16"
                rx="8"
                fill={isSelected ? "#D4AF37" : "rgba(212,175,55,0.8)"}
                className="pointer-events-none"
              />
              <text
                x={z.x + z.w / 2}
                y={z.y - 8}
                textAnchor="middle"
                fill="black"
                fontSize="8"
                fontWeight="700"
                className="pointer-events-none"
              >
                {z.price}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PropertyCard({
  listing,
  index,
}: { listing: MockListing; index: number }) {
  const deal = getDealLabel(listing);
  return (
    <Link
      to="/property/$id"
      params={{ id: listing.id }}
      data-ocid={`search.property.card.${index + 1}`}
      className="group bg-white/5 hover:bg-white/8 backdrop-blur-md border border-white/10 hover:border-[#D4AF37]/40 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(212,175,55,0.15)] block"
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={listing.images[0]}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1">
          {listing.badges.slice(0, 2).map((badge) => (
            <span
              key={badge}
              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${BADGE_COLORS[badge] || "bg-white/10 text-white/70"}`}
            >
              {badge}
            </span>
          ))}
        </div>
        {/* Deal Badge */}
        <div className="absolute top-3 right-3">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${deal.color}`}
          >
            {deal.label}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-white font-semibold text-sm line-clamp-2 mb-2">
          {listing.title}
        </h3>
        <p className="text-[#D4AF37] font-bold text-lg font-mono">
          {formatPrice(listing.price)}
        </p>
        <div className="flex items-center gap-1 mt-1 text-white/40 text-xs">
          <MapPin size={12} />
          <span>
            {listing.location}, {listing.city}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-3 text-white/60 text-xs">
          {listing.bhk && (
            <span className="flex items-center gap-1">
              <Home size={11} /> {listing.bhk} BHK
            </span>
          )}
          {listing.carpetArea > 0 && (
            <span className="flex items-center gap-1">
              <Maximize2 size={11} /> {listing.carpetArea} sqft
            </span>
          )}
          {listing.plotArea && listing.carpetArea === 0 && (
            <span className="flex items-center gap-1">
              <Maximize2 size={11} /> {listing.plotArea} sqft
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function PropertySearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string[]>([]);
  const [selectedBhk, setSelectedBhk] = useState<number[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return getAllListings().filter((l) => {
      if (selectedZone && l.city !== "Bangalore") return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !l.location.toLowerCase().includes(q) &&
          !l.city.toLowerCase().includes(q) &&
          !l.title.toLowerCase().includes(q)
        )
          return false;
      }
      if (selectedType.length && !selectedType.includes(l.propertyType))
        return false;
      if (selectedBhk.length && l.bhk && !selectedBhk.includes(l.bhk))
        return false;
      if (minPrice && l.price < Number(minPrice) * 100000) return false;
      if (maxPrice && l.price > Number(maxPrice) * 100000) return false;
      if (minArea && l.carpetArea > 0 && l.carpetArea < Number(minArea))
        return false;
      if (maxArea && l.carpetArea > 0 && l.carpetArea > Number(maxArea))
        return false;
      return true;
    });
  }, [
    searchQuery,
    selectedType,
    selectedBhk,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    selectedZone,
  ]);

  // Top deals for AI Deal Finder
  const topDeals = useMemo(
    () =>
      getAllListings()
        .filter((l) => {
          const base = BASE_PRICES[l.city] || 9000;
          const area = l.carpetArea || l.plotArea || 1000;
          return l.price < base * area * 0.9;
        })
        .slice(0, 4),
    [],
  );

  const toggleType = (t: string) =>
    setSelectedType((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  const toggleBhk = (b: number) =>
    setSelectedBhk((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b],
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1F] to-[#121B35]">
      <GlobalNav />
      <div className="pt-20 px-4 max-w-7xl mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">
            Browse <span className="text-[#D4AF37]">Properties</span>
          </h1>
          <p className="text-white/50 mt-1">
            {filtered.length} properties found
          </p>
        </div>

        {/* AI Deal Finder */}
        {topDeals.length > 0 && (
          <div data-ocid="search.deal_finder.panel" className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-green-400" />
              <h2 className="text-white font-semibold text-sm">
                Top Deals Near You
              </h2>
              <span className="text-white/30 text-xs">
                Listed below AI market value
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {topDeals.map((l) => {
                const base = BASE_PRICES[l.city] || 9000;
                const area = l.carpetArea || l.plotArea || 1000;
                const aiVal = base * area;
                const pct = Math.round((1 - l.price / aiVal) * 100);
                return (
                  <Link
                    key={l.id}
                    to="/property/$id"
                    params={{ id: l.id }}
                    className="flex-shrink-0 w-64 bg-green-500/5 border border-green-500/20 hover:border-green-500/40 rounded-xl p-4 transition-all hover:-translate-y-0.5"
                  >
                    <p className="text-white text-xs font-medium line-clamp-1 mb-1">
                      {l.title}
                    </p>
                    <p className="text-[#D4AF37] font-bold font-mono text-sm">
                      {formatPrice(l.price)}
                    </p>
                    <p className="text-green-300 text-xs mt-1">
                      {pct}% below AI estimate
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Search + Filter + Map Bar */}
        <div className="flex gap-3 mb-4">
          <div
            className="flex-1 relative"
            data-ocid="search.location.search_input"
          >
            <SmartLocationSearch
              placeholder="Search by city, locality, project or builder..."
              onSelect={(loc: LocationRecord) => {
                setSearchQuery(loc.name);
              }}
              className="w-full"
            />
          </div>
          <button
            type="button"
            data-ocid="search.map.toggle"
            onClick={() => setMapOpen(!mapOpen)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
              mapOpen
                ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                : "bg-white/5 border-white/10 text-white/70 hover:border-white/20"
            }`}
          >
            <MapIcon size={15} />
            Map
          </button>
          <button
            type="button"
            data-ocid="search.filters.toggle"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
              filtersOpen
                ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                : "bg-white/5 border-white/10 text-white/70 hover:border-white/20"
            }`}
          >
            <Filter size={15} />
            Filters
            <ChevronDown
              size={14}
              className={`transition-transform ${filtersOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Bangalore SVG Map */}
        {mapOpen && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white font-semibold text-sm">
                  Bangalore Zone Map
                </p>
                <p className="text-white/40 text-xs">
                  Click a zone to filter properties
                </p>
              </div>
              {selectedZone && (
                <button
                  type="button"
                  onClick={() => setSelectedZone(null)}
                  className="text-[#D4AF37] text-xs hover:underline"
                >
                  Clear zone filter
                </button>
              )}
            </div>
            <BangaloreMap selected={selectedZone} onSelect={setSelectedZone} />
            {selectedZone && (
              <div className="mt-3 flex gap-4 text-xs text-white/60">
                {BLR_ZONES.filter((z) => z.id === selectedZone).map((z) => (
                  <div key={z.id} className="flex gap-4">
                    <span className="text-[#D4AF37] font-medium">
                      {z.label} Bangalore
                    </span>
                    <span>Avg: {z.price}</span>
                    <span>{z.listings} listings</span>
                    <span>Demand: {z.demand}/100</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filter Panel */}
        {filtersOpen && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-white/60 text-xs font-medium mb-2 uppercase tracking-wide">
                Property Type
              </p>
              <div className="flex flex-wrap gap-2">
                {["flat", "villa", "plot"].map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => toggleType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                      selectedType.includes(t)
                        ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                        : "bg-white/5 text-white/60 border-white/10 hover:border-white/20"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-white/60 text-xs font-medium mb-2 uppercase tracking-wide">
                BHK
              </p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((b) => (
                  <button
                    type="button"
                    key={b}
                    onClick={() => toggleBhk(b)}
                    className={`w-10 h-8 rounded-lg text-xs font-medium border transition-all ${
                      selectedBhk.includes(b)
                        ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                        : "bg-white/5 text-white/60 border-white/10 hover:border-white/20"
                    }`}
                  >
                    {b}
                    {b === 4 ? "+" : ""}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-white/60 text-xs font-medium mb-2 uppercase tracking-wide">
                Price (₹ Lakh)
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>
            <div>
              <p className="text-white/60 text-xs font-medium mb-2 uppercase tracking-wide">
                Area (sqft)
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minArea}
                  onChange={(e) => setMinArea(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxArea}
                  onChange={(e) => setMaxArea(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-white/40">
            <Search size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">No properties found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((listing, i) => (
              <PropertyCard key={listing.id} listing={listing} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
