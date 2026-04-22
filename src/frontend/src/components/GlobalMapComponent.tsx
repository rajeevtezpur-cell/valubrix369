// GlobalMapComponent.tsx — Single shared map component for all ValuBrix modules
// Replaces usage of both MapView.tsx and GeoIntelligenceMap.tsx
// Mode-based: area-intelligence (full layers), explore, buy, rent, sell, valuation, pin, select-location
// PART 11: Removed floating grid / circular infra panel — replaced by Layers dropdown
// PART 12: pin/select-location clean mode — only search bar, Confirm, Layers button
// PART 13: MapLayerTogglePanel is the ONLY layer toggle (grouped dropdown)
// PART 14: Correct marker colors per spec
// PART 15: Bounding box lazy loading
// PART 16: Leaflet.markercluster support
// PART 17: Long press (600ms) pin drop with 2km radius circle
// PART 19: Live OSM POI fetching wired to layer toggles
// FIX A: Pin drop confirmation popup shown for ALL modes (buy/rent/sell/valuation/area-intelligence)
// FIX B: Layers dropdown always visible — container has overflow:visible, no contain:strict
// FIX C: MapLevelSelector pointer-events:auto, z-index above overlays, fallback toast when no projects
// FIX D: POI markers wired end-to-end — layer toggle → fetchOSMPOIs → cluster group → map
// FIX E: Long press 2km dashed radius circle on desktop & mobile
// @ts-nocheck

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ALL_LOCALITY_COORDS } from "../data/localityCoords";
import {
  computeLocationScores,
  filterByLevel,
} from "../engines/locationScoringEngine";
import {
  type InfraLayerType,
  type LevelType,
  type MapLayerType,
  getHeatmapConfig,
  getHeatmapPoints,
  getSmartPins,
} from "../engines/mapLayersEngine";
import { getOSRMRoute } from "../engines/osrmEngine";
import type { PollutionData } from "../engines/pollutionEngine";
import { fetchOSMPOIs } from "../services/osmPoiService";
import type { AmenityType } from "../services/roadDistanceEngine";
import { reverseGeocode } from "../utils/reverseGeocode";
import MapInfrastructureLegend from "./MapInfrastructureLegend";
import MapLayerTogglePanel from "./MapLayerTogglePanel";
import MapLevelSelector from "./MapLevelSelector";

// ─── ProjectPin type ──────────────────────────────────────────────────────────

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
  | "area-intelligence"
  | "pin"
  | "select-location";

export type UnifiedMapMode = GlobalMapMode;

// ─── Dynamic POI pin type ──────────────────────────────────────────────────────
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
  height?: string;
  projects?: ProjectPin[];
  onLocationSelect?: (lat: number, lng: number, locality: string) => void;
  onMarkerClick?: (project: ProjectPin) => void;
  showLayerToggle?: boolean;
  className?: string;
  city?: string;
  fullScreen?: boolean;
  onInfraLayerChange?: (activeLayers: Set<InfraLayerType>) => void;
  hideLevelSelector?: boolean;
  /** @deprecated Use showLayerToggle=true instead — infra panel removed */
  hideInfraPanel?: boolean;
  hideInfraLegend?: boolean;
  hideClickHint?: boolean;
  hideSmartPinsLegend?: boolean;
  disableDefaultSmartPins?: boolean;
  dynamicPoiPins?: DynamicPoiPin[];
  activePoiCategory?: string;
  pollutionData?: PollutionData;
  /** Vertical offset (px) for the level selector — use when map is behind a fixed header */
  levelSelectorTopOffset?: number;
}

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

// PART 14 — Exact marker colors per spec
function getPinColor(type: string): string {
  switch (type) {
    case "tech_park":
      return "#F59E0B"; // yellow
    case "metro":
      return "#7C3AED"; // purple
    case "bus_stop":
      return "#3B82F6"; // blue
    case "railway":
      return "#8B5CF6"; // violet
    case "hospital":
      return "#EF4444"; // red
    case "school":
      return "#10B981"; // green
    case "college":
      return "#0EA5E9"; // sky
    case "restaurant":
      return "#F97316"; // orange
    case "mall":
      return "#D97706"; // amber
    case "supermarket":
      return "#0D9488"; // teal
    case "police":
      return "#1E3A8A"; // dark-blue
    case "petrol_pump":
      return "#0D9488"; // teal
    case "pharmacy":
      return "#EC4899"; // pink
    case "bank":
      return "#6366F1"; // indigo
    case "atm":
      return "#06B6D4"; // cyan
    case "airport":
      return "#6B7280"; // gray
    case "highway":
      return "#84CC16"; // lime
    default:
      return "#6b7280";
  }
}

// Emoji per category
function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    tech_park: "🏢",
    metro: "🚇",
    bus_stop: "🚌",
    railway: "🚂",
    hospital: "🏥",
    school: "🏫",
    college: "🎓",
    restaurant: "🍽️",
    mall: "🛍️",
    supermarket: "🛒",
    police: "🚔",
    petrol_pump: "⛽",
    pharmacy: "💊",
    bank: "🏦",
    atm: "🏧",
    airport: "✈️",
    highway: "🛣️",
  };
  return map[category] ?? "📍";
}

function getCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    tech_park: "Tech Park",
    metro: "Metro Station",
    bus_stop: "Bus Stop",
    railway: "Railway Station",
    hospital: "Hospital",
    school: "School",
    college: "College",
    restaurant: "Restaurant",
    mall: "Shopping Mall",
    supermarket: "Supermarket",
    police: "Police Station",
    petrol_pump: "Petrol Pump",
    pharmacy: "Pharmacy",
    bank: "Bank",
    atm: "ATM",
    airport: "Airport",
    highway: "Highway",
  };
  return map[category] ?? category;
}

function getHeatZones(latVal: number, lngVal: number) {
  return [
    { lat: latVal, lng: lngVal, radius: 1000, color: "#3b82f6" },
    { lat: latVal, lng: lngVal, radius: 3000, color: "#22c55e" },
    { lat: latVal, lng: lngVal, radius: 8000, color: "#f97316" },
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
      fillOpacity: i === 0 ? 0.18 : i === 1 ? 0.1 : 0.06,
      weight: 2,
      opacity: i === 0 ? 0.7 : i === 1 ? 0.55 : 0.4,
    }).addTo(map);
    circle.bindTooltip(labels[i], { permanent: false, direction: "top" });
    added.push(circle);
  }
  return added;
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
      script.onload = () => {
        // Also load markercluster after leaflet
        loadMarkerCluster().then(() => resolve(window.L));
      };
      script.onerror = () => reject(new Error("Failed to load Leaflet"));
      document.head.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if (window.L) {
          clearInterval(interval);
          loadMarkerCluster().then(() => resolve(window.L));
        }
      }, 50);
      setTimeout(() => {
        clearInterval(interval);
        reject(new Error("timeout"));
      }, 10000);
    }
  });
}

// PART 16 — Load Leaflet.markercluster
function loadMarkerCluster(): Promise<void> {
  return new Promise((resolve) => {
    if (window.L?.MarkerClusterGroup) {
      resolve();
      return;
    }
    if (!document.getElementById("markercluster-css")) {
      const link = document.createElement("link");
      link.id = "markercluster-css";
      link.rel = "stylesheet";
      link.href =
        "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
      document.head.appendChild(link);
      const link2 = document.createElement("link");
      link2.id = "markercluster-css-default";
      link2.rel = "stylesheet";
      link2.href =
        "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css";
      document.head.appendChild(link2);
    }
    if (!document.getElementById("markercluster-js")) {
      const script = document.createElement("script");
      script.id = "markercluster-js";
      script.src =
        "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";
      script.onload = () => resolve();
      script.onerror = () => resolve(); // non-fatal — degrade gracefully
      document.head.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if (window.L?.MarkerClusterGroup) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(interval);
        resolve();
      }, 5000);
    }
  });
}

const CITY_CENTERS_MAP: Record<string, [number, number]> = {
  Bangalore: [12.9716, 77.5946],
  Pune: [18.5204, 73.8567],
  Hyderabad: [17.385, 78.4867],
  Mumbai: [19.076, 72.8777],
  Delhi: [28.6139, 77.209],
  "Delhi NCR": [28.6139, 77.209],
};

function getModeConfig(mode: GlobalMapMode) {
  const isFullIntel = mode === "area-intelligence";
  const isPin = mode === "pin" || mode === "select-location";
  const isExplore = mode === "explore";
  const isBuyRent = mode === "buy" || mode === "rent" || mode === "sell";
  return {
    layerScope: (isFullIntel ? "full" : "basic") as "full" | "basic",
    defaultShowPins: !isPin && (isFullIntel || isExplore),
    // GAP 4 FIX: buy/rent/sell modes must also be clickable so pin drop works
    clickable:
      mode === "valuation" ||
      mode === "area-intelligence" ||
      isPin ||
      isBuyRent,
    isPinMode: isPin,
    showProjects:
      !isPin && ["buy", "rent", "sell", "valuation", "explore"].includes(mode),
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
  // FIX B: default showLayerToggle=true so layers dropdown is ALWAYS visible unless explicitly hidden
  showLayerToggle = true,
  className = "",
  city,
  fullScreen = false,
  onInfraLayerChange,
  hideLevelSelector = false,
  hideInfraLegend = false,
  hideClickHint = false,
  hideSmartPinsLegend = false,
  disableDefaultSmartPins = false,
  dynamicPoiPins,
  activePoiCategory,
  pollutionData,
  levelSelectorTopOffset = 10,
}: GlobalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circlesRef = useRef<any[]>([]);
  const layerGroupsRef = useRef<Map<MapLayerType, any[]>>(new Map());
  const pinMarkersRef = useRef<any[]>([]);
  const projectMarkersRef = useRef<any[]>([]);
  const renderedPinsRef = useRef(false);
  const routeLayerRef = useRef<any>(null);
  const dynamicPoiMarkersRef = useRef<any[]>([]);
  // PART 16 — Cluster groups per infra layer
  const infraClusterGroupsRef = useRef<Map<InfraLayerType, any>>(new Map());
  // PART 17 — Long press state
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressMarkerRef = useRef<any>(null);
  const longPressCircleRef = useRef<any>(null);
  // PART 15 — Track last-fetched bounds per layer to detect significant pan/zoom changes
  const lastFetchedBoundsRef = useRef<
    Map<
      InfraLayerType,
      { north: number; south: number; east: number; west: number }
    >
  >(new Map());

  const [ready, setReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pinLabel, setPinLabel] = useState("");
  const [pinLat, setPinLat] = useState(center[0]);
  const [pinLng, setPinLng] = useState(center[1]);
  // ISSUE 1 FIX — Pending pin state: store click coords here, only commit to main marker on Confirm
  const pendingMarkerRef = useRef<any>(null);
  // PART 17 — Long press confirm (also used for regular click confirm)
  const [longPressCoords, setLongPressCoords] = useState<{
    lat: number;
    lng: number;
    name?: string;
  } | null>(null);
  // FIX 3 — Regular clicks and long press both show the same confirmation popup
  // Layer panel state
  const [activeLayers, setActiveLayers] = useState<MapLayerType[]>([]);
  const [hiddenLayers, setHiddenLayers] = useState<MapLayerType[]>([]);
  const [showSmartPins, setShowSmartPins] = useState(
    () => !disableDefaultSmartPins && getModeConfig(mode).defaultShowPins,
  );
  const [selectedLevel, setSelectedLevel] = useState<LevelType>("smart");
  const [activeInfraLayers, setActiveInfraLayers] = useState<
    Set<InfraLayerType>
  >(new Set());
  // PART 19 — OSM loading state per layer
  const [loadingLayers, setLoadingLayers] = useState<Set<InfraLayerType>>(
    new Set(),
  );

  const cfg = getModeConfig(mode);

  // ─── Level-based project filtering ───────────────────────────────────────────
  // Convert ProjectPins to LocationScoreInputs, compute scores, filter by level.
  // For 'smart' (default): show all sorted by smart score (no cutoff).
  // For premium/growth/investment: top 60% by that score (min 3).
  // ISSUE 2 FIX — When filter is active but projects list is empty/too small,
  // show nearest locality pins as fallback + toast instead of leaving map empty.
  const filteredProjects = useMemo(() => {
    const allProjects = (projects || []).filter(
      (p) =>
        p.latitude &&
        p.longitude &&
        !Number.isNaN(p.latitude) &&
        !Number.isNaN(p.longitude) &&
        p.latitude !== 0 &&
        p.longitude !== 0,
    );

    // ISSUE 2 FIX — If no projects and a non-default filter is selected,
    // synthesize fallback pins from the nearest localities so the map is never empty.
    if (allProjects.length === 0 && selectedLevel !== "smart") {
      const levelLabel =
        selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1);
      toast(`Showing ${levelLabel} areas near you`, {
        description: "No project listings loaded — displaying nearby areas",
        duration: 3500,
      });
      // Return 5 nearest known localities as synthetic ProjectPins
      const sorted = [...KNOWN_LOCALITIES]
        .map((loc) => ({
          ...loc,
          dist: Math.sqrt((loc.lat - pinLat) ** 2 + (loc.lng - pinLng) ** 2),
        }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 5);
      return sorted.map((loc, i) => ({
        id: `fallback-${i}`,
        name: loc.name,
        locality: loc.name,
        latitude: loc.lat,
        longitude: loc.lng,
        score: { tag: levelLabel, investmentScore: 70 - i * 5 },
      })) as ProjectPin[];
    }

    if (allProjects.length === 0) {
      // Projects not loaded yet — filtering will apply once search is done
      return allProjects; // empty is ok here, just don't show error UI
    }

    // Build scoring inputs from ProjectPin data
    const inputs = allProjects.map((p) => ({
      name: p.name,
      lat: p.latitude,
      lng: p.longitude,
      psf:
        p.price_min != null
          ? Math.round(p.price_min / 1000) // rough PSF from price_min (assuming ~1000 sqft)
          : undefined,
      amenityScore:
        p.score?.investmentScore != null
          ? p.score.investmentScore / 100
          : undefined,
    }));

    const scored = computeLocationScores(inputs);

    if (selectedLevel === "smart") {
      // Smart default: show all sorted by smart score
      const sortedScored = [...scored].sort(
        (a, b) => b.scores.smart - a.scores.smart,
      );
      // Re-map back to original projects in score-sorted order
      return sortedScored
        .map(
          (s) =>
            allProjects.find(
              (p) => p.name === s.name && p.latitude === s.lat,
            ) ?? allProjects[0],
        )
        .filter(Boolean);
    }

    const filtered = filterByLevel(scored, selectedLevel);

    // ISSUE 2 FIX — If filtering left too few results (< 3), fall back to top-5 by score
    if (filtered.length < 3) {
      const levelLabel =
        selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1);
      const fallbackCount = Math.min(5, allProjects.length);
      toast(`Showing ${levelLabel} areas near you`, {
        description: `Showing ${fallbackCount} nearest areas matching your filter`,
        duration: 3500,
      });
      // Sort all by the relevant score and take top 5
      const sortKey =
        selectedLevel === "premium"
          ? "premium"
          : selectedLevel === "growth"
            ? "growth"
            : "investment";
      const sortedAll = [...scored].sort(
        (a, b) =>
          (b.scores as Record<string, number>)[sortKey] -
          (a.scores as Record<string, number>)[sortKey],
      );
      const topNames = new Set(
        sortedAll.slice(0, fallbackCount).map((s) => s.name),
      );
      return allProjects.filter((p) => topNames.has(p.name));
    }

    const filteredNames = new Set(filtered.map((s) => s.name));
    return allProjects.filter((p) => filteredNames.has(p.name));
  }, [projects, selectedLevel, pinLat, pinLng]);

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

  const prevCityRef = useRef<string | undefined>(city);

  // City change → re-center
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    if (!city || city === prevCityRef.current) return;
    prevCityRef.current = city;
    const newCenter = CITY_CENTERS_MAP[city] ?? [12.9716, 77.5946];
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    for (const c of circlesRef.current) mapRef.current.removeLayer(c);
    circlesRef.current = [];
    for (const m of pinMarkersRef.current) mapRef.current.removeLayer(m);
    pinMarkersRef.current = [];
    renderedPinsRef.current = false;
    for (const [, circles] of layerGroupsRef.current.entries()) {
      for (const c of circles) mapRef.current.removeLayer(c);
    }
    layerGroupsRef.current.clear();
    setPinLabel("");
    setPinLat(newCenter[0]);
    setPinLng(newCenter[1]);
    mapRef.current.setView(newCenter, 11, { animate: true });
    mapRef.current.invalidateSize();
  }, [city]);

  // Center prop change → re-center
  const prevCenterRef = useRef(center);
  useEffect(() => {
    const [newLat, newLng] = center;
    const [prevLat, prevLng] = prevCenterRef.current;
    if (
      Math.abs(prevLat - newLat) > 0.001 ||
      Math.abs(prevLng - newLng) > 0.001
    ) {
      prevCenterRef.current = center;
      setPinLat(newLat);
      setPinLng(newLng);
      if (mapRef.current) {
        mapRef.current.setView([newLat, newLng], 13, { animate: true });
        if (window.L) {
          for (const c of circlesRef.current) mapRef.current.removeLayer(c);
          circlesRef.current = addHeatCircles(
            mapRef.current,
            window.L,
            newLat,
            newLng,
          );
          if (markerRef.current) markerRef.current.setLatLng([newLat, newLng]);
        }
      }
    }
  }, [center]);

  // ─── Map initialisation ───────────────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: map init runs once
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

        // CartoDB Voyager tiles — light theme
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

        // Add initial heat circles (skip in pin-only mode)
        if (!cfg.isPinMode) {
          circlesRef.current = addHeatCircles(map, L, center[0], center[1]);
        }

        // Location marker
        const icon = L.divIcon({
          className: "",
          html: `<div style="position:relative;width:32px;height:32px;">
            <div style="width:32px;height:32px;background:#3B82F6;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #ffffff;box-shadow:0 3px 12px rgba(59,130,246,0.7),0 0 0 4px rgba(59,130,246,0.2);"></div>
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        const marker = L.marker(center, {
          icon,
          draggable: cfg.clickable,
        }).addTo(map);
        markerRef.current = marker;

        if (cfg.clickable) {
          marker.on("dragstart", () => setIsDragging(true));
          marker.on("dragend", (e: any) => {
            const lat = e.target.getLatLng().lat;
            const lng = e.target.getLatLng().lng;
            const fallbackName = findNearestLocality(lat, lng);
            setPinLat(lat);
            setPinLng(lng);
            setPinLabel("Loading...");
            setIsDragging(false);
            map.setView([lat, lng], 14);
            for (const c of circlesRef.current) map.removeLayer(c);
            if (!cfg.isPinMode)
              circlesRef.current = addHeatCircles(map, L, lat, lng);
            for (const m of pinMarkersRef.current) map.removeLayer(m);
            pinMarkersRef.current = [];
            renderedPinsRef.current = false;
            reverseGeocode(lat, lng).then((realName) => {
              const displayName =
                realName !== "Unknown location" ? realName : fallbackName;
              setPinLabel(displayName);
              setIsDragging(false);
              onLocationSelectRef.current?.(lat, lng, displayName);
            });
          });

          map.on("click", (e: any) => {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            const fallbackName = findNearestLocality(lat, lng);

            // ISSUE 1 FIX — Do NOT move main marker yet.
            // Show a ghost/pending marker at the tapped location.
            // Only commit to main marker when user taps "Confirm Location".
            if (pendingMarkerRef.current) {
              map.removeLayer(pendingMarkerRef.current);
              pendingMarkerRef.current = null;
            }
            const ghostIcon = L.divIcon({
              className: "",
              html: `<div style="position:relative;width:32px;height:32px;">
                <div style="width:32px;height:32px;background:rgba(59,130,246,0.45);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid rgba(255,255,255,0.7);box-shadow:0 3px 12px rgba(59,130,246,0.5),0 0 0 4px rgba(59,130,246,0.15);"></div>
              </div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 32],
            });
            pendingMarkerRef.current = L.marker([lat, lng], {
              icon: ghostIcon,
              zIndexOffset: 500,
            }).addTo(map);

            // Store pending coords and resolve address in background
            reverseGeocode(lat, lng).then((realName) => {
              const displayName =
                realName !== "Unknown location" ? realName : fallbackName;
              // Show confirmation popup with resolved name
              setLongPressCoords({ lat, lng, name: displayName });
            });
          });
        }

        // PART 17 — Long press pin drop (touch: 600ms, desktop: mousedown 600ms)

        function startLongPress(lat: number, lng: number) {
          if (longPressTimerRef.current)
            clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = setTimeout(() => {
            // Drop a temporary pin
            if (longPressMarkerRef.current)
              map.removeLayer(longPressMarkerRef.current);
            if (longPressCircleRef.current)
              map.removeLayer(longPressCircleRef.current);
            const lpIcon = L.divIcon({
              className: "",
              html: `<div style="width:28px;height:28px;background:#D4AF37;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #ffffff;box-shadow:0 3px 16px rgba(212,175,55,0.8),0 0 0 4px rgba(212,175,55,0.25);animation:pulse 1s infinite;"></div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 28],
            });
            longPressMarkerRef.current = L.marker([lat, lng], {
              icon: lpIcon,
            }).addTo(map);
            // FIX E: 2km dashed radius circle (was 500m)
            longPressCircleRef.current = L.circle([lat, lng], {
              radius: 2000,
              color: "#D4AF37",
              fillColor: "#D4AF37",
              fillOpacity: 0.06,
              weight: 2,
              dashArray: "8 5",
            }).addTo(map);
            setLongPressCoords({ lat, lng });
          }, 600);
        }

        function cancelLongPress() {
          if (longPressTimerRef.current)
            clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }

        map.on("mousedown", (e: any) =>
          startLongPress(e.latlng.lat, e.latlng.lng),
        );
        map.on("mouseup", cancelLongPress);
        map.on("mousemove", cancelLongPress);

        // Touch events
        const container = containerRef.current;
        if (container) {
          container.addEventListener(
            "touchstart",
            (e) => {
              const touch = e.touches[0];
              const latlng = map.containerPointToLatLng(
                L.point(
                  touch.clientX - container.getBoundingClientRect().left,
                  touch.clientY - container.getBoundingClientRect().top,
                ),
              );
              if (latlng) startLongPress(latlng.lat, latlng.lng);
            },
            { passive: true },
          );
          container.addEventListener("touchend", cancelLongPress, {
            passive: true,
          });
          container.addEventListener("touchmove", cancelLongPress, {
            passive: true,
          });
        }

        // PART 15 — Viewport lazy loading on pan/zoom: re-fetch active layers when bounds shift significantly
        map.on("moveend", () => {
          if (activeInfraLayers.size === 0) return;
          const bounds = map.getBounds();
          const currNorth = bounds.getNorth();
          const currSouth = bounds.getSouth();
          const currEast = bounds.getEast();
          const currWest = bounds.getWest();
          // Threshold: ~1.5km in degrees
          const threshold = 0.013;
          for (const layerId of activeInfraLayers) {
            const last = lastFetchedBoundsRef.current.get(layerId);
            const significant =
              !last ||
              Math.abs(currNorth - last.north) > threshold ||
              Math.abs(currSouth - last.south) > threshold ||
              Math.abs(currEast - last.east) > threshold ||
              Math.abs(currWest - last.west) > threshold;
            if (significant) {
              // Clear the cluster group so renderInfraLayer re-fetches for new viewport
              const existing = infraClusterGroupsRef.current.get(layerId);
              if (existing) {
                map.removeLayer(existing);
                infraClusterGroupsRef.current.delete(layerId);
              }
              lastFetchedBoundsRef.current.delete(layerId);
            }
          }
          // Trigger re-render for any layers that were cleared
          setActiveInfraLayers((prev) => new Set(prev));
        });

        setReady(true);
      } catch (err) {
        console.error("GlobalMapComponent init error:", err);
      }
    }

    initMap();

    return () => {
      cancelled = true;
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Active map layers ────────────────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L || !ready) return;

    for (const [lt, circles] of layerGroupsRef.current.entries()) {
      if (!activeLayers.includes(lt)) {
        for (const c of circles) map.removeLayer(c);
        layerGroupsRef.current.delete(lt);
      }
    }
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

  // ─── Smart pins ────────────────────────────────────────────────────────────

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
        html: `<div style="width:32px;height:32px;background:${bgColor};border-radius:50%;border:2px solid rgba(255,255,255,0.85);box-shadow:0 2px 10px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;font-size:15px;line-height:1;cursor:pointer;">${pin.emoji}</div>`,
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

      m.on("popupopen", () => {
        const distElemId = `osrm-dist-${pin.id ?? pin.name.replace(/\s+/g, "-")}`;
        getOSRMRoute(pinLat, pinLng, pin.lat, pin.lng).then((route) => {
          const el = document.getElementById(distElemId);
          if (el) {
            el.textContent =
              route && route.distanceKm > 0
                ? `🚗 ${route.distanceKm.toFixed(1)} km • ${Math.round(route.durationMins)} mins drive`
                : "Distance unavailable";
            if (!route || route.distanceKm === 0) el.style.color = "#64748b";
          }
          if (route?.geometry?.coordinates) {
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

  // ─── Project markers ───────────────────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L || !ready || !cfg.showProjects) return;
    for (const m of projectMarkersRef.current) map.removeLayer(m);
    projectMarkersRef.current = [];
    // Use level-filtered projects — filteredProjects is computed by scoring engine
    const validProjects = filteredProjects;
    for (const project of validProjects) {
      const color = getTagColor(project.score?.tag ?? "");
      const icon = L.divIcon({
        className: "",
        html: `<svg width="32" height="42" viewBox="0 0 32 42" fill="none"><path d="M16 0C7.163 0 0 7.163 0 16c0 11.314 16 26 16 26S32 27.314 32 16C32 7.163 24.837 0 16 0z" fill="${color}" stroke="white" stroke-width="2.5"/><circle cx="16" cy="16" r="7" fill="white" fill-opacity="0.95"/></svg>`,
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -44],
      });
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
      const m = L.marker([project.latitude, project.longitude], { icon });
      m.bindPopup(L.popup({ maxWidth: 240 }).setContent(popup));
      m.addTo(map);
      projectMarkersRef.current.push(m);
    }
  }, [filteredProjects, ready, cfg.showProjects]);

  // ─── PART 19 — Live OSM POI layer rendering ────────────────────────────────
  // Fetches live OSM POIs via overpass.kumi.systems (primary) + overpass-api.de (backup)
  // NO hardcoded fallback — empty array means "No nearby results found"

  const renderInfraLayer = useCallback(
    async (layerId: InfraLayerType) => {
      const map = mapRef.current;
      const L = window.L;
      if (!map || !L || !ready) return;

      // Remove any existing group for this layer before re-rendering
      const existing = infraClusterGroupsRef.current.get(layerId);
      if (existing) {
        map.removeLayer(existing);
        infraClusterGroupsRef.current.delete(layerId);
      }

      const bgColor = getPinColor(layerId);
      const emoji = getCategoryEmoji(layerId);
      const categoryLabel = getCategoryLabel(layerId);

      // Mark as loading
      setLoadingLayers((prev) => new Set([...prev, layerId]));

      try {
        // PART 19 — Live OSM fetch. osmPoiService tries kumi.systems first, then overpass-api.de.
        // Returns [] if all endpoints fail — we show empty state, never use hardcoded data.
        const osmPois = await fetchOSMPOIs(
          pinLat,
          pinLng,
          layerId as AmenityType,
        );

        // PART 15 — Bounding box filter: only show POIs within viewport + 2km buffer
        const bounds = map.getBounds();
        const bufferDeg = 0.018; // ~2km in degrees
        const viewportPois = osmPois.filter(
          (p) =>
            p.lat >= bounds.getSouth() - bufferDeg &&
            p.lat <= bounds.getNorth() + bufferDeg &&
            p.lng >= bounds.getWest() - bufferDeg &&
            p.lng <= bounds.getEast() + bufferDeg,
        );

        // Use viewport-filtered if non-empty, else show all within radius (no slice cap)
        const pinsToRender = viewportPois.length > 0 ? viewportPois : osmPois;

        console.log(
          `[Map] Rendering ${pinsToRender.length} ${layerId} markers (viewport: ${viewportPois.length}, total fetched: ${osmPois.length})`,
        );

        // PART 16 — Create cluster group if available (cluster at 20+, explode at zoom 16)
        let group: any;
        if (L.MarkerClusterGroup) {
          group = L.markerClusterGroup({
            maxClusterRadius: 80,
            disableClusteringAtZoom: 16,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            iconCreateFunction: (cluster: any) => {
              const count = cluster.getChildCount();
              const size =
                count >= 100 ? 44 : count >= 40 ? 38 : count >= 25 ? 34 : 30;
              return L.divIcon({
                html: `<div style="width:${size}px;height:${size}px;background:${bgColor};border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:700;">${count}</div>`,
                className: "",
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2],
              });
            },
          });
        } else {
          group = L.layerGroup();
        }

        for (const pin of pinsToRender) {
          const icon = L.divIcon({
            className: "",
            html: `<div style="width:34px;height:34px;background:${bgColor};border-radius:50%;border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 10px rgba(0,0,0,0.5),0 0 8px ${bgColor}66;display:flex;align-items:center;justify-content:center;font-size:15px;line-height:1;cursor:pointer;">${emoji}</div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17],
            popupAnchor: [0, -20],
          });

          const safeName = pin.name.replace(/[^a-zA-Z0-9]/g, "-");
          const distElemId = `osrm-infra-${layerId}-${safeName}`;

          const popupHtml = `
          <div style="background:#111827;color:#f1f5f9;border-radius:10px;padding:12px 14px;min-width:180px;max-width:240px;font-family:system-ui,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.08);">
            <div style="font-size:20px;margin-bottom:4px">${emoji}</div>
            <div style="font-weight:700;font-size:13px;margin-bottom:2px;color:#f8fafc">${pin.name}</div>
            <div style="font-size:10px;color:#64748b;margin-bottom:6px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase">${categoryLabel}</div>
            <div id="${distElemId}" style="font-size:12px;color:#f59e0b;font-weight:600">🚗 Calculating...</div>
          </div>`;

          const m = L.marker([pin.lat, pin.lng], { icon }).bindPopup(
            popupHtml,
            {
              maxWidth: 240,
              className: "valubrix-smart-popup",
            },
          );

          m.on("popupopen", () => {
            getOSRMRoute(pinLat, pinLng, pin.lat, pin.lng).then((route) => {
              const el = document.getElementById(distElemId);
              if (el) {
                if (route && route.distanceKm > 0) {
                  el.textContent = `🚗 ${route.distanceKm.toFixed(1)} km • ${Math.round(route.durationMins)} mins drive`;
                } else {
                  el.textContent = "Distance unavailable";
                  el.style.color = "#64748b";
                }
              }
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
          m.on("popupclose", () => {
            if (routeLayerRef.current && mapRef.current) {
              mapRef.current.removeLayer(routeLayerRef.current);
              routeLayerRef.current = null;
            }
          });

          group.addLayer(m);
        }

        map.addLayer(group);
        infraClusterGroupsRef.current.set(layerId, group);
        // PART 15 — Record the bounds at which this layer was fetched
        const fetchedBounds = map.getBounds();
        lastFetchedBoundsRef.current.set(layerId, {
          north: fetchedBounds.getNorth(),
          south: fetchedBounds.getSouth(),
          east: fetchedBounds.getEast(),
          west: fetchedBounds.getWest(),
        });
      } catch (err) {
        console.error(`[Map] Error rendering layer ${layerId}:`, err);
        // Do NOT fall back to hardcoded data — just clear the loading state
        // The layer toggle will remain active so user can try again
      } finally {
        setLoadingLayers((prev) => {
          const next = new Set(prev);
          next.delete(layerId);
          return next;
        });
      }
    },
    [ready, pinLat, pinLng],
  );

  // Sync infra layer additions/removals
  // FIX 4: When renderInfraLayer changes (i.e. pinLat/pinLng changed), re-fetch ALL active layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Remove deactivated layers
    for (const [layerId, group] of infraClusterGroupsRef.current.entries()) {
      if (!activeInfraLayers.has(layerId)) {
        map.removeLayer(group);
        infraClusterGroupsRef.current.delete(layerId);
      }
    }

    // FIX 4: Clear ALL existing cluster groups so they re-fetch at new coordinates
    // (renderInfraLayer dependency changes when pinLat/pinLng change)
    for (const [layerId, group] of infraClusterGroupsRef.current.entries()) {
      if (activeInfraLayers.has(layerId)) {
        map.removeLayer(group);
        infraClusterGroupsRef.current.delete(layerId);
      }
    }

    // Add/re-fetch all active layers at current coordinates
    for (const layerId of activeInfraLayers) {
      renderInfraLayer(layerId);
    }
  }, [activeInfraLayers, ready, renderInfraLayer]);

  // ─── Dynamic POI pins (from external props) ────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    for (const m of dynamicPoiMarkersRef.current) {
      if (map) map.removeLayer(m);
    }
    dynamicPoiMarkersRef.current = [];
    if (!map || !L || !ready) return;
    if (!dynamicPoiPins || dynamicPoiPins.length === 0) return;

    const pinsToRender = activePoiCategory
      ? dynamicPoiPins.filter((p) => p.category === activePoiCategory)
      : dynamicPoiPins;

    const markers: any[] = [];
    for (const pin of pinsToRender) {
      const bgColor = getPinColor(pin.category);
      const emoji = getCategoryEmoji(pin.category);
      const categoryLabel = getCategoryLabel(pin.category);
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:34px;height:34px;background:${bgColor};border-radius:50%;border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 10px rgba(0,0,0,0.5),0 0 8px ${bgColor}66;display:flex;align-items:center;justify-content:center;font-size:15px;line-height:1;cursor:pointer;">${emoji}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -20],
      });
      const distLabel =
        pin.distanceKm != null && pin.durationMins != null
          ? `🚗 ${pin.distanceKm.toFixed(1)} km • ${Math.round(pin.durationMins)} mins drive`
          : pin.distanceKm != null
            ? `🚗 ${pin.distanceKm.toFixed(1)} km drive`
            : "🚗 Loading...";
      const m = L.marker([pin.lat, pin.lng], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="background:#111827;color:#f1f5f9;border-radius:10px;padding:12px 14px;min-width:180px;max-width:240px;font-family:system-ui,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.08);"><div style="font-size:20px;margin-bottom:4px">${emoji}</div><div style="font-weight:700;font-size:13px;margin-bottom:2px;color:#f8fafc">${pin.name}</div><div style="font-size:10px;color:#64748b;margin-bottom:6px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase">${categoryLabel}</div><div style="font-size:12px;color:#f59e0b;font-weight:600">${distLabel}</div></div>`,
          { maxWidth: 240, className: "valubrix-smart-popup" },
        );
      markers.push(m);
    }
    dynamicPoiMarkersRef.current = markers;
  }, [dynamicPoiPins, activePoiCategory, ready]);

  // ─── Level selector → update heat-circle colors ──────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map || circlesRef.current.length === 0) return;
    const config = getHeatmapConfig(selectedLevel);
    const stops = Object.keys(config.gradient)
      .map(Number)
      .sort((a, b) => a - b);
    const colors = stops.map((s) => config.gradient[s]);
    while (colors.length < 3) colors.push(colors[colors.length - 1]);
    circlesRef.current.forEach((circle, i) => {
      const color = colors[Math.min(i, colors.length - 1)];
      circle.setStyle({ color, fillColor: color });
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
      // If this layer is already active, deactivate it (toggle off)
      if (prev.has(layer)) {
        const next = new Set<InfraLayerType>();
        onInfraLayerChangeRef.current?.(next);
        return next;
      }
      // Otherwise activate ONLY this layer (single-layer mode: clear all others)
      const next = new Set<InfraLayerType>([layer]);
      onInfraLayerChangeRef.current?.(next);
      return next;
    });
  }
  function handleLevelChange(level: LevelType) {
    setSelectedLevel(level);
  }

  // FIX 3 — Confirm handler used for BOTH long-press AND regular map clicks
  function handleLongPressConfirm() {
    if (!longPressCoords) return;
    const { lat, lng, name: preResolvedName } = longPressCoords;
    const fallbackName = findNearestLocality(lat, lng);

    // ISSUE 1 FIX — NOW commit the main marker to the confirmed position
    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
    setPinLat(lat);
    setPinLng(lng);
    if (mapRef.current && window.L) {
      mapRef.current.setView([lat, lng], 14);
      for (const c of circlesRef.current) mapRef.current.removeLayer(c);
      if (!cfg.isPinMode)
        circlesRef.current = addHeatCircles(mapRef.current, window.L, lat, lng);
      for (const m of pinMarkersRef.current) mapRef.current.removeLayer(m);
      pinMarkersRef.current = [];
      renderedPinsRef.current = false;
    }
    // Remove ghost marker now that main marker is committed
    if (pendingMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(pendingMarkerRef.current);
      pendingMarkerRef.current = null;
    }

    if (preResolvedName) {
      // Name already resolved (regular click path) — call callback immediately
      const name = preResolvedName;
      setPinLabel(name);
      onLocationSelectRef.current?.(lat, lng, name);
      handleLongPressCancel();
    } else {
      // Long press path — still need to resolve name
      reverseGeocode(lat, lng).then((realName) => {
        const name = realName !== "Unknown location" ? realName : fallbackName;
        setPinLabel(name);
        onLocationSelectRef.current?.(lat, lng, name);
      });
      handleLongPressCancel();
    }
  }

  function handleLongPressCancel() {
    // ISSUE 1 FIX — also remove ghost marker on cancel (user tapped "Change")
    if (pendingMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(pendingMarkerRef.current);
      pendingMarkerRef.current = null;
    }
    if (longPressMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(longPressMarkerRef.current);
      longPressMarkerRef.current = null;
    }
    if (longPressCircleRef.current && mapRef.current) {
      mapRef.current.removeLayer(longPressCircleRef.current);
      longPressCircleRef.current = null;
    }
    setLongPressCoords(null);
  }

  // ─── Container style ──────────────────────────────────────────────────────
  // FIX B: outer container uses overflow:visible so the Layers dropdown can
  //         extend beyond the map frame without being clipped.
  //         The Leaflet tile div itself clips tiles via its own overflow.
  //         contain:strict is removed — it was clipping the dropdown panel.

  const outerStyle: React.CSSProperties = fullScreen
    ? {
        position: "absolute",
        inset: 0,
        background: "#e8eaed",
        // overflow: visible so layers dropdown extends beyond map boundary
        overflow: "visible",
        pointerEvents: "auto",
      }
    : {
        position: "relative",
        width: "100%",
        height,
        minHeight: height,
        // FIX B: no maxHeight clamp — let absolutely-positioned children (dropdown) overflow
        flexShrink: 0,
        flexGrow: 0,
        // overflow:visible so MapLayerTogglePanel dropdown is not clipped
        overflow: "visible",
        background: "#e8eaed",
        border: "1px solid rgba(0,0,0,0.1)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        // NO contain:strict — it created a new stacking context AND clipped children
        pointerEvents: "auto",
      };

  const isPinMode = cfg.isPinMode;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className={`${fullScreen ? "" : "rounded-xl"} ${className}`}
      style={outerStyle}
    >
      <style>{`
        #global-map-${mode} .leaflet-container { background: #e8eaed !important; }
        #global-map-${mode} .leaflet-tile-pane { opacity: 1 !important; }
        #global-map-${mode} .leaflet-control-zoom a { background: #fff !important; color: #1e3a5f !important; border-color: #ccc !important; font-weight: 700 !important; }
        #global-map-${mode} .leaflet-control-zoom a:hover { background: #f0f4ff !important; }
        .valubrix-smart-popup .leaflet-popup-content-wrapper { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        .valubrix-smart-popup .leaflet-popup-content { margin: 0 !important; }
        .valubrix-smart-popup .leaflet-popup-tip-container { display: none !important; }
        @keyframes pulse { 0%,100% { box-shadow: 0 3px 16px rgba(212,175,55,0.8),0 0 0 4px rgba(212,175,55,0.25); } 50% { box-shadow: 0 3px 16px rgba(212,175,55,0.4),0 0 0 8px rgba(212,175,55,0.1); } }
      `}</style>

      {/* Leaflet container — overflow:hidden here clips tiles to the map frame */}
      <div
        id={`global-map-${mode}`}
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          overflow: "hidden",
          borderRadius: "inherit",
        }}
      />

      {/* Dragging overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/20">
          <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* PART 13 — Layers dropdown (shown when showLayerToggle=true — always visible including pin/select-location mode) */}
      {ready && showLayerToggle && (
        <MapLayerTogglePanel
          scope={cfg.layerScope}
          activeLayers={activeLayers}
          onToggle={handleLayerToggle}
          hiddenLayers={hiddenLayers}
          onToggleVisibility={handleToggleVisibility}
          showSmartPins={showSmartPins}
          onToggleSmartPins={handleToggleSmartPins}
          activeInfraLayers={activeInfraLayers}
          onInfraLayerToggle={handleInfraLayerToggle}
        />
      )}

      {/* Loading indicators per layer */}
      {loadingLayers.size > 0 && (
        <div
          style={{
            position: "absolute",
            top: 50,
            right: 10,
            zIndex: 1002,
            background: "rgba(7,26,47,0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            padding: "5px 12px",
            fontSize: 11,
            color: "rgba(255,255,255,0.7)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <div className="w-3 h-3 border border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          Loading markers...
        </div>
      )}

      {/* Level selector — hidden in pin mode, hidden if hideLevelSelector=true */}
      {ready && !hideLevelSelector && !isPinMode && (
        <MapLevelSelector
          selectedLevel={selectedLevel}
          onLevelChange={handleLevelChange}
          matchingCount={filteredProjects.length}
          topOffset={levelSelectorTopOffset}
        />
      )}

      {/* Level filter indicator — shows filtered project count when level selector is active */}
      {ready &&
        !hideLevelSelector &&
        !isPinMode &&
        cfg.showProjects &&
        filteredProjects.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: 54,
              left: 10,
              zIndex: 1001,
              background: "rgba(7,26,47,0.80)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 9999,
              padding: "3px 10px",
              fontSize: 10,
              color: "rgba(255,255,255,0.65)",
              pointerEvents: "none",
            }}
            data-ocid="map.level_filter_indicator"
          >
            Showing {filteredProjects.length} {selectedLevel} area
            {filteredProjects.length !== 1 ? "s" : ""}
          </div>
        )}

      {/* Infrastructure Legend — hidden in pin mode */}
      {ready && !hideInfraLegend && !isPinMode && (
        <MapInfrastructureLegend activeLayers={activeInfraLayers} />
      )}

      {/* Click hint — hidden in pin mode, pointer-events:none so it doesn't block map */}
      {cfg.clickable && !hideClickHint && !isPinMode && (
        <div
          className="absolute z-[1002] pointer-events-none"
          style={{ top: 56, left: 10 }}
        >
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

      {/* Pin mode hint — pointer-events:none so it doesn't block map */}
      {isPinMode && (
        <div
          className="absolute z-[1002] pointer-events-none"
          style={{ top: 56, left: 10 }}
        >
          <div
            className="rounded px-2 py-0.5"
            style={{
              background: "rgba(15,30,55,0.85)",
              backdropFilter: "blur(4px)",
            }}
          >
            <span className="text-white/80 text-[9px]">
              Tap map or drag pin • Long press to drop pin
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
      {showSmartPins && ready && !hideSmartPinsLegend && !isPinMode && (
        <div className="absolute bottom-10 left-2 z-[1001] flex flex-col gap-1 pointer-events-none">
          {[
            { color: "#F59E0B", label: "Tech Park" },
            { color: "#7C3AED", label: "Metro" },
            { color: "#3B82F6", label: "Bus Stop" },
            { color: "#8B5CF6", label: "Railway" },
            { color: "#EF4444", label: "Hospital" },
            { color: "#10B981", label: "School" },
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

      {/* FIX 3 — Pin confirmation sheet: shown after BOTH click and long press (consistent with Seller portal) */}
      {longPressCoords && (
        <div
          className="absolute bottom-0 left-0 right-0 z-[2001] px-4 pb-4 pt-3"
          style={{
            background:
              "linear-gradient(to top, rgba(7,26,47,0.97) 0%, rgba(7,26,47,0.85) 100%)",
            backdropFilter: "blur(16px)",
            borderTop: "1px solid rgba(59,130,246,0.5)",
          }}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] animate-pulse" />
            <p className="text-white/50 text-xs font-semibold tracking-wide uppercase">
              Detected Location
            </p>
          </div>
          <p className="text-white text-sm font-bold mb-1 pl-5">
            {longPressCoords.name ||
              pinLabel ||
              `${longPressCoords.lat.toFixed(4)}, ${longPressCoords.lng.toFixed(4)}`}
          </p>
          <p className="text-white/30 text-[11px] mb-3 pl-5">
            {longPressCoords.lat.toFixed(5)}, {longPressCoords.lng.toFixed(5)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleLongPressCancel}
              data-ocid="map.pin_confirm.cancel_button"
              className="px-5 py-2.5 rounded-xl text-sm font-medium"
              style={{
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.55)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              Change
            </button>
            <button
              type="button"
              onClick={handleLongPressConfirm}
              data-ocid="map.pin_confirm.confirm_button"
              className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)",
                color: "#ffffff",
                boxShadow: "0 4px 20px rgba(59,130,246,0.4)",
              }}
            >
              📍 Confirm Location
            </button>
          </div>
        </div>
      )}

      {/* Pollution overlay */}
      {pollutionData && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 200,
            background: pollutionData.color,
            opacity: 0.07,
            mixBlendMode: "multiply",
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// ─── Build smart pin popup HTML ────────────────────────────────────────────────

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

function formatEmployees(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}
