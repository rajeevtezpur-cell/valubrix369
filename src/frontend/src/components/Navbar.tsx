import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

interface NavTab {
  label: string;
  action: string | (() => void);
  match?: string;
}

function smoothScrollOrNavigate(
  href: string,
  navigate: ReturnType<typeof useNavigate>,
  currentPath: string,
) {
  const id = href.replace("#", "");
  if (currentPath === "/") {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      return;
    }
  }
  navigate({ to: `/${href}` });
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { user, openRoleSelect } = useAuth();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const isActive = (match: string) => {
    if (match === "/") return currentPath === "/";
    return currentPath.startsWith(match);
  };

  const handleNavClick = (action: string | (() => void)) => {
    setMobileOpen(false);
    if (typeof action === "function") {
      action();
      return;
    }
    if (action.startsWith("#")) {
      smoothScrollOrNavigate(action, navigate, currentPath);
      return;
    }
    navigate({ to: action as any });
  };

  const navTabs: NavTab[] = [
    { label: "BUY", action: "/buy", match: "/buy" },
    { label: "RENT", action: "/rent", match: "/rent" },
    { label: "SELL", action: "/seller", match: "/seller" },
    {
      label: "AREA INTELLIGENCE",
      action: "/area-intelligence",
      match: "/area",
    },
    {
      label: "AI VALUATION",
      action: "/valuation",
      match: "/valuation",
    },
    { label: "BANKER", action: "/bank", match: "/bank" },
    { label: "ADMIN", action: "/admin", match: "/admin" },
  ];

  return (
    <>
      {/* Top bar */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
        }}
      >
        {/* Glass pill container */}
        <div className="mx-auto mt-3 px-3" style={{ maxWidth: "1380px" }}>
          <div
            className="glass-pill flex items-center justify-between px-4 py-2"
            style={{ height: "56px" }}
          >
            {/* Logo */}
            <button
              type="button"
              data-ocid="navbar.link"
              className="flex items-center gap-2.5 flex-shrink-0 bg-transparent border-0 p-0 cursor-pointer"
              onClick={() => navigate({ to: "/" })}
              aria-label="ValuBrix Home"
            >
              <img
                src="/assets/valubrix-logo.png"
                alt="ValuBrix"
                className="h-8 w-auto"
                onError={() => setLogoError(true)}
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
                  Valu<span style={{ color: "#E8C97A" }}>Brix</span>
                  <sup
                    style={{
                      fontSize: "0.55em",
                      color: "#D8B56A",
                      marginLeft: "2px",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    AI
                  </sup>
                </span>
              )}
              {!logoError && (
                <span
                  className="font-bold text-sm tracking-tight hidden xl:block"
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
            </button>

            {/* Desktop Nav Tabs */}
            <div className="hidden xl:flex items-center gap-0.5">
              {navTabs.map((tab) => {
                const active = tab.match ? isActive(tab.match) : false;
                return (
                  <button
                    key={tab.label}
                    type="button"
                    data-ocid="navbar.link"
                    onClick={() => handleNavClick(tab.action)}
                    className="relative px-3 py-2 text-xs font-semibold tracking-widest transition-all duration-200 rounded-full whitespace-nowrap"
                    style={{
                      color: active ? "#D8B56A" : "rgba(244,247,255,0.72)",
                      background: active
                        ? "rgba(216,181,106,0.10)"
                        : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "#F4F7FF";
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "rgba(255,255,255,0.06)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "rgba(244,247,255,0.72)";
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "transparent";
                      }
                    }}
                  >
                    {tab.label}
                    {active && (
                      <span
                        className="absolute bottom-0.5 left-3 right-3 h-0.5 rounded-full"
                        style={{
                          background:
                            "linear-gradient(90deg, #D8B56A, #E8C97A)",
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right: Get Started + Hamburger */}
            <div className="flex items-center gap-2">
              {user ? (
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-xs text-white/50 px-2">
                    {user.fullName || user.username}
                  </span>
                  <button
                    type="button"
                    data-ocid="navbar.primary_button"
                    className="px-4 py-2 text-xs font-bold tracking-wide rounded-full transition-all duration-200"
                    style={{
                      background: "linear-gradient(135deg, #D8B56A, #E8C97A)",
                      color: "#071A2F",
                    }}
                    onClick={() =>
                      navigate({
                        to:
                          user.role === "buyer"
                            ? "/buyer"
                            : user.role === "seller"
                              ? "/seller"
                              : user.role === "banker" ||
                                  user.role === "bankOfficer"
                                ? "/bank"
                                : user.role === "admin"
                                  ? "/admin"
                                  : "/dashboard",
                      })
                    }
                  >
                    My Portal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  data-ocid="navbar.primary_button"
                  className="hidden sm:flex px-5 py-2 text-xs font-bold tracking-widest rounded-full border transition-all duration-300 items-center"
                  style={{
                    color: "#D8B56A",
                    borderColor: "rgba(216,181,106,0.6)",
                    background: "rgba(216,181,106,0.06)",
                  }}
                  onClick={() => openRoleSelect()}
                  onMouseEnter={(e) => {
                    const b = e.currentTarget;
                    b.style.background =
                      "linear-gradient(135deg, #D8B56A, #E8C97A)";
                    b.style.color = "#071A2F";
                    b.style.borderColor = "transparent";
                    b.style.boxShadow = "0 0 20px rgba(216,181,106,0.40)";
                  }}
                  onMouseLeave={(e) => {
                    const b = e.currentTarget;
                    b.style.background = "rgba(216,181,106,0.06)";
                    b.style.color = "#D8B56A";
                    b.style.borderColor = "rgba(216,181,106,0.6)";
                    b.style.boxShadow = "none";
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
                data-ocid="navbar.toggle"
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
                  const active = tab.match ? isActive(tab.match) : false;
                  return (
                    <button
                      key={tab.label}
                      type="button"
                      data-ocid="navbar.link"
                      className="text-left text-sm font-semibold tracking-widest py-3 px-3 rounded-xl border border-transparent transition-all"
                      style={{
                        color: active ? "#D8B56A" : "rgba(244,247,255,0.8)",
                        background: active
                          ? "rgba(216,181,106,0.10)"
                          : "transparent",
                        borderColor: active
                          ? "rgba(216,181,106,0.25)"
                          : "transparent",
                      }}
                      onClick={() => handleNavClick(tab.action)}
                    >
                      {tab.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  data-ocid="navbar.primary_button"
                  className="mt-2 w-full py-3 rounded-xl font-bold text-sm tracking-widest transition-colors"
                  style={{
                    background:
                      "linear-gradient(135deg, #D8B56A 0%, #E8C97A 100%)",
                    color: "#071A2F",
                  }}
                  onClick={() => {
                    setMobileOpen(false);
                    openRoleSelect();
                  }}
                >
                  {user ? user.fullName || user.username : "Get Started"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}
