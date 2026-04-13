import { Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BarChart2,
  Building2,
  Eye,
  FileText,
  Heart,
  List,
  TrendingUp,
} from "lucide-react";
import { useEffect } from "react";
import GlobalNav from "../components/GlobalNav";
import { useAuth } from "../context/AuthContext";

export default function UserDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // biome-ignore lint/correctness/useExhaustiveDependencies: navigate is stable
  useEffect(() => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    // Redirect to role-specific portal
    if (user.role === "buyer") navigate({ to: "/buyer" });
    else if (user.role === "seller") navigate({ to: "/seller" });
    else if (user.role === "bankOfficer") navigate({ to: "/bank" });
    else if (user.role === "admin") navigate({ to: "/admin" });
  }, [user]);

  if (!user) return null;

  const buyerCards = [
    {
      icon: TrendingUp,
      label: "AI Property Valuation",
      desc: "Get instant property valuation",
      link: "/valuation",
      color: "#D4AF37",
    },
    {
      icon: Building2,
      label: "Search Properties",
      desc: "Browse thousands of listings",
      link: "/search",
      color: "#60a5fa",
    },
    {
      icon: Activity,
      label: "Market Pulse",
      desc: "Real-time market intelligence",
      link: "/buyer/market-pulse",
      color: "#fbbf24",
    },
    {
      icon: Eye,
      label: "Off-Market Opportunities",
      desc: "AI-predicted pre-listing deals",
      link: "/buyer/off-market",
      color: "#818cf8",
    },
    {
      icon: Heart,
      label: "Saved Properties",
      desc: "Your bookmarked listings",
      link: "/search",
      color: "#f472b6",
    },
    {
      icon: FileText,
      label: "Valuation Reports",
      desc: "Your AI valuation history",
      link: "/valuation",
      color: "#34d399",
    },
  ];

  const sellerCards = [
    {
      icon: Building2,
      label: "List New Property",
      desc: "Add a new property listing",
      link: "/seller/list-property",
      color: "#D4AF37",
    },
    {
      icon: List,
      label: "My Listings",
      desc: "Manage your property listings",
      link: "/seller",
      color: "#60a5fa",
    },
    {
      icon: BarChart2,
      label: "Listing Analytics",
      desc: "Views, inquiries, performance",
      link: "/seller",
      color: "#a78bfa",
    },
    {
      icon: TrendingUp,
      label: "Valuation Tools",
      desc: "AI valuation for your properties",
      link: "/valuation",
      color: "#34d399",
    },
  ];

  // Generic cards for users without a specific role — buyer-appropriate, no seller tools
  const genericCards = [
    {
      icon: TrendingUp,
      label: "AI Property Valuation",
      desc: "Get instant property valuation",
      link: "/valuation",
      color: "#D4AF37",
    },
    {
      icon: Building2,
      label: "Search Properties",
      desc: "Browse thousands of listings",
      link: "/search",
      color: "#60a5fa",
    },
    {
      icon: Heart,
      label: "Saved Properties",
      desc: "Properties you bookmarked",
      link: "/search",
      color: "#f472b6",
    },
    {
      icon: BarChart2,
      label: "My Valuation Reports",
      desc: "View your AI valuation history",
      link: "/valuation",
      color: "#34d399",
    },
  ];

  const cards =
    user.role === "buyer"
      ? buyerCards
      : user.role === "seller"
        ? sellerCards
        : genericCards;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1F] to-[#121B35]">
      <GlobalNav />
      <div className="pt-24 px-4 max-w-5xl mx-auto py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Welcome back,{" "}
            <span className="text-[#D4AF37]">
              {user.fullName || user.username}
            </span>
          </h1>
          <p className="text-white/50 mt-1">Your ValuBrix dashboard</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.label}
                to={card.link as any}
                className="group bg-white/5 hover:bg-white/8 backdrop-blur-md border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer block"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: `${card.color}20` }}
                  >
                    <Icon size={24} style={{ color: card.color }} />
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-white/20 group-hover:text-white/60 group-hover:translate-x-1 transition-all"
                  />
                </div>
                <h3 className="text-white font-semibold text-lg mt-4">
                  {card.label}
                </h3>
                <p className="text-white/40 text-sm mt-1">{card.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
