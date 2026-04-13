// MapLayerTogglePanel.tsx — Floating, draggable layer toggle panel for ValuBrix maps
// Draggable via mouse/touch. Position saved to localStorage.
// Per-layer eye-icon visibility. Fully glassmorphic dark UI.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type MapLayerScope,
  type MapLayerType,
  getAvailableLayers,
  getLayerIcon,
  getLayerLabel,
} from "../engines/mapLayersEngine";

const POS_KEY = "mapLayerPanelPos";
const VIS_KEY = "mapLayerPanelVis";

function loadPos(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { x: number; y: number };
  } catch {
    return null;
  }
}

function savePos(x: number, y: number) {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify({ x, y }));
  } catch {
    /* ignore */
  }
}

function loadVisibility(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(VIS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function saveVisibility(v: Record<string, boolean>) {
  try {
    localStorage.setItem(VIS_KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

// Eye icons as inline SVG strings
function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

interface MapLayerTogglePanelProps {
  scope: MapLayerScope;
  activeLayers: MapLayerType[];
  onToggle: (layer: MapLayerType) => void;
  // hiddenLayers: layers that are active but eye-toggled off (invisible on map)
  hiddenLayers?: MapLayerType[];
  onToggleVisibility?: (layer: MapLayerType) => void;
  showSmartPins: boolean;
  onToggleSmartPins: () => void;
}

export default function MapLayerTogglePanel({
  scope,
  activeLayers,
  onToggle,
  hiddenLayers = [],
  onToggleVisibility,
  showSmartPins,
  onToggleSmartPins,
}: MapLayerTogglePanelProps) {
  const layers = getAvailableLayers(scope);

  // ── Draggable position state ──────────────────────────────────────────────
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    const saved = loadPos();
    if (saved) return saved;
    // Default: top-right (will be adjusted after mount)
    return { x: -1, y: 70 };
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, panelX: 0, panelY: 0 });

  // Set default right-aligned position after mount
  useEffect(() => {
    if (pos.x === -1 && panelRef.current) {
      const w = panelRef.current.offsetWidth || 168;
      setPos({ x: window.innerWidth - w - 10, y: 70 });
    }
  }, [pos.x]);

  // ── Per-layer eye visibility ──────────────────────────────────────────────
  const [layerVis, setLayerVis] = useState<Record<string, boolean>>(() => {
    const saved = loadVisibility();
    return saved;
  });

  function isVisible(layer: MapLayerType): boolean {
    // Default to visible if not set
    return layerVis[layer] !== false && !hiddenLayers.includes(layer);
  }

  function toggleEye(layer: MapLayerType) {
    setLayerVis((prev) => {
      const next = { ...prev, [layer]: !(prev[layer] !== false) };
      saveVisibility(next);
      return next;
    });
    onToggleVisibility?.(layer);
  }

  // ── Mouse drag handlers ───────────────────────────────────────────────────
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only drag on the title bar area (first 36px)
      if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
      dragging.current = true;
      dragStart.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        panelX: pos.x,
        panelY: pos.y,
      };
      e.preventDefault();
    },
    [pos],
  );

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      let newX = dragStart.current.panelX + dx;
      let newY = dragStart.current.panelY + dy;
      // Clamp to viewport
      const w = panelRef.current?.offsetWidth ?? 168;
      const h = panelRef.current?.offsetHeight ?? 240;
      newX = Math.max(6, Math.min(window.innerWidth - w - 6, newX));
      newY = Math.max(6, Math.min(window.innerHeight - h - 6, newY));
      setPos({ x: newX, y: newY });
    }
    function onMouseUp() {
      if (dragging.current) {
        dragging.current = false;
        setPos((p) => {
          savePos(p.x, p.y);
          return p;
        });
      }
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // ── Touch drag handlers ───────────────────────────────────────────────────
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
      const t = e.touches[0];
      dragging.current = true;
      dragStart.current = {
        mouseX: t.clientX,
        mouseY: t.clientY,
        panelX: pos.x,
        panelY: pos.y,
      };
    },
    [pos],
  );

  useEffect(() => {
    function onTouchMove(e: TouchEvent) {
      if (!dragging.current) return;
      const t = e.touches[0];
      const dx = t.clientX - dragStart.current.mouseX;
      const dy = t.clientY - dragStart.current.mouseY;
      let newX = dragStart.current.panelX + dx;
      let newY = dragStart.current.panelY + dy;
      const w = panelRef.current?.offsetWidth ?? 168;
      const h = panelRef.current?.offsetHeight ?? 240;
      newX = Math.max(6, Math.min(window.innerWidth - w - 6, newX));
      newY = Math.max(6, Math.min(window.innerHeight - h - 6, newY));
      setPos({ x: newX, y: newY });
      e.preventDefault();
    }
    function onTouchEnd() {
      if (dragging.current) {
        dragging.current = false;
        setPos((p) => {
          savePos(p.x, p.y);
          return p;
        });
      }
    }
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <div
      ref={panelRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      style={{
        position: "fixed",
        left: pos.x === -1 ? undefined : pos.x,
        right: pos.x === -1 ? 10 : undefined,
        top: pos.y,
        zIndex: 1002,
        background: "rgba(15, 23, 42, 0.95)",
        backdropFilter: "blur(14px)",
        border: "1px solid rgba(212, 175, 55, 0.35)",
        borderRadius: 14,
        padding: "10px 10px 10px 10px",
        boxShadow: "0 6px 28px rgba(0,0,0,0.6)",
        minWidth: 162,
        maxWidth: 210,
        userSelect: "none",
        cursor: "grab",
        touchAction: "none",
      }}
      data-ocid="map_layer_panel.container"
    >
      {/* Title row — drag handle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          marginBottom: 8,
          cursor: "grab",
        }}
      >
        <span
          style={{
            fontSize: 9,
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.15em",
          }}
        >
          ⠿⠿
        </span>
        <p
          style={{
            flex: 1,
            fontSize: 10,
            fontWeight: 700,
            color: "#D4AF37",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          Layers
        </p>
      </div>

      {/* Layer rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {layers.map((layer) => {
          const active = activeLayers.includes(layer);
          const visible = isVisible(layer);
          return (
            <div
              key={layer}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 6px",
                borderRadius: 8,
                border: active
                  ? "1px solid rgba(212,175,55,0.55)"
                  : "1px solid rgba(255,255,255,0.08)",
                background: active
                  ? "rgba(212,175,55,0.14)"
                  : "rgba(255,255,255,0.03)",
                transition: "all 0.15s ease",
              }}
            >
              {/* Layer toggle button */}
              <button
                type="button"
                onClick={() => onToggle(layer)}
                data-no-drag=""
                data-ocid={`map_layer_panel.layer_${layer}`}
                aria-label={`Toggle ${getLayerLabel(layer)}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  flex: 1,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  textAlign: "left",
                  minWidth: 0,
                }}
              >
                <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0 }}>
                  {getLayerIcon(layer)}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: active ? 700 : 500,
                    color: active ? "#D4AF37" : "rgba(255,255,255,0.6)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {getLayerLabel(layer)}
                </span>
              </button>

              {/* Eye visibility toggle — only when layer is active */}
              <button
                type="button"
                onClick={() => toggleEye(layer)}
                data-no-drag=""
                data-ocid={`map_layer_panel.eye_${layer}`}
                aria-label={
                  visible
                    ? `Hide ${getLayerLabel(layer)}`
                    : `Show ${getLayerLabel(layer)}`
                }
                title={visible ? "Hide layer" : "Show layer"}
                style={{
                  flexShrink: 0,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px",
                  color:
                    active && visible ? "#D4AF37" : "rgba(255,255,255,0.25)",
                  display: "flex",
                  alignItems: "center",
                  transition: "color 0.15s",
                }}
              >
                <EyeIcon visible={active && visible} />
              </button>
            </div>
          );
        })}

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "rgba(255,255,255,0.07)",
            margin: "2px 0",
          }}
        />

        {/* Smart Pins toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 6px",
            borderRadius: 8,
            border: showSmartPins
              ? "1px solid rgba(59,130,246,0.55)"
              : "1px solid rgba(255,255,255,0.08)",
            background: showSmartPins
              ? "rgba(59,130,246,0.14)"
              : "rgba(255,255,255,0.03)",
            transition: "all 0.15s ease",
          }}
        >
          <button
            type="button"
            onClick={onToggleSmartPins}
            data-no-drag=""
            data-ocid="map_layer_panel.smart_pins_toggle"
            aria-label="Toggle smart pins"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              flex: 1,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              textAlign: "left",
            }}
          >
            <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0 }}>
              📍
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: showSmartPins ? 700 : 500,
                color: showSmartPins ? "#60a5fa" : "rgba(255,255,255,0.6)",
                whiteSpace: "nowrap",
              }}
            >
              Smart Pins
            </span>
          </button>
          {showSmartPins && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#3b82f6",
                flexShrink: 0,
              }}
            />
          )}
        </div>
      </div>

      {/* Drag hint */}
      <p
        style={{
          fontSize: 8.5,
          color: "rgba(255,255,255,0.2)",
          textAlign: "center",
          marginTop: 7,
          marginBottom: 0,
          letterSpacing: "0.04em",
        }}
      >
        drag to move
      </p>
    </div>
  );
}
