import { Check, X } from "lucide-react";
import { useState } from "react";
import BuyerLayout from "../components/BuyerLayout";
import { MOCK_LISTINGS, formatPrice } from "../data/mockListings";

const BASE_PRICES: Record<string, number> = {
  Bangalore: 9000,
  Pune: 7500,
  Delhi: 8500,
};

function getAiValue(city: string, area: number): number {
  return (BASE_PRICES[city] || 9000) * Math.max(area, 800);
}

function getRentalYield(city: string): number {
  const yields: Record<string, number> = {
    Bangalore: 4.2,
    Pune: 4.8,
    Delhi: 3.5,
  };
  return yields[city] || 4.0;
}

function getInvestmentScore(city: string, location: string): number {
  const base: Record<string, number> = { Bangalore: 80, Pune: 78, Delhi: 72 };
  const premium = ["Whitefield", "Indiranagar", "Koramangala", "Koregaon Park"];
  return (
    (base[city] || 70) + (premium.some((p) => location.includes(p)) ? 8 : 0)
  );
}

function getDemandScore(city: string, location: string): number {
  const base: Record<string, number> = { Bangalore: 85, Pune: 80, Delhi: 75 };
  const hot = ["Indiranagar", "Whitefield", "Koramangala"];
  return Math.min(
    98,
    (base[city] || 70) + (hot.some((h) => location.includes(h)) ? 9 : 0),
  );
}

const METRICS = [
  { key: "price", label: "Listing Price" },
  { key: "area", label: "Area (sqft)" },
  { key: "aiValue", label: "AI Estimated Value" },
  { key: "aiDiff", label: "AI vs Listing" },
  { key: "rentalYield", label: "Rental Yield" },
  { key: "investmentScore", label: "Investment Score" },
  { key: "demandScore", label: "Demand Score" },
  { key: "dealLabel", label: "Deal Label" },
];

export default function BuyerComparePage() {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 4
          ? [...prev, id]
          : prev,
    );
  };

  const selectedListings = MOCK_LISTINGS.filter((l) => selected.includes(l.id));

  const computeData = (l: (typeof MOCK_LISTINGS)[0]) => {
    const area = l.carpetArea || l.plotArea || 1000;
    const aiVal = getAiValue(l.city, area);
    const diffPct = ((aiVal - l.price) / aiVal) * 100;
    const rentalYield = getRentalYield(l.city);
    const investScore = getInvestmentScore(l.city, l.location);
    const demandScore = getDemandScore(l.city, l.location);
    const dealLabel =
      l.price < aiVal * 0.9
        ? "Good Deal"
        : l.price <= aiVal * 1.1
          ? "Fair Deal"
          : "Overpriced";
    return {
      area,
      aiVal,
      diffPct,
      rentalYield,
      investScore,
      demandScore,
      dealLabel,
    };
  };

  return (
    <BuyerLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Property Comparison</h1>
          <p className="text-white/40 text-sm mt-0.5">
            Select up to 4 properties to compare side-by-side
          </p>
        </div>

        {/* Selector */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <p className="text-white/60 text-sm">
              Select Properties ({selected.length}/4)
            </p>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => setSelected([])}
                className="text-xs text-white/40 hover:text-white flex items-center gap-1"
              >
                <X size={12} /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {MOCK_LISTINGS.map((l, idx) => {
              const isSelected = selected.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  data-ocid={`buyer_compare.property.select.${idx + 1}`}
                  onClick={() => toggle(l.id)}
                  disabled={!isSelected && selected.length >= 4}
                  className={`relative rounded-xl overflow-hidden border transition-all text-left ${
                    isSelected
                      ? "border-[#D4AF37]/60 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                      : "border-white/10 hover:border-white/20 disabled:opacity-40"
                  }`}
                >
                  <img
                    src={l.images[0]}
                    alt={l.title}
                    className="w-full h-20 object-cover"
                  />
                  <div className="p-2">
                    <p className="text-white text-xs font-medium truncate">
                      {l.title}
                    </p>
                    <p className="text-[#D4AF37] text-xs font-mono">
                      {formatPrice(l.price)}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#D4AF37] rounded-full flex items-center justify-center">
                      <Check size={10} className="text-black" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comparison Table */}
        {selectedListings.length >= 2 ? (
          <div
            data-ocid="buyer_compare.table"
            className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-4 py-4 text-white/40 text-xs font-bold uppercase tracking-wider w-36">
                      Metric
                    </th>
                    {selectedListings.map((l) => (
                      <th
                        key={l.id}
                        className="px-4 py-4 text-center min-w-[160px]"
                      >
                        <img
                          src={l.images[0]}
                          alt={l.title}
                          className="w-full h-16 object-cover rounded-lg mb-2"
                        />
                        <p className="text-white text-xs font-semibold">
                          {l.title}
                        </p>
                        <p className="text-white/40 text-[10px]">
                          {l.location}
                        </p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map((metric, mIdx) => (
                    <tr
                      key={metric.key}
                      className={`border-b border-white/5 ${mIdx % 2 === 0 ? "bg-white/2" : ""}`}
                    >
                      <td className="px-4 py-3 text-white/50 text-xs font-medium">
                        {metric.label}
                      </td>
                      {selectedListings.map((l) => {
                        const d = computeData(l);
                        let val: string;
                        let colorClass = "text-white";
                        if (metric.key === "price") val = formatPrice(l.price);
                        else if (metric.key === "area")
                          val = `${d.area.toLocaleString()} sqft`;
                        else if (metric.key === "aiValue") {
                          val = formatPrice(d.aiVal);
                          colorClass = "text-green-300";
                        } else if (metric.key === "aiDiff") {
                          val = `${d.diffPct >= 0 ? "+" : ""}${d.diffPct.toFixed(1)}%`;
                          colorClass =
                            d.diffPct >= 10
                              ? "text-green-400"
                              : d.diffPct >= 0
                                ? "text-yellow-300"
                                : "text-red-400";
                        } else if (metric.key === "rentalYield") {
                          val = `${d.rentalYield}%`;
                          colorClass = "text-blue-300";
                        } else if (metric.key === "investmentScore") {
                          val = `${d.investScore}/100`;
                          colorClass = "text-[#D4AF37]";
                        } else if (metric.key === "demandScore") {
                          val = `${d.demandScore}/100`;
                          colorClass = "text-purple-300";
                        } else if (metric.key === "dealLabel") {
                          val = d.dealLabel;
                          colorClass =
                            d.dealLabel === "Good Deal"
                              ? "text-green-300"
                              : d.dealLabel === "Fair Deal"
                                ? "text-yellow-300"
                                : "text-red-400";
                        } else val = "—";
                        return (
                          <td
                            key={`${l.id}-${metric.key}`}
                            className={`px-4 py-3 text-center text-sm font-medium font-mono ${colorClass}`}
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div
            data-ocid="buyer_compare.empty_state"
            className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center"
          >
            <p className="text-white/40">
              Select at least 2 properties above to compare them
            </p>
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}
