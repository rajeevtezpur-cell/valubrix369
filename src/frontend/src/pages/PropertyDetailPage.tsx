import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart2,
  Calendar,
  Car,
  ChevronLeft,
  ChevronRight,
  Compass,
  Download,
  Home,
  MapPin,
  Maximize2,
  MessageCircle,
  Phone,
  TrendingUp,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import GlobalNav from "../components/GlobalNav";
import { useAuth } from "../context/AuthContext";
import { formatPrice, getAllListings } from "../data/mockListings";
import { useActor } from "../hooks/useActor";
import { trackFeedback } from "../services/intelligenceService";
import { incrementListingMetric } from "../services/listingService";

const BADGE_COLORS: Record<string, string> = {
  "High Liquidity": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Golden Verified": "bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30",
  "High Value Asset": "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

function getAiValues(listing: ReturnType<typeof getAllListings>[0]): {
  lower: number;
  upper: number;
  median: number;
} {
  // Use stored AI values from listing — computed once at listing time, never recomputed here
  if (listing.aiLower && listing.aiUpper && listing.aiMedian) {
    console.log(
      "[ValuBrix DEBUG] Buyer portal using STORED AI values for listing",
      listing.id,
      "→ aiLower:",
      listing.aiLower,
      "aiUpper:",
      listing.aiUpper,
      "aiMedian:",
      listing.aiMedian,
    );
    return {
      lower: listing.aiLower,
      upper: listing.aiUpper,
      median: listing.aiMedian,
    };
  }
  // Fallback only if AI was never computed (legacy listings)
  const FALLBACK_PRICE_MAP: Record<string, number> = {
    rajankunte: 4200,
    hebbal: 7000,
    devanahalli: 4500,
    thanisandra: 5500,
    yelahanka: 5500,
    bagalur: 4000,
    jakkur: 6500,
    hennur: 5800,
    nagavara: 7000,
    kogilu: 5800,
    kannur: 5500,
    jalahalli: 6000,
    vidyaranyapura: 5800,
    whitefield: 8500,
    koramangala: 12000,
    indiranagar: 11500,
    "hsr layout": 10000,
    marathahalli: 7500,
  };
  const localityKey = (listing.location || "").toLowerCase();
  let pricePerSqft = 6500;
  for (const [key, price] of Object.entries(FALLBACK_PRICE_MAP)) {
    if (localityKey.includes(key) || key.includes(localityKey)) {
      pricePerSqft = price;
      break;
    }
  }
  const area = listing.carpetArea || 1000;
  const mid = Math.round(pricePerSqft * area);
  console.warn(
    "[ValuBrix DEBUG] Listing",
    listing.id,
    "has no stored AI values — using fallback estimate",
    mid,
  );
  return {
    lower: Math.round(mid * 0.9),
    upper: Math.round(mid * 1.1),
    median: mid,
  };
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getStageFromType(type: string): string {
  if (type === "visit_request") return "Visit Scheduled";
  if (type === "callback_request") return "Call Requested";
  if (type === "interest") return "New Inquiry";
  if (type === "valuation_request") return "New Inquiry";
  return "New Inquiry";
}

function upsertLead(lead: Record<string, unknown>) {
  try {
    const existing: any[] = JSON.parse(
      localStorage.getItem("valubrix_leads") || "[]",
    );
    const phone = (lead.buyerPhone as string) || "";
    const propId = lead.propertyId as string;
    const leadKey = `${phone}_${propId}`;

    const existingIndex = existing.findIndex((l) => {
      const lPhone = l.buyerPhone || l.phone || "";
      const lPropId = l.propertyId || "";
      return (
        lPhone === phone &&
        lPropId === propId &&
        phone !== "N/A" &&
        phone !== ""
      );
    });

    if (existingIndex >= 0) {
      const existingLead = existing[existingIndex];
      const activities: any[] = existingLead.activities || [
        {
          type: existingLead.type,
          message: existingLead.message,
          date: existingLead.createdAt,
        },
      ];
      activities.push({
        type: lead.type,
        message: lead.message,
        date: lead.createdAt,
      });
      existing[existingIndex] = {
        ...existingLead,
        buyerName:
          lead.buyerName && lead.buyerName !== "Anonymous"
            ? lead.buyerName
            : existingLead.buyerName,
        stage: getStageFromType(lead.type as string),
        type: lead.type,
        message: lead.message,
        updatedAt: lead.createdAt,
        activities,
        leadKey,
      };
      const updated = existing.splice(existingIndex, 1)[0];
      existing.unshift(updated);
    } else {
      existing.unshift({
        ...lead,
        leadKey,
        activities: [
          { type: lead.type, message: lead.message, date: lead.createdAt },
        ],
      });
    }
    localStorage.setItem("valubrix_leads", JSON.stringify(existing));
  } catch {}
}

function saveVisitRequest(req: Record<string, unknown>) {
  try {
    const existing = JSON.parse(
      localStorage.getItem("valubrix_visit_requests") || "[]",
    );
    existing.unshift(req);
    localStorage.setItem("valubrix_visit_requests", JSON.stringify(existing));
  } catch {}
}

export default function PropertyDetailPage() {
  const { id } = useParams({ from: "/property/$id" });
  const { user } = useAuth();
  const allListings = getAllListings();
  const listing = allListings.find((l) => l.id === id);
  const [imgIndex, setImgIndex] = useState(0);

  // Modals
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("");
  const [contactName, setContactName] = useState(user?.fullName || "");
  const [contactPhone, setContactPhone] = useState(user?.mobile || "");
  const [contactMsg, setContactMsg] = useState("");
  const [contactType, setContactType] = useState<
    "callback_request" | "interest"
  >("callback_request");

  const { actor } = useActor();

  // Track view on mount (always called, regardless of listing existence)
  useEffect(() => {
    if (id) {
      incrementListingMetric(id, "views");
      // Track via backend intelligence feedback loop (best-effort)
      const numId =
        Number.parseInt(id.replace(/[^0-9]/g, "0").slice(0, 8), 10) || 0;
      trackFeedback(actor, numId, "click").catch(() => {});
    }
  }, [id, actor]);

  if (!listing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0F1F] to-[#121B35] flex items-center justify-center">
        <GlobalNav />
        <div className="text-center text-white/50 pt-20">
          <p className="text-xl">Property not found</p>
          <Link
            to="/search"
            className="text-[#D4AF37] hover:underline mt-2 block"
          >
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  const images = listing.images;
  const aiValues = getAiValues(listing);
  const sellerAskPrice = listing.sellerPrice || listing.price;
  // Undervalued/Overvalued: same logic used in seller and buyer portals
  const isUndervalued = sellerAskPrice < aiValues.lower;
  const isOverpriced = sellerAskPrice > aiValues.upper;
  // Keep aiEst as median for backwards compat with display code below
  const aiEst = aiValues.median;

  const sellerId = (listing as any).sellerId || "unknown";
  const L = listing;

  // --- ACTIONS ---
  function handleScheduleVisit() {
    if (!visitDate) {
      toast.error("Please select a date");
      return;
    }
    const req = {
      id: generateId(),
      propertyId: L.id,
      propertyTitle: L.title,
      buyerName: user?.fullName || contactName || "Anonymous",
      buyerPhone: user?.mobile || contactPhone || "N/A",
      date: visitDate,
      time: visitTime || "To be confirmed",
      type: "visit_request",
      sellerId,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    saveVisitRequest(req);
    incrementListingMetric(L.id, "visit_count");
    setShowVisitModal(false);
    setVisitDate("");
    setVisitTime("");
    toast.success("Visit request submitted! Seller will confirm shortly.");
  }

  function handleContactSubmit() {
    if (!contactName.trim() || !contactPhone.trim()) {
      toast.error("Please fill in name and phone");
      return;
    }
    const lead = {
      id: generateId(),
      propertyId: L.id,
      propertyTitle: L.title,
      buyerName: contactName,
      buyerPhone: contactPhone,
      message:
        contactMsg ||
        (contactType === "interest"
          ? "General interest in this property"
          : "Requesting callback"),
      type: contactType,
      sellerId,
      status: "new",
      createdAt: new Date().toISOString(),
    };
    upsertLead(lead);
    incrementListingMetric(L.id, "leads_count");
    setShowContactModal(false);
    setContactMsg("");
    toast.success(
      contactType === "interest"
        ? "Interest registered! Seller will reach out."
        : "Callback requested! Seller will call you soon.",
    );
  }

  function handleExpressInterest() {
    const lead = {
      id: generateId(),
      propertyId: L.id,
      propertyTitle: L.title,
      buyerName: user?.fullName || "Anonymous",
      buyerPhone: user?.mobile || "N/A",
      message: "General interest in this property",
      type: "interest",
      sellerId,
      status: "new",
      createdAt: new Date().toISOString(),
    };
    upsertLead(lead);
    incrementListingMetric(L.id, "leads_count");
    toast.success("Interest registered! Seller will reach out.");
  }

  function handleDownloadValuation() {
    // Save lead
    const lead = {
      id: generateId(),
      propertyId: L.id,
      propertyTitle: L.title,
      buyerName: user?.fullName || "Anonymous",
      buyerPhone: user?.mobile || "N/A",
      message: "Downloaded property valuation report",
      type: "valuation_request",
      sellerId,
      status: "new",
      createdAt: new Date().toISOString(),
    };
    upsertLead(lead);
    incrementListingMetric(L.id, "leads_count");

    // Generate downloadable valuation report
    const rentalYield =
      L.city === "Bangalore" ? (3.8 + (L.bhk || 2) * 0.3).toFixed(1) : "4.1";
    const content = [
      "=====================================",
      "        VALUBRIX PROPERTY VALUATION REPORT",
      "=====================================",
      "",
      `Property: ${L.title}`,
      `Location: ${L.location}, ${L.city}`,
      `Property Type: ${L.propertyType.toUpperCase()}`,
      L.bhk ? `Configuration: ${L.bhk} BHK` : "",
      `Area: ${L.carpetArea || L.plotArea || "N/A"} sqft`,
      `Builder: ${L.builderName || "N/A"}`,
      `Legal Status: ${L.legalStatus || "N/A"}`,
      "",
      "--- PRICE ANALYSIS ---",
      `Listing Price: ${formatPrice(L.price)}`,
      `AI Market Estimate: ${formatPrice(aiEst)}`,
      `Price Status: ${isUndervalued ? "Undervalued Opportunity" : isOverpriced ? "Above Market Estimate" : "Fair Market Price"}`,
      `Deal Classification: ${L.dealClassification || "Fair Price"}`,
      "",
      "--- INVESTMENT INTELLIGENCE ---",
      `Investment Score: ${L.investmentScore || 65}/100`,
      `AI Recommendation: ${L.aiRecommendation || "Hold"}`,
      `Estimated Rental Yield: ${rentalYield}% per annum`,
      "Price Trend: +8.2% (last 12 months)",
      "",
      "--- MARKET INSIGHTS ---",
      `City Average: ₹${L.city === "Bangalore" ? 9000 : L.city === "Pune" ? 7500 : 8500}/sqft`,
      `Demand Score: ${L.badges.includes("High Liquidity") ? 88 : 72}/100`,
      `Expected Days to Sell: ~${L.badges.includes("High Liquidity") ? 32 : 55} days`,
      "",
      "Report generated by ValuBrix AI Platform",
      `Date: ${new Date().toLocaleDateString("en-IN")}`,
      "=====================================",
    ]
      .filter(Boolean)
      .join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ValuBrix_Valuation_${L.id}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Valuation report downloaded!");
  }

  const details =
    listing.propertyType === "plot"
      ? [
          {
            label: "Plot Area",
            value: `${listing.plotArea} sqft`,
            icon: Maximize2,
          },
          {
            label: "Land Use",
            value: listing.landUse || "Residential",
            icon: Home,
          },
          {
            label: "Legal Status",
            value: listing.legalStatus || "N/A",
            icon: Compass,
          },
        ]
      : [
          {
            label: "Carpet Area",
            value: listing.carpetArea
              ? `${listing.carpetArea} sqft`
              : "Not specified",
            icon: Maximize2,
          },
          {
            label: "Super Built-up",
            value:
              listing.superBuiltUpArea || listing.builtUpArea
                ? `${listing.superBuiltUpArea || listing.builtUpArea} sqft`
                : "Not specified",
            icon: Maximize2,
          },
          {
            label: "BHK",
            value: listing.bhk ? `${listing.bhk} BHK` : "Not specified",
            icon: Home,
          },
          {
            label: "Floor",
            value:
              listing.floorNumber !== undefined && listing.floorNumber !== null
                ? `${listing.floorNumber}${listing.totalFloors ? ` / ${listing.totalFloors}` : ""}`
                : "Floor not specified",
            icon: ArrowLeft,
          },
          {
            label: "Parking",
            value:
              listing.coveredParking !== undefined
                ? `${listing.coveredParking} Covered${listing.openParking ? ` + ${listing.openParking} Open` : ""}`
                : "Not specified",
            icon: Car,
          },
          {
            label: "Facing",
            value: listing.facing || "Not specified",
            icon: Compass,
          },
        ];

  const investScore =
    65 + (listing.balconies || 0) * 3 + (listing.coveredParking || 0) * 4;
  const rentalYield =
    listing.city === "Bangalore"
      ? 3.8 + (listing.bhk || 2) * 0.3
      : listing.city === "Pune"
        ? 4.1
        : 3.5;
  const demandScore = listing.badges.includes("High Liquidity")
    ? 88
    : listing.badges.includes("High Value Asset")
      ? 85
      : 72;
  const daysToSell = listing.badges.includes("High Liquidity") ? 32 : 55;

  const inputClass =
    "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/40 placeholder:text-white/30";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1F] to-[#121B35]">
      <GlobalNav />
      <div className="pt-20 max-w-7xl mx-auto px-4 py-8">
        <Link
          to="/search"
          className="flex items-center gap-1 text-white/50 hover:text-white text-sm mb-6 transition-colors"
        >
          <ChevronLeft size={16} /> Back to Search
        </Link>

        {isUndervalued && (
          <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-xl px-5 py-3 flex items-center gap-3">
            <TrendingUp size={18} className="text-green-400" />
            <p className="text-green-300 font-medium text-sm">
              Undervalued Opportunity — Listed below AI market estimate by{" "}
              {Math.round((1 - sellerAskPrice / aiValues.lower) * 100)}%
            </p>
          </div>
        )}
        {isOverpriced && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3 flex items-center gap-3">
            <TrendingUp size={18} className="text-red-400" />
            <p className="text-red-300 font-medium text-sm">
              Priced above AI market estimate by{" "}
              {Math.round((sellerAskPrice / aiValues.upper - 1) * 100)}%
            </p>
          </div>
        )}

        {/* Hero Image */}
        <div className="relative h-[420px] rounded-2xl overflow-hidden mb-4">
          {images.length > 0 ? (
            <>
              <img
                src={images[imgIndex]}
                alt={listing.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setImgIndex(
                        (i) => (i - 1 + images.length) % images.length,
                      )
                    }
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImgIndex((i) => (i + 1) % images.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
                  >
                    <ChevronRight size={20} />
                  </button>
                  <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    {imgIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1a2040] to-[#0a0f1e] flex items-center justify-center">
              <span className="text-8xl opacity-20">🏢</span>
            </div>
          )}
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                type="button"
                key={`thumb-${i}-${img.slice(-20)}`}
                onClick={() => setImgIndex(i)}
                className={`flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                  imgIndex === i
                    ? "border-[#D4AF37]"
                    : "border-white/10 opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={img}
                  alt={`thumb ${i}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex flex-wrap gap-2 mb-3">
                {listing.badges.map((b) => (
                  <span
                    key={b}
                    className={`text-xs px-3 py-1 rounded-full border font-medium ${
                      BADGE_COLORS[b] || "bg-white/10 text-white/70"
                    }`}
                  >
                    {b}
                  </span>
                ))}
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {listing.title}
              </h1>
              <p className="text-[#D4AF37] text-3xl font-bold font-mono">
                {formatPrice(listing.price)}
              </p>
              <p className="flex items-center gap-1 text-white/50 text-sm mt-2">
                <MapPin size={14} /> {listing.location}, {listing.city}
              </p>
              {listing.description && (
                <p className="text-white/60 text-sm mt-3 leading-relaxed">
                  {listing.description}
                </p>
              )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-4">
                Property Details
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {details.map((d) => {
                  const Icon = d.icon;
                  return (
                    <div key={d.label} className="bg-white/5 rounded-xl p-3">
                      <Icon size={16} className="text-[#D4AF37] mb-1" />
                      <p className="text-white/40 text-xs">{d.label}</p>
                      <p className="text-white text-sm font-medium mt-0.5">
                        {d.value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {listing.amenities && listing.amenities.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-white font-semibold mb-4">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {listing.amenities.map((a) => (
                    <span
                      key={a}
                      className="bg-white/5 border border-white/10 text-white/70 text-sm px-3 py-1.5 rounded-full"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div
              data-ocid="property.investment.panel"
              className="bg-white/5 border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center gap-2 mb-5">
                <BarChart2 size={18} className="text-[#D4AF37]" />
                <h2 className="text-white font-semibold">
                  Investment Intelligence
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div
                  data-ocid="property.investment.score.card"
                  className="bg-white/5 rounded-xl p-4 text-center"
                >
                  <p className="text-white/40 text-xs mb-1">Investment Score</p>
                  <p className="text-[#D4AF37] font-bold text-2xl font-mono">
                    {Math.min(investScore, 95)}/100
                  </p>
                </div>
                <div
                  data-ocid="property.rental_yield.card"
                  className="bg-white/5 rounded-xl p-4 text-center"
                >
                  <p className="text-white/40 text-xs mb-1">Rental Yield</p>
                  <p className="text-purple-300 font-bold text-2xl font-mono">
                    {rentalYield.toFixed(1)}%
                  </p>
                  <p className="text-white/30 text-xs">per annum</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-white/40 text-xs mb-1">Demand Score</p>
                  <p className="text-blue-300 font-bold text-2xl font-mono">
                    {demandScore}/100
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-white/40 text-xs mb-1">Days to Sell</p>
                  <p className="text-green-300 font-bold text-2xl font-mono">
                    ~{daysToSell}
                  </p>
                  <p className="text-white/30 text-xs">estimated</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-white/40 text-xs mb-1">Liquidity</p>
                  <p
                    className={`font-bold text-lg ${listing.badges.includes("High Liquidity") ? "text-green-300" : "text-amber-300"}`}
                  >
                    {listing.badges.includes("High Liquidity")
                      ? "High"
                      : "Moderate"}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-white/40 text-xs mb-1">Price Trend</p>
                  <p className="text-green-300 font-bold text-lg">+8.2%</p>
                  <p className="text-white/30 text-xs">last 12 months</p>
                </div>
              </div>
              <div className="mt-4 bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/40 text-xs">Listing Price</p>
                    <p className="text-white font-bold font-mono">
                      {formatPrice(listing.price)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/40 text-xs">vs AI Estimate</p>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        isUndervalued
                          ? "bg-green-500/20 text-green-300"
                          : isOverpriced
                            ? "bg-red-500/20 text-red-300"
                            : "bg-white/10 text-white/50"
                      }`}
                    >
                      {isUndervalued
                        ? "Undervalued"
                        : isOverpriced
                          ? "Overpriced"
                          : "Fair Price"}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-white/40 text-xs">AI Estimate</p>
                    {aiValues.lower && aiValues.upper ? (
                      <p className="text-[#D4AF37] font-bold font-mono text-xs">
                        {formatPrice(aiValues.lower)} –{" "}
                        {formatPrice(aiValues.upper)}
                      </p>
                    ) : (
                      <p className="text-[#D4AF37] font-bold font-mono">
                        {formatPrice(aiEst)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="space-y-3">
            <button
              type="button"
              data-ocid="property.detail.schedule_visit.button"
              onClick={() => setShowVisitModal(true)}
              className="w-full flex items-center gap-3 bg-white/5 hover:bg-[#D4AF37]/10 border border-white/10 hover:border-[#D4AF37]/40 rounded-xl px-5 py-4 text-white hover:text-[#D4AF37] text-sm font-medium transition-all group"
            >
              <Calendar
                size={18}
                className="text-[#D4AF37] group-hover:scale-110 transition-transform"
              />
              Schedule Site Visit
            </button>

            <button
              type="button"
              data-ocid="property.detail.contact.button"
              onClick={() => {
                setContactType("callback_request");
                setShowContactModal(true);
              }}
              className="w-full flex items-center gap-3 bg-white/5 hover:bg-[#D4AF37]/10 border border-white/10 hover:border-[#D4AF37]/40 rounded-xl px-5 py-4 text-white hover:text-[#D4AF37] text-sm font-medium transition-all group"
            >
              <Phone
                size={18}
                className="text-[#D4AF37] group-hover:scale-110 transition-transform"
              />
              Request Callback
            </button>

            <button
              type="button"
              data-ocid="property.detail.callback.button"
              onClick={() => {
                setContactType("interest");
                handleExpressInterest();
              }}
              className="w-full flex items-center gap-3 bg-white/5 hover:bg-[#D4AF37]/10 border border-white/10 hover:border-[#D4AF37]/40 rounded-xl px-5 py-4 text-white hover:text-[#D4AF37] text-sm font-medium transition-all group"
            >
              <MessageCircle
                size={18}
                className="text-[#D4AF37] group-hover:scale-110 transition-transform"
              />
              Express Interest
            </button>

            <button
              type="button"
              data-ocid="property.detail.download.button"
              onClick={handleDownloadValuation}
              className="w-full flex items-center gap-3 bg-white/5 hover:bg-[#D4AF37]/10 border border-white/10 hover:border-[#D4AF37]/40 rounded-xl px-5 py-4 text-white hover:text-[#D4AF37] text-sm font-medium transition-all group"
            >
              <Download
                size={18}
                className="text-[#D4AF37] group-hover:scale-110 transition-transform"
              />
              Download Valuation
            </button>

            {listing.builderName && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-2">
                <p className="text-white/40 text-xs mb-1">Builder</p>
                <p className="text-white font-semibold">
                  {listing.builderName}
                </p>
                {listing.legalStatus && (
                  <p className="text-white/40 text-xs mt-2">
                    Legal Status:{" "}
                    <span className="text-white/70">{listing.legalStatus}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Visit Modal */}
      {showVisitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          data-ocid="property.visit.modal"
        >
          <div className="bg-[#0A0F1F] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">Schedule Site Visit</h3>
              <button
                type="button"
                onClick={() => setShowVisitModal(false)}
                className="text-white/40 hover:text-white"
                data-ocid="property.visit.close_button"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-white/40 text-xs mb-4">{listing.title}</p>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="v-name"
                  className="text-white/50 text-xs mb-1.5 block"
                >
                  Your Name
                </label>
                <input
                  id="v-name"
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Enter your name"
                  className={inputClass}
                  data-ocid="property.visit.name.input"
                />
              </div>
              <div>
                <label
                  htmlFor="v-phone"
                  className="text-white/50 text-xs mb-1.5 block"
                >
                  Phone Number
                </label>
                <input
                  id="v-phone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className={inputClass}
                  data-ocid="property.visit.phone.input"
                />
              </div>
              <div>
                <label
                  htmlFor="v-date"
                  className="text-white/50 text-xs mb-1.5 block"
                >
                  Preferred Date
                </label>
                <input
                  id="v-date"
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className={inputClass}
                  data-ocid="property.visit.date.input"
                />
              </div>
              <div>
                <label
                  htmlFor="v-time"
                  className="text-white/50 text-xs mb-1.5 block"
                >
                  Preferred Time (optional)
                </label>
                <input
                  id="v-time"
                  type="time"
                  value={visitTime}
                  onChange={(e) => setVisitTime(e.target.value)}
                  className={inputClass}
                  data-ocid="property.visit.time.input"
                />
              </div>
              <button
                type="button"
                onClick={handleScheduleVisit}
                className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#B8960C] text-black font-bold rounded-xl transition-all"
                data-ocid="property.visit.submit_button"
              >
                Submit Visit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          data-ocid="property.contact.modal"
        >
          <div className="bg-[#0A0F1F] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">Contact Owner</h3>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="text-white/40 hover:text-white"
                data-ocid="property.contact.close_button"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-white/40 text-xs mb-4">{listing.title}</p>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="c-name"
                  className="text-white/50 text-xs mb-1.5 block"
                >
                  Your Name
                </label>
                <input
                  id="c-name"
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Enter your name"
                  className={inputClass}
                  data-ocid="property.contact.name.input"
                />
              </div>
              <div>
                <label
                  htmlFor="c-phone"
                  className="text-white/50 text-xs mb-1.5 block"
                >
                  Phone Number
                </label>
                <input
                  id="c-phone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className={inputClass}
                  data-ocid="property.contact.phone.input"
                />
              </div>
              <div>
                <label
                  htmlFor="c-msg"
                  className="text-white/50 text-xs mb-1.5 block"
                >
                  Message (optional)
                </label>
                <textarea
                  id="c-msg"
                  value={contactMsg}
                  onChange={(e) => setContactMsg(e.target.value)}
                  placeholder="Any specific questions or requirements..."
                  rows={3}
                  className={`${inputClass} resize-none`}
                  data-ocid="property.contact.message.textarea"
                />
              </div>
              <button
                type="button"
                onClick={handleContactSubmit}
                className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#B8960C] text-black font-bold rounded-xl transition-all"
                data-ocid="property.contact.submit_button"
              >
                Request Callback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
