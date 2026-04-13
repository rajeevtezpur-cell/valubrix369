import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BarChart2,
  Calculator,
  Cpu,
  Eye,
  GitCompare,
  Map as MapIcon,
  Search,
  Tag,
  TrendingUp,
} from "lucide-react";
import BuyerLayout from "../components/BuyerLayout";
import GlobalMapComponent from "../components/GlobalMapComponent";
import ListingCard from "../components/ListingCard";
import { PortalGuard } from "../components/PortalGuard";
import { useAuth } from "../context/AuthContext";
import { getAllListings } from "../data/mockListings";

function BuyerDashboardContent() {
  const { user } = useAuth();

  const topDeals = getAllListings()
    .filter((l) => l.aiMedian && l.price < l.aiMedian * 0.9)
    .slice(0, 3);

  const dashCards = [
    {
      icon: Search,
      label: "Search Properties",
      desc: "Browse thousands of listings with deal detection",
      link: "/buy",
      color: "#60a5fa",
      ocid: "buyer.search.card",
    },
    {
      icon: MapIcon,
      label: "Map Explorer",
      desc: "Discover properties by zone and region",
      link: "/buyer/map",
      color: "#2dd4bf",
      ocid: "buyer.map.card",
    },
    {
      icon: Tag,
      label: "Deal Finder",
      desc: "AI-detected undervalued properties",
      link: "/buyer/deals",
      color: "#34d399",
      ocid: "buyer.dealfinder.card",
    },
    {
      icon: TrendingUp,
      label: "AI Property Valuation",
      desc: "Get instant AI-powered property valuation",
      link: "/valuation",
      color: "#D4AF37",
      ocid: "buyer.valuation.card",
    },
    {
      icon: BarChart2,
      label: "Investment Insights",
      desc: "Rental yield, demand scores, investment ratings",
      link: "/area-intelligence",
      color: "#a78bfa",
      ocid: "buyer.insights.card",
    },
    {
      icon: Activity,
      label: "Market Pulse",
      desc: "Hottest areas, price drops, rental demand",
      link: "/buyer/market-pulse",
      color: "#fbbf24",
      ocid: "buyer.marketpulse.card",
    },
    {
      icon: Eye,
      label: "Off-Market Opportunities",
      desc: "AI-predicted properties before they list",
      link: "/buyer/off-market",
      color: "#818cf8",
      ocid: "buyer.offmarket.card",
    },
    {
      icon: GitCompare,
      label: "Property Comparison",
      desc: "Compare up to 4 properties side-by-side",
      link: "/buyer/compare",
      color: "#f472b6",
      ocid: "buyer.compare.card",
    },
    {
      icon: Calculator,
      label: "Financial Calculators",
      desc: "EMI, rental yield, flip profit and more",
      link: "/buyer/calculators",
      color: "#fb923c",
      ocid: "buyer.calculators.card",
    },
    {
      icon: Cpu,
      label: "Intelligence Terminal",
      desc: "Professional market analytics dashboard",
      link: "/buyer/intelligence",
      color: "#22d3ee",
      ocid: "buyer.intelligence.card",
    },
  ];

  return (
    <BuyerLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Welcome back,{" "}
            <span className="text-[#D4AF37]">
              {user?.fullName || user?.username || "Buyer"}
            </span>
          </h1>
          <p className="text-white/50 mt-1">
            Buyer Intelligence Platform — powered by AI
          </p>
        </div>

        {/* Quick Access Links */}
        <div className="flex flex-wrap gap-3 mb-8">
          {[
            {
              label: "Browse Properties",
              to: "/buy",
              color: "#60a5fa",
              ocid: "buyer.quicklink.buy",
            },
            {
              label: "Rental Listings",
              to: "/rent",
              color: "#2dd4bf",
              ocid: "buyer.quicklink.rent",
            },
            {
              label: "AI Valuation",
              to: "/valuation",
              color: "#D4AF37",
              ocid: "buyer.quicklink.valuation",
            },
          ].map((q) => (
            <Link
              key={q.ocid}
              to={q.to as any}
              data-ocid={q.ocid}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all hover:-translate-y-0.5"
              style={{
                background: `${q.color}12`,
                borderColor: `${q.color}35`,
                color: q.color,
              }}
            >
              {q.label}
              <ArrowRight size={13} />
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-10">
          {dashCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.ocid}
                to={card.link as any}
                data-ocid={card.ocid}
                className="group bg-white/5 backdrop-blur-md border border-white/10 hover:border-[#D4AF37]/50 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(212,175,55,0.15)] block"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="p-2.5 rounded-xl"
                    style={{ backgroundColor: `${card.color}20` }}
                  >
                    <Icon size={20} style={{ color: card.color }} />
                  </div>
                  <ArrowRight
                    size={14}
                    className="text-white/20 group-hover:text-white/60 group-hover:translate-x-1 transition-all"
                  />
                </div>
                <h3 className="text-white font-semibold text-sm">
                  {card.label}
                </h3>
                <p className="text-white/40 text-xs mt-1 leading-relaxed">
                  {card.desc}
                </p>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: "Properties Saved", value: "0" },
            { label: "Valuations Done", value: "0" },
            { label: "Alerts Active", value: "0" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
            >
              <p className="text-2xl font-bold text-[#D4AF37] font-mono">
                {s.value}
              </p>
              <p className="text-white/40 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Property Map Explorer */}
        <div
          className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-10"
          data-ocid="buyer.map_explorer.section"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div>
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <MapIcon size={18} className="text-[#2dd4bf]" />
                Property Map Explorer
              </h2>
              <p className="text-white/40 text-sm mt-0.5">
                Explore listings and market zones across Bangalore
              </p>
            </div>
            <Link
              to="/buyer/map"
              data-ocid="buyer.map_explorer.fullscreen_link"
              className="flex items-center gap-1.5 text-[#2dd4bf] text-sm font-semibold hover:underline"
            >
              Full Map <ArrowRight size={13} />
            </Link>
          </div>
          <div style={{ height: 400 }}>
            <GlobalMapComponent
              mode="buy"
              center={[12.9716, 77.5946]}
              zoom={12}
              height="400px"
              showLayerToggle={false}
            />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-white font-bold text-lg">
                Best Deals Right Now
              </h2>
              <p className="text-white/40 text-sm">
                Properties priced below AI market estimate
              </p>
            </div>
            <Link
              to="/buyer/deals"
              className="text-[#D4AF37] text-sm hover:underline flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-4">
            {topDeals.length > 0 ? (
              topDeals.map((l, idx) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  showActions="buyer"
                  index={idx}
                  onView={() => {}}
                />
              ))
            ) : (
              <p className="text-white/30 text-sm text-center py-4">
                All listings are fairly priced
              </p>
            )}
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}

export default function BuyerPortalPage() {
  return (
    <PortalGuard portal="buyer">
      <BuyerDashboardContent />
    </PortalGuard>
  );
}
