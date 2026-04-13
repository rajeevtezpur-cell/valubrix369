import { TrendingUp } from "lucide-react";
import React, { useMemo } from "react";
import type { ValuationOutput } from "../../engines/valuationEngine";
import { ProCardSkeleton } from "./ProCardSkeleton";

interface Props {
  loading: boolean;
  valuation?: ValuationOutput;
  locality: string;
  propertyType: string;
  area: number;
}

function computeIRR(
  valuation: ValuationOutput | undefined,
  area: number,
): { irr: number; rentalYield: number; appreciation: number } {
  if (!valuation || area <= 0) {
    return { irr: 8.5, rentalYield: 4.5, appreciation: 12.5 };
  }

  const pred = valuation.prediction;
  const appreciation =
    pred && valuation.fMV > 0
      ? Math.round(
          ((pred.oneYearPrice - valuation.fMV) / valuation.fMV) * 100 * 10,
        ) / 10
      : 6.0;

  const annualRentalYield =
    Math.round((3.5 + (valuation.scores.demand / 100) * 2.5) * 10) / 10;

  const irr = Math.max(
    Math.round(((annualRentalYield + appreciation) / 2) * 10) / 10,
    0,
  );

  return {
    irr,
    rentalYield: annualRentalYield,
    appreciation: Math.max(appreciation, 0),
  };
}

function getIRRColor(irr: number): string {
  if (irr >= 15) return "text-emerald-400";
  if (irr >= 10) return "text-amber-400";
  if (irr >= 6) return "text-sky-400";
  return "text-[#b9c6d8]";
}

export function InvestorIRRCard({ loading, valuation, area }: Props) {
  const { irr, rentalYield, appreciation } = useMemo(
    () => computeIRR(valuation, area),
    [valuation, area],
  );
  const colorClass = getIRRColor(irr);

  if (loading) return <ProCardSkeleton height="168px" />;

  return (
    <div
      className="glass-card p-5 flex flex-col gap-3 min-h-[168px]"
      data-ocid="pro-investor-irr-card"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "rgba(52,211,153,0.12)",
            border: "1px solid rgba(52,211,153,0.3)",
          }}
        >
          <TrendingUp className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider gold-text">
            Investor IRR
          </p>
          <p className="text-[11px] text-[#b9c6d8] mt-0.5">
            Projected 5-year return on investment
          </p>
        </div>
      </div>

      <div
        className={`text-4xl font-bold font-['Playfair_Display'] ${colorClass}`}
      >
        {irr.toFixed(1)}%
        <span className="text-sm font-normal text-[#b9c6d8] ml-1">p.a.</span>
      </div>

      <div className="flex items-center gap-4 text-xs text-[#b9c6d8]">
        <span>
          Yield{" "}
          <span className="text-emerald-400 font-semibold">
            {rentalYield.toFixed(1)}%
          </span>
        </span>
        <span className="text-white/20">+</span>
        <span>
          Appreciation{" "}
          <span className="text-amber-400 font-semibold">
            {appreciation.toFixed(1)}%
          </span>
        </span>
      </div>

      <p className="text-[11px] text-[#b9c6d8]">
        Simplified estimate · 5-year horizon
      </p>
    </div>
  );
}
