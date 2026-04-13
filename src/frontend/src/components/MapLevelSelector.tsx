// MapLevelSelector.tsx — Premium floating level pills for ValuBrix map
// Top-left absolute positioned inside the map container. Never shifts map.

import type { LevelType } from "../engines/mapLayersEngine";

interface LevelConfig {
  id: LevelType;
  label: string;
  emoji: string;
  description: string;
  color: string;
  glowColor: string;
}

const LEVELS: LevelConfig[] = [
  {
    id: "smart",
    label: "Smart",
    emoji: "🧠",
    description: "Market Intelligence",
    color: "#3B82F6",
    glowColor: "rgba(59,130,246,0.4)",
  },
  {
    id: "premium",
    label: "Premium",
    emoji: "⭐",
    description: "Premium Zones",
    color: "#D8B56A",
    glowColor: "rgba(216,181,106,0.4)",
  },
  {
    id: "growth",
    label: "Growth",
    emoji: "📈",
    description: "Growth Potential",
    color: "#10B981",
    glowColor: "rgba(16,185,129,0.4)",
  },
  {
    id: "investment",
    label: "Investment",
    emoji: "💎",
    description: "Investment Value",
    color: "#8B5CF6",
    glowColor: "rgba(139,92,246,0.4)",
  },
];

interface MapLevelSelectorProps {
  selectedLevel: LevelType;
  onLevelChange: (level: LevelType) => void;
  className?: string;
}

export default function MapLevelSelector({
  selectedLevel,
  onLevelChange,
  className = "",
}: MapLevelSelectorProps) {
  return (
    <div
      className={className}
      style={{
        position: "absolute",
        top: 10,
        left: 10,
        zIndex: 1001,
        display: "flex",
        alignItems: "center",
        gap: 4,
        background: "rgba(7,26,47,0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 9999,
        padding: "5px 6px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
      }}
      data-ocid="map_level_selector.container"
    >
      {LEVELS.map((level) => {
        const isSelected = selectedLevel === level.id;
        return (
          <button
            key={level.id}
            type="button"
            onClick={() => onLevelChange(level.id)}
            title={level.description}
            aria-label={`${level.label} — ${level.description}`}
            aria-pressed={isSelected}
            data-ocid={`map_level_selector.pill_${level.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              borderRadius: 9999,
              padding: "5px 11px",
              fontSize: 12,
              fontWeight: isSelected ? 700 : 500,
              fontFamily: "Plus Jakarta Sans, sans-serif",
              border: isSelected
                ? `1.5px solid ${level.color}`
                : "1.5px solid transparent",
              background: isSelected
                ? `${level.color}22`
                : "rgba(255,255,255,0.07)",
              color: isSelected ? level.color : "rgba(255,255,255,0.65)",
              cursor: "pointer",
              transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
              boxShadow: isSelected
                ? `0 0 10px ${level.glowColor}, 0 0 22px ${level.glowColor.replace("0.4", "0.18")}`
                : "none",
              whiteSpace: "nowrap",
              userSelect: "none",
              outline: "none",
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.14)";
                (e.currentTarget as HTMLButtonElement).style.color =
                  "rgba(255,255,255,0.9)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.07)";
                (e.currentTarget as HTMLButtonElement).style.color =
                  "rgba(255,255,255,0.65)";
              }
            }}
          >
            <span style={{ fontSize: 13, lineHeight: 1 }}>{level.emoji}</span>
            <span style={{ lineHeight: 1 }}>{level.label}</span>
          </button>
        );
      })}
    </div>
  );
}
