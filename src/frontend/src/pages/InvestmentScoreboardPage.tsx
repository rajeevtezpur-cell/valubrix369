import { Link, useNavigate } from "@tanstack/react-router";
import { Medal, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import BuyerLayout from "../components/BuyerLayout";

const AREAS = [
  {
    rank: 1,
    name: "Devanahalli",
    city: "Bangalore",
    score: 88,
    growth: "+22%",
    yield: "5.1%",
    highlight: "Airport expansion + tech parks",
  },
  {
    rank: 2,
    name: "Sarjapur Road",
    city: "Bangalore",
    score: 85,
    growth: "+19%",
    yield: "4.3%",
    highlight: "High demand from IT workforce",
  },
  {
    rank: 3,
    name: "Hinjewadi",
    city: "Pune",
    score: 84,
    growth: "+21%",
    yield: "4.8%",
    highlight: "IT corridor growth",
  },
  {
    rank: 4,
    name: "Whitefield",
    city: "Bangalore",
    score: 82,
    growth: "+18%",
    yield: "4.0%",
    highlight: "Metro expansion by 2026",
  },
  {
    rank: 5,
    name: "Electronic City Ph 2",
    city: "Bangalore",
    score: 80,
    growth: "+17%",
    yield: "4.5%",
    highlight: "Affordable with high occupancy",
  },
  {
    rank: 6,
    name: "Wakad",
    city: "Pune",
    score: 78,
    growth: "+16%",
    yield: "4.2%",
    highlight: "Proximity to Hinjewadi IT Park",
  },
  {
    rank: 7,
    name: "Baner",
    city: "Pune",
    score: 77,
    growth: "+15%",
    yield: "4.1%",
    highlight: "Premium residential demand",
  },
  {
    rank: 8,
    name: "Gurgaon New Sectors",
    city: "Delhi NCR",
    score: 76,
    growth: "+14%",
    yield: "3.9%",
    highlight: "Delhi-Mumbai expressway node",
  },
  {
    rank: 9,
    name: "Yelahanka",
    city: "Bangalore",
    score: 74,
    growth: "+16%",
    yield: "3.8%",
    highlight: "Airport proximity + new roads",
  },
  {
    rank: 10,
    name: "Kharadi",
    city: "Pune",
    score: 73,
    growth: "+13%",
    yield: "4.0%",
    highlight: "EON Free Zone IT hub",
  },
];

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

export default function InvestmentScoreboardPage() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <BuyerLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Area Investment Scoreboard
          </h1>
          <p className="text-white/50">
            Top investment destinations ranked by AI-powered score, price growth
            & rental yield.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {AREAS.slice(0, 3).map((area, i) => (
            <Link
              key={area.name}
              to={
                `/buyer/investment-score/${area.name.replace(/\s+/g, "-").toLowerCase()}` as any
              }
              data-ocid={`scoreboard.podium.${i + 1}`}
              className="block bg-white/5 border rounded-2xl p-5 text-center relative overflow-hidden hover:-translate-y-1 hover:border-[#D4AF37]/60 transition-all duration-200"
              style={{
                borderColor: `${MEDAL_COLORS[i]}40`,
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(32px)",
                transition: `opacity 0.5s ease ${i * 0.12}s, transform 0.5s ease ${i * 0.12}s`,
              }}
            >
              <div
                className="absolute inset-0 opacity-5"
                style={{
                  background: `radial-gradient(circle, ${MEDAL_COLORS[i]}, transparent)`,
                }}
              />
              <Medal
                size={28}
                style={{ color: MEDAL_COLORS[i] }}
                className="mx-auto mb-2"
              />
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: MEDAL_COLORS[i] }}
              >
                Rank #{area.rank}
              </p>
              <h3 className="text-white font-bold text-base mt-1 break-words">
                {area.name}
              </h3>
              <p className="text-white/40 text-xs mb-3">{area.city}</p>
              <div
                className="text-3xl font-bold"
                style={{ color: MEDAL_COLORS[i] }}
              >
                {area.score}
              </div>
              <p className="text-white/30 text-xs mb-3">Investment Score</p>
              <div className="flex justify-center gap-4 text-sm">
                <div>
                  <p className="text-emerald-400 font-bold">{area.growth}</p>
                  <p className="text-white/30 text-xs">Growth</p>
                </div>
                <div>
                  <p className="text-[#D4AF37] font-bold">{area.yield}</p>
                  <p className="text-white/30 text-xs">Yield</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h2 className="text-white font-bold">Full Leaderboard</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/30 text-xs border-b border-white/10">
                <th className="text-left px-5 py-3">Rank</th>
                <th className="text-left px-5 py-3">Locality</th>
                <th className="text-right px-5 py-3">Score</th>
                <th className="text-right px-5 py-3">Price Growth</th>
                <th className="text-right px-5 py-3">Rental Yield</th>
                <th className="text-left px-5 py-3">Key Driver</th>
              </tr>
            </thead>
            <tbody>
              {AREAS.map((area, i) => {
                const scoreColor =
                  area.score >= 85
                    ? "#10b981"
                    : area.score >= 75
                      ? "#D4AF37"
                      : "#f59e0b";
                return (
                  <tr
                    key={area.name}
                    className="border-b border-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                    data-ocid={`scoreboard.row.${i + 1}`}
                    style={{
                      opacity: visible ? 1 : 0,
                      transition: `opacity 0.4s ease ${0.3 + i * 0.05}s`,
                    }}
                    onClick={() =>
                      navigate({
                        to: `/buyer/investment-score/${area.name.replace(/\s+/g, "-").toLowerCase()}` as any,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        navigate({
                          to: `/buyer/investment-score/${area.name.replace(/\s+/g, "-").toLowerCase()}` as any,
                        });
                    }}
                  >
                    <td className="px-5 py-4">
                      {i < 3 ? (
                        <Medal size={16} style={{ color: MEDAL_COLORS[i] }} />
                      ) : (
                        <span className="text-white/30 font-mono text-sm">
                          #{area.rank}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-white font-medium">{area.name}</p>
                      <p className="text-white/30 text-xs">{area.city}</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span
                        className="font-bold text-lg"
                        style={{ color: scoreColor }}
                      >
                        {area.score}
                      </span>
                      <span className="text-white/30 text-xs">/100</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp size={12} className="text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">
                          {area.growth}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-[#D4AF37] font-semibold">
                        {area.yield}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-white/40 text-xs">
                        {area.highlight}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </BuyerLayout>
  );
}
