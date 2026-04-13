// MapView.tsx — thin wrapper around GlobalMapComponent
// Preserves the legacy { projects: ScoredProject[], onSelect } prop API.
// @ts-nocheck
import type { ScoredProject } from "../engines/projectIntelligenceEngine";
import GlobalMapComponent, { type ProjectPin } from "./GlobalMapComponent";

interface MapViewProps {
  projects: ScoredProject[];
  onSelect: (p: ScoredProject) => void;
}

export default function MapView({ projects, onSelect }: MapViewProps) {
  const mappedProjects: ProjectPin[] = projects
    .filter((p) => p.latitude && p.longitude && p.latitude !== 0)
    .map((p) => ({
      id: String(p.id ?? p.name),
      name: p.name,
      builder: p.builder,
      locality: p.locality,
      price_min: p.price_min,
      price_max: p.price_max,
      latitude: p.latitude,
      longitude: p.longitude,
      score: p.score,
    }));

  return (
    <GlobalMapComponent
      mode="buy"
      height="100%"
      projects={mappedProjects}
      onMarkerClick={(pin) => {
        // Find the matching ScoredProject and call onSelect
        const match = projects.find(
          (p) => String(p.id ?? p.name) === pin.id || p.name === pin.name,
        );
        if (match) onSelect(match);
      }}
    />
  );
}
