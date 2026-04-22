import { Link, useNavigate } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { openGlobalRoleSwitcher } from "./GlobalRoleSwitcherDrawer";

// Role display config
const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: "Admin", color: "#EF4444" },
  tester: { label: "Admin", color: "#EF4444" },
  buyer: { label: "Buyer", color: "#D4AF37" },
  seller: { label: "Seller", color: "#10B981" },
  banker: { label: "Banker", color: "#3B82F6" },
  bankOfficer: { label: "Banker", color: "#3B82F6" },
  user: { label: "Buyer", color: "#D4AF37" },
  guest: { label: "Guest", color: "#6B7280" },
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function GlobalNav() {
  const { user, openLoginModal, logout } = useAuth();
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    if (!isUserMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isUserMenuOpen]);

  const roleInfo = user
    ? (ROLE_LABELS[user.role] ?? { label: "User", color: "#D4AF37" })
    : null;

  // Get initials for avatar
  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.username
      ? user.username.slice(0, 2).toUpperCase()
      : "U";

  function navigateTo(path: string) {
    setIsUserMenuOpen(false);
    navigate({ to: path as Parameters<typeof navigate>[0]["to"] });
  }

  return (
    <>
      {/* ── Top Navbar ──────────────────────────────────────────────────────── */}
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

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Not logged in: show Get Started button */}
              {!user && (
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

              {/* Logged in: user avatar pill with dropdown */}
              {user && roleInfo && (
                <div
                  ref={userMenuRef}
                  className="relative"
                  data-ocid="nav.user_menu"
                >
                  <button
                    type="button"
                    data-ocid="nav.user_menu.toggle"
                    aria-haspopup="true"
                    aria-expanded={isUserMenuOpen}
                    onClick={() => setIsUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-full px-3 py-1.5 transition-all duration-200"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: `1px solid ${roleInfo.color}44`,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,255,255,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,255,255,0.06)";
                    }}
                  >
                    {/* Avatar circle */}
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${roleInfo.color}, ${roleInfo.color}99)`,
                        color:
                          user.role === "buyer" || user.role === "user"
                            ? "#1a1a1a"
                            : "#fff",
                      }}
                    >
                      {initials}
                    </span>
                    {/* Name (hidden on small screens) */}
                    <span
                      className="hidden sm:block text-xs font-semibold max-w-[80px] truncate"
                      style={{ color: "#e5e7eb" }}
                    >
                      {user.fullName?.split(" ")[0] || user.username || "User"}
                    </span>
                    {/* Role badge */}
                    <span
                      className="hidden sm:block text-[10px] font-bold rounded-full px-1.5 py-0.5"
                      style={{
                        background: `${roleInfo.color}22`,
                        color: roleInfo.color,
                        border: `1px solid ${roleInfo.color}44`,
                      }}
                    >
                      {roleInfo.label}
                    </span>
                    {/* Chevron */}
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="none"
                      aria-hidden="true"
                      style={{
                        transform: isUserMenuOpen
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        transition: "transform 0.2s",
                        color: "rgba(255,255,255,0.4)",
                        flexShrink: 0,
                      }}
                    >
                      <path
                        d="M2 3.5L5 6.5L8 3.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {/* Dropdown menu */}
                  {isUserMenuOpen && (
                    <div
                      data-ocid="nav.user_menu.dropdown"
                      className="absolute right-0 mt-2 rounded-2xl overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      style={{
                        minWidth: 220,
                        background: "rgba(7,18,40,0.98)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                        zIndex: 9999,
                      }}
                    >
                      {/* User info header */}
                      <div
                        className="px-4 py-3"
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <p
                          className="text-sm font-bold text-white truncate"
                          style={{ maxWidth: 180 }}
                        >
                          {user.fullName || user.username || "User"}
                        </p>
                        <p
                          className="text-xs mt-0.5 truncate"
                          style={{
                            color: "rgba(255,255,255,0.4)",
                            maxWidth: 180,
                          }}
                        >
                          {user.email || user.mobile || ""}
                        </p>
                        <span
                          className="inline-block mt-1.5 text-[10px] font-bold rounded-full px-2 py-0.5"
                          style={{
                            background: `${roleInfo.color}22`,
                            color: roleInfo.color,
                            border: `1px solid ${roleInfo.color}44`,
                          }}
                        >
                          {roleInfo.label}
                        </span>
                      </div>

                      {/* Menu items */}
                      <div className="py-1">
                        {/* Admin gets a quick link to the dashboard */}
                        {(user.role === "admin" || user.role === "tester") && (
                          <button
                            type="button"
                            data-ocid="nav.user_menu.admin_dashboard"
                            onClick={() => navigateTo("/admin/dashboard")}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              color: "#f87171",
                              textAlign: "left",
                            }}
                            onMouseEnter={(e) => {
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.background = "rgba(239,68,68,0.08)";
                            }}
                            onMouseLeave={(e) => {
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.background = "transparent";
                            }}
                          >
                            <span>🛡️</span>
                            Admin Dashboard
                          </button>
                        )}

                        <button
                          type="button"
                          data-ocid="nav.user_menu.switch_role"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            openGlobalRoleSwitcher();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "rgba(255,255,255,0.7)",
                            textAlign: "left",
                          }}
                          onMouseEnter={(e) => {
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.background = "rgba(255,255,255,0.04)";
                          }}
                          onMouseLeave={(e) => {
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.background = "transparent";
                          }}
                        >
                          <span>🔄</span>
                          Switch Role / Menu
                        </button>

                        <button
                          type="button"
                          data-ocid="nav.user_menu.home"
                          onClick={() => navigateTo("/")}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "rgba(255,255,255,0.7)",
                            textAlign: "left",
                          }}
                          onMouseEnter={(e) => {
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.background = "rgba(255,255,255,0.04)";
                          }}
                          onMouseLeave={(e) => {
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.background = "transparent";
                          }}
                        >
                          <span>🏠</span>
                          Home
                        </button>

                        <div
                          style={{
                            height: 1,
                            background: "rgba(255,255,255,0.06)",
                            margin: "4px 0",
                          }}
                        />

                        <button
                          type="button"
                          data-ocid="nav.user_menu.logout"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            logout();
                            window.location.href = "/";
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "#f87171",
                            textAlign: "left",
                          }}
                          onMouseEnter={(e) => {
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.background = "rgba(239,68,68,0.08)";
                          }}
                          onMouseLeave={(e) => {
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.background = "transparent";
                          }}
                        >
                          <span>🚪</span>
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Hamburger — opens global role switcher drawer (right side) */}
              <button
                type="button"
                className="text-white/80 p-2 rounded-full transition-colors hover:bg-white/10"
                onClick={() => openGlobalRoleSwitcher()}
                aria-label="Open role menu"
                data-ocid="nav.toggle"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
