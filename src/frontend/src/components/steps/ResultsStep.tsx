// ResultsStep.tsx — Step 5: Full AI Research Report for valuation mode
// + listing results for buy/rent/area modes
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  MapPin,
  Percent,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BANGALORE_PROJECTS } from "../../data/bangaloreProjects";
import { getCoords } from "../../data/localityCoords";
import {
  COLLEGES_REGISTRY,
  HIGHWAYS as HIGHWAY_POIS,
} from "../../data/poiRegistry";
import { getAreaIntelligence } from "../../engines/areaIntelligenceEngine";
import {
  AIRPORT_KIA,
  AMENITIES,
  MALLS,
  TECH_PARKS,
} from "../../engines/infraEngine";
import { computeInvestmentIntelligence } from "../../engines/investmentIntelligenceEngine";
import { BUS_STOPS, RAILWAY_STATIONS } from "../../engines/mapLayersEngine";
import { METROS, haversineDistance } from "../../engines/metroEngine";
import {
  type OSRMResult,
  type POIInput,
  getOSRMDistances,
} from "../../engines/osrmEngine";
import { computePriceForecast } from "../../engines/priceForecastEngine";
import type { ValuationOutput } from "../../engines/unifiedEngine";
import { valuateProperty } from "../../engines/unifiedEngine";
import { computeValuBrixScore } from "../../engines/valuBrixScoreEngine";
import { valuate } from "../../engines/valuationEngine";
import { getActiveListingsForBuyer } from "../../services/listingService";
import { getBasePSF } from "../../utils/localityEngine";
import { estimateRent, getLocalityRentMetrics } from "../../utils/rentEngine";
import SubmitSoldPriceModal from "../SubmitSoldPriceModal";
import BuyIntelligencePanel from "./BuyIntelligencePanel";
import RentIntelligencePanel from "./RentIntelligencePanel";
import type { FlowData, FlowMode } from "./types";

// ─── Nearby Places Types ──────────────────────────────────────────────────────

/** A single OSRM-resolved POI entry for display in NearbyPlacesPanel */
interface OSRMPlaceEntry {
  name: string;
  osrmKm: number;
  osrmDurationMins: number;
  detail?: string; // e.g. metro line
}

interface NearbyPlacesData {
  metros: OSRMPlaceEntry[];
  techHubs: OSRMPlaceEntry[];
  hospitals: OSRMPlaceEntry[];
  schools: OSRMPlaceEntry[];
  colleges: OSRMPlaceEntry[];
  busStops: OSRMPlaceEntry[];
  railwayStations: OSRMPlaceEntry[];
  malls: OSRMPlaceEntry[];
  highways: OSRMPlaceEntry[];
  /** Airport — single entry */
  airport: OSRMPlaceEntry | null;
  // backward compat fields kept for badge count
  airportKm: number;
  airportMins: number;
}

interface ResultsStepProps {
  flowData: FlowData;
  mode: FlowMode;
  onBack: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatINR(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatPSF(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}/sqft`;
}

/** Display distance — km with 1 decimal */
// biome-ignore lint/correctness/noUnusedVariables: may be used by score panels
function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function scoreBand(score: number): { label: string; color: string } {
  if (score >= 75) return { label: "High", color: "#4ade80" };
  if (score >= 50) return { label: "Medium", color: "#D8B56A" };
  return { label: "Low", color: "#f87171" };
}

// ─── Accordion Section Wrapper ────────────────────────────────────────────────

function AccordionSection({
  title,
  icon,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, rgba(11,42,74,0.85) 0%, rgba(7,26,47,0.92) 100%)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 18,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 transition-colors duration-200"
        style={{
          background: open ? "rgba(255,255,255,0.04)" : "transparent",
          cursor: "pointer",
          borderBottom: open ? "1px solid rgba(255,255,255,0.07)" : "none",
        }}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 15,
              fontWeight: 700,
              color: "#D8B56A",
            }}
          >
            {title}
          </span>
          {badge && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: "rgba(216,181,106,0.12)",
                border: "1px solid rgba(216,181,106,0.3)",
                color: "#D8B56A",
                fontSize: 10,
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp
            size={16}
            style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }}
          />
        ) : (
          <ChevronDown
            size={16}
            style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }}
          />
        )}
      </button>
      {open && <div className="px-5 py-4 space-y-3">{children}</div>}
    </div>
  );
}

// ─── Nearby Places Panel ─────────────────────────────────────────────────────

/** Format an OSRM distance entry. Shows "Distance unavailable" when osrmKm is 0. */
// (kept for potential future use in tooltips)
// function formatOSRMEntry(entry: OSRMPlaceEntry): string { ... }

// Category key → infra layer key mapping
type NearbyCategory =
  | "metro"
  | "railway"
  | "bus"
  | "tech"
  | "hospital"
  | "school"
  | "college"
  | "mall"
  | "highway";

function NearbyPlacesPanel({
  data,
  loading,
  activeFilters,
  onFilterChange,
}: {
  data: NearbyPlacesData;
  loading?: boolean;
  activeFilters?: Set<NearbyCategory>;
  onFilterChange?: (filters: Set<NearbyCategory>) => void;
}) {
  const allCategories: Array<{
    key: NearbyCategory;
    label: string;
    icon: string;
    color: string;
    items: OSRMPlaceEntry[];
  }> = [
    {
      key: "metro",
      label: "Metro Stations",
      icon: "🚇",
      color: "#60a5fa",
      items: data.metros,
    },
    {
      key: "railway",
      label: "Railway Stations",
      icon: "🚆",
      color: "#a78bfa",
      items: data.railwayStations,
    },
    {
      key: "bus",
      label: "Bus Stops",
      icon: "🚌",
      color: "#f59e0b",
      items: data.busStops,
    },
    {
      key: "tech",
      label: "Tech Hubs & IT Parks",
      icon: "💻",
      color: "#D8B56A",
      items: data.techHubs,
    },
    {
      key: "hospital",
      label: "Hospitals",
      icon: "🏥",
      color: "#f87171",
      items: data.hospitals,
    },
    {
      key: "school",
      label: "Schools",
      icon: "🏫",
      color: "#4ade80",
      items: data.schools,
    },
    {
      key: "college",
      label: "Colleges",
      icon: "🎓",
      color: "#818cf8",
      items: data.colleges,
    },
    {
      key: "mall",
      label: "Malls & Shopping",
      icon: "🛍️",
      color: "#ec4899",
      items: data.malls,
    },
    {
      key: "highway",
      label: "Major Roads & Highways",
      icon: "🛣️",
      color: "#94a3b8",
      items: data.highways,
    },
  ];

  // When filters are active, show only selected categories; otherwise show all
  const hasActiveFilters = activeFilters && activeFilters.size > 0;
  const categories = hasActiveFilters
    ? allCategories.filter((c) => activeFilters.has(c.key))
    : allCategories;

  function handleToggleFilter(key: NearbyCategory) {
    if (!onFilterChange) return;
    const next = new Set(activeFilters ?? []);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onFilterChange(next);
  }

  return (
    <div className="space-y-4">
      {/* Filter pills — only shown when onFilterChange is provided */}
      {onFilterChange && (
        <div className="flex flex-wrap gap-1.5">
          {allCategories.map((cat) => {
            const isActive = activeFilters?.has(cat.key) ?? false;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => handleToggleFilter(cat.key)}
                className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-150"
                style={{
                  background: isActive
                    ? `${cat.color}22`
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isActive ? cat.color : "rgba(255,255,255,0.1)"}`,
                  color: isActive ? cat.color : "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                }}
              >
                {cat.icon} {cat.label.split(" ")[0]}
              </button>
            );
          })}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => onFilterChange(new Set())}
              className="px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.3)",
                color: "#f87171",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Airport distance — always show (unless filtered to non-airport categories) */}
      {!hasActiveFilters && (
        <div
          className="flex items-center justify-between px-3 py-2.5 rounded-xl"
          style={{
            background: "rgba(216,181,106,0.07)",
            border: "1px solid rgba(216,181,106,0.2)",
          }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 16 }}>✈️</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#F4F7FF" }}>
                Kempegowda International Airport
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                NH44 Corridor
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            {loading ? (
              <p
                className="animate-pulse"
                style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}
              >
                Loading...
              </p>
            ) : data.airport ? (
              <>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#D8B56A" }}>
                  {data.airport.osrmKm > 0
                    ? `${data.airport.osrmKm.toFixed(1)} km`
                    : "Distance unavailable"}
                </p>
                {data.airport.osrmKm > 0 && (
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                    ~{Math.round(data.airport.osrmDurationMins)} mins
                  </p>
                )}
              </>
            ) : (
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                Distance unavailable
              </p>
            )}
          </div>
        </div>
      )}

      {categories.map((cat) => (
        <div key={cat.label}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: `${cat.color}99`,
              marginBottom: 6,
            }}
          >
            {cat.icon} {cat.label}
          </p>
          {loading ? (
            <div className="space-y-1.5">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-pulse h-10 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                />
              ))}
            </div>
          ) : cat.items.length === 0 ? (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              None nearby
            </p>
          ) : (
            <div className="space-y-1.5">
              {cat.items.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3 py-2 px-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <div className="min-w-0">
                    <p
                      className="truncate"
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#F4F7FF",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}
                    >
                      {item.name}
                    </p>
                    {item.detail && (
                      <p
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.35)",
                        }}
                      >
                        {item.detail}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {item.osrmKm > 0 ? (
                      <>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: cat.color,
                          }}
                        >
                          {item.osrmKm.toFixed(1)} km
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.35)",
                          }}
                        >
                          ~{Math.round(item.osrmDurationMins)} mins
                        </p>
                      </>
                    ) : (
                      <p
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.3)",
                        }}
                      >
                        Distance unavailable
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Glass section wrapper ────────────────────────────────────────────────────

function GlassSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background:
          "linear-gradient(135deg, rgba(11,42,74,0.85) 0%, rgba(7,26,47,0.92) 100%)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 18,
        padding: "20px",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="mb-4">
      <h3
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 17,
          fontWeight: 700,
          color: "#D8B56A",
          marginBottom: 2,
        }}
      >
        {children}
      </h3>
      {sub && (
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{sub}</p>
      )}
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard({ label }: { label: string }) {
  return (
    <div
      className="rounded-2xl p-5 animate-pulse"
      style={{
        background:
          "linear-gradient(135deg, rgba(11,42,74,0.85) 0%, rgba(7,26,47,0.9) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        minHeight: 130,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: "rgba(216,181,106,0.5)",
          marginBottom: 12,
        }}
      >
        {label}
      </p>
      <div className="space-y-2">
        <div
          className="h-8 rounded-xl"
          style={{ background: "rgba(255,255,255,0.06)", width: "60%" }}
        />
        <div
          className="h-3 rounded"
          style={{ background: "rgba(255,255,255,0.04)", width: "80%" }}
        />
        <div
          className="h-3 rounded"
          style={{ background: "rgba(255,255,255,0.04)", width: "50%" }}
        />
      </div>
    </div>
  );
}

// ─── Pro Enhancement Card ─────────────────────────────────────────────────────

interface ProCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
  badge?: string;
}

function ProCard({
  icon,
  label,
  value,
  subtext,
  color = "#D8B56A",
  badge,
}: ProCardProps) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-2"
      style={{
        background:
          "linear-gradient(135deg, rgba(11,42,74,0.9) 0%, rgba(7,26,47,0.95) 100%)",
        border: `1px solid ${color}28`,
        boxShadow: `0 4px 20px ${color}10`,
        minHeight: 130,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, color }}
        >
          {icon}
        </div>
        {badge && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{
              background: `${color}18`,
              border: `1px solid ${color}40`,
              color,
              fontSize: 10,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <div>
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            color: "rgba(255,255,255,0.4)",
            marginBottom: 2,
          }}
        >
          {label}
        </p>
        <p
          className="font-bold"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22,
            color,
            lineHeight: 1.2,
          }}
        >
          {value}
        </p>
        {subtext && (
          <p
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              marginTop: 3,
            }}
          >
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── 3-Layer AVM Breakdown (new — additive sub-section) ─────────────────────

function ThreeLayerAVMBreakdown({
  unifiedResult,
  area,
}: {
  unifiedResult: ValuationOutput;
  area: number;
}) {
  const [open, setOpen] = useState(false);
  const {
    layer1Value,
    layer2Value,
    layer3Delta,
    exponentialDemandEffect,
    exponentialDistanceEffect,
    layer1Weight,
    layer2Weight,
    layer3Weight,
    comparableCount,
    outlierCount,
  } = unifiedResult;

  // Only show if layer1Value is available (upgraded engine)
  if (layer1Value === undefined) return null;

  const pct = (w?: number) =>
    w !== undefined ? `${Math.round(w * 100)}%` : "—";
  const inr = (psf: number | undefined) =>
    psf !== undefined ? formatINR(psf * area) : "—";

  const layers = [
    {
      title: "Layer 1 — ML Ensemble",
      color: "#60a5fa",
      value: layer1Value,
      weight: layer1Weight,
      extra: null,
    },
    {
      title: "Layer 2 — Comparable Engine",
      color: "#D8B56A",
      value: layer2Value,
      weight: layer2Weight,
      extra:
        comparableCount !== undefined
          ? `${comparableCount} comps${outlierCount ? ` · ${outlierCount} outliers removed` : ""}`
          : null,
    },
    {
      title: "Layer 3 — Adjustment Engine",
      color: "#a78bfa",
      value: layer3Delta,
      weight: layer3Weight,
      extra: "Net delta from builder · demand · trend",
      isDelta: true,
    },
  ];

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        overflow: "hidden",
        marginTop: 12,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ cursor: "pointer", background: "none", border: "none" }}
        aria-expanded={open}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: "#D8B56A" }}>
          ⚙ 3-Layer AVM Breakdown
        </span>
        {open ? (
          <ChevronUp size={13} style={{ color: "rgba(255,255,255,0.35)" }} />
        ) : (
          <ChevronDown size={13} style={{ color: "rgba(255,255,255,0.35)" }} />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2.5">
          {layers.map((l) => (
            <div
              key={l.title}
              className="rounded-xl p-3"
              style={{
                background: `${l.color}08`,
                border: `1px solid ${l.color}25`,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span style={{ fontSize: 12, fontWeight: 700, color: l.color }}>
                  {l.title}
                </span>
                <span
                  className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    background: `${l.color}18`,
                    border: `1px solid ${l.color}35`,
                    color: l.color,
                    fontSize: 10,
                  }}
                >
                  {pct(l.weight)}
                </span>
              </div>
              <p
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#F4F7FF",
                }}
              >
                {l.isDelta
                  ? l.value !== undefined
                    ? `${l.value >= 0 ? "+" : ""}${formatINR(Math.abs(l.value) * area)}`
                    : "—"
                  : inr(l.value)}
              </p>
              {l.extra && (
                <p
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.35)",
                    marginTop: 2,
                  }}
                >
                  {l.extra}
                </p>
              )}
            </div>
          ))}

          {/* Exponential effects */}
          {(exponentialDemandEffect !== undefined ||
            exponentialDistanceEffect !== undefined) && (
            <div
              className="rounded-xl p-3"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "rgba(216,181,106,0.6)",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                Exponential Effects
              </p>
              {exponentialDemandEffect !== undefined && (
                <div className="flex items-center justify-between py-1">
                  <span
                    style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}
                  >
                    📈 Demand boost
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#4ade80",
                    }}
                  >
                    {exponentialDemandEffect.toFixed(3)}×
                  </span>
                </div>
              )}
              {exponentialDistanceEffect !== undefined && (
                <div className="flex items-center justify-between py-1">
                  <span
                    style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}
                  >
                    📍 Distance decay
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#f97316",
                    }}
                  >
                    {exponentialDistanceEffect.toFixed(3)}×
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Final value footer */}
          <div
            className="flex items-center justify-between px-3 py-2.5 rounded-xl"
            style={{
              background: "rgba(216,181,106,0.08)",
              border: "1px solid rgba(216,181,106,0.2)",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "#D8B56A" }}>
              💎 Final AI Value
            </span>
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 16,
                fontWeight: 700,
                color: "#D8B56A",
              }}
            >
              {formatINR(unifiedResult.estimatedValue)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Explainable AI Breakdown ─────────────────────────────────────────────────

interface BreakdownRow {
  icon: string;
  label: string;
  pct: number;
  value: number;
  color: string;
  isFinal?: boolean;
  isNeutral?: boolean;
}

function ExplainableAIPanel({
  val,
  builderSelected = false,
  unifiedResult,
}: {
  val: ReturnType<typeof valuate>;
  builderSelected?: boolean;
  unifiedResult?: ValuationOutput;
}) {
  const { priceExplanation, fMV, basePrice } = val;

  const area = fMV / val.pricePerSqft || 1000; // approximate
  const baseValue = Math.round(basePrice * area);

  // R8: when no builder, show "Neutral" for builder and demand rows
  // builderContrib = 0 means no adjustment — display as Neutral not "0%"
  const rows: BreakdownRow[] = [
    {
      icon: "🏙",
      label: "Base Locality Value",
      pct: 0,
      value: baseValue,
      color: "rgba(255,255,255,0.6)",
    },
    {
      icon: "🏗",
      label: builderSelected ? "Builder Premium" : "Builder Impact",
      pct: priceExplanation.builderContrib,
      value: Math.round(fMV * (priceExplanation.builderContrib / 100)),
      color: "#D8B56A",
      isNeutral: !builderSelected,
    },
    {
      icon: "📶",
      label: "Location Premium",
      pct: priceExplanation.locationContrib,
      value: Math.round(fMV * (priceExplanation.locationContrib / 100)),
      color: "#60a5fa",
    },
    {
      icon: "📈",
      label: "Demand Adjustment",
      pct: priceExplanation.demandContrib,
      value: Math.round(fMV * (priceExplanation.demandContrib / 100)),
      color: "#4ade80",
      isNeutral: !builderSelected,
    },
    {
      icon: "🏙",
      label: "Livability Factor",
      pct: priceExplanation.livabilityContrib,
      value: Math.round(fMV * (priceExplanation.livabilityContrib / 100)),
      color: "#a78bfa",
    },
  ];

  const totalAdj = rows.slice(1).reduce((s, r) => s + r.value, 0);

  return (
    <GlassSection>
      <SectionTitle sub="Transparent AI reasoning behind this price">
        ✦ Why This Price?
      </SectionTitle>
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between py-2.5 px-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span style={{ fontSize: 16 }}>{row.icon}</span>
              <div>
                <p
                  style={{
                    fontSize: 13,
                    color: row.isNeutral ? "rgba(255,255,255,0.5)" : row.color,
                    fontWeight: 500,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  {row.label}
                </p>
                {/* R8: show Neutral when no builder, never show "0%" */}
                {!row.isNeutral && row.pct !== 0 && (
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                    {row.pct > 0 ? "+" : ""}
                    {row.pct}%
                  </p>
                )}
                {row.isNeutral && (
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                    No builder selected
                  </p>
                )}
              </div>
            </div>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: row.isNeutral ? "rgba(255,255,255,0.35)" : row.color,
                fontFamily: "'Playfair Display', serif",
                flexShrink: 0,
              }}
            >
              {row.isNeutral
                ? "Neutral"
                : row.value > 0
                  ? `+${formatINR(row.value)}`
                  : formatINR(Math.abs(row.value))}
            </span>
          </div>
        ))}

        {/* Divider */}
        <div
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(216,181,106,0.4), transparent)",
            margin: "8px 0",
          }}
        />

        {/* Final value */}
        <div
          className="flex items-center justify-between px-3 py-3 rounded-xl"
          style={{
            background: "rgba(216,181,106,0.08)",
            border: "1px solid rgba(216,181,106,0.25)",
          }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 18 }}>💎</span>
            <div>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#D8B56A",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                Final AI Value
              </p>
              <p style={{ fontSize: 11, color: "rgba(216,181,106,0.5)" }}>
                Base + {formatINR(totalAdj)} adjustments
              </p>
            </div>
          </div>
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#D8B56A",
            }}
          >
            {formatINR(fMV)}
          </span>
        </div>

        {/* Confidence explanation */}
        <div
          className="mt-3 px-3 py-2.5 rounded-xl flex items-start gap-2"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          <Shield
            size={14}
            style={{ color: "#60a5fa", marginTop: 2, flexShrink: 0 }}
          />
          <p
            style={{
              fontSize: 12,
              color: "rgba(185,198,216,0.6)",
              lineHeight: 1.5,
            }}
          >
            Confidence is{" "}
            <span style={{ color: "#60a5fa", fontWeight: 600 }}>
              {val.transparency.confidenceTier}
            </span>{" "}
            — based on {val.transparency.localityRecordCount} locality
            comparables, {val.transparency.dataLevel}-level data, and{" "}
            {val.confidence}% model confidence.
          </p>
        </div>

        {/* 3-Layer AVM Breakdown — shown when unifiedResult with layer data is available */}
        {unifiedResult && unifiedResult.layer1Value !== undefined && (
          <ThreeLayerAVMBreakdown unifiedResult={unifiedResult} area={area} />
        )}
      </div>
    </GlassSection>
  );
}

// ─── Scenario Graph SVG ───────────────────────────────────────────────────────

interface ScenarioGraphProps {
  baseNow: number; // current PSF (left anchor)
  bearForecast: number;
  baseForecast: number;
  bullForecast: number;
  timeLabel: string; // e.g. "6M", "1Y"
}

function ScenarioGraph({
  baseNow,
  bearForecast,
  baseForecast,
  bullForecast,
  timeLabel,
}: ScenarioGraphProps) {
  const W = 260;
  const H = 80;
  const PAD_L = 8;
  const PAD_R = 64; // room for right-side labels
  const PAD_V = 10;

  const minV = Math.min(baseNow, bearForecast) * 0.97;
  const maxV = Math.max(baseNow, bullForecast) * 1.03;
  const range = maxV - minV || 1;

  const xStart = PAD_L;
  const xEnd = W - PAD_R;

  function yPos(v: number) {
    return PAD_V + ((maxV - v) / range) * (H - PAD_V * 2);
  }

  const yNow = yPos(baseNow);
  const yBear = yPos(bearForecast);
  const yBase = yPos(baseForecast);
  const yBull = yPos(bullForecast);

  // Smooth curve using cubic bezier control point at 60% of x
  const cx = xStart + (xEnd - xStart) * 0.6;

  function curve(yS: number, yE: number) {
    return `M ${xStart} ${yS} C ${cx} ${yS}, ${cx} ${yE}, ${xEnd} ${yE}`;
  }

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative chart SVG
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Scenario forecast graph for ${timeLabel}`}
      style={{ display: "block", overflow: "visible" }}
    >
      {/* Scenario lines */}
      <path
        d={curve(yNow, yBear)}
        fill="none"
        stroke="#f87171"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        opacity={0.8}
      />
      <path
        d={curve(yNow, yBase)}
        fill="none"
        stroke="#D8B56A"
        strokeWidth={2}
        opacity={0.95}
      />
      <path
        d={curve(yNow, yBull)}
        fill="none"
        stroke="#4ade80"
        strokeWidth={1.5}
        opacity={0.8}
      />

      {/* Start dots */}
      <circle cx={xStart} cy={yNow} r={3} fill="rgba(255,255,255,0.3)" />

      {/* End dots */}
      <circle cx={xEnd} cy={yBear} r={3} fill="#f87171" />
      <circle cx={xEnd} cy={yBase} r={4} fill="#D8B56A" />
      <circle cx={xEnd} cy={yBull} r={3} fill="#4ade80" />

      {/* Right labels */}
      <text
        x={xEnd + 6}
        y={yBear + 4}
        fontSize={9}
        fill="#f87171"
        fontFamily="'Plus Jakarta Sans', sans-serif"
      >
        ₹{Math.round(bearForecast / 100) / 10}k
      </text>
      <text
        x={xEnd + 6}
        y={yBase + 4}
        fontSize={9}
        fill="#D8B56A"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontWeight="bold"
      >
        ₹{Math.round(baseForecast / 100) / 10}k
      </text>
      <text
        x={xEnd + 6}
        y={yBull + 4}
        fontSize={9}
        fill="#4ade80"
        fontFamily="'Plus Jakarta Sans', sans-serif"
      >
        ₹{Math.round(bullForecast / 100) / 10}k
      </text>

      {/* Axis labels */}
      <text
        x={xStart}
        y={H - 2}
        fontSize={8}
        fill="rgba(255,255,255,0.3)"
        fontFamily="'Plus Jakarta Sans', sans-serif"
      >
        Now
      </text>
      <text
        x={xEnd}
        y={H - 2}
        fontSize={8}
        fill="rgba(255,255,255,0.3)"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        textAnchor="end"
      >
        {timeLabel}
      </text>
    </svg>
  );
}

// ─── Forecast Card — single timeframe ────────────────────────────────────────

interface ForecastCardProps {
  label: string;
  timeLabel: string; // axis label
  currentPSF: number;
  forecastPSF: number;
  growthPct: number;
  lowerPSF: number;
  upperPSF: number;
}

function ForecastCard({
  label,
  timeLabel,
  currentPSF,
  forecastPSF,
  growthPct,
  lowerPSF,
  upperPSF,
}: ForecastCardProps) {
  const bearPSF = Math.round(forecastPSF * 0.95);
  const bullPSF = Math.round(forecastPSF * 1.07);
  const effectiveBear = lowerPSF > 0 ? lowerPSF : bearPSF;
  const effectiveBull = upperPSF > 0 ? upperPSF : bullPSF;
  const isPositive = growthPct >= 0;
  const trendColor = isPositive ? "#4ade80" : "#f87171";

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background:
          "linear-gradient(135deg, rgba(11,42,74,0.8) 0%, rgba(7,26,47,0.88) 100%)",
        border: "1px solid rgba(216,181,106,0.2)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 14,
            fontWeight: 700,
            color: "#D8B56A",
          }}
        >
          {label}
        </span>
        <span
          className="flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{
            fontSize: 11,
            fontWeight: 700,
            background: `${trendColor}18`,
            border: `1px solid ${trendColor}35`,
            color: trendColor,
          }}
        >
          <TrendingUp size={9} />
          {isPositive ? "+" : ""}
          {growthPct.toFixed(1)}%
        </span>
      </div>

      {/* Price trajectory */}
      <p
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.4)",
          marginBottom: 6,
        }}
      >
        {formatPSF(currentPSF)} →{" "}
        <span style={{ color: "#F4F7FF", fontWeight: 700 }}>
          {formatPSF(forecastPSF)}
        </span>
      </p>

      {/* SVG scenario graph */}
      <div style={{ marginBottom: 8 }}>
        <ScenarioGraph
          baseNow={currentPSF}
          bearForecast={effectiveBear}
          baseForecast={forecastPSF}
          bullForecast={effectiveBull}
          timeLabel={timeLabel}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {[
            { c: "#f87171", l: "Bear" },
            { c: "#D8B56A", l: "Base" },
            { c: "#4ade80", l: "Bull" },
          ].map((s) => (
            <div key={s.l} className="flex items-center gap-1">
              <div
                style={{
                  width: 8,
                  height: 2,
                  background: s.c,
                  borderRadius: 1,
                }}
              />
              <span
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.4)",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {s.l}
              </span>
            </div>
          ))}
        </div>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
          Range: {formatPSF(effectiveBear)} – {formatPSF(effectiveBull)}
        </span>
      </div>
    </div>
  );
}

// ─── Price Growth Intelligence ────────────────────────────────────────────────

function PriceGrowthPanel({
  locality,
  propertyType,
  unifiedResult,
}: {
  locality: string;
  propertyType: string;
  unifiedResult?: ValuationOutput;
}) {
  const forecast = computePriceForecast(locality, propertyType);

  // Long-term forecasts: 1yr, 3yr, 5yr
  const longTermHorizons = [
    {
      label: "1 Year",
      timeLabel: "1Y",
      psf: forecast.forecast.oneYear,
      growthPct: forecast.growthRates.oneYear,
      range: forecast.priceRange.oneYear,
    },
    {
      label: "3 Years",
      timeLabel: "3Y",
      psf: forecast.forecast.threeYear,
      growthPct: forecast.growthRates.threeYear,
      range: forecast.priceRange.threeYear,
    },
    {
      label: "5 Years",
      timeLabel: "5Y",
      psf: forecast.forecast.fiveYear,
      growthPct: forecast.growthRates.fiveYear,
      range: forecast.priceRange.fiveYear,
    },
  ];

  // Short-term exponential forecasts from unifiedResult (6/12/24 months)
  // If unifiedResult not available, derive from 1yr forecast
  const base6m = unifiedResult?.exponentialForecast6m
    ? unifiedResult.exponentialForecast6m / (forecast.currentPSF || 1)
    : 0;

  const shortTermHorizons: {
    label: string;
    timeLabel: string;
    psf: number;
    growthPct: number;
    lowerPSF: number;
    upperPSF: number;
  }[] =
    unifiedResult?.exponentialForecast6m !== undefined
      ? [
          {
            label: "6 Months",
            timeLabel: "6M",
            psf:
              typeof unifiedResult.exponentialForecast6m === "number" &&
              unifiedResult.exponentialForecast6m > 100
                ? unifiedResult.exponentialForecast6m /
                  Math.max(1, forecast.currentPSF)
                : forecast.currentPSF *
                  (1 + forecast.growthRates.oneYear / 200),
            growthPct: forecast.growthRates.oneYear / 2,
            lowerPSF: 0,
            upperPSF: 0,
          },
          {
            label: "12 Months",
            timeLabel: "12M",
            psf: forecast.forecast.oneYear,
            growthPct: forecast.growthRates.oneYear,
            lowerPSF: forecast.priceRange.oneYear[0],
            upperPSF: forecast.priceRange.oneYear[1],
          },
          {
            label: "24 Months",
            timeLabel: "24M",
            psf: Math.round(
              forecast.currentPSF *
                (1 + (forecast.growthRates.oneYear * 2) / 3 / 100),
            ),
            growthPct: (forecast.growthRates.oneYear * 2) / 3,
            lowerPSF: 0,
            upperPSF: 0,
          },
        ]
      : [
          {
            label: "6 Months",
            timeLabel: "6M",
            psf: Math.round(
              forecast.currentPSF *
                (1 + forecast.growthRates.oneYear / 2 / 100),
            ),
            growthPct: forecast.growthRates.oneYear / 2,
            lowerPSF: 0,
            upperPSF: 0,
          },
          {
            label: "12 Months",
            timeLabel: "12M",
            psf: forecast.forecast.oneYear,
            growthPct: forecast.growthRates.oneYear,
            lowerPSF: forecast.priceRange.oneYear[0],
            upperPSF: forecast.priceRange.oneYear[1],
          },
          {
            label: "24 Months",
            timeLabel: "24M",
            psf: Math.round(
              forecast.currentPSF *
                (1 + (forecast.growthRates.threeYear * 0.55) / 100),
            ),
            growthPct: forecast.growthRates.threeYear * 0.55,
            lowerPSF: 0,
            upperPSF: 0,
          },
        ];

  // suppress unused base6m warning
  void base6m;

  return (
    <GlassSection>
      <SectionTitle sub="AI-powered price trajectory forecast">
        📈 How Price May Rise
      </SectionTitle>

      {/* Short-term: 6/12/24 month scenario graphs */}
      <div className="mb-5">
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            color: "rgba(96,165,250,0.7)",
            marginBottom: 10,
          }}
        >
          ⚡ Short-Term Forecasts (6 / 12 / 24 Months)
        </p>
        <div className="space-y-3">
          {shortTermHorizons.map((h) => (
            <ForecastCard
              key={h.label}
              label={h.label}
              timeLabel={h.timeLabel}
              currentPSF={forecast.currentPSF}
              forecastPSF={h.psf}
              growthPct={h.growthPct}
              lowerPSF={h.lowerPSF}
              upperPSF={h.upperPSF}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background:
            "linear-gradient(90deg, transparent, rgba(216,181,106,0.3), transparent)",
          margin: "12px 0",
        }}
      />

      {/* Long-term: 1yr, 3yr, 5yr scenario graphs */}
      <div className="mb-5">
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            color: "rgba(216,181,106,0.7)",
            marginBottom: 10,
          }}
        >
          📊 Long-Term Forecasts (1 / 3 / 5 Years)
        </p>
        <div className="space-y-3">
          {longTermHorizons.map((h) => (
            <ForecastCard
              key={h.label}
              label={h.label}
              timeLabel={h.timeLabel}
              currentPSF={forecast.currentPSF}
              forecastPSF={h.psf}
              growthPct={h.growthPct}
              lowerPSF={h.range[0]}
              upperPSF={h.range[1]}
            />
          ))}
        </div>
      </div>

      {/* Divider before growth drivers */}
      <div
        style={{
          height: 1,
          background:
            "linear-gradient(90deg, transparent, rgba(74,222,128,0.25), transparent)",
          margin: "12px 0",
        }}
      />

      {/* Growth drivers — clearly separated */}
      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            color: "rgba(74,222,128,0.6)",
            marginBottom: 8,
          }}
        >
          🌱 Growth Drivers for {locality || "this area"}
        </p>
        <div className="space-y-2">
          {forecast.growthDrivers.map((driver) => (
            <div key={driver} className="flex items-start gap-2">
              <span
                style={{
                  fontSize: 11,
                  color: "#4ade80",
                  marginTop: 2,
                  flexShrink: 0,
                }}
              >
                ▲
              </span>
              <p style={{ fontSize: 12, color: "rgba(185,198,216,0.7)" }}>
                {driver}
              </p>
            </div>
          ))}
        </div>

        {/* Market outlook */}
        <div
          className="mt-3 p-3 rounded-xl"
          style={{
            background: "rgba(216,181,106,0.06)",
            border: "1px solid rgba(216,181,106,0.15)",
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: "rgba(216,181,106,0.8)",
              lineHeight: 1.6,
            }}
          >
            {forecast.marketOutlook}
          </p>
        </div>
      </div>
    </GlassSection>
  );
}

// ─── Comparable Properties ────────────────────────────────────────────────────

interface ComparableProp {
  name: string;
  locality: string;
  psf: number;
  similarityPct: number;
  distance: string;
}

function getComparables(
  locality: string,
  propertyType: string,
  psf: number,
  propertyLat?: number,
  propertyLng?: number,
): ComparableProp[] {
  const normalizedLocality = locality.toLowerCase();
  const normalizedType = propertyType.toLowerCase();

  // Find matching projects
  const matching = BANGALORE_PROJECTS.filter((p) => {
    const pType = p.property_type.toLowerCase();
    const pLoc = p.locality.toLowerCase();
    const sameType =
      pType.includes(normalizedType) ||
      normalizedType.includes(pType.split(" ")[0]);
    const nearbyLoc =
      pLoc.includes(normalizedLocality) ||
      normalizedLocality.includes(pLoc) ||
      p.zone.toLowerCase().includes("bangalore");
    return sameType && nearbyLoc;
  });

  // Fall back to any project in same type
  const pool =
    matching.length >= 3
      ? matching
      : BANGALORE_PROJECTS.filter((p) => {
          const pType = p.property_type.toLowerCase();
          return (
            pType.includes("apartment") || normalizedType.includes("apartment")
          );
        });

  // Compute PSF from price range, compute similarity
  const withPSF = pool
    .map((p) => {
      const avgPrice = (p.price_min + p.price_max) / 2;
      const estimatedArea = 1000; // median area assumption
      const projectPSF = Math.round(avgPrice / estimatedArea);
      const psfDiff = Math.abs(projectPSF - psf) / psf;
      const locationSim = p.locality
        .toLowerCase()
        .includes(normalizedLocality.substring(0, 4))
        ? 25
        : 0;
      const similarityPct = Math.min(
        99,
        Math.round(100 - psfDiff * 80 + locationSim),
      );
      return { p, projectPSF, similarityPct };
    })
    .filter((x) => x.similarityPct >= 40 && x.projectPSF > 3000)
    .sort((a, b) => b.similarityPct - a.similarityPct)
    .slice(0, 5);

  return withPSF.map(({ p, projectPSF, similarityPct }) => {
    // R4: Use real haversine distance — no Math.random().
    // If project has lat/lng AND property has lat/lng, compute real distance.
    // Otherwise show "Distance unavailable" — never random values.
    let distanceDisplay: string;
    if (
      propertyLat &&
      propertyLng &&
      propertyLat !== 0 &&
      propertyLng !== 0 &&
      p.latitude &&
      p.longitude
    ) {
      const km = haversineDistance(
        propertyLat,
        propertyLng,
        p.latitude,
        p.longitude,
      );
      distanceDisplay =
        km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
    } else {
      distanceDisplay = "Distance unavailable";
    }

    return {
      name: p.name,
      locality: p.locality,
      psf: projectPSF,
      similarityPct,
      distance: distanceDisplay,
    };
  });
}

function similarityBadge(pct: number): { label: string; color: string } {
  if (pct >= 85) return { label: "Very High", color: "#4ade80" };
  if (pct >= 70) return { label: "High", color: "#D8B56A" };
  return { label: "Medium", color: "#f97316" };
}

function ComparablePropertiesPanel({
  locality,
  propertyType,
  psf,
  lat,
  lng,
  outlierCount,
}: {
  locality: string;
  propertyType: string;
  psf: number;
  lat?: number;
  lng?: number;
  outlierCount?: number;
}) {
  const comps = getComparables(locality, propertyType, psf, lat, lng);

  if (comps.length === 0) {
    return (
      <div
        className="rounded-2xl p-4 text-center"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
          Insufficient comparable data for this locality / property type
        </p>
      </div>
    );
  }

  return (
    <GlassSection>
      <div className="flex items-center justify-between mb-4">
        <SectionTitle sub="Similar properties used for valuation reference">
          🏘 Top Comparable Properties
        </SectionTitle>
        {outlierCount !== undefined && outlierCount > 0 && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0"
            style={{
              background: "rgba(248,113,113,0.12)",
              border: "1px solid rgba(248,113,113,0.3)",
              color: "#f87171",
              fontSize: 10,
            }}
          >
            {outlierCount} outlier{outlierCount > 1 ? "s" : ""} removed
          </span>
        )}
      </div>
      <div className="space-y-3">
        {comps.map((c, idx) => {
          const sim = similarityBadge(c.similarityPct);
          const simBarWidth = Math.min(c.similarityPct, 100);
          const simBarColor =
            c.similarityPct >= 85
              ? "#4ade80"
              : c.similarityPct >= 70
                ? "#D8B56A"
                : "#f97316";

          return (
            <div
              key={`${c.name}-${idx}`}
              className="rounded-2xl p-4"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background =
                  "rgba(255,255,255,0.06)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background =
                  "rgba(255,255,255,0.03)";
              }}
            >
              {/* Top row: name + match badge */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ fontSize: 14 }}>🏢</span>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#F4F7FF",
                        fontFamily: "'Playfair Display', serif",
                        wordBreak: "break-word",
                        lineHeight: 1.3,
                      }}
                    >
                      {c.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <MapPin
                      size={10}
                      style={{ color: "#D8B56A", flexShrink: 0 }}
                    />
                    <span
                      style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}
                    >
                      {c.locality}
                    </span>
                    <span
                      style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}
                    >
                      ·
                    </span>
                    <span
                      style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}
                    >
                      {c.distance}
                    </span>
                  </div>
                </div>
                <span
                  className="px-2 py-1 rounded-full flex-shrink-0"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    background: `${sim.color}15`,
                    border: `1px solid ${sim.color}35`,
                    color: sim.color,
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.similarityPct}% match
                </span>
              </div>

              {/* Price + similarity bar row */}
              <div className="flex items-center justify-between gap-3 mt-2">
                <div>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#D8B56A",
                      fontFamily: "'Playfair Display', serif",
                    }}
                  >
                    {formatPSF(c.psf)}
                  </span>
                </div>
                <div className="flex-1 max-w-32">
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}
                    >
                      Similarity
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: simBarColor,
                      }}
                    >
                      {sim.label}
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${simBarWidth}%`,
                        background: `linear-gradient(90deg, ${simBarColor}80, ${simBarColor})`,
                        transition: "width 0.8s ease",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {comps.length < 3 && (
          <p
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.3)",
              textAlign: "center",
              paddingTop: 4,
            }}
          >
            Insufficient comparable data — showing {comps.length} result
            {comps.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </GlassSection>
  );
}

// ─── ValuBrix Score Panel ─────────────────────────────────────────────────────

function ValuBrixScorePanel({
  locality,
  propertyType,
}: {
  locality: string;
  propertyType: string;
}) {
  const score = computeValuBrixScore(locality, propertyType);

  const tierColor =
    score.tier === "Excellent"
      ? "#4ade80"
      : score.tier === "Good"
        ? "#D8B56A"
        : score.tier === "Average"
          ? "#f97316"
          : "#f87171";

  const components = [
    {
      label: "Growth",
      value: score.growth,
      max: 20,
      sub: score.breakdown.growthLabel,
    },
    {
      label: "Liquidity",
      value: score.liquidity,
      max: 20,
      sub: score.breakdown.liquidityLabel,
    },
    {
      label: "Yield",
      value: score.yield,
      max: 20,
      sub: score.breakdown.yieldLabel,
    },
    {
      label: "Demand",
      value: score.demand,
      max: 20,
      sub: score.breakdown.demandLabel,
    },
    {
      label: "Infrastructure",
      value: score.infrastructure,
      max: 20,
      sub: score.breakdown.infraLabel,
    },
  ];

  return (
    <GlassSection>
      <SectionTitle sub="Composite investment intelligence score">
        ⭐ ValuBrix Score
      </SectionTitle>
      <div className="flex items-center gap-5 mb-5">
        {/* Circular score */}
        <div
          className="flex flex-col items-center justify-center rounded-2xl flex-shrink-0"
          style={{
            width: 88,
            height: 88,
            background: `${tierColor}12`,
            border: `2px solid ${tierColor}40`,
          }}
        >
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 30,
              fontWeight: 700,
              color: tierColor,
              lineHeight: 1,
            }}
          >
            {score.total}
          </span>
          <span style={{ fontSize: 10, color: `${tierColor}80`, marginTop: 2 }}>
            /100
          </span>
        </div>
        <div>
          <span
            className="px-3 py-1 rounded-full text-xs font-bold mb-2 inline-block"
            style={{
              background: `${tierColor}18`,
              border: `1px solid ${tierColor}40`,
              color: tierColor,
            }}
          >
            {score.tier}
          </span>
          <p
            style={{
              fontSize: 12,
              color: "rgba(185,198,216,0.65)",
              lineHeight: 1.5,
              maxWidth: 200,
            }}
          >
            {score.interpretation}
          </p>
        </div>
      </div>
      {/* Component breakdown */}
      <div className="space-y-2.5">
        {components.map((c) => {
          const pct = (c.value / c.max) * 100;
          const barColor =
            pct >= 75 ? "#4ade80" : pct >= 50 ? "#D8B56A" : "#f97316";
          return (
            <div key={c.label}>
              <div className="flex justify-between items-center mb-1">
                <span
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.6)",
                    fontWeight: 600,
                  }}
                >
                  {c.label}
                </span>
                <span
                  style={{ fontSize: 12, fontWeight: 700, color: barColor }}
                >
                  {c.value}/{c.max}
                </span>
              </div>
              <div
                className="h-1.5 rounded-full mb-0.5"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${barColor}99, ${barColor})`,
                    transition: "width 1s ease",
                  }}
                />
              </div>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                {c.sub}
              </p>
            </div>
          );
        })}
      </div>
    </GlassSection>
  );
}

// ─── Investment Intelligence Panel ────────────────────────────────────────────

function InvestmentIntelligencePanel({
  locality,
  propertyType,
  area,
}: {
  locality: string;
  propertyType: string;
  area: number;
}) {
  const intel = computeInvestmentIntelligence(locality, propertyType, area);

  const riskColor =
    intel.riskLevel === "Low"
      ? "#4ade80"
      : intel.riskLevel === "Medium"
        ? "#D8B56A"
        : "#f87171";

  return (
    <GlassSection>
      <SectionTitle sub="AI-powered return projections and risk assessment">
        💰 Investment Intelligence
      </SectionTitle>

      {/* Market classification */}
      <div
        className="mb-4 px-3 py-2 rounded-xl inline-block"
        style={{
          background: "rgba(216,181,106,0.08)",
          border: "1px solid rgba(216,181,106,0.2)",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: "#D8B56A" }}>
          {intel.marketClassification}
        </span>
      </div>

      {/* IRR grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "1Y IRR", value: intel.irrProjection.oneYear, trend: "+" },
          { label: "3Y IRR", value: intel.irrProjection.threeYear, trend: "+" },
          { label: "5Y IRR", value: intel.irrProjection.fiveYear, trend: "+" },
        ].map((h) => (
          <div
            key={h.label}
            className="rounded-xl p-3 text-center"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              {h.label}
            </p>
            <p
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 18,
                fontWeight: 700,
                color: "#4ade80",
              }}
            >
              {h.trend}
              {h.value}%
            </p>
          </div>
        ))}
      </div>

      {/* Rental income + ROI */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div
          className="rounded-xl p-3"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              marginBottom: 4,
            }}
          >
            Est. Monthly Rent
          </p>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 16,
              fontWeight: 700,
              color: "#D8B56A",
            }}
          >
            {formatINR(intel.rentalIncomeProjection.monthly)}/mo
          </p>
        </div>
        <div
          className="rounded-xl p-3"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              marginBottom: 4,
            }}
          >
            5-Year ROI
          </p>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 16,
              fontWeight: 700,
              color: "#4ade80",
            }}
          >
            +{intel.fiveYearROI}%
          </p>
        </div>
      </div>

      {/* Risk flags */}
      {intel.riskFlags.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={12} style={{ color: riskColor }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: riskColor,
              }}
            >
              Risk Level: {intel.riskLevel}
            </span>
          </div>
          <div className="space-y-1">
            {intel.riskFlags.map((f) => (
              <div key={f} className="flex items-start gap-2">
                <span style={{ fontSize: 11, color: riskColor, flexShrink: 0 }}>
                  ⚠
                </span>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                  {f}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Growth drivers */}
      {intel.growthDrivers.length > 0 && (
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "rgba(74,222,128,0.7)",
              marginBottom: 6,
            }}
          >
            Growth Drivers
          </p>
          <div className="space-y-1">
            {intel.growthDrivers.map((d) => (
              <div key={d} className="flex items-start gap-2">
                <ArrowRight
                  size={11}
                  style={{ color: "#4ade80", marginTop: 2, flexShrink: 0 }}
                />
                <p style={{ fontSize: 12, color: "rgba(185,198,216,0.65)" }}>
                  {d}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassSection>
  );
}

// ─── Listing Card ─────────────────────────────────────────────────────────────

interface ListingCardProps {
  listing: Record<string, unknown>;
  badges: string[];
  isRent?: boolean;
}

function ListingCard({ listing, badges, isRent = false }: ListingCardProps) {
  const locality = String(listing.locality || listing.location || "");
  const price = Number(listing.price || 0);
  const area = Number(listing.area || 0);
  const bhk = listing.bhk ? String(listing.bhk) : "";
  const project = listing.project ? String(listing.project) : "";
  const builder = listing.builder ? String(listing.builder) : "";
  const propertyType = String(
    listing.propertyType || listing.type || "property",
  );

  const BADGE_COLORS: Record<string, string> = {
    "High Liquidity": "#4ade80",
    "Distress Deal": "#f87171",
    "High Yield": "#D8B56A",
    "Hot Market": "#f97316",
    "High Demand": "#4ade80",
    "Good Yield": "#60a5fa",
    "Furnished Premium": "#D8B56A",
  };

  return (
    <div
      className="p-6 rounded-2xl"
      style={{
        /* Fix 5: Rent cards use premium dark background — no white bleed */
        background: isRent
          ? "linear-gradient(135deg, #111827 0%, #1f2937 100%)"
          : "linear-gradient(135deg, rgba(11,42,74,0.85) 0%, rgba(7,26,47,0.92) 100%)",
        border: isRent
          ? "1px solid rgba(59,130,246,0.2)"
          : "1px solid rgba(255,255,255,0.08)",
        boxShadow: isRent ? "0 4px 32px rgba(0,0,0,0.5)" : "none",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
      data-ocid="results_step.listing_card"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p
            className="font-bold"
            style={{
              fontSize: 15,
              color: "#F4F7FF",
              fontFamily: "'Playfair Display', serif",
            }}
          >
            {bhk && `${bhk} BHK `}
            {propertyType.charAt(0).toUpperCase() + propertyType.slice(1)}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <MapPin size={11} style={{ color: "#D8B56A", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
              {locality}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p
            className="font-bold"
            style={{
              /* Fix 5: Rent price highlighted in gold */
              color: isRent ? "#D8B56A" : "#D8B56A",
              fontSize: 18,
              whiteSpace: "nowrap",
              fontFamily: "'Playfair Display', serif",
            }}
          >
            {formatINR(price)}
            {isRent && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                /mo
              </span>
            )}
          </p>
          {area > 0 && (
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              {area} sqft
            </p>
          )}
        </div>
      </div>
      {(project || builder) && (
        <p
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            marginBottom: 8,
          }}
        >
          {project || builder}
        </p>
      )}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <span
              key={b}
              className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: `${BADGE_COLORS[b] ?? "#D8B56A"}18`,
                border: `1px solid ${BADGE_COLORS[b] ?? "#D8B56A"}40`,
                color: BADGE_COLORS[b] ?? "#D8B56A",
                fontSize: 10,
              }}
            >
              {b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function computeListingBadges(
  listing: Record<string, unknown>,
  mode: "sale" | "rent",
  areaLiquidityScore = 0,
  areaMarketHeat = 0,
): string[] {
  const badges: string[] = [];
  const price = Number(listing.price || 0);
  const area = Number(listing.area || 0);
  const momentum = String(listing.marketMomentum || "");

  // Hot Market — from listing tag or area heat
  if (momentum === "hot" || areaMarketHeat > 70) badges.push("Hot Market");

  if (mode === "rent") {
    // Good Yield
    if (area > 0 && price > 0) {
      const annualRent = price * 12;
      const estimatedValue = area * 8000;
      const yield_ = (annualRent / estimatedValue) * 100;
      if (yield_ > 3.5) badges.push("Good Yield");
    }
    // Furnished premium
    const furnishing = String(listing.furnishing || "").toLowerCase();
    if (furnishing.includes("full")) badges.push("Furnished Premium");
    // High Demand
    const tenantDemand = Number(listing.tenantDemand || 0);
    if (tenantDemand > 70 || areaLiquidityScore > 65)
      badges.push("High Demand");
  } else {
    // sale
    // Distress deal
    const tag = String(listing.tag || listing.dealType || "").toLowerCase();
    if (tag.includes("distress") || tag.includes("motivated"))
      badges.push("Distress Deal");
    // High Yield (investment)
    if (area > 0 && price > 0) {
      const estimatedMonthlyRent = area * 30;
      const annualRent = estimatedMonthlyRent * 12;
      const yield_ = (annualRent / price) * 100;
      if (yield_ > 4) badges.push("High Yield");
    }
    // High Liquidity
    const liquidity = Number(listing.liquidityScore || 0);
    if (liquidity > 70 || areaLiquidityScore > 65)
      badges.push("High Liquidity");
  }

  return badges.slice(0, 2); // Max 2 badges per card
}

// ─── AI Learning Section ──────────────────────────────────────────────────────

function AILearnSection({
  locality,
  propertyType,
}: {
  locality: string;
  propertyType: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <GlassSection>
        <div className="flex items-start gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(216,181,106,0.12)",
              border: "1px solid rgba(216,181,106,0.25)",
            }}
          >
            <span style={{ fontSize: 20 }}>🧠</span>
          </div>
          <div className="flex-1 min-w-0">
            <p
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 16,
                fontWeight: 700,
                color: "#D8B56A",
                marginBottom: 4,
              }}
            >
              Help Improve AI Accuracy
            </p>
            <p
              style={{
                fontSize: 13,
                color: "rgba(185,198,216,0.6)",
                lineHeight: 1.5,
                marginBottom: 12,
              }}
            >
              If you know the actual sold price for a property in{" "}
              <span style={{ color: "rgba(216,181,106,0.8)" }}>{locality}</span>
              , share it. Your data directly improves ValuBrix's AI learning
              dataset.
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              data-ocid="results_step.submit_sold_price_trigger"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200"
              style={{
                background: "rgba(216,181,106,0.12)",
                border: "1px solid rgba(216,181,106,0.3)",
                color: "#D8B56A",
                cursor: "pointer",
              }}
            >
              <Layers size={14} />
              Submit Actual Sold Price
            </button>
          </div>
        </div>
      </GlassSection>

      <SubmitSoldPriceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialLocality={locality}
        initialPropertyType={propertyType}
      />
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResultsStep({
  flowData,
  mode,
  onBack,
}: ResultsStepProps) {
  const [loading, setLoading] = useState(true);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlacesData | null>(
    null,
  );
  // FIX 3: Filter state for NearbyPlacesPanel — synced with map infra toggles
  const [nearbyFilters, setNearbyFilters] = useState<Set<NearbyCategory>>(
    new Set(),
  );
  // R3: collapsible main result card — collapsed by default
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [result, setResult] = useState<{
    valuation?: ReturnType<typeof valuate>;
    unifiedResult?: ValuationOutput;
    areaIntel?: ReturnType<typeof getAreaIntelligence>;
    rentEstimate?: ReturnType<typeof estimateRent>;
    rentMetrics?: ReturnType<typeof getLocalityRentMetrics>;
    listings?: Array<Record<string, unknown>>;
    proCards?: {
      liquidityScore: number;
      marketHeat: number;
      distressFlag: boolean;
      irr: number;
      confidence: number;
    };
    investmentIntel?: ReturnType<typeof computeInvestmentIntelligence>;
    valuBrixScore?: ReturnType<typeof computeValuBrixScore>;
  }>({});

  const location = flowData.location;
  const propType = flowData.propertyType?.propertyType ?? "apartment";
  const budgetArea = flowData.budgetOrArea;
  const filters = flowData.filters;

  const locality = location?.locality ?? "";
  const city = location?.city ?? "Bangalore";
  const lat = location?.lat ?? 0;
  const lng = location?.lng ?? 0;
  const area = budgetArea?.area ?? 1200;
  const bhk = budgetArea?.bhk ? Number(budgetArea.bhk) : 2;
  const builder = filters?.builder ?? "";
  const project = filters?.project ?? "";
  const minBudget = (budgetArea?.minBudget ?? 0) * 1_00_000;
  const maxBudget = (budgetArea?.maxBudget ?? 0) * 1_00_000;

  useEffect(() => {
    let cancelled = false;
    async function compute() {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 600));
      if (cancelled) return;
      try {
        // BUG FIX: Resolve effective coordinates — look up from localityCoords if lat/lng are 0
        let effectiveLat = lat && lat !== 0 ? lat : 0;
        let effectiveLng = lng && lng !== 0 ? lng : 0;
        if (effectiveLat === 0 || effectiveLng === 0) {
          const coords = getCoords(locality);
          if (coords) {
            effectiveLat = coords.lat;
            effectiveLng = coords.lng;
          }
        }
        // Final fallback to Bangalore centre only for AI area score computations (not POI distances)
        const areaLat = effectiveLat !== 0 ? effectiveLat : 12.97;
        const areaLng = effectiveLng !== 0 ? effectiveLng : 77.59;

        if (mode === "valuation" || mode === "sell") {
          const val = valuate({
            locality,
            lat: effectiveLat || undefined,
            lng: effectiveLng || undefined,
            city,
            builder: builder || "",
            builderName: builder || "",
            projectName: project || "",
            area: area || 1200,
            floor: 5,
            propertyType: propType,
            bhk: bhk,
          });

          // Compute unified result for layer breakdown (additive — non-blocking)
          let unifiedResult: ValuationOutput | undefined;
          try {
            unifiedResult = await valuateProperty({
              locality,
              propertyType: propType as
                | "apartment"
                | "villa"
                | "plot"
                | "commercial",
              area: area || 1200,
              builder: builder || undefined,
              project: project || undefined,
              lat: effectiveLat || undefined,
              lng: effectiveLng || undefined,
              age: undefined,
              floor: "5",
            });
          } catch (_e) {
            unifiedResult = undefined;
          }

          const areaIntel = getAreaIntelligence(locality, areaLat, areaLng);
          const liquidityScore =
            Math.round(
              (val.scores.demand * 0.4 +
                val.scores.location * 0.35 +
                val.scores.tech * 0.25) *
                100,
            ) / 100;
          const marketHeat = Math.round(
            areaIntel.investmentScore * 0.5 + areaIntel.demandScore * 0.5,
          );
          const irr = Math.round(areaIntel.priceTrend3Y / 3 + 2);
          const confidence = val.transparency.confidenceScore;
          const distressFlag =
            val.deal !== null &&
            typeof val.deal === "object" &&
            "score" in val.deal &&
            (val.deal as { score: number }).score < 30;
          if (!cancelled) {
            setResult({
              valuation: val,
              unifiedResult,
              areaIntel,
              proCards: {
                liquidityScore: Math.min(Math.round(liquidityScore), 100),
                marketHeat: Math.min(marketHeat, 100),
                distressFlag: Boolean(distressFlag),
                irr,
                confidence,
              },
            });
          }
        } else if (mode === "rent") {
          const estimatedPSF = 8000;
          const propValue = (area || 1000) * estimatedPSF;
          const rentEst = estimateRent({
            locality,
            bhk: bhk,
            propertyType: propType,
            furnishing: "semi-furnished",
            floor: 5,
            area: area || 1000,
            propertyValue: propValue,
          });
          const allListings = getActiveListingsForBuyer("rent");
          const filtered = allListings
            .filter((l: Record<string, unknown>) => {
              const lLoc = String(l.locality || l.location || "")
                .toLowerCase()
                .trim();
              const lCity = String(l.city || "")
                .toLowerCase()
                .trim();
              const matchLoc =
                !locality ||
                lLoc.includes(locality.toLowerCase()) ||
                locality.toLowerCase().includes(lLoc);
              const matchCity = !city || lCity.includes(city.toLowerCase());
              const lPrice = Number(l.price || 0);
              const matchBudget =
                !minBudget ||
                !maxBudget ||
                (lPrice >= minBudget && lPrice <= maxBudget);
              return matchLoc || (matchCity && matchBudget);
            })
            .slice(0, 6);
          if (!cancelled)
            setResult({
              rentEstimate: rentEst,
              listings: filtered,
              rentMetrics: getLocalityRentMetrics(locality),
            });
        } else if (mode === "area") {
          const areaIntel = getAreaIntelligence(
            locality,
            areaLat,
            areaLng,
            flowData.propertyType?.propertyType ?? null,
          );
          if (!cancelled) setResult({ areaIntel });
        } else {
          // buy
          const allListings = getActiveListingsForBuyer("sale");
          const filtered = allListings
            .filter((l: Record<string, unknown>) => {
              const lLoc = String(l.locality || l.location || "")
                .toLowerCase()
                .trim();
              const lCity = String(l.city || "")
                .toLowerCase()
                .trim();
              const matchLoc =
                !locality ||
                lLoc.includes(locality.toLowerCase()) ||
                locality.toLowerCase().includes(lLoc);
              const matchCity = !city || lCity.includes(city.toLowerCase());
              const lPrice = Number(l.price || 0);
              const matchBudget =
                !minBudget ||
                !maxBudget ||
                (lPrice >= minBudget && lPrice <= maxBudget);
              return matchLoc || (matchCity && matchBudget);
            })
            .slice(0, 6);
          const areaIntel = getAreaIntelligence(locality, areaLat, areaLng);
          const investmentIntel = computeInvestmentIntelligence(
            locality,
            propType,
            area || 1200,
          );
          const valuBrixScore = computeValuBrixScore(locality, propType);
          if (!cancelled)
            setResult({
              listings: filtered,
              areaIntel,
              investmentIntel,
              valuBrixScore,
            });
        }
      } catch (err) {
        console.error("[ResultsStep] compute error:", err);
        if (!cancelled) setResult({});
      }
      if (!cancelled) setLoading(false);
    }
    if (locality) {
      void compute();
    } else {
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [
    locality,
    lat,
    lng,
    mode,
    area,
    bhk,
    builder,
    project,
    propType,
    city,
    minBudget,
    maxBudget,
    flowData.propertyType?.propertyType,
  ]);

  // ── Nearby places: OSRM-based async load on mount when lat/lng available ──────
  useEffect(() => {
    if (!locality) return;
    // Resolve effective coordinates from props or locality DB
    let effectiveLat = lat && lat !== 0 ? lat : 0;
    let effectiveLng = lng && lng !== 0 ? lng : 0;

    if (effectiveLat === 0 || effectiveLng === 0) {
      const coords = getCoords(locality);
      if (coords) {
        effectiveLat = coords.lat;
        effectiveLng = coords.lng;
      }
    }

    // If still 0,0 after lookup — no valid coords, skip distance computation
    if (effectiveLat === 0 || effectiveLng === 0) {
      setNearbyPlaces(null);
      return;
    }

    let cancelled = false;

    async function loadNearby() {
      setNearbyLoading(true);
      try {
        // ── Build POI lists for each category ────────────────────────────────
        // Metros
        const metroInputs: POIInput[] = METROS.filter((m) => m.operational).map(
          (m) => ({
            name: m.name,
            lat: m.lat,
            lng: m.lng,
            type: "metro" as const,
            line: m.line,
          }),
        );

        // Tech parks
        const techInputs: POIInput[] = TECH_PARKS.map((t) => ({
          name: t.name,
          lat: t.lat,
          lng: t.lng,
          type: "tech_park" as const,
        }));

        // Hospitals — build POIInputs from AMENITIES directly
        const hospitalInputsReal: POIInput[] = AMENITIES.filter(
          (a) => a.type === "hospital",
        ).map((a) => ({
          name: a.name,
          lat: a.lat,
          lng: a.lng,
          type: "hospital" as const,
        }));

        const schoolInputsReal: POIInput[] = AMENITIES.filter(
          (a) => a.type === "school",
        ).map((a) => ({
          name: a.name,
          lat: a.lat,
          lng: a.lng,
          type: "school" as const,
        }));

        // Malls
        const mallInputs: POIInput[] = MALLS.map((m) => ({
          name: m.name,
          lat: m.lat,
          lng: m.lng,
          type: "mall" as const,
        }));

        // Bus stops
        const busInputs: POIInput[] = BUS_STOPS.map((b) => ({
          name: b.name,
          lat: b.lat,
          lng: b.lng,
          type: "bus_stop" as const,
        }));

        // Railway stations
        const railInputs: POIInput[] = RAILWAY_STATIONS.map((r) => ({
          name: r.name,
          lat: r.lat,
          lng: r.lng,
          type: "railway" as const,
        }));

        // Airport
        const airportInput: POIInput[] = [
          {
            name: AIRPORT_KIA.name,
            lat: AIRPORT_KIA.lat,
            lng: AIRPORT_KIA.lng,
            type: "airport" as const,
          },
        ];

        // Colleges
        const collegeInputs: POIInput[] = COLLEGES_REGISTRY.map((c) => ({
          name: c.name,
          lat: c.lat,
          lng: c.lng,
          type: "college" as const,
        }));

        // Highways
        const highwayInputs: POIInput[] = HIGHWAY_POIS.map((h) => ({
          name: h.name,
          lat: h.lat,
          lng: h.lng,
          type: "highway" as const,
        }));

        // ── Fire all OSRM batch requests in parallel ───────────────────────
        const [
          metroResults,
          techResults,
          hospitalResults,
          schoolResults,
          mallResults,
          busResults,
          railResults,
          airportResults,
          collegeResults,
          highwayResults,
        ] = await Promise.all([
          getOSRMDistances(effectiveLat, effectiveLng, metroInputs, 20),
          getOSRMDistances(effectiveLat, effectiveLng, techInputs, 15),
          getOSRMDistances(effectiveLat, effectiveLng, hospitalInputsReal, 15),
          getOSRMDistances(effectiveLat, effectiveLng, schoolInputsReal, 15),
          getOSRMDistances(effectiveLat, effectiveLng, mallInputs, 15),
          getOSRMDistances(effectiveLat, effectiveLng, busInputs, 15),
          getOSRMDistances(effectiveLat, effectiveLng, railInputs, 20),
          getOSRMDistances(effectiveLat, effectiveLng, airportInput, 60),
          getOSRMDistances(effectiveLat, effectiveLng, collegeInputs, 15),
          getOSRMDistances(effectiveLat, effectiveLng, highwayInputs, 20),
        ]);

        if (cancelled) return;

        // ── Map OSRMResult → OSRMPlaceEntry ────────────────────────────────
        function toEntry(
          r: OSRMResult,
          detailFn?: (name: string) => string | undefined,
        ): OSRMPlaceEntry {
          return {
            name: r.name,
            osrmKm: r.osrmKm,
            osrmDurationMins: r.osrmDurationMins,
            detail: detailFn?.(r.name),
          };
        }

        // Metro line detail lookup
        const metroLineMap = new Map(METROS.map((m) => [m.name, m.line]));

        const airport = airportResults[0] ? toEntry(airportResults[0]) : null;

        setNearbyPlaces({
          metros: metroResults
            .slice(0, 3)
            .map((r) =>
              toEntry(r, (n) =>
                metroLineMap.get(n) ? `${metroLineMap.get(n)} Line` : undefined,
              ),
            ),
          techHubs: techResults.slice(0, 3).map((r) => toEntry(r)),
          hospitals: hospitalResults.slice(0, 3).map((r) => toEntry(r)),
          schools: schoolResults.slice(0, 3).map((r) => toEntry(r)),
          colleges: collegeResults.slice(0, 3).map((r) => toEntry(r)),
          malls: mallResults.slice(0, 3).map((r) => toEntry(r)),
          busStops: busResults.slice(0, 3).map((r) => toEntry(r)),
          railwayStations: railResults.slice(0, 3).map((r) => toEntry(r)),
          highways: highwayResults.slice(0, 3).map((r) => toEntry(r)),
          airport,
          airportKm: airport?.osrmKm ?? 0,
          airportMins: airport?.osrmDurationMins ?? 0,
        });
      } catch (err) {
        console.error("[ResultsStep] nearbyPlaces OSRM error:", err);
        if (!cancelled) setNearbyPlaces(null);
      } finally {
        if (!cancelled) setNearbyLoading(false);
      }
    }

    loadNearby();
    return () => {
      cancelled = true;
    };
  }, [locality, lat, lng]);

  const cardBase: React.CSSProperties = {
    background:
      "linear-gradient(135deg, rgba(11,42,74,0.85) 0%, rgba(7,26,47,0.92) 100%)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 18,
    padding: "20px",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  };

  // Derived area scores for badge context
  const areaLiquidityScore = result.areaIntel
    ? Math.round(
        result.areaIntel.investmentScore * 0.5 +
          result.areaIntel.growthScore * 0.5,
      )
    : 0;
  const areaMarketHeat = result.areaIntel
    ? Math.round(
        result.areaIntel.investmentScore * 0.5 +
          result.areaIntel.demandScore * 0.5,
      )
    : 0;

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            className="text-2xl font-bold mb-1"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "#F4F7FF",
            }}
          >
            {mode === "valuation"
              ? "RealWorth AI™ Results"
              : mode === "sell"
                ? "Prime Exit™ Pricing"
                : mode === "rent"
                  ? "LeaseSmart™ Insights"
                  : mode === "area"
                    ? "Location IQ™ Analysis"
                    : "Acquire™ Matches"}
          </h2>
          {locality && (
            <div className="flex items-center gap-1.5">
              <MapPin size={12} style={{ color: "#D8B56A" }} />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
                {locality}, {city}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Valuation / Sell Results ─────────────────────────────────────── */}
      {(mode === "valuation" || mode === "sell") && (
        <>
          {/* Core valuation card */}
          {loading ? (
            <div style={cardBase} className="animate-pulse space-y-3">
              <div
                className="h-4 rounded w-32"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
              <div
                className="h-10 rounded-xl w-48"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
              <div
                className="h-4 rounded w-64"
                style={{ background: "rgba(255,255,255,0.04)" }}
              />
            </div>
          ) : result.valuation ? (
            // R3: Collapsible main result card
            <div style={cardBase}>
              {/* Collapsed summary — always visible */}
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#D8B56A",
                  marginBottom: 8,
                }}
              >
                {mode === "sell"
                  ? "Recommended Listing Price"
                  : "Fair Market Value"}
              </p>
              <p
                className="font-bold"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 36,
                  color: "#F4F7FF",
                  lineHeight: 1.1,
                }}
              >
                {formatINR(result.valuation.fMV)}
              </p>
              <p
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.5)",
                  marginTop: 4,
                }}
              >
                {formatPSF(result.valuation.pricePerSqft)} &bull; Range:{" "}
                {formatINR(result.valuation.range[0])} –{" "}
                {formatINR(result.valuation.range[1])}
              </p>
              {/* Confidence bar */}
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span
                    style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}
                  >
                    Confidence
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color:
                        result.valuation.confidence >= 75
                          ? "#4ade80"
                          : "#D8B56A",
                    }}
                  >
                    {result.valuation.transparency.confidenceTier}
                  </span>
                </div>
                <div
                  className="h-2 rounded-full"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${result.valuation.confidence}%`,
                      background:
                        result.valuation.confidence >= 75
                          ? "linear-gradient(90deg,#4ade80,#22c55e)"
                          : "linear-gradient(90deg,#D8B56A,#E8C97A)",
                      transition: "width 1s ease",
                    }}
                  />
                </div>
              </div>

              {/* Expand/Collapse toggle */}
              <button
                type="button"
                onClick={() => setBreakdownOpen((v) => !v)}
                className="mt-4 flex items-center gap-1.5 text-sm font-semibold transition-colors duration-200"
                style={{
                  color: "#D8B56A",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
                data-ocid="results_step.valuation_card.breakdown_toggle"
              >
                {breakdownOpen ? (
                  <>
                    <ChevronUp size={14} /> Hide Breakdown ▲
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} /> View Breakdown ▼
                  </>
                )}
              </button>

              {/* Breakdown — only visible when expanded */}
              {breakdownOpen && (
                <div
                  className="mt-4 pt-4 space-y-2"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {/* R1 + R8: Show Neutral when no builder, else show actual value */}
                  {[
                    {
                      icon: "🏗",
                      label: "Builder Impact",
                      pct: result.valuation.priceExplanation.builderContrib,
                      isNeutral: !builder || builder.trim() === "",
                    },
                    {
                      icon: "📶",
                      label: "Location Premium",
                      pct: result.valuation.priceExplanation.locationContrib,
                      isNeutral: false,
                    },
                    {
                      icon: "📈",
                      label: "Demand Adjustment",
                      pct: result.valuation.priceExplanation.demandContrib,
                      isNeutral: !builder || builder.trim() === "",
                    },
                    {
                      icon: "🏙",
                      label: "Livability Factor",
                      pct: result.valuation.priceExplanation.livabilityContrib,
                      isNeutral: false,
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between py-2 px-3 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    >
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 14 }}>{row.icon}</span>
                        <span
                          style={{
                            fontSize: 13,
                            color: "rgba(255,255,255,0.7)",
                          }}
                        >
                          {row.label}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: row.isNeutral
                            ? "rgba(255,255,255,0.4)"
                            : row.pct >= 0
                              ? "#4ade80"
                              : "#f87171",
                        }}
                      >
                        {row.isNeutral
                          ? "Neutral"
                          : row.pct > 0
                            ? `+${row.pct}%`
                            : `${row.pct}%`}
                      </span>
                    </div>
                  ))}
                  <div
                    className="flex items-center justify-between py-2.5 px-3 rounded-xl mt-2"
                    style={{
                      background: "rgba(216,181,106,0.08)",
                      border: "1px solid rgba(216,181,106,0.2)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#D8B56A",
                      }}
                    >
                      Final AI Value
                    </span>
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#D8B56A",
                        fontFamily: "'Playfair Display', serif",
                      }}
                    >
                      {formatINR(result.valuation.fMV)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ ...cardBase, textAlign: "center", padding: 32 }}>
              <p style={{ color: "rgba(255,255,255,0.4)" }}>
                Enter a locality to compute valuation
              </p>
            </div>
          )}

          {/* Pro Enhancement Cards — always visible */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "rgba(216,181,106,0.7)",
                marginBottom: 12,
              }}
            >
              Pro Enhancement Cards
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {loading ? (
                <>
                  <SkeletonCard label="Liquidity Score" />
                  <SkeletonCard label="Market Heat Index" />
                  <SkeletonCard label="Distress Flag" />
                  <SkeletonCard label="Investor IRR" />
                  <SkeletonCard label="Confidence Meter" />
                </>
              ) : (
                <>
                  <ProCard
                    icon={<Activity size={18} />}
                    label="Liquidity Score"
                    value={result.proCards?.liquidityScore ?? "--"}
                    subtext="Property re-sale ease"
                    color="#4ade80"
                    badge={
                      scoreBand(result.proCards?.liquidityScore ?? 0).label
                    }
                  />
                  <ProCard
                    icon={<Zap size={18} />}
                    label="Market Heat Index"
                    value={`${result.proCards?.marketHeat ?? "--"}`}
                    subtext="Local demand intensity"
                    color="#f97316"
                    badge={
                      (result.proCards?.marketHeat ?? 0) >= 70
                        ? "🔥 Hot"
                        : "Stable"
                    }
                  />
                  <ProCard
                    icon={
                      result.proCards?.distressFlag ? (
                        <AlertTriangle size={18} />
                      ) : (
                        <CheckCircle size={18} />
                      )
                    }
                    label="Distress Flag"
                    value={
                      result.proCards?.distressFlag ? "⚠ Flagged" : "✓ Clear"
                    }
                    subtext={
                      result.proCards?.distressFlag
                        ? "Possible distress sale"
                        : "Normal market pricing"
                    }
                    color={
                      result.proCards?.distressFlag ? "#f87171" : "#4ade80"
                    }
                  />
                  <ProCard
                    icon={<TrendingUp size={18} />}
                    label="Investor IRR"
                    value={`${result.proCards?.irr ?? "--"}%`}
                    subtext="Annualised return estimate"
                    color="#D8B56A"
                    badge="3-Yr"
                  />
                  <ProCard
                    icon={<Shield size={18} />}
                    label="Confidence Meter"
                    value={`${result.proCards?.confidence ?? "--"}%`}
                    subtext={`${result.valuation?.transparency.dataLevel ?? ""} data`}
                    color="#60a5fa"
                    badge={result.valuation?.transparency.confidenceTier}
                  />
                </>
              )}
            </div>
          </div>

          {/* ── AI Learning Submission ── */}
          {!loading && locality && (
            <AILearnSection locality={locality} propertyType={propType} />
          )}

          {/* ── Expandable Accordion Sections (collapsed by default) ── */}
          {!loading && locality && (
            <div className="space-y-3">
              {result.valuation && (
                <AccordionSection
                  title="Why This Price?"
                  icon="💡"
                  badge="Explainable AI"
                >
                  <ExplainableAIPanel
                    val={result.valuation}
                    builderSelected={!!builder && builder.trim() !== ""}
                    unifiedResult={result.unifiedResult}
                  />
                </AccordionSection>
              )}

              {result.valuation && (
                <AccordionSection
                  title="Comparable Properties"
                  icon="🏠"
                  badge="Top 5"
                >
                  <ComparablePropertiesPanel
                    locality={locality}
                    propertyType={propType}
                    psf={result.valuation.pricePerSqft}
                    lat={lat || undefined}
                    lng={lng || undefined}
                    outlierCount={result.unifiedResult?.outlierCount}
                  />
                </AccordionSection>
              )}

              <AccordionSection
                title="How Price May Rise"
                icon="📈"
                badge="Forecast"
              >
                <PriceGrowthPanel
                  locality={locality}
                  propertyType={propType}
                  unifiedResult={result.unifiedResult}
                />
              </AccordionSection>

              <AccordionSection
                title="Nearby Places"
                icon="📍"
                badge={
                  nearbyPlaces
                    ? `${nearbyPlaces.metros.length + nearbyPlaces.techHubs.length + nearbyPlaces.hospitals.length + nearbyPlaces.schools.length + nearbyPlaces.busStops.length + nearbyPlaces.railwayStations.length + nearbyPlaces.malls.length + 1} places`
                    : nearbyLoading
                      ? "Loading..."
                      : undefined
                }
              >
                {nearbyPlaces ? (
                  <NearbyPlacesPanel
                    data={nearbyPlaces}
                    loading={nearbyLoading}
                    activeFilters={nearbyFilters}
                    onFilterChange={setNearbyFilters}
                  />
                ) : nearbyLoading ? (
                  <NearbyPlacesPanel
                    data={{
                      metros: [],
                      techHubs: [],
                      hospitals: [],
                      schools: [],
                      colleges: [],
                      busStops: [],
                      railwayStations: [],
                      malls: [],
                      highways: [],
                      airport: null,
                      airportKm: 0,
                      airportMins: 0,
                    }}
                    loading={true}
                    activeFilters={nearbyFilters}
                    onFilterChange={setNearbyFilters}
                  />
                ) : (
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                    📍 Pin on map to see nearby places with accurate distances
                  </p>
                )}
              </AccordionSection>

              <AccordionSection title="Amenities" icon="✨">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Lift",
                    "Parking",
                    "Power Backup",
                    "Clubhouse",
                    "Swimming Pool",
                    "Gym",
                    "Gas Pipeline",
                    "Security",
                    "Gated Community",
                  ].map((a) => (
                    <div
                      key={a}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <span style={{ fontSize: 10, color: "#D8B56A" }}>●</span>
                      <span
                        style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}
                      >
                        {a}
                      </span>
                    </div>
                  ))}
                </div>
              </AccordionSection>

              {result.areaIntel && (
                <AccordionSection title="Market Intelligence" icon="🔥">
                  <div className="grid grid-cols-2 gap-3">
                    <ProCard
                      icon={<Activity size={16} />}
                      label="Liquidity Score"
                      value={result.proCards?.liquidityScore ?? "--"}
                      subtext="Re-sale ease"
                      color="#4ade80"
                      badge={
                        scoreBand(result.proCards?.liquidityScore ?? 0).label
                      }
                    />
                    <ProCard
                      icon={<Zap size={16} />}
                      label="Market Heat"
                      value={result.proCards?.marketHeat ?? "--"}
                      subtext="Demand intensity"
                      color="#f97316"
                      badge={
                        (result.proCards?.marketHeat ?? 0) >= 70
                          ? "🔥 Hot"
                          : "Stable"
                      }
                    />
                    <ProCard
                      icon={<TrendingUp size={16} />}
                      label="3-Year Growth"
                      value={`${result.areaIntel.priceTrend3Y.toFixed(1)}%`}
                      subtext="Price appreciation"
                      color="#D8B56A"
                    />
                    <ProCard
                      icon={<BarChart3 size={16} />}
                      label="Demand Score"
                      value={result.areaIntel.demandScore}
                      subtext={result.areaIntel.growthDriver}
                      color="#60a5fa"
                    />
                  </div>
                </AccordionSection>
              )}

              <AccordionSection title="Investment Intelligence" icon="💰">
                <InvestmentIntelligencePanel
                  locality={locality}
                  propertyType={propType}
                  area={area}
                />
              </AccordionSection>

              <AccordionSection title="Risk Intelligence" icon="⚠️">
                {result.areaIntel ? (
                  <div className="space-y-2">
                    {[
                      {
                        label: "Oversupply Risk",
                        value:
                          result.areaIntel.investmentScore < 50
                            ? "Moderate"
                            : "Low",
                        color:
                          result.areaIntel.investmentScore < 50
                            ? "#f97316"
                            : "#4ade80",
                      },
                      {
                        label: "Low Demand Flag",
                        value:
                          result.areaIntel.demandScore < 40
                            ? "Flagged"
                            : "Clear",
                        color:
                          result.areaIntel.demandScore < 40
                            ? "#f87171"
                            : "#4ade80",
                      },
                      {
                        label: "Builder Risk",
                        value: builder ? "Known Builder" : "No Builder Info",
                        color: builder ? "#4ade80" : "#D8B56A",
                      },
                      {
                        label: "Liquidity Risk",
                        value:
                          (result.proCards?.liquidityScore ?? 0) < 40
                            ? "Moderate"
                            : "Low",
                        color:
                          (result.proCards?.liquidityScore ?? 0) < 40
                            ? "#f97316"
                            : "#4ade80",
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.03)" }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            color: "rgba(255,255,255,0.6)",
                          }}
                        >
                          {row.label}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: row.color,
                          }}
                        >
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                    Risk data unavailable for this locality
                  </p>
                )}
              </AccordionSection>

              <AccordionSection title="ValuBrix Score" icon="⭐">
                <ValuBrixScorePanel
                  locality={locality}
                  propertyType={propType}
                />
              </AccordionSection>
            </div>
          )}
          {loading && (
            <div className="space-y-3">
              {[
                "Why This Price?",
                "Comparable Properties",
                "How Price May Rise",
                "Nearby Places",
                "Amenities",
                "Market Intelligence",
                "Investment Intelligence",
                "Risk Intelligence",
                "ValuBrix Score",
              ].map((label) => (
                <div
                  key={label}
                  className="rounded-2xl px-5 py-4 animate-pulse flex items-center justify-between"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    className="h-4 rounded w-44"
                    style={{ background: "rgba(216,181,106,0.15)" }}
                  />
                  <div
                    className="h-4 rounded w-6"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Area Intelligence Results ────────────────────────────────── */}
      {mode === "area" && (
        <div>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              <SkeletonCard label="Investment Score" />
              <SkeletonCard label="Growth Score" />
              <SkeletonCard label="Livability Score" />
              <SkeletonCard label="Market Heat Index" />
              <SkeletonCard label="Liquidity Trend" />
              <SkeletonCard label="Rental Demand" />
            </div>
          ) : result.areaIntel ? (
            <div className="space-y-4" data-ocid="results_step.area_cards">
              {/* BUG FIX: Blended mode — show apartment/villa/plot breakdown when no type selected */}
              {result.areaIntel.blendedMode && result.areaIntel.blendedPSF ? (
                <GlassSection>
                  <SectionTitle sub="Price per sq ft and rental estimates by property type">
                    🏙 Area Price & Rent Breakdown
                  </SectionTitle>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Apartment */}
                    <div
                      className="rounded-2xl p-4"
                      style={{
                        background: "rgba(96,165,250,0.06)",
                        border: "1px solid rgba(96,165,250,0.2)",
                      }}
                      data-ocid="area_intel.apartment_card"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 size={16} style={{ color: "#60a5fa" }} />
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#60a5fa",
                            fontFamily: "'Playfair Display', serif",
                          }}
                        >
                          Apartments
                        </span>
                      </div>
                      <p
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: 20,
                          fontWeight: 700,
                          color: "#F4F7FF",
                        }}
                      >
                        {formatPSF(result.areaIntel.blendedPSF.apartment)}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.45)",
                          marginTop: 4,
                        }}
                      >
                        Est. 2BHK rent:{" "}
                        {formatINR(
                          Math.round(
                            result.areaIntel.blendedPSF.apartment * 0.28 * 2,
                          ),
                        )}{" "}
                        / mo
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "rgba(96,165,250,0.7)",
                          marginTop: 2,
                        }}
                      >
                        Yield:{" "}
                        {(
                          ((result.areaIntel.blendedPSF.apartment *
                            0.28 *
                            2 *
                            12) /
                            (result.areaIntel.blendedPSF.apartment * 1000)) *
                          100
                        ).toFixed(1)}
                        % p.a.
                      </p>
                    </div>

                    {/* Villa */}
                    <div
                      className="rounded-2xl p-4"
                      style={{
                        background: "rgba(216,181,106,0.06)",
                        border: "1px solid rgba(216,181,106,0.2)",
                      }}
                      data-ocid="area_intel.villa_card"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 size={16} style={{ color: "#D8B56A" }} />
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#D8B56A",
                            fontFamily: "'Playfair Display', serif",
                          }}
                        >
                          Villas
                        </span>
                      </div>
                      <p
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: 20,
                          fontWeight: 700,
                          color: "#F4F7FF",
                        }}
                      >
                        {formatPSF(result.areaIntel.blendedPSF.villa)}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.45)",
                          marginTop: 4,
                        }}
                      >
                        Est. 3BHK rent:{" "}
                        {formatINR(
                          Math.round(
                            result.areaIntel.blendedPSF.villa * 0.22 * 2.5,
                          ),
                        )}{" "}
                        / mo
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "rgba(216,181,106,0.7)",
                          marginTop: 2,
                        }}
                      >
                        Yield:{" "}
                        {(
                          ((result.areaIntel.blendedPSF.villa *
                            0.22 *
                            2.5 *
                            12) /
                            (result.areaIntel.blendedPSF.villa * 2000)) *
                          100
                        ).toFixed(1)}
                        % p.a.
                      </p>
                    </div>

                    {/* Plot */}
                    <div
                      className="rounded-2xl p-4"
                      style={{
                        background: "rgba(74,222,128,0.06)",
                        border: "1px solid rgba(74,222,128,0.2)",
                      }}
                      data-ocid="area_intel.plot_card"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 size={16} style={{ color: "#4ade80" }} />
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#4ade80",
                            fontFamily: "'Playfair Display', serif",
                          }}
                        >
                          Plots
                        </span>
                      </div>
                      <p
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: 20,
                          fontWeight: 700,
                          color: "#F4F7FF",
                        }}
                      >
                        {formatPSF(result.areaIntel.blendedPSF.plot)}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.45)",
                          marginTop: 4,
                        }}
                      >
                        Rental: N/A
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "rgba(74,222,128,0.7)",
                          marginTop: 2,
                        }}
                      >
                        Capital appreciation only
                      </p>
                    </div>

                    {/* Fix 4: Commercial card using office/retail dataset */}
                    {"commercial" in result.areaIntel.blendedPSF && (
                      <div
                        className="rounded-2xl p-4"
                        style={{
                          background: "rgba(167,139,250,0.06)",
                          border: "1px solid rgba(167,139,250,0.2)",
                        }}
                        data-ocid="area_intel.commercial_card"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Building2 size={16} style={{ color: "#a78bfa" }} />
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#a78bfa",
                              fontFamily: "'Playfair Display', serif",
                            }}
                          >
                            Commercial
                          </span>
                        </div>
                        <p
                          style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: 20,
                            fontWeight: 700,
                            color: "#F4F7FF",
                          }}
                        >
                          {formatPSF(
                            (
                              result.areaIntel.blendedPSF as {
                                apartment: number;
                                villa: number;
                                plot: number;
                                commercial: number;
                              }
                            ).commercial,
                          )}
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.45)",
                            marginTop: 4,
                          }}
                        >
                          Office/retail market rate
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: "rgba(167,139,250,0.7)",
                            marginTop: 2,
                          }}
                        >
                          Higher yield potential vs residential
                        </p>
                      </div>
                    )}
                  </div>
                </GlassSection>
              ) : (
                /* Single type selected — show single PSF */
                <GlassSection>
                  <SectionTitle>🏙 Market Rate</SectionTitle>
                  <p
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 28,
                      fontWeight: 700,
                      color: "#F4F7FF",
                    }}
                  >
                    {formatPSF(result.areaIntel.avgPricePerSqft)}
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.5)",
                      marginTop: 4,
                    }}
                  >
                    Current market price per sq ft in {locality}
                  </p>
                </GlassSection>
              )}

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <ProCard
                  icon={<TrendingUp size={18} />}
                  label="Investment Score"
                  value={result.areaIntel.investmentScore}
                  subtext={result.areaIntel.classification}
                  color="#D8B56A"
                  badge={
                    result.areaIntel.investmentScore >= 70
                      ? "Strong Buy"
                      : "Hold"
                  }
                />
                <ProCard
                  icon={<Zap size={18} />}
                  label="Market Heat Index"
                  value={result.areaIntel.demandScore}
                  subtext={`${result.areaIntel.priceTrend1Y.toFixed(1)}% YoY growth`}
                  color="#f97316"
                  badge={
                    result.areaIntel.demandScore >= 70 ? "🔥 Hot" : "Stable"
                  }
                />
                <ProCard
                  icon={<Activity size={18} />}
                  label="Liquidity Trend"
                  value={result.areaIntel.growthScore}
                  subtext={result.areaIntel.growthDriver}
                  color="#4ade80"
                />
                <ProCard
                  icon={<BarChart3 size={18} />}
                  label="Livability Score"
                  value={result.areaIntel.livabilityScore}
                  subtext="Liveability score"
                  color="#60a5fa"
                />
                <ProCard
                  icon={<Percent size={18} />}
                  label="3-Year Growth"
                  value={`${result.areaIntel.priceTrend3Y.toFixed(1)}%`}
                  subtext="Price appreciation"
                  color="#a78bfa"
                />
                <ProCard
                  icon={<Building2 size={18} />}
                  label={
                    propType && propType !== "apartment"
                      ? `${propType.charAt(0).toUpperCase() + propType.slice(1)} Base PSF`
                      : "Base Market PSF"
                  }
                  value={formatPSF(
                    propType &&
                      (result.areaIntel?.blendedMode === false ||
                        propType !== "apartment")
                      ? getBasePSF(
                          locality,
                          propType as
                            | "apartment"
                            | "villa"
                            | "plot"
                            | "commercial",
                        )
                      : (result.areaIntel?.avgPricePerSqft ?? 0),
                  )}
                  subtext="PSF = Price per sq ft"
                  color="#D8B56A"
                />
              </div>

              {/* Nearby Places for area intelligence */}
              {nearbyPlaces || nearbyLoading ? (
                <AccordionSection
                  title="Nearby Places & Amenities"
                  icon="📍"
                  badge={
                    nearbyPlaces
                      ? `${nearbyPlaces.metros.length + nearbyPlaces.techHubs.length + nearbyPlaces.hospitals.length + nearbyPlaces.schools.length + nearbyPlaces.busStops.length + nearbyPlaces.railwayStations.length + nearbyPlaces.malls.length + 1} places`
                      : "Loading..."
                  }
                >
                  <NearbyPlacesPanel
                    data={
                      nearbyPlaces ?? {
                        metros: [],
                        techHubs: [],
                        hospitals: [],
                        schools: [],
                        colleges: [],
                        busStops: [],
                        railwayStations: [],
                        malls: [],
                        highways: [],
                        airport: null,
                        airportKm: 0,
                        airportMins: 0,
                      }
                    }
                    loading={nearbyLoading}
                  />
                </AccordionSection>
              ) : (
                <div
                  className="rounded-2xl px-5 py-4"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                    📍 Select a location to see nearby places
                  </p>
                </div>
              )}

              {/* ValuBrix score for area mode */}
              {locality && (
                <ValuBrixScorePanel
                  locality={locality}
                  propertyType={propType}
                />
              )}

              {/* Price growth for area mode */}
              {locality && (
                <PriceGrowthPanel
                  locality={locality}
                  propertyType={propType}
                  unifiedResult={undefined}
                />
              )}

              {/* Investment intel for area */}
              {locality && (
                <InvestmentIntelligencePanel
                  locality={locality}
                  propertyType={propType}
                  area={1000}
                />
              )}
            </div>
          ) : (
            <div style={{ ...cardBase, textAlign: "center", padding: 32 }}>
              <p style={{ color: "rgba(255,255,255,0.4)" }}>
                Enter a locality to analyse the area
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Rent Results ─────────────────────────────────────────────── */}
      {mode === "rent" && (
        <>
          {loading ? (
            <div style={cardBase} className="animate-pulse space-y-3">
              <div
                className="h-4 rounded w-32"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
              <div
                className="h-10 rounded-xl w-48"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
            </div>
          ) : result.rentEstimate && !result.rentEstimate.hide ? (
            /* Fix 5: Dark premium rent card — no white backgrounds */
            <div
              style={{
                background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
                border: "1px solid rgba(59,130,246,0.2)",
                borderRadius: 18,
                padding: "24px",
                boxShadow:
                  "0 4px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#D8B56A",
                  marginBottom: 8,
                }}
              >
                Estimated Monthly Rent
              </p>
              <p
                className="font-bold"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 36,
                  color: "#D8B56A",
                  lineHeight: 1.1,
                }}
              >
                {formatINR(result.rentEstimate.estimatedMonthlyRent)}
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  /month
                </span>
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.6)",
                  marginTop: 4,
                }}
              >
                Gross Yield: {result.rentEstimate.grossYieldPercent.toFixed(2)}%
                p.a. &bull; {result.rentEstimate.confidenceLabel}
              </p>
            </div>
          ) : null}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{ ...cardBase, minHeight: 100 }}
                  className="animate-pulse"
                >
                  <div
                    className="h-4 rounded w-48 mb-2"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  />
                  <div
                    className="h-3 rounded w-32"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  />
                </div>
              ))}
            </div>
          ) : result.listings && result.listings.length > 0 ? (
            <div className="space-y-3" data-ocid="results_step.rent_listings">
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "rgba(216,181,106,0.6)",
                }}
              >
                Available Rentals
              </p>
              {result.listings.map((l, i) => (
                <ListingCard
                  key={String(l.id ?? i)}
                  listing={l}
                  badges={computeListingBadges(
                    l,
                    "rent",
                    areaLiquidityScore,
                    areaMarketHeat,
                  )}
                  isRent={true}
                />
              ))}
            </div>
          ) : (
            !loading && (
              <div style={{ ...cardBase, textAlign: "center", padding: 28 }}>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
                  No rental listings found in this area yet.
                </p>
                <p
                  style={{
                    color: "rgba(255,255,255,0.25)",
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  AI rental estimate is based on market data above.
                </p>
              </div>
            )
          )}

          {/* Rental Intelligence + Things to Check */}
          {loading ? (
            <div className="space-y-3">
              <SkeletonCard label="Rental Intelligence" />
              <SkeletonCard label="Things to Check" />
            </div>
          ) : result.rentMetrics ? (
            <RentIntelligencePanel
              rentMetrics={result.rentMetrics}
              grossYield={result.rentEstimate?.grossYieldPercent ?? 0}
              bhk={bhk}
            />
          ) : null}
        </>
      )}

      {/* ── Buy Results ───────────────────────────────────────────────── */}
      {mode === "buy" && (
        <div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{ ...cardBase, minHeight: 100 }}
                  className="animate-pulse"
                >
                  <div
                    className="h-4 rounded w-48 mb-2"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  />
                  <div
                    className="h-3 rounded w-32"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  />
                </div>
              ))}
            </div>
          ) : result.listings && result.listings.length > 0 ? (
            <div className="space-y-3" data-ocid="results_step.buy_listings">
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "rgba(216,181,106,0.6)",
                }}
              >
                Properties Found
              </p>
              {result.listings.map((l, i) => (
                <ListingCard
                  key={String(l.id ?? i)}
                  listing={l}
                  badges={computeListingBadges(
                    l,
                    "sale",
                    areaLiquidityScore,
                    areaMarketHeat,
                  )}
                />
              ))}
            </div>
          ) : (
            !loading && (
              <div style={{ ...cardBase, textAlign: "center", padding: 28 }}>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
                  No listings found matching your criteria.
                </p>
                {result.areaIntel && (
                  <p
                    style={{
                      color: "rgba(216,181,106,0.5)",
                      fontSize: 12,
                      marginTop: 6,
                    }}
                  >
                    Avg market price in this area:{" "}
                    {formatPSF(result.areaIntel.avgPricePerSqft)}
                  </p>
                )}
              </div>
            )
          )}

          {/* AI Buyer Checklist + Things to Check */}
          {loading ? (
            <div className="space-y-3">
              <SkeletonCard label="AI Buyer Checklist" />
              <SkeletonCard label="Things to Check" />
            </div>
          ) : result.investmentIntel && result.valuBrixScore ? (
            <BuyIntelligencePanel
              investmentIntel={result.investmentIntel}
              valuBrixScore={result.valuBrixScore}
            />
          ) : null}
        </div>
      )}

      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        data-ocid="results_step.back_button"
        className="flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.6)",
          cursor: "pointer",
        }}
      >
        <ArrowLeft size={15} />
        Back to Filters
      </button>
    </div>
  );
}
