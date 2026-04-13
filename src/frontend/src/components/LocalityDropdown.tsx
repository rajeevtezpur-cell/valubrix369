import { MapPin, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type MicroLocation,
  getLocationsByZone,
  getMicroLocationByName,
  getOrderedLocations,
} from "../data/bangaloreMicroLocations";
import locationData from "../data/locationData";
import { searchLocations } from "../utils/locationSearch";

interface Props {
  value: string;
  onChange: (locality: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** BUG 6 FIX: Filter results to this city only */
  city?: string;
}

const ZONE_ORDER = ["North", "East", "South", "West", "Central"] as const;

const ZONE_LABEL: Record<string, string> = {
  North: "North Bangalore",
  East: "East Bangalore",
  South: "South Bangalore",
  West: "West Bangalore",
  Central: "Central Bangalore",
};

const ZONE_BADGE: Record<string, string> = {
  North: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  East: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  South: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  West: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  Central: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
};

const ZONE_DOT: Record<string, string> = {
  North: "bg-blue-400",
  East: "bg-emerald-400",
  South: "bg-orange-400",
  West: "bg-purple-400",
  Central: "bg-yellow-400",
};

// Search across both micro-locations dataset and locationData
function searchMicroLocations(query: string): MicroLocation[] {
  const q = query.toLowerCase().trim();
  return getOrderedLocations().filter(
    (l) =>
      l.name.toLowerCase().includes(q) ||
      l.parentArea.toLowerCase().includes(q) ||
      l.pincode.includes(q) ||
      l.zone.toLowerCase().includes(q),
  );
}

// Get fallback localities from locationData that aren't in micro dataset
function getFallbackResults(
  query: string,
  limit = 10,
): { name: string; city: string }[] {
  const found = searchLocations(query, locationData);
  return found.slice(0, limit).map((l) => ({ name: l.name, city: l.city }));
}

export default function LocalityDropdown({
  value,
  onChange,
  placeholder = "Search locality...",
  className = "",
  disabled = false,
  city,
}: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [microResults, setMicroResults] = useState<MicroLocation[]>([]);
  const [fallbackResults, setFallbackResults] = useState<
    { name: string; city: string }[]
  >([]);
  const [highlightedIdx, setHighlightedIdx] = useState<number>(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const popularByZone = useCallback(() => {
    const byZone = getLocationsByZone();
    const grouped: Record<string, MicroLocation[]> = {};
    for (const zone of ZONE_ORDER) {
      const popular = (byZone[zone] ?? []).filter((l) => l.isPopular);
      if (popular.length > 0) grouped[zone] = popular;
    }
    return grouped;
  }, []);

  // Build grouped micro results for search mode
  const groupedMicroResults = useCallback(() => {
    const grouped: Record<string, MicroLocation[]> = {};
    for (const loc of microResults) {
      const zone = loc.zone;
      if (!grouped[zone]) grouped[zone] = [];
      grouped[zone].push(loc);
    }
    return grouped;
  }, [microResults]);

  // Sync input when external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleInput(q: string) {
    setQuery(q);
    setHighlightedIdx(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length === 0) {
      setMicroResults([]);
      setFallbackResults([]);
      setOpen(true); // show popular
      return;
    }

    if (q.length < 1) {
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      let micro = searchMicroLocations(q).slice(0, 50);

      // BUG 6 FIX: If city is provided and it's not Bangalore, filter by city
      // (micro-locations dataset is Bangalore-focused; for other cities show fallback only)
      if (city && city.toLowerCase() !== "bangalore") {
        micro = []; // Don't show Bangalore micro-locations for other cities
      }

      setMicroResults(micro);

      // Fallback: names NOT already in micro results
      const microNames = new Set(micro.map((l) => l.name.toLowerCase()));
      let fallback = getFallbackResults(q, 15).filter(
        (f) => !microNames.has(f.name.toLowerCase()),
      );

      // BUG 6 FIX: Filter fallback results by city if provided
      if (city) {
        fallback = fallback.filter(
          (f) =>
            !f.city ||
            f.city.toLowerCase() === city.toLowerCase() ||
            f.city
              .toLowerCase()
              .includes(city.toLowerCase().split(" ")[0].toLowerCase()),
        );
      }

      setFallbackResults(fallback.slice(0, 10));
      setOpen(true);
    }, 300);
  }

  // Flat list of all items for keyboard nav
  function getFlatItems(): string[] {
    if (!query) {
      const popular = popularByZone();
      const items: string[] = [];
      for (const zone of ZONE_ORDER) {
        for (const loc of popular[zone] ?? []) items.push(loc.name);
      }
      return items;
    }
    const items: string[] = [];
    const grouped = groupedMicroResults();
    for (const zone of ZONE_ORDER) {
      for (const loc of grouped[zone] ?? []) items.push(loc.name);
    }
    for (const f of fallbackResults) items.push(f.name);
    return items;
  }

  function handleSelect(name: string) {
    setQuery(name);
    onChange(name);
    setOpen(false);
    setMicroResults([]);
    setFallbackResults([]);
    setHighlightedIdx(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const items = getFlatItems();
    if (!open || items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx((prev) => Math.min(prev + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightedIdx >= 0) {
      e.preventDefault();
      handleSelect(items[highlightedIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightedIdx(-1);
    }
  }

  function handleBlur() {
    setTimeout(() => {
      setOpen(false);
      if (query && query !== value) {
        const exact = getMicroLocationByName(query);
        if (exact) {
          onChange(exact.name);
          setQuery(exact.name);
        } else {
          // Try locationData
          const found = searchLocations(query, locationData);
          const exactLoc = found.find(
            (l) => l.name.toLowerCase() === query.toLowerCase(),
          );
          if (exactLoc) {
            onChange(exactLoc.name);
            setQuery(exactLoc.name);
          } else {
            onChange("");
            setQuery("");
          }
        }
      }
    }, 150);
  }

  function handleFocus() {
    setOpen(true);
    if (query.length >= 1) {
      const micro = searchMicroLocations(query).slice(0, 50);
      setMicroResults(micro);
    }
  }

  const popular = popularByZone();
  const grouped = groupedMicroResults();
  const flatItems = getFlatItems();
  let flatIdx = 0;

  const isSearching = query.length > 0;
  const hasResults = isSearching
    ? microResults.length > 0 || fallbackResults.length > 0
    : Object.keys(popular).length > 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input */}
      <div className="relative flex items-center">
        <Search
          size={14}
          className="absolute left-3 text-white/40 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          data-ocid="locality.search_input"
          className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1.5 rounded-xl border border-white/10 bg-[#0f1825] shadow-2xl shadow-black/60 max-h-72 overflow-y-auto scroll-smooth"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.1) transparent",
          }}
        >
          {!isSearching && (
            <>
              {/* Popular section header */}
              <div className="px-3 pt-2.5 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                  Popular Locations
                </span>
              </div>

              {ZONE_ORDER.map((zone, zoneI) => {
                const locs = popular[zone];
                if (!locs || locs.length === 0) return null;
                return (
                  <div key={zone}>
                    {/* Zone header */}
                    {zoneI > 0 && (
                      <div className="border-t border-white/5 mt-0.5" />
                    )}
                    <div className="flex items-center gap-2 px-3 py-1.5">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${ZONE_DOT[zone]}`}
                      />
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-white/35">
                        {ZONE_LABEL[zone]}
                      </span>
                    </div>
                    {locs.slice(0, 6).map((loc) => {
                      const idx = flatItems.indexOf(loc.name);
                      const isHighlighted = highlightedIdx === idx;
                      return (
                        <LocationItem
                          key={loc.id}
                          loc={loc}
                          isHighlighted={isHighlighted}
                          onSelect={handleSelect}
                          zoneBadge={ZONE_BADGE[zone]}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}

          {isSearching && hasResults && (
            <>
              {/* Micro-location grouped results */}
              {ZONE_ORDER.map((zone, zoneI) => {
                const locs = grouped[zone];
                if (!locs || locs.length === 0) return null;
                const firstInZone =
                  zoneI === 0 ||
                  ZONE_ORDER.slice(0, zoneI).every(
                    (z) => !grouped[z] || grouped[z].length === 0,
                  );
                return (
                  <div key={zone}>
                    {!firstInZone && (
                      <div className="border-t border-white/5 mt-0.5" />
                    )}
                    {/* Zone header */}
                    <div className="flex items-center gap-2 px-3 py-1.5 mt-0.5">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${ZONE_DOT[zone]}`}
                      />
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-white/35">
                        {ZONE_LABEL[zone]}
                      </span>
                    </div>
                    {locs.map((loc) => {
                      const curIdx = flatIdx;
                      flatIdx++;
                      const isHighlighted = highlightedIdx === curIdx;
                      return (
                        <LocationItem
                          key={loc.id}
                          loc={loc}
                          isHighlighted={isHighlighted}
                          onSelect={handleSelect}
                          zoneBadge={ZONE_BADGE[zone]}
                        />
                      );
                    })}
                  </div>
                );
              })}

              {/* Fallback results (from locationData) */}
              {fallbackResults.length > 0 && (
                <>
                  <div className="border-t border-white/5 mt-0.5" />
                  <div className="px-3 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-white/25">
                      More Locations
                    </span>
                  </div>
                  {fallbackResults.map((loc) => {
                    const curIdx = flatIdx;
                    flatIdx++;
                    const isHighlighted = highlightedIdx === curIdx;
                    return (
                      <button
                        key={`fallback-${loc.name}`}
                        type="button"
                        onMouseDown={() => handleSelect(loc.name)}
                        className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors ${
                          isHighlighted ? "bg-white/10" : "hover:bg-white/8"
                        }`}
                      >
                        <div className="shrink-0 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                          <MapPin size={11} className="text-white/30" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-white truncate block">
                            {loc.name}
                          </span>
                          <span className="text-xs text-white/35">
                            {loc.city}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </>
          )}

          {/* Empty state */}
          {isSearching && !hasResults && query.length >= 2 && (
            <div className="px-3 py-5 text-sm text-white/40 text-center">
              No localities found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LocationItem({
  loc,
  isHighlighted,
  onSelect,
  zoneBadge,
}: {
  loc: MicroLocation;
  isHighlighted: boolean;
  onSelect: (name: string) => void;
  zoneBadge: string;
}) {
  const subInfo = loc.pincode
    ? `${loc.parentArea} • ${loc.pincode}`
    : loc.parentArea;

  return (
    <button
      type="button"
      onMouseDown={() => onSelect(loc.name)}
      className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors ${
        isHighlighted ? "bg-white/10" : "hover:bg-white/8"
      }`}
    >
      {/* Icon */}
      <div className="shrink-0 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
        <MapPin size={11} className="text-white/40" />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-white">{loc.name}</span>
          {loc.isPopular && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 font-medium leading-none">
              popular
            </span>
          )}
          <span
            className={`text-[9px] px-1 py-0.5 rounded border font-medium leading-none ${zoneBadge}`}
          >
            {loc.zone}
          </span>
        </div>
        <span className="text-xs text-white/40 mt-0.5 block truncate">
          {subInfo}
        </span>
      </div>

      {/* Micro-location tag */}
      <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/25 border border-white/10 font-medium whitespace-nowrap">
        micro-location
      </span>
    </button>
  );
}
