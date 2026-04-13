// RentIntelligencePanel.tsx — Rental Intelligence + Things to Check for LeaseSmart (Rent)
import {
  Activity,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Droplets,
  MapPin,
  Percent,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useState } from "react";
import type { LocalityRentMetrics } from "../../utils/rentEngine";

const ACCENT = "#D8B56A";
const CARD_BASE: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(216,181,106,0.15)",
  borderRadius: 18,
  backdropFilter: "blur(12px)",
};

const RENT_CHECKLIST = [
  {
    icon: <Droplets size={14} />,
    title: "Water Availability",
    desc: "Check daily BWSSB supply vs tanker dependency — affects monthly maintenance cost.",
  },
  {
    icon: <Zap size={14} />,
    title: "Power Backup",
    desc: "Confirm inverter/DG backup availability for apartments and gated communities.",
  },
  {
    icon: <Activity size={14} />,
    title: "Maintenance Cost",
    desc: "Verify society maintenance charges per sqft — can add ₹2–5/sqft monthly.",
  },
  {
    icon: <MapPin size={14} />,
    title: "Nearby Transport",
    desc: "Check metro/bus connectivity within 1km for daily commute convenience.",
  },
  {
    icon: <TrendingUp size={14} />,
    title: "Noise Level",
    desc: "Verify proximity to main road/industrial zones — impacts long-term rentability.",
  },
];

interface MetricPillProps {
  label: string;
  value: string;
  color?: string;
}

function MetricPill({ label, value, color = ACCENT }: MetricPillProps) {
  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-1"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <span
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.4)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 15,
          fontWeight: 700,
          color,
          fontFamily: "'Playfair Display', serif",
        }}
      >
        {value}
      </span>
    </div>
  );
}

interface RentIntelligencePanelProps {
  rentMetrics: LocalityRentMetrics;
  grossYield: number;
  bhk?: number;
}

export default function RentIntelligencePanel({
  rentMetrics,
  grossYield,
  bhk = 2,
}: RentIntelligencePanelProps) {
  const [checklistOpen, setChecklistOpen] = useState(false);

  // Derive tenant demand from sample count + yield
  const tenantDemand =
    rentMetrics.sampleCount >= 8 || grossYield > 4
      ? "High"
      : rentMetrics.sampleCount >= 4 || grossYield > 3
        ? "Medium"
        : "Low";
  const tenantDemandColor =
    tenantDemand === "High"
      ? "#4ade80"
      : tenantDemand === "Medium"
        ? "#D8B56A"
        : "#f87171";

  // Estimate time to rent
  const timeToRent =
    tenantDemand === "High"
      ? "< 2 weeks"
      : tenantDemand === "Medium"
        ? "2–4 weeks"
        : "1–2 months";

  // Furnishing premium (fully furnished typically +20–35%)
  const furnishingPremium =
    grossYield > 4 ? "~25%" : grossYield > 3 ? "~18%" : "~12%";

  // Trend label
  const trend =
    rentMetrics.trend === "up"
      ? "📈 Rising"
      : rentMetrics.trend === "down"
        ? "📉 Declining"
        : "→ Stable";

  // Get rent for specified BHK (from metrics)
  const rentForBhk = rentMetrics.avgRentByBhk[bhk] ?? 0;
  const rentDisplay =
    rentForBhk > 0 ? `₹${Math.round(rentForBhk / 1000)}K/mo` : "Market Rate";

  return (
    <div className="space-y-4">
      {/* Rental Intelligence card */}
      <div style={CARD_BASE} className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${ACCENT}18`, color: ACCENT }}
          >
            <Percent size={15} />
          </div>
          <h3
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 16,
              color: "#F4F7FF",
              fontWeight: 700,
            }}
          >
            Rental Intelligence
          </h3>
        </div>

        {/* Metric grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <MetricPill
            label="Expected Rent"
            value={rentDisplay}
            color={ACCENT}
          />
          <MetricPill
            label="Rental Yield"
            value={`${grossYield.toFixed(1)}%`}
            color={
              grossYield >= 4
                ? "#4ade80"
                : grossYield >= 3
                  ? "#D8B56A"
                  : "#f87171"
            }
          />
          <MetricPill
            label="Furnishing Premium"
            value={`+${furnishingPremium}`}
            color="#a78bfa"
          />
          <MetricPill
            label="Market Trend"
            value={trend}
            color={rentMetrics.trend === "up" ? "#4ade80" : ACCENT}
          />
        </div>

        {/* Demand + Time-to-Rent */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Activity size={12} style={{ color: tenantDemandColor }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                Tenant Demand
              </span>
            </div>
            <span
              className="px-2 py-0.5 rounded-full"
              style={{
                fontSize: 10,
                fontWeight: 700,
                background: `${tenantDemandColor}18`,
                border: `1px solid ${tenantDemandColor}40`,
                color: tenantDemandColor,
              }}
            >
              {tenantDemand}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock size={12} style={{ color: "#60a5fa" }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                Estimated Time to Rent
              </span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa" }}>
              {timeToRent}
            </span>
          </div>
        </div>

        {/* Yield range if available */}
        {rentMetrics.yieldRange[0] > 0 && (
          <div
            className="mt-4 pt-4 flex items-center justify-between"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
              Yield range in this area
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>
              {rentMetrics.yieldRange[0].toFixed(1)}% –{" "}
              {rentMetrics.yieldRange[1].toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Things to Check — Collapsible */}
      <div style={CARD_BASE}>
        <button
          type="button"
          data-ocid="rent_things_to_check.toggle"
          onClick={() => setChecklistOpen((v) => !v)}
          className="w-full flex items-center justify-between p-5"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#F4F7FF",
          }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle size={16} style={{ color: ACCENT }} />
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              Things to Check Before Renting
            </span>
          </div>
          {checklistOpen ? (
            <ChevronUp size={16} style={{ color: ACCENT }} />
          ) : (
            <ChevronDown size={16} style={{ color: ACCENT }} />
          )}
        </button>

        {checklistOpen && (
          <div
            className="px-5 pb-5 space-y-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            {RENT_CHECKLIST.map((item) => (
              <div key={item.title} className="flex gap-3">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${ACCENT}14`, color: ACCENT }}
                >
                  {item.icon}
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#F4F7FF",
                      marginBottom: 2,
                    }}
                  >
                    {item.title}
                  </p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
