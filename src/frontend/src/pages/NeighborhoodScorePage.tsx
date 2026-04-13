import {
  Building2,
  Car,
  Heart,
  School,
  ShoppingBag,
  Star,
  Trees,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import BuyerLayout from "../components/BuyerLayout";

const NEIGHBORHOODS = [
  {
    name: "Whitefield",
    score: 86,
    city: "Bangalore",
    schools: 90,
    transport: 82,
    healthcare: 85,
    lifestyle: 88,
    parks: 78,
    shopping: 84,
    color: "#10b981",
  },
  {
    name: "Sarjapur Road",
    score: 81,
    city: "Bangalore",
    schools: 84,
    transport: 78,
    healthcare: 80,
    lifestyle: 83,
    parks: 75,
    shopping: 80,
    color: "#10b981",
  },
  {
    name: "Indiranagar",
    score: 92,
    city: "Bangalore",
    schools: 88,
    transport: 95,
    healthcare: 92,
    lifestyle: 96,
    parks: 82,
    shopping: 95,
    color: "#D4AF37",
  },
  {
    name: "Koramangala",
    score: 89,
    city: "Bangalore",
    schools: 87,
    transport: 90,
    healthcare: 89,
    lifestyle: 94,
    parks: 80,
    shopping: 92,
    color: "#D4AF37",
  },
  {
    name: "Electronic City",
    score: 74,
    city: "Bangalore",
    schools: 76,
    transport: 70,
    healthcare: 74,
    lifestyle: 72,
    parks: 71,
    shopping: 70,
    color: "#f59e0b",
  },
  {
    name: "Devanahalli",
    score: 68,
    city: "Bangalore",
    schools: 65,
    transport: 62,
    healthcare: 68,
    lifestyle: 66,
    parks: 80,
    shopping: 58,
    color: "#f59e0b",
  },
  {
    name: "Baner",
    score: 83,
    city: "Pune",
    schools: 86,
    transport: 80,
    healthcare: 82,
    lifestyle: 85,
    parks: 78,
    shopping: 82,
    color: "#10b981",
  },
  {
    name: "Wakad",
    score: 77,
    city: "Pune",
    schools: 78,
    transport: 76,
    healthcare: 77,
    lifestyle: 78,
    parks: 74,
    shopping: 76,
    color: "#f59e0b",
  },
];

const CATEGORIES = [
  { key: "schools", label: "Schools", icon: School },
  { key: "transport", label: "Transport", icon: Car },
  { key: "healthcare", label: "Healthcare", icon: Heart },
  { key: "lifestyle", label: "Lifestyle", icon: ShoppingBag },
  { key: "parks", label: "Parks", icon: Trees },
  { key: "shopping", label: "Shopping", icon: Building2 },
];

function AnimatedBar({
  value,
  color,
  delay,
}: { value: number; color: string; delay: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return (
    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setProgress(score), 300);
    return () => clearTimeout(t);
  }, [score]);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const filled = (progress / 100) * circ;
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" aria-hidden="true">
      <circle
        cx="45"
        cy="45"
        r={r}
        stroke="#ffffff15"
        strokeWidth="7"
        fill="none"
      />
      <circle
        cx="45"
        cy="45"
        r={r}
        stroke={color}
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ - filled}
        transform="rotate(-90 45 45)"
        style={{ transition: "stroke-dashoffset 1s ease-out" }}
      />
      <text
        x="45"
        y="50"
        textAnchor="middle"
        fill={color}
        fontSize="18"
        fontWeight="bold"
      >
        {score}
      </text>
    </svg>
  );
}

function NeighborhoodCard({
  n,
  index,
}: { n: (typeof NEIGHBORHOODS)[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 80);
    return () => clearTimeout(t);
  }, [index]);
  return (
    <div
      ref={ref}
      data-ocid={`neighborhood.card.${index + 1}`}
      className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-bold text-lg">{n.name}</h3>
          <p className="text-white/40 text-sm">{n.city}</p>
        </div>
        <ScoreRing score={n.score} color={n.color} />
      </div>
      <div className="space-y-3">
        {CATEGORIES.map((cat, ci) => {
          const val = n[cat.key as keyof typeof n] as number;
          const Icon = cat.icon;
          return (
            <div key={cat.key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-white/60 text-xs">
                  <Icon size={11} />
                  {cat.label}
                </div>
                <span className="text-white/80 text-xs font-semibold">
                  {val}
                </span>
              </div>
              <AnimatedBar value={val} color={n.color} delay={400 + ci * 80} />
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
        <Star size={13} className="text-[#D4AF37]" fill="#D4AF37" />
        <span className="text-white/50 text-xs">
          Overall Livability:{" "}
          <span style={{ color: n.color }} className="font-bold">
            {n.score}/100
          </span>
        </span>
      </div>
    </div>
  );
}

export default function NeighborhoodScorePage() {
  return (
    <BuyerLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Neighborhood Score
          </h1>
          <p className="text-white/50">
            Livability scores based on schools, transport, healthcare, lifestyle
            & more.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {NEIGHBORHOODS.map((n, i) => (
            <NeighborhoodCard key={n.name} n={n} index={i} />
          ))}
        </div>
      </div>
    </BuyerLayout>
  );
}
