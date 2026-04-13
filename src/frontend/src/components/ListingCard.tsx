import type { MockListing } from "@/data/mockListings";
import { formatPrice } from "@/data/mockListings";
import { formatAIRange, getPriceLabel } from "@/utils/aiEngine";
import { estimateRent } from "@/utils/rentEngine";
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Edit,
  Eye,
  MapPin,
  MessageCircle,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { fmtMonthlyRent as fmtRent } from "../utils/rentDisplay";

// fmtRent imported from rentDisplay.ts

// Badge color config
const SMART_BADGE_STYLES: Record<
  string,
  { bg: string; border: string; color: string }
> = {
  "High Liquidity": {
    bg: "rgba(34,197,94,0.18)",
    border: "rgba(74,222,128,0.4)",
    color: "#4ade80",
  },
  "Distress Deal": {
    bg: "rgba(248,113,113,0.18)",
    border: "rgba(248,113,113,0.4)",
    color: "#f87171",
  },
  "High Yield": {
    bg: "rgba(212,175,55,0.18)",
    border: "rgba(216,181,106,0.4)",
    color: "#D8B56A",
  },
  "Hot Market": {
    bg: "rgba(249,115,22,0.18)",
    border: "rgba(249,115,22,0.4)",
    color: "#f97316",
  },
};

/** Derive smart badges from listing data when not explicitly provided */
function deriveSmartBadges(
  listing: MockListing,
  isHighLiquidity?: boolean,
  isDistressDeal?: boolean,
  isHighYield?: boolean,
  isHotMarket?: boolean,
): string[] {
  // If any explicit flag is provided, use only those
  if (
    isHighLiquidity !== undefined ||
    isDistressDeal !== undefined ||
    isHighYield !== undefined ||
    isHotMarket !== undefined
  ) {
    const badges: string[] = [];
    if (isHighLiquidity) badges.push("High Liquidity");
    if (isDistressDeal) badges.push("Distress Deal");
    if (isHighYield) badges.push("High Yield");
    if (isHotMarket) badges.push("Hot Market");
    return badges;
  }

  // Auto-derive from listing data
  const badges: string[] = [];
  const price = listing.sellerPrice || listing.price || 0;
  const area =
    listing.carpetArea ||
    listing.superBuiltUpArea ||
    listing.builtUpArea ||
    listing.plotArea ||
    0;
  const listingType = listing.listingType || "sale";
  const raw = listing as unknown as Record<string, unknown>;
  const momentum = String(raw.marketMomentum || "");
  const tag = String(raw.tag || raw.dealType || "").toLowerCase();
  const liquidity = Number(raw.liquidityScore || 0);

  if (momentum === "hot") badges.push("Hot Market");

  if (tag.includes("distress") || tag.includes("motivated"))
    badges.push("Distress Deal");

  if (liquidity > 70) badges.push("High Liquidity");

  // High yield: rent listings with good area/price ratio
  if (listingType === "rent" && area > 0 && price > 0) {
    const annualRent = price * 12;
    const estimatedValue = area * 8000;
    const yieldPct = (annualRent / estimatedValue) * 100;
    if (yieldPct > 3.5) badges.push("High Yield");
  }

  // Distress heuristic: sale listing with PSF well below market
  if (listingType === "sale" && area > 0 && price > 0 && badges.length === 0) {
    const psf = price / area;
    if (psf < 4000) badges.push("Distress Deal");
  }

  return badges;
}

interface ListingCardProps {
  listing: MockListing;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: "buyer" | "seller" | "none";
  /** Smart badge flags — if provided, only these are shown */
  isHighLiquidity?: boolean;
  isDistressDeal?: boolean;
  isHighYield?: boolean;
  isHotMarket?: boolean;
  index?: number;
}

function GalleryModal({
  images,
  startIndex,
  onClose,
}: {
  images: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      data-ocid="listing.gallery.modal"
    >
      <button
        type="button"
        className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 rounded-full p-2"
        onClick={onClose}
        data-ocid="listing.gallery.close_button"
      >
        <X size={20} />
      </button>
      <div
        className="relative max-w-4xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <img
          src={images[idx]}
          alt={`Slide ${idx + 1} of ${images.length}`}
          className="w-full max-h-[80vh] object-contain rounded-xl"
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
              onClick={() =>
                setIdx((i) => (i - 1 + images.length) % images.length)
              }
              data-ocid="listing.gallery.prev_button"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
              onClick={() => setIdx((i) => (i + 1) % images.length)}
              data-ocid="listing.gallery.next_button"
            >
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white/80 text-xs px-3 py-1 rounded-full">
              {idx + 1} / {images.length}
            </div>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-4 overflow-x-auto max-w-lg">
          {images.map((img, i) => (
            <button
              key={img || `thumb-${i}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIdx(i);
              }}
              className={`w-12 h-9 rounded overflow-hidden flex-shrink-0 border-2 transition-all ${i === idx ? "border-[#D4AF37]" : "border-white/20"}`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AmenitiesModal({
  amenities,
  onClose,
}: {
  amenities: string[];
  onClose: () => void;
}) {
  const amenityIcons: Record<string, string> = {
    "Swimming Pool": "🏊",
    Gym: "💪",
    Clubhouse: "🏛️",
    "Club House": "🏛️",
    Security: "🛡️",
    "24/7 Security": "🛡️",
    CCTV: "📷",
    "Power Backup": "⚡",
    Lift: "🛗",
    Garden: "🌳",
    Parking: "🚗",
    Playground: "🛝",
    "Tennis Court": "🎾",
    "Basketball Court": "🏀",
    "Jogging Track": "🏃",
    "Children Play Area": "🧸",
    Intercom: "📞",
    "Rainwater Harvesting": "💧",
    "Solar Power": "☀️",
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      data-ocid="listing.amenities.modal"
    >
      <div
        className="bg-[#0F1629] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">All Amenities</h3>
          <button
            type="button"
            className="text-white/50 hover:text-white"
            onClick={onClose}
            data-ocid="listing.amenities.close_button"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <div className="flex flex-wrap gap-2">
            {amenities.map((a) => (
              <span
                key={a}
                className="flex items-center gap-1.5 text-xs bg-white/5 text-white/70 px-3 py-1.5 rounded-full border border-white/10"
              >
                <span>{amenityIcons[a] || "✓"}</span>
                {a}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getPriceLabelStyle(label: string): {
  color: string;
  bg: string;
  border: string;
} {
  if (label === "Overpriced")
    return {
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
    };
  if (label === "Undervalued")
    return {
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
    };
  return {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  };
}

export default function ListingCard({
  listing,
  onView,
  onEdit,
  onDelete,
  showActions = "none",
  isHighLiquidity,
  isDistressDeal,
  isHighYield,
  isHotMarket,
  index = 0,
}: ListingCardProps) {
  // Compute smart badges for this listing
  const smartBadges = deriveSmartBadges(
    listing,
    isHighLiquidity,
    isDistressDeal,
    isHighYield,
    isHotMarket,
  );
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryStart, setGalleryStart] = useState(0);
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);

  const images = listing.images || [];
  const hasImages = images.length > 0;
  const extraPhotos = images.length - 1;

  const area =
    listing.carpetArea ||
    listing.superBuiltUpArea ||
    listing.builtUpArea ||
    listing.plotArea ||
    0;
  const floor = listing.floorNumber ?? listing.floor;
  const builder = listing.builder || listing.builderName;
  const project = listing.project || listing.projectName;
  const amenities = listing.amenities || [];

  const aiLabel = listing.aiMedian
    ? getPriceLabel(listing.sellerPrice || listing.price, listing.aiMedian)
    : "Fair Price";
  const labelStyle = getPriceLabelStyle(aiLabel);

  const listingType = listing.listingType || "sale";
  const isSaleListing = listingType === "sale";
  const propertyValue = listing.sellerPrice || listing.price || 0;
  const rentEst =
    isSaleListing && propertyValue > 0 && area > 0
      ? estimateRent({
          locality: listing.location || "",
          bhk: listing.bhk,
          area,
          propertyValue,
          furnishing: listing.furnishedStatus,
          propertyType: listing.propertyType,
        })
      : null;

  const openGallery = (idx = 0) => {
    if (!hasImages) return;
    setGalleryStart(idx);
    setGalleryOpen(true);
  };

  return (
    <>
      <div
        className="bg-white/5 border border-white/10 hover:border-[#D4AF37]/30 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_4px_24px_rgba(212,175,55,0.08)]"
        data-ocid={`listing.item.${index + 1}`}
      >
        <div className="flex flex-col md:flex-row">
          {/* LEFT — Cover Image */}
          <div
            className="relative flex-shrink-0 md:w-52 cursor-pointer text-left"
            onClick={() => openGallery(0)}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") && openGallery(0)
            }
          >
            <div className="aspect-video md:aspect-auto md:h-full min-h-[140px] relative">
              {hasImages ? (
                <img
                  src={images[0]}
                  alt={listing.title}
                  className="w-full h-full object-cover rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none"
                />
              ) : (
                <div className="w-full h-full min-h-[140px] bg-gradient-to-br from-[#1a2040] to-[#0a0f1e] rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none flex items-center justify-center">
                  <span className="text-4xl opacity-30">🏢</span>
                </div>
              )}
              {/* Smart Badges overlay */}
              {smartBadges.length > 0 && (
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {smartBadges.slice(0, 3).map((badge) => {
                    const s = SMART_BADGE_STYLES[badge] ?? {
                      bg: "rgba(59,130,246,0.18)",
                      border: "rgba(96,165,250,0.4)",
                      color: "#60a5fa",
                    };
                    return (
                      <span
                        key={badge}
                        className="font-bold"
                        style={{
                          fontSize: 9,
                          padding: "2px 7px",
                          borderRadius: 99,
                          background: s.bg,
                          border: `1px solid ${s.border}`,
                          color: s.color,
                          backdropFilter: "blur(8px)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {badge}
                      </span>
                    );
                  })}
                </div>
              )}
              {extraPhotos > 0 && (
                <span
                  className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full font-medium backdrop-blur-sm pointer-events-none"
                  data-ocid="listing.gallery.open_modal_button"
                >
                  +{extraPhotos} photos
                </span>
              )}
            </div>
          </div>

          {/* CENTER — Property Details */}
          <div className="flex-1 p-4 min-w-0">
            {/* Price + AI tag */}
            <div className="flex flex-wrap items-start gap-2 mb-1">
              <span className="text-[#D4AF37] font-bold text-xl">
                {formatPrice(listing.sellerPrice || listing.price)}
              </span>
              {listing.aiMedian && listing.aiMedian > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${labelStyle.color} ${labelStyle.bg} ${labelStyle.border}`}
                >
                  {aiLabel}
                </span>
              )}
            </div>

            {/* AI Range */}
            {listing.aiLower && listing.aiUpper && (
              <p className="text-white/40 text-xs mb-2">
                AI Est: {formatAIRange(listing.aiLower, listing.aiUpper)}
              </p>
            )}

            {/* Location */}
            <div className="flex items-center gap-1 text-white/50 text-sm mb-2">
              <MapPin size={12} className="flex-shrink-0" />
              <span className="truncate">
                {listing.location}
                {listing.city && listing.city !== listing.location
                  ? `, ${listing.city}`
                  : ""}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-white font-semibold text-sm truncate mb-2">
              {listing.title}
            </h3>

            {/* Details row */}
            <div className="flex flex-wrap gap-3 text-white/50 text-xs mb-2">
              {area > 0 && (
                <span className="flex items-center gap-1">
                  <span className="text-white/30">Area</span>
                  <span className="text-white/70">
                    {area.toLocaleString()} sqft
                  </span>
                </span>
              )}
              {listing.bhk && (
                <span className="flex items-center gap-1">
                  <span className="text-white/30">BHK</span>
                  <span className="text-white/70">{listing.bhk}</span>
                </span>
              )}
              {floor !== undefined && floor !== null && (
                <span className="flex items-center gap-1">
                  <span className="text-white/30">Floor</span>
                  <span className="text-white/70">
                    {floor}
                    {listing.totalFloors ? `/${listing.totalFloors}` : ""}
                  </span>
                </span>
              )}
              {listing.facing && (
                <span className="flex items-center gap-1">
                  <Compass size={10} className="text-white/30" />
                  <span className="text-white/70">{listing.facing}</span>
                </span>
              )}
            </div>

            {/* Builder/Project */}
            {(builder || project) && (
              <p className="text-[#D4AF37]/60 text-xs truncate">
                {builder}
                {builder && project ? " · " : ""}
                {project}
              </p>
            )}

            {/* Rental Yield Intelligence — sale listings only */}
            {rentEst && !rentEst.hide && (
              <div className="mt-2 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <div>
                    <p className="text-white/60 text-xs">
                      Est. Rent{" "}
                      <span className="text-emerald-400 font-medium">
                        {fmtRent(rentEst.estimatedMonthlyRent)}/mo
                      </span>
                    </p>
                    <p className="text-white/40 text-xs">
                      ~{rentEst.grossYieldPercent.toFixed(1)}% Yield
                    </p>
                  </div>
                  <span
                    className={`ml-auto text-[10px] px-1.5 py-0.5 rounded border ${
                      rentEst.confidenceTier === "high"
                        ? "text-emerald-400/70 bg-emerald-500/10 border-emerald-500/20"
                        : "text-white/30 bg-white/5 border-white/10"
                    }`}
                  >
                    {rentEst.confidenceLabel}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Amenities + Actions */}
          <div className="flex-shrink-0 md:w-44 p-4 border-t md:border-t-0 md:border-l border-white/5 flex flex-col gap-3">
            {/* Amenities */}
            {amenities.length > 0 && (
              <div>
                <p className="text-white/30 text-xs mb-1.5">Amenities</p>
                <div className="flex flex-wrap gap-1">
                  {amenities.slice(0, 3).map((a) => (
                    <span
                      key={a}
                      className="text-[10px] bg-white/5 text-white/50 px-2 py-0.5 rounded border border-white/10"
                    >
                      {a}
                    </span>
                  ))}
                  {amenities.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setAmenitiesOpen(true)}
                      className="text-[10px] text-[#D4AF37]/70 hover:text-[#D4AF37] underline"
                      data-ocid="listing.amenities.open_modal_button"
                    >
                      +{amenities.length - 3} more
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 mt-auto">
              {showActions === "seller" && (
                <>
                  {onView && (
                    <button
                      type="button"
                      onClick={onView}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-medium transition-all w-full"
                      data-ocid="listing.view.button"
                    >
                      <Eye size={12} /> View
                    </button>
                  )}
                  {onEdit && (
                    <button
                      type="button"
                      onClick={onEdit}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 text-xs font-medium transition-all w-full"
                      data-ocid="listing.edit.button"
                    >
                      <Edit size={12} /> Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={onDelete}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-all w-full"
                      data-ocid="listing.delete.button"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                </>
              )}
              {showActions === "buyer" && (
                <>
                  <button
                    type="button"
                    onClick={onView}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 text-xs font-medium transition-all w-full"
                    data-ocid="listing.view.button"
                  >
                    <Eye size={12} /> View Details
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 text-xs font-medium transition-all w-full"
                    data-ocid="listing.enquire.button"
                  >
                    <MessageCircle size={12} /> Enquire
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {galleryOpen && hasImages && (
        <GalleryModal
          images={images}
          startIndex={galleryStart}
          onClose={() => setGalleryOpen(false)}
        />
      )}
      {amenitiesOpen && (
        <AmenitiesModal
          amenities={amenities}
          onClose={() => setAmenitiesOpen(false)}
        />
      )}
    </>
  );
}
