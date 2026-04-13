import { BarChart2, Brain, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useScrollReveal } from "../hooks/useScrollReveal";

const features = [
  {
    icon: Brain,
    title: "AI Valuation Report",
    description:
      "Get a data-backed AI valuation for any Bangalore property in seconds. Built on 15,000+ real transactions with 3-layer confidence scoring.",
    color: "#D8B56A",
    bg: "rgba(216,181,106,0.08)",
    border: "rgba(216,181,106,0.20)",
  },
  {
    icon: TrendingUp,
    title: "Price Trend Analysis",
    description:
      "Track price trajectories across 50+ Bangalore micro-locations. Identify rising corridors before the market does with yoy trend charts.",
    color: "#4FC3F7",
    bg: "rgba(79,195,247,0.08)",
    border: "rgba(79,195,247,0.20)",
  },
  {
    icon: BarChart2,
    title: "Investment Analysis",
    description:
      "AI-computed investment scores, rental yield projections and risk matrices for every micro-market — designed for serious investors.",
    color: "#A5D6A7",
    bg: "rgba(165,214,167,0.08)",
    border: "rgba(165,214,167,0.20)",
  },
];

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
  bg,
  border,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bg: string;
  border: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="p-8 flex flex-col gap-5 cursor-default transition-all duration-300 rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        transform: hovered ? "translateY(-8px)" : "translateY(0)",
        border: hovered
          ? `1px solid ${border.replace("0.20", "0.45")}`
          : "1px solid rgba(255,255,255,0.10)",
        boxShadow: hovered
          ? "0 20px 60px rgba(0,0,0,0.5)"
          : "0 8px 40px rgba(0,0,0,0.35)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="inline-flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300"
        style={{
          background: hovered ? bg.replace("0.08", "0.14") : bg,
          border: `1px solid ${border}`,
        }}
      >
        <Icon
          size={26}
          style={{
            color,
            transform: hovered
              ? "rotate(5deg) scale(1.1)"
              : "rotate(0deg) scale(1)",
            transition: "transform 0.3s ease",
          }}
        />
      </div>
      <h3 className="text-lg font-bold" style={{ color: "#F4F7FF" }}>
        {title}
      </h3>
      <p
        className="text-sm leading-relaxed flex-1"
        style={{ color: "#B9C6D8" }}
      >
        {description}
      </p>
    </div>
  );
}

export default function FeatureCards() {
  const ref = useScrollReveal(true);
  return (
    <section className="py-20 max-w-6xl mx-auto px-4">
      <div className="text-center mb-14">
        <p
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: "#D8B56A" }}
        >
          Unlock Local Insights
        </p>
        <h2
          className="text-3xl md:text-4xl font-bold"
          style={{
            fontFamily: "'Playfair Display', serif",
            color: "#F4F7FF",
          }}
        >
          Everything you need to transact with confidence
        </h2>
        <p
          className="text-base mt-4 max-w-xl mx-auto"
          style={{ color: "#B9C6D8" }}
        >
          From AI-powered valuations to hyper-local market intelligence — all in
          one platform.
        </p>
      </div>
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {features.map((f) => (
          <FeatureCard key={f.title} {...f} />
        ))}
      </div>
    </section>
  );
}
