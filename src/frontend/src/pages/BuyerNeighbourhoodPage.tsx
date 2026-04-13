import { useParams } from "@tanstack/react-router";
import { MapPin, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import BuyerLayout from "../components/BuyerLayout";
import LocationSelectMap from "../components/LocationSelectMap";
import type { LocationSelectResult } from "../components/LocationSelectMap";
import { PortalGuard } from "../components/PortalGuard";
import SmartLocationSearch from "../components/SmartLocationSearch";

function seedHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++)
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function sv(seed: number, min: number, max: number) {
  const x = Math.sin(seed) * 10000;
  return Math.round(min + (x - Math.floor(x)) * (max - min));
}
function toTitleCase(str: string) {
  return str.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ScoreBar({
  label,
  score,
  color,
  delay = 0,
}: { label: string; score: number; color: string; delay?: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 300 + delay);
    return () => clearTimeout(t);
  }, [score, delay]);
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex justify-between items-center mb-3">
        <p className="text-white/70 text-sm">{label}</p>
        <span className="font-bold" style={{ color }}>
          {score}/100
        </span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${width}%`, background: color }}
        />
      </div>
    </div>
  );
}

function NeighbourhoodContent({
  areaName,
  coords,
}: { areaName: string; coords?: [number, number] }) {
  const seed = seedHash(areaName);
  const walkScore = sv(seed, 55, 92);
  const connectScore = sv(seed + 1, 60, 95);
  const safetyScore = sv(seed + 2, 50, 90);
  const greenScore = sv(seed + 3, 40, 85);

  const amenities = [
    {
      type: "Schools",
      count: sv(seed + 10, 5, 15),
      nearest: sv(seed + 11, 300, 1500),
    },
    {
      type: "Hospitals",
      count: sv(seed + 12, 3, 10),
      nearest: sv(seed + 13, 500, 2500),
    },
    {
      type: "Parks",
      count: sv(seed + 14, 4, 12),
      nearest: sv(seed + 15, 200, 800),
    },
    {
      type: "Malls",
      count: sv(seed + 16, 2, 6),
      nearest: sv(seed + 17, 1000, 4000),
    },
    {
      type: "Metro Stations",
      count: sv(seed + 18, 1, 4),
      nearest: sv(seed + 19, 500, 3000),
    },
  ];

  const tenantProfile = [
    { label: "IT/Tech", pct: sv(seed + 20, 35, 60) },
    { label: "Family", pct: sv(seed + 21, 25, 45) },
    { label: "Students", pct: sv(seed + 22, 5, 20) },
  ];
  const total = tenantProfile.reduce((s, t) => s + t.pct, 0);
  const normalized = tenantProfile.map((t) => ({
    ...t,
    pct: Math.round((t.pct / total) * 100),
  }));

  const infraTimeline = [
    { year: "2025", project: `${areaName} Metro Extension Phase 1` },
    { year: "2026", project: `${areaName} Ring Road Widening` },
    { year: "2027", project: "Smart City Zone Activation" },
  ];

  const nearbyLocalities = [
    {
      name: `${areaName.split(" ")[0]} Extension`,
      score: sv(seed + 30, 60, 88),
    },
    { name: `North ${areaName.split(" ")[0]}`, score: sv(seed + 31, 55, 85) },
    { name: `${areaName.split(" ")[0]} Phase 2`, score: sv(seed + 32, 50, 82) },
  ];

  const profileColors = ["#60a5fa", "#10b981", "#f59e0b"];

  return (
    <div>
      <div className="mb-8">
        <p className="text-[#D4AF37] text-xs uppercase tracking-widest mb-1">
          Neighbourhood Score
        </p>
        <h1 className="text-3xl font-bold text-white">{areaName}</h1>
        {coords && (
          <p className="text-white/30 text-xs mt-1 font-mono">
            {coords[0].toFixed(4)}°N, {coords[1].toFixed(4)}°E
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <ScoreBar
          label="Walk Score"
          score={walkScore}
          color="#10b981"
          delay={0}
        />
        <ScoreBar
          label="Connectivity"
          score={connectScore}
          color="#60a5fa"
          delay={100}
        />
        <ScoreBar
          label="Safety"
          score={safetyScore}
          color="#a78bfa"
          delay={200}
        />
        <ScoreBar
          label="Green Score"
          score={greenScore}
          color="#34d399"
          delay={300}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h2 className="text-white font-bold text-sm">Amenity Proximity</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/30 text-xs border-b border-white/10">
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-right px-5 py-3">Count</th>
                <th className="text-right px-5 py-3">Nearest</th>
              </tr>
            </thead>
            <tbody>
              {amenities.map((a, i) => (
                <tr
                  key={a.type}
                  data-ocid={`neighbourhood.row.${i + 1}`}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-5 py-3 text-white/70">{a.type}</td>
                  <td className="px-5 py-3 text-right text-white font-semibold">
                    {a.count}
                  </td>
                  <td className="px-5 py-3 text-right text-white/40">
                    {a.nearest < 1000
                      ? `${a.nearest}m`
                      : `${(a.nearest / 1000).toFixed(1)}km`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-bold mb-4 text-sm">Tenant Profile</h3>
          <div className="space-y-4">
            {normalized.map((t, i) => (
              <div key={t.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/60">{t.label}</span>
                  <span
                    className="font-bold"
                    style={{ color: profileColors[i] }}
                  >
                    {t.pct}%
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${t.pct}%`, background: profileColors[i] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
        <h3 className="text-white font-bold mb-5 text-sm">
          Infrastructure Timeline
        </h3>
        <div className="relative">
          <div className="absolute left-[34px] top-0 bottom-0 w-px bg-white/10" />
          <div className="space-y-5">
            {infraTimeline.map((item, i) => (
              <div
                key={item.year}
                className="flex items-center gap-4"
                style={{
                  opacity: 1,
                  transition: `opacity 0.4s ${0.5 + i * 0.15}s`,
                }}
              >
                <div className="w-[68px] flex-shrink-0 flex items-center justify-end">
                  <span className="text-[#D4AF37] text-xs font-bold">
                    {item.year}
                  </span>
                </div>
                <div className="w-3 h-3 rounded-full bg-[#D4AF37] flex-shrink-0 z-10" />
                <p className="text-white/60 text-sm">{item.project}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-[#D4AF37]/20 rounded-2xl p-5 mb-8">
        <h3 className="text-[#D4AF37] font-bold mb-3 text-sm">
          AI Neighbourhood Summary
        </h3>
        <p className="text-white/60 text-sm leading-relaxed">
          {areaName} presents a well-balanced neighbourhood with strong
          connectivity ({connectScore}/100) and above-average walkability (
          {walkScore}/100). The area is predominantly occupied by IT
          professionals ({normalized[0].pct}%), creating stable rental demand.
          Planned infrastructure upgrades including metro extension and road
          widening are expected to drive 15–25% appreciation by 2027. Safety
          index at {safetyScore}/100 is above city average.
        </p>
      </div>

      <div>
        <h2 className="text-white font-bold mb-4">Nearby Localities</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {nearbyLocalities.map((nl, i) => (
            <div
              key={nl.name}
              data-ocid={`neighbourhood.item.${i + 1}`}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-[#D4AF37]/40 transition-colors"
            >
              <p className="text-white font-semibold">{nl.name}</p>
              <div className="text-3xl font-bold text-[#D4AF37] mt-2">
                {nl.score}
              </div>
              <p className="text-white/30 text-xs">Neighbourhood Score</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BuyerNeighbourhoodPage() {
  const { area } = useParams({ strict: false }) as { area: string };
  const [areaName, setAreaName] = useState(toTitleCase(area || "whitefield"));
  const [coords, setCoords] = useState<[number, number] | undefined>(undefined);
  const [showMap, setShowMap] = useState(false);

  const handleMapSelect = (result: LocationSelectResult) => {
    if (result.locality) {
      setAreaName(result.locality.name);
      setCoords([result.lat, result.lng]);
    } else {
      setAreaName(result.displayAddress.split(",")[0]);
      setCoords([result.lat, result.lng]);
    }
  };

  const handleSearchSelect = (loc: { name: string }) => {
    setAreaName(loc.name);
  };

  const handleClear = () => {
    setAreaName(toTitleCase(area || "whitefield"));
    setCoords(undefined);
  };

  return (
    <PortalGuard portal="buyer">
      <BuyerLayout>
        <div className="max-w-5xl mx-auto">
          {/* Search + Map Controls */}
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <SmartLocationSearch
                  placeholder="Search neighbourhood, area, or city..."
                  onSelect={handleSearchSelect}
                />
              </div>
              {coords && (
                <button
                  type="button"
                  data-ocid="neighbourhood.close_button"
                  onClick={handleClear}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 text-sm transition-all"
                >
                  <X size={14} />
                  Clear
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                data-ocid="neighbourhood.map.toggle"
                onClick={() => setShowMap((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 text-sm transition-all"
              >
                <MapPin size={14} className="text-[#D4AF37]" />
                {showMap ? "Hide Map" : "Select Location on Map"}
              </button>
            </div>
          </div>

          {showMap && (
            <div className="mb-8">
              <LocationSelectMap
                height="300px"
                initialCenter={coords ?? [12.9716, 77.5946]}
                onLocationSelect={handleMapSelect}
              />
            </div>
          )}

          {coords && (
            <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl">
              <Search size={14} className="text-[#D4AF37]" />
              <span className="text-[#D4AF37] text-sm font-medium">
                Showing data for: {areaName}
              </span>
            </div>
          )}

          <NeighbourhoodContent areaName={areaName} coords={coords} />
        </div>
      </BuyerLayout>
    </PortalGuard>
  );
}
