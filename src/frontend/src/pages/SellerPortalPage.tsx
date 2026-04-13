import { Link } from "@tanstack/react-router";
import {
  BarChart2,
  Bell,
  DollarSign,
  Eye,
  Heart,
  Home,
  Info,
  Map as MapIcon,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import GlobalMapComponent from "../components/GlobalMapComponent";
import { PortalGuard } from "../components/PortalGuard";
import SellerLayout from "../components/SellerLayout";
import { useAuth } from "../context/AuthContext";
import {
  getCanonicalSellerId,
  getSellerLeads,
  getSellerListings,
  getSellerVisits,
} from "../services/listingService";

function CountUp({
  target,
  prefix = "",
  suffix = "",
}: { target: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    let start = 0;
    const step = Math.ceil(target / 40) || 1;
    const interval = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(interval);
      } else setCount(start);
    }, 30);
    return () => clearInterval(interval);
  }, [target]);
  return (
    <span>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

interface StatValues {
  activeListings: number;
  totalViews: number;
  buyerInquiries: number;
  savedByBuyers: number;
  visitRequests: number;
  offersReceived: number;
}

function computeStats(user: any): StatValues {
  const canonicalId = getCanonicalSellerId(user);
  try {
    const sellerListings = getSellerListings(user);
    const activeListings = sellerListings.filter(
      (ul) => ul.status === "Active" || ul.status === "active",
    ).length;
    const totalViews = sellerListings.reduce(
      (sum, ul) => sum + (Number(ul.views) || 0),
      0,
    );
    const savedByBuyers = sellerListings.reduce(
      (sum, ul) => sum + (Number(ul.saves) || 0),
      0,
    );

    const leads = getSellerLeads(user);
    const buyerInquiries = leads.length;

    const visits = getSellerVisits(user);
    const visitRequests = visits.length;

    const offers: any[] = JSON.parse(
      localStorage.getItem("valubrix_offers") || "[]",
    );
    const offersReceived = canonicalId
      ? offers.filter((o) => !o.sellerId || o.sellerId === canonicalId).length
      : 0;

    return {
      activeListings,
      totalViews,
      buyerInquiries,
      savedByBuyers,
      visitRequests,
      offersReceived,
    };
  } catch {
    return {
      activeListings: 0,
      totalViews: 0,
      buyerInquiries: 0,
      savedByBuyers: 0,
      visitRequests: 0,
      offersReceived: 0,
    };
  }
}

const QUICK_ACTIONS = [
  {
    icon: Plus,
    label: "Create New Listing",
    to: "/seller/list-property",
    color: "bg-[#D4AF37]/10 border-[#D4AF37]/30 hover:border-[#D4AF37]/60",
    ocid: "seller.dashboard.create.button",
  },
  {
    icon: Home,
    label: "My Listings",
    to: "/seller/listings",
    color: "bg-blue-500/10 border-blue-500/30 hover:border-blue-500/60",
    ocid: "seller.dashboard.listings.button",
  },
  {
    icon: Users,
    label: "Buyer Leads",
    to: "/seller/leads",
    color: "bg-purple-500/10 border-purple-500/30 hover:border-purple-500/60",
    ocid: "seller.dashboard.leads.button",
  },
  {
    icon: TrendingUp,
    label: "Market Insights",
    to: "/seller/market-insights",
    color:
      "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60",
    ocid: "seller.dashboard.market.button",
  },
  {
    icon: BarChart2,
    label: "Analytics",
    to: "/seller/analytics",
    color: "bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60",
    ocid: "seller.dashboard.analytics.button",
  },
  {
    icon: DollarSign,
    label: "Offer Management",
    to: "/seller/offers",
    color: "bg-red-500/10 border-red-500/30 hover:border-red-500/60",
    ocid: "seller.dashboard.offers.button",
  },
];

const RECENT_ACTIVITY = [
  {
    time: "2h ago",
    text: "New inquiry on Prestige Park — Whitefield 3BHK",
    type: "inquiry",
  },
  {
    time: "5h ago",
    text: "Visit request approved for Sobha Villa, Sarjapur",
    type: "visit",
  },
  {
    time: "1d ago",
    text: "New offer received: ₹1.18 Cr on Brigade Apartment",
    type: "offer",
  },
  {
    time: "2d ago",
    text: "Listing 'Godrej Plot, Devanahalli' saved by 4 buyers",
    type: "save",
  },
  {
    time: "3d ago",
    text: "AI Optimization: Update photos on Whitefield listing",
    type: "ai",
  },
];

function SellerDashboardContent() {
  const { user } = useAuth();

  const [stats, setStats] = useState<StatValues>(() => computeStats(user));

  useEffect(() => {
    const refresh = () => setStats(computeStats(user));
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("valubrix:listings-updated", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("valubrix:listings-updated", refresh);
    };
  }, [user]);

  const STATS_DYNAMIC = [
    {
      icon: Home,
      label: "Active Listings",
      value: stats.activeListings,
      prefix: "",
      suffix: "",
      color: "text-emerald-400",
      to: "/seller/listings" as const,
    },
    {
      icon: Eye,
      label: "Total Views",
      value: stats.totalViews,
      prefix: "",
      suffix: "",
      color: "text-blue-400",
      to: "/seller/analytics" as const,
    },
    {
      icon: Users,
      label: "Buyer Inquiries",
      value: stats.buyerInquiries,
      prefix: "",
      suffix: "",
      color: "text-purple-400",
      to: "/seller/leads" as const,
    },
    {
      icon: Heart,
      label: "Saved by Buyers",
      value: stats.savedByBuyers,
      prefix: "",
      suffix: "",
      color: "text-pink-400",
      to: "/seller/analytics" as const,
    },
    {
      icon: Bell,
      label: "Visit Requests",
      value: stats.visitRequests,
      prefix: "",
      suffix: "",
      color: "text-amber-400",
      to: "/seller/visits" as const,
    },
    {
      icon: DollarSign,
      label: "Offers Received",
      value: stats.offersReceived,
      prefix: "",
      suffix: "",
      color: "text-[#D4AF37]",
      to: "/seller/offers" as const,
    },
  ];

  return (
    <SellerLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-white">
              Seller <span className="text-[#D4AF37]">Dashboard</span>
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Welcome back, {user?.fullName || user?.username}
            </p>
          </div>
          <Link
            to="/seller/list-property"
            data-ocid="seller.dashboard.new_listing.primary_button"
            className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#B8960C] text-black font-bold px-5 py-2.5 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"
          >
            <Plus size={16} />
            New Listing
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {STATS_DYNAMIC.map((s, i) => {
            const Icon = s.icon;
            return (
              <Link key={s.label} to={s.to}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  whileHover={{
                    y: -4,
                    boxShadow: "0 8px 30px rgba(212,175,55,0.15)",
                  }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm cursor-pointer hover:border-[#D4AF37]/30 transition-colors"
                >
                  <Icon size={18} className={`mb-2 ${s.color}`} />
                  <p className={`text-xl font-bold font-mono ${s.color}`}>
                    <CountUp
                      target={s.value}
                      prefix={s.prefix}
                      suffix={s.suffix}
                    />
                  </p>
                  <p className="text-white/40 text-xs mt-1 leading-tight">
                    {s.label}
                  </p>
                </motion.div>
              </Link>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-[#D4AF37]/10 to-[#D4AF37]/5 border border-[#D4AF37]/30 rounded-2xl p-5 flex items-center justify-between"
        >
          <div>
            <p className="text-[#D4AF37] font-semibold">AI Recommended Price</p>
            <p className="text-3xl font-bold text-white mt-1">₹1.28 Cr</p>
            <p className="text-white/40 text-sm">
              Market Average: ₹1.31 Cr &nbsp;·&nbsp; Your listings are
              competitively priced
            </p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold">
              ↑ 4.2% this month
            </span>
          </div>
        </motion.div>

        <div>
          <h2 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {QUICK_ACTIONS.map((a, i) => {
              const Icon = a.icon;
              return (
                <motion.div
                  key={a.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.06 }}
                  whileHover={{ y: -4 }}
                >
                  <Link
                    to={a.to as any}
                    data-ocid={a.ocid}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${a.color} text-center`}
                  >
                    <Icon size={20} className="text-white/70" />
                    <span className="text-white/70 text-xs font-medium">
                      {a.label}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Market Map Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
          data-ocid="seller.market_map.section"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div>
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <MapIcon size={18} className="text-emerald-400" />
                Market Map
              </h2>
              <p className="text-white/40 text-sm mt-0.5">
                Explore live price zones and demand signals in your area
              </p>
            </div>
          </div>
          <div style={{ height: 380 }}>
            <GlobalMapComponent
              mode="sell"
              center={[12.9716, 77.5946]}
              zoom={12}
              height="380px"
              showLayerToggle={false}
            />
          </div>
          {/* Listing visibility tip */}
          <div className="px-6 py-4 border-t border-white/8 bg-white/3 flex items-start gap-3">
            <Info size={15} className="text-[#D4AF37] flex-shrink-0 mt-0.5" />
            <p className="text-white/50 text-xs leading-relaxed">
              <span className="text-white/70 font-semibold">
                Listing visibility tip:
              </span>{" "}
              Sale listings you create appear in the{" "}
              <Link
                to="/buy"
                className="text-[#60a5fa] underline underline-offset-2"
              >
                Buy section
              </Link>
              . Rental listings appear in the{" "}
              <Link
                to="/rent"
                className="text-[#2dd4bf] underline underline-offset-2"
              >
                Rent section
              </Link>
              . Buyers searching those pages will see your active listings.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6"
        >
          <h2 className="text-white font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {RECENT_ACTIVITY.map((a) => (
              <div
                key={a.text}
                className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0"
              >
                <div className="w-2 h-2 rounded-full bg-[#D4AF37] mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-white/70 text-sm">{a.text}</p>
                </div>
                <span className="text-white/30 text-xs flex-shrink-0">
                  {a.time}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </SellerLayout>
  );
}

export default function SellerPortalPage() {
  return (
    <PortalGuard portal="seller">
      <SellerDashboardContent />
    </PortalGuard>
  );
}
