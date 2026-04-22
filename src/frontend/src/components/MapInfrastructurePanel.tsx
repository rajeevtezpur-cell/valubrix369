// MapInfrastructurePanel.tsx — Premium circular infrastructure toggle buttons
// Top-right absolute positioned inside the map container. Never shifts map.

import type { InfraLayerType } from "../engines/mapLayersEngine";

interface InfraLayerConfig {
  id: InfraLayerType;
  label: string;
  emoji: string;
  activeColor: string;
  activeGlow: string;
}

const INFRA_LAYERS: InfraLayerConfig[] = [
  {
    id: "metro",
    label: "Metro",
    emoji: "🚇",
    activeColor: "#7C3AED",
    activeGlow: "rgba(124,58,237,0.45)",
  },
  {
    id: "railway",
    label: "Rail",
    emoji: "🚂",
    activeColor: "#8B5CF6",
    activeGlow: "rgba(139,92,246,0.45)",
  },
  {
    id: "bus_stop",
    label: "Bus",
    emoji: "🚌",
    activeColor: "#3B82F6",
    activeGlow: "rgba(59,130,246,0.45)",
  },
  {
    id: "hospital",
    label: "Hospital",
    emoji: "🏥",
    activeColor: "#EF4444",
    activeGlow: "rgba(239,68,68,0.45)",
  },
  {
    id: "school",
    label: "School",
    emoji: "🏫",
    activeColor: "#10B981",
    activeGlow: "rgba(16,185,129,0.45)",
  },
  {
    id: "college",
    label: "College",
    emoji: "🎓",
    activeColor: "#0EA5E9",
    activeGlow: "rgba(14,165,233,0.45)",
  },
  {
    id: "tech_park",
    label: "Tech",
    emoji: "🏢",
    activeColor: "#F59E0B",
    activeGlow: "rgba(245,158,11,0.45)",
  },
  {
    id: "mall",
    label: "Mall",
    emoji: "🛍️",
    activeColor: "#D97706",
    activeGlow: "rgba(217,119,6,0.45)",
  },
  {
    id: "airport",
    label: "Airport",
    emoji: "✈️",
    activeColor: "#6B7280",
    activeGlow: "rgba(107,114,128,0.45)",
  },
  {
    id: "highway",
    label: "Highway",
    emoji: "🛣️",
    activeColor: "#84CC16",
    activeGlow: "rgba(132,204,22,0.45)",
  },
  {
    id: "police",
    label: "Police",
    emoji: "🚔",
    activeColor: "#1E3A8A",
    activeGlow: "rgba(30,58,138,0.45)",
  },
  {
    id: "petrol_pump",
    label: "Petrol",
    emoji: "⛽",
    activeColor: "#0D9488",
    activeGlow: "rgba(13,148,136,0.45)",
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
    emoji: "💊",
    activeColor: "#EC4899",
    activeGlow: "rgba(236,72,153,0.45)",
  },
  {
    id: "supermarket",
    label: "Market",
    emoji: "🛒",
    activeColor: "#0D9488",
    activeGlow: "rgba(13,148,136,0.45)",
  },
  {
    id: "restaurant",
    label: "Dine",
    emoji: "🍽️",
    activeColor: "#F97316",
    activeGlow: "rgba(249,115,22,0.45)",
  },
  {
    id: "bank",
    label: "Bank",
    emoji: "🏦",
    activeColor: "#6366F1",
    activeGlow: "rgba(99,102,241,0.45)",
  },
  {
    id: "atm",
    label: "ATM",
    emoji: "🏧",
    activeColor: "#06B6D4",
    activeGlow: "rgba(6,182,212,0.45)",
  },
];

interface MapInfrastructurePanelProps {
  activeLayers: Set<InfraLayerType>;
  onLayerToggle: (layer: InfraLayerType) => void;
  className?: string;
}

export default function MapInfrastructurePanel({
  activeLayers,
  onLayerToggle,
  className = "",
}: MapInfrastructurePanelProps) {
  return (
    <div
      className={className}
      style={{
        position: "absolute",
        top: "50%",
        right: 10,
        transform: "translateY(-50%)",
        zIndex: 1000,
        background: "rgba(7,26,47,0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        padding: "8px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 5,
        maxHeight: "80vh",
        overflowY: "auto",
        scrollbarWidth: "none",
      }}
      data-ocid="map_infra_panel.container"
    >
      {INFRA_LAYERS.map((layer) => {
        const isActive = activeLayers.has(layer.id);
        return (
          <button
            key={layer.id}
            type="button"
            onClick={() => onLayerToggle(layer.id)}
            aria-label={`Toggle ${layer.label} layer`}
            aria-pressed={isActive}
            title={layer.label}
            data-ocid={`map_infra_panel.btn_${layer.id}`}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              border: isActive
                ? `1.5px solid ${layer.activeColor}`
                : "1.5px solid rgba(255,255,255,0.1)",
              background: isActive
                ? `${layer.activeColor}20`
                : "rgba(255,255,255,0.07)",
              color: isActive ? layer.activeColor : "rgba(255,255,255,0.55)",
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
              boxShadow: isActive ? `0 0 8px ${layer.activeGlow}` : "none",
              outline: "none",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.transform = "translateY(-2px) scale(1.08)";
              if (!isActive) {
                btn.style.background = "rgba(255,255,255,0.15)";
              }
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.transform = "translateY(0) scale(1)";
              if (!isActive) {
                btn.style.background = "rgba(255,255,255,0.07)";
              }
            }}
          >
            <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>
              {layer.emoji}
            </span>
            <span
              style={{
                fontSize: 8,
                fontWeight: isActive ? 700 : 500,
                fontFamily: "Plus Jakarta Sans, sans-serif",
                lineHeight: 1,
                letterSpacing: "0.02em",
                color: isActive ? layer.activeColor : "rgba(255,255,255,0.45)",
                whiteSpace: "nowrap",
              }}
            >
              {layer.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
