// GlobalRoleSwitcherDrawer.tsx — Premium side drawer with role switcher
// Mounted globally in App.tsx RootLayout so it appears on EVERY page.
// Triggered by hamburger button in GlobalNav (or any other trigger).
// No page reload on role switch. Glassmorphic premium design.

import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

// ─── Role Config ──────────────────────────────────────────────────────────────
type DrawerRole = "guest" | "buyer" | "seller" | "banker" | "admin";

interface RoleConfig {
  id: DrawerRole;
  label: string;
  emoji: string;
  color: string;
  gradient: string;
  glow: string;
  textColor: string;
}

const ROLES: RoleConfig[] = [
  {
    id: "guest",
    label: "Guest",
    emoji: "👤",
    color: "#6B7280",
    gradient: "linear-gradient(135deg, #374151, #6B7280)",
    glow: "0 0 10px rgba(107,114,128,0.3)",
    textColor: "#e5e7eb",
  },
  {
    id: "buyer",
    label: "Buyer",
    emoji: "🏡",
    color: "#D4AF37",
    gradient: "linear-gradient(135deg, #D4AF37, #F6D77A)",
    glow: "0 0 14px rgba(212,175,55,0.45)",
    textColor: "#1a1a1a",
  },
  {
    id: "seller",
    label: "Seller",
    emoji: "🏢",
    color: "#10B981",
    gradient: "linear-gradient(135deg, #10B981, #34D399)",
    glow: "0 0 14px rgba(16,185,129,0.4)",
    textColor: "#fff",
  },
  {
    id: "banker",
    label: "Banker",
    emoji: "🏦",
    color: "#3B82F6",
    gradient: "linear-gradient(135deg, #3B82F6, #60A5FA)",
    glow: "0 0 14px rgba(59,130,246,0.4)",
    textColor: "#fff",
  },
  {
    id: "admin",
    label: "Admin",
    emoji: "🔴",
    color: "#EF4444",
    gradient: "linear-gradient(135deg, #EF4444, #F87171)",
    glow: "0 0 18px rgba(239,68,68,0.5)",
    textColor: "#fff",
  },
];

// ─── Menu Items per Role ──────────────────────────────────────────────────────
// Each item has an explicit `path` used at runtime for navigation (not the typed `to`).
interface MenuItem {
  emoji: string;
  label: string;
  path: string;
}

const ROLE_MENUS: Record<DrawerRole, MenuItem[]> = {
  guest: [
    { emoji: "🏠", label: "Home", path: "/" },
    { emoji: "🧠", label: "AI Valuation", path: "/valuation" },
    { emoji: "📍", label: "Area Intelligence", path: "/area-intelligence" },
    { emoji: "📈", label: "Market Pulse", path: "/buyer/market-pulse" },
  ],
  buyer: [
    { emoji: "🏠", label: "Dashboard", path: "/buyer" },
    { emoji: "🔍", label: "Search Properties", path: "/buyer/search" },
    { emoji: "🗺️", label: "Map Explorer", path: "/buyer/map" },
    { emoji: "🧠", label: "AI Property Valuation", path: "/valuation" },
    { emoji: "🎯", label: "Deal Finder", path: "/buyer/deal-finder" },
    { emoji: "🤝", label: "Negotiation Advisor", path: "/buyer/negotiation" },
    { emoji: "💡", label: "Investment Insights", path: "/buyer/intelligence" },
    { emoji: "📈", label: "Price Forecast", path: "/buyer/price-forecast" },
    { emoji: "🏦", label: "Rental Yield", path: "/buyer/rental-yield" },
    { emoji: "🧮", label: "Financial Calculators", path: "/buyer/calculators" },
    {
      emoji: "🏆",
      label: "Investment Scoreboard",
      path: "/buyer/investment-scoreboard",
    },
    { emoji: "📊", label: "Market Pulse", path: "/buyer/market-pulse" },
    { emoji: "🏘️", label: "Neighborhood Score", path: "/buyer/neighborhood" },
    {
      emoji: "🏗️",
      label: "Infrastructure Impact",
      path: "/buyer/infrastructure",
    },
  ],
  seller: [
    { emoji: "🏠", label: "Dashboard", path: "/seller" },
    { emoji: "📋", label: "My Listings", path: "/seller/listings" },
    { emoji: "➕", label: "Create Listing", path: "/seller/list-property" },
    { emoji: "📊", label: "Property Performance", path: "/seller/performance" },
    { emoji: "👥", label: "Buyer Leads", path: "/seller/leads" },
    { emoji: "📅", label: "Visit Scheduling", path: "/seller/visits" },
    { emoji: "🤝", label: "Offer Management", path: "/seller/offers" },
    { emoji: "⭐", label: "Featured Listings", path: "/seller/marketing" },
    { emoji: "📣", label: "Promotion Campaigns", path: "/seller/marketing" },
    { emoji: "📈", label: "Listing Analytics", path: "/seller/analytics" },
    { emoji: "🔍", label: "Market Insights", path: "/seller/market-insights" },
    { emoji: "🤖", label: "AI Optimization", path: "/seller/ai-pricing" },
  ],
  banker: [
    { emoji: "🏠", label: "Dashboard", path: "/bank" },
    { emoji: "📋", label: "Loan Requests", path: "/bank" },
    { emoji: "🧠", label: "Property Valuation", path: "/valuation" },
    { emoji: "⚠️", label: "Risk Analysis", path: "/bank" },
    { emoji: "🏦", label: "Collateral Analysis", path: "/bank" },
    { emoji: "📊", label: "Market Reports", path: "/admin/reports" },
    { emoji: "💼", label: "Portfolio Overview", path: "/bank" },
    { emoji: "📉", label: "Exposure Analysis", path: "/bank" },
    { emoji: "🔴", label: "Default Risk", path: "/bank" },
    { emoji: "🧠", label: "AI Valuation", path: "/valuation" },
    { emoji: "📍", label: "Area Intelligence", path: "/area-intelligence" },
    { emoji: "📈", label: "Market Pulse", path: "/buyer/market-pulse" },
  ],
  admin: [
    { emoji: "🏠", label: "Admin Dashboard", path: "/admin/dashboard" },
    { emoji: "🏦", label: "Banker Approvals", path: "/admin/approvals" },
    { emoji: "👥", label: "User Management", path: "/admin/users" },
    { emoji: "💾", label: "Data Management", path: "/admin/data-distribution" },
    { emoji: "📊", label: "Market Reports", path: "/admin/reports" },
    { emoji: "🤖", label: "Model Training", path: "/admin/training" },
    { emoji: "🗺️", label: "Map Data Control", path: "/admin/map-data" },
    { emoji: "⚙️", label: "System Settings", path: "/admin/settings" },
  ],
};

// ─── Context / state for drawer open/close ────────────────────────────────────
// This is managed via a global event system so any component can open it.
let _drawerOpenListeners: Array<() => void> = [];
export function openGlobalRoleSwitcher() {
  for (const fn of _drawerOpenListeners) fn();
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GlobalRoleSwitcherDrawer() {
  const { user, setUserRole, openLoginModal, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Register listener so other components can open this drawer
  useEffect(() => {
    const fn = () => setIsOpen(true);
    _drawerOpenListeners.push(fn);
    return () => {
      _drawerOpenListeners = _drawerOpenListeners.filter((x) => x !== fn);
    };
  }, []);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
      setIsOpen(false);
      setShowRoleDropdown(false);
    }
  };

  // Derive current role
  const currentRoleId: DrawerRole = (() => {
    if (!user) return "guest";
    if (user.role === "admin" || user.role === "tester") return "admin";
    if (user.role === "bankOfficer" || user.role === "banker") return "banker";
    if (user.role === "seller") return "seller";
    if (user.role === "buyer") return "buyer";
    if (user.role === "user") return "buyer"; // default logged-in to buyer
    return "guest";
  })();

  const currentRole = ROLES.find((r) => r.id === currentRoleId) ?? ROLES[0];
  const menuItems = ROLE_MENUS[currentRoleId];

  function handleRoleSwitch(roleId: DrawerRole) {
    setShowRoleDropdown(false);
    if (roleId === "guest") {
      logout();
      setIsOpen(false);
      navigate({ to: "/" });
      return;
    }
    if (!user) {
      openLoginModal(roleId as "buyer" | "seller" | "banker");
      setIsOpen(false);
      return;
    }
    // Admin/tester: navigate to admin dashboard — role is set server-side
    if (roleId === "admin") {
      const isAdminUser = user?.role === "admin" || user?.role === "tester";
      if (!isAdminUser) {
        console.warn("[ValuBrix Nav] Admin access denied — not an admin user");
        setIsOpen(false);
        return;
      }
      console.log("[ValuBrix Nav] Switching to Admin → /admin/dashboard");
      setIsOpen(false);
      setTimeout(() => navigate({ to: "/admin/dashboard" }), 80);
      return;
    }
    if (roleId === "buyer" || roleId === "seller" || roleId === "banker") {
      setUserRole(roleId);
    }
  }

  // Navigate using TanStack Router navigate — reliable for all SPA routes including admin
  function handleMenuClick(path: string, label: string) {
    console.log(`[ValuBrix Nav] Menu click: "${label}" → ${path}`);
    setIsOpen(false);
    setShowRoleDropdown(false);
    // Small delay so drawer close animation starts before navigation
    setTimeout(() => {
      navigate({ to: path as Parameters<typeof navigate>[0]["to"] });
    }, 80);
  }

  function handleFooterNav(path: string) {
    setIsOpen(false);
    setShowRoleDropdown(false);
    setTimeout(() => {
      navigate({ to: path as Parameters<typeof navigate>[0]["to"] });
    }, 80);
  }

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleBackdropClick}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9990,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Drawer panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="drawer-panel"
            ref={drawerRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            data-ocid="role_drawer.panel"
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(340px, 90vw)",
              zIndex: 9999,
              background: "rgba(7,18,40,0.97)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "-8px 0 60px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
            }}
          >
            {/* Gold top accent */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background:
                  "linear-gradient(90deg, transparent, #D4AF37, transparent)",
              }}
            />

            {/* Header — VIEWING AS */}
            <div
              style={{
                padding: "20px 20px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  style={{
                    color: "rgba(255,255,255,0.35)",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
                  Viewing As
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setShowRoleDropdown(false);
                  }}
                  data-ocid="role_drawer.close_button"
                  aria-label="Close drawer"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    padding: "6px 8px",
                    color: "rgba(255,255,255,0.5)",
                    cursor: "pointer",
                    fontSize: 14,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Current role pill (clickable → opens dropdown) */}
              <button
                type="button"
                onClick={() => setShowRoleDropdown((v) => !v)}
                data-ocid="role_drawer.current_role_pill"
                aria-expanded={showRoleDropdown}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: currentRole.gradient,
                  border: `1px solid ${currentRole.color}55`,
                  boxShadow: currentRole.glow,
                  cursor: "pointer",
                  width: "100%",
                  transition: "box-shadow 0.2s",
                }}
              >
                <span style={{ fontSize: 18 }}>{currentRole.emoji}</span>
                <span
                  style={{
                    flex: 1,
                    fontWeight: 700,
                    fontSize: 14,
                    color: currentRole.textColor,
                    textAlign: "left",
                  }}
                >
                  {currentRole.label}
                </span>
                <motion.span
                  animate={{ rotate: showRoleDropdown ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    fontSize: 10,
                    color: `${currentRole.textColor}99`,
                    display: "inline-block",
                  }}
                >
                  ▼
                </motion.span>
              </button>

              {/* Role dropdown */}
              <AnimatePresence>
                {showRoleDropdown && (
                  <motion.div
                    key="role-dropdown"
                    initial={{ opacity: 0, y: -6, scaleY: 0.9 }}
                    animate={{ opacity: 1, y: 0, scaleY: 1 }}
                    exit={{ opacity: 0, y: -6, scaleY: 0.9 }}
                    transition={{ duration: 0.18 }}
                    style={{
                      marginTop: 8,
                      borderRadius: 12,
                      background: "rgba(10,22,50,0.98)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      overflow: "hidden",
                      transformOrigin: "top",
                    }}
                    data-ocid="role_drawer.role_dropdown"
                  >
                    {ROLES.map((role) => {
                      const isActive = role.id === currentRoleId;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => handleRoleSwitch(role.id)}
                          data-ocid={`role_drawer.role_option.${role.id}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "11px 14px",
                            width: "100%",
                            background: isActive
                              ? `${role.color}14`
                              : "transparent",
                            border: "none",
                            borderLeft: isActive
                              ? `2px solid ${role.color}`
                              : "2px solid transparent",
                            cursor: "pointer",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive)
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.background = "rgba(255,255,255,0.04)";
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive)
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.background = "transparent";
                          }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: role.gradient,
                              flexShrink: 0,
                              boxShadow: isActive ? role.glow : "none",
                            }}
                          />
                          <span style={{ fontSize: 15 }}>{role.emoji}</span>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: isActive ? 700 : 400,
                              color: isActive
                                ? "white"
                                : "rgba(255,255,255,0.6)",
                            }}
                          >
                            {role.label}
                          </span>
                          {isActive && (
                            <span
                              style={{
                                marginLeft: "auto",
                                fontSize: 11,
                                color: role.color,
                                fontWeight: 700,
                              }}
                            >
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Menu items */}
            <div style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
              {menuItems.map((item, i) => (
                <motion.button
                  key={item.path + item.label}
                  type="button"
                  onClick={() => handleMenuClick(item.path, item.label)}
                  data-ocid={`role_drawer.menu_item.${i + 1}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 + i * 0.03, duration: 0.2 }}
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "11px 20px",
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.15s",
                  }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      width: 24,
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    {item.emoji}
                  </span>
                  <span
                    style={{
                      fontSize: 13.5,
                      color: "rgba(255,255,255,0.75)",
                      fontWeight: 500,
                    }}
                  >
                    {item.label}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Footer — Login/Logout + Home */}
            <div
              style={{
                padding: "12px 16px 24px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {user ? (
                <>
                  <button
                    type="button"
                    data-ocid="role_drawer.home_button"
                    onClick={() => handleFooterNav("/")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "10px 16px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    🏠 Home
                  </button>
                  <button
                    type="button"
                    data-ocid="role_drawer.logout_button"
                    onClick={() => {
                      logout();
                      setIsOpen(false);
                      navigate({ to: "/" });
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "10px 16px",
                      borderRadius: 10,
                      background: "rgba(239,68,68,0.06)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      color: "#f87171",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    🚪 Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    data-ocid="role_drawer.login_button"
                    onClick={() => {
                      openLoginModal();
                      setIsOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "11px 16px",
                      borderRadius: 10,
                      background: "linear-gradient(135deg, #C9A84C, #D4AF37)",
                      border: "none",
                      color: "#071A2F",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Login / Sign Up
                  </button>
                </>
              )}
              {/* Version badge */}
              <p
                style={{
                  textAlign: "center",
                  color: "rgba(255,255,255,0.15)",
                  fontSize: 10,
                  marginTop: 4,
                }}
              >
                ValuBrix v1.2.0
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
