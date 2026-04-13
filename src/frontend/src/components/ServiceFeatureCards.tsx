import { useNavigate } from "@tanstack/react-router";
import {
  BarChart2,
  Brain,
  ChevronRight,
  Home,
  MapPin,
  Search,
} from "lucide-react";
import { useState } from "react";

const SERVICES = [
  {
    icon: Home,
    title: "Acquire",
    subtitle: "Buy Property",
    description:
      "AI-powered property discovery with deal scoring, map explorer, and investment intelligence.",
    link: "/buy",
    gradientFrom: "#0a1628",
    gradientTo: "#1e3a7f",
    accent: "#60a5fa",
    glow: "rgba(96,165,250,0.35)",
    borderColor: "rgba(96,165,250,0.35)",
    iconBg: "rgba(96,165,250,0.18)",
    shimmer: "rgba(96,165,250,0.08)",
    cta: "Explore Listings",
  },
  {
    icon: Search,
    title: "LeaseSmart",
    subtitle: "Rent Property",
    description:
      "Discover premium rentals with AI yield analysis, BHK filters, and smart lease comparisons.",
    link: "/rent",
    gradientFrom: "#071a2f",
    gradientTo: "#0e4a5a",
    accent: "#2dd4bf",
    glow: "rgba(45,212,191,0.35)",
    borderColor: "rgba(45,212,191,0.35)",
    iconBg: "rgba(45,212,191,0.18)",
    shimmer: "rgba(45,212,191,0.08)",
    cta: "Find Rentals",
  },
  {
    icon: Brain,
    title: "RealWorth AI",
    subtitle: "AI Valuation",
    description:
      "Precision AI valuation with 3-layer ensemble modeling, confidence scores, and price forecasts.",
    link: "/valuation",
    gradientFrom: "#0e1a30",
    gradientTo: "#4a1e6a",
    accent: "#d4a849",
    glow: "rgba(212,168,73,0.4)",
    borderColor: "rgba(212,168,73,0.4)",
    iconBg: "rgba(212,168,73,0.18)",
    shimmer: "rgba(212,168,73,0.1)",
    cta: "Get Valuation",
  },
  {
    icon: BarChart2,
    title: "Prime Exit",
    subtitle: "Sell Property",
    description:
      "AI-optimised listing with verified pricing, buyer demand signals, and lead management.",
    link: "/seller",
    gradientFrom: "#0a1520",
    gradientTo: "#1a3a20",
    accent: "#4ade80",
    glow: "rgba(74,222,128,0.3)",
    borderColor: "rgba(74,222,128,0.32)",
    iconBg: "rgba(74,222,128,0.15)",
    shimmer: "rgba(74,222,128,0.07)",
    cta: "List Now",
  },
  {
    icon: MapPin,
    title: "Location IQ",
    subtitle: "Area Intelligence",
    description:
      "Deep micro-market analytics: heatmaps, rental yields, infra impact scores, and growth signals.",
    link: "/area-intelligence",
    gradientFrom: "#0d1a2e",
    gradientTo: "#2d1a4e",
    accent: "#a78bfa",
    glow: "rgba(167,139,250,0.35)",
    borderColor: "rgba(167,139,250,0.35)",
    iconBg: "rgba(167,139,250,0.18)",
    shimmer: "rgba(167,139,250,0.08)",
    cta: "Explore Area",
  },
];

interface ServiceCardProps {
  service: (typeof SERVICES)[0];
}

function ServiceCard({ service }: ServiceCardProps) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const Icon = service.icon;

  return (
    <button
      type="button"
      data-ocid={`home.popular_service.${service.title.toLowerCase().replace(/\s+/g, "_")}`}
      onClick={() => navigate({ to: service.link as "/" })}
      className="group text-left flex flex-col"
      style={{
        background: hovered
          ? `linear-gradient(160deg, ${service.gradientTo} 0%, ${service.gradientFrom} 60%, ${service.gradientTo} 100%)`
          : `linear-gradient(160deg, ${service.gradientFrom} 0%, ${service.gradientTo} 100%)`,
        /* Enhanced: always show clear accent border, stronger on hover */
        border: `1.5px solid ${hovered ? `${service.accent}90` : `${service.accent}55`}`,
        borderRadius: 22,
        padding: 24,
        minHeight: 220,
        /* Enhanced: always show glow, stronger on hover — no dimming of inactive cards */
        boxShadow: hovered
          ? `0 24px 60px rgba(0,0,0,0.65), 0 0 40px ${service.glow}, 0 0 0 1px ${service.accent}25, inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.3)`
          : `0 8px 32px rgba(0,0,0,0.45), 0 0 20px ${service.glow.replace(/[\d.]+\)$/, "0.18)")}, 0 0 0 1px ${service.accent}18, inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(0,0,0,0.2)`,
        transform: hovered
          ? "translateY(-10px) scale(1.02) rotateX(2deg)"
          : "translateY(0) scale(1) rotateX(0deg)",
        transition: "all 0.35s cubic-bezier(0.23, 1, 0.32, 1)",
        backdropFilter: "blur(18px)",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        perspective: "800px",
        /* Enhanced: slightly brighter background for inactive state */
        opacity: 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Glass shimmer top highlight — enhanced */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "55%",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 100%)",
          borderRadius: "22px 22px 0 0",
          pointerEvents: "none",
        }}
      />

      {/* Bottom accent glow line */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "10%",
          right: "10%",
          height: 1,
          background: `linear-gradient(90deg, transparent, ${service.accent}60, transparent)`,
          pointerEvents: "none",
        }}
      />

      {/* Radial accent glow — always visible */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "-10%",
          width: "65%",
          height: "65%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${service.shimmer} 0%, transparent 70%)`,
          pointerEvents: "none",
          transition: "opacity 0.35s ease",
          opacity: hovered ? 1 : 0.85,
        }}
      />

      {/* Hover sweep shine */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)",
            borderRadius: 22,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Icon badge — enhanced: larger size, stronger bg */}
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: 17,
          background: service.iconBg,
          /* Enhanced: always show accent border on icon */
          border: `1.5px solid ${service.accent}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 18,
          boxShadow: hovered
            ? `0 8px 24px ${service.glow}, 0 0 0 2px ${service.accent}30`
            : `0 4px 16px rgba(0,0,0,0.35), 0 0 0 1px ${service.accent}20`,
          transition: "all 0.35s cubic-bezier(0.23, 1, 0.32, 1)",
          transform: hovered
            ? "translateY(-3px) scale(1.08)"
            : "translateY(0) scale(1)",
          flexShrink: 0,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Enhanced: icon size increased from 24 → 28 */}
        <Icon size={28} style={{ color: service.accent }} />
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
            color: service.accent,
            /* Enhanced: full opacity always */
            opacity: 1,
            marginBottom: 5,
          }}
        >
          {service.subtitle}
        </p>
        <h3
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 19,
            /* Enhanced: bold → extra-bold */
            fontWeight: 800,
            color: "#F4F7FF",
            marginBottom: 8,
            lineHeight: 1.2,
          }}
        >
          {service.title}
        </h3>
        <p
          style={{
            fontSize: 12.5,
            /* Enhanced: higher contrast on description */
            color: "rgba(185,198,216,0.72)",
            lineHeight: 1.55,
            flex: 1,
          }}
          className="line-clamp-2"
        >
          {service.description}
        </p>

        {/* CTA */}
        <div
          className="flex items-center gap-1.5 mt-4"
          style={{
            color: service.accent,
            fontSize: 12.5,
            fontWeight: 700,
            transform: hovered ? "translateX(5px)" : "translateX(0)",
            transition: "transform 0.28s ease",
          }}
        >
          {service.cta}
          <ChevronRight size={13} />
        </div>
      </div>
    </button>
  );
}

export default function ServiceFeatureCards() {
  return (
    <section className="py-16 max-w-7xl mx-auto px-4" id="popular-services">
      {/* Section header */}
      <div className="text-center mb-12">
        <p
          className="text-sm font-semibold uppercase tracking-widest mb-3"
          style={{ color: "#D4AF37" }}
        >
          Popular Services
        </p>
        <h2
          className="text-3xl md:text-4xl font-bold text-white mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Everything you need to transact with confidence
        </h2>
        <p className="text-white/40 text-sm max-w-xl mx-auto">
          Five AI-powered tools to buy, sell, rent, value, and analyse property
          — all in one platform.
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {SERVICES.map((s) => (
          <ServiceCard key={s.title} service={s} />
        ))}
      </div>
    </section>
  );
}
