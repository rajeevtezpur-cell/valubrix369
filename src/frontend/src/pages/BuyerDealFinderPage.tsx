import { useEffect, useMemo, useState } from "react";
import BuyerLayout from "../components/BuyerLayout";
import { PortalGuard } from "../components/PortalGuard";
import { valuate } from "../engines/valuationEngine";
import { getActiveListingsForBuyer } from "../services/listingService";

// ─── Deal score formula ─────────────────────────────────────────────────────────
// ((aiValue - listedPrice) / aiValue) × 100

function computeDealScore(listedPrice: number, aiValue: number): number {
  if (!aiValue || aiValue <= 0) return 0;
  return Math.round(((aiValue - listedPrice) / aiValue) * 100);
}

function dealTag(score: number): { label: string; color: string; bg: string } {
  if (score >= 15)
    return { label: "Strong Buy", color: "#10b981", bg: "#10b98120" };
  if (score >= 5)
    return { label: "Good Deal", color: "#14b8a6", bg: "#14b8a620" };
  if (score >= -5)
    return { label: "Fair Price", color: "#f59e0b", bg: "#f59e0b20" };
  return { label: "Overpriced", color: "#ef4444", bg: "#ef444420" };
}

function estDaysToSell(score: number): number {
  if (score >= 15) return 18;
  if (score >= 5) return 42;
  if (score >= -5) return 75;
  return 120;
}

function formatPrice(p: number): string {
  if (p >= 10_000_000) return `₹${(p / 10_000_000).toFixed(2)} Cr`;
  if (p >= 100_000) return `₹${(p / 100_000).toFixed(1)}L`;
  return `₹${p.toLocaleString("en-IN")}`;
}

// ─── Compute AI value for a live listing ───────────────────────────────────

function computeAIValueForListing(listing: any): number {
  // If listing already has AI value stored, use it
  if (listing.aiMedian && listing.aiMedian > 0) return listing.aiMedian;
  if (listing.aiValue && listing.aiValue > 0) return listing.aiValue;

  // Otherwise compute from valuationEngine
  try {
    const area = Number(
      listing.superBuiltUpArea || listing.area || listing.sqft || 0,
    );
    if (!area || !listing.locality) return 0;

    const result = valuate({
      city: listing.city || "Bangalore",
      locality: listing.locality || listing.location || "",
      projectName: listing.project || listing.projectName || "",
      builder: listing.builder || listing.builderName || "",
      propertyType: listing.propertyType || "apartment",
      area,
      bhk: Number(listing.bhk || listing.bedrooms || 2),
      floor: Number(listing.floorNumber || listing.floor || 3),
      isTopFloor: Boolean(listing.isTopFloor),
    });
    return result?.fMV || 0;
  } catch {
    return 0;
  }
}

// ─── Bar chart component ────────────────────────────────────────────────────

interface DealItem {
  id: string | number;
  name: string;
  location: string;
  listed: number;
  aiValue: number;
  type: string;
  city: string;
  reasoning: string;
  isLive: boolean;
}

function DealBarChart({ deals }: { deals: DealItem[] }) {
  const top10 = [...deals]
    .sort((a, b) =>
      computeDealScore(a.listed, a.aiValue) <
      computeDealScore(b.listed, b.aiValue)
        ? 1
        : -1,
    )
    .slice(0, 10);
  const maxScore = Math.max(
    ...top10.map((d) => Math.abs(computeDealScore(d.listed, d.aiValue))),
    1,
  );

  return (
    <div className="space-y-2">
      {top10.map((d, i) => {
        const score = computeDealScore(d.listed, d.aiValue);
        const tag = dealTag(score);
        const width = (Math.abs(score) / maxScore) * 100;
        return (
          <div key={String(d.id)} className="flex items-center gap-3">
            <span className="text-white/30 text-xs w-4 text-right">
              {i + 1}
            </span>
            <span className="text-white/70 text-xs w-36 truncate">
              {String(d.name).split(" ").slice(0, 3).join(" ")}
            </span>
            <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${width}%`, background: tag.color }}
              />
            </div>
            <span
              className="text-xs font-bold w-12 text-right"
              style={{ color: tag.color }}
            >
              {score >= 0 ? "+" : ""}
              {score}%
            </span>
          </div>
        );
      })}
      {top10.length === 0 && (
        <p className="text-white/30 text-xs text-center py-4">
          No deals to rank yet. Add listings via the Sell portal.
        </p>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function BuyerDealFinderPage() {
  const [cityFilter, setCityFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [visible, setVisible] = useState(false);
  const [liveListings, setLiveListings] = useState<any[]>([]);

  // Load live sale listings from Seller Portal (auto-updates on listing change)
  useEffect(() => {
    const load = () => setLiveListings(getActiveListingsForBuyer("sale"));
    load();
    const handler = () => load();
    window.addEventListener("valubrix:listings-updated", handler);
    return () =>
      window.removeEventListener("valubrix:listings-updated", handler);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Compute deal items from live listings
  const dealItems: DealItem[] = useMemo(() => {
    if (liveListings.length === 0) return [];
    return liveListings
      .map((l) => {
        const listedPrice = Number(
          l.sellerPrice || l.price || l.askingPrice || l.salePrice || 0,
        );
        if (!listedPrice || listedPrice <= 0) return null;
        const aiValue = computeAIValueForListing(l);
        if (!aiValue || aiValue <= 0) return null;
        const area = Number(l.superBuiltUpArea || l.area || l.sqft || 0);
        const locality = l.locality || l.location || "";
        const score = computeDealScore(listedPrice, aiValue);
        // Only include if score can be computed meaningfully
        if (!locality) return null;
        return {
          id: l.id || l.listingId || String(Math.random()),
          name:
            l.title ||
            l.project ||
            l.projectName ||
            `${l.bhk || 2}BHK in ${locality}`,
          location: `${locality}${l.city ? `, ${l.city}` : ""}`,
          listed: listedPrice,
          aiValue,
          type:
            (l.propertyType || "Flat").charAt(0).toUpperCase() +
            (l.propertyType || "flat").slice(1),
          city: l.city || "Bangalore",
          reasoning: generateReasoning(score, locality, area),
          isLive: true,
        } as DealItem;
      })
      .filter((d): d is DealItem => d !== null)
      .sort((a, b) =>
        computeDealScore(a.listed, a.aiValue) <
        computeDealScore(b.listed, b.aiValue)
          ? 1
          : -1,
      );
  }, [liveListings]);

  function generateReasoning(
    score: number,
    locality: string,
    _area: number,
  ): string {
    if (score >= 15)
      return `Significantly underpriced for ${locality}. Strong buy opportunity.`;
    if (score >= 5)
      return `Listed below AI-computed market value for ${locality}.`;
    if (score >= -5) return `Fair market price for ${locality} — well-priced.`;
    return `Listed above AI value for ${locality}. Negotiate before buying.`;
  }

  const cities = [
    "All",
    ...Array.from(new Set(dealItems.map((d) => d.city).filter(Boolean))),
  ];
  const types = [
    "All",
    ...Array.from(new Set(dealItems.map((d) => d.type).filter(Boolean))),
  ];

  const filtered = dealItems.filter((d) => {
    if (cityFilter !== "All" && d.city !== cityFilter) return false;
    if (typeFilter !== "All" && d.type !== typeFilter) return false;
    return true;
  });

  const hasNoListings = liveListings.length === 0;

  return (
    <PortalGuard portal="buyer">
      <BuyerLayout>
        <div
          className="max-w-6xl mx-auto"
          style={{ opacity: visible ? 1 : 0, transition: "opacity 0.4s" }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Deal Finder</h1>
            <p className="text-white/50">
              Live AI-powered deal scoring. Ranked by discount vs fair market
              value.
            </p>
            {!hasNoListings && (
              <p className="text-emerald-400/70 text-xs mt-1">
                • {liveListings.length} live listings found — scores auto-update
                when new listings are added
              </p>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-6 mb-8 p-4 bg-white/5 border border-white/10 rounded-2xl">
            <div>
              <p className="text-white/30 text-xs mb-2 uppercase tracking-wider">
                City
              </p>
              <div className="flex gap-2 flex-wrap">
                {cities.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCityFilter(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      cityFilter === c
                        ? "bg-[#D4AF37] text-black"
                        : "bg-white/5 text-white/50 hover:bg-white/10"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-white/30 text-xs mb-2 uppercase tracking-wider">
                Type
              </p>
              <div className="flex gap-2 flex-wrap">
                {types.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTypeFilter(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      typeFilter === t
                        ? "bg-[#D4AF37] text-black"
                        : "bg-white/5 text-white/50 hover:bg-white/10"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* No listings state */}
          {hasNoListings && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center mb-8">
              <p className="text-white/50 text-lg mb-2">No live listings yet</p>
              <p className="text-white/30 text-sm">
                Deal Finder dynamically scores all active listings from the Sell
                portal.
                <br />
                Add a property via{" "}
                <a
                  href="/seller/list-property"
                  className="text-[#D4AF37] underline"
                >
                  List Property
                </a>{" "}
                to see deals here.
              </p>
            </div>
          )}

          {!hasNoListings && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
              {/* Deal list */}
              <div className="xl:col-span-2 bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                  <h2 className="text-white font-bold">Deal List</h2>
                  <span className="text-white/30 text-xs">
                    {filtered.length} properties
                  </span>
                </div>
                <div className="overflow-y-auto max-h-[520px]">
                  {filtered.map((d) => {
                    const score = computeDealScore(d.listed, d.aiValue);
                    const tag = dealTag(score);
                    return (
                      <div
                        key={String(d.id)}
                        className="px-5 py-4 border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold truncate">
                              {d.name}
                            </p>
                            <p className="text-white/40 text-xs">
                              {d.location}
                            </p>
                            {d.isLive && (
                              <span className="inline-flex items-center gap-1 text-emerald-400/70 text-[10px] mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                                Live Listing
                              </span>
                            )}
                          </div>
                          <span
                            className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg"
                            style={{ background: tag.bg, color: tag.color }}
                          >
                            {tag.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-3">
                          <div>
                            <p className="text-white/30 text-[10px] mb-0.5">
                              Listed
                            </p>
                            <p className="text-white text-sm font-medium">
                              {formatPrice(d.listed)}
                            </p>
                          </div>
                          <div>
                            <p className="text-white/30 text-[10px] mb-0.5">
                              AI Value
                            </p>
                            <p className="text-emerald-400 text-sm font-bold">
                              {formatPrice(d.aiValue)}
                            </p>
                          </div>
                          <div>
                            <p className="text-white/30 text-[10px] mb-0.5">
                              Deal Score
                            </p>
                            <p
                              className="text-sm font-bold"
                              style={{ color: tag.color }}
                            >
                              {score >= 0 ? "+" : ""}
                              {score}%
                            </p>
                          </div>
                        </div>
                        <p className="text-white/30 text-xs mt-2 italic">
                          {d.reasoning}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                            style={{
                              color: tag.color,
                              background: tag.bg,
                              borderColor: `${tag.color}40`,
                            }}
                          >
                            {tag.label}
                          </span>
                          {score >= 0 && (
                            <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
                              Est. {estDaysToSell(score)} days to sell
                            </span>
                          )}
                          <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
                            Gap: {formatPrice(Math.abs(d.aiValue - d.listed))}
                          </span>
                          <a
                            href="/buyer/negotiation"
                            className="text-[10px] text-[#D4AF37]/70 bg-[#D4AF37]/10 px-2 py-0.5 rounded-full hover:bg-[#D4AF37]/20 transition-colors"
                          >
                            Negotiation Advisor →
                          </a>
                        </div>
                      </div>
                    );
                  })}
                  {filtered.length === 0 && dealItems.length > 0 && (
                    <div className="py-12 text-center text-white/30">
                      No deals match selected filters
                    </div>
                  )}
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-5">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <h3 className="text-white font-bold mb-4 text-sm">
                    Top Deals by Score
                  </h3>
                  <DealBarChart
                    deals={filtered.length > 0 ? filtered : dealItems}
                  />
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <h3 className="text-white font-bold mb-4 text-sm">
                    How Scores Work
                  </h3>
                  <ul className="space-y-3 text-white/60 text-xs">
                    <li className="flex gap-2">
                      <span className="text-emerald-400 mt-0.5">→</span>
                      <span>
                        Score = ((AI Value − Listed Price) / AI Value) × 100
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-[#D4AF37] mt-0.5">→</span>
                      <span>
                        Strong Buy (≥15%), Good Deal (≥5%), Fair Price (≥1%),
                        Overpriced (&lt;-5%)
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-blue-400 mt-0.5">→</span>
                      <span>
                        AI values are computed from 985+ real Bangalore
                        transactions. Scores auto-update when listings change.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </BuyerLayout>
    </PortalGuard>
  );
}
