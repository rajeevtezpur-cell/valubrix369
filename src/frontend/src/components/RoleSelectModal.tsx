import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "../context/AuthContext";

const roles = [
  {
    id: "buyer" as const,
    emoji: "🏡",
    title: "Buyer",
    desc: "Discover properties & get AI valuations",
    color: "#3B82F6",
    note: null,
  },
  {
    id: "seller" as const,
    emoji: "🏢",
    title: "Seller",
    desc: "List properties & reach serious buyers",
    color: "#C9A84C",
    note: null,
  },
  {
    id: "banker" as const,
    emoji: "🏦",
    title: "Banker",
    desc: "Access institutional valuation reports",
    color: "#16C784",
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

  const handleSelect = (roleId: "buyer" | "seller" | "banker") => {
    if (!user) {
      // Pre-login: set role then open login modal
      setSelectedRole(roleId);
      closeRoleSelect();
      openLoginModal(roleId);
    } else {
      // Post-login: set role and navigate
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
          background: "rgba(10,15,30,0.9)",
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
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background:
                "linear-gradient(90deg, transparent, #C9A84C, #D4AF37, transparent)",
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
                    background: `rgba(${hexToRgb(role.color)},0.08)` as any,
                    borderColor: `rgba(${hexToRgb(role.color)},0.4)`,
                    y: -2,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: `rgba(${hexToRgb(role.color)},0.12)`,
                      border: `1px solid rgba(${hexToRgb(role.color)},0.25)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    {role.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 2,
                      }}
                    >
                      <span
                        style={{
                          color: "white",
                          fontWeight: 700,
                          fontSize: 15,
                        }}
                      >
                        {role.title}
                      </span>
                      {role.note && (
                        <span
                          style={{
                            fontSize: 10,
                            color: role.color,
                            background: `rgba(${hexToRgb(role.color)},0.12)`,
                            border: `1px solid rgba(${hexToRgb(role.color)},0.25)`,
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
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M6 12l4-4-4-4"
                      stroke={role.color}
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

function hexToRgb(hex: string): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
