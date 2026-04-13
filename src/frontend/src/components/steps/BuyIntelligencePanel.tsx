// BuyIntelligencePanel.tsx — AI Buyer Checklist + Things to Check for Acquire (Buy)
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  Star,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import type { InvestmentIntelligenceResult } from "../../engines/investmentIntelligenceEngine";
import type { ValuBrixScoreResult } from "../../engines/valuBrixScoreEngine";

const ACCENT = "#D8B56A";
const CARD_BASE: React.CSSProperties = {
  background: "rgba(10, 15, 35, 0.92)",
  border: "1px solid rgba(216,181,106,0.2)",
  borderRadius: 18,
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
};

interface ScoreBarProps {
  label: string;
  value: number;
  max?: number;
  color?: string;
}

function ScoreBar({ label, value, max = 100, color = ACCENT }: ScoreBarProps) {
  const pct = Math.min(Math.round((value / max) * 100), 100);
  const band = pct >= 70 ? "High" : pct >= 45 ? "Medium" : "Low";
  const bandColor = pct >= 70 ? "#4ade80" : pct >= 45 ? "#D8B56A" : "#f87171";

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
          {label}
        </span>
        <span
          className="px-2 py-0.5 rounded-full"
          style={{
            fontSize: 10,
            fontWeight: 700,
            background: `${bandColor}18`,
            border: `1px solid ${bandColor}40`,
            color: bandColor,
          }}
        >
          {band}
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            transition: "width 0.8s ease",
          }}
        />
      </div>
    </div>
  );
}

interface DemandBadgeProps {
  label: string;
  value: string;
}

function DemandBadge({ label, value }: DemandBadgeProps) {
  const color =
    value === "High" ? "#4ade80" : value === "Medium" ? "#D8B56A" : "#f87171";

  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
        {label}
      </span>
      <span
        className="px-2 py-0.5 rounded-full"
        style={{
          fontSize: 10,
          fontWeight: 700,
          background: `${color}18`,
          border: `1px solid ${color}40`,
          color,
        }}
      >
        {value}
      </span>
    </div>
  );
}

const BUY_CHECKLIST = [
  {
    icon: <Shield size={14} />,
    title: "Legal Check",
    desc: "Verify RERA registration, title deed, and Encumbrance Certificate (EC).",
  },
  {
    icon: <Building2 size={14} />,
    title: "Builder Reputation",
    desc: "Check past delivery track record, possession dates, and RERA complaints.",
  },
  {
    icon: <Activity size={14} />,
    title: "Water Source",
    desc: "Confirm BWSSB/Borewell/tanker dependency — critical for resale value.",
  },
  {
    icon: <TrendingUp size={14} />,
    title: "Road Width",
    desc: "Check 30/40/60ft road access. Wider roads boost resale value significantly.",
  },
  {
    icon: <Star size={14} />,
    title: "Resale Demand",
    desc: "Verify 5-year resale liquidity in this micro-market before investing.",
  },
  {
    icon: <CheckCircle size={14} />,
    title: "Rental Potential",
    desc: "Check expected yield (%) for investment return calculations.",
  },
];

interface BuyIntelligencePanelProps {
  investmentIntel: InvestmentIntelligenceResult;
  valuBrixScore: ValuBrixScoreResult;
}

export default function BuyIntelligencePanel({
  investmentIntel,
  valuBrixScore,
}: BuyIntelligencePanelProps) {
  const [checklistOpen, setChecklistOpen] = useState(false);

  // Derived demand labels from scores
  const liquidityScore = Math.round((valuBrixScore.liquidity / 20) * 100);
  const demandScore = Math.round((valuBrixScore.demand / 20) * 100);
  const rentalDemand =
    demandScore >= 65 ? "High" : demandScore >= 45 ? "Medium" : "Low";
  const resaleDemand =
    liquidityScore >= 65 ? "High" : liquidityScore >= 45 ? "Medium" : "Low";
  const builderRep =
    valuBrixScore.total >= 70
      ? "Trusted"
      : valuBrixScore.total >= 50
        ? "Mixed"
        : "Unknown";
  const growthPotential = valuBrixScore.breakdown.growthLabel;

  return (
    <div className="space-y-4">
      {/* AI Buyer Checklist */}
      <div style={CARD_BASE} className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${ACCENT}18`, color: ACCENT }}
          >
            <Activity size={15} />
          </div>
          <h3
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 16,
              color: "#F4F7FF",
              fontWeight: 700,
            }}
          >
            AI Buyer Checklist
          </h3>
        </div>

        <div className="space-y-3 mb-4">
          <ScoreBar
            label="Liquidity Score"
            value={liquidityScore}
            color="#4ade80"
          />
          <ScoreBar
            label="Future Growth Potential"
            value={Math.round((valuBrixScore.growth / 20) * 100)}
            color="#D8B56A"
          />
          <ScoreBar
            label="Infrastructure Score"
            value={Math.round((valuBrixScore.infrastructure / 20) * 100)}
            color="#60a5fa"
          />
        </div>

        <div className="space-y-2.5">
          <DemandBadge label="Rental Demand" value={rentalDemand} />
          <DemandBadge label="Resale Demand" value={resaleDemand} />
          <DemandBadge label="Builder Reputation Zone" value={builderRep} />
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
              Growth Potential
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: ACCENT,
              }}
            >
              {growthPotential}
            </span>
          </div>
        </div>

        {/* Risk flags */}
        {investmentIntel.riskFlags.length > 0 && (
          <div
            className="mt-4 pt-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#f87171",
                marginBottom: 8,
              }}
            >
              Risk Flags
            </p>
            <div className="space-y-1.5">
              {investmentIntel.riskFlags.map((flag) => (
                <div key={flag} className="flex items-start gap-2">
                  <AlertTriangle
                    size={11}
                    style={{ color: "#f87171", flexShrink: 0, marginTop: 2 }}
                  />
                  <span
                    style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}
                  >
                    {flag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Things to Check — Collapsible */}
      <div style={CARD_BASE}>
        <button
          type="button"
          data-ocid="buy_things_to_check.toggle"
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
              Things to Check Before Buying
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
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
          >
            {BUY_CHECKLIST.map((item) => (
              <div key={item.title} className="flex gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${ACCENT}18`, color: ACCENT }}
                >
                  {item.icon}
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#F4F7FF",
                      marginBottom: 3,
                    }}
                  >
                    {item.title}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: "rgba(185,198,216,0.75)",
                      lineHeight: 1.5,
                    }}
                  >
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
