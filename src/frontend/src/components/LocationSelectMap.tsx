// LocationSelectMap.tsx — thin wrapper around GlobalMapComponent
// Preserves the legacy (result: LocationSelectResult) callback API used by
// LocationStep, AreaDiscoverPage, BuyerNeighbourhoodPage, InfrastructureImpactPage, etc.
// @ts-nocheck

import GlobalMapComponent from "./GlobalMapComponent";

export const GEO_LOCALITIES = [
  { name: "Koramangala", city: "Bangalore", lat: 12.9352, lng: 77.6245 },
  { name: "Indiranagar", city: "Bangalore", lat: 12.9784, lng: 77.6408 },
  { name: "Whitefield", city: "Bangalore", lat: 12.9698, lng: 77.7499 },
  { name: "Electronic City", city: "Bangalore", lat: 12.8399, lng: 77.677 },
  { name: "Hebbal", city: "Bangalore", lat: 13.035, lng: 77.597 },
  { name: "Yelahanka", city: "Bangalore", lat: 13.1007, lng: 77.5963 },
  { name: "HSR Layout", city: "Bangalore", lat: 12.9116, lng: 77.6389 },
  { name: "Marathahalli", city: "Bangalore", lat: 12.9591, lng: 77.6975 },
  { name: "Sarjapur Road", city: "Bangalore", lat: 12.901, lng: 77.688 },
  { name: "JP Nagar", city: "Bangalore", lat: 12.9063, lng: 77.5857 },
  { name: "Malleswaram", city: "Bangalore", lat: 13.0035, lng: 77.565 },
  { name: "Devanahalli", city: "Bangalore", lat: 13.25, lng: 77.71 },
  { name: "Thanisandra", city: "Bangalore", lat: 13.06, lng: 77.63 },
  { name: "Hennur", city: "Bangalore", lat: 13.035, lng: 77.638 },
  { name: "BTM Layout", city: "Bangalore", lat: 12.9165, lng: 77.6101 },
  { name: "Jayanagar", city: "Bangalore", lat: 12.9299, lng: 77.5833 },
  { name: "Bellandur", city: "Bangalore", lat: 12.9243, lng: 77.6784 },
  { name: "KR Puram", city: "Bangalore", lat: 13.0052, lng: 77.6955 },
  { name: "Bagalur", city: "Bangalore", lat: 13.18, lng: 77.65 },
  { name: "Rajankunte", city: "Bangalore", lat: 13.13, lng: 77.6 },
  { name: "Nagawara", city: "Bangalore", lat: 13.0486, lng: 77.62 },
  { name: "Banashankari", city: "Bangalore", lat: 12.918, lng: 77.573 },
  { name: "Kanakapura Road", city: "Bangalore", lat: 12.88, lng: 77.55 },
  { name: "Bannerghatta Road", city: "Bangalore", lat: 12.9, lng: 77.6 },
];

export type GeoLocality = (typeof GEO_LOCALITIES)[number];

export interface LocationSelectResult {
  lat: number;
  lng: number;
  displayAddress: string;
  locality: GeoLocality | null;
}

interface Props {
  onLocationSelect: (result: LocationSelectResult) => void;
  height?: string;
  initialCenter?: [number, number];
  className?: string;
  city?: string;
  onClearPin?: () => void;
  layerScope?: "basic" | "full";
  showLayerToggles?: boolean;
  modalMode?: boolean;
}

export default function LocationSelectMap({
  onLocationSelect,
  height = "400px",
  initialCenter,
  className = "",
  city,
  layerScope = "basic",
  showLayerToggles = true,
  modalMode = false,
}: Props) {
  const center: [number, number] = initialCenter ?? [12.9716, 77.5946];

  function handlePinSelect(lat: number, lng: number, displayAddress: string) {
    const matchedLocality =
      GEO_LOCALITIES.find((l) =>
        displayAddress.toLowerCase().includes(l.name.toLowerCase()),
      ) ?? null;
    onLocationSelect({ lat, lng, displayAddress, locality: matchedLocality });
  }

  return (
    <div className={className} style={modalMode ? { height: "100%" } : {}}>
      <GlobalMapComponent
        mode="valuation"
        center={center}
        zoom={11}
        height={modalMode ? "100%" : height}
        city={city}
        showLayerToggle={layerScope === "full" || showLayerToggles}
        onLocationSelect={handlePinSelect}
        fullScreen={modalMode}
      />
    </div>
  );
}
