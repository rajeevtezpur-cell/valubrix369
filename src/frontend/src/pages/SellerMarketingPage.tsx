import {
  Eye,
  Megaphone,
  MousePointer,
  Plus,
  Square,
  Star,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import SellerLayout from "../components/SellerLayout";

const FEATURED_PROPS = [
  {
    id: 1,
    title: "Prestige Park 3BHK, Whitefield",
    price: "₹1.28 Cr",
    featured: true,
  },
  { id: 2, title: "Sobha Villa, Sarjapur", price: "₹2.45 Cr", featured: false },
  {
    id: 3,
    title: "Brigade Plot, Devanahalli",
    price: "₹62 L",
    featured: false,
  },
  {
    id: 4,
    title: "Godrej Commercial, Electronic City",
    price: "₹1.85 Cr",
    featured: true,
  },
];

const INITIAL_CAMPAIGNS = [
  {
    id: 1,
    name: "Whitefield Premium Push",
    property: "Prestige Park 3BHK",
    status: "Active",
    impressions: 12450,
    clicks: 340,
    startDate: "Feb 1, 2026",
    endDate: "Feb 28, 2026",
  },
  {
    id: 2,
    name: "Luxury Villa Spotlight",
    property: "Sobha Villa, Sarjapur",
    status: "Paused",
    impressions: 8320,
    clicks: 198,
    startDate: "Jan 15, 2026",
    endDate: "Feb 15, 2026",
  },
  {
    id: 3,
    name: "Investment Plot Campaign",
    property: "Brigade Plot, Devanahalli",
    status: "Completed",
    impressions: 22100,
    clicks: 560,
    startDate: "Dec 1, 2025",
    endDate: "Dec 31, 2025",
  },
];

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-emerald-500/20 text-emerald-400",
  Paused: "bg-amber-500/20 text-amber-400",
  Completed: "bg-blue-500/20 text-blue-400",
  Stopped: "bg-red-500/20 text-red-400",
};

export default function SellerMarketingPage() {
  const [featured, setFeatured] = useState(FEATURED_PROPS);
  const [campaigns, setCampaigns] = useState(INITIAL_CAMPAIGNS);
  const [showCreate, setShowCreate] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    property: FEATURED_PROPS[0].title,
    budget: "",
    duration: "30",
  });

  const toggleFeatured = (id: number) => {
    setFeatured((prev) =>
      prev.map((p) => (p.id === id ? { ...p, featured: !p.featured } : p)),
    );
  };

  const updateCampaignStatus = (id: number, status: string) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c)),
    );
  };

  const handleCreateCampaign = () => {
    if (!newCampaign.name.trim()) return;
    const now = new Date();
    const end = new Date(
      now.getTime() + Number(newCampaign.duration) * 86400000,
    );
    setCampaigns((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: newCampaign.name,
        property: newCampaign.property,
        status: "Active",
        impressions: 0,
        clicks: 0,
        startDate: now.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        endDate: end.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      },
    ]);
    setShowCreate(false);
    setNewCampaign({
      name: "",
      property: FEATURED_PROPS[0].title,
      budget: "",
      duration: "30",
    });
  };

  const STATS = [
    {
      icon: Eye,
      label: "Total Impressions",
      value: campaigns.reduce((s, c) => s + c.impressions, 0).toLocaleString(),
      color: "text-blue-400",
    },
    {
      icon: MousePointer,
      label: "Total Clicks",
      value: campaigns.reduce((s, c) => s + c.clicks, 0).toLocaleString(),
      color: "text-purple-400",
    },
    {
      icon: TrendingUp,
      label: "Avg CTR",
      value: "3.1%",
      color: "text-emerald-400",
    },
    {
      icon: Star,
      label: "Featured Properties",
      value: `${featured.filter((p) => p.featured).length}`,
      color: "text-[#D4AF37]",
    },
  ];

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Marketing & <span className="text-[#D4AF37]">Promotions</span>
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Boost visibility and reach more buyers
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#B8960C] text-black font-bold px-4 py-2.5 rounded-xl transition-all text-sm"
          >
            <Plus size={16} /> Create Campaign
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
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

        {/* Featured Listings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Star size={16} className="text-[#D4AF37]" />
            <h2 className="text-white font-semibold">Featured Listings</h2>
          </div>
          <div className="space-y-3">
            {featured.map((prop) => (
              <div
                key={prop.id}
                className="flex items-center gap-4 p-3 bg-white/3 rounded-xl"
              >
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{prop.title}</p>
                  <p className="text-[#D4AF37] text-xs">{prop.price}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleFeatured(prop.id)}
                  className="flex items-center gap-2 transition-all"
                >
                  {prop.featured ? (
                    <>
                      <ToggleRight size={28} className="text-[#D4AF37]" />
                      <span className="text-[#D4AF37] text-xs font-medium">
                        Featured
                      </span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft size={28} className="text-white/30" />
                      <span className="text-white/30 text-xs">
                        Not Featured
                      </span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Campaigns */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Megaphone size={16} className="text-[#D4AF37]" />
            <h2 className="text-white font-semibold">Promotion Campaigns</h2>
          </div>
          <div className="space-y-4">
            {campaigns.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.06 }}
                className="bg-white/3 border border-white/5 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-medium text-sm">
                        {c.name}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status]}`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs">{c.property}</p>
                    <div className="flex gap-4 mt-2">
                      <span className="text-white/50 text-xs">
                        {c.impressions.toLocaleString()} impressions
                      </span>
                      <span className="text-white/50 text-xs">
                        {c.clicks.toLocaleString()} clicks
                      </span>
                      <span className="text-white/30 text-xs">
                        {c.startDate} – {c.endDate}
                      </span>
                    </div>
                  </div>
                  {c.status !== "Completed" && (
                    <div className="flex gap-2 flex-shrink-0">
                      {c.status === "Paused" && (
                        <button
                          type="button"
                          onClick={() => updateCampaignStatus(c.id, "Active")}
                          className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-xs font-medium transition-all"
                        >
                          Start
                        </button>
                      )}
                      {c.status === "Active" && (
                        <button
                          type="button"
                          onClick={() => updateCampaignStatus(c.id, "Paused")}
                          className="px-3 py-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-lg text-xs font-medium transition-all"
                        >
                          Pause
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => updateCampaignStatus(c.id, "Stopped")}
                        className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                      >
                        <Square size={10} /> Stop
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Create Campaign Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#0A0F1F] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold">Create Campaign</h3>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="text-white/40 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="camp-name"
                    className="text-white/50 text-xs mb-1.5 block"
                  >
                    Campaign Name
                  </label>
                  <input
                    id="camp-name"
                    type="text"
                    value={newCampaign.name}
                    onChange={(e) =>
                      setNewCampaign((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="e.g. Spring Sale Push"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/40"
                  />
                </div>
                <div>
                  <label
                    htmlFor="camp-property"
                    className="text-white/50 text-xs mb-1.5 block"
                  >
                    Property
                  </label>
                  <select
                    id="camp-property"
                    value={newCampaign.property}
                    onChange={(e) =>
                      setNewCampaign((p) => ({
                        ...p,
                        property: e.target.value,
                      }))
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/40"
                  >
                    {FEATURED_PROPS.map((p) => (
                      <option key={p.id} value={p.title}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="camp-budget"
                    className="text-white/50 text-xs mb-1.5 block"
                  >
                    Budget (₹)
                  </label>
                  <input
                    id="camp-budget"
                    type="number"
                    value={newCampaign.budget}
                    onChange={(e) =>
                      setNewCampaign((p) => ({ ...p, budget: e.target.value }))
                    }
                    placeholder="e.g. 5000"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/40"
                  />
                </div>
                <div>
                  <label
                    htmlFor="camp-duration"
                    className="text-white/50 text-xs mb-1.5 block"
                  >
                    Duration
                  </label>
                  <select
                    id="camp-duration"
                    value={newCampaign.duration}
                    onChange={(e) =>
                      setNewCampaign((p) => ({
                        ...p,
                        duration: e.target.value,
                      }))
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/40"
                  >
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleCreateCampaign}
                  disabled={!newCampaign.name.trim()}
                  className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#B8960C] disabled:opacity-50 text-black font-bold rounded-xl transition-all"
                >
                  Launch Campaign
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SellerLayout>
  );
}
