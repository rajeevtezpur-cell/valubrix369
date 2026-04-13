import React from "react";
import type { ValuationOutput as UnifiedValuationOutput } from "../../engines/unifiedEngine";
import type { ValuationOutput } from "../../engines/valuationEngine";
import { ConfidenceMeterCard } from "./ConfidenceMeterCard";
import { DistressFlagCard } from "./DistressFlagCard";
import { InvestorIRRCard } from "./InvestorIRRCard";
import { LiquidityScoreCard } from "./LiquidityScoreCard";
import { MarketHeatCard } from "./MarketHeatCard";

interface Props {
  valuation?: ValuationOutput;
  unifiedResult?: UnifiedValuationOutput;
  loading: boolean;
  locality: string;
  propertyType: string;
  area: number;
  lat?: number;
  lng?: number;
  listingPrice?: number;
}

/**
 * ProEnhancementCards — always rendered (skeleton or data).
 * Never hidden. Full-height skeletons prevent layout shift.
 */
export function ProEnhancementCards({
  valuation,
  unifiedResult,
  loading,
  locality,
  propertyType,
  area,
  lat,
  lng,
  listingPrice,
}: Props) {
  return (
    <section aria-label="Pro Intelligence" data-ocid="pro-enhancement-section">
      {/* Section header */}
      <div className="mb-5">
        <div className="flex items-center gap-3">
          <div
            className="h-px flex-1"
            style={{
              background:
                "linear-gradient(90deg, rgba(216,181,106,0.5), transparent)",
            }}
          />
          <div className="flex flex-col items-center">
            <h2
              className="text-base font-bold uppercase tracking-[0.15em] gold-text"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Pro Intelligence
            </h2>
            <p className="text-[11px] text-[#b9c6d8] mt-0.5 tracking-wide">
              AI-powered market signals
            </p>
          </div>
          <div
            className="h-px flex-1"
            style={{
              background:
                "linear-gradient(270deg, rgba(216,181,106,0.5), transparent)",
            }}
          />
        </div>
      </div>

      {/* Cards grid — responsive 1 → 2 → 3 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <LiquidityScoreCard
          loading={loading}
          valuation={valuation}
          unifiedResult={unifiedResult}
          locality={locality}
          lat={lat}
          lng={lng}
        />
        <MarketHeatCard
          loading={loading}
          locality={locality}
          lat={lat}
          lng={lng}
          unifiedResult={unifiedResult}
        />
        <DistressFlagCard
          loading={loading}
          valuation={valuation}
          listingPrice={listingPrice}
        />
        <InvestorIRRCard
          loading={loading}
          valuation={valuation}
          locality={locality}
          propertyType={propertyType}
          area={area}
        />
        <ConfidenceMeterCard
          loading={loading}
          valuation={valuation}
          unifiedResult={unifiedResult}
        />
      </div>
    </section>
  );
}
