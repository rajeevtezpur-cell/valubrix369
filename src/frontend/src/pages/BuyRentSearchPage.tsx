import { useNavigate } from "@tanstack/react-router";
// BuyRentSearchPage.tsx — Premium 6-step form + listings-first results
// Mobile: bottom sheet slides up over the map; sticky bottom action bar always visible
// Desktop: floating card on the right/center of the map
import {
  Brain,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Filter,
  LayoutList,
  MapPin,
  Search,
  X,
} from "lucide-react";
// Rename to avoid shadowing global Map
import { Map as MapIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import AnalyzingOverlay from "../components/AnalyzingOverlay";
import GlobalMapComponent from "../components/GlobalMapComponent";
import GlobalNav from "../components/GlobalNav";
import ListingCard from "../components/ListingCard";
import { usePropertyForm } from "../components/PropertyFormEngine";
import SmartLocationSearch from "../components/SmartLocationSearch";
import type { PropertyType } from "../components/steps/types";
import { showBHKFor } from "../components/steps/types";
import { BANGALORE_PROJECTS } from "../data/bangaloreProjects";
import { ALL_LOCALITY_COORDS, getCoords } from "../data/localityCoords";
import type { LocationRecord } from "../data/locationData";
import type { MockListing } from "../data/mockListings";
import { MOCK_LISTINGS } from "../data/mockListings";
import type { InfraItem } from "../engines/infraEngine";
import { getTopBusStops, getTopTechParks } from "../engines/infraEngine";
import { getTopRailwayStations } from "../engines/infraEngine";
import type { SmartPin } from "../engines/mapLayersEngine";
import { getSmartPins } from "../engines/mapLayersEngine";
import type { MetroResult } from "../engines/metroEngine";
import { getNearestMetros } from "../engines/metroEngine";
import { getActiveListingsForBuyer } from "../services/listingService";

interface BuyRentSearchPageProps {
  mode: "buy" | "rent";
}

const CITIES = ["Bangalore", "Pune", "Hyderabad", "Delhi NCR"];

const PROPERTY_TYPES: {
  type: PropertyType;
  label: string;
  emoji: string;
  desc: string;
}[] = [
  {
    type: "apartment",
    label: "Apartment / Flat",
    emoji: "🏢",
    desc: "Flats & high-rise societies",
  },
  {
    type: "villa",
    label: "Villa",
    emoji: "🏡",
    desc: "Independent villas & row houses",
  },
  {
    type: "plot",
    label: "Plot / Land",
    emoji: "🌳",
    desc: "Residential & layout plots",
  },
  {
    type: "independent_house",
    label: "Independent House",
    emoji: "🏠",
    desc: "Standalone homes & bungalows",
  },
  {
    type: "builder_floor",
    label: "Builder Floor",
    emoji: "🏗️",
    desc: "Low-rise builder floor units",
  },
  {
    type: "studio",
    label: "Studio",
    emoji: "📐",
    desc: "Compact open-plan studio units",
  },
  {
    type: "commercial",
    label: "Commercial",
    emoji: "🏦",
    desc: "Offices, shops & retail spaces",
  },
];

const BUY_BUDGET_RANGES: Record<string, { label: string; value: string }[]> = {
  apartment: [
    { label: "₹20L–₹40L", value: "20-40" },
    { label: "₹40L–₹60L", value: "40-60" },
    { label: "₹60L–₹80L", value: "60-80" },
    { label: "₹80L–₹1Cr", value: "80-100" },
    { label: "₹1Cr–₹1.5Cr", value: "100-150" },
    { label: "₹1.5Cr–₹2Cr", value: "150-200" },
    { label: "₹2Cr–₹3Cr", value: "200-300" },
    { label: "₹3Cr–₹5Cr", value: "300-500" },
    { label: "₹5Cr+", value: "500+" },
  ],
  villa: [
    { label: "₹75L–₹1Cr", value: "75-100" },
    { label: "₹1Cr–₹1.5Cr", value: "100-150" },
    { label: "₹1.5Cr–₹2Cr", value: "150-200" },
    { label: "₹2Cr–₹3Cr", value: "200-300" },
    { label: "₹3Cr–₹5Cr", value: "300-500" },
    { label: "₹5Cr–₹10Cr", value: "500-1000" },
    { label: "₹10Cr+", value: "1000+" },
  ],
  plot: [
    { label: "₹20L–₹40L", value: "20-40" },
    { label: "₹40L–₹60L", value: "40-60" },
    { label: "₹60L–₹1Cr", value: "60-100" },
    { label: "₹1Cr–₹2Cr", value: "100-200" },
    { label: "₹2Cr+", value: "200+" },
  ],
  default: [
    { label: "₹20L–₹40L", value: "20-40" },
    { label: "₹40L–₹60L", value: "40-60" },
    { label: "₹60L–₹1Cr", value: "60-100" },
    { label: "₹1Cr–₹1.5Cr", value: "100-150" },
    { label: "₹1.5Cr–₹2Cr", value: "150-200" },
    { label: "₹2Cr–₹3Cr", value: "200-300" },
    { label: "₹3Cr+", value: "300+" },
  ],
};

const RENT_BUDGET_RANGES: Record<string, { label: string; value: string }[]> = {
  apartment: [
    { label: "₹5K–₹20K/mo", value: "5000-20000" },
    { label: "₹20K–₹40K/mo", value: "20000-40000" },
    { label: "₹40K–₹60K/mo", value: "40000-60000" },
    { label: "₹60K–₹1L/mo", value: "60000-100000" },
    { label: "₹1L+/mo", value: "100000+" },
  ],
  villa: [
    { label: "₹25K–₹50K/mo", value: "25000-50000" },
    { label: "₹50K–₹1L/mo", value: "50000-100000" },
    { label: "₹1L–₹2L/mo", value: "100000-200000" },
    { label: "₹2L+/mo", value: "200000+" },
  ],
  default: [
    { label: "₹5K–₹20K/mo", value: "5000-20000" },
    { label: "₹20K–₹40K/mo", value: "20000-40000" },
    { label: "₹40K–₹60K/mo", value: "40000-60000" },
    { label: "₹60K–₹1L/mo", value: "60000-100000" },
    { label: "₹1L+/mo", value: "100000+" },
  ],
};

function getBudgetRanges(
  mode: "buy" | "rent",
  propertyType: PropertyType | null,
) {
  const key = propertyType ?? "default";
  if (mode === "buy")
    return BUY_BUDGET_RANGES[key] ?? BUY_BUDGET_RANGES.default;
  return RENT_BUDGET_RANGES[key] ?? RENT_BUDGET_RANGES.default;
}

const LOCALITY_INSIGHTS: Record<
  string,
  {
    lower: string;
    upper: string;
    median: string;
    confidence: number;
    insight: string;
  }
> = {
  Whitefield: {
    lower: "₹85L",
    upper: "₹1.4Cr",
    median: "₹1.1Cr",
    confidence: 87,
    insight: "High demand driven by IT corridor growth",
  },
  Indiranagar: {
    lower: "₹1.2Cr",
    upper: "₹2.1Cr",
    median: "₹1.65Cr",
    confidence: 91,
    insight: "Premium zone — limited supply, steady appreciation",
  },
  Koramangala: {
    lower: "₹1.4Cr",
    upper: "₹2.6Cr",
    median: "₹1.95Cr",
    confidence: 89,
    insight: "Startup hub commands 15-20% premium over area average",
  },
  "HSR Layout": {
    lower: "₹95L",
    upper: "₹1.6Cr",
    median: "₹1.25Cr",
    confidence: 84,
    insight: "Strong rental demand — ideal for investment",
  },
  Hebbal: {
    lower: "₹75L",
    upper: "₹1.3Cr",
    median: "₹1.05Cr",
    confidence: 80,
    insight: "Near airport — upcoming infra may boost 10-15%",
  },
  Sarjapur: {
    lower: "₹65L",
    upper: "₹1.1Cr",
    median: "₹87L",
    confidence: 78,
    insight: "Emerging corridor — best entry price window now",
  },
  "Electronic City": {
    lower: "₹55L",
    upper: "₹85L",
    median: "₹70L",
    confidence: 75,
    insight: "High rental yield 4-5% due to IT park proximity",
  },
};

function getLocalityInsight(locality: string) {
  const match = Object.keys(LOCALITY_INSIGHTS).find((k) =>
    locality.toLowerCase().includes(k.toLowerCase()),
  );
  return match
    ? LOCALITY_INSIGHTS[match]
    : {
        lower: "₹60L",
        upper: "₹1.2Cr",
        median: "₹90L",
        confidence: 72,
        insight:
          "Good investment potential — data from 200+ recent transactions",
      };
}

const glass = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(16px)",
} as const;
const goldBtn = {
  background: "linear-gradient(135deg, #C9A84C 0%, #D4AF37 60%, #E8C97A 100%)",
  color: "#071A2F",
  boxShadow: "0 4px 24px rgba(212,175,55,0.35)",
} as const;

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        {Array.from({ length: total }, (_, i) => i).map((i) => (
          <div
            key={`step-dot-${i}`}
            className="transition-all duration-300"
            style={{
              width: i + 1 === step ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background:
                i + 1 < step
                  ? "#D4AF37"
                  : i + 1 === step
                    ? "linear-gradient(90deg, #C9A84C, #E8C97A)"
                    : "rgba(255,255,255,0.12)",
            }}
          />
        ))}
      </div>
      <span
        style={{
          color: "rgba(216,181,106,0.7)",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        Step {step} of {total}
      </span>
    </div>
  );
}

function computeBadgeFlags(listing: MockListing, mode: "buy" | "rent") {
  const price = listing.sellerPrice || listing.price || 0;
  const area =
    listing.carpetArea ||
    listing.superBuiltUpArea ||
    listing.builtUpArea ||
    listing.plotArea ||
    0;
  const aiMedian = listing.aiMedian ?? 0;
  const dealScore = listing.dealScore ?? 0;
  const recommendation = listing.aiRecommendation ?? "";
  return {
    isHighLiquidity: dealScore > 70 || recommendation === "Strong Buy",
    isDistressDeal:
      (aiMedian > 0 && price < aiMedian * 0.9) ||
      (area > 0 && price > 0 && price / area < 4000),
    isHighYield:
      mode === "rent"
        ? area > 0 && price > 0 && ((price * 12) / (area * 8000)) * 100 > 3.5
        : (listing.investmentScore ?? 0) > 75,
    isHotMarket: recommendation === "Strong Buy" || dealScore > 80,
  };
}

function FilterChip({
  label,
  onRemove,
}: { label: string; onRemove: () => void }) {
  return (
    <span
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
      style={{
        background: "rgba(216,181,106,0.12)",
        border: "1px solid rgba(216,181,106,0.3)",
        color: "#D8B56A",
      }}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        style={{ color: "rgba(216,181,106,0.6)" }}
      >
        <X size={11} />
      </button>
    </span>
  );
}

type ProjectPin = import("../components/GlobalMapComponent").ProjectPin;

export default function BuyRentSearchPage({ mode }: BuyRentSearchPageProps) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"form" | "results">("form");
  usePropertyForm(mode, 1);

  const [step, setStep] = useState(1);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    12.9716, 77.5946,
  ]);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobileResultsView, setMobileResultsView] = useState<"map" | "list">(
    "map",
  );

  const [city, setCity] = useState("Bangalore");
  const [selectedLocation, setSelectedLocation] =
    useState<LocationRecord | null>(null);
  const [selectedPropType, setSelectedPropType] = useState<PropertyType | null>(
    null,
  );
  const [selectedApartmentSubType, setSelectedApartmentSubType] = useState<
    "standalone" | "gated" | "township" | null
  >(null);
  const [detailsData, setDetailsData] = useState<Record<string, unknown>>({});
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [builderQuery, setBuilderQuery] = useState("");
  const [projectQuery, setProjectQuery] = useState("");
  const [builderManual, setBuilderManual] = useState("");
  const [projectManual, setProjectManual] = useState("");
  const [showBuilderDropdown, setShowBuilderDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [selectedBuilder, setSelectedBuilder] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayDataReady, setOverlayDataReady] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const builderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedLocation(null);
    const cityCenters: Record<string, [number, number]> = {
      Bangalore: [12.9716, 77.5946],
      Pune: [18.5204, 73.8567],
      Hyderabad: [17.385, 78.4867],
      Mumbai: [19.076, 72.8777],
      Delhi: [28.6139, 77.209],
      "Delhi NCR": [28.6139, 77.209],
    };
    setMapCenter(cityCenters[city] ?? [12.9716, 77.5946]);
    setStepErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  const uniqueBuilders = useMemo(
    () => Array.from(new Set(BANGALORE_PROJECTS.map((p) => p.builder))).sort(),
    [],
  );
  const filteredBuilders = useMemo(
    () =>
      uniqueBuilders
        .filter((b) => b.toLowerCase().includes(builderQuery.toLowerCase()))
        .slice(0, 12),
    [uniqueBuilders, builderQuery],
  );
  const projectsForBuilder = useMemo(() => {
    const b = selectedBuilder || builderManual;
    if (!b) return BANGALORE_PROJECTS.slice(0, 20);
    return BANGALORE_PROJECTS.filter((p) =>
      p.builder.toLowerCase().includes(b.toLowerCase()),
    );
  }, [selectedBuilder, builderManual]);
  const filteredProjects = useMemo(
    () =>
      projectsForBuilder
        .filter((p) =>
          p.name.toLowerCase().includes(projectQuery.toLowerCase()),
        )
        .slice(0, 12),
    [projectsForBuilder, projectQuery],
  );

  const listingType = mode === "buy" ? "sale" : "rent";
  const allListings = useMemo(() => {
    const localListings = getActiveListingsForBuyer(listingType);
    const localIds = new Set(
      localListings.map((l: { id: string | number }) => String(l.id)),
    );
    const mockOfType = MOCK_LISTINGS.filter(
      (m) => (m.listingType || "sale") === listingType && !localIds.has(m.id),
    );
    return [...localListings, ...mockOfType];
  }, [listingType]);

  const filtered = useMemo(
    () =>
      allListings.filter((l: MockListing) => {
        if (selectedLocation) {
          const locName = selectedLocation.name.toLowerCase().trim();
          const lLoc = (l.location || "").toLowerCase().trim();
          if (!lLoc.includes(locName) && !locName.includes(lLoc)) return false;
        }
        if (selectedPropType) {
          const pType = (l.propertyType || "").toLowerCase();
          const t = selectedPropType;
          if (t === "apartment" && pType !== "flat" && pType !== "apartment")
            return false;
          if (t === "villa" && pType !== "villa") return false;
          if (t === "plot" && pType !== "plot") return false;
        }
        return true;
      }),
    [allListings, selectedLocation, selectedPropType],
  );

  const mapProjects = useMemo(
    () =>
      filtered
        .map((l: MockListing) => {
          const loc = l.location || "";
          const coords = getCoords(loc);
          return {
            id: String(l.id),
            name: l.title || `${l.bhk} BHK in ${loc}`,
            builder: l.builder || l.builderName || "",
            locality: loc,
            price_min: l.sellerPrice || l.price || 0,
            price_max: l.aiUpper || l.sellerPrice || l.price || 0,
            latitude: coords?.lat ?? 0,
            longitude: coords?.lng ?? 0,
            score: { tag: "Listing", investmentScore: 70 },
          };
        })
        .filter((p) => p.latitude !== 0),
    [filtered],
  );

  const localityInsight = getLocalityInsight(selectedLocation?.name || "");
  const srcLat = mapCenter[0];
  const srcLng = mapCenter[1];

  const [osrmNearbyMetros, setOsrmNearbyMetros] = useState<MetroResult[]>([]);
  const [osrmNearbyTechParks, setOsrmNearbyTechParks] = useState<InfraItem[]>(
    [],
  );
  const [osrmNearbyRailway, setOsrmNearbyRailway] = useState<InfraItem[]>([]);
  const [osrmNearbyBusStops, setOsrmNearbyBusStops] = useState<InfraItem[]>([]);
  const [nearbyOsrmLoading, setNearbyOsrmLoading] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run on source coord change
  useEffect(() => {
    const isDefaultCenter = srcLat === 12.9716 && srcLng === 77.5946;
    if (!srcLat || !srcLng || isDefaultCenter) return;
    let cancelled = false;
    setNearbyOsrmLoading(true);
    Promise.all([
      getNearestMetros(srcLat, srcLng, 4).catch(() => [] as MetroResult[]),
      getTopTechParks(srcLat, srcLng, 4).catch(() => [] as InfraItem[]),
      getTopRailwayStations(srcLat, srcLng, 3).catch(() => [] as InfraItem[]),
      getTopBusStops(srcLat, srcLng, 3).catch(() => [] as InfraItem[]),
    ]).then(([metros, techParks, railway, busStops]) => {
      if (cancelled) return;
      setOsrmNearbyMetros(metros);
      setOsrmNearbyTechParks(techParks);
      setOsrmNearbyRailway(railway);
      setOsrmNearbyBusStops(busStops);
      setNearbyOsrmLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [srcLat, srcLng]);

  const nearbyPins = useMemo(() => {
    const [lat, lng] = mapCenter;
    const pins = getSmartPins(lat, lng, 12);
    type PC = "tech_park" | "metro" | "railway" | "bus_stop";
    const cats: PC[] = ["tech_park", "metro", "railway", "bus_stop"];
    const result: Record<PC, SmartPin[]> = {
      tech_park: [],
      metro: [],
      railway: [],
      bus_stop: [],
    };
    for (const pin of pins) {
      if (cats.includes(pin.type as PC)) result[pin.type as PC].push(pin);
    }
    for (const cat of cats) result[cat] = result[cat].slice(0, 5);
    return result;
  }, [mapCenter]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        builderRef.current &&
        !builderRef.current.contains(e.target as Node)
      ) {
        setShowBuilderDropdown(false);
        setShowProjectDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function validateAndNext() {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (!city.trim()) errs.city = "Please select a city";
      const hasPinCoords = mapCenter[0] !== 12.9716 || mapCenter[1] !== 77.5946;
      if (!selectedLocation && !hasPinCoords)
        errs.location = "Please select a locality or pin on map";
    }
    if (step === 2) {
      if (!selectedPropType)
        errs.propertyType = "Please select a property type";
      if (selectedPropType === "apartment" && !selectedApartmentSubType)
        errs.apartmentSubType = "Please select the apartment type";
    }
    if (step === 4) {
      if (!selectedBudget) errs.budget = "Please select a budget range";
    }
    if (Object.keys(errs).length > 0) {
      setStepErrors(errs);
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setStepErrors({});
    setStep((s) => s + 1);
  }

  function goBackStep() {
    setStepErrors({});
    setStep((s) => Math.max(1, s - 1));
  }
  function handleSubmit() {
    setOverlayDataReady(true);
    setShowOverlay(true);
  }
  function handleOverlayComplete() {
    setShowOverlay(false);
    setOverlayDataReady(false);
    setPhase("results");
    setMobileSheetOpen(false);
    setTimeout(
      () => resultsRef.current?.scrollIntoView({ behavior: "smooth" }),
      100,
    );
  }
  function resetToForm() {
    setPhase("form");
    setStep(1);
    setSelectedLocation(null);
    setSelectedPropType(null);
    setSelectedApartmentSubType(null);
    setSelectedBudget(null);
    setDetailsData({});
    setBuilderManual("");
    setProjectManual("");
    setSelectedBuilder("");
    setSelectedProject("");
    setStepErrors({});
  }

  const sectionLabel = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "rgba(216,181,106,0.7)",
    marginBottom: 10,
    display: "block",
  };
  const errorMsg = (msg: string) => (
    <p style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>⚠ {msg}</p>
  );

  // ─── Step content (shared between desktop card and mobile sheet) ─────────────

  function renderStepContent() {
    return (
      <>
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "#F4F7FF",
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                {mode === "buy"
                  ? "Where do you want to buy?"
                  : "Where do you want to rent?"}
              </h2>
              <p style={{ color: "rgba(185,198,216,0.6)", fontSize: 13 }}>
                Select city and locality to get started
              </p>
            </div>

            <div>
              <span style={sectionLabel}>City</span>
              <div className="flex flex-wrap gap-2">
                {CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    data-ocid={`step1.city.${c.toLowerCase().replace(/\s+/g, "_")}`}
                    onClick={() => setCity(c)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
                    style={{
                      background:
                        city === c
                          ? "rgba(216,181,106,0.15)"
                          : "rgba(255,255,255,0.05)",
                      border:
                        city === c
                          ? "1.5px solid rgba(216,181,106,0.6)"
                          : "1.5px solid rgba(255,255,255,0.1)",
                      color: city === c ? "#D8B56A" : "rgba(255,255,255,0.65)",
                      minHeight: 44,
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span style={sectionLabel}>Locality / Area</span>
              <div
                style={
                  stepErrors.location
                    ? { border: "1.5px solid #ef4444", borderRadius: 16 }
                    : {}
                }
              >
                <SmartLocationSearch
                  placeholder="Search locality, project or builder…"
                  city={city}
                  onSelect={(loc) => {
                    setSelectedLocation(loc);
                    const key = loc.name.toLowerCase().trim();
                    const direct = ALL_LOCALITY_COORDS[key];
                    if (direct) {
                      setMapCenter([direct.lat, direct.lng]);
                    } else {
                      const match = Object.entries(ALL_LOCALITY_COORDS).find(
                        ([k]) => k.includes(key) || key.includes(k),
                      );
                      if (match) setMapCenter([match[1].lat, match[1].lng]);
                    }
                    setStepErrors((prev) => {
                      const { location: _l, ...rest } = prev;
                      return rest;
                    });
                  }}
                  initialLocation={selectedLocation ?? undefined}
                />
              </div>
              {stepErrors.location && errorMsg(stepErrors.location)}
              {selectedLocation && (
                <div className="flex items-center gap-2 mt-2">
                  <MapPin size={13} style={{ color: "#D8B56A" }} />
                  <span style={{ color: "#D8B56A", fontSize: 13 }}>
                    {selectedLocation.name}
                    {selectedLocation.city ? `, ${selectedLocation.city}` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedLocation(null)}
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      marginLeft: "auto",
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
              <button
                type="button"
                data-ocid="step1.pin_on_map"
                onClick={() => setShowMapModal(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold mt-3 transition-all"
                style={{
                  background: "rgba(59,130,246,0.1)",
                  border: "1px solid rgba(59,130,246,0.35)",
                  color: "#93c5fd",
                  minHeight: 44,
                }}
              >
                <MapPin size={14} /> Pin on Map — Drop pin to select exact
                location
              </button>
            </div>

            {selectedLocation && (
              <button
                type="button"
                data-ocid="step1.view_area_insights"
                onClick={() => {
                  const locId =
                    selectedLocation.id ||
                    selectedLocation.name.toLowerCase().replace(/\s+/g, "-");
                  navigate({
                    to: "/area/$locationId",
                    params: { locationId: locId },
                  });
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                style={{
                  background: "rgba(37,99,235,0.1)",
                  border: "1px solid rgba(37,99,235,0.3)",
                  color: "#93c5fd",
                  minHeight: 44,
                }}
              >
                <MapPin size={14} /> View Area Intelligence for{" "}
                {selectedLocation.name} <ExternalLink size={12} />
              </button>
            )}

            <button
              type="button"
              data-ocid="step1.next"
              onClick={validateAndNext}
              className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all"
              style={{ ...goldBtn, minHeight: 52 }}
            >
              Next: Property Type <ChevronRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "#F4F7FF",
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                What type of property?
              </h2>
              <p style={{ color: "rgba(185,198,216,0.6)", fontSize: 13 }}>
                Select the property type you are interested in
              </p>
            </div>

            <div
              className="grid grid-cols-2 gap-3"
              style={
                stepErrors.propertyType
                  ? {
                      outline: "1.5px solid #ef4444",
                      borderRadius: 16,
                      padding: 8,
                    }
                  : {}
              }
              data-ocid="step2.proptype_grid"
            >
              {PROPERTY_TYPES.map((pt) => {
                const active = selectedPropType === pt.type;
                return (
                  <button
                    key={pt.type}
                    type="button"
                    data-ocid={`step2.proptype.${pt.type}`}
                    onClick={() => {
                      setSelectedPropType(pt.type);
                      setStepErrors((prev) => {
                        const { propertyType: _pt, ...rest } = prev;
                        return rest;
                      });
                      setSelectedBudget(null);
                    }}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200"
                    style={{
                      background: active
                        ? "rgba(216,181,106,0.12)"
                        : "rgba(255,255,255,0.04)",
                      border: active
                        ? "2px solid rgba(216,181,106,0.6)"
                        : "2px solid rgba(255,255,255,0.08)",
                      boxShadow: active
                        ? "0 0 24px rgba(216,181,106,0.18)"
                        : "none",
                      transform: active ? "translateY(-2px)" : "none",
                      minHeight: 44,
                    }}
                  >
                    <span style={{ fontSize: 26 }}>{pt.emoji}</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: active ? "#D8B56A" : "#F4F7FF",
                        fontFamily: "'Playfair Display', serif",
                        textAlign: "center",
                      }}
                    >
                      {pt.label}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "rgba(185,198,216,0.5)",
                        textAlign: "center",
                      }}
                    >
                      {pt.desc}
                    </span>
                    {active && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "#D8B56A" }}
                      >
                        <span
                          style={{
                            color: "#071A2F",
                            fontSize: 10,
                            fontWeight: 900,
                          }}
                        >
                          ✓
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {stepErrors.propertyType && errorMsg(stepErrors.propertyType)}

            {selectedPropType === "apartment" && (
              <div className="space-y-2">
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase" as const,
                    color: "rgba(216,181,106,0.7)",
                    display: "block",
                  }}
                >
                  Apartment Type <span style={{ color: "#f87171" }}>*</span>
                </span>
                <div
                  className="grid grid-cols-3 gap-2"
                  data-ocid="step2.apartment_subtype_grid"
                >
                  {(
                    [
                      {
                        value: "standalone" as const,
                        label: "Standalone",
                        emoji: "🏢",
                        desc: "No society amenities",
                      },
                      {
                        value: "gated" as const,
                        label: "Gated Community",
                        emoji: "🔐",
                        desc: "Security, gym, pool",
                      },
                      {
                        value: "township" as const,
                        label: "Township",
                        emoji: "🏙️",
                        desc: "Self-contained infra",
                      },
                    ] as const
                  ).map((opt) => {
                    const isActive = selectedApartmentSubType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        data-ocid={`step2.apt_subtype.${opt.value}`}
                        onClick={() => {
                          setSelectedApartmentSubType(opt.value);
                          setStepErrors((prev) => {
                            const { apartmentSubType: _rm, ...rest } = prev;
                            return rest;
                          });
                        }}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
                        style={{
                          background: isActive
                            ? "rgba(216,181,106,0.12)"
                            : "rgba(255,255,255,0.04)",
                          border: isActive
                            ? "2px solid rgba(216,181,106,0.6)"
                            : "2px solid rgba(255,255,255,0.08)",
                          boxShadow: isActive
                            ? "0 0 16px rgba(216,181,106,0.18)"
                            : "none",
                          cursor: "pointer",
                          minHeight: 44,
                        }}
                      >
                        <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: isActive ? "#D8B56A" : "#F4F7FF",
                            textAlign: "center",
                          }}
                        >
                          {opt.label}
                        </span>
                        <span
                          style={{
                            fontSize: 9,
                            color: "rgba(185,198,216,0.45)",
                            textAlign: "center",
                          }}
                        >
                          {opt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {stepErrors.apartmentSubType &&
                  errorMsg(stepErrors.apartmentSubType)}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={goBackStep}
                className="px-6 py-4 rounded-2xl font-semibold text-sm"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.6)",
                  minHeight: 52,
                }}
              >
                ← Back
              </button>
              <button
                type="button"
                data-ocid="step2.next"
                onClick={validateAndNext}
                className="flex-1 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all"
                style={
                  selectedPropType &&
                  (selectedPropType !== "apartment" || selectedApartmentSubType)
                    ? { ...goldBtn, minHeight: 52 }
                    : {
                        background: "rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.3)",
                        minHeight: 52,
                      }
                }
              >
                Next: Details <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "#F4F7FF",
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                Property preferences
              </h2>
              <p style={{ color: "rgba(185,198,216,0.6)", fontSize: 13 }}>
                All fields optional — helps us find better matches
              </p>
            </div>

            {showBHKFor(selectedPropType) && (
              <div className="space-y-2">
                <span style={sectionLabel}>BHK Configuration</span>
                <div
                  className="flex flex-wrap gap-2"
                  data-ocid="step3.bhk_options"
                >
                  {(
                    [
                      "1rk",
                      "1bhk",
                      "2bhk",
                      "2.5bhk",
                      "3bhk",
                      "3.5bhk",
                      "4bhk",
                      "4+bhk",
                    ] as const
                  ).map((opt) => {
                    const active = detailsData.bhk === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        data-ocid={`step3.bhk.${opt}`}
                        onClick={() =>
                          setDetailsData((d) => ({
                            ...d,
                            bhk: d.bhk === opt ? null : opt,
                          }))
                        }
                        className="px-3 py-2.5 rounded-xl text-sm font-bold transition-all"
                        style={{
                          background: active
                            ? "rgba(216,181,106,0.18)"
                            : "rgba(255,255,255,0.05)",
                          border: active
                            ? "2px solid rgba(216,181,106,0.6)"
                            : "2px solid rgba(255,255,255,0.08)",
                          color: active ? "#D8B56A" : "rgba(255,255,255,0.6)",
                          minHeight: 44,
                        }}
                      >
                        {opt.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {(selectedPropType === "apartment" ||
              selectedPropType === "builder_floor") && (
              <div className="space-y-2">
                <span style={sectionLabel}>Floor Preference (Optional)</span>
                <div
                  className="flex flex-wrap gap-2"
                  data-ocid="step3.floor_options"
                >
                  {(
                    [
                      { value: "low", label: "Low", sub: "1–3" },
                      { value: "mid", label: "Mid", sub: "4–8" },
                      { value: "high", label: "High", sub: "9–15" },
                      { value: "top", label: "Top", sub: "15+" },
                    ] as const
                  ).map((opt) => {
                    const active = detailsData.floor === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        data-ocid={`step3.floor.${opt.value}`}
                        onClick={() =>
                          setDetailsData((d) => ({
                            ...d,
                            floor: d.floor === opt.value ? null : opt.value,
                          }))
                        }
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold flex flex-col items-center min-w-[72px] transition-all"
                        style={{
                          background: active
                            ? "rgba(216,181,106,0.15)"
                            : "rgba(255,255,255,0.05)",
                          border: active
                            ? "1.5px solid rgba(216,181,106,0.55)"
                            : "1.5px solid rgba(255,255,255,0.09)",
                          color: active ? "#D8B56A" : "rgba(255,255,255,0.55)",
                          minHeight: 44,
                        }}
                      >
                        <span>{opt.label}</span>
                        <span
                          style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}
                        >
                          {opt.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedPropType !== "plot" && (
              <div className="space-y-2">
                <span style={sectionLabel}>
                  Preferred Area (sq ft){" "}
                  <span
                    style={{
                      color: "rgba(255,255,255,0.3)",
                      fontWeight: 400,
                      textTransform: "none",
                      letterSpacing: 0,
                    }}
                  >
                    Optional
                  </span>
                </span>
                <div
                  className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{
                    background: "rgba(10,15,30,0.9)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    minHeight: 52,
                  }}
                >
                  <input
                    type="number"
                    value={(detailsData.area as string) || ""}
                    onChange={(e) =>
                      setDetailsData((d) => ({ ...d, area: e.target.value }))
                    }
                    placeholder="e.g. 1200"
                    data-ocid="step3.area_input"
                    className="flex-1 outline-none"
                    style={{
                      background: "transparent",
                      color: "#fff",
                      caretColor: "#D8B56A",
                      fontSize: 15,
                      border: "none",
                    }}
                  />
                  <span
                    style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}
                  >
                    sq ft
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={goBackStep}
                className="px-6 py-4 rounded-2xl font-semibold text-sm"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.6)",
                  minHeight: 52,
                }}
              >
                ← Back
              </button>
              <button
                type="button"
                data-ocid="step3.next"
                onClick={validateAndNext}
                className="flex-1 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all"
                style={{ ...goldBtn, minHeight: 52 }}
              >
                Next: Budget <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "#F4F7FF",
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                {mode === "buy"
                  ? "What's your budget?"
                  : "What's your rent budget?"}
              </h2>
              <p style={{ color: "rgba(185,198,216,0.6)", fontSize: 13 }}>
                {mode === "buy"
                  ? "Choose your price range"
                  : "Select monthly rental budget"}
              </p>
            </div>
            <div
              className="space-y-2"
              style={
                stepErrors.budget
                  ? {
                      outline: "1px solid #ef4444",
                      borderRadius: 12,
                      padding: 4,
                    }
                  : {}
              }
              data-ocid="step4.budget_options"
            >
              {getBudgetRanges(mode, selectedPropType).map((range) => {
                const active = selectedBudget === range.value;
                return (
                  <button
                    key={range.value}
                    type="button"
                    data-ocid={`step4.budget.${range.value}`}
                    onClick={() => {
                      setSelectedBudget(active ? null : range.value);
                      setStepErrors((prev) => {
                        const { budget: _b, ...rest } = prev;
                        return rest;
                      });
                    }}
                    className="w-full px-5 py-3.5 rounded-2xl font-semibold text-left flex items-center justify-between transition-all"
                    style={{
                      background: active
                        ? "rgba(216,181,106,0.15)"
                        : "rgba(255,255,255,0.05)",
                      border: active
                        ? "2px solid rgba(216,181,106,0.6)"
                        : "2px solid rgba(255,255,255,0.08)",
                      color: active ? "#D8B56A" : "rgba(255,255,255,0.7)",
                      minHeight: 52,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 14,
                      }}
                    >
                      {range.label}
                    </span>
                    {active && (
                      <span style={{ fontSize: 12, color: "#D8B56A" }}>
                        ✓ Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {stepErrors.budget && errorMsg(stepErrors.budget)}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={goBackStep}
                className="px-6 py-4 rounded-2xl font-semibold text-sm"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.6)",
                  minHeight: 52,
                }}
              >
                ← Back
              </button>
              <button
                type="button"
                data-ocid="step4.next"
                onClick={validateAndNext}
                className="flex-1 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all"
                style={
                  selectedBudget
                    ? { ...goldBtn, minHeight: 52 }
                    : {
                        background: "rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.3)",
                        minHeight: 52,
                      }
                }
              >
                Next: Builder <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5" ref={builderRef}>
            <div>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "#F4F7FF",
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                Preferred Builder / Project
              </h2>
              <p style={{ color: "rgba(185,198,216,0.6)", fontSize: 13 }}>
                <span style={{ color: "#D8B56A" }}>Optional</span> — skip if
                you're open to all builders
              </p>
            </div>

            <div className="space-y-2" style={{ position: "relative" }}>
              <span style={sectionLabel}>Builder Name</span>
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{
                  background: "rgba(10,15,30,0.9)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  minHeight: 52,
                }}
              >
                <Search
                  size={14}
                  style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}
                />
                <input
                  type="text"
                  value={builderManual || builderQuery}
                  onChange={(e) => {
                    setBuilderQuery(e.target.value);
                    setBuilderManual(e.target.value);
                    setSelectedBuilder("");
                    setShowBuilderDropdown(true);
                  }}
                  onFocus={() => setShowBuilderDropdown(true)}
                  placeholder="Search or type builder name…"
                  data-ocid="step5.builder_input"
                  className="flex-1 outline-none"
                  style={{
                    background: "transparent",
                    color: "#fff",
                    caretColor: "#D8B56A",
                    fontSize: 14,
                    border: "none",
                  }}
                />
                {(builderManual || selectedBuilder) && (
                  <button
                    type="button"
                    onClick={() => {
                      setBuilderManual("");
                      setBuilderQuery("");
                      setSelectedBuilder("");
                    }}
                  >
                    <X size={13} style={{ color: "rgba(255,255,255,0.4)" }} />
                  </button>
                )}
              </div>
              {showBuilderDropdown && filteredBuilders.length > 0 && (
                <div
                  className="absolute left-0 right-0 rounded-2xl overflow-hidden z-50"
                  style={{
                    top: "100%",
                    marginTop: 4,
                    background: "rgba(7,26,47,0.97)",
                    border: "1px solid rgba(216,181,106,0.2)",
                    maxHeight: 200,
                    overflowY: "auto",
                  }}
                >
                  {filteredBuilders.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setSelectedBuilder(b);
                        setBuilderManual(b);
                        setBuilderQuery(b);
                        setShowBuilderDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm transition-all"
                      style={{
                        color: "rgba(255,255,255,0.75)",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        minHeight: 44,
                      }}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2" style={{ position: "relative" }}>
              <span style={sectionLabel}>Project Name</span>
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{
                  background: "rgba(10,15,30,0.9)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  minHeight: 52,
                }}
              >
                <Search
                  size={14}
                  style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}
                />
                <input
                  type="text"
                  value={projectManual || projectQuery}
                  onChange={(e) => {
                    setProjectQuery(e.target.value);
                    setProjectManual(e.target.value);
                    setSelectedProject("");
                    setShowProjectDropdown(true);
                  }}
                  onFocus={() => setShowProjectDropdown(true)}
                  placeholder="Search or type project name…"
                  data-ocid="step5.project_input"
                  className="flex-1 outline-none"
                  style={{
                    background: "transparent",
                    color: "#fff",
                    caretColor: "#D8B56A",
                    fontSize: 14,
                    border: "none",
                  }}
                />
                {(projectManual || selectedProject) && (
                  <button
                    type="button"
                    onClick={() => {
                      setProjectManual("");
                      setProjectQuery("");
                      setSelectedProject("");
                    }}
                  >
                    <X size={13} style={{ color: "rgba(255,255,255,0.4)" }} />
                  </button>
                )}
              </div>
              {showProjectDropdown && filteredProjects.length > 0 && (
                <div
                  className="absolute left-0 right-0 rounded-2xl overflow-hidden z-50"
                  style={{
                    top: "100%",
                    marginTop: 4,
                    background: "rgba(7,26,47,0.97)",
                    border: "1px solid rgba(216,181,106,0.2)",
                    maxHeight: 200,
                    overflowY: "auto",
                  }}
                >
                  {filteredProjects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProject(p.name);
                        setProjectManual(p.name);
                        setProjectQuery(p.name);
                        setShowProjectDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm"
                      style={{
                        color: "rgba(255,255,255,0.75)",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        minHeight: 44,
                      }}
                    >
                      <span style={{ color: "rgba(255,255,255,0.9)" }}>
                        {p.name}
                      </span>
                      <span
                        style={{
                          color: "rgba(185,198,216,0.45)",
                          fontSize: 11,
                          marginLeft: 6,
                        }}
                      >
                        {p.builder}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={goBackStep}
                className="px-6 py-4 rounded-2xl font-semibold text-sm"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.6)",
                  minHeight: 52,
                }}
              >
                ← Back
              </button>
              <button
                type="button"
                data-ocid="step5.next"
                onClick={() => setStep(6)}
                className="flex-1 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2"
                style={{ ...goldBtn, minHeight: 52 }}
              >
                Review Summary <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-5">
            <div>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "#F4F7FF",
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                Your Search Summary
              </h2>
              <p style={{ color: "rgba(185,198,216,0.6)", fontSize: 13 }}>
                Ready to find your
                {mode === "buy" ? " dream property" : " perfect rental"}
              </p>
            </div>
            <div
              className="rounded-2xl p-5 space-y-3"
              style={{
                background: "rgba(216,181,106,0.05)",
                border: "1px solid rgba(216,181,106,0.2)",
              }}
              data-ocid="step6.summary_card"
            >
              {[
                { label: "City", value: city },
                { label: "Locality", value: selectedLocation?.name || "—" },
                {
                  label: "Property Type",
                  value:
                    PROPERTY_TYPES.find((p) => p.type === selectedPropType)
                      ?.label || "—",
                },
                {
                  label: "BHK",
                  value: detailsData.bhk
                    ? String(detailsData.bhk).toUpperCase()
                    : "Any",
                },
                {
                  label: "Budget",
                  value: selectedBudget?.replace("-", " – ₹") || "—",
                },
                {
                  label: "Builder",
                  value: selectedBuilder || builderManual || "Any",
                },
                {
                  label: "Project",
                  value: selectedProject || projectManual || "Any",
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span
                    style={{ color: "rgba(185,198,216,0.5)", fontSize: 13 }}
                  >
                    {label}
                  </span>
                  <span
                    style={{ color: "#F4F7FF", fontSize: 13, fontWeight: 600 }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={goBackStep}
                className="px-6 py-4 rounded-2xl font-semibold text-sm"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.6)",
                  minHeight: 52,
                }}
              >
                ← Back
              </button>
              <button
                type="button"
                data-ocid="step6.find_properties"
                onClick={handleSubmit}
                className="flex-1 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all"
                style={{ ...goldBtn, minHeight: 52 }}
              >
                <Search size={17} />{" "}
                {mode === "buy" ? "Find Properties →" : "Find Rentals →"}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // ─── FORM PHASE ─────────────────────────────────────────────────────────────

  if (phase === "form") {
    return (
      <>
        <AnalyzingOverlay
          isVisible={showOverlay}
          module={mode}
          dataReady={overlayDataReady}
          onComplete={handleOverlayComplete}
        />

        {/* Pin on Map modal */}
        {showMapModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "#0A0F1E",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 10001,
                background: "rgba(7,26,47,0.97)",
                borderBottom: "1px solid rgba(216,181,106,0.22)",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <MapPin size={16} style={{ color: "#D8B56A" }} />
                <span
                  style={{
                    color: "#F4F7FF",
                    fontWeight: 700,
                    fontSize: 15,
                    fontFamily: "'Playfair Display', serif",
                  }}
                >
                  Pin Your Location on Map
                </span>
              </div>
              <button
                type="button"
                aria-label="Close map"
                onClick={() => setShowMapModal(false)}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  color: "rgba(255,255,255,0.7)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  minHeight: 44,
                }}
                data-ocid="buyrent.map_modal.close_button"
              >
                <X size={16} />
              </button>
            </div>
            <div
              style={{
                position: "absolute",
                top: 56,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            >
              <GlobalMapComponent
                mode="select-location"
                city={city}
                center={mapCenter}
                fullScreen={true}
                showLayerToggle={false}
                onLocationSelect={(lat, lng, locName) => {
                  setMapCenter([lat, lng]);
                  setSelectedLocation({
                    id: `pin-${lat.toFixed(4)}-${lng.toFixed(4)}`,
                    name: locName,
                    type: "locality" as const,
                    city,
                    district: city,
                    state: "Karnataka",
                    pincode: "",
                    searchTokens: [locName.toLowerCase()],
                  });
                  setStepErrors((prev) => {
                    const { location: _l, ...rest } = prev;
                    return rest;
                  });
                  setShowMapModal(false);
                }}
              />
            </div>
            <div
              style={{
                position: "absolute",
                top: 72,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10002,
                background: "rgba(7,26,47,0.88)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#F4F7FF",
                padding: "10px 20px",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                pointerEvents: "none",
                whiteSpace: "nowrap",
              }}
            >
              📍 Click anywhere on the map or drag the pin to select your
              location
            </div>
          </div>
        )}

        {/* Full-screen map background */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            background: "#0A0F1E",
            overflow: "hidden",
          }}
        >
          <GlobalMapComponent
            mode={mode === "buy" ? "buy" : "rent"}
            city={city}
            center={mapCenter}
            height="100%"
            projects={mapProjects as ProjectPin[]}
            showLayerToggle={true}
            levelSelectorTopOffset={70}
            onLocationSelect={(lat, lng, locName) => {
              setMapCenter([lat, lng]);
              setSelectedLocation({
                id: `pin-${lat.toFixed(4)}-${lng.toFixed(4)}`,
                name: locName,
                type: "locality" as const,
                city,
                district: city,
                state: "Karnataka",
                pincode: "",
                searchTokens: [locName.toLowerCase()],
              });
            }}
          />
        </div>

        {/* Nav */}
        <div style={{ position: "relative", zIndex: 30 }}>
          <GlobalNav />
        </div>

        {/* Buy/Rent mode toggle */}
        <div
          style={{
            position: "fixed",
            top: 72,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 25,
          }}
        >
          <div className="flex p-1 rounded-2xl" style={glass}>
            {(["buy", "rent"] as const).map((m) => (
              <button
                key={m}
                type="button"
                data-ocid={`buyrent.${m}.tab`}
                onClick={() => navigate({ to: m === "buy" ? "/buy" : "/rent" })}
                className="px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-200"
                style={{
                  background: mode === m ? goldBtn.background : "transparent",
                  color: mode === m ? "#071A2F" : "rgba(255,255,255,0.7)",
                  boxShadow: mode === m ? goldBtn.boxShadow : "none",
                  minHeight: 44,
                }}
              >
                {m === "buy" ? "Buy" : "Rent"}
              </button>
            ))}
          </div>
        </div>

        {/* DESKTOP: Floating form card */}
        <div
          ref={formRef}
          className="hidden sm:block"
          style={{
            position: "fixed",
            top: 120,
            left: 0,
            right: 0,
            zIndex: 20,
            width: "100%",
            maxWidth: 444,
            marginLeft: "auto",
            marginRight: "auto",
            paddingLeft: 12,
            paddingRight: 12,
            paddingBottom: 24,
            maxHeight: "calc(100vh - 140px)",
            overflowY: "auto",
            overflowX: "hidden",
            boxSizing: "border-box",
          }}
        >
          <div
            className="rounded-3xl p-4 sm:p-6"
            style={{
              background: "rgba(7,26,47,0.94)",
              border: "1px solid rgba(216,181,106,0.22)",
              backdropFilter: "blur(24px)",
              boxShadow:
                "0 24px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
            <StepIndicator step={step} total={6} />
            {renderStepContent()}
          </div>
        </div>

        {/* MOBILE: Backdrop */}
        {mobileSheetOpen && (
          <div
            className="sm:hidden"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 38,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(2px)",
            }}
            onClick={() => setMobileSheetOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setMobileSheetOpen(false)}
            role="button"
            tabIndex={-1}
            aria-label="Close search form"
          />
        )}

        {/* MOBILE: Bottom sheet slides up */}
        <div
          className="sm:hidden"
          data-ocid="mobile.search_sheet"
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 45,
            transform: mobileSheetOpen ? "translateY(0)" : "translateY(100%)",
            transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
            maxHeight: "88dvh",
            overflowY: "auto",
            overflowX: "hidden",
            background: "rgba(7,26,47,0.99)",
            borderTop: "1px solid rgba(216,181,106,0.3)",
            borderRadius: "24px 24px 0 0",
            boxShadow: "0 -12px 60px rgba(0,0,0,0.8)",
          }}
        >
          {/* Drag handle */}
          <button
            type="button"
            className="flex justify-center w-full pt-3 pb-1 cursor-pointer"
            onClick={() => setMobileSheetOpen(false)}
            aria-label="Collapse search form"
          >
            <div
              style={{
                width: 48,
                height: 5,
                borderRadius: 3,
                background: "rgba(255,255,255,0.25)",
              }}
            />
          </button>
          {/* Sheet header */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.09)" }}
          >
            <div>
              <span
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "#F4F7FF",
                  fontWeight: 700,
                  fontSize: 17,
                }}
              >
                {mode === "buy" ? "Find a Property" : "Find a Rental"}
              </span>
              <p
                style={{
                  color: "rgba(185,198,216,0.5)",
                  fontSize: 11,
                  marginTop: 1,
                }}
              >
                Step {step} of 6
              </p>
            </div>
            <button
              type="button"
              aria-label="Close search form"
              data-ocid="mobile.search_sheet.close_button"
              onClick={() => setMobileSheetOpen(false)}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                color: "rgba(255,255,255,0.6)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 44,
                minWidth: 44,
              }}
            >
              <X size={16} />
            </button>
          </div>
          <div className="px-5 pt-4">
            <StepIndicator step={step} total={6} />
          </div>
          <div className="px-5 pb-8">{renderStepContent()}</div>
        </div>

        {/* MOBILE: Sticky bottom action bar — hides when sheet opens */}
        <div
          className="sm:hidden"
          data-ocid="mobile.bottom_action_bar"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 35,
            background: "rgba(7,26,47,0.97)",
            borderTop: "1px solid rgba(216,181,106,0.22)",
            backdropFilter: "blur(20px)",
            paddingTop: 10,
            paddingBottom: "max(20px, env(safe-area-inset-bottom))",
            paddingLeft: 16,
            paddingRight: 16,
            display: "flex",
            gap: 10,
            alignItems: "center",
            transform: mobileSheetOpen ? "translateY(100%)" : "translateY(0)",
            transition: "transform 0.25s ease",
            boxSizing: "border-box",
          }}
        >
          <button
            type="button"
            data-ocid="mobile.filter_button"
            onClick={() => setMobileSheetOpen(true)}
            aria-label="Open search filters"
            style={{
              flexShrink: 0,
              minHeight: 52,
              minWidth: 56,
              borderRadius: 16,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#F4F7FF",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              cursor: "pointer",
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            <Filter size={18} />
            <span>Filters</span>
          </button>
          <button
            type="button"
            data-ocid="mobile.search_button"
            onClick={() => setMobileSheetOpen(true)}
            style={{
              flex: 1,
              minHeight: 52,
              borderRadius: 16,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              ...goldBtn,
            }}
          >
            <Search size={16} />
            {step < 6
              ? `Continue — Step ${step}/6`
              : mode === "buy"
                ? "Find Properties →"
                : "Find Rentals →"}
          </button>
          <div
            style={{
              flexShrink: 0,
              minHeight: 52,
              minWidth: 52,
              borderRadius: 16,
              background: "rgba(216,181,106,0.1)",
              border: "1px solid rgba(216,181,106,0.25)",
              color: "#D8B56A",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              fontSize: 10,
              fontWeight: 600,
            }}
            aria-label={`Step ${step} of 6`}
          >
            <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>
              {step}
            </span>
            <span style={{ opacity: 0.7 }}>of 6</span>
          </div>
        </div>
      </>
    );
  }

  // ─── RESULTS PHASE ───────────────────────────────────────────────────────────

  return (
    <div
      ref={resultsRef}
      style={{ background: "#071A2F", minHeight: "100vh", overflowX: "hidden" }}
    >
      <AnalyzingOverlay
        isVisible={showOverlay}
        module={mode}
        dataReady={overlayDataReady}
        onComplete={handleOverlayComplete}
      />
      <GlobalNav />

      <div style={{ paddingTop: 64 }}>
        {/* Map — hidden in mobile list view */}
        <div
          data-ocid="results.map_section"
          style={{ position: "relative", overflow: "hidden" }}
          className={
            mobileResultsView === "list" ? "h-0 sm:!h-[350px]" : "h-[350px]"
          }
        >
          <GlobalMapComponent
            mode={mode === "buy" ? "buy" : "rent"}
            city={city}
            center={mapCenter}
            height="350px"
            projects={mapProjects as ProjectPin[]}
            showLayerToggle
          />
          <button
            type="button"
            data-ocid="results.back_to_search"
            onClick={resetToForm}
            className="absolute top-3 left-3 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: "rgba(7,26,47,0.9)",
              border: "1px solid rgba(216,181,106,0.4)",
              color: "#D8B56A",
              backdropFilter: "blur(12px)",
              minHeight: 44,
            }}
          >
            ← New Search
          </button>
          <div className="absolute top-3 right-3 z-50">
            <div
              className="flex p-1 rounded-xl"
              style={{
                background: "rgba(7,26,47,0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {(["buy", "rent"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() =>
                    navigate({ to: m === "buy" ? "/buy" : "/rent" })
                  }
                  className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: mode === m ? goldBtn.background : "transparent",
                    color: mode === m ? "#071A2F" : "rgba(255,255,255,0.6)",
                    minHeight: 36,
                  }}
                >
                  {m === "buy" ? "Buy" : "Rent"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Map/List toggle */}
        <div
          className="sm:hidden flex items-center justify-center gap-3 py-3 px-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          data-ocid="mobile.results_view_toggle"
        >
          {(["map", "list"] as const).map((view) => (
            <button
              key={view}
              type="button"
              data-ocid={`mobile.results_view.${view}_tab`}
              onClick={() => setMobileResultsView(view)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                background:
                  mobileResultsView === view
                    ? "rgba(216,181,106,0.12)"
                    : "rgba(255,255,255,0.05)",
                border:
                  mobileResultsView === view
                    ? "1.5px solid rgba(216,181,106,0.5)"
                    : "1.5px solid rgba(255,255,255,0.1)",
                color:
                  mobileResultsView === view
                    ? "#D8B56A"
                    : "rgba(255,255,255,0.55)",
                minHeight: 44,
              }}
            >
              {view === "map" ? (
                <MapIcon size={15} />
              ) : (
                <LayoutList size={15} />
              )}
              {view === "map" ? "Map" : `List (${filtered.length})`}
            </button>
          ))}
        </div>

        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 pb-28"
          style={{ overflowX: "hidden" }}
        >
          {/* Results header */}
          <div className="flex items-center justify-between py-5 gap-3">
            <div className="min-w-0">
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "#F4F7FF",
                  fontSize: 20,
                  fontWeight: 700,
                }}
                className="truncate"
              >
                {filtered.length > 0
                  ? `${filtered.length} ${mode === "buy" ? "Properties" : "Rentals"} Found`
                  : "No Results Found"}
              </h2>
              {selectedLocation && (
                <p
                  style={{
                    color: "rgba(185,198,216,0.55)",
                    fontSize: 13,
                    marginTop: 2,
                  }}
                  className="truncate"
                >
                  in {selectedLocation.name}
                  {selectedLocation.city ? `, ${selectedLocation.city}` : ""}
                </p>
              )}
            </div>
            <button
              type="button"
              data-ocid="results.new_search"
              onClick={resetToForm}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shrink-0 transition-all"
              style={{
                background: "rgba(216,181,106,0.1)",
                border: "1px solid rgba(216,181,106,0.3)",
                color: "#D8B56A",
                minHeight: 44,
              }}
            >
              <Search size={13} /> Refine
            </button>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2 mb-5">
            {selectedPropType && (
              <FilterChip
                label={
                  PROPERTY_TYPES.find((p) => p.type === selectedPropType)
                    ?.label || selectedPropType
                }
                onRemove={() => setSelectedPropType(null)}
              />
            )}
            {Boolean(detailsData.bhk) && (
              <FilterChip
                label={String(detailsData.bhk as string).toUpperCase()}
                onRemove={() => setDetailsData((d) => ({ ...d, bhk: null }))}
              />
            )}
            {selectedBudget && (
              <FilterChip
                label={selectedBudget}
                onRemove={() => setSelectedBudget(null)}
              />
            )}
            {selectedLocation && (
              <FilterChip
                label={selectedLocation.name}
                onRemove={() => setSelectedLocation(null)}
              />
            )}
            {(selectedBuilder || builderManual) && (
              <FilterChip
                label={selectedBuilder || builderManual}
                onRemove={() => {
                  setSelectedBuilder("");
                  setBuilderManual("");
                }}
              />
            )}
          </div>

          {/* AI Valuation CTA */}
          <button
            type="button"
            data-ocid="results.ai_valuation_cta"
            onClick={() => navigate({ to: "/valuation" })}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl mb-6 text-sm font-semibold transition-all"
            style={{
              background: "rgba(212,175,55,0.08)",
              border: "1px solid rgba(212,175,55,0.25)",
              color: "#D4AF37",
              minHeight: 52,
            }}
          >
            <Brain size={15} />{" "}
            {mode === "buy"
              ? "Get AI Valuation for a specific property →"
              : "Check Rental Valuation →"}
          </button>

          {/* Nearby panel */}
          {(nearbyPins.tech_park.length > 0 ||
            nearbyPins.metro.length > 0 ||
            osrmNearbyMetros.length > 0 ||
            osrmNearbyTechParks.length > 0) && (
            <div
              className="rounded-2xl mb-6 overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
              data-ocid="results.nearby_panel"
            >
              <div
                className="px-5 py-3 flex items-center gap-2"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                <span style={{ fontSize: 15 }}>📍</span>
                <span
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: "#F4F7FF",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  Nearby Places
                </span>
                {nearbyOsrmLoading && (
                  <span className="inline-block w-3 h-3 rounded-full border border-white/20 border-t-white/60 animate-spin ml-1" />
                )}
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(216,181,106,0.6)",
                    marginLeft: "auto",
                  }}
                >
                  Sorted nearest first
                </span>
              </div>
              {osrmNearbyMetros.length > 0 ||
              osrmNearbyTechParks.length > 0 ||
              osrmNearbyRailway.length > 0 ||
              osrmNearbyBusStops.length > 0 ? (
                <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(
                    [
                      {
                        key: "tech_park" as const,
                        label: "Tech Parks",
                        emoji: "🏢",
                        color: "#D4AF37",
                        items: osrmNearbyTechParks,
                      },
                      {
                        key: "metro" as const,
                        label: "Metro Stations",
                        emoji: "🚇",
                        color: "#3b82f6",
                        items: osrmNearbyMetros,
                      },
                      {
                        key: "railway" as const,
                        label: "Railway",
                        emoji: "🚆",
                        color: "#8b5cf6",
                        items: osrmNearbyRailway,
                      },
                      {
                        key: "bus_stop" as const,
                        label: "Bus Stops",
                        emoji: "🚌",
                        color: "#f97316",
                        items: osrmNearbyBusStops,
                      },
                    ] as const
                  )
                    .filter((cat) => cat.items.length > 0)
                    .map((cat) => (
                      <div key={cat.key} className="space-y-1.5">
                        <p
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.07em",
                            textTransform: "uppercase",
                            color: cat.color,
                            marginBottom: 6,
                          }}
                        >
                          {cat.emoji} {cat.label}
                        </p>
                        {cat.items.slice(0, 4).map((poi) => (
                          <div
                            key={poi.name}
                            className="flex items-center justify-between rounded-xl px-3 py-2"
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                color: "rgba(244,247,255,0.8)",
                              }}
                              className="truncate mr-2"
                            >
                              {poi.name}
                            </span>
                            <span
                              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
                              style={{
                                background: `${cat.color}22`,
                                color: cat.color,
                                border: `1px solid ${cat.color}44`,
                              }}
                            >
                              {poi.osrmKm != null
                                ? poi.osrmDurationMins != null
                                  ? `${poi.osrmKm.toFixed(1)} km • ${poi.osrmDurationMins} mins`
                                  : `${poi.osrmKm.toFixed(1)} km`
                                : "Unavailable"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                </div>
              ) : !nearbyOsrmLoading ? (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(
                    [
                      {
                        key: "tech_park" as const,
                        label: "Tech Parks",
                        emoji: "🏢",
                        color: "#D4AF37",
                      },
                      {
                        key: "metro" as const,
                        label: "Metro Stations",
                        emoji: "🚇",
                        color: "#3b82f6",
                      },
                      {
                        key: "railway" as const,
                        label: "Railway",
                        emoji: "🚆",
                        color: "#8b5cf6",
                      },
                      {
                        key: "bus_stop" as const,
                        label: "Bus Stops",
                        emoji: "🚌",
                        color: "#f97316",
                      },
                    ] as const
                  )
                    .filter((cat) => nearbyPins[cat.key].length > 0)
                    .map((cat) => (
                      <div key={cat.key} className="space-y-1.5">
                        <p
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.07em",
                            textTransform: "uppercase",
                            color: cat.color,
                            marginBottom: 6,
                          }}
                        >
                          {cat.emoji} {cat.label}
                        </p>
                        {nearbyPins[cat.key].slice(0, 4).map((pin) => (
                          <div
                            key={pin.id}
                            className="flex items-center justify-between rounded-xl px-3 py-2"
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                color: "rgba(244,247,255,0.8)",
                              }}
                              className="truncate mr-2"
                            >
                              {pin.name}
                            </span>
                            <span
                              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                              style={{
                                background: `${cat.color}22`,
                                color: cat.color,
                                border: `1px solid ${cat.color}44`,
                              }}
                            >
                              Select location for distances
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="px-4 pb-4 pt-2 text-white/30 text-xs flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full border border-white/20 border-t-white/60 animate-spin" />
                  Calculating driving distances…
                </div>
              )}
            </div>
          )}

          {/* Listings */}
          {filtered.length === 0 ? (
            <div
              data-ocid="results.empty_state"
              className="flex flex-col items-center justify-center py-24"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              <span style={{ fontSize: 48, marginBottom: 16 }}>
                {mode === "buy" ? "🏠" : "🔑"}
              </span>
              <p
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.5)",
                  marginBottom: 6,
                }}
              >
                No {mode === "buy" ? "properties" : "rentals"} match your
                filters
              </p>
              <p style={{ fontSize: 13 }}>
                Try{" "}
                <button
                  type="button"
                  onClick={resetToForm}
                  className="underline"
                  style={{ color: "#D8B56A" }}
                >
                  adjusting your search
                </button>
              </p>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
              data-ocid="results.listings_grid"
            >
              {filtered.map((listing: MockListing, idx: number) => {
                const badges = computeBadgeFlags(listing, mode);
                return (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    showActions="buyer"
                    index={idx}
                    isHighLiquidity={badges.isHighLiquidity}
                    isDistressDeal={badges.isDistressDeal}
                    isHighYield={badges.isHighYield}
                    isHotMarket={badges.isHotMarket}
                    onView={() =>
                      navigate({
                        to: "/property/$id",
                        params: { id: listing.id },
                      })
                    }
                  />
                );
              })}
            </div>
          )}

          {/* AI Price Intelligence */}
          <div
            className="mt-8 rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(216,181,106,0.2)" }}
            data-ocid="results.ai_insights_section"
          >
            <button
              type="button"
              data-ocid="results.ai_insights_toggle"
              onClick={() => setShowInsights((v) => !v)}
              className="w-full flex items-center justify-between px-6 py-4 transition-all"
              style={{ background: "rgba(216,181,106,0.07)", minHeight: 52 }}
            >
              <div className="flex items-center gap-3">
                <Brain size={18} style={{ color: "#D8B56A" }} />
                <span
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: "#F4F7FF",
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  AI Price Intelligence
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(216,181,106,0.6)",
                    fontWeight: 600,
                    background: "rgba(216,181,106,0.1)",
                    padding: "2px 8px",
                    borderRadius: 20,
                  }}
                >
                  {localityInsight.confidence}% Confidence
                </span>
              </div>
              {showInsights ? (
                <ChevronUp size={16} style={{ color: "#D8B56A" }} />
              ) : (
                <ChevronDown size={16} style={{ color: "#D8B56A" }} />
              )}
            </button>
            {showInsights && (
              <div
                className="px-6 pb-6 pt-4 space-y-4"
                style={{ background: "rgba(216,181,106,0.04)" }}
              >
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: "Lower Estimate",
                      value: localityInsight.lower,
                      color: "#4ade80",
                    },
                    {
                      label: "AI Median",
                      value: localityInsight.median,
                      color: "#D8B56A",
                    },
                    {
                      label: "Upper Estimate",
                      value: localityInsight.upper,
                      color: "#f87171",
                    },
                  ].map(({ label, value, color }) => (
                    <div
                      key={label}
                      className="rounded-xl p-3 text-center"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <p
                        style={{
                          color: "rgba(185,198,216,0.5)",
                          fontSize: 10,
                          marginBottom: 4,
                        }}
                      >
                        {label}
                      </p>
                      <p
                        style={{
                          color,
                          fontSize: 16,
                          fontWeight: 700,
                          fontFamily: "'Playfair Display', serif",
                        }}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      style={{ color: "rgba(185,198,216,0.5)", fontSize: 11 }}
                    >
                      Market Confidence
                    </span>
                    <span
                      style={{
                        color: "#D8B56A",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {localityInsight.confidence}%
                    </span>
                  </div>
                  <div
                    className="rounded-full overflow-hidden"
                    style={{ height: 4, background: "rgba(255,255,255,0.08)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${localityInsight.confidence}%`,
                        background: "linear-gradient(90deg, #C9A84C, #E8C97A)",
                      }}
                    />
                  </div>
                </div>
                <div
                  className="rounded-xl px-4 py-3 flex items-start gap-3"
                  style={{
                    background: "rgba(37,99,235,0.08)",
                    border: "1px solid rgba(37,99,235,0.2)",
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
                  <p
                    style={{
                      color: "rgba(185,198,216,0.75)",
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    {localityInsight.insight}
                  </p>
                </div>
                {selectedLocation && (
                  <button
                    type="button"
                    onClick={() => {
                      const locId =
                        selectedLocation.id ||
                        selectedLocation.name
                          .toLowerCase()
                          .replace(/\s+/g, "-");
                      navigate({
                        to: "/area/$locationId",
                        params: { locationId: locId },
                      });
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                    style={{
                      background: "rgba(216,181,106,0.1)",
                      border: "1px solid rgba(216,181,106,0.3)",
                      color: "#D8B56A",
                      minHeight: 52,
                    }}
                    data-ocid="results.view_area_intelligence"
                  >
                    View Full Area Intelligence for {selectedLocation.name}{" "}
                    <ExternalLink size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar (results) */}
      <div
        className="sm:hidden"
        data-ocid="mobile.results_bottom_bar"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          background: "rgba(7,26,47,0.97)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(20px)",
          paddingTop: 10,
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          paddingLeft: 16,
          paddingRight: 16,
          display: "flex",
          gap: 10,
          alignItems: "center",
          boxSizing: "border-box",
        }}
      >
        <button
          type="button"
          data-ocid="mobile.results.new_search_button"
          onClick={resetToForm}
          style={{
            flex: 1,
            minHeight: 52,
            borderRadius: 16,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: "rgba(216,181,106,0.1)",
            border: "1px solid rgba(216,181,106,0.35)",
            color: "#D8B56A",
          }}
        >
          <Search size={15} /> New Search
        </button>
        <button
          type="button"
          data-ocid="mobile.results.view_toggle_button"
          onClick={() =>
            setMobileResultsView((v) => (v === "map" ? "list" : "map"))
          }
          style={{
            flexShrink: 0,
            minHeight: 52,
            minWidth: 56,
            borderRadius: 16,
            fontWeight: 600,
            fontSize: 10,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#F4F7FF",
          }}
        >
          {mobileResultsView === "map" ? (
            <>
              <LayoutList size={18} />
              <span>List</span>
            </>
          ) : (
            <>
              <MapIcon size={18} />
              <span>Map</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
