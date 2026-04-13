// GeoIntelligenceMap.tsx — thin wrapper around GlobalMapComponent
// Preserves the legacy prop interface used by AreaIntelligencePage and others.
// Now correctly forwards dynamicPoiPins + activePoiCategory to GlobalMapComponent.
import type { DynamicPoiPin } from "./GlobalMapComponent";
import GlobalMapComponent from "./GlobalMapComponent";

interface GeoIntelligenceMapProps {
  lat: number;
  lng: number;
  city?: string;
  height?: number;
  onLocationChange?: (lat: number, lng: number, name: string) => void;
  layerScope?: "basic" | "full";
  showLayerPanel?: boolean;
  /** Dynamic POI pins (from OSRM) to render on the map */
  dynamicPoiPins?: DynamicPoiPin[];
  /** Active category filter — only pins matching this category are shown */
  activePoiCategory?: string;
  // Legacy props consumed but not forwarded
  name?: string;
  externalLocation?: unknown;
  layers?: unknown;
  showSmartPins?: boolean;
  onLayerToggle?: unknown;
  defaultShowSmartPins?: boolean;
  hideLevelSelector?: boolean;
  hideInfraPanel?: boolean;
  hideInfraLegend?: boolean;
  hideClickHint?: boolean;
  hideSmartPinsLegend?: boolean;
  disableDefaultSmartPins?: boolean;
  [key: string]: unknown;
}

export default function GeoIntelligenceMap({
  lat,
  lng,
  city,
  height = 280,
  onLocationChange,
  layerScope = "basic",
  showLayerPanel = true,
  dynamicPoiPins,
  activePoiCategory,
  // consume legacy props — do NOT forward
  name: _name,
  externalLocation: _externalLocation,
  layers: _layers,
  showSmartPins: _showSmartPins,
  onLayerToggle: _onLayerToggle,
  defaultShowSmartPins: _defaultShowSmartPins,
  ...rest
}: GeoIntelligenceMapProps) {
  return (
    <GlobalMapComponent
      mode={layerScope === "full" ? "area-intelligence" : "valuation"}
      center={[lat, lng]}
      zoom={13}
      height={`${height}px`}
      city={city}
      showLayerToggle={showLayerPanel}
      onLocationSelect={onLocationChange}
      dynamicPoiPins={dynamicPoiPins}
      activePoiCategory={activePoiCategory}
      {...rest}
    />
  );
}
