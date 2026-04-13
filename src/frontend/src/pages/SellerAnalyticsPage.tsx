import { Clock, Eye, MousePointer, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import SellerLayout from "../components/SellerLayout";

const ALL_LISTING_VIEWS = [
  {
    id: 1,
    title: "Prestige Park 3BHK",
    views: 342,
    ctr: "8.2%",
    avgTime: "3m 24s",
    trend: "+12%",
    dailyViews30: Array.from(
      { length: 30 },
      (_, i) => 8 + Math.floor((i * 7 + 3) % 15),
    ),
  },
  {
    id: 2,
    title: "Sobha Villa, Sarjapur",
    views: 218,
    ctr: "6.5%",
    avgTime: "4m 02s",
    trend: "+5%",
    dailyViews30: Array.from(
      { length: 30 },
      (_, i) => 5 + Math.floor((i * 5 + 2) % 12),
    ),
  },
  {
    id: 3,
    title: "Brigade Plot",
    views: 45,
    ctr: "3.1%",
    avgTime: "1m 45s",
    trend: "-3%",
    dailyViews30: Array.from(
      { length: 30 },
      (_, i) => 1 + Math.floor((i * 3 + 1) % 5),
    ),
  },
  {
    id: 4,
    title: "Godrej Commercial",
    views: 890,
    ctr: "11.4%",
    avgTime: "5m 18s",
    trend: "+28%",
    dailyViews30: Array.from(
      { length: 30 },
      (_, i) => 25 + Math.floor((i * 9 + 4) % 30),
    ),
  },
];

const DATE_RANGES = ["7d", "30d", "90d"] as const;
type DateRange = (typeof DATE_RANGES)[number];

export default function SellerAnalyticsPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | "all">(
    "all",
  );
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;

  const visibleListings =
    selectedPropertyId === "all"
      ? ALL_LISTING_VIEWS
      : ALL_LISTING_VIEWS.filter((l) => l.id === selectedPropertyId);

  const trendData = useMemo(() => {
    const base =
      selectedPropertyId === "all"
        ? ALL_LISTING_VIEWS.flatMap((l) => l.dailyViews30)
        : (ALL_LISTING_VIEWS.find((l) => l.id === selectedPropertyId)
            ?.dailyViews30 ?? []);
    // For 30d use as-is, for 7d take last 7, for 90d repeat with growth
    if (dateRange === "7d") return base.slice(0, 7);
    if (dateRange === "90d")
      return [
        ...base,
        ...base.map((v) => Math.round(v * 1.1)),
        ...base.map((v) => Math.round(v * 1.2)),
      ];
    return base;
  }, [selectedPropertyId, dateRange]);

  const totalViews = visibleListings.reduce((a, l) => a + l.views, 0);
  const maxTrend = Math.max(...trendData);

  const OVERVIEW = [
    {
      icon: Eye,
      label: "Total Views",
      value: totalViews.toLocaleString(),
      color: "text-blue-400",
    },
    {
      icon: MousePointer,
      label: "Avg Click-Through",
      value:
        selectedPropertyId === "all"
          ? "7.3%"
          : `${visibleListings[0]?.ctr ?? "--"}`,
      color: "text-purple-400",
    },
    {
      icon: Clock,
      label: "Avg Time on Listing",
      value:
        selectedPropertyId === "all"
          ? "3m 37s"
          : `${visibleListings[0]?.avgTime ?? "--"}`,
      color: "text-amber-400",
    },
    {
      icon: TrendingUp,
      label: "Views Growth",
      value:
        selectedPropertyId === "all"
          ? "+18%"
          : `${visibleListings[0]?.trend ?? "--"}`,
      color: "text-emerald-400",
    },
  ];

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Listing <span className="text-[#D4AF37]">Analytics</span>
          </h1>
          <p className="text-white/40 text-sm mt-1">Performance overview</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedPropertyId}
            onChange={(e) =>
              setSelectedPropertyId(
                e.target.value === "all" ? "all" : Number(e.target.value),
              )
            }
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#D4AF37]/40 cursor-pointer"
          >
            <option value="all">All Properties</option>
            {ALL_LISTING_VIEWS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            {DATE_RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDateRange(r)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  dateRange === r
                    ? "bg-[#D4AF37] text-black"
                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {OVERVIEW.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -4 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-4"
              >
                <Icon size={16} className={`mb-2 ${s.color}`} />
                <p className={`text-xl font-bold font-mono ${s.color}`}>
                  {s.value}
                </p>
                <p className="text-white/40 text-xs mt-1">{s.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Views Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6"
        >
          <h2 className="text-white font-semibold mb-4">
            Views Trend ({dateRange})
          </h2>
          <svg
            viewBox={`0 0 ${days * 16} 80`}
            className="w-full"
            preserveAspectRatio="none"
            role="img"
            aria-label="Views trend"
          >
            <title>Views trend</title>
            {trendData.slice(0, days).map((v, i) => {
              const barH = maxTrend > 0 ? (v / maxTrend) * 65 : 0;
              const x = i * 16 + 2;
              return (
                <rect
                  // biome-ignore lint/suspicious/noArrayIndexKey: SVG chart bars have no stable id
                  key={`bar-${i}`}
                  x={x}
                  y={75 - barH}
                  width={12}
                  height={barH}
                  rx={2}
                  fill="#D4AF37"
                  opacity={0.6 + (v / (maxTrend || 1)) * 0.4}
                />
              );
            })}
          </svg>
        </motion.div>

        {/* Per-listing table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5"
        >
          <h2 className="text-white font-semibold mb-4">
            Per Listing Breakdown
          </h2>
          <div className="space-y-3">
            {visibleListings.map((l, i) => (
              <div key={l.id} className="flex items-center gap-4">
                <span className="text-white/40 text-xs w-4">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{l.title}</p>
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-white/40 text-xs">
                      {l.views} views
                    </span>
                    <span className="text-white/40 text-xs">CTR: {l.ctr}</span>
                    <span className="text-white/40 text-xs">
                      Avg: {l.avgTime}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-xs font-bold ${l.trend.startsWith("+") ? "text-emerald-400" : "text-red-400"}`}
                >
                  {l.trend}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </SellerLayout>
  );
}
