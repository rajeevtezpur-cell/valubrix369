import { useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import BuyerLayout from "../components/BuyerLayout";
import { PortalGuard } from "../components/PortalGuard";

function seedHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++)
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seededValue(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000;
  return Math.round(min + (x - Math.floor(x)) * (max - min));
}

function toTitleCase(str: string) {
  return str.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 300);
    return () => clearTimeout(t);
  }, [score]);
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (animated / 100) * circ;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="10"
      />
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      <text
        x="70"
        y="70"
        textAnchor="middle"
        dy="0.35em"
        fill="white"
        fontSize="28"
        fontWeight="bold"
      >
        {animated}
      </text>
      <text
        x="70"
        y="92"
        textAnchor="middle"
        fill="rgba(255,255,255,0.3)"
        fontSize="10"
      >
        / 100
      </text>
    </svg>
  );
}

function AnimatedNumber({
  target,
  prefix = "",
  suffix = "",
}: { target: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setVal(target), 200);
    return () => clearTimeout(t);
  }, [target]);
  return (
    <span style={{ transition: "all 0.8s" }}>
      {prefix}
      {val}
      {suffix}
    </span>
  );
}

function LineChart({ points, color }: { points: number[]; color: string }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 400);
    return () => clearTimeout(t);
  }, []);
  const w = 300;
  const h = 80;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pts = points
    .map(
      (p, i) =>
        `${(i / (points.length - 1)) * w},${h - ((p - min) / range) * h * 0.85}`,
    )
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" aria-hidden="true">
      <defs>
        <linearGradient id="lineg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={drawn ? 2 : 0}
        strokeLinejoin="round"
        style={{ transition: "stroke-width 0.5s" }}
      />
      <polygon
        points={`0,${h} ${pts} ${w},${h}`}
        fill="url(#lineg)"
        style={{ opacity: drawn ? 1 : 0, transition: "opacity 0.6s" }}
      />
      {points.map((p, i) => (
        <circle
          // biome-ignore lint/suspicious/noArrayIndexKey: positional data points
          key={i}
          cx={(i / (points.length - 1)) * w}
          cy={h - ((p - min) / range) * h * 0.85}
          r="3"
          fill={color}
          style={{
            opacity: drawn ? 1 : 0,
            transition: `opacity 0.4s ${0.5 + i * 0.1}s`,
          }}
        />
      ))}
    </svg>
  );
}

export default function BuyerInvestmentScorePage() {
  const { area } = useParams({ strict: false }) as { area: string };
  const areaName = toTitleCase(area || "devanahalli");
  const seed = seedHash(areaName);

  const investScore = seededValue(seed, 65, 95);
  const priceGrowth = seededValue(seed + 1, 10, 30);
  const rentalYield = seededValue(seed + 2, 30, 55) / 10;
  const demandScore = seededValue(seed + 3, 60, 95);
  const livabilityScore = seededValue(seed + 4, 55, 90);
  const riskLevel =
    investScore >= 85 ? "Low" : investScore >= 75 ? "Medium" : "High";
  const riskColor =
    riskLevel === "Low"
      ? "#10b981"
      : riskLevel === "Medium"
        ? "#f59e0b"
        : "#ef4444";

  const scoreColor =
    investScore >= 85 ? "#10b981" : investScore >= 75 ? "#D4AF37" : "#f59e0b";

  const pricePoints = Array.from({ length: 6 }, (_, i) =>
    Math.round(5000 + (seed % 3000) + i * seededValue(seed + i, 100, 400)),
  );

  const growthBars = [
    { label: "1Y", val: seededValue(seed + 10, 8, 20) },
    { label: "3Y", val: seededValue(seed + 11, 18, 40) },
    { label: "5Y", val: seededValue(seed + 12, 30, 65) },
  ];

  const topProjects = [
    {
      name: `${areaName} Prestige One`,
      price: `₹${seededValue(seed + 20, 55, 120)}L`,
      type: "Flat",
    },
    {
      name: `${areaName} Grand Villas`,
      price: `₹${seededValue(seed + 21, 80, 200)}L`,
      type: "Villa",
    },
    {
      name: `${areaName} Smart Plots`,
      price: `₹${seededValue(seed + 22, 30, 80)}L`,
      type: "Plot",
    },
  ];

  const infraHighlights = [
    `Metro station within ${seededValue(seed + 30, 2, 8)} km`,
    `${seededValue(seed + 31, 2, 6)} major IT parks nearby`,
    `${seededValue(seed + 32, 1, 4)} proposed road widening projects`,
    `Airport connectivity: ${seededValue(seed + 33, 15, 45)} mins`,
  ];

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <PortalGuard portal="buyer">
      <BuyerLayout>
        <div
          className="max-w-5xl mx-auto"
          style={{ opacity: visible ? 1 : 0, transition: "opacity 0.4s" }}
        >
          <div className="mb-8">
            <p className="text-[#D4AF37] text-xs uppercase tracking-widest mb-1">
              Investment Score
            </p>
            <h1 className="text-3xl font-bold text-white">{areaName}</h1>
          </div>

          {/* Score + Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-8">
            <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center">
              <ScoreRing score={investScore} color={scoreColor} />
              <p className="text-white font-bold mt-2">Investment Score</p>
              <p className="text-white/40 text-xs mt-1">{areaName}</p>
            </div>
            <div className="md:col-span-3 grid grid-cols-2 gap-4">
              {[
                {
                  label: "Price Growth",
                  val: `+${priceGrowth}%`,
                  color: "#10b981",
                },
                {
                  label: "Rental Yield",
                  val: `${rentalYield}%`,
                  color: "#D4AF37",
                },
                {
                  label: "Demand Score",
                  val: `${demandScore}/100`,
                  color: "#60a5fa",
                },
                {
                  label: "Livability",
                  val: `${livabilityScore}/100`,
                  color: "#a78bfa",
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5"
                >
                  <p className="text-white/40 text-xs mb-2">{m.label}</p>
                  <p className="text-2xl font-bold" style={{ color: m.color }}>
                    <AnimatedNumber
                      target={Number.parseFloat(m.val)}
                      suffix={m.val.replace(/[\d.+]/g, "")}
                    />
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-4 text-sm">
                Price Trend (₹/sqft)
              </h3>
              <LineChart points={pricePoints} color={scoreColor} />
              <div className="flex justify-between text-white/30 text-[10px] mt-1">
                {["2019", "2020", "2021", "2022", "2023", "2024"].map((y) => (
                  <span key={y}>{y}</span>
                ))}
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-4 text-sm">
                Growth Projection
              </h3>
              <div className="flex items-end gap-4 h-24">
                {growthBars.map((b) => (
                  <div
                    key={b.label}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="text-white text-xs font-bold">
                      +{b.val}%
                    </span>
                    <div
                      className="w-full rounded-t-lg transition-all duration-700"
                      style={{
                        height: `${(b.val / 65) * 80}%`,
                        background: scoreColor,
                        minHeight: "8px",
                      }}
                    />
                    <span className="text-white/40 text-xs">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Reasoning + Infra + Projects */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-4 text-sm">
                Why Invest Here
              </h3>
              <ul className="space-y-3 text-white/60 text-sm">
                <li className="flex gap-2">
                  <span className="text-[#D4AF37]">→</span>
                  <span>
                    Strong job access score ({demandScore}/100) driven by IT
                    corridor proximity and upcoming SEZ zones.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#D4AF37]">→</span>
                  <span>
                    Price growth of +{priceGrowth}% over 3 years consistently
                    outpaces Bangalore average (+12%).
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#D4AF37]">→</span>
                  <span>
                    Rental yield at {rentalYield}% is above market average of
                    3.5%, driven by IT/professional tenant demand.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#D4AF37]">→</span>
                  <span>
                    Infrastructure pipeline (metro, roads, STRR) is expected to
                    unlock 15–25% appreciation by 2027.
                  </span>
                </li>
              </ul>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-4 text-sm">
                Infrastructure
              </h3>
              <ul className="space-y-3">
                {infraHighlights.map((h) => (
                  <li key={h} className="flex gap-2 text-xs text-white/60">
                    <span className="text-[#D4AF37] mt-0.5">✓</span>
                    {h}
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-white/30 text-xs mb-1">Risk Level</p>
                <span
                  className="text-sm font-bold px-3 py-1 rounded-lg"
                  style={{ background: `${riskColor}20`, color: riskColor }}
                >
                  {riskLevel} Risk
                </span>
              </div>
            </div>
          </div>

          {/* Top Projects */}
          <div>
            <h2 className="text-white font-bold mb-4">
              Top Projects in {areaName}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {topProjects.map((p, i) => (
                <div
                  key={p.name}
                  data-ocid={`investment.item.${i + 1}`}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-[#D4AF37]/40 transition-colors"
                >
                  <p className="text-white font-semibold text-sm">{p.name}</p>
                  <p className="text-white/40 text-xs mb-3">{p.type}</p>
                  <p className="text-[#D4AF37] font-bold">{p.price}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </BuyerLayout>
    </PortalGuard>
  );
}
