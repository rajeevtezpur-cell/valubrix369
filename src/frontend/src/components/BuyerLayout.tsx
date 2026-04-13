import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BarChart2,
  Bell,
  Bookmark,
  Building,
  Building2,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Eye,
  GitCompare,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Search,
  Star,
  Tag,
  TrendingUp,
  User,
  Wallet,
  Zap,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import type { LocationRecord } from "../data/locationData";
import SmartLocationSearch from "./SmartLocationSearch";

const NAV_GROUPS = [
  {
    label: "MAIN",
    items: [
      {
        icon: LayoutDashboard,
        label: "Dashboard",
        to: "/buyer",
        ocid: "buyer.sidebar.dashboard.link",
      },
      {
        icon: Search,
        label: "Search Properties",
        to: "/buyer/search",
        ocid: "buyer.sidebar.search.link",
      },
      {
        icon: MapIcon,
        label: "Map Explorer",
        to: "/buyer/map",
        ocid: "buyer.sidebar.map.link",
      },
    ],
  },
  {
    label: "AI VALUATION & DEAL ANALYSIS",
    items: [
      {
        icon: TrendingUp,
        label: "AI Property Valuation",
        to: "/valuation",
        ocid: "buyer.sidebar.valuation.link",
      },
      {
        icon: Tag,
        label: "Deal Finder",
        to: "/buyer/deal-finder",
        ocid: "buyer.sidebar.dealfinder.link",
      },
      {
        icon: Cpu,
        label: "Negotiation Advisor",
        to: "/buyer/negotiation",
        ocid: "buyer.sidebar.negotiation.link",
      },
    ],
  },
  {
    label: "INVESTMENT TOOLS",
    items: [
      {
        icon: BarChart2,
        label: "Investment Insights",
        to: "/valuation",
        ocid: "buyer.sidebar.insights.link",
      },
      {
        icon: TrendingUp,
        label: "Price Forecast",
        to: "/buyer/price-forecast",
        ocid: "buyer.sidebar.priceforecast.link",
      },
      {
        icon: Home,
        label: "Rental Yield",
        to: "/buyer/rental-yield",
        ocid: "buyer.sidebar.rentalyield.link",
      },
      {
        icon: Calculator,
        label: "Financial Calculators",
        to: "/buyer/calculators",
        ocid: "buyer.sidebar.calculators.link",
      },
      {
        icon: Star,
        label: "Investment Scoreboard",
        to: "/buyer/investment-scoreboard",
        ocid: "buyer.sidebar.scoreboard.link",
      },
    ],
  },
  {
    label: "MARKET INTELLIGENCE",
    items: [
      {
        icon: Activity,
        label: "Market Pulse",
        to: "/buyer/market-pulse",
        ocid: "buyer.sidebar.marketpulse.link",
      },
      {
        icon: Building,
        label: "Neighborhood Score",
        to: "/buyer/neighborhood",
        ocid: "buyer.sidebar.neighborhood.link",
      },
      {
        icon: Zap,
        label: "Infrastructure Impact",
        to: "/buyer/infrastructure",
        ocid: "buyer.sidebar.infrastructure.link",
      },
      {
        icon: Wallet,
        label: "Intelligence Terminal",
        to: "/buyer/intelligence",
        ocid: "buyer.sidebar.intelligence.link",
      },
    ],
  },
  {
    label: "PROPERTY DISCOVERY",
    items: [
      {
        icon: Building2,
        label: "Project Intelligence",
        to: "/buyer/projects",
        ocid: "buyer.sidebar.projects.link",
      },
      {
        icon: Eye,
        label: "Off-Market Opportunities",
        to: "/buyer/off-market",
        ocid: "buyer.sidebar.offmarket.link",
      },
      {
        icon: GitCompare,
        label: "Property Comparison",
        to: "/buyer/compare",
        ocid: "buyer.sidebar.compare.link",
      },
    ],
  },
  {
    label: "PERSONAL",
    items: [
      {
        icon: Heart,
        label: "Saved Properties",
        to: "/buyer/search",
        ocid: "buyer.sidebar.saved.link",
      },
      {
        icon: Bookmark,
        label: "Watchlist",
        to: "/buyer/off-market",
        ocid: "buyer.sidebar.watchlist.link",
      },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      {
        icon: User,
        label: "Profile",
        to: "/buyer",
        ocid: "buyer.sidebar.profile.link",
      },
    ],
  },
];

interface BuyerLayoutProps {
  children: ReactNode;
}

export default function BuyerLayout({ children }: BuyerLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [collapsed, setCollapsed] = useState(false);
  const [notifCount] = useState(3);

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  const avatarLetter = (user?.fullName || user?.username || "B")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#0A0F1F] to-[#121B35]">
      {/* TOP NAV */}
      <header
        data-ocid="buyer.topnav.section"
        className="fixed top-0 left-0 right-0 z-50 h-[60px] bg-[#0A0F1F]/95 backdrop-blur-md border-b border-white/10 flex items-center px-4 gap-4"
      >
        <Link to="/" className="flex-shrink-0 flex items-center gap-2">
          <img
            src="/assets/uploads/5EB5878E-7937-4598-9486-6156F9B2EB9F-3-1.png"
            alt="ValuBrix"
            className="h-8 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              const next = (e.target as HTMLImageElement).nextElementSibling;
              if (next) (next as HTMLElement).style.display = "block";
            }}
          />
          <span
            className="hidden text-[#D4AF37] font-bold text-lg"
            style={{ display: "none" }}
          >
            ValuBrix
          </span>
        </Link>

        <button
          type="button"
          data-ocid="buyer.topnav.back.button"
          onClick={() => {
            if (currentPath === "/buyer") {
              navigate({ to: "/" });
            } else {
              navigate({ to: "/buyer" });
            }
          }}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/10"
          style={{ color: "#C9A84C" }}
        >
          <span style={{ fontSize: "14px" }}>←</span>
          <span>Back</span>
        </button>

        <div className="flex-1 max-w-lg mx-auto">
          <SmartLocationSearch
            placeholder="Search properties, localities, builders..."
            onSelect={(loc: LocationRecord) => {
              navigate({
                to: "/buyer/search",
                search: { locality: loc.name } as any,
              });
            }}
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            data-ocid="buyer.topnav.notifications.button"
            className="relative w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
          >
            <Bell size={16} />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D4AF37] text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                {notifCount}
              </span>
            )}
          </button>

          <Link
            to="/buyer/search"
            data-ocid="buyer.topnav.saved.button"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-pink-400 transition-all"
          >
            <Heart size={16} />
          </Link>

          <button
            type="button"
            data-ocid="buyer.topnav.profile.button"
            onClick={() => navigate({ to: "/buyer" })}
            className="w-9 h-9 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] font-bold text-sm hover:bg-[#D4AF37]/30 transition-all"
          >
            {avatarLetter}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden pt-[60px]">
        {/* SIDEBAR */}
        <aside
          data-ocid="buyer.sidebar.section"
          className={`relative flex-shrink-0 bg-[#0A0F1F]/80 backdrop-blur-md border-r border-white/10 flex flex-col transition-all duration-300 ${
            collapsed ? "w-16" : "w-60"
          }`}
        >
          <button
            type="button"
            data-ocid="buyer.sidebar.toggle.button"
            onClick={() => setCollapsed((c) => !c)}
            className="absolute -right-3 top-5 z-10 w-6 h-6 rounded-full bg-[#D4AF37] text-black flex items-center justify-center hover:bg-[#B8960C] shadow-lg transition-all"
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>

          <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="mb-3">
                {!collapsed && (
                  <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest px-3 mb-1.5">
                    {group.label}
                  </p>
                )}
                {group.items.map((item) => {
                  const isActive =
                    currentPath === item.to ||
                    (item.to !== "/buyer" && currentPath.startsWith(item.to));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.ocid}
                      to={item.to as any}
                      data-ocid={item.ocid}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                        isActive
                          ? "border-l-2 border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10"
                          : "text-white/50 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                      } ${collapsed ? "justify-center" : ""}`}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon size={16} className="flex-shrink-0" />
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  );
                })}
                {!collapsed && <div className="border-t border-white/5 mt-2" />}
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 p-2 space-y-1">
            <Link
              to="/"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-all ${
                collapsed ? "justify-center" : ""
              }`}
              title={collapsed ? "Home" : undefined}
            >
              <Home size={16} className="flex-shrink-0" />
              {!collapsed && <span>Home</span>}
            </Link>
            <button
              type="button"
              data-ocid="buyer.sidebar.logout.button"
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all ${
                collapsed ? "justify-center" : ""
              }`}
              title={collapsed ? "Logout" : undefined}
            >
              <LogOut size={16} className="flex-shrink-0" />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
