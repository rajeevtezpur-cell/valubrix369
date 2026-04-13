import { MapPin, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import SellerLayout from "../components/SellerLayout";
import SmartLocationSearch from "../components/SmartLocationSearch";
import type { LocationRecord } from "../data/locationData";

const BASE_PRICE_DATA = [
  4800, 4950, 5100, 5050, 5200, 5350, 5300, 5480, 5600, 5520, 5700, 5850,
];
const MONTHS = [
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
];

const BASE_DEMAND_AREAS = [
  { area: "Whitefield", demand: 92, yoy: "+11.2%", listings: 245 },
  { area: "Sarjapur Road", demand: 88, yoy: "+9.8%", listings: 312 },
  { area: "Devanahalli", demand: 85, yoy: "+14.3%", listings: 128 },
  { area: "Electronic City", demand: 78, yoy: "+7.5%", listings: 189 },
  { area: "Indiranagar", demand: 95, yoy: "+6.2%", listings: 87 },
];

const BEST_TIME_INSIGHTS = [
  {
    insight: "January–March is historically the best time to list in Bangalore",
    positive: true,
  },
  {
    insight: "Festival season (Oct–Nov) sees 23% more buyer activity",
    positive: true,
  },
  {
    insight: "Whitefield prices traditionally dip in monsoon months (Jun–Aug)",
    positive: false,
  },
  {
    insight: "IT appraisal season (Feb–Apr) drives premium buyer demand",
    positive: true,
  },
];

function deriveData(loc: LocationRecord | null) {
  if (!loc)
    return { priceData: BASE_PRICE_DATA, demandAreas: BASE_DEMAND_AREAS };
  // Deterministic variation based on locality name length
  const seed = loc.name.length % 5;
  const mult = 1 + seed * 0.04;
  const priceData = BASE_PRICE_DATA.map((v) => Math.round(v * mult));
  const demandAreas = [
    {
      area: loc.name,
      demand: 80 + seed * 3,
      yoy: `+${(8 + seed).toFixed(1)}%`,
      listings: 90 + seed * 20,
    },
    ...BASE_DEMAND_AREAS.slice(0, 4).map((a, i) => ({
      ...a,
      demand: Math.max(60, a.demand - seed + i),
      listings: a.listings + seed * 5,
    })),
  ];
  return { priceData, demandAreas };
}

export default function SellerMarketInsightsPage() {
  const [selectedLocation, setSelectedLocation] =
    useState<LocationRecord | null>(null);
  const { priceData, demandAreas } = deriveData(selectedLocation);
  const maxP = Math.max(...priceData);
  const minP = Math.min(...priceData);

  const points = priceData
    .map((v, i) => {
      const x = (i / (priceData.length - 1)) * 100;
      const y = 100 - ((v - minP) / (maxP - minP)) * 80;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Market <span className="text-[#D4AF37]">Insights</span>
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {selectedLocation ? selectedLocation.name : "Bangalore"} real estate
            intelligence
          </p>
        </div>

        {/* Location Selector */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white/50 text-xs mb-2 flex items-center gap-1.5">
            <MapPin size={12} className="text-[#D4AF37]" /> Select Location for
            Insights
          </p>
          <SmartLocationSearch
            placeholder="Search locality, area or city..."
            onSelect={(loc) => setSelectedLocation(loc)}
          />
        </div>

        {/* Price Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">
              Average Price/sq ft —{" "}
              {selectedLocation ? selectedLocation.name : "Bangalore"}
            </h2>
            <span className="text-emerald-400 text-sm font-bold">
              +21.9% YoY
            </span>
          </div>
          <svg
            viewBox="0 0 100 110"
            className="w-full"
            preserveAspectRatio="none"
            style={{ height: 120 }}
            role="img"
            aria-label="Price trend"
          >
            <title>Price trend</title>
            <polyline
              points={points}
              fill="none"
              stroke="#D4AF37"
              strokeWidth="0.8"
            />
            {priceData.map((v, i) => {
              const x = (i / (priceData.length - 1)) * 100;
              const y = 100 - ((v - minP) / (maxP - minP)) * 80;
              return (
                <g key={`pt-${MONTHS[i]}`}>
                  <circle cx={x} cy={y} r="1.2" fill="#D4AF37" />
                  <text
                    x={x}
                    y={108}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.4)"
                    fontSize="4"
                  >
                    {MONTHS[i]}
                  </text>
                </g>
              );
            })}
          </svg>
        </motion.div>

        {/* Demand Areas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5"
        >
          <h2 className="text-white font-semibold mb-4">High Demand Areas</h2>
          <div className="space-y-3">
            {demandAreas.map((area, i) => (
              <div key={area.area} className="flex items-center gap-3">
                <span className="text-white/30 text-xs w-4">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-sm font-medium ${i === 0 && selectedLocation ? "text-[#D4AF37]" : "text-white"}`}
                    >
                      {area.area}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 text-xs font-bold">
                        {area.yoy}
                      </span>
                      <span className="text-white/40 text-xs">
                        {area.listings} listings
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#D4AF37] rounded-full transition-all duration-500"
                      style={{ width: `${area.demand}%` }}
                    />
                  </div>
                </div>
                <span className="text-white/50 text-xs w-8 text-right">
                  {area.demand}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Best Time Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5"
        >
          <h2 className="text-white font-semibold mb-4">Best Time to List</h2>
          <div className="space-y-3">
            {BEST_TIME_INSIGHTS.map((ins) => (
              <div key={ins.insight} className="flex items-start gap-3">
                {ins.positive ? (
                  <TrendingUp
                    size={14}
                    className="text-emerald-400 mt-0.5 flex-shrink-0"
                  />
                ) : (
                  <TrendingDown
                    size={14}
                    className="text-red-400 mt-0.5 flex-shrink-0"
                  />
                )}
                <p className="text-white/60 text-sm">{ins.insight}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </SellerLayout>
  );
}
