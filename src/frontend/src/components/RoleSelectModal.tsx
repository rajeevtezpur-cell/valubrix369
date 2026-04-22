import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const roles = [
  {
    id: "buyer" as const,
    emoji: "🏡",
    title: "Buyer",
    desc: "Discover properties & get AI valuations",
    gradient: "linear-gradient(135deg, #D4AF37, #F6D77A)",
    glow: "0 0 18px rgba(212,175,55,0.45)",
    pillBorder: "rgba(212,175,55,0.55)",
    hoverBg: "rgba(212,175,55,0.08)",
    hoverBorder: "rgba(212,175,55,0.4)",
    textColor: "#1a1a1a",
    note: null,
  },
  {
    id: "seller" as const,
    emoji: "🏢",
    title: "Seller",
    desc: "List properties & reach serious buyers",
    gradient: "linear-gradient(135deg, #10B981, #34D399)",
    glow: "0 0 18px rgba(16,185,129,0.4)",
    pillBorder: "rgba(16,185,129,0.55)",
    hoverBg: "rgba(16,185,129,0.08)",
    hoverBorder: "rgba(16,185,129,0.4)",
    textColor: "#1a1a1a",
    note: null,
  },
  {
    id: "banker" as const,
    emoji: "🏦",
    title: "Banker",
    desc: "Access institutional valuation reports",
    gradient: "linear-gradient(135deg, #3B82F6, #60A5FA)",
    glow: "0 0 18px rgba(59,130,246,0.4)",
    pillBorder: "rgba(59,130,246,0.55)",
    hoverBg: "rgba(59,130,246,0.08)",
    hoverBorder: "rgba(59,130,246,0.4)",
    textColor: "#ffffff",
    note: "Requires admin approval",
  },
];

export default function RoleSelectModal() {
  const {
    showRoleSelect,
    closeRoleSelect,
    setUserRole,
    intendedPortal,
    user,
    openLoginModal,
    setSelectedRole,
  } = useAuth();
  const navigate = useNavigate();

  // Admin users must NEVER see the role selection modal.
  // If showRoleSelect triggers while user is admin/tester, close it and go to admin dashboard.
  useEffect(() => {
    if (
      showRoleSelect &&
      user &&
      (user.role === "admin" || user.role === "tester")
    ) {
      closeRoleSelect();
      navigate({ to: "/admin/dashboard" });
    }
  }, [showRoleSelect, user, closeRoleSelect, navigate]);

  const handleSelect = (roleId: "buyer" | "seller" | "banker") => {
    if (!user) {
      setSelectedRole(roleId);
      closeRoleSelect();
      openLoginModal(roleId);
    } else {
      setUserRole(roleId);
      closeRoleSelect();
      const dest = intendedPortal ?? roleId;
      if (dest === "buyer") navigate({ to: "/buyer" });
      else if (dest === "seller") navigate({ to: "/seller" });
      else if (dest === "banker") navigate({ to: "/bank" });
      else navigate({ to: "/" });
    }
  };

  if (!showRoleSelect) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="role-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-ocid="role_select.modal"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1001,
          background: "rgba(10,15,30,0.92)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 32 }}
          transition={{ type: "spring", stiffness: 280, damping: 26 }}
          style={{
            background: "linear-gradient(145deg, #121B35 0%, #0A0F1E 100%)",
            border: "1px solid rgba(201,168,76,0.2)",
            borderRadius: 24,
            width: "100%",
            maxWidth: 500,
            boxShadow:
              "0 40px 120px rgba(0,0,0,0.8), 0 0 60px rgba(201,168,76,0.06)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Top accent bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background:
                "linear-gradient(90deg, transparent, #D4AF37, #F6D77A, transparent)",
            }}
          />

          <div style={{ padding: "40px 36px 36px" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h2
                style={{
                  color: "white",
                  fontSize: 26,
                  fontWeight: 700,
                  fontFamily: "'Playfair Display', serif",
                  marginBottom: 8,
                }}
              >
                Select your role
              </h2>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>
                Choose how you'll use ValuBrix
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {roles.map((role, i) => (
                <motion.button
                  key={role.id}
                  type="button"
                  data-ocid={`role_select.${role.id}.button`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => handleSelect(role.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "18px 20px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 16,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s",
                    width: "100%",
                  }}
                  whileHover={{
                    background: role.hoverBg as any,
                    borderColor: role.hoverBorder,
                    y: -2,
                    boxShadow: role.glow,
                  }}
                >
                  {/* Glass pill icon */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: role.gradient,
                      boxShadow: role.glow,
                      border: `1px solid ${role.pillBorder}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    {role.emoji}
                  </div>

                  {/* Text content */}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      {/* Role name pill */}
                      <span
                        style={{
                          background: role.gradient,
                          color: role.textColor,
                          fontSize: 12,
                          fontWeight: 700,
                          padding: "3px 12px",
                          borderRadius: 9999,
                          border: `1px solid ${role.pillBorder}`,
                          boxShadow: `0 0 8px ${role.hoverBorder}`,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {role.title}
                      </span>
                      {role.note && (
                        <span
                          style={{
                            fontSize: 10,
                            color: "rgba(255,255,255,0.5)",
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 20,
                            padding: "2px 8px",
                            fontWeight: 600,
                          }}
                        >
                          {role.note}
                        </span>
                      )}
                    </div>
                    <p
                      style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}
                    >
                      {role.desc}
                    </p>
                  </div>

                  {/* Arrow */}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M6 12l4-4-4-4"
                      stroke="rgba(255,255,255,0.35)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
