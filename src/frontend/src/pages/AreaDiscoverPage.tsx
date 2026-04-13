// AreaDiscoverPage.tsx — Location IQ (Area Intelligence) multi-step discover flow
// Step 1: Full-screen map + floating form card (same pattern as Buy/Rent/Sell)
// Step 2: Property Type filter (optional)
// On submit → navigates to /area/intelligence with locality data as search params
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Home, MapPin, Navigation, X } from "lucide-react";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import AnalyzingOverlay from "../components/AnalyzingOverlay";
import GlobalMapComponent from "../components/GlobalMapComponent";
import LocationSelectMap from "../components/LocationSelectMap";
import type { LocationSelectResult } from "../components/LocationSelectMap";
import SmartLocationSearch from "../components/SmartLocationSearch";
import PropertyTypeStep from "../components/steps/PropertyTypeStep";
import type { PropertyTypeData } from "../components/steps/types";
import { ALL_LOCALITY_COORDS, getCoords } from "../data/localityCoords";
import type { LocationRecord } from "../data/locationData";

const PAGE_TITLE = "Location IQ";
const PAGE_SUBTITLE = "Area Intelligence";
const ACCENT = "#D8B56A";
const NAVY = "#071A2F";

const CITIES = ["Bangalore", "Pune", "Delhi", "Mumbai", "Hyderabad"];

const glass = {
  background: "rgba(7,26,47,0.94)",
  border: "1px solid rgba(216,181,106,0.22)",
  backdropFilter: "blur(24px)",
  boxShadow: "0 24px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)",
} as const;

const goldBtn = {
  background: "linear-gradient(135deg, #C9A84C 0%, #D4AF37 60%, #E8C97A 100%)",
  color: NAVY,
  boxShadow: "0 4px 24px rgba(212,175,55,0.35)",
} as const;

export default function AreaDiscoverPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  // Step 1 state
  const [city, setCity] = useState("Bangalore");
  const [selectedLocation, setSelectedLocation] =
    useState<LocationRecord | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    12.9716, 77.5946,
  ]);

  const [showOverlay, setShowOverlay] = useState(false);
  const [pendingNavParams, setPendingNavParams] = useState<Record<
    string,
    string
  > | null>(null);

  // ── Map pin modal state ────────────────────────────────────────────────────
  const [mapPinModalOpen, setMapPinModalOpen] = useState(false);
  const [pendingMapPin, setPendingMapPin] = useState<{
    lat: number;
    lng: number;
    localityName: string;
    displayAddress: string;
  } | null>(null);

  const handleCityChange = useCallback(
    (newCity: string) => {
      if (newCity === city) return;
      setCity(newCity);
      setSelectedLocation(null);
      const CITY_CENTERS: Record<string, [number, number]> = {
        Bangalore: [12.9716, 77.5946],
        Pune: [18.5204, 73.8567],
        Hyderabad: [17.385, 78.4867],
        Mumbai: [19.076, 72.8777],
        Delhi: [28.6139, 77.209],
      };
      setMapCenter(CITY_CENTERS[newCity] ?? [12.9716, 77.5946]);
    },
    [city],
  );

  function buildNavParams(propertyType?: string): Record<string, string> {
    const locality = selectedLocation?.name ?? "";
    const params: Record<string, string> = { locality, city };
    if (propertyType) params.propertyType = propertyType;
    // Always pass lat/lng if we have a real location (selected or map pin)
    if (mapCenter[0] !== 12.9716 || mapCenter[1] !== 77.5946) {
      params.lat = String(mapCenter[0]);
      params.lng = String(mapCenter[1]);
    } else if (selectedLocation) {
      // FIX: Use getCoords() with fuzzy match for better coverage (covers all 500+ localities)
      const fuzzyCoords = getCoords(selectedLocation.name);
      if (fuzzyCoords) {
        params.lat = String(fuzzyCoords.lat);
        params.lng = String(fuzzyCoords.lng);
      } else {
        // Exact key fallback
        const key = selectedLocation.name.toLowerCase().trim();
        const direct = ALL_LOCALITY_COORDS[key];
        if (direct) {
          params.lat = String(direct.lat);
          params.lng = String(direct.lng);
        }
        // Partial match fallback
        else {
          const partialMatch = Object.entries(ALL_LOCALITY_COORDS).find(
            ([k]) => k.includes(key) || key.includes(k),
          );
          if (partialMatch) {
            params.lat = String(partialMatch[1].lat);
            params.lng = String(partialMatch[1].lng);
          }
        }
      }
    }
    return params;
  }

  function handleLocationNext() {
    if (
      !selectedLocation &&
      mapCenter[0] === 12.9716 &&
      mapCenter[1] === 77.5946
    )
      return;
    setStep(2);
  }

  function handlePropertyTypeNext(data: PropertyTypeData) {
    const params = buildNavParams(data.propertyType);
    setPendingNavParams(params);
    setShowOverlay(true);
  }

  function handleSkipPropertyType() {
    const params = buildNavParams();
    setPendingNavParams(params);
    setShowOverlay(true);
  }

  function handleOverlayComplete() {
    setShowOverlay(false);
    if (pendingNavParams) {
      void navigate({ to: "/area/intelligence", search: pendingNavParams });
    }
  }

  const isStep1Valid =
    city.trim().length > 0 &&
    (selectedLocation !== null ||
      mapCenter[0] !== 12.9716 ||
      mapCenter[1] !== 77.5946);

  // ── STEP 2: Property Type — standard card layout ──────────────────────────
  if (step === 2) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, #0D2845 50%, #0A2040 100%)`,
        }}
      >
        <AnalyzingOverlay
          isVisible={showOverlay}
          module="area"
          dataReady={true}
          onComplete={handleOverlayComplete}
        />
        {/* Header */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 md:px-8"
          style={{
            background: "rgba(7,26,47,0.85)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(216,181,106,0.15)",
          }}
        >
          <button
            type="button"
            onClick={() => void navigate({ to: "/" })}
            className="flex items-center gap-2 transition-opacity duration-200 hover:opacity-70"
            data-ocid="area_discover.home_link"
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <Home size={18} style={{ color: ACCENT }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
              Home
            </span>
          </button>
          <div className="text-center">
            <p
              className="font-bold tracking-wide"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: "#F4F7FF",
                fontSize: 17,
              }}
            >
              {PAGE_TITLE}
            </p>
            <p
              style={{
                fontSize: 11,
                color: ACCENT,
                fontWeight: 600,
                letterSpacing: "0.06em",
              }}
            >
              {PAGE_SUBTITLE}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex items-center gap-1.5 transition-opacity duration-200 hover:opacity-70"
            data-ocid="area_discover.back_button"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.5)",
              fontSize: 13,
            }}
          >
            <ArrowLeft size={15} /> Back
          </button>
        </header>

        <main className="flex-1 flex flex-col items-center px-4 py-8 md:px-8 md:py-12">
          <div className="w-full max-w-xl">
            {/* Step pills */}
            <div className="flex items-center gap-2 mb-6">
              {[
                { id: 1, label: "Location" },
                { id: 2, label: "Property Type" },
              ].map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 flex-1">
                  <div
                    className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
                    style={{
                      background: s.id < 2 ? "rgba(216,181,106,0.3)" : ACCENT,
                      color: s.id < 2 ? ACCENT : NAVY,
                      border: `1px solid ${ACCENT}50`,
                    }}
                  >
                    {s.id < 2 ? "✓" : s.id}
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{
                      color:
                        s.id <= 2
                          ? "rgba(255,255,255,0.8)"
                          : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {s.label}
                  </span>
                  {i < 1 && (
                    <div
                      className="flex-1 h-px"
                      style={{ background: `${ACCENT}50` }}
                    />
                  )}
                </div>
              ))}
            </div>

            <div
              className="rounded-3xl p-5 md:p-7"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(216,181,106,0.15)",
                backdropFilter: "blur(16px)",
                boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
              }}
            >
              <PropertyTypeStep
                onNext={handlePropertyTypeNext}
                onBack={() => setStep(1)}
                initialData={undefined}
                allowedTypes={["apartment", "villa", "plot"]}
                nextLabel="View Area Intelligence"
              />
              <button
                type="button"
                onClick={handleSkipPropertyType}
                data-ocid="area_discover.skip_property_type"
                className="mt-3 w-full text-center text-sm py-2 transition-colors hover:opacity-80"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Select property type to view area intelligence
              </button>
            </div>

            <p className="text-center text-white/25 text-xs mt-4">
              Location IQ analyses area-level intelligence only — not individual
              property valuation
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ── STEP 1: Full-screen map + floating form card ──────────────────────────
  return (
    <>
      <AnalyzingOverlay
        isVisible={showOverlay}
        module="area"
        dataReady={true}
        onComplete={handleOverlayComplete}
      />

      {/* Full-screen map — fixed, fills entire viewport */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background: "#0A0F1E",
        }}
      >
        <GlobalMapComponent
          mode="area-intelligence"
          city={city}
          center={mapCenter}
          zoom={11}
          height="100%"
          showLayerToggle={false}
          hideLevelSelector={true}
          hideInfraPanel={true}
          hideInfraLegend={true}
          hideSmartPinsLegend={true}
          hideClickHint={false}
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

      {/* Header — fixed at top */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          background: "rgba(7,26,47,0.88)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(216,181,106,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
        }}
      >
        <button
          type="button"
          onClick={() => void navigate({ to: "/" })}
          className="flex items-center gap-2 transition-opacity duration-200 hover:opacity-70"
          data-ocid="area_discover.home_link"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <Home size={18} style={{ color: ACCENT }} />
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
            Home
          </span>
        </button>
        <div className="text-center">
          <p
            className="font-bold tracking-wide"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "#F4F7FF",
              fontSize: 17,
            }}
          >
            {PAGE_TITLE}
          </p>
          <p
            style={{
              fontSize: 11,
              color: ACCENT,
              fontWeight: 600,
              letterSpacing: "0.06em",
            }}
          >
            {PAGE_SUBTITLE}
          </p>
        </div>
        <div style={{ width: 60 }} />
      </header>

      {/* Floating form card — position:fixed, top-right, does NOT push map */}
      <div
        style={{
          position: "fixed",
          top: 72,
          left: 16,
          zIndex: 20,
          width: "100%",
          maxWidth: 400,
          maxHeight: "calc(100vh - 88px)",
          overflowY: "auto",
        }}
      >
        <div className="rounded-3xl p-5" style={glass}>
          {/* Step pills */}
          <div className="flex items-center gap-2 mb-5">
            {[
              { id: 1, label: "Location" },
              { id: 2, label: "Property Type" },
            ].map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div
                  className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                  style={{
                    background:
                      step >= s.id ? ACCENT : "rgba(255,255,255,0.08)",
                    color: step >= s.id ? NAVY : "rgba(255,255,255,0.4)",
                    border:
                      step >= s.id
                        ? `1px solid ${ACCENT}50`
                        : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {s.id}
                </div>
                <span
                  className="text-xs font-medium"
                  style={{
                    color:
                      step >= s.id
                        ? "rgba(255,255,255,0.8)"
                        : "rgba(255,255,255,0.3)",
                  }}
                >
                  {s.label}
                </span>
                {i < 1 && (
                  <div
                    className="flex-1 h-px"
                    style={{
                      background:
                        step > s.id ? `${ACCENT}50` : "rgba(255,255,255,0.08)",
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Heading */}
          <h2
            className="font-bold text-white mb-1"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: 20 }}
          >
            Where are you looking?
          </h2>
          <p
            style={{
              color: "rgba(185,198,216,0.65)",
              fontSize: 13,
              marginBottom: 18,
            }}
          >
            Select city and locality — or click the map to pin a location
          </p>

          {/* City selector */}
          <div className="mb-4">
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: `${ACCENT}CC`,
                marginBottom: 8,
              }}
            >
              City
            </p>
            <div className="flex flex-wrap gap-2">
              {CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleCityChange(c)}
                  data-ocid={`area_discover.city.${c.toLowerCase()}`}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
                  style={{
                    background:
                      city === c
                        ? "rgba(216,181,106,0.18)"
                        : "rgba(255,255,255,0.05)",
                    border:
                      city === c
                        ? `1px solid ${ACCENT}55`
                        : "1px solid rgba(255,255,255,0.1)",
                    color: city === c ? ACCENT : "rgba(255,255,255,0.6)",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Locality search */}
          <div className="mb-4">
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: `${ACCENT}CC`,
                marginBottom: 8,
              }}
            >
              Locality / Area
            </p>
            <SmartLocationSearch
              placeholder="Search locality, area or pincode"
              city={city}
              onSelect={(loc) => {
                setSelectedLocation(loc);
                // FIX: Use getCoords() with fuzzy match for better coverage
                const fuzzyCoords = getCoords(loc.name);
                if (fuzzyCoords) {
                  setMapCenter([fuzzyCoords.lat, fuzzyCoords.lng]);
                } else {
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
                }
              }}
              initialLocation={selectedLocation ?? undefined}
            />
          </div>

          {/* Selected location chip */}
          {selectedLocation && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4"
              style={{
                background: "rgba(216,181,106,0.08)",
                border: "1px solid rgba(216,181,106,0.25)",
              }}
            >
              <Navigation size={13} style={{ color: ACCENT, flexShrink: 0 }} />
              <span
                style={{
                  fontSize: 13,
                  color: "#F4F7FF",
                  fontWeight: 600,
                  flex: 1,
                }}
              >
                {selectedLocation.name}, {city}
              </span>
              <button
                type="button"
                onClick={() => setSelectedLocation(null)}
                style={{
                  color: "rgba(255,255,255,0.4)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* Map hint / Pin button */}
          {!selectedLocation ? (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => {
                  setPendingMapPin(null);
                  setMapPinModalOpen(true);
                }}
                data-ocid="area_discover.map_pin_button"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px dashed rgba(216,181,106,0.4)",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "rgba(59,130,246,0.15)",
                    border: "1px solid rgba(59,130,246,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <MapPin size={13} style={{ color: "#3B82F6" }} />
                </span>
                <div className="flex-1 text-left">
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.85)",
                      lineHeight: 1.3,
                    }}
                  >
                    📍 Pin location on map
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.4)",
                      marginTop: 1,
                    }}
                  >
                    Open full-screen map to drop a pin
                  </p>
                </div>
              </button>
            </div>
          ) : null}

          {/* Next button */}
          <button
            type="button"
            onClick={handleLocationNext}
            data-ocid="area_discover.step1.next"
            className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={
              isStep1Valid
                ? goldBtn
                : {
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.3)",
                  }
            }
            disabled={!isStep1Valid}
          >
            Next: Property Type →
          </button>
        </div>
      </div>

      {/* ── Map Pin Modal — portal to escape stacking context ────────────── */}
      {mapPinModalOpen &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999999,
              display: "flex",
              flexDirection: "column",
              background: "rgba(4,14,28,0.94)",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setMapPinModalOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setMapPinModalOpen(false);
            }}
            // biome-ignore lint/a11y/useSemanticElements: modal backdrop
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            data-ocid="area_discover.map_pin_modal"
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                height: "100%",
                maxWidth: 860,
                margin: "0 auto",
                background: "#071A2F",
                boxShadow: "0 8px 48px rgba(0,0,0,0.8)",
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  background: "rgba(7,26,47,1)",
                  borderBottom: "1px solid rgba(216,181,106,0.2)",
                  padding: "14px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <MapPin size={18} style={{ color: "#D8B56A" }} />
                  <div>
                    <p
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontWeight: 700,
                        fontSize: 16,
                        color: "#F4F7FF",
                        lineHeight: 1.2,
                      }}
                    >
                      Pin Your Exact Location
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "rgba(185,198,216,0.6)",
                        marginTop: 2,
                      }}
                    >
                      {city} · Tap anywhere on the map to drop a pin
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMapPinModalOpen(false)}
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 8,
                    padding: "6px 14px",
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 13,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  ✕ Close
                </button>
              </div>
              {/* Instruction */}
              <div
                style={{
                  background: "rgba(59,130,246,0.12)",
                  borderBottom: "1px solid rgba(59,130,246,0.25)",
                  padding: "10px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 16 }}>📍</span>
                <p
                  style={{
                    fontSize: 13,
                    color: "rgba(185,210,255,0.9)",
                    fontWeight: 500,
                  }}
                >
                  Tap anywhere on the map to drop a pin — or drag the pin to
                  your exact location
                </p>
              </div>
              {/* Map */}
              <div
                style={{
                  flex: 1,
                  overflow: "hidden",
                  position: "relative",
                  minHeight: 300,
                }}
              >
                <LocationSelectMap
                  onLocationSelect={(result: LocationSelectResult) => {
                    const parts = result.displayAddress.split(",");
                    const localityName =
                      result.locality?.name ??
                      parts[0]?.trim() ??
                      result.displayAddress;
                    setPendingMapPin({
                      lat: result.lat,
                      lng: result.lng,
                      localityName,
                      displayAddress: result.displayAddress,
                    });
                  }}
                  className="w-full h-full"
                  city={city}
                  showLayerToggles={false}
                  modalMode={true}
                />
              </div>
              {/* Pending feedback */}
              <div
                style={{
                  background: "rgba(7,26,47,0.97)",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  padding: "12px 20px",
                  minHeight: 56,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexShrink: 0,
                }}
              >
                <MapPin
                  size={15}
                  style={{
                    color: pendingMapPin ? "#D8B56A" : "rgba(255,255,255,0.25)",
                    flexShrink: 0,
                  }}
                />
                {pendingMapPin ? (
                  <p
                    style={{
                      fontSize: 13,
                      color: "#D8B56A",
                      fontWeight: 600,
                      flex: 1,
                      lineHeight: 1.4,
                    }}
                  >
                    📍 {pendingMapPin.localityName}
                    {pendingMapPin.displayAddress !==
                      pendingMapPin.localityName && (
                      <span
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: "rgba(255,255,255,0.4)",
                          fontWeight: 400,
                          marginTop: 1,
                        }}
                      >
                        {pendingMapPin.displayAddress}
                      </span>
                    )}
                  </p>
                ) : (
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.35)",
                      flex: 1,
                      fontStyle: "italic",
                    }}
                  >
                    No pin dropped yet — tap on the map above
                  </p>
                )}
              </div>
              {/* Actions */}
              <div
                style={{
                  background: "rgba(7,26,47,1)",
                  borderTop: "1px solid rgba(216,181,106,0.15)",
                  padding: "14px 20px",
                  display: "flex",
                  gap: 12,
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => setMapPinModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: "12px 0",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ✕ Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!pendingMapPin) return;
                    const locRecord: LocationRecord = {
                      id: `pin-${pendingMapPin.lat.toFixed(4)}-${pendingMapPin.lng.toFixed(4)}`,
                      name: pendingMapPin.localityName,
                      type: "locality" as const,
                      city,
                      district: city,
                      state: "Karnataka",
                      pincode: "",
                      searchTokens: [pendingMapPin.localityName.toLowerCase()],
                    };
                    setSelectedLocation(locRecord);
                    setMapCenter([pendingMapPin.lat, pendingMapPin.lng]);
                    setMapPinModalOpen(false);
                    setPendingMapPin(null);
                  }}
                  disabled={!pendingMapPin}
                  style={{
                    flex: 2,
                    padding: "12px 0",
                    borderRadius: 12,
                    background: pendingMapPin
                      ? "linear-gradient(135deg, #D8B56A 0%, #E8C97A 100%)"
                      : "rgba(255,255,255,0.06)",
                    border: "none",
                    color: pendingMapPin ? "#071A2F" : "rgba(255,255,255,0.2)",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: pendingMapPin ? "pointer" : "not-allowed",
                    boxShadow: pendingMapPin
                      ? "0 4px 16px rgba(216,181,106,0.35)"
                      : "none",
                  }}
                >
                  ✓ Confirm Location
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
