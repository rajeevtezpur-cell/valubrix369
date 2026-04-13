import { Link } from "@tanstack/react-router";
import { Sparkles, TrendingDown } from "lucide-react";
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

export default function BuyerDealsPage() {
  const dealsData = MOCK_LISTINGS.map((l) => {
    const area = l.carpetArea || l.plotArea || 1000;
    const aiVal = getAiValue(l.city, area);
    const diff = aiVal - l.price;
    const discountPct = (diff / aiVal) * 100;
    return { ...l, aiVal, diff, discountPct };
  }).sort((a, b) => b.discountPct - a.discountPct);

  const trueDeals = dealsData.filter((d) => d.discountPct >= 10);
  const avgDiscount =
    trueDeals.length > 0
      ? (
          trueDeals.reduce((s, d) => s + d.discountPct, 0) / trueDeals.length
        ).toFixed(1)
      : "0";
  const cities = [...new Set(trueDeals.map((d) => d.city))].length;

  const getLabel = (pct: number) => {
    if (pct >= 10)
      return {
        text: "Undervalued Opportunity",
        color: "text-green-300",
        bg: "bg-green-500/20 border-green-500/30",
      };
    if (pct >= 0)
      return {
        text: "Fair Deal",
        color: "text-yellow-300",
        bg: "bg-yellow-500/20 border-yellow-500/30",
      };
    return {
      text: "At Market",
      color: "text-white/60",
      bg: "bg-white/10 border-white/20",
    };
  };

  return (
    <BuyerLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-green-500/20">
              <Sparkles size={20} className="text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Deal Finder</h1>
              <p className="text-white/40 text-sm">Top Deals in City Today</p>
            </div>
          </div>
          <p className="text-white/50 text-sm mt-2">
            Properties where AI estimated value exceeds listing price by 10%+
          </p>
        </div>

        {/* Summary Bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            {
              label: "Deals Found",
              value: trueDeals.length.toString(),
              color: "text-green-400",
            },
            {
              label: "Avg Discount",
              value: `${avgDiscount}%`,
              color: "text-[#D4AF37]",
            },
            {
              label: "Cities Covered",
              value: cities.toString(),
              color: "text-blue-400",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center"
            >
              <p className={`text-3xl font-bold font-mono ${s.color}`}>
                {s.value}
              </p>
              <p className="text-white/40 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Deals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {dealsData.map((listing, idx) => {
            const labelData = getLabel(listing.discountPct);
            return (
              <div
                key={listing.id}
                data-ocid={`buyer_deals.property.card.${idx + 1}`}
                className="group bg-white/5 backdrop-blur-md border border-white/10 hover:border-[#D4AF37]/40 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(212,175,55,0.15)]"
              >
                <div className="relative">
                  <img
                    src={listing.images[0]}
                    alt={listing.title}
                    className="w-full h-44 object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full border font-medium ${labelData.color} ${labelData.bg}`}
                    >
                      {labelData.text}
                    </span>
                  </div>
                  {listing.discountPct >= 10 && (
                    <div className="absolute top-3 right-3 bg-green-500/30 border border-green-500/50 rounded-full px-2 py-1 flex items-center gap-1">
                      <TrendingDown size={10} className="text-green-300" />
                      <span className="text-green-300 text-xs font-bold">
                        {listing.discountPct.toFixed(1)}% below
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-white font-semibold text-sm">
                    {listing.title}
                  </h3>
                  <p className="text-white/40 text-xs mt-0.5">
                    {listing.location}, {listing.city}
                  </p>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 text-xs">
                        Listing Price
                      </span>
                      <span className="text-[#D4AF37] font-bold font-mono text-sm">
                        {formatPrice(listing.price)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 text-xs">
                        AI Estimated Value
                      </span>
                      <span className="text-green-300 font-bold font-mono text-sm">
                        {formatPrice(listing.aiVal)}
                      </span>
                    </div>
                    {listing.diff > 0 && (
                      <div className="flex items-center justify-between bg-green-500/10 rounded-lg px-3 py-1.5 border border-green-500/20">
                        <span className="text-green-300 text-xs">You save</span>
                        <span className="text-green-300 font-bold font-mono text-xs">
                          {formatPrice(listing.diff)}
                        </span>
                      </div>
                    )}
                  </div>

                  <Link
                    to="/property/$id"
                    params={{ id: listing.id }}
                    data-ocid={`buyer_deals.property.button.${idx + 1}`}
                    className="mt-4 w-full py-2.5 rounded-xl bg-white/5 hover:bg-[#D4AF37]/10 border border-white/10 hover:border-[#D4AF37]/40 text-white/70 hover:text-[#D4AF37] text-xs font-medium transition-all flex items-center justify-center"
                  >
                    View Property
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </BuyerLayout>
  );
}
