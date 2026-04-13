// GlobalMapComponent.tsx — Single shared map component for all ValuBrix modules
// Replaces usage of both MapView.tsx and GeoIntelligenceMap.tsx
// Mode-based: area-intelligence (full layers), explore, buy, rent, sell, valuation
// @ts-nocheck

import { useEffect, useRef, useState } from "react";
import { ALL_LOCALITY_COORDS } from "../data/localityCoords";
import {
  type InfraLayerType,
  type LevelType,
  type MapLayerType,
  getHeatmapConfig,
  getHeatmapPoints,
  getInfraPinsForLayer,
  getInfraRadiusForZoom,
  getSmartPins,
} from "../engines/mapLayersEngine";
import { getOSRMRoute } from "../engines/osrmEngine";
import { reverseGeocode } from "../utils/reverseGeocode";
import MapInfrastructureLegend from "./MapInfrastructureLegend";
import MapInfrastructurePanel from "./MapInfrastructurePanel";
import MapLayerTogglePanel from "./MapLayerTogglePanel";
import MapLevelSelector from "./MapLevelSelector";

// ─── ProjectPin type (compatible with ScoredProject + generic marker) ─────────

export interface ProjectPin {
  id: string;
  name: string;
  builder?: string;
  locality: string;
  price_min?: number;
  price_max?: number;
  latitude: number;
  longitude: number;
  score?: { tag?: string; investmentScore?: number };
}

// ─── Mode definition ──────────────────────────────────────────────────────────

export type GlobalMapMode =
  | "valuation"
  | "explore"
  | "buy"
  | "rent"
  | "sell"
  | "area-intelligence";

// Keep backward-compat alias
export type UnifiedMapMode = GlobalMapMode;

// ─── Props ────────────────────────────────────────────────────────────────────

// ─── Dynamic POI pin type (for externally-fetched OSRM POIs) ─────────────────
export interface DynamicPoiPin {
  category: string;
  name: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  durationMins?: number;
}

export interface GlobalMapProps {
  mode: GlobalMapMode;
  center?: [number, number];
  zoom?: number;
  /** height prop is accepted but ignored when fullScreen=true */
  height?: string;
  projects?: ProjectPin[];
  onLocationSelect?: (lat: number, lng: number, locality: string) => void;
  onMarkerClick?: (project: ProjectPin) => void;
  showLayerToggle?: boolean;
  className?: string;
  /** BUG 1 FIX: When city changes, map re-centers and clears pin/circles */
  city?: string;
  /**
   * When true the component fills its parent container entirely (position:absolute inset-0).
   * The parent must be position:relative with defined height.
   * Default: false — uses the height prop as before.
   */
  fullScreen?: boolean;
  /** FIX 3: Callback fired whenever infra layer toggles change */
  onInfraLayerChange?: (activeLayers: Set<InfraLayerType>) => void;
  /** Hide the level selector pills overlay (top-left) */
  hideLevelSelector?: boolean;
  /** Hide the infrastructure panel overlay (right side circular toggles) */
  hideInfraPanel?: boolean;
  /** Hide the infrastructure legend overlay (bottom-left) */
  hideInfraLegend?: boolean;
  /** Hide the "Click or drag pin to explore" hint tooltip */
  hideClickHint?: boolean;
  /** Hide the smart pins legend (bottom-left color legend) */
  hideSmartPinsLegend?: boolean;
  /** Disable default smart pins entirely (use when dynamicPoiPins handles display) */
  disableDefaultSmartPins?: boolean;
  /**
   * ROOT CAUSE 1 FIX: Externally-fetched POI pins (from OSRM engine) to render on the map.
   * When provided alongside activePoiCategory, only matching category pins are shown.
   */
  dynamicPoiPins?: DynamicPoiPin[];
  /**
   * ROOT CAUSE 1 FIX: Which category filter is currently active (e.g. 'metro', 'techpark').
   * When set, only dynamicPoiPins matching this category are rendered.
   */
  activePoiCategory?: string;
}

// Keep backward-compat alias
export type UnifiedMapProps = GlobalMapProps;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const KNOWN_LOCALITIES = Object.entries(ALL_LOCALITY_COORDS).map(
  ([name, coords]) => ({
    name: name
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    lat: coords.lat,
    lng: coords.lng,
  }),
);

function findNearestLocality(latVal: number, lngVal: number): string {
  let nearest = KNOWN_LOCALITIES[0];
  let minDist = Number.POSITIVE_INFINITY;
  for (const loc of KNOWN_LOCALITIES) {
    const d = Math.sqrt((loc.lat - latVal) ** 2 + (loc.lng - lngVal) ** 2);
    if (d < minDist) {
      minDist = d;
      nearest = loc;
    }
  }
  return nearest?.name ?? "Bangalore";
}

function formatPrice(rupees: number): string {
  const cr = rupees / 10_000_000;
  if (cr >= 1) return `₹${cr.toFixed(2)}Cr`;
  return `₹${(rupees / 100_000).toFixed(0)}L`;
}

function getTagColor(tag: string): string {
  switch (tag) {
    case "Luxury":
      return "#B8860B";
    case "Premium":
      return "#7c3aed";
    case "Best Value":
      return "#047857";
    case "Budget Pick":
      return "#1d4ed8";
    case "Listing":
      return "#0369a1";
    default:
      return "#374151";
  }
}

function getPinColor(type: string): string {
  switch (type) {
    case "tech_park":
      return "#D4AF37";
    case "metro":
      return "#3b82f6";
    case "bus_stop":
      return "#f97316";
    case "railway":
      return "#8b5cf6";
    case "hospital":
      return "#ef4444";
    case "school":
      return "#10b981";
    case "college":
      return "#0ea5e9";
    case "mall":
      return "#ec4899";
    case "airport":
      return "#06b6d4";
    case "highway":
      return "#f97316";
    default:
      return "#6b7280";
  }
}

// BUG 3 FIX: 3 concentric circles all anchored to the EXACT pin coordinates
// Level 1 — Micro Zone: 1km radius (blue)
// Level 2 — Growth Zone: 3km radius (green)
// Level 3 — City Demand: 8km radius (orange)
function getHeatZones(latVal: number, lngVal: number) {
  return [
    { lat: latVal, lng: lngVal, radius: 1000, color: "#3b82f6" }, // Level 1: Micro Zone 1km
    { lat: latVal, lng: lngVal, radius: 3000, color: "#22c55e" }, // Level 2: Growth Zone 3km
    { lat: latVal, lng: lngVal, radius: 8000, color: "#f97316" }, // Level 3: City Demand 8km
  ];
}

function addHeatCircles(
  map: any,
  L: any,
  latVal: number,
  lngVal: number,
): any[] {
  const added: any[] = [];
  const zones = getHeatZones(latVal, lngVal);
  const labels = ["Micro Zone (1km)", "Growth Zone (3km)", "City Demand (8km)"];
  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];
    const circle = L.circle([zone.lat, zone.lng], {
      radius: zone.radius,
      color: zone.color,
      fillColor: zone.color,
      // Outer circles more transparent so inner ones are visible
      fillOpacity: i === 0 ? 0.18 : i === 1 ? 0.1 : 0.06,
      weight: 2,
      opacity: i === 0 ? 0.7 : i === 1 ? 0.55 : 0.4,
    }).addTo(map);
    circle.bindTooltip(labels[i], { permanent: false, direction: "top" });
    added.push(circle);
  }
  return added;
}

// biome-ignore lint/correctness/noUnusedVariables: kept for potential tooltip use
function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function formatEmployees(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

function buildSmartPinPopup(pin: any): string {
  const bgColor = getPinColor(pin.type);
  const typeLabel =
    pin.type === "tech_park"
      ? "Tech Park"
      : pin.type === "metro"
        ? "Metro Station"
        : pin.type === "bus_stop"
          ? "Bus Stop"
          : pin.type === "railway"
            ? "Railway Station"
            : pin.type === "hospital"
              ? "Hospital"
              : "School";

  const metaLine =
    pin.type === "tech_park" && pin.employees
      ? `<span style="color:#94a3b8;font-size:11px">👥 ${formatEmployees(pin.employees)} employees</span>`
      : pin.type === "metro" && pin.line
        ? `<span style="color:#94a3b8;font-size:11px">🚇 ${pin.line} Line</span>`
        : "";

  return `
    <div style="background:#111827;color:#f1f5f9;border-radius:10px;padding:12px 14px;min-width:180px;max-width:220px;font-family:system-ui,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.08);">
      <div style="font-weight:700;font-size:13px;margin-bottom:3px;color:#f8fafc">${pin.emoji} ${pin.name}</div>
      <div style="font-size:10px;color:#64748b;margin-bottom:4px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase">${typeLabel}</div>
      <div id="osrm-dist-${pin.id ?? pin.name.replace(/\s+/g, "-")}" style="font-size:11px;color:#f59e0b;margin-bottom:6px">🚗 Loading driving distance...</div>
      ${metaLine}
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
        <span style="background:${bgColor}22;color:${bgColor};border:1px solid ${bgColor}55;border-radius:4px;font-size:10px;font-weight:700;padding:2px 7px;">${pin.impactTag}</span>
      </div>
      <div style="margin-top:6px;font-size:11px;color:#94a3b8">${pin.impactDescription}</div>
    </div>
  `;
}

function loadLeaflet(): Promise<any> {
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

// BUG 1 FIX: City centers for auto-centering when city changes
const CITY_CENTERS_MAP: Record<string, [number, number]> = {
  Bangalore: [12.9716, 77.5946],
  Pune: [18.5204, 73.8567],
  Hyderabad: [17.385, 78.4867],
  Mumbai: [19.076, 72.8777],
  Delhi: [28.6139, 77.209],
  "Delhi NCR": [28.6139, 77.209],
};

// ─── Mode config ──────────────────────────────────────────────────────────────

function getModeConfig(mode: GlobalMapMode) {
  const isFullIntel = mode === "area-intelligence";
  const isExplore = mode === "explore";
  return {
    // area-intelligence: all 6 layers; others: basic heatmap + rental yield
    layerScope: (isFullIntel ? "full" : "basic") as "full" | "basic",
    // Show smart pins by default for area-intelligence; toggle for others
    defaultShowPins: isFullIntel || isExplore,
    // Allow map click to select location for valuation mode
    clickable: mode === "valuation" || mode === "area-intelligence",
    // Show project markers
    showProjects: ["buy", "rent", "sell", "valuation", "explore"].includes(
      mode,
    ),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GlobalMapComponent({
  mode,
  center = [12.9716, 77.5946],
  zoom = 12,
  height = "400px",
  projects = [],
  onLocationSelect,
  onMarkerClick,
  showLayerToggle = false,
  className = "",
  city,
  fullScreen = false,
  onInfraLayerChange,
  hideLevelSelector = false,
  hideInfraPanel = false,
  hideInfraLegend = false,
  hideClickHint = false,
  hideSmartPinsLegend = false,
  disableDefaultSmartPins = false,
  dynamicPoiPins,
  activePoiCategory,
}: GlobalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circlesRef = useRef<any[]>([]);
  const layerGroupsRef = useRef<Map<MapLayerType, any[]>>(new Map());
  const pinMarkersRef = useRef<any[]>([]);
  const projectMarkersRef = useRef<any[]>([]);
  const renderedPinsRef = useRef(false);
  /** Tracks currently drawn OSRM route polyline — removed when popup closes */
  const routeLayerRef = useRef<any>(null);
  /** ROOT CAUSE 1 FIX: Markers for externally-fetched dynamic POI pins */
  const dynamicPoiMarkersRef = useRef<any[]>([]);

  const [ready, setReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pinLabel, setPinLabel] = useState("");
  const [pinLat, setPinLat] = useState(center[0]);
  const [pinLng, setPinLng] = useState(center[1]);

  // Layer panel state (internal)
  const [activeLayers, setActiveLayers] = useState<MapLayerType[]>([]);
  const [hiddenLayers, setHiddenLayers] = useState<MapLayerType[]>([]);
  const [showSmartPins, setShowSmartPins] = useState(
    () => !disableDefaultSmartPins && getModeConfig(mode).defaultShowPins,
  );

  // ─── Premium level selector + infra panel state ──────────────────────────
  const [selectedLevel, setSelectedLevel] = useState<LevelType>("smart");
  const [activeInfraLayers, setActiveInfraLayers] = useState<
    Set<InfraLayerType>
  >(new Set());
  const infraMarkersRef = useRef<Map<InfraLayerType, any[]>>(new Map());

  const cfg = getModeConfig(mode);
  const onLocationSelectRef = useRef(onLocationSelect);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onInfraLayerChangeRef = useRef(onInfraLayerChange);
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);
  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);
  useEffect(() => {
    onInfraLayerChangeRef.current = onInfraLayerChange;
  }, [onInfraLayerChange]);

  // BUG 1 FIX: Track previous city to detect changes
  const prevCityRef = useRef<string | undefined>(city);

  // BUG 1 FIX: When city prop changes, re-center map and clear pin/circles
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    if (!city || city === prevCityRef.current) return;
    prevCityRef.current = city;

    const newCenter = CITY_CENTERS_MAP[city] ?? [12.9716, 77.5946];

    // Clear pin marker
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    // Clear heat circles
    for (const c of circlesRef.current) mapRef.current.removeLayer(c);
    circlesRef.current = [];

    // Clear smart pins
    for (const m of pinMarkersRef.current) mapRef.current.removeLayer(m);
    pinMarkersRef.current = [];
    renderedPinsRef.current = false;

    // Clear all active layers
    for (const [, circles] of layerGroupsRef.current.entries()) {
      for (const c of circles) mapRef.current.removeLayer(c);
    }
    layerGroupsRef.current.clear();

    // Reset label & pin state
    setPinLabel("");
    setPinLat(newCenter[0]);
    setPinLng(newCenter[1]);

    // BUG 5 FIX: Re-center to city zoom 11
    mapRef.current.setView(newCenter, 11, { animate: true });
    mapRef.current.invalidateSize();
  }, [city]);

  // ─── Map initialisation ───────────────────────────────────────────────────

  // BUG 5 FIX: When center prop changes (locality selected), zoom to 13 AND redraw circles
  const prevCenterRef = useRef(center);
  useEffect(() => {
    // FIX 1: ALWAYS update pinLat/pinLng when center prop changes,
    // regardless of whether markerRef or window.L is available yet.
    const [newLat, newLng] = center;
    const [prevLat, prevLng] = prevCenterRef.current;

    if (
      Math.abs(prevLat - newLat) > 0.001 ||
      Math.abs(prevLng - newLng) > 0.001
    ) {
      prevCenterRef.current = center;
      // Always update pin state so OSRM uses correct origin
      setPinLat(newLat);
      setPinLng(newLng);

      if (mapRef.current) {
        mapRef.current.setView([newLat, newLng], 13, { animate: true });
        // BUG 5 FIX: Redraw heat circles centered on new location
        if (window.L) {
          for (const c of circlesRef.current) mapRef.current.removeLayer(c);
          circlesRef.current = addHeatCircles(
            mapRef.current,
            window.L,
            newLat,
            newLng,
          );
          // Update pin marker position if it exists
          if (markerRef.current) {
            markerRef.current.setLatLng([newLat, newLng]);
          }
        }
      }
    }
  }, [center]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: map init runs once on mount
  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      try {
        const L = await loadLeaflet();
        if (cancelled || !containerRef.current || mapRef.current) return;

        L.Icon.Default.prototype._getIconUrl = undefined;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        const map = L.map(containerRef.current, {
          zoomControl: true,
          scrollWheelZoom: false,
          worldCopyJump: true,
          minZoom: 2,
          maxZoom: 19,
        }).setView(center, zoom);
        mapRef.current = map;

        // CartoDB Voyager tiles — bright, clear
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 19,
            minZoom: 2,
          },
        ).addTo(map);

        for (const d of [100, 500, 1000])
          setTimeout(() => map?.invalidateSize(), d);

        // Add initial heat circles
        circlesRef.current = addHeatCircles(map, L, center[0], center[1]);

        // Location marker (blue pulsing pin)
        const icon = L.divIcon({
          className: "",
          html: `
            <div style="position:relative;width:32px;height:32px;">
              <div style="
                width:32px;height:32px;
                background:#3B82F6;
                border-radius:50% 50% 50% 0;
                transform:rotate(-45deg);
                border:3px solid #ffffff;
                box-shadow:0 3px 12px rgba(59,130,246,0.7),0 0 0 4px rgba(59,130,246,0.2);
              "></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        const marker = L.marker(center, {
          icon,
          draggable: cfg.clickable,
        }).addTo(map);
        markerRef.current = marker;

        // Dragging (valuation / area-intelligence mode)
        if (cfg.clickable) {
          marker.on("dragstart", () => setIsDragging(true));
          marker.on("dragend", (e: any) => {
            const newLat = e.target.getLatLng().lat;
            const newLng = e.target.getLatLng().lng;
            const fallbackName = findNearestLocality(newLat, newLng);
            setPinLat(newLat);
            setPinLng(newLng);
            setPinLabel("Loading...");
            setIsDragging(false);
            // BUG 5 FIX: zoom to 14 on pin drag end
            map.setView([newLat, newLng], 14);
            for (const c of circlesRef.current) map.removeLayer(c);
            // BUG 3 FIX: redraw 3 concentric circles at new pin position
            circlesRef.current = addHeatCircles(map, L, newLat, newLng);
            // Reset smart pins
            for (const m of pinMarkersRef.current) map.removeLayer(m);
            pinMarkersRef.current = [];
            renderedPinsRef.current = false;
            reverseGeocode(newLat, newLng).then((realName) => {
              const displayName =
                realName !== "Unknown location" ? realName : fallbackName;
              setPinLabel(displayName);
              setIsDragging(false);
              onLocationSelectRef.current?.(newLat, newLng, displayName);
            });
          });

          map.on("click", (e: any) => {
            const newLat = e.latlng.lat;
            const newLng = e.latlng.lng;
            const fallbackName = findNearestLocality(newLat, newLng);
            marker.setLatLng([newLat, newLng]);
            setPinLat(newLat);
            setPinLng(newLng);
            setPinLabel("Loading...");
            // BUG 5 FIX: zoom to 14 on map click (locality selected)
            map.setView([newLat, newLng], 14);
            for (const c of circlesRef.current) map.removeLayer(c);
            // BUG 3 FIX: redraw 3 concentric circles at clicked position
            circlesRef.current = addHeatCircles(map, L, newLat, newLng);
            for (const m of pinMarkersRef.current) map.removeLayer(m);
            pinMarkersRef.current = [];
            renderedPinsRef.current = false;
            reverseGeocode(newLat, newLng).then((realName) => {
              const displayName =
                realName !== "Unknown location" ? realName : fallbackName;
              setPinLabel(displayName);
              onLocationSelectRef.current?.(newLat, newLng, displayName);
            });
          });
        }

        setReady(true);
      } catch (err) {
        console.error("GlobalMapComponent init error:", err);
      }
    }

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
      circlesRef.current = [];
      layerGroupsRef.current.clear();
      pinMarkersRef.current = [];
      projectMarkersRef.current = [];
      renderedPinsRef.current = false;
    };
    // NOTE: intentionally empty deps — map initialises once using captured closure values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Sync active map layers ────────────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L || !ready) return;

    // Remove deactivated layers
    for (const [lt, circles] of layerGroupsRef.current.entries()) {
      if (!activeLayers.includes(lt)) {
        for (const c of circles) map.removeLayer(c);
        layerGroupsRef.current.delete(lt);
      }
    }

    // Add / update active layers
    for (const lt of activeLayers) {
      const isHidden = hiddenLayers.includes(lt);
      if (layerGroupsRef.current.has(lt)) {
        const circles = layerGroupsRef.current.get(lt)!;
        for (const c of circles) {
          c.setStyle({
            opacity: isHidden ? 0 : 0.5,
            fillOpacity: isHidden ? 0 : 0.35,
          });
        }
        continue;
      }
      const points = getHeatmapPoints(lt, pinLat, pinLng);
      const circles: any[] = [];
      for (const pt of points) {
        const c = L.circle([pt.lat, pt.lng], {
          radius: pt.radius,
          color: pt.color,
          fillColor: pt.color,
          fillOpacity: isHidden ? 0 : 0.35,
          opacity: isHidden ? 0 : 0.5,
          stroke: false,
        }).addTo(map);
        circles.push(c);
      }
      layerGroupsRef.current.set(lt, circles);
    }
  }, [activeLayers, hiddenLayers, ready, pinLat, pinLng]);

  // ─── Sync smart pins ──────────────────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L || !ready) return;

    const poiDensityActive = activeLayers.includes("poi_density");
    const poiDensityHidden = hiddenLayers.includes("poi_density");
    const shouldShowPins =
      cfg.layerScope === "full"
        ? showSmartPins && poiDensityActive && !poiDensityHidden
        : showSmartPins;

    if (!shouldShowPins) {
      for (const m of pinMarkersRef.current) map.removeLayer(m);
      pinMarkersRef.current = [];
      renderedPinsRef.current = false;
      return;
    }

    if (renderedPinsRef.current) return;

    const pins = getSmartPins(pinLat, pinLng, 25);
    const markers: any[] = [];

    for (const pin of pins) {
      const bgColor = getPinColor(pin.type);

      const icon = L.divIcon({
        className: "",
        html: `
          <div style="
            width:32px;height:32px;
            background:${bgColor};
            border-radius:50%;
            border:2px solid rgba(255,255,255,0.85);
            box-shadow:0 2px 10px rgba(0,0,0,0.45);
            display:flex;align-items:center;justify-content:center;
            font-size:15px;line-height:1;
            cursor:pointer;
          ">${pin.emoji}</div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18],
      });

      const m = L.marker([pin.lat, pin.lng], {
        icon,
        zIndexOffset:
          pin.priority === "high" ? 900 : pin.priority === "medium" ? 500 : 0,
      })
        .addTo(map)
        .bindPopup(buildSmartPinPopup(pin), {
          maxWidth: 240,
          className: "valubrix-smart-popup",
        });

      // On popup open: fetch OSRM route + update distance text
      m.on("popupopen", () => {
        const originLat = pinLat;
        const originLng = pinLng;
        const destLat = pin.lat;
        const destLng = pin.lng;
        const distElemId = `osrm-dist-${pin.id ?? pin.name.replace(/\s+/g, "-")}`;

        getOSRMRoute(originLat, originLng, destLat, destLng).then((route) => {
          // Update distance label in popup DOM
          const distElem = document.getElementById(distElemId);
          if (distElem) {
            if (route && route.distanceKm > 0) {
              distElem.textContent = `🚗 ${route.distanceKm.toFixed(1)} km • ${Math.round(route.durationMins)} mins driving`;
            } else {
              // FIX 5d: hide distance line when OSRM fails — don't show wrong value
              distElem.style.display = "none";
            }
          }

          // Draw route polyline on map
          if (route?.geometry?.coordinates) {
            // Remove old route
            if (routeLayerRef.current) {
              map.removeLayer(routeLayerRef.current);
              routeLayerRef.current = null;
            }
            const latlngs = route.geometry.coordinates.map(
              ([lng, lat]: [number, number]) => [lat, lng],
            );
            routeLayerRef.current = L.polyline(latlngs, {
              color: "#3b82f6",
              weight: 4,
              opacity: 0.8,
              dashArray: "8, 4",
            }).addTo(map);
          }
        });
      });

      // On popup close: remove route
      m.on("popupclose", () => {
        if (routeLayerRef.current && mapRef.current) {
          mapRef.current.removeLayer(routeLayerRef.current);
          routeLayerRef.current = null;
        }
      });

      markers.push(m);
    }

    pinMarkersRef.current = markers;
    renderedPinsRef.current = true;
  }, [
    showSmartPins,
    activeLayers,
    hiddenLayers,
    ready,
    pinLat,
    pinLng,
    cfg.layerScope,
  ]);

  // ─── Sync project markers ─────────────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L || !ready || !cfg.showProjects) return;

    for (const m of projectMarkersRef.current) map.removeLayer(m);
    projectMarkersRef.current = [];

    const validProjects = (projects || []).filter(
      (p) =>
        p.latitude &&
        p.longitude &&
        !Number.isNaN(p.latitude) &&
        !Number.isNaN(p.longitude) &&
        p.latitude !== 0 &&
        p.longitude !== 0,
    );

    for (const project of validProjects) {
      const color = getTagColor(project.score?.tag ?? "");
      const icon = L.divIcon({
        className: "",
        html: `<svg width="32" height="42" viewBox="0 0 32 42" fill="none">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 11.314 16 26 16 26S32 27.314 32 16C32 7.163 24.837 0 16 0z" fill="${color}" stroke="white" stroke-width="2.5"/>
          <circle cx="16" cy="16" r="7" fill="white" fill-opacity="0.95"/>
        </svg>`,
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -44],
      });

      const m = L.marker([project.latitude, project.longitude], { icon });

      const popup = document.createElement("div");
      popup.style.cssText =
        "min-width:190px;font-family:sans-serif;background:#fff;border-radius:8px;overflow:hidden;";
      popup.innerHTML = `
        <div style="font-weight:700;font-size:13px;margin-bottom:2px;color:#111">${project.name}</div>
        ${project.builder ? `<div style="font-size:11px;color:#555;margin-bottom:2px">${project.builder}</div>` : ""}
        <div style="font-size:11px;color:#777;margin-bottom:4px">${project.locality}</div>
        ${project.price_min != null ? `<div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:6px">${formatPrice(project.price_min)}${project.price_max ? ` – ${formatPrice(project.price_max)}` : ""}</div>` : ""}
        ${project.score?.investmentScore != null ? `<span style="background:#1e3a5f;color:#fff;padding:2px 8px;border-radius:10px;font-size:10px">Score: ${project.score.investmentScore}</span>` : ""}
      `;

      if (onMarkerClickRef.current) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "View Details";
        btn.style.cssText =
          "width:100%;background:#1e3a5f;color:#fff;border:none;border-radius:6px;padding:7px 0;font-size:11px;cursor:pointer;font-weight:700;margin-top:8px;display:block;";
        btn.onclick = () => onMarkerClickRef.current!(project);
        popup.appendChild(btn);
      }

      m.bindPopup(L.popup({ maxWidth: 240 }).setContent(popup));
      m.addTo(map);
      projectMarkersRef.current.push(m);
    }
  }, [projects, ready, cfg.showProjects]);

  // ─── Sync infrastructure layer markers (ALL 10 types) ───────────────────
  // This single effect handles metro/railway/bus_stop/hospital/school/tech_park
  // AND college/mall/airport/highway via getInfraPinsForLayer().
  // Each type gets its own LayerGroup keyed in infraMarkersRef so toggling OFF
  // removes ONLY that type's markers.

  const lastZoomRef = useRef<number>(zoom);

  // biome-ignore lint/correctness/useExhaustiveDependencies: zoom is only used as initial value
  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L || !ready) return;

    // Compute dynamic radius from current zoom
    const currentZoom: number = map.getZoom ? map.getZoom() : zoom;
    const radiusKm = getInfraRadiusForZoom(currentZoom);

    // Color mapping per layer type
    const LAYER_COLORS: Record<InfraLayerType, string> = {
      metro: "#3B82F6",
      railway: "#8B5CF6",
      bus_stop: "#F59E0B",
      hospital: "#EF4444",
      school: "#10B981",
      college: "#06B6D4",
      tech_park: "#F97316",
      mall: "#EC4899",
      airport: "#6B7280",
      highway: "#84CC16",
    };

    // Remove markers for deactivated infra layers
    for (const [layerId, markers] of infraMarkersRef.current.entries()) {
      if (!activeInfraLayers.has(layerId)) {
        for (const m of markers) map.removeLayer(m);
        infraMarkersRef.current.delete(layerId);
      }
    }

    // Add markers for newly activated infra layers
    for (const layerId of activeInfraLayers) {
      // Clear and re-add if pin/zoom changed (will be triggered by deps)
      if (infraMarkersRef.current.has(layerId)) {
        // Already rendered — skip (will be re-rendered via deps change)
        continue;
      }

      const pins = getInfraPinsForLayer(layerId, pinLat, pinLng, radiusKm);
      const markers: any[] = [];
      const bgColor = LAYER_COLORS[layerId] ?? "#6B7280";

      for (const pin of pins) {
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:34px;height:34px;
            background:${bgColor};
            border-radius:50%;
            border:2px solid rgba(255,255,255,0.9);
            box-shadow:0 2px 10px rgba(0,0,0,0.5),0 0 8px ${bgColor}66;
            display:flex;align-items:center;justify-content:center;
            font-size:15px;line-height:1;cursor:pointer;
          ">${pin.emoji}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          popupAnchor: [0, -20],
        });

        // Safe ID for DOM lookup
        const safeName = pin.name.replace(/[^a-zA-Z0-9]/g, "-");
        const distElemId = `osrm-infra-${layerId}-${safeName}`;

        const popupHtml = `
          <div style="background:#111827;color:#f1f5f9;border-radius:10px;padding:12px 14px;min-width:160px;max-width:220px;font-family:system-ui,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.08);">
            <div style="font-size:20px;margin-bottom:4px">${pin.emoji}</div>
            <div style="font-weight:700;font-size:13px;margin-bottom:3px;color:#f8fafc">${pin.name}</div>
            <div id="${distElemId}" style="font-size:11px;color:#f59e0b">🚗 Loading driving distance...</div>
          </div>`;

        const m = L.marker([pin.lat, pin.lng], { icon })
          .addTo(map)
          .bindPopup(popupHtml, {
            maxWidth: 240,
            className: "valubrix-smart-popup",
          });

        // On popup open: fetch OSRM route + draw on map
        m.on("popupopen", () => {
          const originLat = pinLat;
          const originLng = pinLng;

          getOSRMRoute(originLat, originLng, pin.lat, pin.lng).then((route) => {
            const distElem = document.getElementById(distElemId);
            if (distElem) {
              if (route && route.distanceKm > 0) {
                distElem.textContent = `🚗 ${route.distanceKm.toFixed(1)} km • ${Math.round(route.durationMins)} mins driving`;
                distElem.style.color = "#f59e0b";
              } else {
                // FIX 5d: hide distance line instead of showing wrong text
                distElem.style.display = "none";
              }
            }

            // Draw route polyline
            if (route?.geometry?.coordinates) {
              if (routeLayerRef.current) {
                map.removeLayer(routeLayerRef.current);
                routeLayerRef.current = null;
              }
              const latlngs = route.geometry.coordinates.map(
                ([lng, lat]: [number, number]) => [lat, lng],
              );
              routeLayerRef.current = L.polyline(latlngs, {
                color: bgColor,
                weight: 4,
                opacity: 0.85,
                dashArray: "8, 4",
              }).addTo(map);
            }
          });
        });

        // On popup close: remove route polyline
        m.on("popupclose", () => {
          if (routeLayerRef.current && mapRef.current) {
            mapRef.current.removeLayer(routeLayerRef.current);
            routeLayerRef.current = null;
          }
        });

        markers.push(m);
      }
      infraMarkersRef.current.set(layerId, markers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInfraLayers, ready, pinLat, pinLng]);

  // ─── Re-render infra markers when zoom changes significantly ─────────────
  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L || !ready || activeInfraLayers.size === 0) return;

    function onZoomEnd() {
      const newZoom: number = map.getZoom();
      if (Math.abs(newZoom - lastZoomRef.current) >= 1) {
        lastZoomRef.current = newZoom;
        // Clear all infra markers so they re-render at new radius
        for (const [, markers] of infraMarkersRef.current.entries()) {
          for (const m of markers) map.removeLayer(m);
        }
        infraMarkersRef.current.clear();
        // Trigger re-render by forcing a new Set (same content, new reference)
        setActiveInfraLayers((prev) => new Set(prev));
      }
    }

    map.on("zoomend", onZoomEnd);
    return () => {
      map.off("zoomend", onZoomEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, activeInfraLayers]);

  // ─── ROOT CAUSE 1 FIX: Render dynamic POI pins from external OSRM data ──────
  // When dynamicPoiPins + activePoiCategory props are provided (e.g. from AreaIntelligencePage),
  // render those pins as map markers. This is the MISSING link that allows filter-click → map display.
  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;

    // Clear any previously rendered dynamic POI markers
    for (const m of dynamicPoiMarkersRef.current) {
      if (map) map.removeLayer(m);
    }
    dynamicPoiMarkersRef.current = [];

    if (!map || !L || !ready) return;
    if (!dynamicPoiPins || dynamicPoiPins.length === 0) return;

    console.log(
      "[MAP] Received dynamic POIs:",
      dynamicPoiPins.length,
      "category:",
      activePoiCategory,
    );

    // Filter to only pins matching the active category (if set)
    const pinsToRender = activePoiCategory
      ? dynamicPoiPins.filter((p) => p.category === activePoiCategory)
      : dynamicPoiPins;

    console.log(
      "[MAP] Rendering",
      pinsToRender.length,
      "markers for category:",
      activePoiCategory,
    );

    const markers: any[] = [];

    for (const pin of pinsToRender) {
      const bgColor = getPinColor(pin.category);
      const emoji =
        pin.category === "metro"
          ? "🚇"
          : pin.category === "railway"
            ? "🚂"
            : pin.category === "bus_stop"
              ? "🚌"
              : pin.category === "hospital"
                ? "🏥"
                : pin.category === "school"
                  ? "🏫"
                  : pin.category === "college"
                    ? "🎓"
                    : pin.category === "tech_park"
                      ? "💼"
                      : pin.category === "mall"
                        ? "🛍️"
                        : pin.category === "airport"
                          ? "✈️"
                          : pin.category === "highway"
                            ? "🛣️"
                            : "📍";

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:34px;height:34px;
          background:${bgColor};
          border-radius:50%;
          border:2px solid rgba(255,255,255,0.9);
          box-shadow:0 2px 10px rgba(0,0,0,0.5),0 0 8px ${bgColor}66;
          display:flex;align-items:center;justify-content:center;
          font-size:15px;line-height:1;cursor:pointer;
        ">${emoji}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -20],
      });

      const distLabel =
        pin.distanceKm != null && pin.durationMins != null
          ? `🚗 ${pin.distanceKm.toFixed(1)} km • ${Math.round(pin.durationMins)} mins driving`
          : pin.distanceKm != null
            ? `🚗 ${pin.distanceKm.toFixed(1)} km driving`
            : "🚗 Distance unavailable";

      const popupHtml = `
        <div style="background:#111827;color:#f1f5f9;border-radius:10px;padding:12px 14px;min-width:160px;max-width:220px;font-family:system-ui,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.08);">
          <div style="font-size:20px;margin-bottom:4px">${emoji}</div>
          <div style="font-weight:700;font-size:13px;margin-bottom:3px;color:#f8fafc">${pin.name}</div>
          <div style="font-size:11px;color:#f59e0b">${distLabel}</div>
        </div>`;

      const m = L.marker([pin.lat, pin.lng], { icon })
        .addTo(map)
        .bindPopup(popupHtml, {
          maxWidth: 240,
          className: "valubrix-smart-popup",
        });

      markers.push(m);
    }

    dynamicPoiMarkersRef.current = markers;
  }, [dynamicPoiPins, activePoiCategory, ready]);

  // ─── Level selector: update heat-circle colors when level changes ────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || circlesRef.current.length === 0) return;
    const config = getHeatmapConfig(selectedLevel);
    // The 3 concentric circles correspond to gradient stops 0.2 / 0.5 / 1.0
    // (innermost = lowest intensity key, outermost = highest intensity key)
    const stops = Object.keys(config.gradient)
      .map(Number)
      .sort((a, b) => a - b);
    const colors = stops.map((s) => config.gradient[s]);
    // Pad/trim so we always have exactly 3 entries (one per circle)
    while (colors.length < 3) colors.push(colors[colors.length - 1]);

    circlesRef.current.forEach((circle, i) => {
      const color = colors[Math.min(i, colors.length - 1)];
      circle.setStyle({
        color,
        fillColor: color,
      });
    });
  }, [selectedLevel]);

  function handleLayerToggle(layer: MapLayerType) {
    setActiveLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer],
    );
  }

  function handleToggleVisibility(layer: MapLayerType) {
    setHiddenLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer],
    );
  }

  function handleToggleSmartPins() {
    setShowSmartPins((v) => !v);
    renderedPinsRef.current = false;
  }

  function handleInfraLayerToggle(layer: InfraLayerType) {
    setActiveInfraLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      // FIX 3: notify parent of infra layer changes
      onInfraLayerChangeRef.current?.(next);
      return next;
    });
  }

  function handleLevelChange(level: LevelType) {
    setSelectedLevel(level);
  }

  // ─── Container style computation ──────────────────────────────────────────
  // fullScreen=true  → fills parent completely (parent must be position:relative with height)
  // fullScreen=false → fixed height as before, no layout compression

  const outerStyle: React.CSSProperties = fullScreen
    ? {
        position: "absolute",
        inset: 0,
        background: "#e8eaed",
        overflow: "hidden",
      }
    : {
        position: "relative",
        width: "100%",
        height,
        minHeight: height,
        maxHeight: height,
        flexShrink: 0,
        flexGrow: 0,
        overflow: "hidden",
        background: "#e8eaed",
        border: "1px solid rgba(0,0,0,0.1)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        contain: "strict",
      };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className={`${fullScreen ? "" : "rounded-xl"} ${className}`}
      style={outerStyle}
    >
      {/* Styles */}
      <style>{`
        #global-map-${mode} .leaflet-container { background: #e8eaed !important; }
        #global-map-${mode} .leaflet-tile-pane { opacity: 1 !important; }
        #global-map-${mode} .leaflet-control-zoom a {
          background: #fff !important; color: #1e3a5f !important;
          border-color: #ccc !important; font-weight: 700 !important;
        }
        #global-map-${mode} .leaflet-control-zoom a:hover { background: #f0f4ff !important; }
        .valubrix-smart-popup .leaflet-popup-content-wrapper {
          background: transparent !important; border: none !important;
          box-shadow: none !important; padding: 0 !important;
        }
        .valubrix-smart-popup .leaflet-popup-content { margin: 0 !important; }
        .valubrix-smart-popup .leaflet-popup-tip-container { display: none !important; }
      `}</style>

      {/* Leaflet container — fills entire outer div */}
      <div
        id={`global-map-${mode}`}
        ref={containerRef}
        style={{ width: "100%", height: "100%", position: "relative" }}
      />

      {/* Dragging overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/20">
          <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Layer toggle panel — only when showLayerToggle=true (not forced for area-intelligence) */}
      {showLayerToggle && ready && (
        <MapLayerTogglePanel
          scope={cfg.layerScope}
          activeLayers={activeLayers}
          onToggle={handleLayerToggle}
          hiddenLayers={hiddenLayers}
          onToggleVisibility={handleToggleVisibility}
          showSmartPins={showSmartPins}
          onToggleSmartPins={handleToggleSmartPins}
        />
      )}

      {/* ── Premium Level Selector — top-left, always visible when map is ready ── */}
      {ready && !hideLevelSelector && (
        <MapLevelSelector
          selectedLevel={selectedLevel}
          onLevelChange={handleLevelChange}
        />
      )}

      {/* ── Infrastructure Panel — right side, always visible when map is ready ── */}
      {ready && !hideInfraPanel && (
        <MapInfrastructurePanel
          activeLayers={activeInfraLayers}
          onLayerToggle={handleInfraLayerToggle}
        />
      )}

      {/* ── Infrastructure Legend (bottom-left, when layers active) ──────── */}
      {ready && !hideInfraLegend && (
        <MapInfrastructureLegend activeLayers={activeInfraLayers} />
      )}

      {/* Hint label (click / drag) — positioned below level selector */}
      {cfg.clickable && !hideClickHint && (
        <div className="absolute z-[1002]" style={{ top: 56, left: 10 }}>
          <div
            className="rounded px-2 py-0.5"
            style={{
              background: "rgba(15,30,55,0.85)",
              backdropFilter: "blur(4px)",
            }}
          >
            <span className="text-white/80 text-[9px]">
              Click or drag pin to explore
            </span>
          </div>
        </div>
      )}

      {/* Location label */}
      {pinLabel && (
        <div className="absolute bottom-2 left-2 z-[1001]">
          <div
            className="rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-md"
            style={{
              background: "rgba(15,30,55,0.90)",
              backdropFilter: "blur(4px)",
            }}
          >
            <div className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse flex-shrink-0" />
            <span className="text-white text-xs font-medium">{pinLabel}</span>
          </div>
        </div>
      )}

      {/* Smart pins legend */}
      {showSmartPins && ready && !hideSmartPinsLegend && (
        <div className="absolute bottom-10 left-2 z-[1001] flex flex-col gap-1 pointer-events-none">
          {[
            { color: "#D4AF37", label: "Tech Park" },
            { color: "#3b82f6", label: "Metro" },
            { color: "#f97316", label: "Bus Stop" },
            { color: "#8b5cf6", label: "Railway" },
            { color: "#ef4444", label: "Hospital" },
            { color: "#10b981", label: "School" },
          ].map(({ color, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 rounded px-2 py-0.5"
              style={{
                background: "rgba(15,30,55,0.80)",
                backdropFilter: "blur(4px)",
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: color }}
              />
              <span className="text-white text-[9px] font-medium">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Project count badge */}
      {cfg.showProjects && projects && projects.length > 0 && (
        <div
          className="absolute top-2 right-2 z-[1001] rounded-lg px-3 py-1.5 pointer-events-none shadow-md border"
          style={{
            background: "rgba(15,30,55,0.88)",
            borderColor: "rgba(255,255,255,0.15)",
          }}
        >
          <span className="text-white text-xs font-semibold">
            {projects.filter((p) => p.latitude !== 0).length} projects
          </span>
        </div>
      )}

      {/* Project legend */}
      {cfg.showProjects && projects && projects.length > 0 && (
        <div className="absolute bottom-3 left-12 z-[1001] flex flex-wrap gap-1.5 pointer-events-none">
          {(["Luxury", "Premium", "Best Value", "Budget Pick"] as const).map(
            (tag) => (
              <div
                key={tag}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border shadow-md"
                style={{
                  background: "rgba(15,30,55,0.88)",
                  borderColor: "rgba(255,255,255,0.15)",
                }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-white/30"
                  style={{ background: getTagColor(tag) }}
                />
                <span className="text-white text-[10px] font-medium whitespace-nowrap">
                  {tag}
                </span>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
