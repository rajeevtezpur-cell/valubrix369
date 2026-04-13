import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Building2, Home, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const portals = [
  {
    id: "buyers" as const,
    icon: TrendingUp,
    title: "Buyers & Investors",
    subtitle: "Property discovery & AI valuation",
    desc: "Find your dream property with AI-powered valuations, deal scoring, comparable analysis, and micro-market intelligence across Bangalore.",
    accent: "#3B82F6",
    glow: "rgba(59,130,246,0.45)",
    gradientFrom: "#071828",
    gradientTo: "#0e2a50",
    borderColor: "rgba(59,130,246,0.38)",
    iconBg: "rgba(59,130,246,0.18)",
    shimmer: "rgba(59,130,246,0.1)",
    features: ["AI Deal Scoring", "Price Forecast", "Comparable Analysis"],
    ocid: "portal.buyers.primary_button",
    route: "/buyer",
    portalKey: "buyer" as const,
    delay: 0,
  },
  {
    id: "sellers" as const,
    icon: Home,
    title: "Sellers",
    subtitle: "AI-verified listing & lead management",
    desc: "Showcase your property with verified AI pricing, reach qualified buyers, and track leads through our intelligent seller dashboard.",
    accent: "#D4AF37",
    glow: "rgba(212,175,55,0.45)",
    gradientFrom: "#1a1000",
    gradientTo: "#2e1e00",
    borderColor: "rgba(212,175,55,0.38)",
    iconBg: "rgba(212,175,55,0.18)",
    shimmer: "rgba(212,175,55,0.1)",
    features: ["AI Pricing Engine", "Lead Pipeline", "Market Analytics"],
    ocid: "portal.sellers.primary_button",
    route: "/seller",
    portalKey: "seller" as const,
    delay: 150,
  },
  {
    id: "banks" as const,
    icon: Building2,
    title: "Banks & FIs",
    subtitle: "Institutional-grade valuation reports",
    desc: "Access loan-grade collateral valuations, bulk property assessments, risk-calibrated confidence scores, and RBI-compliant audit trails.",
    accent: "#16C784",
    glow: "rgba(22,199,132,0.45)",
    gradientFrom: "#001810",
    gradientTo: "#002918",
    borderColor: "rgba(22,199,132,0.32)",
    iconBg: "rgba(22,199,132,0.15)",
    shimmer: "rgba(22,199,132,0.08)",
    features: ["RBI-Compliant Reports", "Bulk Valuations", "Risk Scoring"],
    ocid: "portal.banks.primary_button",
    route: "/bank",
    portalKey: "banker" as const,
    delay: 300,
  },
];

function PortalCard(props: (typeof portals)[0]) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const { user, openLoginModal } = useAuth();
  const Icon = props.icon;

  const handleNav = () => {
    if (user) {
      navigate({ to: props.route as "/" });
    } else {
      openLoginModal(props.portalKey);
    }
  };

  return (
    <div
      data-ocid={`portal.card.${props.id}`}
      className="portal-card flex flex-col gap-5 relative overflow-hidden"
      style={{
        background: hovered
          ? `linear-gradient(160deg, ${props.gradientTo} 0%, ${props.gradientFrom} 50%, ${props.gradientTo} 100%)`
          : `linear-gradient(160deg, ${props.gradientFrom} 0%, ${props.gradientTo} 100%)`,
        border: `1px solid ${hovered ? `${props.accent}75` : props.borderColor}`,
        borderRadius: 26,
        padding: 36,
        minHeight: 320,
        boxShadow: hovered
          ? `0 30px 80px rgba(0,0,0,0.7), 0 0 60px ${props.glow}, inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.3)`
          : `0 12px 48px rgba(0,0,0,0.5), 0 0 24px ${props.glow.replace("0.45", "0.1")}, inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.2)`,
        transform: hovered
          ? "translateY(-12px) scale(1.015)"
          : "translateY(0) scale(1)",
        transition: "all 0.4s cubic-bezier(0.23, 1, 0.32, 1)",
        backdropFilter: "blur(20px)",
        cursor: "pointer",
        animationDelay: `${props.delay}ms`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Glass top highlight */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "45%",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 100%)",
          borderRadius: "26px 26px 0 0",
          pointerEvents: "none",
        }}
      />

      {/* Radial glow overlay */}
      <div
        style={{
          position: "absolute",
          top: "-30%",
          left: "-10%",
          width: "70%",
          height: "70%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${props.shimmer} 0%, transparent 70%)`,
          pointerEvents: "none",
          opacity: hovered ? 1 : 0.7,
          transition: "opacity 0.4s ease",
        }}
      />

      {/* Sparkles on hover */}
      {hovered && (
        <>
          <div
            style={{
              position: "absolute",
              top: "10%",
              right: "15%",
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: props.accent,
              opacity: 0.8,
              animation: "sparkleFloat 1.4s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "38%",
              right: "8%",
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: props.accent,
              opacity: 0.5,
              animation: "sparkleFloat 1.8s ease-in-out 0.3s infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "20%",
              right: "22%",
              width: 2,
              height: 2,
              borderRadius: "50%",
              background: props.accent,
              opacity: 0.4,
              animation: "sparkleFloat 2.1s ease-in-out 0.6s infinite",
            }}
          />
        </>
      )}

      {/* Icon — 3D lifted */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: props.iconBg,
          border: `1px solid ${props.borderColor}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: hovered
            ? `0 10px 32px ${props.glow}, 0 0 0 1px rgba(255,255,255,0.1)`
            : "0 4px 16px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)",
          transform: hovered
            ? "translateY(-4px) scale(1.1)"
            : "translateY(0) scale(1)",
          transition: "all 0.4s cubic-bezier(0.23, 1, 0.32, 1)",
          position: "relative",
          zIndex: 1,
          flexShrink: 0,
        }}
      >
        <Icon size={32} style={{ color: props.accent }} />
      </div>

      {/* Content */}
      <div
        className="flex flex-col flex-1"
        style={{ position: "relative", zIndex: 1 }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: props.accent,
            opacity: 0.85,
            marginBottom: 7,
          }}
        >
          {props.subtitle}
        </p>
        <h3
          className="text-2xl font-bold text-white mb-3"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {props.title}
        </h3>
        <p className="text-white/55 text-sm leading-relaxed flex-1 mb-4">
          {props.desc}
        </p>

        {/* Feature tags */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {props.features.map((f) => (
            <span
              key={f}
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: props.accent,
                background: `${props.iconBg}`,
                border: `1px solid ${props.borderColor}`,
                borderRadius: 6,
                padding: "3px 8px",
              }}
            >
              {f}
            </span>
          ))}
        </div>

        {/* CTA Button */}
        <button
          type="button"
          data-ocid={props.ocid}
          onClick={handleNav}
          className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold self-start overflow-hidden"
          style={{
            background: hovered ? props.accent : "transparent",
            color: hovered ? "#0A0F1E" : props.accent,
            border: `1px solid ${props.accent}`,
            boxShadow: hovered
              ? `0 0 40px ${props.glow}, 0 4px 20px rgba(0,0,0,0.35)`
              : "none",
            transition: "all 0.35s cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        >
          Enter Portal
          <ArrowRight
            size={14}
            style={{
              transform: hovered ? "translateX(4px)" : "translateX(0)",
              transition: "transform 0.3s ease",
            }}
          />
        </button>
      </div>
    </div>
  );
}

export default function PortalEntryCards() {
  return (
    <section className="py-16 max-w-6xl mx-auto px-4" id="portals">
      <style>{`
        @keyframes cardReveal { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sparkleFloat { 0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; } 50% { transform: translateY(-8px) scale(1.5); opacity: 1; } }
        @keyframes headingReveal { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .portal-section-heading { animation: headingReveal 0.7s cubic-bezier(0.23, 1, 0.32, 1) 0.1s both; }
        .portal-card { animation: cardReveal 0.7s cubic-bezier(0.23, 1, 0.32, 1) both; }
        .portal-card:nth-child(1) { animation-delay: 0.3s; }
        .portal-card:nth-child(2) { animation-delay: 0.45s; }
        .portal-card:nth-child(3) { animation-delay: 0.6s; }
      `}</style>

      {/* Section heading */}
      <div className="text-center mb-12 portal-section-heading">
        <p
          className="text-sm font-semibold uppercase tracking-widest mb-3"
          style={{ color: "#D4AF37" }}
        >
          Choose Your Journey
        </p>
        <h2
          className="text-3xl md:text-4xl font-bold text-white mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Our Portals
        </h2>
        <div
          className="mx-auto mt-3 h-0.5 w-16 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, #D4AF37, transparent)",
          }}
        />
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        data-ocid="portal.section"
      >
        {portals.map((p) => (
          <PortalCard key={p.id} {...p} />
        ))}
      </div>
    </section>
  );
}
