import { useNavigate } from "@tanstack/react-router";
import {
  Brain,
  Home,
  LogOut,
  MapPin,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { SAMPLE_LISTINGS } from "../data/intelligence";

interface HeroSectionProps {
  onSearch: () => void;
}

const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  left: `${(i * 17 + 5) % 100}%`,
  top: `${(i * 23 + 10) % 100}%`,
  size: (i % 3) + 2,
  delay: `${(i * 0.7) % 8}s`,
  duration: `${(i % 4) + 6}s`,
  color: i % 3 === 0 ? "#D8B56A" : i % 3 === 1 ? "#3B82F6" : "#B9C6D8",
  opacity: 0.08 + (i % 5) * 0.04,
}));

const STAGE_LABELS: Record<string, string> = {
  ready: "Ready",
  underConstruction: "U/C",
  prelaunch: "Pre-Launch",
};

const TYPE_LABELS: Record<string, string> = {
  bhk1: "1 BHK",
  bhk2: "2 BHK",
  bhk3: "3 BHK",
  villa: "Villa",
  plot: "Plot",
};

function formatPriceShort(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(0)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
}

// ── TABS: Buy, Rent, AI Valuation first (FEATURED), then secondary tabs ──────
const TABS = [
  // ─── FEATURED THREE ───────────────────────────────────────────────────────
  {
    value: "acquire",
    label: "Acquire",
    helper: "Buy",
    Icon: Search,
    accentColor: "#3B82F6",
    featured: true,
    title: "Find High-Potential Properties Backed by AI Intelligence",
    description:
      "Search properties using demand signals, growth forecasts, liquidity scores, and micro-location insights — not just filters.",
    cta: "Start Searching",
    route: "/buy",
  },
  {
    value: "leasesmart",
    label: "LeaseSmart",
    helper: "Rent",
    Icon: Home,
    accentColor: "#4FC3F7",
    featured: true,
    title: "Discover Rentals with Yield Intelligence",
    description:
      "Explore rental properties with intelligent yield analysis, demand heat maps, and monthly-budget filters.",
    cta: "Find Rentals",
    route: "/rent",
  },
  {
    value: "realworth",
    label: "RealWorth AI",
    helper: "AI Valuation",
    Icon: Brain,
    accentColor: "#D8B56A",
    featured: true,
    title: "AI-Powered Property Valuation in Seconds",
    description:
      "Get instant AI-powered property valuation with confidence scores, comparable sales, and pro enhancement insights.",
    cta: "Start AI Valuation",
    route: "/valuation",
  },
  // ─── SECONDARY ─────────────────────────────────────────────────────────────
  {
    value: "primeexit",
    label: "Prime Exit",
    helper: "Sell",
    Icon: LogOut,
    accentColor: "#A5D6A7",
    featured: false,
    title: "Sell Smarter with AI-Verified Pricing",
    description:
      "List your property and get AI-powered pricing recommendations backed by verified transactions.",
    cta: "List Property",
    route: "/sell/discover",
  },
  {
    value: "locationiq",
    label: "Location IQ",
    helper: "Area Intelligence",
    Icon: MapPin,
    accentColor: "#CE93D8",
    featured: false,
    title: "Location Intelligence & Growth Signals",
    description:
      "Explore locality intelligence, market trends, infra scores, and investment signals.",
    cta: "Explore Areas",
    route: "/area/discover",
  },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export default function HeroSection({ onSearch }: HeroSectionProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabValue>(TABS[0].value);

  const activeConfig = TABS.find((t) => t.value === activeTab) ?? TABS[0];

  const handleCta = () => {
    onSearch();
    navigate({ to: activeConfig.route as "/" });
  };

  const featuredTabs = TABS.filter((t) => t.featured);
  const secondaryTabs = TABS.filter((t) => !t.featured);

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: "#071A2F", paddingTop: "80px" }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(135deg, #071A2F 0%, #0B2A4A 45%, #071A2F 100%)",
        }}
      />

      {/* Hero background image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage:
            "url('/assets/generated/valubrix-hero-bg.dim_1920x1080.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.22,
        }}
      />

      {/* Gold radial glow */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 20% 50%, rgba(216,181,106,0.05) 0%, transparent 60%), radial-gradient(ellipse 50% 80% at 80% 30%, rgba(11,42,74,0.4) 0%, transparent 70%)",
        }}
      />

      {/* Animated particles */}
      {PARTICLES.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none z-0"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: p.color,
            opacity: p.opacity,
            animation: `particle-drift ${p.duration} ${p.delay} ease-in-out infinite`,
          }}
        />
      ))}

      {/* Main two-column layout */}
      <div className="relative z-10 w-full max-w-[1380px] mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16 items-center">
          {/* Left column — heading + premium tabs */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            {/* Hero Logo */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="flex items-center gap-3 mb-5"
            >
              <img
                src="/assets/valubrix-logo.png"
                alt="ValuBrix"
                style={{ height: 56, width: "auto", objectFit: "contain" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </motion.div>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              style={{
                background: "rgba(216,181,106,0.10)",
                border: "1px solid rgba(216,181,106,0.30)",
              }}
            >
              <Brain size={13} style={{ color: "#D8B56A" }} />
              <span
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: "#D8B56A" }}
              >
                AI-Powered Property Intelligence
              </span>
            </motion.div>

            {/* H1 */}
            <h1
              className="text-4xl md:text-5xl xl:text-6xl font-bold leading-tight mb-4"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: "#F4F7FF",
              }}
            >
              India&apos;s{" "}
              <span
                style={{
                  color: "#D8B56A",
                  textShadow: "0 0 30px rgba(216,181,106,0.35)",
                }}
              >
                Smartest
              </span>{" "}
              AI-Powered
              <br />
              Property Intelligence
              <br />
              Platform
            </h1>

            <p
              className="text-base md:text-lg mb-6 max-w-lg leading-relaxed"
              style={{ color: "#B9C6D8" }}
            >
              Know prices, growth, demand, and risks before you buy, sell, or
              invest.
            </p>

            {/* ── Premium Tabs Card ─────────────────────────────── */}
            <div
              className="rounded-3xl p-4 md:p-5"
              style={{
                background: "rgba(255,255,255,0.07)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.16)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.30)",
              }}
            >
              {/* Featured label */}
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={12} style={{ color: "#D8B56A" }} />
                <span
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: "#D8B56A" }}
                >
                  Most Popular
                </span>
              </div>

              {/* ── FEATURED 3 tabs — large, prominent ── */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {featuredTabs.map((tab) => {
                  const isActive = activeTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      data-ocid={`hero.${tab.value}.tab`}
                      onClick={() => setActiveTab(tab.value)}
                      className="relative flex flex-col items-center px-2 py-3 rounded-2xl transition-all duration-200"
                      style={{
                        background: isActive
                          ? `${tab.accentColor}20`
                          : "rgba(255,255,255,0.04)",
                        border: isActive
                          ? `2px solid ${tab.accentColor}70`
                          : "2px solid rgba(255,255,255,0.10)",
                        boxShadow: isActive
                          ? `0 0 18px ${tab.accentColor}30, inset 0 1px 0 ${tab.accentColor}20`
                          : "none",
                      }}
                    >
                      {/* Active glow top bar */}
                      {isActive && (
                        <div
                          className="absolute top-0 left-4 right-4 h-0.5 rounded-full"
                          style={{
                            background: `linear-gradient(90deg, transparent, ${tab.accentColor}, transparent)`,
                          }}
                        />
                      )}
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 flex-shrink-0"
                        style={{
                          background: isActive
                            ? `${tab.accentColor}25`
                            : "rgba(255,255,255,0.06)",
                        }}
                      >
                        <tab.Icon
                          size={16}
                          style={{
                            color: isActive ? tab.accentColor : "#7A8FA6",
                          }}
                        />
                      </div>
                      <span
                        className="font-bold text-xs leading-tight text-center"
                        style={{
                          color: isActive ? tab.accentColor : "#B9C6D8",
                        }}
                      >
                        {tab.label}
                      </span>
                      <span
                        className="text-[10px] leading-tight mt-0.5 font-semibold"
                        style={{
                          color: isActive ? `${tab.accentColor}cc` : "#5A6E84",
                        }}
                      >
                        {tab.helper}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Divider + secondary tabs */}
              <div
                className="flex items-center gap-2 mb-2.5"
                style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider pt-2.5"
                  style={{ color: "#4A5E72" }}
                >
                  More Services
                </span>
                <div className="flex-1 pt-2.5" style={{ borderTop: "none" }} />
              </div>
              <div className="flex gap-2">
                {secondaryTabs.map((tab) => {
                  const isActive = activeTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      data-ocid={`hero.${tab.value}.tab`}
                      onClick={() => setActiveTab(tab.value)}
                      className="flex-1 flex flex-col items-center px-2 py-2 rounded-xl transition-all duration-200"
                      style={{
                        background: isActive
                          ? `${tab.accentColor}15`
                          : "rgba(255,255,255,0.03)",
                        border: isActive
                          ? `1px solid ${tab.accentColor}45`
                          : "1px solid rgba(255,255,255,0.08)",
                        color: isActive ? tab.accentColor : "#7A8FA6",
                      }}
                    >
                      <tab.Icon
                        size={13}
                        style={{
                          color: isActive ? tab.accentColor : "#7A8FA6",
                          marginBottom: "3px",
                        }}
                      />
                      <span className="font-semibold text-[10px] leading-tight">
                        {tab.label}
                      </span>
                      <span className="text-[9px] leading-tight mt-0.5 opacity-70">
                        {tab.helper}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active tab content — icon + title + description + CTA */}
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex flex-col gap-3 mt-4 pt-4"
                style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
              >
                {/* Icon + Title row */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `${activeConfig.accentColor}18`,
                      border: `1px solid ${activeConfig.accentColor}35`,
                    }}
                  >
                    <activeConfig.Icon
                      size={18}
                      style={{ color: activeConfig.accentColor }}
                    />
                  </div>
                  <div>
                    <h3
                      className="font-bold text-sm leading-tight"
                      style={{
                        color: "#F4F7FF",
                        fontFamily: "'Playfair Display', serif",
                      }}
                    >
                      {activeConfig.title}
                    </h3>
                  </div>
                </div>

                {/* Description */}
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "#B9C6D8" }}
                >
                  {activeConfig.description}
                </p>

                {/* CTA button */}
                <button
                  type="button"
                  data-ocid={`hero.${activeTab}.cta_button`}
                  onClick={handleCta}
                  className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${activeConfig.accentColor} 0%, ${activeConfig.accentColor}cc 100%)`,
                    color:
                      activeConfig.value === "realworth"
                        ? "#071A2F"
                        : "#ffffff",
                    boxShadow: `0 2px 16px ${activeConfig.accentColor}35`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      `0 4px 24px ${activeConfig.accentColor}55`;
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      `0 2px 16px ${activeConfig.accentColor}35`;
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "translateY(0)";
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <activeConfig.Icon size={15} />
                    {activeConfig.cta}
                  </span>
                </button>
              </motion.div>
            </div>

            {/* Trust signals */}
            <div className="flex items-center gap-6 mt-5">
              {[
                { label: "15K+ Properties", icon: TrendingUp },
                { label: "50+ Micro-zones", icon: MapPin },
              ].map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 text-sm"
                  style={{ color: "#B9C6D8" }}
                >
                  <Icon size={14} style={{ color: "#D8B56A" }} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right column — Featured Properties */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="hidden lg:block"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-1"
                  style={{ color: "#D8B56A" }}
                >
                  Featured Listings
                </p>
                <h3
                  className="text-xl font-bold"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: "#F4F7FF",
                  }}
                >
                  Properties in Bangalore
                </h3>
              </div>
              <button
                type="button"
                onClick={() => navigate({ to: "/buy" })}
                className="text-xs font-semibold transition-colors"
                style={{ color: "#D8B56A" }}
                data-ocid="hero.view_all.button"
              >
                View All →
              </button>
            </div>

            {/* 4 property mini-cards in 2x2 grid */}
            <div className="grid grid-cols-2 gap-3">
              {SAMPLE_LISTINGS.slice(0, 4).map((listing, i) => (
                <motion.button
                  key={listing.id}
                  type="button"
                  data-ocid={`hero.property.item.${i + 1}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.08, duration: 0.5 }}
                  onClick={() => navigate({ to: "/buy" })}
                  className="text-left rounded-2xl p-4 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.16)",
                  }}
                  whileHover={{
                    borderColor: "rgba(216,181,106,0.35)",
                    y: -2,
                    boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
                  }}
                >
                  {/* Image */}
                  <div
                    className="w-full h-28 rounded-xl mb-3 overflow-hidden"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(11,42,74,0.8) 0%, rgba(15,52,96,0.6) 100%)",
                    }}
                  >
                    <img
                      src={`https://images.unsplash.com/photo-154532441${
                        [
                          "8cc1a3fa10c00",
                          "2027-8081e485255e",
                          "8cc1a3fa10c00",
                          "2027-8081e485255e",
                        ][i]
                      }?w=400&q=70`}
                      alt={listing.title}
                      className="w-full h-full object-cover opacity-70"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <div>
                    <p
                      className="text-xs font-bold mb-0.5 line-clamp-1"
                      style={{ color: "#F4F7FF" }}
                    >
                      {listing.title}
                    </p>
                    <p
                      className="text-xs flex items-center gap-1 mb-2"
                      style={{ color: "#B9C6D8" }}
                    >
                      <MapPin size={9} />
                      {listing.locality}
                    </p>
                    <div className="flex items-center justify-between">
                      <span
                        className="text-sm font-bold"
                        style={{ color: "#D8B56A" }}
                      >
                        {formatPriceShort(listing.priceInr)}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(216,181,106,0.12)",
                          color: "#D8B56A",
                          border: "1px solid rgba(216,181,106,0.25)",
                        }}
                      >
                        {TYPE_LABELS[listing.propertyType] ||
                          listing.propertyType}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          color: "#B9C6D8",
                          border: "1px solid rgba(255,255,255,0.10)",
                        }}
                      >
                        {STAGE_LABELS[listing.stage] || listing.stage}
                      </span>
                      {listing.badges.slice(0, 1).map((b) => (
                        <span
                          key={b}
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: "rgba(34,197,94,0.12)",
                            color: "#4ade80",
                            border: "1px solid rgba(34,197,94,0.25)",
                          }}
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 opacity-30"
        aria-hidden="true"
      >
        <div
          className="w-0.5 h-8 rounded-full"
          style={{
            background: "linear-gradient(to bottom, #D8B56A, transparent)",
            animation: "float 2s ease-in-out infinite",
          }}
        />
        <svg
          width="16"
          height="10"
          viewBox="0 0 16 10"
          fill="none"
          aria-hidden="true"
          style={{ animation: "bounce 2s ease-in-out infinite" }}
        >
          <title>Scroll down</title>
          <path
            d="M1 1L8 8L15 1"
            stroke="#D8B56A"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </section>
  );
}
