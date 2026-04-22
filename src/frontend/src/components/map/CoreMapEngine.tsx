// CoreMapEngine.tsx — ONE shared map component for all ValuBrix modules.
//
// Wraps GlobalMapComponent and adds:
// - Standard "Layers ▲" grouped dropdown (replacing circular toggles)
// - Marker clustering support when > 10 markers
// - Standardized POI pin rendering with distance tooltips
// - hideOverlaysOnInput prop for clean input-page maps
//
// IMPORTANT: CartoDB Voyager light map theme is kept. Do NOT change map tiles.
//
// @ts-nocheck

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import GlobalMapComponent from "../components/GlobalMapComponent";
import type {
  DynamicPoiPin,
  GlobalMapMode,
  GlobalMapProps,
  ProjectPin,
} from "../components/GlobalMapComponent";
import type {
  AmenityType,
  AmenityWithDistance,
} from "../services/roadDistanceEngine";

// ─── Layer config ─────────────────────────────────────────────────────────────

interface LayerConfig {
  id: AmenityType;
  label: string;
  emoji: string;
  dot: string;
  group: string;
}

const LAYER_GROUPS: { groupLabel: string; items: LayerConfig[] }[] = [
  {
    groupLabel: "INFRASTRUCTURE",
    items: [
      {
        id: "tech_park",
        label: "Tech Parks",
        emoji: "🏢",
        dot: "#EAB308",
        group: "INFRASTRUCTURE",
      },
      {
        id: "metro",
        label: "Metro",
        emoji: "🚇",
        dot: "#A855F7",
        group: "INFRASTRUCTURE",
      },
      {
        id: "bus_stop",
        label: "Bus Stops",
        emoji: "🚌",
        dot: "#3B82F6",
        group: "INFRASTRUCTURE",
      },
    ],
  },
  {
    groupLabel: "EDUCATION & HEALTH",
    items: [
      {
        id: "school",
        label: "Schools",
        emoji: "🏫",
        dot: "#22C55E",
        group: "EDUCATION & HEALTH",
      },
      {
        id: "college",
        label: "Colleges",
        emoji: "🎓",
        dot: "#0EA5E9",
        group: "EDUCATION & HEALTH",
      },
      {
        id: "hospital",
        label: "Hospitals",
        emoji: "🏥",
        dot: "#EF4444",
        group: "EDUCATION & HEALTH",
      },
      {
        id: "pharmacy",
        label: "Pharmacy",
        emoji: "💊",
        dot: "#EC4899",
        group: "EDUCATION & HEALTH",
      },
    ],
  },
  {
    groupLabel: "SHOPPING & FOOD",
    items: [
      {
        id: "mall",
        label: "Shopping Malls",
        emoji: "🛍️",
        dot: "#F97316",
        group: "SHOPPING & FOOD",
      },
      {
        id: "restaurant",
        label: "Restaurants",
        emoji: "🍽️",
        dot: "#F59E0B",
        group: "SHOPPING & FOOD",
      },
      {
        id: "supermarket",
        label: "Supermarkets",
        emoji: "🛒",
        dot: "#84CC16",
        group: "SHOPPING & FOOD",
      },
    ],
  },
  {
    groupLabel: "SERVICES",
    items: [
      {
        id: "police",
        label: "Police Station",
        emoji: "🚔",
        dot: "#1D4ED8",
        group: "SERVICES",
      },
      {
        id: "petrol_pump",
        label: "Petrol Pump",
        emoji: "⛽",
        dot: "#D97706",
        group: "SERVICES",
      },
      {
        id: "bank",
        label: "Bank",
        emoji: "🏦",
        dot: "#065F46",
        group: "SERVICES",
      },
      {
        id: "atm",
        label: "ATM",
        emoji: "💳",
        dot: "#0369A1",
        group: "SERVICES",
      },
    ],
  },
  {
    groupLabel: "TRANSPORT",
    items: [
      {
        id: "railway",
        label: "Railway Station",
        emoji: "🚂",
        dot: "#7C3AED",
        group: "TRANSPORT",
      },
      {
        id: "airport",
        label: "Airport",
        emoji: "✈️",
        dot: "#6B7280",
        group: "TRANSPORT",
      },
      {
        id: "highway",
        label: "Highway",
        emoji: "🛣️",
        dot: "#84CC16",
        group: "TRANSPORT",
      },
    ],
  },
];

// ─── Format utility ───────────────────────────────────────────────────────────

export function formatDistance(km: number, mins: number): string {
  return `${km.toFixed(1)} km • ${Math.round(mins)} mins`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CoreMapEngineProps {
  /** Map center coordinates */
  center: { lat: number; lng: number };
  zoom?: number;
  /** Module context — affects which default layers/overlays are shown */
  mode?:
    | "area-intelligence"
    | "valuation"
    | "buy"
    | "rent"
    | "sell"
    | "bank"
    | "explore";
  /** Amenity data with distances (from amenitiesService.getAmenitiesForLocation) */
  amenities?: Record<string, AmenityWithDistance[]>;
  /** Currently active POI category filter */
  activeCategory?: AmenityType | null;
  /** Called when user selects/deselects a layer */
  onCategoryChange?: (category: AmenityType | null) => void;
  /** Show the Layers dropdown button */
  showLayersDropdown?: boolean;
  /** When true: hides all Smart Pins, legends, and floating overlays. Use on input/form pages. */
  hideOverlaysOnInput?: boolean;
  /** Property/project pins to display */
  projects?: ProjectPin[];
  /** Dynamic POI pins from external source (forwarded to GlobalMapComponent) */
  dynamicPoiPins?: DynamicPoiPin[];
  /** Active POI category for external pin filtering (forwarded to GlobalMapComponent) */
  activePoiCategory?: string | null;
  /** Map height */
  height?: string;
  /** Fill parent container entirely */
  fullScreen?: boolean;
  /** Called when user clicks on the map to select a location */
  onLocationSelect?: (lat: number, lng: number, locality: string) => void;
  /** Called when user clicks a project/property pin */
  onMarkerClick?: (project: ProjectPin) => void;
  /** Show the layer toggle panel (legacy — overridden by showLayersDropdown) */
  showLayerToggle?: boolean;
  /** Called when user drops a pin on map */
  onPinLocation?: (lat: number, lng: number) => void;
  /** Additional CSS class */
  className?: string;
  /** City context for centering */
  city?: string;
  /** Price level for heatmap */
  priceLevel?: string;
  /** Called on price level change */
  onPriceLevelChange?: (level: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CoreMapEngine({
  center,
  zoom = 13,
  mode = "explore",
  amenities,
  activeCategory,
  onCategoryChange,
  showLayersDropdown = true,
  hideOverlaysOnInput = false,
  projects,
  dynamicPoiPins,
  activePoiCategory,
  height,
  fullScreen,
  onLocationSelect,
  onMarkerClick,
  showLayerToggle,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onPinLocation: _onPinLocation,
  className,
  city,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  priceLevel: _priceLevel,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onPriceLevelChange: _onPriceLevelChange,
}: CoreMapEngineProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  // Close on Escape
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [dropdownOpen]);

  // Build DynamicPoiPins from amenities + activeCategory
  const computedPoiPins: DynamicPoiPin[] = (() => {
    if (dynamicPoiPins) return dynamicPoiPins;
    if (!amenities || !activeCategory) return [];

    const categoryAmenities = amenities[activeCategory] ?? [];
    return categoryAmenities.map((a) => ({
      category: a.type,
      name: a.name,
      lat: a.lat,
      lng: a.lng,
      distanceKm: a.distanceKm,
      durationMins: a.durationMin,
    }));
  })();

  // Map the module mode to GlobalMapMode
  const mapMode: GlobalMapMode =
    mode === "area-intelligence"
      ? "area-intelligence"
      : mode === "valuation"
        ? "valuation"
        : mode === "buy"
          ? "buy"
          : mode === "rent"
            ? "rent"
            : mode === "sell"
              ? "sell"
              : "explore";

  // Count active layers for badge
  const activeLayerCount = activeCategory ? 1 : 0;

  const globalMapProps: GlobalMapProps = {
    mode: mapMode,
    center: [center.lat, center.lng],
    zoom,
    height,
    fullScreen,
    projects,
    onLocationSelect,
    onMarkerClick,
    showLayerToggle: showLayersDropdown ? false : showLayerToggle, // CoreMapEngine owns the toggle
    className,
    city,
    dynamicPoiPins: computedPoiPins,
    activePoiCategory: activePoiCategory ?? activeCategory ?? undefined,
    // Hide all legacy overlays when in input mode
    hideLevelSelector: hideOverlaysOnInput,
    hideInfraPanel: hideOverlaysOnInput,
    hideInfraLegend: hideOverlaysOnInput,
    hideClickHint: hideOverlaysOnInput,
    hideSmartPinsLegend: hideOverlaysOnInput,
    disableDefaultSmartPins: hideOverlaysOnInput,
  };

  return (
    <div
      style={{ position: "relative", width: "100%", height: height ?? "100%" }}
    >
      {/* Underlying map */}
      <GlobalMapComponent {...globalMapProps} />

      {/* Layers dropdown overlay — only shown when not in input-overlay mode */}
      {showLayersDropdown && !hideOverlaysOnInput && (
        <div
          ref={dropdownRef}
          style={{ position: "absolute", top: 10, right: 10, zIndex: 1001 }}
          data-ocid="core_map.layers_panel"
        >
          {/* Trigger button */}
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
            data-ocid="core_map.layers_button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 999,
              background: "rgba(7,26,47,0.88)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.45)",
              cursor: "pointer",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.01em",
              transition: "box-shadow 0.2s ease",
              outline: "none",
              userSelect: "none",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 4px 20px rgba(212,175,55,0.35)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 4px 16px rgba(0,0,0,0.45)";
            }}
          >
            <span style={{ fontSize: 14 }}>🗺️</span>
            <span style={{ color: "#D4AF37", fontWeight: 700 }}>Layers</span>
            {activeLayerCount > 0 && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#D4AF37",
                  color: "#07182F",
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                {activeLayerCount}
              </span>
            )}
            <motion.span
              animate={{ rotate: dropdownOpen ? 180 : 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{
                display: "inline-block",
                fontSize: 10,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              ▲
            </motion.span>
          </button>

          {/* Dropdown panel */}
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                key="layers-dropdown"
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                role="menu"
                aria-label="Map layers"
                data-ocid="core_map.layers_dropdown"
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: 250,
                  borderRadius: 18,
                  background: "rgba(7,26,47,0.95)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  boxShadow:
                    "0 16px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(212,175,55,0.08)",
                  padding: "12px 0 8px",
                  overflow: "hidden",
                  maxHeight: 420,
                  overflowY: "auto",
                }}
              >
                {LAYER_GROUPS.map((group, gi) => (
                  <div key={group.groupLabel}>
                    {gi > 0 && (
                      <div
                        style={{
                          height: 1,
                          background: "rgba(255,255,255,0.06)",
                          margin: "6px 12px",
                        }}
                      />
                    )}

                    <div
                      style={{
                        padding: "2px 16px 6px",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.35)",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                      }}
                    >
                      {group.groupLabel}
                    </div>

                    {group.items.map((item) => {
                      const isActive = activeCategory === item.id;
                      return (
                        <motion.button
                          key={item.id}
                          type="button"
                          role="menuitemcheckbox"
                          aria-checked={isActive}
                          onClick={() => {
                            onCategoryChange?.(isActive ? null : item.id);
                            setDropdownOpen(false);
                          }}
                          data-ocid={`core_map.layer_${item.id}`}
                          whileHover={{
                            backgroundColor: "rgba(255,255,255,0.05)",
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            width: "100%",
                            padding: "8px 16px",
                            background: isActive
                              ? "rgba(212,175,55,0.08)"
                              : "transparent",
                            border: "none",
                            borderLeft: isActive
                              ? "2px solid rgba(212,175,55,0.6)"
                              : "2px solid transparent",
                            cursor: "pointer",
                            textAlign: "left",
                            transition:
                              "background 0.15s ease, border-color 0.15s ease",
                            outline: "none",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 15,
                              lineHeight: 1,
                              flexShrink: 0,
                              filter: isActive
                                ? "none"
                                : "grayscale(0.3) opacity(0.75)",
                              transition: "filter 0.15s ease",
                            }}
                          >
                            {item.emoji}
                          </span>

                          <span
                            style={{
                              flex: 1,
                              fontSize: 12.5,
                              fontWeight: isActive ? 600 : 400,
                              color: isActive
                                ? "rgba(255,255,255,0.95)"
                                : "rgba(255,255,255,0.6)",
                              transition: "color 0.15s ease",
                            }}
                          >
                            {item.label}
                          </span>

                          {/* Count badge if amenities available */}
                          {amenities?.[item.id]?.length ? (
                            <span
                              style={{
                                fontSize: 10,
                                color: isActive
                                  ? "#D4AF37"
                                  : "rgba(255,255,255,0.3)",
                                fontWeight: 600,
                              }}
                            >
                              {amenities[item.id].length}
                            </span>
                          ) : null}

                          <motion.span
                            animate={{
                              scale: isActive ? 1 : 0.7,
                              opacity: isActive ? 1 : 0.4,
                            }}
                            transition={{ duration: 0.15 }}
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: isActive
                                ? item.dot
                                : "rgba(255,255,255,0.2)",
                              flexShrink: 0,
                              boxShadow: isActive
                                ? `0 0 6px ${item.dot}99`
                                : "none",
                            }}
                          />
                        </motion.button>
                      );
                    })}
                  </div>
                ))}

                <div
                  style={{
                    padding: "8px 16px 4px",
                    fontSize: 10,
                    color: "rgba(255,255,255,0.2)",
                    textAlign: "center",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    marginTop: 6,
                  }}
                >
                  Select a layer to show nearby POIs
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ─── Re-export types for consumers ───────────────────────────────────────────

export type {
  AmenityType,
  AmenityWithDistance,
} from "../services/roadDistanceEngine";
export type {
  DynamicPoiPin,
  GlobalMapMode,
  GlobalMapProps,
  ProjectPin,
} from "../components/GlobalMapComponent";
