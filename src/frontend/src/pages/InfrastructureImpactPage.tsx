import { Building, Clock, MapPin, TrendingUp, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import BuyerLayout from "../components/BuyerLayout";
import LocationSelectMap from "../components/LocationSelectMap";
import type { LocationSelectResult } from "../components/LocationSelectMap";
import SmartLocationSearch from "../components/SmartLocationSearch";
import type { LocationRecord } from "../data/locationData";

const PROJECTS = [
  {
    name: "Namma Metro Phase 3",
    location: "Whitefield – Sarjapur",
    type: "Metro Rail",
    completion: "2026",
    impact: "High",
    appreciation: "+18–24%",
    description:
      "Extension of Namma Metro connecting Whitefield to Sarjapur Road, drastically cutting commute time and boosting residential demand along the corridor.",
    status: "Under Construction",
    color: "#D4AF37",
    areas: ["Whitefield", "Sarjapur", "Bellandur"],
  },
  {
    name: "Peripheral Ring Road",
    location: "North & East Bangalore",
    type: "Road Infrastructure",
    completion: "2027",
    impact: "High",
    appreciation: "+14–20%",
    description:
      "240 km ring road connecting major peripheral areas, reducing traffic load on inner roads and opening new residential zones.",
    status: "Under Construction",
    color: "#D4AF37",
    areas: ["Hebbal", "Yelahanka", "Thanisandra", "Bagalur"],
  },
  {
    name: "KIADB Aerospace Park",
    location: "Devanahalli",
    type: "Industrial Park",
    completion: "2025",
    impact: "Very High",
    appreciation: "+22–30%",
    description:
      "World-class aerospace industrial park near Kempegowda International Airport driving massive employment and residential demand.",
    status: "Operational",
    color: "#10b981",
    areas: ["Devanahalli", "Bagalur", "Yelahanka"],
  },
  {
    name: "Bangalore-Chennai Expressway",
    location: "Hosur Road Corridor",
    type: "Expressway",
    completion: "2026",
    impact: "Moderate",
    appreciation: "+10–15%",
    description:
      "New expressway connecting Bangalore to Chennai, improving logistics and increasing residential demand along Electronic City and Hosur Road.",
    status: "Under Construction",
    color: "#f59e0b",
    areas: ["Electronic City", "HSR Layout"],
  },
  {
    name: "Pune Metro Line 3",
    location: "Hinjewadi – Shivajinagar",
    type: "Metro Rail",
    completion: "2026",
    impact: "High",
    appreciation: "+16–22%",
    description:
      "Metro connectivity from Hinjewadi IT hub to central Pune, massively improving commute times and boosting property demand.",
    status: "Under Construction",
    color: "#D4AF37",
    areas: ["Hinjewadi", "Baner", "Wakad"],
  },
  {
    name: "Delhi-Mumbai Expressway Node",
    location: "Gurugram – Manesar",
    type: "Expressway",
    completion: "2025",
    impact: "Very High",
    appreciation: "+20–28%",
    description:
      "Major expressway node in Gurugram unlocking large parcels of land for residential and commercial development with direct Delhi connectivity.",
    status: "Near Completion",
    color: "#10b981",
    areas: ["Dwarka", "Gurgaon", "Manesar"],
  },
];

const IMPACT_COLORS: Record<string, string> = {
  "Very High": "#10b981",
  High: "#D4AF37",
  Moderate: "#f59e0b",
  Low: "#6b7280",
};

export default function InfrastructureImpactPage() {
  const [visible, setVisible] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [filterArea, setFilterArea] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  useEffect(() => {
    setVisible(true);
  }, []);

  const handleSearchSelect = (loc: LocationRecord) => {
    setFilterArea(loc.name);
    setSelectedLocation(loc.name);
  };

  const handleMapSelect = (result: LocationSelectResult) => {
    const name = result.locality?.name ?? result.displayAddress.split(",")[0];
    setFilterArea(name);
    setSelectedLocation(name);
  };

  const filteredProjects = filterArea
    ? PROJECTS.filter(
        (p) =>
          p.areas.some((a) =>
            a.toLowerCase().includes(filterArea.toLowerCase()),
          ) || p.location.toLowerCase().includes(filterArea.toLowerCase()),
      )
    : PROJECTS;

  // Infra score for selected location (simulated)
  const infraScore = selectedLocation
    ? Math.min(95, 55 + filteredProjects.length * 8)
    : null;

  return (
    <BuyerLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Infrastructure Impact
          </h1>
          <p className="text-white/50">
            Upcoming infrastructure projects and their expected impact on
            property values.
          </p>
        </div>

        {/* Search + Map */}
        <div className="mb-4">
          <SmartLocationSearch
            placeholder="Filter by locality (e.g. Whitefield, Baner)..."
            onSelect={handleSearchSelect}
          />
        </div>
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            data-ocid="infra.map.toggle"
            onClick={() => setShowMap((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 text-sm transition-all"
          >
            <MapPin size={14} className="text-[#D4AF37]" />
            {showMap ? "Hide Map" : "Select on Map"}
          </button>
          {filterArea && (
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-xs">
                Filtering: <span className="text-[#D4AF37]">{filterArea}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setFilterArea(null);
                  setSelectedLocation(null);
                }}
                className="text-white/30 text-xs underline hover:text-white/60"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {showMap && (
          <div className="mb-6">
            <LocationSelectMap
              height="300px"
              onLocationSelect={handleMapSelect}
            />
          </div>
        )}

        {/* Infra score for selected location */}
        {infraScore !== null && selectedLocation && (
          <div className="mb-6 bg-gradient-to-r from-[#D4AF37]/10 to-white/5 border border-[#D4AF37]/30 rounded-2xl p-5">
            <p className="text-[#D4AF37] text-xs uppercase tracking-widest mb-2">
              Infrastructure Score
            </p>
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <h2 className="text-white text-xl font-bold">
                  {selectedLocation}
                </h2>
                <p className="text-white/40 text-sm">
                  {filteredProjects.length} project
                  {filteredProjects.length !== 1 ? "s" : ""} impacting this area
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20">
                  <svg
                    viewBox="0 0 80 80"
                    className="w-full h-full -rotate-90"
                    aria-hidden="true"
                  >
                    <title>Infrastructure Score Ring</title>
                    <circle
                      cx="40"
                      cy="40"
                      r="30"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="8"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="30"
                      fill="none"
                      stroke="#D4AF37"
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 30 * (infraScore / 100)} ${2 * Math.PI * 30}`}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dasharray 1s ease" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {infraScore}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[#D4AF37] font-bold text-2xl">
                    {infraScore}/100
                  </p>
                  <p className="text-white/40 text-xs">Infrastructure Score</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Active Projects",
              value: `${filteredProjects.length}`,
              icon: Building,
            },
            { label: "Cities Covered", value: "4", icon: MapPin },
            { label: "Avg Appreciation", value: "+18%", icon: TrendingUp },
            {
              label: "Completing by 2027",
              value: `${filteredProjects.length}`,
              icon: Clock,
            },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "scale(1)" : "scale(0.9)",
                transition: `opacity 0.4s ease ${i * 0.1}s, transform 0.4s ease ${i * 0.1}s`,
              }}
            >
              <stat.icon size={18} className="text-[#D4AF37] mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-white/40 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div
            className="text-center py-12 text-white/30"
            data-ocid="infra.empty_state"
          >
            <p>
              No infrastructure projects found for{" "}
              <span className="text-[#D4AF37]">{filterArea}</span>.
            </p>
            <button
              type="button"
              onClick={() => {
                setFilterArea(null);
                setSelectedLocation(null);
              }}
              className="mt-2 text-[#D4AF37] underline text-sm"
            >
              Show all projects
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjects.map((proj, i) => (
            <div
              key={proj.name}
              data-ocid={`infrastructure.card.${i + 1}`}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:-translate-y-1 transition-transform duration-200"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(24px)",
                transition: `opacity 0.5s ease ${0.2 + i * 0.08}s, transform 0.5s ease ${0.2 + i * 0.08}s`,
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap
                      size={14}
                      style={{ color: IMPACT_COLORS[proj.impact] }}
                    />
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: IMPACT_COLORS[proj.impact] }}
                    >
                      {proj.type}
                    </span>
                  </div>
                  <h3 className="text-white font-bold text-lg">{proj.name}</h3>
                  <div className="flex items-center gap-1 mt-1 text-white/40 text-xs">
                    <MapPin size={10} /> {proj.location}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {proj.areas.map((a) => (
                      <span
                        key={a}
                        className="text-[10px] bg-white/5 border border-white/10 text-white/40 px-2 py-0.5 rounded-full"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-lg"
                    style={{
                      backgroundColor: `${IMPACT_COLORS[proj.impact]}20`,
                      color: IMPACT_COLORS[proj.impact],
                    }}
                  >
                    {proj.impact} Impact
                  </span>
                </div>
              </div>
              <p className="text-white/50 text-sm leading-relaxed mb-4">
                {proj.description}
              </p>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-white/40">
                  <Clock size={12} />
                  <span>
                    Completion:{" "}
                    <span className="text-white/70 font-medium">
                      {proj.completion}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-emerald-400" />
                  <span className="text-emerald-400 font-bold text-sm">
                    {proj.appreciation}
                  </span>
                  <span className="text-white/30 text-xs">expected</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/10">
                <span
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: `${proj.color}15`,
                    color: proj.color,
                    border: `1px solid ${proj.color}30`,
                  }}
                >
                  {proj.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BuyerLayout>
  );
}
