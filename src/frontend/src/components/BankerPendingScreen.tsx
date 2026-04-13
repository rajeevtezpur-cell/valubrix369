import { Clock, LogOut, Shield } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";

export default function BankerPendingScreen() {
  const { user, logout } = useAuth();

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(135deg, #0A0F1E 0%, #0D1628 50%, #0A0F1E 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        data-ocid="banker_pending.panel"
        style={{
          background: "rgba(18,27,53,0.8)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(201,168,76,0.2)",
          borderRadius: 24,
          padding: "48px 40px",
          maxWidth: 480,
          width: "100%",
          textAlign: "center",
          boxShadow:
            "0 40px 100px rgba(0,0,0,0.6), 0 0 40px rgba(201,168,76,0.06)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gold top bar */}
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

        {/* Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "rgba(201,168,76,0.1)",
            border: "2px solid rgba(201,168,76,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: "0 0 40px rgba(201,168,76,0.2)",
          }}
        >
          <Shield size={36} style={{ color: "#D4AF37" }} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            color: "white",
            fontSize: 24,
            fontWeight: 700,
            fontFamily: "'Playfair Display', serif",
            marginBottom: 12,
          }}
        >
          Account Under Verification
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 15,
            lineHeight: 1.6,
            marginBottom: 8,
          }}
        >
          Your account is under verification. Access will be granted shortly.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          style={{
            color: "rgba(255,255,255,0.35)",
            fontSize: 13,
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          Our team reviews banker accounts to ensure platform integrity. You'll
          receive access within 24–48 hours.
        </motion.p>

        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            background: "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.25)",
            borderRadius: 14,
            padding: "14px 20px",
            marginBottom: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <Clock size={15} style={{ color: "#FBBF24" }} />
            <span style={{ color: "#FBBF24", fontWeight: 600, fontSize: 13 }}>
              Pending Admin Approval
            </span>
          </div>
          {user && (
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
              {user.fullName || user.username} · {user.mobile || user.email}
            </p>
          )}
        </motion.div>

        <motion.button
          type="button"
          data-ocid="banker_pending.logout.button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          onClick={logout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            padding: "10px 20px",
            color: "rgba(255,255,255,0.4)",
            fontSize: 13,
            cursor: "pointer",
            margin: "0 auto",
            transition: "all 0.2s",
          }}
          whileHover={{
            color: "rgba(255,255,255,0.7)",
            borderColor: "rgba(255,255,255,0.25)",
          }}
        >
          <LogOut size={14} /> Logout
        </motion.button>
      </motion.div>
    </div>
  );
}
