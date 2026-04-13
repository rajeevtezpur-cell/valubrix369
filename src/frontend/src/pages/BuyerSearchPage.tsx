import { useNavigate } from "@tanstack/react-router";
import { Filter, Map as MapIcon, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import BuyerLayout from "../components/BuyerLayout";
import GlobalMapComponent from "../components/GlobalMapComponent";
import ListingCard from "../components/ListingCard";
import SmartLocationSearch from "../components/SmartLocationSearch";
import { getCoords } from "../data/localityCoords";
import type { LocationRecord } from "../data/locationData";
import { getAllListings } from "../data/mockListings";

const CONSTRUCTION_AGES = [
  { value: "any", label: "Any Age" },
  { value: "0-3", label: "0–3 yrs" },
  { value: "3-7", label: "3–7 yrs" },
  { value: "7-10", label: "7–10 yrs" },
  { value: "10+", label: "10+ yrs" },
];

export default function BuyerSearchPage() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(true);
  const [propTypes, setPropTypes] = useState<string[]>([]);
  const [bhkFilter, setBhkFilter] = useState<number[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [builderFilter, setBuilderFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [constructionAge, setConstructionAge] = useState("any");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] =
    useState<LocationRecord | null>(null);
  const [showMap, setShowMap] = useState(false);

  const togglePropType = (t: string) =>
    setPropTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  const toggleBhk = (b: number) =>
    setBhkFilter((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b],
    );
  const toggleAmenity = (a: string) =>
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );

  function handleLocalitySelect(loc: { name: string; city: string }) {
    const syntheticLocation: LocationRecord = {
      id: `locality-${loc.name.toLowerCase().replace(/ /g, "-")}`,
      name: loc.name,
      type: "locality" as const,
      city: loc.city,
      district: loc.city,
      state: "India",
      pincode: "",
      searchTokens: [loc.name.toLowerCase(), loc.city.toLowerCase()],
    };
    setSelectedLocation(syntheticLocation);
    setShowMap(false);
  }

  const filtered = getAllListings().filter((l) => {
    if (propTypes.length > 0 && !propTypes.includes(l.propertyType))
      return false;
    if (bhkFilter.length > 0) {
      if (bhkFilter.includes(4)) {
        if (!l.bhk || (l.bhk < 4 && !bhkFilter.slice(0, -1).includes(l.bhk)))
          return false;
      } else if (l.bhk && !bhkFilter.includes(l.bhk)) return false;
    }
    if (minPrice && l.price < Number(minPrice) * 100000) return false;
    if (maxPrice && l.price > Number(maxPrice) * 100000) return false;
    if (
      builderFilter &&
      !l.builderName?.toLowerCase().includes(builderFilter.toLowerCase())
    )
      return false;
    if (
      projectFilter &&
      !l.title.toLowerCase().includes(projectFilter.toLowerCase())
    )
      return false;
    const area = l.carpetArea || l.plotArea || 0;
    if (minArea && area < Number(minArea)) return false;
    if (maxArea && area > Number(maxArea)) return false;
    if (amenities.length > 0) {
      const has = amenities.every((a) =>
        l.amenities?.some((la) => la.toLowerCase().includes(a.toLowerCase())),
      );
      if (!has) return false;
    }
    if (selectedLocation) {
      const locName = selectedLocation.name.toLowerCase().trim();
      const lLoc = l.location.toLowerCase().trim();
      const matches = lLoc.includes(locName) || locName.includes(lLoc);
      if (!matches) return false;
    }
    return true;
  });

  const mapProjects = filtered
    .map((l) => {
      const loc = l.location || "";
      const coords = getCoords(loc);
      const lat = coords?.lat ?? 0;
      const lng = coords?.lng ?? 0;
      return {
        id: String(l.id),
        name: l.title,
        builder: l.builder || l.builderName || "",
        locality: loc,
        price_min: l.price,
        price_max: l.aiUpper || l.price,
        latitude: lat,
        longitude: lng,
        score: { tag: "Listing", investmentScore: 70 },
      };
    })
    .filter((p) => p.latitude !== 0);

  return (
    <BuyerLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Search Properties</h1>
            <p className="text-white/40 text-sm mt-0.5">
              {filtered.length} properties found
            </p>
          </div>
          <button
            type="button"
            data-ocid="buyer_search.filter.toggle"
            onClick={() => setShowFilters((f) => !f)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white text-sm transition-all"
          >
            <SlidersHorizontal size={14} />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>

        {/* Location Search + Map Toggle */}
        <div className="mb-5">
          <div className="flex items-start gap-2">
            <div
              className="flex-1 max-w-xl"
              data-ocid="buyer_search.location.search_input"
            >
              <SmartLocationSearch
                placeholder="Filter by locality, city or region..."
                onSelect={(loc) => {
                  setSelectedLocation(loc);
                  setShowMap(false);
                }}
                className="w-full"
              />
            </div>
            <button
              type="button"
              data-ocid="buyer_search.map.toggle"
              onClick={() => setShowMap((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all whitespace-nowrap ${
                showMap
                  ? "bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37]"
                  : "bg-white/5 border-white/10 text-white/60 hover:text-white"
              }`}
            >
              <MapIcon size={14} />
              Select on Map
            </button>
          </div>

          {/* Map View */}
          {showMap && (
            <div
              className="mt-3 rounded-2xl border border-white/10 overflow-hidden"
              style={{ height: 320 }}
            >
              {mapProjects.length > 0 ? (
                <GlobalMapComponent
                  mode="buy"
                  height="320px"
                  projects={mapProjects as any}
                  onMarkerClick={(p: any) => {
                    handleLocalitySelect({
                      name: p.locality,
                      city: "Bangalore",
                    });
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#0a0f1e] text-white/40 text-sm">
                  No listed properties with location data to show on map
                </div>
              )}
            </div>
          )}

          {selectedLocation && (
            <button
              type="button"
              onClick={() => {
                setSelectedLocation(null);
              }}
              className="mt-2 text-xs text-white/40 hover:text-white flex items-center gap-1"
            >
              <X size={12} /> Clear location filter ({selectedLocation.name},{" "}
              {selectedLocation.city})
            </button>
          )}
        </div>

        <div className="flex gap-6 overflow-hidden">
          {/* FILTER PANEL */}
          {showFilters && (
            <aside
              data-ocid="buyer_search.filter.panel"
              className="w-full sm:w-64 flex-shrink-0 space-y-5"
            >
              {/* Property Type */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">
                  Property Type
                </p>
                <div className="flex flex-wrap gap-2">
                  {["flat", "villa", "plot"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => togglePropType(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                        propTypes.includes(t)
                          ? "bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37]"
                          : "bg-white/5 border-white/10 text-white/50 hover:text-white"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">
                  Price Range (Lakhs)
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    data-ocid="buyer_search.min_price.input"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#D4AF37]/50 placeholder:text-white/30"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    data-ocid="buyer_search.max_price.input"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#D4AF37]/50 placeholder:text-white/30"
                  />
                </div>
              </div>

              {/* BHK */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">
                  BHK
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => toggleBhk(b)}
                      className={`w-10 h-10 rounded-lg text-xs font-bold border transition-all ${
                        bhkFilter.includes(b)
                          ? "bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37]"
                          : "bg-white/5 border-white/10 text-white/50 hover:text-white"
                      }`}
                    >
                      {b === 4 ? "4+" : b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Builder & Project */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <div>
                  <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">
                    Builder Name
                  </p>
                  <input
                    type="text"
                    placeholder="e.g. Prestige, Sobha"
                    value={builderFilter}
                    onChange={(e) => setBuilderFilter(e.target.value)}
                    data-ocid="buyer_search.builder.input"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#D4AF37]/50 placeholder:text-white/30"
                  />
                </div>
                <div>
                  <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">
                    Project Name
                  </p>
                  <input
                    type="text"
                    placeholder="e.g. Lakeside Habitat"
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    data-ocid="buyer_search.project.input"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#D4AF37]/50 placeholder:text-white/30"
                  />
                </div>
              </div>

              {/* Area Size */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">
                  Area (sqft)
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minArea}
                    onChange={(e) => setMinArea(e.target.value)}
                    data-ocid="buyer_search.min_area.input"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#D4AF37]/50 placeholder:text-white/30"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxArea}
                    onChange={(e) => setMaxArea(e.target.value)}
                    data-ocid="buyer_search.max_area.input"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#D4AF37]/50 placeholder:text-white/30"
                  />
                </div>
              </div>

              {/* Construction Age */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">
                  Construction Age
                </p>
                <select
                  value={constructionAge}
                  onChange={(e) => setConstructionAge(e.target.value)}
                  data-ocid="buyer_search.construction_age.select"
                  className="w-full bg-[#0A0F1F] border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#D4AF37]/50"
                >
                  {CONSTRUCTION_AGES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amenities */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">
                  Amenities
                </p>
                <div className="space-y-2">
                  {["Parking", "Gym", "Swimming Pool"].map((a) => (
                    <label
                      key={a}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={amenities.includes(a)}
                        onChange={() => toggleAmenity(a)}
                        className="w-4 h-4 accent-[#D4AF37]"
                      />
                      <span className="text-white/60 text-xs">{a}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Reset */}
              <button
                type="button"
                onClick={() => {
                  setPropTypes([]);
                  setBhkFilter([]);
                  setMinPrice("");
                  setMaxPrice("");
                  setBuilderFilter("");
                  setProjectFilter("");
                  setMinArea("");
                  setMaxArea("");
                  setConstructionAge("any");
                  setAmenities([]);
                  setSelectedLocation(null);
                }}
                className="w-full py-2 rounded-xl border border-white/10 text-white/40 hover:text-white text-xs flex items-center justify-center gap-1 transition-all"
              >
                <Filter size={12} /> Reset Filters
              </button>
            </aside>
          )}

          {/* PROPERTY GRID */}
          <div className="flex-1 min-w-0">
            {filtered.length === 0 ? (
              <div
                data-ocid="buyer_search.empty_state"
                className="flex flex-col items-center justify-center py-24 text-white/30"
              >
                <p className="text-lg font-medium">
                  No properties match your filters
                </p>
                <p className="text-sm mt-1">
                  Try adjusting or resetting the filters
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filtered.map((listing, idx) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    showActions="buyer"
                    index={idx}
                    onView={() =>
                      navigate({
                        to: "/property/$id",
                        params: { id: listing.id },
                      })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}
