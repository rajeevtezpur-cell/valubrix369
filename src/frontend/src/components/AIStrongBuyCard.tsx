// AIStrongBuyCard.tsx
// Premium "STRONG BUY" style output card — ValuBrix USP

import { Badge } from "@/components/ui/badge";
import {
  Award,
  Building2,
  CheckCircle2,
  Clock,
  MapPin,
  Shield,
  Star,
  Tag,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { AIMasterProject } from "../engines/aiMasterScoreEngine";
import { getInvestmentStrategy } from "../engines/aiMasterScoreEngine";

interface AIStrongBuyCardProps {
  project: AIMasterProject;
  rank?: number;
  expanded?: boolean;
  onExpand?: () => void;
}

function getFlagStyle(flag: AIMasterProject["recommendation_flag"]) {
  switch (flag) {
    case "STRONG BUY":
      return {
        container:
          "border-[#D4AF37] bg-gradient-to-br from-[#D4AF37]/10 to-emerald-900/10",
        badge: "bg-[#D4AF37] text-black font-bold",
        score: "text-[#D4AF37]",
        glow: "shadow-[0_0_30px_rgba(212,175,55,0.25)]",
        icon: <Award className="w-5 h-5 text-[#D4AF37]" />,
      };
    case "BUY":
      return {
        container:
          "border-emerald-500/60 bg-gradient-to-br from-emerald-900/15 to-teal-900/10",
        badge: "bg-emerald-500 text-white font-bold",
        score: "text-emerald-400",
        glow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]",
        icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
      };
    case "HOLD":
      return {
        container:
          "border-amber-500/40 bg-gradient-to-br from-amber-900/10 to-yellow-900/5",
        badge: "bg-amber-500 text-black font-bold",
        score: "text-amber-400",
        glow: "",
        icon: <Clock className="w-5 h-5 text-amber-400" />,
      };
    default:
      return {
        container: "border-white/10 bg-white/5",
        badge: "bg-white/20 text-white",
        score: "text-white/60",
        glow: "",
        icon: <Shield className="w-5 h-5 text-white/40" />,
      };
  }
}

function formatPrice(v: number): string {
  const cr = v / 10000000;
  if (cr >= 1) return `₹${cr.toFixed(1)}Cr`;
  return `₹${(v / 100000).toFixed(0)}L`;
}

export default function AIStrongBuyCard({
  project: p,
  rank,
  expanded = false,
  onExpand,
}: AIStrongBuyCardProps) {
  const style = getFlagStyle(p.recommendation_flag);
  const strategy = getInvestmentStrategy(p);

  return (
    <article
      className={`relative rounded-2xl border-2 p-5 flex flex-col gap-3.5 transition-all duration-300 cursor-pointer hover:-translate-y-1 ${
        style.container
      } ${style.glow}`}
      onClick={onExpand}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onExpand?.();
      }}
    >
      {/* Rank badge */}
      {rank && (
        <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-[#0b1a2f] border-2 border-[#D4AF37]/60 flex items-center justify-center text-[#D4AF37] text-xs font-bold">
          #{rank}
        </div>
      )}

      {/* Row 1: Flag + Score */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {style.icon}
          <span className={`text-sm px-3 py-1 rounded-full ${style.badge}`}>
            {p.recommendation_flag}
          </span>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-black ${style.score}`}>
            {p.ai_master_score}
            <span className="text-xs font-normal text-white/40">/100</span>
          </div>
          <div className="text-[10px] text-white/40">AI Master Score</div>
        </div>
      </div>

      {/* Row 2: Project info */}
      <div>
        <div className="text-white font-bold text-base leading-tight truncate">
          {p.project_name}
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-white/60 text-xs">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">
            {p.micro_location}, {p.locality}
          </span>
          <span className="text-white/30">·</span>
          <span className="text-white/50 flex-shrink-0">{p.zone}</span>
        </div>
      </div>

      {/* Row 3: Price + Area tag */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[#D4AF37] font-semibold text-sm">
            {formatPrice(p.price_min)} – {formatPrice(p.price_max)}
          </div>
          <div className="text-white/40 text-[10px]">
            ₹{p.price_per_sqft.toLocaleString()}/sqft · avg ₹
            {p.locality_avg_price.toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <Badge className="text-[10px] bg-white/10 text-white/70 border-white/10">
            {p.micro_market_tag}
          </Badge>
        </div>
      </div>

      {/* Row 4: Why buy (bullet points) */}
      <div className="bg-black/20 rounded-xl p-3 space-y-1.5">
        <div className="text-[11px] font-semibold text-white/60 mb-1 flex items-center gap-1">
          <Zap className="w-3 h-3 text-[#D4AF37]" /> Why this is a good
          investment
        </div>
        {p.investment_summary
          .replace("Why this is a good investment:\n", "")
          .split("\n")
          .slice(0, expanded ? 10 : 3)
          .map((line) => (
            <div
              key={line.slice(0, 25)}
              className="flex items-start gap-1.5 text-[11px] text-white/75"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{line.replace(/^✔\s*/, "")}</span>
            </div>
          ))}
      </div>

      {/* Row 5: Smart Tags */}
      <div className="flex flex-wrap gap-1.5">
        {p.smart_tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 whitespace-nowrap"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Row 6: Sub-scores (compact) */}
      {expanded && (
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { label: "Location", value: p.location_score, max: 50 },
            { label: "Growth", value: p.growth_score, max: 9.5 },
            { label: "Rental", value: p.rental_score, max: 15 },
            { label: "Risk", value: p.risk_score, max: 10 },
            { label: "Approval", value: p.approval_score, max: 20 },
            { label: "Micro", value: Math.round(p.micro_score), max: 100 },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-[10px] text-white/40">{s.label}</div>
              <div className="text-xs font-bold text-white/80">
                {typeof s.value === "number"
                  ? s.value.toFixed(s.max <= 10 ? 1 : 0)
                  : s.value}
              </div>
              <div className="h-1 bg-white/10 rounded-full mt-0.5 overflow-hidden">
                <div
                  className="h-full bg-[#D4AF37] rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((Number(s.value) / s.max) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Row 7: Strategy */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/10">
        <Star className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />
        <div>
          <span className="text-[10px] text-white/40">Strategy: </span>
          <span className="text-[11px] text-white/80 font-medium">
            {strategy}
          </span>
        </div>
      </div>

      {/* Infra proximity pills */}
      <div className="flex gap-1.5 flex-wrap">
        {p.near_manyata && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20">
            Near Manyata
          </span>
        )}
        {p.near_airport_before_toll && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">
            Near Airport
          </span>
        )}
        {p.near_strr && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/20">
            STRR Zone
          </span>
        )}
        {p.oc_status && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
            OC Ready
          </span>
        )}
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-white/50">
          {p.approval_authority} Approved
        </span>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-white/50">
          {p.metro_distance_km}km to Metro
        </span>
      </div>

      {/* Builder + Status */}
      <div className="flex items-center gap-3 text-[11px] text-white/50">
        <Building2 className="w-3 h-3" />
        <span>{p.builder_name}</span>
        <span className="text-white/20">·</span>
        <Tag className="w-3 h-3" />
        <span>{p.status}</span>
        <span className="text-white/20">·</span>
        <span>Possession: {p.possession_date}</span>
      </div>
    </article>
  );
}
