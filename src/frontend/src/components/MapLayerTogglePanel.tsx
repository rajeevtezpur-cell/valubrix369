// MapLayerTogglePanel.tsx — "Layers ▲/▼" grouped dropdown for ValuBrix maps
// Replaces old circular toggle panel entirely.
// Groups: INFRASTRUCTURE / EDUCATION & HEALTH / SHOPPING & FOOD / SERVICES
// Uses motion/react AnimatePresence for slide-down animation.
// @ts-nocheck

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type {
  InfraLayerType,
  MapLayerScope,
  MapLayerType,
} from "../engines/mapLayersEngine";

// ─── POI Layer Config ──────────────────────────────────────────────────────────

interface PoiLayerConfig {
  id: InfraLayerType;
  label: string;
  emoji: string;
  dot: string; // CSS color for the indicator dot
}

interface LayerGroup {
  groupLabel: string;
  items: PoiLayerConfig[];
}

const LAYER_GROUPS: LayerGroup[] = [
  {
    groupLabel: "INFRASTRUCTURE",
    items: [
      { id: "tech_park", label: "Tech Parks", emoji: "🏢", dot: "#F59E0B" },
      { id: "metro", label: "Metro Stations", emoji: "🚇", dot: "#7C3AED" },
      { id: "bus_stop", label: "Bus Stops", emoji: "🚌", dot: "#3B82F6" },
      { id: "railway", label: "Railway Stations", emoji: "🚂", dot: "#8B5CF6" },
    ],
  },
  {
    groupLabel: "EDUCATION & HEALTH",
    items: [
      { id: "school", label: "Schools", emoji: "🏫", dot: "#10B981" },
      { id: "college", label: "Colleges", emoji: "🎓", dot: "#0EA5E9" },
      { id: "hospital", label: "Hospitals", emoji: "🏥", dot: "#EF4444" },
    ],
  },
  {
    groupLabel: "SHOPPING & FOOD",
    items: [
      { id: "restaurant", label: "Restaurants", emoji: "🍽️", dot: "#F97316" },
      { id: "mall", label: "Shopping Malls", emoji: "🛍️", dot: "#D97706" },
      { id: "supermarket", label: "Supermarkets", emoji: "🛒", dot: "#0D9488" },
    ],
  },
  {
    groupLabel: "SERVICES",
    items: [
      { id: "police", label: "Police Stations", emoji: "🚔", dot: "#1E3A8A" },
      { id: "petrol_pump", label: "Petrol Pumps", emoji: "⛽", dot: "#0D9488" },
      { id: "pharmacy", label: "Pharmacies", emoji: "💊", dot: "#EC4899" },
      { id: "bank", label: "Banks", emoji: "🏦", dot: "#6366F1" },
      { id: "atm", label: "ATMs", emoji: "🏧", dot: "#06B6D4" },
      { id: "airport", label: "Airport", emoji: "✈️", dot: "#6B7280" },
    ],
  },
];

// ─── Props (backward-compatible with GlobalMapComponent usage) ─────────────────

interface MapLayerTogglePanelProps {
  // Existing props — kept for backward compat
  scope: MapLayerScope;
  activeLayers: MapLayerType[];
  onToggle: (layer: MapLayerType) => void;
  hiddenLayers?: MapLayerType[];
  onToggleVisibility?: (layer: MapLayerType) => void;
  showSmartPins: boolean;
  onToggleSmartPins: () => void;
  // New optional props for controlling infra/POI categories
  activeInfraLayers?: Set<InfraLayerType>;
  onInfraLayerToggle?: (layer: InfraLayerType) => void;
}

export default function MapLayerTogglePanel({
  activeInfraLayers,
  onInfraLayerToggle,
}: MapLayerTogglePanelProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Close on outside click ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const isActive = (id: InfraLayerType) =>
    activeInfraLayers ? activeInfraLayers.has(id) : false;

  const handleToggle = (id: InfraLayerType) => {
    onInfraLayerToggle?.(id);
  };

  // Count active layers for badge
  const activeCount = activeInfraLayers ? activeInfraLayers.size : 0;

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        // FIX B: zIndex 1020 so dropdown floats above all map controls
        zIndex: 1020,
        pointerEvents: "auto",
        // FIX B: overflow:visible so dropdown panel is never clipped by parent
        overflow: "visible",
        // isolation creates a new stacking context for the dropdown
        isolation: "isolate",
      }}
      data-ocid="map_layer_panel.container"
    >
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-ocid="map_layer_panel.toggle_button"
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 14px",
          borderRadius: 999,
          background: "rgba(7,26,47,0.88)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.45)",
          cursor: "pointer",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.01em",
          transition: "box-shadow 0.2s ease, background 0.2s ease",
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
        {activeCount > 0 && (
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
              lineHeight: 1,
            }}
          >
            {activeCount}
          </span>
        )}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
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
        {open && (
          <motion.div
            key="layers-dropdown"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="menu"
            aria-label="Map layers"
            data-ocid="map_layer_panel.dropdown"
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
              maxHeight: "70vh",
              overflowY: "auto",
            }}
          >
            {LAYER_GROUPS.map((group, gi) => (
              <div key={group.groupLabel}>
                {/* Group divider */}
                {gi > 0 && (
                  <div
                    style={{
                      height: 1,
                      background: "rgba(255,255,255,0.06)",
                      margin: "6px 12px",
                    }}
                  />
                )}

                {/* Group header */}
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

                {/* Layer items */}
                {group.items.map((item) => {
                  const active = isActive(item.id);
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={active}
                      onClick={() => handleToggle(item.id)}
                      data-ocid={`map_layer_panel.layer_${item.id}`}
                      whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "8px 16px",
                        background: active
                          ? "rgba(212,175,55,0.08)"
                          : "transparent",
                        border: "none",
                        borderLeft: active
                          ? "2px solid rgba(212,175,55,0.6)"
                          : "2px solid transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        transition:
                          "background 0.15s ease, border-color 0.15s ease",
                        outline: "none",
                      }}
                    >
                      {/* Emoji */}
                      <span
                        style={{
                          fontSize: 15,
                          lineHeight: 1,
                          flexShrink: 0,
                          filter: active
                            ? "none"
                            : "grayscale(0.3) opacity(0.75)",
                          transition: "filter 0.15s ease",
                        }}
                      >
                        {item.emoji}
                      </span>

                      {/* Label */}
                      <span
                        style={{
                          flex: 1,
                          fontSize: 12.5,
                          fontWeight: active ? 600 : 400,
                          color: active
                            ? "rgba(255,255,255,0.95)"
                            : "rgba(255,255,255,0.6)",
                          transition:
                            "color 0.15s ease, font-weight 0.15s ease",
                        }}
                      >
                        {item.label}
                      </span>

                      {/* Colored dot indicator */}
                      <motion.span
                        animate={{
                          scale: active ? 1 : 0.7,
                          opacity: active ? 1 : 0.4,
                        }}
                        transition={{ duration: 0.15 }}
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: active
                            ? item.dot
                            : "rgba(255,255,255,0.2)",
                          flexShrink: 0,
                          boxShadow: active ? `0 0 6px ${item.dot}99` : "none",
                          transition: "box-shadow 0.2s ease",
                        }}
                      />
                    </motion.button>
                  );
                })}
              </div>
            ))}

            {/* Footer hint */}
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
              Toggle layers to show on map
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
