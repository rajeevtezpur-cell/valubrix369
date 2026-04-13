// MapInfrastructureLegend.tsx — Clean collapsible floating legend (bottom-left)
// Replaces the old "Active Layers" box that overlapped the map.
// When collapsed: shows a small glass circle with a layers icon.
// When expanded: shows a compact list of active layers.

import { Layers } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { InfraLayerType } from "../engines/mapLayersEngine";

interface LegendEntry {
  id: InfraLayerType;
  label: string;
  color: string;
  emoji: string;
}

const LEGEND_DATA: Record<InfraLayerType, LegendEntry> = {
  metro: { id: "metro", label: "Metro Station", color: "#3B82F6", emoji: "🚇" },
  railway: { id: "railway", label: "Railway", color: "#6B7280", emoji: "🚆" },
  bus_stop: {
    id: "bus_stop",
    label: "Bus Stop",
    color: "#F59E0B",
    emoji: "🚌",
  },
  hospital: {
    id: "hospital",
    label: "Hospital",
    color: "#EF4444",
    emoji: "🏥",
  },
  school: { id: "school", label: "School", color: "#10B981", emoji: "🏫" },
  college: { id: "college", label: "College", color: "#0EA5E9", emoji: "🎓" },
  tech_park: {
    id: "tech_park",
    label: "Tech Park",
    color: "#8B5CF6",
    emoji: "🏢",
  },
  mall: { id: "mall", label: "Mall", color: "#EC4899", emoji: "🛍" },
  airport: { id: "airport", label: "Airport", color: "#06B6D4", emoji: "✈" },
  highway: { id: "highway", label: "Highway", color: "#F97316", emoji: "🛣" },
};

interface MapInfrastructureLegendProps {
  activeLayers: Set<InfraLayerType>;
  className?: string;
}

export default function MapInfrastructureLegend({
  activeLayers,
  className = "",
}: MapInfrastructureLegendProps) {
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeList = Array.from(activeLayers)
    .map((id) => LEGEND_DATA[id])
    .filter(Boolean);

  // Auto-expand when first layer activates, collapse when all removed
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (activeList.length > 0) {
      setMounted(true);
      timerRef.current = setTimeout(() => setExpanded(true), 10);
    } else {
      setExpanded(false);
      timerRef.current = setTimeout(() => setMounted(false), 300);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeList.length]);

  if (!mounted) return null;

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        bottom: 80,
        left: 10,
        zIndex: 1001,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 0,
      }}
      data-ocid="map_infra_legend.container"
    >
      {/* Toggle icon button */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-label={
          expanded ? "Collapse layers legend" : "Expand layers legend"
        }
        title={expanded ? "Collapse legend" : "Show active layers"}
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "rgba(7,26,47,0.82)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          outline: "none",
          color: expanded ? "#D8B56A" : "rgba(255,255,255,0.55)",
          transition: "color 0.2s ease, background 0.2s ease",
          zIndex: 1,
        }}
      >
        <Layers size={15} />
      </button>

      {/* Expandable list panel */}
      <div
        style={{
          marginTop: 6,
          width: 168,
          background: "rgba(7,26,47,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 12,
          padding: expanded && activeList.length > 0 ? "8px 12px" : 0,
          boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
          overflow: "hidden",
          maxHeight: expanded && activeList.length > 0 ? 220 : 0,
          overflowY: "auto",
          opacity: expanded && activeList.length > 0 ? 1 : 0,
          transform:
            expanded && activeList.length > 0
              ? "translateY(0)"
              : "translateY(6px)",
          transition:
            "max-height 0.2s ease, opacity 0.2s ease, transform 0.2s ease, padding 0.2s ease",
          pointerEvents: expanded ? "auto" : "none",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {activeList.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: entry.color,
                  flexShrink: 0,
                  boxShadow: `0 0 4px ${entry.color}80`,
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.82)",
                  fontFamily: "Plus Jakarta Sans, sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
