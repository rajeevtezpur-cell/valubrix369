import { Link } from "@tanstack/react-router";
import { useState } from "react";
import BuyerLayout from "../components/BuyerLayout";
import GlobalMapComponent from "../components/GlobalMapComponent";
import { MOCK_LISTINGS, formatPrice } from "../data/mockListings";

const ZONES = [
  {
    id: "north",
    label: "North Bangalore",
    avgPrice: 7200,
    listings: 42,
    demand: 79,
    color: "#3b82f6",
    keywords: ["Hebbal", "Yelahanka", "Devanahalli"],
  },
  {
    id: "east",
    label: "East Bangalore",
    avgPrice: 9800,
    listings: 68,
    demand: 91,
    color: "#f59e0b",
    keywords: ["Whitefield", "Indiranagar", "Koramangala"],
  },
  {
    id: "south",
    label: "South Bangalore",
    avgPrice: 8500,
    listings: 55,
    demand: 85,
    color: "#10b981",
    keywords: ["Bannerghatta", "Electronic City"],
  },
  {
    id: "central",
    label: "Central Bangalore",
    avgPrice: 12400,
    listings: 28,
    demand: 94,
    color: "#ef4444",
    keywords: ["MG Road", "Jayanagar", "Koramangala"],
  },
  {
    id: "west",
    label: "West Bangalore",
    avgPrice: 5800,
    listings: 31,
    demand: 71,
    color: "#8b5cf6",
    keywords: ["Rajajinagar", "Yeshwanthpur"],
  },
];

const BASE_PRICES: Record<string, number> = {
  Bangalore: 9000,
  Pune: 7500,
  Delhi: 8500,
};

function getAiValue(city: string, area: number): number {
  return (BASE_PRICES[city] || 9000) * Math.max(area, 800);
}

export default function BuyerMapPage() {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const selectedZoneData = ZONES.find((z) => z.id === selectedZone);
  const zoneListings = selectedZone
    ? MOCK_LISTINGS.filter((l) => {
        const zone = ZONES.find((z) => z.id === selectedZone);
        if (!zone) return true;
        return zone.keywords.some(
          (k) => l.location.includes(k) || l.city === "Bangalore",
        );
      }).slice(0, 6)
    : [];

  return (
    <BuyerLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Map Explorer</h1>
          <p className="text-white/40 text-sm mt-0.5">
            Explore zones and listings across Bangalore
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* UnifiedMap — CartoDB Voyager tiles, smart pins, layer toggles */}
          <div className="lg:col-span-2">
            <div
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden relative"
              style={{ height: 400 }}
            >
              <GlobalMapComponent
                mode="explore"
                center={[12.97, 77.59]}
                zoom={11}
                height="400px"
                showLayerToggle={true}
              />
            </div>

            {/* Zone filter chips below map */}
            <div className="mt-3 flex flex-wrap gap-2">
              {ZONES.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() =>
                    setSelectedZone(selectedZone === z.id ? null : z.id)
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background:
                      selectedZone === z.id
                        ? `${z.color}22`
                        : "rgba(255,255,255,0.06)",
                    border:
                      selectedZone === z.id
                        ? `1.5px solid ${z.color}88`
                        : "1.5px solid rgba(255,255,255,0.1)",
                    color:
                      selectedZone === z.id ? z.color : "rgba(255,255,255,0.5)",
                    cursor: "pointer",
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: z.color }}
                  />
                  {z.label.replace(" Bangalore", "")}
                  <span style={{ opacity: 0.6, marginLeft: 2 }}>
                    {z.listings}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Zone Detail / Listings */}
          <div className="space-y-4">
            {selectedZoneData ? (
              <>
                <div
                  className="bg-white/5 border border-white/10 rounded-2xl p-4"
                  style={{ borderColor: `${selectedZoneData.color}40` }}
                >
                  <h3 className="text-white font-bold">
                    {selectedZoneData.label}
                  </h3>
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Avg Price</span>
                      <span className="text-white font-mono">
                        ₹{selectedZoneData.avgPrice.toLocaleString()}/sqft
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Listings</span>
                      <span className="text-white">
                        {selectedZoneData.listings}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Demand Score</span>
                      <span
                        style={{ color: selectedZoneData.color }}
                        className="font-bold"
                      >
                        {selectedZoneData.demand}/100
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest">
                    Listings in Zone
                  </p>
                  {zoneListings.map((l) => {
                    const area = l.carpetArea || l.plotArea || 1000;
                    const aiVal = getAiValue(l.city, area);
                    const isGoodDeal = l.price < aiVal * 0.9;
                    return (
                      <Link
                        key={l.id}
                        to="/property/$id"
                        params={{ id: l.id }}
                        className="block bg-white/5 border border-white/10 hover:border-[#D4AF37]/30 rounded-xl p-3 transition-all"
                      >
                        <img
                          src={l.images[0]}
                          alt={l.title}
                          className="w-full h-24 object-cover rounded-lg mb-2"
                        />
                        <p className="text-white text-xs font-medium truncate">
                          {l.title}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[#D4AF37] font-bold font-mono text-xs">
                            {formatPrice(l.price)}
                          </span>
                          {isGoodDeal && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/30">
                              Good Deal
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <p className="text-white/40 text-sm">
                  Click a zone on the map to explore listings
                </p>
                <div className="mt-4 space-y-2">
                  {ZONES.map((z) => (
                    <div
                      key={z.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: z.color }}
                        />
                        <span className="text-white/60">{z.label}</span>
                      </div>
                      <span className="text-white/40">
                        {z.listings} listings
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}
