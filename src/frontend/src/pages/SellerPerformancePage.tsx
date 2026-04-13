import { BarChart2, Calendar, Eye, Heart, MessageSquare } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import SellerLayout from "../components/SellerLayout";

const MOCK_PROPERTIES = [
  { id: 1, title: "Prestige Park 3BHK, Whitefield" },
  { id: 2, title: "Sobha Villa, Sarjapur" },
  { id: 3, title: "Brigade Plot, Devanahalli" },
  { id: 4, title: "Godrej Commercial, Electronic City" },
];

const MOCK_DATA: Record<
  number,
  {
    views: number;
    saves: number;
    inquiries: number;
    visits: number;
    offers: number;
    dailyViews: number[];
  }
> = {
  1: {
    views: 342,
    saves: 18,
    inquiries: 12,
    visits: 5,
    offers: 2,
    dailyViews: [12, 15, 10, 22, 18, 30, 25, 19, 28, 35, 22, 18, 24, 29],
  },
  2: {
    views: 218,
    saves: 11,
    inquiries: 8,
    visits: 3,
    offers: 1,
    dailyViews: [8, 10, 14, 9, 16, 22, 18, 12, 20, 25, 15, 18, 21, 17],
  },
  3: {
    views: 45,
    saves: 3,
    inquiries: 2,
    visits: 1,
    offers: 0,
    dailyViews: [2, 3, 4, 2, 5, 3, 4, 3, 4, 6, 3, 4, 5, 3],
  },
  4: {
    views: 890,
    saves: 34,
    inquiries: 22,
    visits: 8,
    offers: 4,
    dailyViews: [45, 60, 55, 70, 65, 80, 72, 68, 75, 85, 70, 78, 82, 90],
  },
};

export default function SellerPerformancePage() {
  const [selectedId, setSelectedId] = useState(1);
  const d = MOCK_DATA[selectedId];
  const maxView = Math.max(...d.dailyViews);

  const STATS = [
    { icon: Eye, label: "Total Views", value: d.views, color: "text-blue-400" },
    { icon: Heart, label: "Saves", value: d.saves, color: "text-pink-400" },
    {
      icon: MessageSquare,
      label: "Inquiries",
      value: d.inquiries,
      color: "text-purple-400",
    },
    {
      icon: Calendar,
      label: "Visit Requests",
      value: d.visits,
      color: "text-amber-400",
    },
  ];

  const FUNNEL = [
    { label: "Views", value: d.views, pct: 100 },
    {
      label: "Saves",
      value: d.saves,
      pct: Math.round((d.saves / d.views) * 100),
    },
    {
      label: "Inquiries",
      value: d.inquiries,
      pct: Math.round((d.inquiries / d.views) * 100),
    },
    {
      label: "Visit Requests",
      value: d.visits,
      pct: Math.round((d.visits / d.views) * 100),
    },
    {
      label: "Offers",
      value: d.offers,
      pct: Math.round((d.offers / d.views) * 100),
    },
  ];

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Listing <span className="text-[#D4AF37]">Performance</span>
            </h1>
            <p className="text-white/40 text-sm mt-1">Last 14 days analytics</p>
          </div>
          <select
            data-ocid="seller.performance.property.select"
            value={selectedId}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-[#D4AF37]/40"
          >
            {MOCK_PROPERTIES.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#0A0F1F]">
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s, i) => {
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
                <p className={`text-2xl font-bold font-mono ${s.color}`}>
                  {s.value}
                </p>
                <p className="text-white/40 text-xs mt-1">{s.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Daily Views Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 size={16} className="text-[#D4AF37]" />
            <h2 className="text-white font-semibold">
              Daily Views (Last 14 Days)
            </h2>
          </div>
          <div className="flex items-end gap-2 h-32">
            {d.dailyViews.map((v, i) => (
              <motion.div
                key={`day${i}-${v}`}
                initial={{ height: 0 }}
                animate={{ height: `${(v / maxView) * 100}%` }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="flex-1 bg-gradient-to-t from-[#D4AF37]/60 to-[#D4AF37]/20 rounded-t-sm min-h-[4px]"
                title={`Day ${i + 1}: ${v} views`}
              />
            ))}
          </div>
          <div className="flex justify-between text-white/20 text-[10px] mt-2">
            <span>14 days ago</span>
            <span>Today</span>
          </div>
        </motion.div>

        {/* Buyer Interest Funnel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6"
        >
          <h2 className="text-white font-semibold mb-4">
            Buyer Interest Funnel
          </h2>
          <div className="space-y-3">
            {FUNNEL.map((f, i) => (
              <div key={f.label} className="flex items-center gap-3">
                <span className="text-white/50 text-xs w-24">{f.label}</span>
                <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${f.pct}%` }}
                    transition={{ delay: 0.5 + i * 0.08, duration: 0.6 }}
                    className="h-full bg-gradient-to-r from-[#D4AF37]/80 to-[#D4AF37]/40 rounded-full flex items-center justify-end pr-2"
                  >
                    <span className="text-black text-[10px] font-bold">
                      {f.value}
                    </span>
                  </motion.div>
                </div>
                <span className="text-white/30 text-xs w-10 text-right">
                  {f.pct}%
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </SellerLayout>
  );
}
