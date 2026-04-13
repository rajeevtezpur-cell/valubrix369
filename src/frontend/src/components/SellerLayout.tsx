import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart2,
  Bell,
  Brain,
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FileText,
  Home,
  Inbox,
  LayoutDashboard,
  LineChart,
  List,
  LogOut,
  Megaphone,
  MessageSquare,
  Plus,
  Settings,
  Sparkles,
  Star,
  Terminal,
  TrendingUp,
  Trophy,
  User,
  Users,
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
        to: "/seller",
        ocid: "seller.sidebar.dashboard.link",
      },
      {
        icon: List,
        label: "My Listings",
        to: "/seller/listings",
        ocid: "seller.sidebar.listings.link",
      },
      {
        icon: Plus,
        label: "Create New Listing",
        to: "/seller/list-property",
        ocid: "seller.sidebar.create.link",
      },
      {
        icon: BarChart2,
        label: "Property Performance",
        to: "/seller/performance",
        ocid: "seller.sidebar.performance.link",
      },
    ],
  },
  {
    label: "BUYER MANAGEMENT",
    items: [
      {
        icon: Users,
        label: "Buyer Leads",
        to: "/seller/leads",
        ocid: "seller.sidebar.leads.link",
      },
      {
        icon: Calendar,
        label: "Visit Scheduling",
        to: "/seller/visits",
        ocid: "seller.sidebar.visits.link",
      },
      {
        icon: DollarSign,
        label: "Offer Management",
        to: "/seller/offers",
        ocid: "seller.sidebar.offers.link",
      },
    ],
  },
  {
    label: "MARKETING",
    items: [
      {
        icon: Star,
        label: "Featured Listings",
        to: "/seller/marketing",
        ocid: "seller.sidebar.featured.link",
      },
      {
        icon: Megaphone,
        label: "Promotion Campaigns",
        to: "/seller/marketing",
        ocid: "seller.sidebar.campaigns.link",
      },
    ],
  },
  {
    label: "ANALYTICS",
    items: [
      {
        icon: LineChart,
        label: "Listing Analytics",
        to: "/seller/analytics",
        ocid: "seller.sidebar.analytics.link",
      },
      {
        icon: TrendingUp,
        label: "Market Insights",
        to: "/seller/market-insights",
        ocid: "seller.sidebar.market.link",
      },
      {
        icon: Sparkles,
        label: "AI Optimization",
        to: "/seller/optimize",
        ocid: "seller.sidebar.optimize.link",
      },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      {
        icon: Brain,
        label: "AI Pricing",
        to: "/seller/ai-pricing",
        ocid: "seller.sidebar.aipricing.link",
      },
      {
        icon: Trophy,
        label: "Competition Intel",
        to: "/seller/competition",
        ocid: "seller.sidebar.competition.link",
      },
      {
        icon: Terminal,
        label: "Intelligence Terminal",
        to: "/seller/intelligence",
        ocid: "seller.sidebar.intelligence.link",
      },
    ],
  },
  {
    label: "TRANSACTIONS",
    items: [
      {
        icon: BarChart2,
        label: "Deals Pipeline",
        to: "/seller/pipeline",
        ocid: "seller.sidebar.pipeline.link",
      },
      {
        icon: FileText,
        label: "Document Vault",
        to: "/seller/documents",
        ocid: "seller.sidebar.documents.link",
      },
    ],
  },
  {
    label: "NOTIFICATIONS",
    items: [
      {
        icon: Inbox,
        label: "Notifications",
        to: "/seller/notifications",
        ocid: "seller.sidebar.notifications.link",
      },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      {
        icon: User,
        label: "Profile",
        to: "/seller",
        ocid: "seller.sidebar.profile.link",
      },
      {
        icon: Settings,
        label: "Settings",
        to: "/seller",
        ocid: "seller.sidebar.settings.link",
      },
    ],
  },
];

interface SellerLayoutProps {
  children: ReactNode;
}

export default function SellerLayout({ children }: SellerLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [collapsed, setCollapsed] = useState(false);
  const [notifCount] = useState(5);

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  const avatarLetter = (user?.fullName || user?.username || "S")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#0A0F1F] to-[#121B35]">
      {/* TOP NAV */}
      <header
        data-ocid="seller.topnav.section"
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
          onClick={() => {
            if (window.history.length > 1) window.history.back();
            else navigate({ to: "/seller" });
          }}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all text-xs flex-shrink-0"
        >
          <ChevronLeft size={14} /> Back
        </button>
        <div className="flex-1 max-w-lg mx-auto">
          <SmartLocationSearch
            placeholder="Search projects, builders, localities..."
            onSelect={(_loc: LocationRecord) => {}}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            data-ocid="seller.topnav.notifications.button"
            onClick={() => navigate({ to: "/seller/notifications" })}
            className="relative w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
          >
            <Bell size={16} />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D4AF37] text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                {notifCount}
              </span>
            )}
          </button>
          <button
            type="button"
            data-ocid="seller.topnav.messages.button"
            className="relative w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
          >
            <MessageSquare size={16} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              2
            </span>
          </button>
          <button
            type="button"
            data-ocid="seller.topnav.alerts.button"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-amber-400 transition-all"
          >
            <AlertTriangle size={16} />
          </button>
          <button
            type="button"
            data-ocid="seller.topnav.profile.button"
            onClick={() => navigate({ to: "/seller" })}
            className="w-9 h-9 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] font-bold text-sm hover:bg-[#D4AF37]/30 transition-all"
          >
            {avatarLetter}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden pt-[60px]">
        {/* SIDEBAR */}
        <aside
          data-ocid="seller.sidebar.section"
          className={`relative flex-shrink-0 bg-[#0A0F1F]/80 backdrop-blur-md border-r border-white/10 flex flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}
        >
          <button
            type="button"
            data-ocid="seller.sidebar.toggle.button"
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
                    (item.to !== "/seller" && currentPath.startsWith(item.to));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.ocid}
                      to={item.to as any}
                      data-ocid={item.ocid}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-all ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? "Home" : undefined}
            >
              <Home size={16} className="flex-shrink-0" />
              {!collapsed && <span>Home</span>}
            </Link>
            <button
              type="button"
              data-ocid="seller.sidebar.logout.button"
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all ${collapsed ? "justify-center" : ""}`}
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
