import { useNavigate } from "@tanstack/react-router";
import { Lock, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const PREVIEW_LOCALITIES = [
  {
    name: "Devanahalli",
    city: "Bangalore",
    current: 5800,
    growth: 48,
    color: "#10b981",
  },
  {
    name: "Sarjapur Road",
    city: "Bangalore",
    current: 7200,
    growth: 36,
    color: "#D4AF37",
  },
  {
    name: "Hinjewadi",
    city: "Pune",
    current: 7800,
    growth: 41,
    color: "#60a5fa",
  },
];

function SparkLine({ color }: { color: string }) {
  const pts = [20, 22, 21, 25, 28, 32, 38]
    .map((v, i) => `${(i / 6) * 80},${40 - v}`)
    .join(" ");
  return (
    <svg
      viewBox="0 0 80 44"
      className="w-full h-8"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PriceForecastPreview() {
  const { user, openLoginModal } = useAuth();
  const navigate = useNavigate();
  const [searchVal, setSearchVal] = useState("");

  const handleCTA = () => {
    if (user) {
      navigate({ to: "/buyer/price-forecast" });
    } else {
      openLoginModal();
    }
  };

  return (
    <section
      data-ocid="priceforecast.section"
      style={{
        background: "linear-gradient(180deg, #0A0F1E 0%, #0D1428 100%)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
      className="py-20 px-4"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-4">
            <TrendingUp size={14} className="text-[#D4AF37]" />
            <span className="text-[#D4AF37] text-xs font-semibold uppercase tracking-wider">
              AI Price Intelligence
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Price Forecast
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            AI-powered price predictions for top localities across India. See
            where smart money is going.
          </p>
        </div>

        {/* Search bar */}
        <div className="max-w-md mx-auto mb-10 relative">
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onFocus={() => !user && openLoginModal()}
            placeholder="Search locality..."
            data-ocid="priceforecast.search_input"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm outline-none focus:border-[#D4AF37]/50 transition-colors"
          />
          {!user && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Lock size={14} className="text-white/30" />
            </div>
          )}
        </div>

        {/* Preview cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {PREVIEW_LOCALITIES.map((loc) => (
            <div
              key={loc.name}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-white font-bold">{loc.name}</h3>
                  <p className="text-white/40 text-xs">{loc.city}</p>
                </div>
                <span
                  className="text-xs font-bold px-2 py-1 rounded-lg"
                  style={{ background: `${loc.color}20`, color: loc.color }}
                >
                  +{loc.growth}%
                </span>
              </div>
              <div className={!user ? "blur-sm" : ""}>
                <SparkLine color={loc.color} />
                <div className="flex justify-between mt-3">
                  <div>
                    <p className="text-white/30 text-[10px]">Current</p>
                    <p className="text-white font-semibold text-sm">
                      ₹{loc.current.toLocaleString()}/sqft
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/30 text-[10px]">5Y Forecast</p>
                    <p
                      className="font-bold text-sm"
                      style={{ color: loc.color }}
                    >
                      ₹
                      {Math.round(
                        loc.current * (1 + loc.growth / 100),
                      ).toLocaleString()}
                      /sqft
                    </p>
                  </div>
                </div>
              </div>
              {!user && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0A0F1E]/60 backdrop-blur-[2px] rounded-2xl">
                  <div className="text-center">
                    <Lock size={18} className="text-[#D4AF37] mx-auto mb-1" />
                    <p className="text-white/70 text-xs">Login to unlock</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            type="button"
            data-ocid="priceforecast.primary_button"
            onClick={handleCTA}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D4AF37] text-black font-semibold text-sm hover:bg-[#B8960C] transition-colors"
          >
            <TrendingUp size={16} />
            View Full Forecast →
          </button>
        </div>
      </div>
    </section>
  );
}
