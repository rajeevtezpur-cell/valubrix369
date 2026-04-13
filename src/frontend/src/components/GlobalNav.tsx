import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown, LogOut, Menu, User, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function GlobalNav() {
  const { user, logout, openLoginModal, setUserRole } = useAuth();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const isActive = (match: string) => {
    if (match === "/") return currentPath === "/";
    return currentPath.startsWith(match);
  };

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate({ to: "/" });
  };

  const handleSwitchRole = (role: "buyer" | "seller" | "banker") => {
    setUserRole(role);
    setDropdownOpen(false);
    if (role === "buyer") navigate({ to: "/buyer" });
    else if (role === "seller") navigate({ to: "/seller" });
    else if (role === "banker") navigate({ to: "/bank" });
  };

  const dashboardLink =
    user?.role === "buyer"
      ? "/buyer"
      : user?.role === "seller"
        ? "/seller"
        : user?.role === "bankOfficer" || user?.role === "banker"
          ? "/bank"
          : user?.role === "admin"
            ? "/admin"
            : "/dashboard";

  const navTabs = [
    { label: "BUY", to: "/buy", match: "/buy" },
    { label: "RENT", to: "/rent", match: "/rent" },
    { label: "SELL", to: "/seller", match: "/seller" },
    { label: "AREA INTEL", to: "/area-intelligence", match: "/area" },
    { label: "AI VALUATION", to: "/valuation", match: "/valuation" },
    { label: "BANKER", to: "/bank", match: "/bank" },
    { label: "ADMIN", to: "/admin", match: "/admin" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
      }}
    >
      <div className="mx-auto mt-3 px-3" style={{ maxWidth: "1380px" }}>
        <div
          className="glass-pill flex items-center justify-between px-4 py-2"
          style={{ height: "56px" }}
        >
          {/* Logo */}
          <Link
            to="/"
            data-ocid="nav.home.link"
            className="flex items-center gap-2 flex-shrink-0"
          >
            <img
              src="/assets/valubrix-logo.png"
              alt="ValuBrix"
              className="h-8 w-auto"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (!img.src.includes("uploads")) {
                  img.src =
                    "/assets/uploads/5EB5878E-7937-4598-9486-6156F9B2EB9F-3-1.png";
                } else {
                  setLogoError(true);
                }
              }}
              style={{ display: logoError ? "none" : undefined }}
            />
            {logoError && (
              <span
                className="font-bold text-lg tracking-tight"
                style={{
                  color: "#D8B56A",
                  fontFamily: "'Playfair Display', serif",
                }}
              >
                ValuBrix
                <sup
                  style={{
                    fontSize: "0.5em",
                    color: "#E8C97A",
                    marginLeft: "2px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  AI
                </sup>
              </span>
            )}
          </Link>

          {/* Desktop Nav */}
          <div className="hidden xl:flex items-center gap-0.5">
            {navTabs.map((tab) => {
              const active = isActive(tab.match);
              return (
                <Link
                  key={tab.label}
                  to={tab.to as any}
                  data-ocid="nav.link"
                  className="relative px-3 py-2 text-xs font-semibold tracking-widest transition-all duration-200 rounded-full whitespace-nowrap"
                  style={{
                    color: active ? "#D8B56A" : "rgba(244,247,255,0.72)",
                    background: active
                      ? "rgba(216,181,106,0.10)"
                      : "transparent",
                    textDecoration: "none",
                  }}
                >
                  {tab.label}
                  {active && (
                    <span
                      className="absolute bottom-0.5 left-3 right-3 h-0.5 rounded-full"
                      style={{
                        background: "linear-gradient(90deg, #D8B56A, #E8C97A)",
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  data-ocid="nav.profile.button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-all"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#F4F7FF",
                  }}
                >
                  <User size={14} style={{ color: "#D8B56A" }} />
                  <span className="hidden md:block text-xs">
                    {user.fullName || user.username}
                  </span>
                  <ChevronDown size={12} />
                </button>
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-11 w-56 rounded-xl shadow-xl overflow-hidden z-50"
                      style={{
                        background: "rgba(7,26,47,0.97)",
                        backdropFilter: "blur(16px)",
                        border: "1px solid rgba(255,255,255,0.14)",
                      }}
                    >
                      <Link
                        to={dashboardLink as "/"}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm transition-colors"
                        style={{ color: "rgba(244,247,255,0.8)" }}
                      >
                        My Dashboard
                      </Link>
                      {user.role === "seller" && (
                        <Link
                          to="/seller"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm transition-colors"
                          style={{ color: "rgba(244,247,255,0.8)" }}
                        >
                          My Listings
                        </Link>
                      )}
                      <div
                        className="border-t px-4 py-2"
                        style={{ borderColor: "rgba(255,255,255,0.08)" }}
                      >
                        <p
                          className="text-xs uppercase tracking-widest mb-2"
                          style={{ color: "rgba(185,198,216,0.4)" }}
                        >
                          Switch Role
                        </p>
                        {(["buyer", "seller", "banker"] as const).map(
                          (role) => (
                            <button
                              key={role}
                              type="button"
                              data-ocid={`nav.switch_role.${role}.button`}
                              onClick={() => handleSwitchRole(role)}
                              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors capitalize"
                              style={{ color: "rgba(244,247,255,0.6)" }}
                            >
                              {role === "banker"
                                ? "Banker"
                                : role.charAt(0).toUpperCase() + role.slice(1)}
                              {user.role === role ||
                              (user.role === "bankOfficer" &&
                                role === "banker") ? (
                                <span
                                  className="ml-auto text-xs"
                                  style={{ color: "#D8B56A" }}
                                >
                                  ✓ Active
                                </span>
                              ) : null}
                            </button>
                          ),
                        )}
                      </div>
                      <button
                        type="button"
                        data-ocid="nav.logout.button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors"
                        style={{
                          color: "#f87171",
                          borderTop: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <LogOut size={14} /> Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                type="button"
                data-ocid="nav.login.button"
                onClick={() => openLoginModal()}
                className="hidden sm:flex px-5 py-2 text-xs font-bold tracking-widest rounded-full border transition-all duration-300 items-center"
                style={{
                  color: "#D8B56A",
                  borderColor: "rgba(216,181,106,0.6)",
                  background: "rgba(216,181,106,0.06)",
                }}
                onMouseEnter={(e) => {
                  const b = e.currentTarget;
                  b.style.background =
                    "linear-gradient(135deg, #D8B56A, #E8C97A)";
                  b.style.color = "#071A2F";
                  b.style.borderColor = "transparent";
                }}
                onMouseLeave={(e) => {
                  const b = e.currentTarget;
                  b.style.background = "rgba(216,181,106,0.06)";
                  b.style.color = "#D8B56A";
                  b.style.borderColor = "rgba(216,181,106,0.6)";
                }}
              >
                Get Started
              </button>
            )}

            <button
              type="button"
              className="xl:hidden text-white/80 p-2 rounded-full transition-colors hover:bg-white/10"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
              data-ocid="nav.toggle"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="xl:hidden mx-3 mt-2 rounded-2xl overflow-hidden"
            style={{
              background: "rgba(7,26,47,0.97)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div className="px-4 py-4 flex flex-col gap-1">
              {navTabs.map((tab) => {
                const active = isActive(tab.match);
                return (
                  <Link
                    key={tab.label}
                    to={tab.to as any}
                    data-ocid="nav.link"
                    className="text-left text-sm font-semibold tracking-widest py-3 px-3 rounded-xl border border-transparent transition-all"
                    style={{
                      color: active ? "#D8B56A" : "rgba(244,247,255,0.8)",
                      background: active
                        ? "rgba(216,181,106,0.10)"
                        : "transparent",
                      borderColor: active
                        ? "rgba(216,181,106,0.25)"
                        : "transparent",
                      textDecoration: "none",
                    }}
                    onClick={() => setMobileOpen(false)}
                  >
                    {tab.label}
                  </Link>
                );
              })}
              {!user ? (
                <button
                  type="button"
                  data-ocid="nav.primary_button"
                  className="mt-2 w-full py-3 rounded-xl font-bold text-sm tracking-widest transition-colors"
                  style={{
                    background:
                      "linear-gradient(135deg, #D8B56A 0%, #E8C97A 100%)",
                    color: "#071A2F",
                  }}
                  onClick={() => {
                    setMobileOpen(false);
                    openLoginModal();
                  }}
                >
                  Get Started
                </button>
              ) : (
                <button
                  type="button"
                  data-ocid="nav.logout.button"
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  className="mt-2 w-full py-3 rounded-xl font-semibold text-sm transition-colors"
                  style={{
                    background: "rgba(248,113,113,0.12)",
                    color: "#f87171",
                    border: "1px solid rgba(248,113,113,0.25)",
                  }}
                >
                  Logout
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
