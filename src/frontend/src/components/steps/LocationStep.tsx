// LocationStep.tsx — Step 1: City + Locality with Map Pin support
// UX: Search is primary. "📍 Pin location on map" opens a full-screen modal.
// CRITICAL FIX: Modal uses createPortal to escape backdropFilter stacking context.
// backdropFilter on parent cards creates a new stacking context that traps
// position:fixed children. createPortal renders at document.body level, bypassing this.
import { ChevronRight, MapPin, Navigation } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCoords } from "../../data/localityCoords";
import type { LocationRecord } from "../../data/locationData";
import type { MapLayerScope } from "../../engines/mapLayersEngine";
import LocationSelectMap from "../LocationSelectMap";
import type { LocationSelectResult } from "../LocationSelectMap";
import SmartLocationSearch from "../SmartLocationSearch";
import type { LocationData } from "./types";

interface LocationStepProps {
  onNext: (data: LocationData) => void;
  initialData?: Partial<LocationData>;
  /** Layer scope for the map — 'basic' by default, 'full' for Location IQ */
  mapLayerScope?: MapLayerScope;
}

const CITIES = ["Bangalore", "Pune", "Delhi", "Mumbai", "Hyderabad"];

// Pending pin state while modal is open (not yet confirmed)
interface PendingPin {
  lat: number;
  lng: number;
  displayAddress: string;
  localityName: string;
}

export default function LocationStep({
  onNext,
  initialData,
  mapLayerScope = "basic",
}: LocationStepProps) {
  const [city, setCity] = useState<string>(initialData?.city ?? "Bangalore");
  const [locality, setLocality] = useState<string>(initialData?.locality ?? "");
  const [lat, setLat] = useState<number>(initialData?.lat ?? 0);
  const [lng, setLng] = useState<number>(initialData?.lng ?? 0);
  const [localityError, setLocalityError] = useState<string>("");
  // Track if selection was via map pin (so we can show "Change" affordance)
  const [pinnedViaMap, setPinnedViaMap] = useState(false);
  // Key to force SmartLocationSearch to remount on city change
  const [searchKey, setSearchKey] = useState(0);

  // ── Map modal state ────────────────────────────────────────────────────────
  const [mapModalOpen, setMapModalOpen] = useState(false);
  // Latest pending pin inside the modal (not confirmed yet)
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);

  const localityRef = useRef<HTMLDivElement>(null);

  // When city changes: clear all location state, reset search and map
  const handleCityChange = (newCity: string) => {
    if (newCity === city) return;
    setCity(newCity);
    setLocality("");
    setLat(0);
    setLng(0);
    setLocalityError("");
    setPinnedViaMap(false);
    setPendingPin(null);
    setSearchKey((k) => k + 1);
  };

  // Callback when map pin cleared by city change (inside LocationSelectMap)
  const handleMapPinClear = useCallback(() => {
    setPendingPin(null);
  }, []);

  // Search dropdown selection
  const handleLocationSelect = (loc: LocationRecord) => {
    setLocality(loc.name);
    setCity(loc.city || city);
    setLocalityError("");
    setPinnedViaMap(false);
    const coords = getCoords(loc.name);
    if (coords) {
      setLat(coords.lat);
      setLng(coords.lng);
    } else {
      setLat(12.9716);
      setLng(77.5946);
    }
  };

  // Map click inside the modal — update pending pin (not confirmed yet)
  const handleMapSelect = (result: LocationSelectResult) => {
    let localityName = "";
    if (result.locality) {
      localityName = result.locality.name;
    } else {
      const parts = result.displayAddress.split(",");
      localityName = parts[0]?.trim() || result.displayAddress;
    }
    setPendingPin({
      lat: result.lat,
      lng: result.lng,
      displayAddress: result.displayAddress,
      localityName,
    });
  };

  // Open map modal
  const openMapModal = () => {
    setPendingPin(null); // reset pending, user will re-pin
    setMapModalOpen(true);
  };

  // Close modal without saving
  const cancelMapModal = () => {
    setMapModalOpen(false);
    setPendingPin(null);
  };

  // Confirm pin selection from modal
  const confirmMapPin = () => {
    if (!pendingPin) return;
    setLat(pendingPin.lat);
    setLng(pendingPin.lng);
    setLocality(pendingPin.localityName);
    setLocalityError("");
    setPinnedViaMap(true);
    setSearchKey((k) => k + 1); // refresh search display
    setMapModalOpen(false);
    setPendingPin(null);
  };

  const handleNext = () => {
    if (!city.trim()) {
      setLocalityError("Please select a city first");
      return;
    }
    if (!locality.trim() && (lat === 0 || lng === 0)) {
      setLocalityError(
        "This field is required — please select or search a locality, or pin on the map",
      );
      localityRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    setLocalityError("");
    onNext({ city, locality, lat, lng });
  };

  const isValid =
    city.trim().length > 0 &&
    (locality.trim().length > 0 || (lat !== 0 && lng !== 0));

  // Initial center for the map modal: use confirmed locality coords or city center
  const mapInitialCenter: [number, number] | undefined =
    lat !== 0 && lng !== 0 ? [lat, lng] : undefined;

  // ── Portal modal — must be computed here (not inside JSX return after closing)
  // createPortal escapes stacking context created by parent's backdropFilter
  const mapModalPortal = mapModalOpen
    ? createPortal(
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
            if (e.target === e.currentTarget) cancelMapModal();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancelMapModal();
          }}
          // biome-ignore lint/a11y/useSemanticElements: modal backdrop overlay
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          data-ocid="location_step.map_modal"
        >
          {/* Modal card — full height, max-width centered */}
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
            {/* ── Modal header ───────────────────────────────────────────── */}
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
                onClick={cancelMapModal}
                aria-label="Close map"
                data-ocid="location_step.map_modal_close"
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

            {/* ── Instruction banner ─────────────────────────────────────── */}
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
                Tap anywhere on the map to drop a pin — or drag the pin to your
                exact location
              </p>
            </div>

            {/* ── Map area — explicit minHeight required for Leaflet ──────── */}
            <div
              style={{
                flex: 1,
                overflow: "hidden",
                position: "relative",
                minHeight: 300,
              }}
            >
              <LocationSelectMap
                onLocationSelect={handleMapSelect}
                onClearPin={handleMapPinClear}
                className="w-full h-full"
                city={city}
                initialCenter={mapInitialCenter}
                layerScope={mapLayerScope}
                showLayerToggles={false}
                modalMode={true}
              />
            </div>

            {/* ── Pending pin feedback ───────────────────────────────────── */}
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
                  color: pendingPin ? "#D8B56A" : "rgba(255,255,255,0.25)",
                  flexShrink: 0,
                }}
              />
              {pendingPin ? (
                <p
                  style={{
                    fontSize: 13,
                    color: "#D8B56A",
                    fontWeight: 600,
                    flex: 1,
                    lineHeight: 1.4,
                  }}
                >
                  📍 {pendingPin.localityName || pendingPin.displayAddress}
                  {pendingPin.localityName &&
                    pendingPin.displayAddress !== pendingPin.localityName && (
                      <span
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: "rgba(255,255,255,0.4)",
                          fontWeight: 400,
                          marginTop: 1,
                        }}
                      >
                        {pendingPin.displayAddress}
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

            {/* ── Modal action buttons ──────────────────────────────────── */}
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
                onClick={cancelMapModal}
                data-ocid="location_step.map_modal_cancel"
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
                onClick={confirmMapPin}
                disabled={!pendingPin}
                data-ocid="location_step.map_modal_confirm"
                style={{
                  flex: 2,
                  padding: "12px 0",
                  borderRadius: 12,
                  background: pendingPin
                    ? "linear-gradient(135deg, #D8B56A 0%, #E8C97A 100%)"
                    : "rgba(255,255,255,0.06)",
                  border: "none",
                  color: pendingPin ? "#071A2F" : "rgba(255,255,255,0.2)",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: pendingPin ? "pointer" : "not-allowed",
                  boxShadow: pendingPin
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
      )
    : null;

  return (
    <>
      <div className="w-full space-y-6">
        {/* Heading */}
        <div>
          <h2
            className="text-2xl font-bold mb-1"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "#F4F7FF",
            }}
          >
            Where are you looking?
          </h2>
          <p style={{ color: "rgba(185,198,216,0.7)", fontSize: 14 }}>
            Select a city and locality to get started
          </p>
        </div>

        {/* City selector */}
        <div className="space-y-2">
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "rgba(216,181,106,0.8)",
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
                data-ocid={`location_step.city.${c.toLowerCase()}`}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background:
                    city === c
                      ? "rgba(216,181,106,0.18)"
                      : "rgba(255,255,255,0.05)",
                  border:
                    city === c
                      ? "1px solid rgba(216,181,106,0.5)"
                      : "1px solid rgba(255,255,255,0.1)",
                  color: city === c ? "#D8B56A" : "rgba(255,255,255,0.6)",
                  boxShadow:
                    city === c ? "0 0 12px rgba(216,181,106,0.15)" : "none",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Locality search + Pin button */}
        <div className="space-y-3" ref={localityRef}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: localityError ? "#f87171" : "rgba(216,181,106,0.8)",
            }}
          >
            Locality {localityError ? "— required" : ""}
          </p>

          {/* Search input — primary */}
          <SmartLocationSearch
            key={searchKey}
            onSelect={handleLocationSelect}
            placeholder="Search locality / project / builder"
            size="large"
            city={city}
            initialLocation={
              locality
                ? ({
                    id: "init",
                    name: locality,
                    city,
                    district: city,
                    state: "Karnataka",
                    pincode: "",
                    type: "locality",
                    searchTokens: [],
                  } as LocationRecord)
                : undefined
            }
          />

          {/* Locality validation error */}
          {localityError && (
            <p
              style={{ fontSize: 12, color: "#f87171" }}
              data-ocid="location_step.locality_error"
            >
              ⚠ {localityError}
            </p>
          )}

          {/* ── "Pin location on map" button — primary action below search ── */}
          <button
            type="button"
            onClick={openMapModal}
            data-ocid="location_step.map_pin_button"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{
              background: pinnedViaMap
                ? "rgba(216,181,106,0.12)"
                : "rgba(255,255,255,0.04)",
              border: pinnedViaMap
                ? "1px solid rgba(216,181,106,0.45)"
                : "1px dashed rgba(216,181,106,0.35)",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: pinnedViaMap
                  ? "rgba(216,181,106,0.2)"
                  : "rgba(59,130,246,0.15)",
                border: pinnedViaMap
                  ? "1px solid rgba(216,181,106,0.5)"
                  : "1px solid rgba(59,130,246,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <MapPin
                size={15}
                style={{ color: pinnedViaMap ? "#D8B56A" : "#3B82F6" }}
              />
            </span>
            <div className="flex-1 text-left">
              {pinnedViaMap && locality ? (
                <>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#D8B56A",
                      lineHeight: 1.3,
                    }}
                  >
                    📍 {locality}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.45)",
                      marginTop: 1,
                    }}
                  >
                    Tap to change pinned location
                  </p>
                </>
              ) : (
                <>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.85)",
                      lineHeight: 1.3,
                    }}
                  >
                    Pin location on map
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.4)",
                      marginTop: 1,
                    }}
                  >
                    Tap to drop a pin on the exact location
                  </p>
                </>
              )}
            </div>
            <Navigation
              size={14}
              style={{
                color: pinnedViaMap ? "#D8B56A" : "rgba(255,255,255,0.3)",
                flexShrink: 0,
              }}
            />
          </button>
        </div>

        {/* Selected location chip — shown when locality is confirmed */}
        {locality && (
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
            style={{
              background: "rgba(216,181,106,0.08)",
              border: "1px solid rgba(216,181,106,0.25)",
            }}
          >
            <MapPin size={14} style={{ color: "#D8B56A", flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: "#F4F7FF", fontWeight: 600 }}>
              {locality}, {city}
            </span>
            {lat !== 0 && lng !== 0 && (
              <span
                style={{
                  fontSize: 10,
                  color: "rgba(216,181,106,0.6)",
                  marginLeft: "auto",
                }}
              >
                📍 Pinned
              </span>
            )}
          </div>
        )}

        {/* Next button */}
        <button
          type="button"
          onClick={handleNext}
          data-ocid="location_step.next_button"
          className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2"
          style={{
            background: isValid
              ? "linear-gradient(135deg, #D8B56A 0%, #E8C97A 100%)"
              : "rgba(255,255,255,0.08)",
            color: isValid ? "#071A2F" : "rgba(255,255,255,0.3)",
            border: localityError ? "2px solid #EF4444" : "none",
            cursor: "pointer",
            boxShadow: isValid ? "0 4px 20px rgba(216,181,106,0.3)" : "none",
          }}
        >
          Next: Property Type
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── Portal modal — rendered at document.body to escape stacking context ── */}
      {mapModalPortal}
    </>
  );
}
