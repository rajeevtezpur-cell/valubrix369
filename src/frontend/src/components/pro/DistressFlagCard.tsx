import { AlertTriangle, CheckCircle, Star } from "lucide-react";
import React, { useMemo } from "react";
import type { ValuationOutput } from "../../engines/valuationEngine";
import { ProCardSkeleton } from "./ProCardSkeleton";

interface Props {
  loading: boolean;
  valuation?: ValuationOutput;
  listingPrice?: number;
}

type FlagType = "Distress Detected" | "Market Rate" | "Premium Asset";

function computeFlag(
  valuation: ValuationOutput | undefined,
  listingPrice: number | undefined,
): { flag: FlagType; detail: string } {
  if (!valuation || !listingPrice || valuation.fMV === 0) {
    return {
      flag: "Market Rate",
      detail: "No listing price provided for comparison",
    };
  }

  const pctBelow = ((valuation.fMV - listingPrice) / valuation.fMV) * 100;

  if (pctBelow > 15) {
    return {
      flag: "Distress Detected",
      detail: `${Math.round(pctBelow)}% below AI fair market value`,
    };
  }
  if (pctBelow < -10) {
    return {
      flag: "Premium Asset",
      detail: `${Math.round(Math.abs(pctBelow))}% above market — premium pricing`,
    };
  }
  return {
    flag: "Market Rate",
    detail: "Priced in line with AI fair market estimate",
  };
}

const FLAG_CONFIG = {
  "Distress Detected": {
    icon: (cls: string) => <AlertTriangle className={`w-5 h-5 ${cls}`} />,
    iconColorClass: "text-rose-400",
    iconBg: "rgba(251,113,133,0.12)",
    iconBorder: "rgba(251,113,133,0.3)",
    badgeBg: "rgba(239,68,68,0.18)",
    badgeBorder: "rgba(239,68,68,0.4)",
    badgeText: "text-rose-300",
    textColor: "text-rose-400",
  },
  "Market Rate": {
    icon: (cls: string) => <CheckCircle className={`w-5 h-5 ${cls}`} />,
    iconColorClass: "text-emerald-400",
    iconBg: "rgba(52,211,153,0.12)",
    iconBorder: "rgba(52,211,153,0.3)",
    badgeBg: "rgba(16,185,129,0.15)",
    badgeBorder: "rgba(16,185,129,0.35)",
    badgeText: "text-emerald-300",
    textColor: "text-emerald-400",
  },
  "Premium Asset": {
    icon: (cls: string) => (
      <Star className={`w-5 h-5 ${cls}`} fill="currentColor" />
    ),
    iconColorClass: "gold-text",
    iconBg: "rgba(216,181,106,0.15)",
    iconBorder: "rgba(216,181,106,0.3)",
    badgeBg: "rgba(216,181,106,0.15)",
    badgeBorder: "rgba(216,181,106,0.35)",
    badgeText: "gold-text",
    textColor: "gold-text",
  },
} as const;

export function DistressFlagCard({ loading, valuation, listingPrice }: Props) {
  const { flag, detail } = useMemo(
    () => computeFlag(valuation, listingPrice),
    [valuation, listingPrice],
  );
  const c = FLAG_CONFIG[flag];

  if (loading) return <ProCardSkeleton height="168px" />;

  return (
    <div
      className="glass-card p-5 flex flex-col gap-3 min-h-[168px]"
      data-ocid="pro-distress-flag-card"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: c.iconBg, border: `1px solid ${c.iconBorder}` }}
        >
          {c.icon(c.iconColorClass)}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider gold-text">
            Distress Flag
          </p>
          <p className="text-[11px] text-[#b9c6d8] mt-0.5">
            Whether this property is priced below market
          </p>
        </div>
      </div>

      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg w-fit"
        style={{ background: c.badgeBg, border: `1px solid ${c.badgeBorder}` }}
      >
        <span className={`text-sm font-bold ${c.badgeText}`}>{flag}</span>
      </div>

      <p className={`text-xs ${c.textColor}`}>{detail}</p>
    </div>
  );
}
