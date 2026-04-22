// AdminDashboardPage.tsx — Glassmorphic admin dashboard for ValuBrix
// Accessible when user.role === 'admin' or 'tester' (bypasses separate admin login)

import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import GlobalNav from "../components/GlobalNav";
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";

interface StatCard {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  route?: string;
}

interface QuickAction {
  emoji: string;
  label: string;
  desc: string;
  route: string;
  accent: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    emoji: "🏦",
    label: "Banker Approvals",
    desc: "Approve or reject pending banker applications",
    route: "/admin/approvals",
    accent: "#FBBF24",
  },
  {
    emoji: "👥",
    label: "User Management",
    desc: "View, suspend, or manage platform users",
    route: "/admin/users",
    accent: "#60A5FA",
  },
  {
    emoji: "🤖",
    label: "Model Training",
    desc: "Retrain AI valuation models with new data",
    route: "/admin/training",
    accent: "#A78BFA",
  },
  {
    emoji: "📊",
    label: "Market Reports",
    desc: "Monitor valuation and bank report activity",
    route: "/admin/reports",
    accent: "#34D399",
  },
  {
    emoji: "💾",
    label: "Data Distribution",
    desc: "Real records and avg PSF by locality",
    route: "/admin/data-distribution",
    accent: "#FB923C",
  },
  {
    emoji: "⚙️",
    label: "System Settings",
    desc: "Configure platform settings and flags",
    route: "/admin/settings",
    accent: "#94A3B8",
  },
  {
    emoji: "🗺️",
    label: "Map Data Control",
    desc: "Manage POI data and map layers",
    route: "/admin/map-data",
    accent: "#F472B6",
  },
  {
    emoji: "📋",
    label: "Listing Moderation",
    desc: "Review and moderate property listings",
    route: "/admin/listings",
    accent: "#FBBF24",
  },
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { actor, isFetching: actorLoading } = useActor();

  const [pendingBankers, setPendingBankers] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [statsLoading, setStatsLoading] = useState(true);

  // Access guard: redirect non-admins to /admin login gate
  useEffect(() => {
    if (!user) {
      // Not logged in — check localStorage admin session
      try {
        const s = localStorage.getItem("valubrix_admin");
        if (!s) navigate({ to: "/admin" });
      } catch {
        navigate({ to: "/admin" });
      }
      return;
    }
    if (user.role !== "admin" && user.role !== "tester") {
      navigate({ to: "/" });
    }
  }, [user, navigate]);

  // Fetch live stats from backend
  const fetchStats = useCallback(async () => {
    if (!actor) return;
    setStatsLoading(true);
    try {
      const apps = await actor.getAllBankerApps();
      const pending = apps.filter(
        (a) => (a.status as string) === "pending",
      ).length;
      setPendingBankers(pending);
      setTotalUsers(apps.length);
    } catch (e) {
      console.error("[AdminDashboard] stats error:", e);
    } finally {
      setStatsLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    if (!actorLoading && actor) fetchStats();
  }, [actor, actorLoading, fetchStats]);

  // Also pull offline stats from localStorage (AdminContext)
  const localBankers = (() => {
    try {
      return JSON.parse(localStorage.getItem("valubrix_bank_officers") || "[]");
    } catch {
      return [];
    }
  })();
  const localPending = localBankers.filter(
    (b: { status: string }) => b.status === "pending",
  ).length;

  const displayPending = statsLoading
    ? localPending
    : pendingBankers || localPending;

  const STAT_CARDS: StatCard[] = [
    {
      label: "Total Users",
      value: statsLoading ? "—" : totalUsers || "—",
      icon: "👥",
      color: "#60A5FA",
      route: "/admin/users",
    },
    {
      label: "Pending Banker Approvals",
      value: displayPending,
      icon: "⏳",
      color: "#FBBF24",
      route: "/admin/approvals",
    },
    {
      label: "Total Listings",
      value: (() => {
        try {
          return JSON.parse(
            localStorage.getItem("valubrix_admin_listings") || "[]",
          ).length;
        } catch {
          return "—";
        }
      })(),
      icon: "🏠",
      color: "#34D399",
      route: "/admin/listings",
    },
    {
      label: "Active Valuations",
      value: (() => {
        try {
          return JSON.parse(
            localStorage.getItem("valubrix_bank_report_count") || "0",
          );
        } catch {
          return "—";
        }
      })(),
      icon: "🧠",
      color: "#A78BFA",
      route: "/admin/reports",
    },
  ];

  if (user && user.role !== "admin" && user.role !== "tester") {
    return null; // redirect in progress
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(135deg, #0A0F1F, #121B35)" }}
    >
      <GlobalNav />

      <div className="pt-24 pb-16 px-4 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
          data-ocid="admin.dashboard.section"
        >
          <div className="flex items-center gap-3 mb-1">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                background: "rgba(239,68,68,0.1)",
                color: "#F87171",
                border: "1px solid rgba(239,68,68,0.25)",
                letterSpacing: "0.1em",
              }}
            >
              🔴 ADMIN
            </span>
          </div>
          <h1
            className="text-3xl font-bold text-white"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Admin Dashboard
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: 14,
              marginTop: 4,
            }}
          >
            Logged in as{" "}
            <span style={{ color: "#D4AF37" }}>
              {user?.fullName || user?.username || "Admin"}
            </span>
          </p>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STAT_CARDS.map((card, i) => (
            <motion.button
              key={card.label}
              type="button"
              onClick={() => card.route && navigate({ to: card.route as "/" })}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              data-ocid={`admin.dashboard.stat.${i + 1}`}
              className="text-left p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                cursor: card.route ? "pointer" : "default",
              }}
            >
              <div className="text-2xl mb-3">{card.icon}</div>
              <div
                className="text-2xl font-bold mb-1"
                style={{ color: card.color }}
              >
                {card.value}
              </div>
              <div
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                {card.label}
                {card.label === "Pending Banker Approvals" &&
                  displayPending > 0 && (
                    <span
                      className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        background: "rgba(251,191,36,0.2)",
                        color: "#FBBF24",
                      }}
                    >
                      Action needed
                    </span>
                  )}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-4">
          <h2
            className="text-lg font-semibold text-white mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Admin Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {QUICK_ACTIONS.map((action, i) => (
              <motion.button
                key={action.route}
                type="button"
                onClick={() => navigate({ to: action.route as "/" })}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05, duration: 0.25 }}
                whileHover={{
                  scale: 1.02,
                  backgroundColor: "rgba(255,255,255,0.07)",
                }}
                whileTap={{ scale: 0.97 }}
                data-ocid={`admin.dashboard.action.${i + 1}`}
                className="text-left p-5 rounded-2xl transition-colors"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-xl"
                  style={{ background: `${action.accent}18` }}
                >
                  {action.emoji}
                </div>
                <div className="font-semibold text-sm text-white mb-1">
                  {action.label}
                </div>
                <div
                  className="text-xs leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  {action.desc}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
