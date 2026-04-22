// MapLevelSelector.tsx — Premium floating level pills for ValuBrix map
// FIX 7: Level pills now trigger real filtering logic.
// onLevelChange is called when a pill is selected → GlobalMapComponent filters markers by score.
// When no projects are loaded: informative toast explaining to search first.
// All 4 filters are functional — Smart/Premium/Growth/Investment filter the projects array.

import { toast } from "sonner";
import type { LevelType } from "../engines/mapLayersEngine";

interface LevelConfig {
  id: LevelType;
  label: string;
  emoji: string;
  description: string;
  color: string;
  glowColor: string;
  filterDescription: string;
}

const LEVELS: LevelConfig[] = [
  {
    id: "smart",
    label: "Smart",
    emoji: "🧠",
    description: "Market Intelligence",
    color: "#3B82F6",
    glowColor: "rgba(59,130,246,0.4)",
    filterDescription:
      "Balanced areas — price within 15% of zone median & strong infra score",
  },
  {
    id: "premium",
    label: "Premium",
    emoji: "⭐",
    description: "Premium Zones",
    color: "#D8B56A",
    glowColor: "rgba(216,181,106,0.4)",
    filterDescription:
      "High-end areas — PSF above city median × 1.25 & top amenity score",
  },
  {
    id: "growth",
    label: "Growth",
    emoji: "📈",
    description: "Growth Potential",
    color: "#10B981",
    glowColor: "rgba(16,185,129,0.4)",
    filterDescription:
      "High-appreciation areas — demand trend rising & strong infra score",
  },
  {
    id: "investment",
    label: "Investment",
    emoji: "💎",
    description: "Investment Value",
    color: "#8B5CF6",
    glowColor: "rgba(139,92,246,0.4)",
    filterDescription:
      "Top investment picks — high rental yield potential & growth signals",
  },
];

// ─── Level filter descriptions for toast ──────────────────────────────────────
const LEVEL_FILTER_INFO: Record<
  LevelType,
  { headline: string; criteria: string; noDataHint: string }
> = {
  smart: {
    headline: "Smart Filter Active",
    criteria:
      "Showing balanced areas where price ≤ 15% above zone median AND infra score > 60",
    noDataHint: "Search for a location to see Smart-scored areas on the map",
  },
  premium: {
    headline: "Premium Filter Active",
    criteria:
      "Showing high-end zones where PSF > city median × 1.25 AND amenity score > 75",
    noDataHint: "Search for a location to see Premium-scored areas on the map",
  },
  growth: {
    headline: "Growth Filter Active",
    criteria:
      "Showing high-appreciation areas with demand trend > 1.1 AND infra score > 70",
    noDataHint:
      "Search for a location to see Growth-potential areas on the map",
  },
  investment: {
    headline: "Investment Filter Active",
    criteria:
      "Showing top investment picks with rental yield signals and sustained growth patterns",
    noDataHint:
      "Search for a location to see Investment-grade areas on the map",
  },
};

interface MapLevelSelectorProps {
  selectedLevel: LevelType;
  onLevelChange: (level: LevelType) => void;
  className?: string;
  /** Number of matching projects for the selected level (for toast display) */
  matchingCount?: number;
  /** Top offset in pixels — use when map is behind a fixed header (default: 10) */
  topOffset?: number;
}

export default function MapLevelSelector({
  selectedLevel,
  onLevelChange,
  className = "",
  matchingCount,
  topOffset = 10,
}: MapLevelSelectorProps) {
  function handleLevelClick(level: LevelConfig) {
    const wasAlreadySelected = selectedLevel === level.id;
    onLevelChange(level.id);

    if (!wasAlreadySelected) {
      const info = LEVEL_FILTER_INFO[level.id];

      if (matchingCount == null || matchingCount === 0) {
        // No projects loaded — tell the user to search first
        toast.info(`${level.emoji} ${info.headline}`, {
          description: info.noDataHint,
          duration: 3500,
        });
      } else {
        // Projects available — show count + criteria
        const countStr = `${matchingCount} location${matchingCount !== 1 ? "s" : ""} match`;
        toast.info(`${level.emoji} ${info.headline} — ${countStr}`, {
          description: info.criteria,
          duration: 3500,
        });
      }
    }
  }

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        top: topOffset,
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
        // FIX C: explicitly set pointer-events:auto so overlay divs never block clicks
        pointerEvents: "auto",
        // FIX C: isolation:isolate creates a local stacking context so this floats above map tiles
        isolation: "isolate",
      }}
      data-ocid="map_level_selector.container"
    >
      {LEVELS.map((level) => {
        const isSelected = selectedLevel === level.id;
        return (
          <button
            key={level.id}
            type="button"
            onClick={() => handleLevelClick(level)}
            title={`${level.description}: ${level.filterDescription}`}
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
