import { computeAIValue } from "@/utils/aiEngine";
import { useNavigate, useSearch } from "@tanstack/react-router";
import ProjectLinkedDropdown from "../components/ProjectLinkedDropdown";
import { BANGALORE_PROJECTS } from "../data/bangaloreProjects";
import { filterBuildersByLocality } from "../utils/projectFilter";

import LocationConfirmModal from "../components/LocationConfirmModal";
import type { ReverseGeocodeResult } from "../utils/localReverseGeocode";
import { reverseGeocodeLocally } from "../utils/localReverseGeocode";

declare global {
  interface Window {
    L: any;
  }
}

function loadLeafletForMap(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => resolve(window.L);
      script.onerror = () => reject(new Error("Failed to load Leaflet"));
      document.head.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if (window.L) {
          clearInterval(interval);
          resolve(window.L);
        }
      }, 50);
      setTimeout(() => {
        clearInterval(interval);
        reject(new Error("timeout"));
      }, 10000);
    }
  });
}

// ListingMapPin — uses CartoDB Voyager light tiles (same as GlobalMapComponent)
function ListingMapPin({
  coords,
  onChange,
  onDragEnd,
}: {
  coords: [number, number];
  onChange: (c: [number, number]) => void;
  onDragEnd?: (c: [number, number]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const initCoordsRef = useRef(coords);
  const onChangeRef = useRef(onChange);
  const onDragEndRef = useRef(onDragEnd);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onDragEndRef.current = onDragEnd;
  }, [onDragEnd]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const L = await loadLeafletForMap();
        if (cancelled || !containerRef.current) return;
        const [initLat, initLng] = initCoordsRef.current;
        const map = L.map(containerRef.current, {
          scrollWheelZoom: false,
        }).setView([initLat, initLng], 13);
        mapRef.current = map;
        // CartoDB Voyager light tiles — matches GlobalMapComponent across all portals
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 19,
          },
        ).addTo(map);
        const icon = L.divIcon({
          className: "",
          html: '<div style="width:28px;height:28px;background:#D4AF37;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker([initLat, initLng], {
          icon,
          draggable: true,
        }).addTo(map);
        markerRef.current = marker;
        marker.on("dragend", (e: any) => {
          const ll = e.target.getLatLng();
          const newCoords: [number, number] = [ll.lat, ll.lng];
          onChangeRef.current(newCoords);
          onDragEndRef.current?.(newCoords);
        });
        map.on("click", (e: any) => {
          const { lat, lng } = e.latlng;
          const newCoords: [number, number] = [lat, lng];
          marker.setLatLng(newCoords);
          onChangeRef.current(newCoords);
          onDragEndRef.current?.(newCoords);
        });
        for (const d of [100, 500]) setTimeout(() => map?.invalidateSize(), d);
      } catch {
        // map init failed
      }
    }
    init();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLatLng(coords);
      mapRef.current.setView(coords, mapRef.current.getZoom());
    }
  }, [coords]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import GlobalNav from "../components/GlobalNav";
import SmartLocationSearch from "../components/SmartLocationSearch";
import { useAuth } from "../context/AuthContext";
import type { LocationRecord } from "../data/locationData";
import { formatPrice } from "../data/mockListings";

const STEPS = [
  "Listing Type",
  "Basic Details",
  "Structure",
  "Configuration",
  "Pricing & Media",
  "Review & Publish",
];

type PropertyType = "flat" | "villa" | "plot";
type SellerType = "owner" | "builder" | "agent";

function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 99,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <p className="text-white/60 text-xs font-medium block mb-2">{label}</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white flex items-center justify-center hover:border-[#D4AF37] transition-all"
        >
          <Minus size={14} />
        </button>
        <span className="text-white font-bold w-8 text-center font-mono">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white flex items-center justify-center hover:border-[#D4AF37] transition-all"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function PillSelector({
  options,
  value,
  onChange,
  multi = false,
}: {
  options: string[];
  value: string | string[];
  onChange: (v: any) => void;
  multi?: boolean;
}) {
  const isActive = (o: string) =>
    multi
      ? (value as string[])
          .map((v) => v.toLowerCase())
          .includes(o.toLowerCase())
      : (value as string).toLowerCase() === o.toLowerCase();
  const handleClick = (o: string) => {
    if (multi) {
      const arr = value as string[];
      onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o]);
    } else {
      onChange(o);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          type="button"
          key={o}
          onClick={() => handleClick(o)}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
            isActive(o)
              ? "bg-[#D4AF37] text-black border-[#D4AF37]"
              : "bg-white/5 text-white/70 border-white/10 hover:border-white/20"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function computeBadges(form: any): string[] {
  const badges: string[] = [];
  if (form.legalStatus === "A Khata") badges.push("High Liquidity");
  if (form.legalStatus === "Freehold") badges.push("Golden Verified");
  const builder = (form.builderName || "").toLowerCase();
  if (
    ["prestige", "sobha", "brigade"].some((b) => builder.includes(b)) ||
    form.balconies >= 3 ||
    form.facing === "North East" ||
    form.coveredParking >= 3
  ) {
    badges.push("High Value Asset");
  }
  return [...new Set(badges)];
}

export default function ListPropertyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [published, setPublished] = useState(false);
  const mediaRef = useRef<HTMLInputElement>(null);

  // Form state
  const [listingType, setListingType] = useState<"sale" | "rent">("sale");
  // Rent-specific fields
  const [rent, setRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [leaseDuration, setLeaseDuration] = useState("");
  const [furnishedStatus, setFurnishedStatus] = useState("");
  const [sellerType, setSellerType] = useState<SellerType>("owner");
  const [propertyType, setPropertyType] = useState<PropertyType>("flat");
  // Single unified location state (extended with pincode + microLocation)
  const [locationObj, setLocationObj] = useState<{
    name: string;
    city: string;
    lat: number;
    lng: number;
    pincode?: string;
    microLocation?: string;
    zone?: string;
    parentArea?: string;
  } | null>(null);
  const [cityState, setCityState] = useState("");
  // Derived for backward-compat with rest of form
  const location = locationObj?.name ?? "";
  const city = (cityState || locationObj?.city) ?? "";
  const pinCoords: [number, number] = locationObj
    ? [locationObj.lat, locationObj.lng]
    : [12.9716, 77.5946];

  // Geo confirmation modal state
  const [geoConfirm, setGeoConfirm] = useState<ReverseGeocodeResult | null>(
    null,
  );

  const updateLocation = (loc: {
    name: string;
    city: string;
    lat: number;
    lng: number;
    pincode?: string;
    microLocation?: string;
    zone?: string;
    parentArea?: string;
  }) => {
    setLocationObj(loc);
    setErrors((prev) => ({ ...prev, location: "" }));
  };
  const [buildingAge, setBuildingAge] = useState("");
  const [totalFloors, setTotalFloors] = useState(5);
  const [floor, setFloor] = useState(1);
  const [carpetArea, setCarpetArea] = useState("");
  const [builtUpArea, setBuiltUpArea] = useState("");
  const [builtUpError, setBuiltUpError] = useState("");
  const [plotArea, setPlotArea] = useState("");
  const [plotUnit, setPlotUnit] = useState("sq ft");
  const [landUse, setLandUse] = useState("");
  const [bhk, setBhk] = useState(2);
  const [bathrooms, setBathrooms] = useState(2);
  const [balconies, setBalconies] = useState(1);
  const [coveredParking, setCoveredParking] = useState(1);
  const [openParking, setOpenParking] = useState(0);
  const [facing, setFacing] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [legalStatus, setLegalStatus] = useState("");
  const [builderName, setBuilderName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [_reraNumber, _setReraNumber] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaDrag, setMediaDrag] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [amenities, setAmenities] = useState<string[]>([]);
  const AMENITY_OPTIONS = [
    "Parking",
    "Covered Parking",
    "Visitor Parking",
    "EV Charging",
    "Lift / Elevator",
    "Gymnasium",
    "24/7 Security",
    "Power Backup",
    "Swimming Pool",
    "Clubhouse",
    "Garden / Landscaping",
    "Children Play Area",
    "CCTV",
    "Intercom",
    "Gas Pipeline",
    "Fire Safety",
  ];
  const toggleAmenity = (a: string) =>
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );

  useEffect(() => {
    if (!user) void navigate({ to: "/auth" });
  }, [user, navigate]);

  const locality = locationObj?.name ?? "";
  const [aiPreview, setAiPreview] = useState<{
    lower: number;
    upper: number;
    median: number;
    label: string;
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const computePreviewAI = useCallback(() => {
    const area = Number(carpetArea) || Number(builtUpArea) || 0;
    if (
      !area ||
      area <= 0 ||
      !locality ||
      !bhk ||
      !facing ||
      amenities.length === 0
    )
      return;
    setAiLoading(true);
    try {
      const result = computeAIValue({
        locality,
        city: city || "Bangalore",
        builder: builderName || undefined,
        project: projectName || undefined,
        area,
        propertyType: propertyType || "apartment",
        bhk: bhk || 2,
        floor: Number(floor) || undefined,
        isTopFloor: false,
        facing: facing || undefined,
        amenities: amenities,
        parking: (coveredParking || 0) + (openParking || 0),
        sellerPrice: Number(listingPrice) || undefined,
      });
      setAiPreview({
        lower: result.lower,
        upper: result.upper,
        median: result.median,
        label: result.label,
      });
    } catch {
      setAiPreview(null);
    } finally {
      setAiLoading(false);
    }
  }, [
    locality,
    city,
    carpetArea,
    builtUpArea,
    builderName,
    projectName,
    propertyType,
    bhk,
    floor,
    facing,
    amenities,
    coveredParking,
    openParking,
    listingPrice,
  ]);

  // Debounced recompute when floor/facing/amenities/parking change
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const area = Number(carpetArea) || Number(builtUpArea) || 0;
    if (!area || !locality || !bhk || !facing || amenities.length === 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      computePreviewAI();
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    facing,
    amenities,
    computePreviewAI,
    carpetArea,
    builtUpArea,
    locality,
    bhk,
  ]);

  const priceWarning =
    aiPreview && listingPrice && Number(listingPrice) > aiPreview.upper * 1.2;
  const badges = computeBadges({
    legalStatus,
    builderName,
    balconies,
    facing,
    coveredParking,
  });

  const validateStep = () => {
    const newErrors: Record<string, string> = {};
    // Step 0: Listing Type (no validation needed)
    if (step === 1) {
      if (!sellerType) newErrors.sellerType = "Please select seller type";
      if (!propertyType) newErrors.propertyType = "Please select property type";
      if (!location) newErrors.location = "Please select a location";
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return false;
      }
    }
    if (step === 4) {
      if (listingType === "sale" && !listingPrice) {
        newErrors.listingPrice = "Please enter the listing price";
        setErrors(newErrors);
        return false;
      }
      if (listingType === "rent" && !rent) {
        newErrors.rent = "Please enter the monthly rent";
        setErrors(newErrors);
        return false;
      }
    }
    setErrors({});
    if (step === 2 && propertyType !== "plot") {
      if (
        Number(builtUpArea) > 0 &&
        Number(builtUpArea) <= Number(carpetArea)
      ) {
        setBuiltUpError("Built-up area must be greater than carpet area.");
        return false;
      }
      setBuiltUpError("");
    }
    if (step === 4 && mediaFiles.length === 0) {
      setMediaError("Please upload at least 1 photo.");
      return false;
    }
    setMediaError("");
    return true;
  };

  const nextStep = () => {
    if (validateStep()) setStep((s) => Math.min(5, s + 1));
  };
  const prevStep = () => setStep((s) => Math.max(0, s - 1));

  const handleMediaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setMediaDrag(false);
    const files = Array.from(e.dataTransfer.files);
    setMediaFiles((prev) => [...prev, ...files]);
    setMediaError("");
  };

  async function resizeImageToBase64(file: File): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const maxDim = 1280;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = url;
    });
  }

  const handlePublish = async () => {
    if (mediaFiles.length === 0) {
      setMediaError("Please upload at least 1 photo.");
      setStep(4);
      return;
    }
    // Compress and store images as base64 (max 10 images, ~100-200KB each)
    const imagesToStore: string[] = [];
    const filesToProcess = mediaFiles
      .filter((f) => f.type.startsWith("image"))
      .slice(0, 10);
    for (const f of filesToProcess) {
      try {
        const b64 = await resizeImageToBase64(f);
        imagesToStore.push(b64);
      } catch {
        /* skip failed images */
      }
    }
    // Save listing to localStorage
    const priceNum = Number(listingPrice) || 0;
    const carpetAreaNum = Number(carpetArea) || 0;
    const builtUpAreaNum = Number(builtUpArea) || 0;
    const listingLocality = location || city || "Unknown";
    const listingCity = city || location || "Bangalore";
    const listingPincode = locationObj?.pincode ?? "";
    const listingMicroLocation = locationObj?.microLocation ?? listingLocality;
    const listingLat = locationObj?.lat ?? null;
    const listingLng = locationObj?.lng ?? null;

    // Determine floor category
    const floorNum = Number(floor) || 0;
    let floorCategory: "ground" | "low" | "mid" | "high" | "top" = "mid";
    if (floorNum === 0) floorCategory = "ground";
    else if (floorNum <= 2) floorCategory = "low";
    else if (floorNum <= 5) floorCategory = "mid";
    else if (floorNum <= 10) floorCategory = "high";
    else floorCategory = "top";

    // Compute AI valuation ONCE at listing time — stored with listing, never recomputed in buyer portal
    let aiLower = 0;
    let aiUpper = 0;
    let aiMedian = 0;
    try {
      const aiResult = computeAIValue({
        locality: listingLocality,
        city: listingCity,
        builder: builderName || undefined,
        project: projectName || undefined,
        area: carpetAreaNum > 0 ? carpetAreaNum : builtUpAreaNum || 1000,
        floor: floorNum,
        isTopFloor: floorCategory === "top",
        propertyType: propertyType || "apartment",
        bhk: bhk || 2,
        sellerPrice: priceNum || undefined,
        facing: facing || undefined,
        amenities: amenities,
        parking: (coveredParking || 0) + (openParking || 0),
      });
      aiLower = aiResult.lower;
      aiUpper = aiResult.upper;
      aiMedian = aiResult.median;
      console.log("[ValuBrix DEBUG] AI computed at listing time:", {
        listingId: undefined, // set below
        inputs: {
          locality: listingLocality,
          builder: builderName,
          area: carpetAreaNum,
          floor: floorNum,
          propertyType,
        },
        output: { aiLower, aiUpper, aiMedian },
      });
    } catch (aiErr) {
      console.error("[ValuBrix] AI valuation failed at listing time:", aiErr);
    }

    const listingId = `user_${Date.now()}`;
    console.log(
      "[ValuBrix DEBUG] Saving listing",
      listingId,
      "with aiLower:",
      aiLower,
      "aiUpper:",
      aiUpper,
      "aiMedian:",
      aiMedian,
    );

    const newListing = {
      id: listingId,
      title: `${bhk ? `${bhk} BHK ` : ""}${propertyType ? propertyType.charAt(0).toUpperCase() + propertyType.slice(1) : "Property"}${listingType === "rent" ? " for Rent" : ""} in ${listingLocality}`,
      locality: listingLocality,
      city: listingCity,
      price:
        priceNum > 0
          ? priceNum >= 10000000
            ? `₹${(priceNum / 10000000).toFixed(2)} Cr`
            : priceNum >= 100000
              ? `₹${(priceNum / 100000).toFixed(0)} L`
              : `₹${priceNum}`
          : "₹0",
      priceRaw: priceNum,
      sellerPrice: priceNum,
      area: carpetArea ? `${carpetArea} sq ft` : "",
      carpetArea: carpetAreaNum,
      superBuiltUpArea: builtUpAreaNum,
      builtUpArea: builtUpAreaNum,
      images: imagesToStore,
      type: propertyType
        ? propertyType.charAt(0).toUpperCase() + propertyType.slice(1)
        : "Property",
      propertyType: propertyType || "apartment",
      status: "Active",
      views: 0,
      saves: 0,
      leads_count: 0,
      visit_count: 0,
      sellerId:
        (user?.mobile || user?.email || user?.username || "").trim() ||
        "unknown",
      sellerName: user?.fullName || user?.username || "Seller",
      bhk: bhk,
      bathrooms: bathrooms,
      balconies: balconies,
      createdAt: Date.now(),
      amenities: amenities,
      // All attributes that buyer portal must display
      facing: facing || null,
      coveredParking: coveredParking,
      openParking: openParking,
      floorNumber: floorNum,
      totalFloors: Number(totalFloors) || null,
      floorCategory: floorCategory,
      builder: builderName || null,
      builderName: builderName || null,
      project: projectName || null,
      projectName: projectName || null,
      buildingAge: buildingAge || null,
      legalStatus: legalStatus || null,
      landUse: landUse || null,
      // Structured location fields from reverse geocoding
      pincode: listingPincode || null,
      microLocation: listingMicroLocation || null,
      lat: listingLat,
      lng: listingLng,
      // Listing type + rent-specific fields
      listingType: listingType || "sale",
      rent: listingType === "rent" ? Number(rent) || 0 : 0,
      deposit: listingType === "rent" ? Number(deposit) || 0 : 0,
      leaseDuration: listingType === "rent" ? leaseDuration || "" : "",
      furnishedStatus: listingType === "rent" ? furnishedStatus || "" : "",
      // AI valuation stored once at listing time
      aiLower,
      aiUpper,
      aiMedian,
    };
    try {
      const existing = JSON.parse(
        localStorage.getItem("valubrix_user_listings") || "[]",
      );
      existing.unshift(newListing);
      localStorage.setItem("valubrix_user_listings", JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent("valubrix:listings-updated"));
    } catch (err) {
      console.error("Failed to save listing", err);
      return;
    }
    setPublished(true);
    setTimeout(() => navigate({ to: "/seller/listings" }), 2000);
  };

  if (!user) return null;

  if (published) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0F1F] to-[#121B35] flex items-center justify-center">
        <GlobalNav />
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <Check size={36} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Listing Published!</h2>
          <p className="text-white/50 mt-2">
            Your property is now live on ValuBrix
          </p>
          <p className="text-white/30 text-sm mt-1">
            Redirecting to Seller Portal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1F] to-[#121B35]">
      <GlobalNav />
      {/* Geo-detect confirmation modal — shown after pin drop */}
      {geoConfirm && (
        <LocationConfirmModal
          result={geoConfirm}
          onConfirm={(geo) => {
            updateLocation({
              name: geo.locality,
              city: geo.city,
              lat: geo.lat,
              lng: geo.lng,
              pincode: geo.pincode,
              microLocation: geo.microLocation,
              zone: geo.zone,
              parentArea: geo.parentArea,
            });
            setCityState(geo.city);
            setGeoConfirm(null);
          }}
          onChange={() => {
            // Dismiss modal and let user type manually
            setGeoConfirm(null);
          }}
          onClose={() => setGeoConfirm(null)}
        />
      )}
      <div className="pt-20 px-4 max-w-5xl mx-auto py-8">
        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0">
            {/* Progress */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-xl font-bold text-white">
                  List Your Property
                </h1>
                <span className="text-white/40 text-sm">
                  Step {step + 1} / {STEPS.length}
                </span>
              </div>
              <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${((step + 1) / STEPS.length) * 100}%`,
                    background:
                      "linear-gradient(90deg, #B8960C, #D4AF37, #F0D060)",
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[#D4AF37] text-sm font-semibold">
                  {STEPS[step]}
                </p>
                <p className="text-white/30 text-xs">
                  {Math.round(((step + 1) / STEPS.length) * 100)}% complete
                </p>
              </div>
            </div>

            {/* Step Content */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 min-h-[400px]">
              {/* STEP 0 — LISTING TYPE */}
              {step === 0 && (
                <div data-ocid="listing.wizard.step.1" className="space-y-6">
                  <div className="text-center mb-6">
                    <h2
                      className="text-2xl font-bold text-white mb-2"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      What are you listing?
                    </h2>
                    <p className="text-white/50 text-sm">
                      Select listing type to continue
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                    {(["sale", "rent"] as const).map((lt) => (
                      <button
                        key={lt}
                        type="button"
                        data-ocid={`listing.listing_type_${lt}.toggle`}
                        onClick={() => setListingType(lt)}
                        className="flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all duration-200"
                        style={{
                          background:
                            listingType === lt
                              ? "linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.08) 100%)"
                              : "rgba(255,255,255,0.04)",
                          borderColor:
                            listingType === lt
                              ? "#D4AF37"
                              : "rgba(255,255,255,0.1)",
                          transform:
                            listingType === lt ? "translateY(-2px)" : "none",
                          boxShadow:
                            listingType === lt
                              ? "0 4px 20px rgba(212,175,55,0.25)"
                              : "none",
                        }}
                      >
                        <span className="text-4xl">
                          {lt === "sale" ? "🏠" : "🔑"}
                        </span>
                        <div className="text-center">
                          <p
                            className="font-bold text-lg"
                            style={{
                              color: listingType === lt ? "#D4AF37" : "#ffffff",
                            }}
                          >
                            {lt === "sale" ? "Sale" : "Rent"}
                          </p>
                          <p className="text-white/40 text-xs mt-1">
                            {lt === "sale"
                              ? "List for purchase"
                              : "List for rental"}
                          </p>
                        </div>
                        {listingType === lt && (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ background: "#D4AF37" }}
                          >
                            <Check size={14} className="text-black" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 1 — BASIC DETAILS (was step 0) */}
              {step === 1 && (
                <div data-ocid="listing.wizard.step.2" className="space-y-6">
                  <div>
                    <p className="text-white/60 text-xs font-medium block mb-2 uppercase tracking-wide">
                      Seller Type
                    </p>
                    <PillSelector
                      options={["Owner", "Builder", "Agent"]}
                      value={sellerType}
                      onChange={(v: string) => {
                        setSellerType(v.toLowerCase() as SellerType);
                        setErrors((prev) => ({ ...prev, sellerType: "" }));
                      }}
                    />
                    {errors.sellerType && (
                      <p
                        className="text-red-400 text-xs mt-1"
                        data-ocid="listing.seller_type.error_state"
                      >
                        {errors.sellerType}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-white/60 text-xs font-medium block mb-2 uppercase tracking-wide">
                      Property Type
                    </p>
                    <PillSelector
                      options={["Flat", "Villa", "Plot"]}
                      value={propertyType}
                      onChange={(v: string) =>
                        setPropertyType(v.toLowerCase() as PropertyType)
                      }
                    />
                  </div>
                  <div>
                    <p className="text-white/60 text-xs font-medium block mb-2 uppercase tracking-wide">
                      Location
                    </p>
                    <SmartLocationSearch
                      placeholder="Enter city or locality..."
                      onSelect={(loc: LocationRecord) => {
                        // Use coordinates from bangaloreMicroLocations via localReverseGeocode dataset
                        // The loc object may already have lat/lng from locationData; fall back to Bangalore centre
                        const locLat = (loc as any).lat ?? 12.9716;
                        const locLng = (loc as any).lng ?? 77.5946;
                        // Resolve full structured data for this locality
                        const geo = reverseGeocodeLocally(locLat, locLng);
                        updateLocation({
                          name: loc.name,
                          city: loc.city || "Bangalore",
                          lat: geo.lat,
                          lng: geo.lng,
                          pincode: geo.pincode,
                          microLocation: geo.microLocation,
                          zone: geo.zone,
                          parentArea: geo.parentArea,
                        });
                      }}
                      className="w-full"
                    />
                    {errors.location && (
                      <p
                        className="text-red-400 text-xs mt-1"
                        data-ocid="listing.location.error_state"
                      >
                        {errors.location}
                      </p>
                    )}
                    {/* Map Pin Placement */}
                    <div className="mt-4">
                      <p className="text-white/60 text-xs font-medium block mb-2 uppercase tracking-wide">
                        Pin Location on Map{" "}
                        <span className="text-white/30 normal-case">
                          (click or drag)
                        </span>
                      </p>
                      <div
                        className="rounded-xl overflow-hidden border border-white/10"
                        style={{ height: 240 }}
                      >
                        <ListingMapPin
                          coords={pinCoords}
                          onChange={() => {}}
                          onDragEnd={(c) => {
                            // Use local reverse geocoding — no external API
                            const geo = reverseGeocodeLocally(c[0], c[1]);
                            // Always show confirmation modal after pin drop
                            setGeoConfirm(geo);
                          }}
                        />
                      </div>
                      <p className="text-white/40 text-xs mt-1.5">
                        Lat: {pinCoords[0].toFixed(4)}, Lng:{" "}
                        {pinCoords[1].toFixed(4)}
                      </p>
                      {locationObj && (
                        <p className="text-green-400/80 text-xs mt-1 flex items-center gap-1">
                          📍 <strong>{locationObj.name}</strong>
                          {locationObj.pincode ? (
                            <span className="text-white/40">
                              {" "}
                              &bull; {locationObj.pincode}
                            </span>
                          ) : null}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-white/60 text-xs font-medium block mb-2 uppercase tracking-wide">
                      City
                    </p>
                    <PillSelector
                      options={[
                        "Bangalore",
                        "Pune",
                        "Delhi",
                        "Mumbai",
                        "Hyderabad",
                      ]}
                      value={city}
                      onChange={setCityState}
                    />
                  </div>
                </div>
              )}

              {/* STEP 2 — STRUCTURE (was step 1) */}
              {step === 2 && (
                <div data-ocid="listing.wizard.step.3" className="space-y-6">
                  {propertyType !== "plot" ? (
                    <>
                      <div>
                        <p className="text-white/60 text-xs font-medium block mb-2 uppercase tracking-wide">
                          Year of Construction
                        </p>
                        <PillSelector
                          options={[
                            "0–3 yrs",
                            "3–7 yrs",
                            "7–10 yrs",
                            "10+ yrs",
                          ]}
                          value={buildingAge}
                          onChange={setBuildingAge}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Stepper
                          label="Total Floors"
                          value={totalFloors}
                          onChange={setTotalFloors}
                          min={1}
                        />
                        <Stepper
                          label="Floor of Unit"
                          value={floor}
                          onChange={setFloor}
                          min={0}
                          max={totalFloors}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-white/60 text-xs font-medium block mb-2">
                            Carpet Area (sqft) *
                          </p>
                          <input
                            type="number"
                            placeholder="e.g. 1200"
                            value={carpetArea}
                            onChange={(e) => setCarpetArea(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#D4AF37]"
                          />
                        </div>
                        <div>
                          <p className="text-white/60 text-xs font-medium block mb-2">
                            Super Built-up Area (sqft) *
                          </p>
                          <input
                            type="number"
                            placeholder="e.g. 1450"
                            value={builtUpArea}
                            onChange={(e) => setBuiltUpArea(e.target.value)}
                            className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#D4AF37] ${
                              builtUpError
                                ? "border-red-500"
                                : "border-white/10"
                            }`}
                          />
                          {builtUpError && (
                            <p className="text-red-400 text-xs mt-1">
                              {builtUpError}
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-white/60 text-xs font-medium block mb-2">
                          Plot Area *
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Area"
                            value={plotArea}
                            onChange={(e) => setPlotArea(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#D4AF37]"
                          />
                          <select
                            value={plotUnit}
                            onChange={(e) => setPlotUnit(e.target.value)}
                            className="border rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[#D4AF37]"
                            style={{
                              background: "#0F1825",
                              borderColor: "rgba(255,255,255,0.14)",
                              color: "#F4F7FF",
                            }}
                          >
                            {["sq ft", "sq yards", "acres", "guntas"].map(
                              (u) => (
                                <option
                                  key={u}
                                  value={u}
                                  className="bg-[#121B35]"
                                >
                                  {u}
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                      </div>
                      <div>
                        <p className="text-white/60 text-xs font-medium block mb-2 uppercase tracking-wide">
                          Land Use Type
                        </p>
                        <PillSelector
                          options={[
                            "Agricultural",
                            "Residential",
                            "Commercial",
                            "Industrial",
                          ]}
                          value={landUse}
                          onChange={setLandUse}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* STEP 3 — CONFIGURATION (was step 2) */}
              {step === 3 && (
                <div data-ocid="listing.wizard.step.4" className="space-y-6">
                  {propertyType === "plot" ? (
                    <div className="text-center py-8 text-white/50">
                      <p>No configuration needed for plot listings.</p>
                      <p className="text-sm mt-1">Click Next to continue.</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-white/60 text-xs font-medium block mb-2 uppercase tracking-wide">
                          BHK
                        </p>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4].map((b) => (
                            <button
                              type="button"
                              key={b}
                              onClick={() => setBhk(b)}
                              className={`w-14 h-12 rounded-xl font-bold border transition-all ${
                                bhk === b
                                  ? "bg-[#D4AF37] text-black border-[#D4AF37] scale-105"
                                  : "bg-white/5 text-white/70 border-white/10"
                              }`}
                            >
                              {b}
                              {b === 4 ? "+" : ""}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Stepper
                          label="Bathrooms"
                          value={bathrooms}
                          onChange={setBathrooms}
                          min={1}
                        />
                        <div>
                          <Stepper
                            label="Balconies"
                            value={balconies}
                            onChange={setBalconies}
                          />
                          {balconies >= 3 && (
                            <p className="text-[#D4AF37] text-xs mt-1 flex items-center gap-1">
                              <Check size={10} /> High Value Asset signal!
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Stepper
                            label="Covered Parking"
                            value={coveredParking}
                            onChange={setCoveredParking}
                          />
                          <p className="text-white/40 text-xs mt-1">
                            ₹3L–₹7L value each
                          </p>
                        </div>
                        <Stepper
                          label="Open Parking"
                          value={openParking}
                          onChange={setOpenParking}
                        />
                      </div>
                      <div>
                        <p className="text-white/60 text-xs font-medium block mb-2 uppercase tracking-wide">
                          Unit Facing
                        </p>
                        <PillSelector
                          options={[
                            "North",
                            "East",
                            "South",
                            "West",
                            "North East",
                            "North West",
                            "South East",
                            "South West",
                          ]}
                          value={facing}
                          onChange={setFacing}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* STEP 4 — PRICING & MEDIA (was step 3) */}
              {step === 4 && (
                <div data-ocid="listing.wizard.step.5" className="space-y-6">
                  {/* AI Valuation Preview */}
                  <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-5">
                    <p className="text-[#D4AF37] text-xs font-medium uppercase tracking-wide mb-1">
                      AI Estimated Market Value
                    </p>
                    {aiLoading ? (
                      <p className="text-white/60 text-sm italic">
                        Computing valuation…
                      </p>
                    ) : aiPreview && aiPreview.lower > 0 ? (
                      <>
                        <p className="text-white font-bold text-2xl font-mono">
                          {formatPrice(aiPreview.lower)} –{" "}
                          {formatPrice(aiPreview.upper)}
                        </p>
                        <p className="text-white/40 text-xs mt-1">
                          Includes floor · facing · amenities adjustments
                        </p>
                      </>
                    ) : (
                      <p className="text-white/60 text-sm italic">
                        Complete floor, facing &amp; amenities for AI valuation
                      </p>
                    )}
                  </div>

                  {/* Listing Price — Sale Only */}
                  {listingType === "sale" && (
                    <div>
                      <p className="text-white/60 text-xs font-medium block mb-2">
                        Your Listing Price (₹)
                      </p>
                      <input
                        type="number"
                        placeholder="Enter your listing price"
                        value={listingPrice}
                        onChange={(e) => setListingPrice(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#D4AF37]"
                      />
                      {priceWarning && (
                        <div className="mt-2 flex items-start gap-2 bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
                          <AlertTriangle
                            size={14}
                            className="text-orange-400 mt-0.5 flex-shrink-0"
                          />
                          <div>
                            <p className="text-orange-300 text-xs font-medium">
                              Your listing price is above market range.
                            </p>
                            <p className="text-orange-400/70 text-xs">
                              Recommended:{" "}
                              {aiPreview
                                ? `${formatPrice(aiPreview.lower)} – ${formatPrice(aiPreview.upper)}`
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rent-specific fields — Rent Only */}
                  {listingType === "rent" && (
                    <div className="space-y-4">
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-2">
                        <p className="text-blue-300 text-xs font-medium flex items-center gap-1">
                          🔑 Rental Listing — Fill rent details below
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-white/60 text-xs font-medium block mb-2">
                            Monthly Rent (₹/month) *
                          </p>
                          <input
                            type="number"
                            placeholder="e.g. 35000"
                            value={rent}
                            onChange={(e) => setRent(e.target.value)}
                            data-ocid="listing.rent.input"
                            className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#D4AF37] ${errors.rent ? "border-red-500" : "border-white/10"}`}
                          />
                          {errors.rent && (
                            <p
                              className="text-red-400 text-xs mt-1"
                              data-ocid="listing.rent.error_state"
                            >
                              {errors.rent}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-white/60 text-xs font-medium block mb-2">
                            Security Deposit (₹)
                          </p>
                          <input
                            type="number"
                            placeholder="e.g. 100000"
                            value={deposit}
                            onChange={(e) => setDeposit(e.target.value)}
                            data-ocid="listing.deposit.input"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#D4AF37]"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-white/60 text-xs font-medium block mb-2 uppercase tracking-wide">
                            Lease Duration
                          </p>
                          <select
                            value={leaseDuration}
                            onChange={(e) => setLeaseDuration(e.target.value)}
                            data-ocid="listing.lease_duration.select"
                            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D4AF37]"
                            style={{
                              background: "#0F1825",
                              borderColor: "rgba(255,255,255,0.14)",
                              color: leaseDuration
                                ? "#F4F7FF"
                                : "rgba(244,247,255,0.45)",
                            }}
                          >
                            <option value="">Select duration</option>
                            <option value="11 months">11 Months</option>
                            <option value="1 year">1 Year</option>
                            <option value="2 years">2 Years</option>
                            <option value="long term">Long Term</option>
                          </select>
                        </div>
                        <div>
                          <p className="text-white/60 text-xs font-medium block mb-2 uppercase tracking-wide">
                            Furnished Status
                          </p>
                          <PillSelector
                            options={[
                              "Unfurnished",
                              "Semi-Furnished",
                              "Furnished",
                            ]}
                            value={furnishedStatus}
                            onChange={setFurnishedStatus}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Legal Status */}
                  {city === "Bangalore" && (
                    <div>
                      <p className="text-white/60 text-xs font-medium block mb-2 uppercase tracking-wide">
                        Legal Status (Bangalore)
                      </p>
                      <PillSelector
                        options={["A Khata", "B Khata"]}
                        value={legalStatus}
                        onChange={setLegalStatus}
                      />
                    </div>
                  )}
                  {city === "Pune" && (
                    <div>
                      <p className="text-white/60 text-xs font-medium block mb-2 uppercase tracking-wide">
                        Legal Status (Pune)
                      </p>
                      <PillSelector
                        options={[
                          "MAHARERA Registered",
                          "7/12 Extract Available",
                        ]}
                        value={legalStatus}
                        onChange={setLegalStatus}
                        multi
                      />
                    </div>
                  )}
                  {city === "Delhi" && (
                    <div>
                      <p className="text-white/60 text-xs font-medium block mb-2 uppercase tracking-wide">
                        Legal Status (Delhi)
                      </p>
                      <PillSelector
                        options={["Freehold", "Leasehold"]}
                        value={legalStatus}
                        onChange={setLegalStatus}
                      />
                    </div>
                  )}

                  {/* Optional fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-white/60 text-xs font-medium block mb-2">
                        Builder Name (Optional)
                      </p>
                      <select
                        value={builderName}
                        onChange={(e) => {
                          setBuilderName(e.target.value);
                          setProjectName("");
                        }}
                        className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#D4AF37]"
                        style={{
                          background: "#0F1825",
                          borderColor: "rgba(255,255,255,0.14)",
                          color: builderName
                            ? "#F4F7FF"
                            : "rgba(244,247,255,0.45)",
                        }}
                      >
                        <option value="">Select builder (optional)</option>
                        {filterBuildersByLocality(locality).map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="text-white/60 text-xs font-medium block mb-2">
                        Project Name (Optional)
                      </p>
                      <ProjectLinkedDropdown
                        locality={locality}
                        builder={builderName}
                        value={projectName}
                        onChange={(pName, bName) => {
                          setProjectName(pName);
                          if (bName && !builderName) setBuilderName(bName);
                        }}
                        placeholder="Select project (optional)"
                      />
                    </div>
                  </div>

                  {/* Amenities */}
                  <div>
                    <p className="text-white/60 text-xs font-medium block mb-2 uppercase tracking-wide">
                      Amenities
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {AMENITY_OPTIONS.map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => toggleAmenity(a)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            amenities.includes(a)
                              ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]"
                              : "bg-white/5 border-white/10 text-white/60 hover:border-white/30"
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Media Upload */}
                  <div>
                    <p className="text-white/60 text-xs font-medium block mb-2 uppercase tracking-wide">
                      Property Photos / Videos *
                    </p>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setMediaDrag(true);
                      }}
                      onDragLeave={() => setMediaDrag(false)}
                      onDrop={handleMediaDrop}
                      onClick={() => mediaRef.current?.click()}
                      onKeyDown={(e) =>
                        e.key === "Enter" && mediaRef.current?.click()
                      }
                      // biome-ignore lint/a11y/useSemanticElements: drag-drop zone
                      role="button"
                      tabIndex={0}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                        mediaDrag
                          ? "border-[#D4AF37] bg-[#D4AF37]/10"
                          : "border-white/20 hover:border-[#D4AF37]/40"
                      }`}
                    >
                      <Upload
                        size={24}
                        className="mx-auto text-white/40 mb-2"
                      />
                      <p className="text-white/50 text-sm">
                        Drag & drop or click to upload photos
                      </p>
                      <p className="text-white/25 text-xs mt-1">
                        Minimum 1 photo required
                      </p>
                    </div>
                    <input
                      ref={mediaRef}
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setMediaFiles((prev) => [...prev, ...files]);
                        setMediaError("");
                      }}
                    />
                    {mediaError && (
                      <p className="text-red-400 text-xs mt-1">{mediaError}</p>
                    )}
                    {mediaFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {mediaFiles.map((f, i) => (
                          <div
                            key={`media-${i}-${f.name}`}
                            className="relative"
                          >
                            <div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center text-white/40 text-xs overflow-hidden">
                              {f.type.startsWith("image") ? (
                                <img
                                  src={URL.createObjectURL(f)}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>Video</span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setMediaFiles((prev) =>
                                  prev.filter((_, j) => j !== i),
                                )
                              }
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 5 — REVIEW & PUBLISH */}
              {step === 5 && (
                <div data-ocid="listing.wizard.step.6" className="space-y-4">
                  <h2 className="text-white font-semibold">
                    Review Your Listing
                  </h2>

                  {badges.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {badges.map((b) => (
                        <span
                          key={b}
                          className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 text-xs px-3 py-1 rounded-full font-medium"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Property Type", value: propertyType },
                      {
                        label: "Location",
                        value: `${location || "–"}, ${city || "–"}`,
                      },
                      { label: "Seller Type", value: sellerType },
                      ...(propertyType !== "plot"
                        ? [
                            { label: "BHK", value: `${bhk} BHK` },
                            {
                              label: "Carpet Area",
                              value: `${carpetArea || "–"} sqft`,
                            },
                            {
                              label: "Floor",
                              value: `${floor} / ${totalFloors}`,
                            },
                            { label: "Facing", value: facing || "–" },
                            {
                              label: "Covered Parking",
                              value: String(coveredParking),
                            },
                            { label: "Balconies", value: String(balconies) },
                          ]
                        : [
                            {
                              label: "Plot Area",
                              value: `${plotArea || "–"} ${plotUnit}`,
                            },
                            { label: "Land Use", value: landUse || "–" },
                          ]),
                      { label: "Legal Status", value: legalStatus || "–" },
                      ...(listingType === "sale"
                        ? [
                            {
                              label: "Listing Price",
                              value: listingPrice
                                ? formatPrice(Number(listingPrice))
                                : "–",
                            },
                          ]
                        : [
                            {
                              label: "Monthly Rent",
                              value: rent
                                ? `₹${Number(rent).toLocaleString("en-IN")}/mo`
                                : "–",
                            },
                            {
                              label: "Deposit",
                              value: deposit
                                ? formatPrice(Number(deposit))
                                : "–",
                            },
                            {
                              label: "Furnished",
                              value: furnishedStatus || "–",
                            },
                          ]),
                      {
                        label: "AI Estimate",
                        value:
                          aiPreview && aiPreview.lower > 0
                            ? `${formatPrice(aiPreview.lower)} – ${formatPrice(aiPreview.upper)}`
                            : "–",
                      },
                      {
                        label: "Photos",
                        value: `${mediaFiles.length} uploaded`,
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="bg-white/5 rounded-xl p-3"
                      >
                        <p className="text-white/40 text-xs">{row.label}</p>
                        <p className="text-white text-sm font-medium mt-0.5 capitalize">
                          {row.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {builderName && (
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-white/40 text-xs">Builder</p>
                      <p className="text-white text-sm font-medium mt-0.5">
                        {builderName}
                        {projectName ? ` – ${projectName}` : ""}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div
              className="flex items-center justify-between mt-6"
              data-ocid="listing.navigation.panel"
            >
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 0}
                data-ocid="listing.wizard.secondary_button"
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-all disabled:opacity-30"
              >
                <ChevronLeft size={16} /> Previous
              </button>

              {step < 5 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  data-ocid="listing.wizard.primary_button"
                  className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#B8960C] text-black font-semibold px-6 py-3 rounded-xl transition-all"
                >
                  Next <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  data-ocid="listing.publish.primary_button"
                  onClick={handlePublish}
                  className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#B8960C] text-black font-bold px-8 py-3 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                >
                  <Check size={16} /> Publish Listing
                </button>
              )}
            </div>
          </div>
          {/* end form flex-1 */}

          {/* Live Preview Panel */}
          <div className="hidden md:block w-72 flex-shrink-0 sticky top-24 self-start">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-[#D4AF37] text-xs font-semibold uppercase tracking-wider mb-4">
                Live Preview
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {propertyType === "flat"
                      ? "🏢"
                      : propertyType === "villa"
                        ? "🏡"
                        : "🌳"}
                  </span>
                  <span className="text-white font-medium capitalize">
                    {propertyType || "Property Type"}
                  </span>
                </div>
                {location && (
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-white/40 text-[10px] uppercase">
                      Location
                    </p>
                    <p className="text-white text-sm font-medium">
                      {location}
                      {city ? `, ${city}` : ""}
                    </p>
                  </div>
                )}
                {listingPrice && (
                  <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl p-3">
                    <p className="text-white/40 text-[10px] uppercase">Price</p>
                    <p className="text-[#D4AF37] text-lg font-bold">
                      {Number(listingPrice) >= 10000000
                        ? `₹${(Number(listingPrice) / 10000000).toFixed(2)} Cr`
                        : `₹${(Number(listingPrice) / 100000).toFixed(0)} L`}
                    </p>
                  </div>
                )}
                {(bhk > 0 || carpetArea) && (
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-white/40 text-[10px] uppercase">
                      Details
                    </p>
                    <p className="text-white text-sm">
                      {bhk} BHK{carpetArea ? `, ${carpetArea} sqft` : ""}
                    </p>
                  </div>
                )}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                  <p className="text-blue-300 text-[10px] font-medium">
                    🤖 AI Valuation
                  </p>
                  <p className="text-white/50 text-xs mt-1">
                    AI valuation will appear after submission
                  </p>
                </div>
                {sellerType && (
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-white/40 text-[10px] uppercase">
                      Seller
                    </p>
                    <p className="text-white text-sm capitalize">
                      {sellerType}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* end flex gap-6 */}
      </div>
    </div>
  );
}
