import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Bath, BedDouble, MapPin, Square, Star } from "lucide-react";
import { formatPrice } from "../data/intelligence";
import type { PropertyListing } from "../hooks/useQueries";

interface PropertyCardProps {
  listing?: PropertyListing;
  sampleListing?: {
    id: string;
    title: string;
    city: string;
    locality: string;
    propertyType: string;
    priceInr: number;
    areaSqft: number;
    bedrooms: number;
    bathrooms: number;
    builderName: string;
    stage: string;
    badges: string[];
  };
  /** Optional explicit badge override flags */
  isHighLiquidity?: boolean;
  isDistressDeal?: boolean;
  isHighYield?: boolean;
  isHotMarket?: boolean;
  index?: number;
}

const STAGE_LABELS: Record<string, string> = {
  ready: "Ready to Move",
  underConstruction: "Under Construction",
  prelaunch: "Pre-Launch",
};

const TYPE_LABELS: Record<string, string> = {
  bhk1: "1 BHK",
  bhk2: "2 BHK",
  bhk3: "3 BHK",
  villa: "Villa",
  plot: "Plot",
};

/** Compute smart badges from listing fields */
function computeSmartBadges(
  listing: PropertyListing,
  isHighLiquidity?: boolean,
  isDistressDeal?: boolean,
  isHighYield?: boolean,
  isHotMarket?: boolean,
): string[] {
  const badges: string[] = [];

  // Explicit flag overrides take precedence
  if (isHighLiquidity) badges.push("High Liquidity");
  if (isDistressDeal) badges.push("Distress Deal");
  if (isHighYield) badges.push("High Yield");
  if (isHotMarket) badges.push("Hot Market");

  // If no flags provided, derive from listing data
  if (!isHighLiquidity && !isDistressDeal && !isHighYield && !isHotMarket) {
    const price = Number(listing.priceInr);
    const area = Number(listing.areaSqft);

    // High Liquidity: ready-to-move properties under ₹1.5Cr are highly liquid
    if (listing.stage === "ready" && price > 0 && price < 15_000_000) {
      badges.push("High Liquidity");
    }

    // Distress Deal: price significantly below typical PSF (rough heuristic)
    if (area > 0 && price > 0) {
      const psf = price / area;
      if (psf < 4500) badges.push("Distress Deal");
    }

    // High Yield: smaller units tend to have higher rental yield
    if (area > 0 && area <= 1000 && listing.stage === "ready") {
      badges.push("High Yield");
    }

    // Hot Market: prelaunch or newly listed in high-demand areas
    if (listing.stage === "prelaunch") {
      badges.push("Hot Market");
    }
  }

  return badges;
}

const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  "High Liquidity": { bg: "rgba(34,197,94,0.18)", color: "#4ade80" },
  "Distress Deal": { bg: "rgba(248,113,113,0.18)", color: "#f87171" },
  "High Yield": { bg: "rgba(212,175,55,0.18)", color: "#D8B56A" },
  "Hot Market": { bg: "rgba(249,115,22,0.18)", color: "#f97316" },
  "High-Value Asset": { bg: "rgba(201,168,76,0.9)", color: "#0A0F1E" },
  "Golden Verified": { bg: "rgba(201,168,76,0.9)", color: "#0A0F1E" },
};

export function PropertyCard({
  listing,
  sampleListing,
  isHighLiquidity,
  isDistressDeal,
  isHighYield,
  isHotMarket,
  index = 1,
}: PropertyCardProps) {
  const data = listing
    ? {
        id: listing.id,
        title: listing.title,
        city: listing.city,
        locality: listing.locality,
        propertyType: listing.propertyType,
        priceInr: Number(listing.priceInr),
        areaSqft: Number(listing.areaSqft),
        bedrooms: Number(listing.bedrooms),
        bathrooms: Number(listing.bathrooms),
        builderName: listing.builderName,
        stage: listing.stage,
        badges: computeSmartBadges(
          listing,
          isHighLiquidity,
          isDistressDeal,
          isHighYield,
          isHotMarket,
        ),
      }
    : sampleListing;

  if (!data) return null;

  return (
    <div
      className="glass-card-hover overflow-hidden"
      data-ocid={`property.item.${index}`}
    >
      {/* Image placeholder */}
      <div className="h-48 bg-gradient-to-br from-secondary/60 to-muted/40 relative flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="text-4xl opacity-30">🏢</div>
        {/* Smart Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1">
          {data.badges.slice(0, 3).map((b) => {
            const style = BADGE_STYLES[b] ?? {
              bg: "rgba(59,130,246,0.18)",
              color: "#60a5fa",
            };
            return (
              <span
                key={b}
                className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{
                  background: style.bg,
                  border: `1px solid ${style.color}40`,
                  color: style.color,
                  fontSize: 10,
                }}
              >
                {b}
              </span>
            );
          })}
        </div>
        <div className="absolute bottom-2 right-2">
          <Badge variant="secondary" className="text-xs">
            {STAGE_LABELS[data.stage] || data.stage}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2">
            {data.title}
          </h3>
          <div className="flex items-center gap-1 mt-1 text-muted-foreground text-xs">
            <MapPin className="w-3 h-3" />
            <span>
              {data.locality}, {data.city}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {data.bedrooms > 0 && (
            <span className="flex items-center gap-1">
              <BedDouble className="w-3 h-3" /> {data.bedrooms} BHK
            </span>
          )}
          <span className="flex items-center gap-1">
            <Bath className="w-3 h-3" /> {data.bathrooms}
          </span>
          <span className="flex items-center gap-1">
            <Square className="w-3 h-3" /> {data.areaSqft.toLocaleString()} sqft
          </span>
        </div>

        {data.builderName && (
          <div className="flex items-center gap-1 text-xs">
            <Star className="w-3 h-3 gold-text" />
            <span className="text-muted-foreground">{data.builderName}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-lg font-bold gold-text">
              {formatPrice(data.priceInr)}
            </p>
            <p className="text-xs text-muted-foreground">
              {TYPE_LABELS[data.propertyType] || data.propertyType}
            </p>
          </div>
          <Link to="/property/$id" params={{ id: data.id }}>
            <Button
              size="sm"
              variant="outline"
              className="border-gold/40 gold-text hover:bg-gold/10"
              data-ocid={`property.view.button.${index}`}
            >
              View
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
