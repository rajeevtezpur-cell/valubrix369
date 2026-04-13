import { Check, MapPin, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { bangaloreMicroLocations } from "../data/bangaloreMicroLocations";
import { getPincodeForLocality } from "../data/bangaloreMicroLocations";
import type { LocationRecord } from "../data/locationData";
import locationData from "../data/locationData";
import { getActiveListingsForBuyer } from "../services/listingService";
import { searchLocations } from "../utils/locationSearch";
import { searchProjectIndex } from "../utils/searchIndex";

interface SmartLocationSearchProps {
  onSelect?: (location: LocationRecord) => void;
  placeholder?: string;
  size?: "default" | "large";
  className?: string;
  initialLocation?: LocationRecord;
  externalValue?: string;
  /** Use portal mode (position:fixed) when inside an overflow:hidden ancestor (e.g. hero sections) */
  portalDropdown?: boolean;
  /** Change this value to auto-focus the input (e.g. pass activeTab string) */
  focusTrigger?: string | number;
  /** BUG 6 FIX: Filter search results to this city only */
  city?: string;
}

const ZONE_DOT_COLOR: Record<string, string> = {
  North: "#34d399",
  East: "#60a5fa",
  South: "#fbbf24",
  West: "#a78bfa",
  Central: "#f87171",
  Other: "rgba(255,255,255,0.3)",
};

const ZONE_LABEL_COLOR: Record<string, string> = {
  North: "#6ee7b7",
  East: "#93c5fd",
  South: "#fcd34d",
  West: "#c4b5fd",
  Central: "#fca5a5",
  Other: "rgba(255,255,255,0.4)",
};

const ZONE_ORDER = ["North", "Central", "South", "East", "West", "Other"];

export default function SmartLocationSearch({
  onSelect,
  placeholder = "Search locality, city or pincode",
  size = "default",
  className = "",
  initialLocation,
  externalValue,
  portalDropdown = false,
  focusTrigger,
  city,
}: SmartLocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<LocationRecord | null>(
    initialLocation ?? null,
  );
  const [justSelected, setJustSelected] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});

  // Auto-focus when focusTrigger changes (e.g. tab switch in hero)
  useEffect(() => {
    if (focusTrigger !== undefined) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [focusTrigger]);

  // Compute portal position (only used when portalDropdown=true)
  const computePortalStyle = useCallback(() => {
    if (!portalDropdown || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const vv = window.visualViewport;
    const viewH = vv ? vv.height : window.innerHeight;
    const spaceBelow = viewH - rect.bottom;
    const spaceAbove = rect.top;
    const maxH = Math.min(
      320,
      spaceBelow > 180 ? spaceBelow - 16 : spaceAbove - 16,
    );
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    setPortalStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      maxHeight: Math.max(maxH, 120),
      ...(openUp ? { bottom: viewH - rect.top + 6 } : { top: rect.bottom + 6 }),
    });
  }, [portalDropdown]);

  useEffect(() => {
    if (!portalDropdown) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      if (open) computePortalStyle();
    };
    vv.addEventListener("resize", handler);
    vv.addEventListener("scroll", handler);
    return () => {
      vv.removeEventListener("resize", handler);
      vv.removeEventListener("scroll", handler);
    };
  }, [open, portalDropdown, computePortalStyle]);

  // Build a name → zone lookup from bangaloreMicroLocations
  const zoneMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const loc of bangaloreMicroLocations) {
      m[loc.name.toLowerCase()] = loc.zone;
    }
    return m;
  }, []);

  // Group results by zone
  const grouped = useMemo(() => {
    const zones: Record<string, LocationRecord[]> = {};
    for (const loc of results) {
      const zone = zoneMap[loc.name.toLowerCase()] ?? "Other";
      if (!zones[zone]) zones[zone] = [];
      zones[zone].push(loc);
    }
    return zones;
  }, [results, zoneMap]);

  // Flat results list in zone order (for keyboard nav)
  const flatResults = useMemo(() => {
    const flat: LocationRecord[] = [];
    for (const zone of ZONE_ORDER) {
      if (grouped[zone]) flat.push(...grouped[zone]);
    }
    return flat;
  }, [grouped]);

  const handleSearch = useCallback(
    (val: string) => {
      setQuery(val);
      setFocusedIndex(-1);
      if (val.trim().length >= 2) {
        const res = searchLocations(val, locationData);

        // BUG 6 FIX: Filter by city if city prop is provided
        const cityFiltered = city
          ? res.filter(
              (r) =>
                !r.city ||
                r.city.toLowerCase() === city.toLowerCase() ||
                r.city
                  .toLowerCase()
                  .includes(city.toLowerCase().split(" ")[0].toLowerCase()),
            )
          : res;

        // Also surface localities/projects from seller listings not already in static list
        const listedIds = new Set(cityFiltered.map((r) => r.id));
        const allListings = getActiveListingsForBuyer();
        const qLower = val.trim().toLowerCase();
        const extra: typeof res = [];
        const seenExtra = new Set<string>();
        for (const l of allListings) {
          // BUG 6 FIX: Filter listings by city if city prop provided
          if (
            city &&
            l.city &&
            !l.city
              .toLowerCase()
              .includes(city.toLowerCase().split(" ")[0].toLowerCase())
          )
            continue;
          const loc = (l.locality || l.location || "").trim();
          const proj = (l.project || "").trim();
          const locId = loc.toLowerCase().replace(/\s+/g, "-");
          // Surface matching locality if not already in static results
          if (
            loc?.toLowerCase().includes(qLower) &&
            !listedIds.has(locId) &&
            !seenExtra.has(locId)
          ) {
            seenExtra.add(locId);
            extra.push({
              id: locId,
              name: loc,
              type: "locality" as any,
              city: l.city || city || "Bangalore",
              district: l.city || city || "Bangalore",
              state: "Karnataka",
              pincode: l.pincode || "",
              searchTokens: [loc.toLowerCase()],
            });
          }
          // Surface matching project name
          const projId = `proj-${proj.toLowerCase().replace(/\s+/g, "-")}`;
          if (
            proj?.toLowerCase().includes(qLower) &&
            !listedIds.has(projId) &&
            !seenExtra.has(projId)
          ) {
            seenExtra.add(projId);
            extra.push({
              id: projId,
              name: proj,
              type: "project" as any,
              city: l.city || city || "Bangalore",
              district: loc || city || "Bangalore",
              state: "Karnataka",
              pincode: l.pincode || "",
              searchTokens: [proj.toLowerCase(), loc.toLowerCase()],
            });
          }
        }

        // Merge static + listing results
        const combined = [...cityFiltered, ...extra];

        // Also search batch project/builder index
        const projectMatches = searchProjectIndex(val);
        const existingIds = new Set(combined.map((r) => r.id));
        for (const pm of projectMatches) {
          // BUG 6 FIX: Filter project results by city if city prop provided
          // searchProjectIndex returns Bangalore projects by default
          const projectCity = "Bangalore";
          if (
            city &&
            !city.toLowerCase().includes("bangalore") &&
            !projectCity
              .toLowerCase()
              .includes(city.toLowerCase().split(" ")[0].toLowerCase())
          ) {
            continue; // Skip Bangalore projects when a different city is selected
          }
          if (!existingIds.has(pm.id)) {
            combined.push({
              id: pm.id,
              name: `${pm.project} – ${pm.locality}`,
              type: "locality" as LocationRecord["type"],
              city: "Bangalore",
              district: pm.locality,
              state: "Karnataka",
              pincode: "",
              searchTokens: [
                pm.project.toLowerCase(),
                pm.builder.toLowerCase(),
                pm.locality.toLowerCase(),
              ],
            });
            existingIds.add(pm.id);
          }
        }

        const finalCombined = combined.slice(0, 14);
        setResults(finalCombined);
        setOpen(true);
        if (portalDropdown) computePortalStyle();
      } else {
        setResults([]);
        setOpen(false);
      }
    },
    [portalDropdown, computePortalStyle, city],
  );

  const handleSelect = (loc: LocationRecord) => {
    setJustSelected(loc.id);
    setTimeout(() => {
      setSelected(loc);
      setQuery("");
      setOpen(false);
      setResults([]);
      setJustSelected(null);
      setFocusedIndex(-1);
      onSelect?.(loc);
    }, 350);
  };

  const handleClear = () => {
    setSelected(null);
    setQuery("");
    setResults([]);
    setOpen(false);
    setFocusedIndex(-1);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
    } else if (e.key === "Enter") {
      if (focusedIndex >= 0 && focusedIndex < flatResults.length) {
        e.preventDefault();
        handleSelect(flatResults[focusedIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setFocusedIndex(-1);
    }
  };

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex < 0 || !dropdownRef.current) return;
    const items = dropdownRef.current.querySelectorAll<HTMLElement>(
      "[data-dropdown-item]",
    );
    if (items[focusedIndex]) {
      items[focusedIndex].scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional – only sync on externalValue change
  useEffect(() => {
    if (externalValue === undefined) return;
    if (selected && selected.name === externalValue) return;
    if (!selected && query === externalValue) return;
    setSelected(null);
    setQuery(externalValue || "");
  }, [externalValue]);

  const isLarge = size === "large";

  if (selected) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div
          className="location-chip flex items-center gap-2 px-4 py-2.5 rounded-full border shadow-lg"
          style={{
            background: "rgba(37,99,235,0.12)",
            borderColor: "rgba(37,99,235,0.4)",
            color: "#fff",
            boxShadow: "0 2px 12px rgba(37,99,235,0.15)",
          }}
          data-ocid="location.chip"
        >
          <MapPin size={16} style={{ color: "#60a5fa", flexShrink: 0 }} />
          <span className="font-medium text-sm">
            {selected.name}, {selected.city}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="ml-1 transition-colors"
            style={{ color: "rgba(255,255,255,0.5)" }}
            data-ocid="location.chip.close_button"
            aria-label="Change location"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "rgba(255,255,255,0.9)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "rgba(255,255,255,0.5)";
            }}
          >
            <X size={14} />
          </button>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs underline underline-offset-2 transition-colors"
          style={{ color: "rgba(255,255,255,0.5)" }}
          data-ocid="location.change_button"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "rgba(255,255,255,0.8)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "rgba(255,255,255,0.5)";
          }}
        >
          Change location
        </button>
      </div>
    );
  }

  const hasResults = open && results.length > 0;
  const hasEmpty = open && results.length === 0 && query.length >= 2;

  return (
    // CRITICAL: position: relative here so dropdown uses absolute positioning relative to this container
    <div
      ref={wrapperRef}
      className={`relative ${className}`}
      style={{ position: "relative" }}
    >
      <div
        className="search-input-wrapper flex items-center gap-3 rounded-2xl transition-all"
        style={{
          background: "rgba(7, 22, 40, 0.95)",
          border: "1px solid rgba(255,255,255,0.15)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          padding: isLarge ? "16px 20px" : "12px 16px",
          boxShadow: "0 2px 16px rgba(0,0,0,0.4)",
        }}
      >
        <MapPin
          size={isLarge ? 22 : 18}
          style={{ color: "#60a5fa", flexShrink: 0 }}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-white"
          style={{
            // CRITICAL: explicit white text and caret — overrides ALL browser defaults
            color: "#FFFFFF",
            caretColor: "#FFFFFF",
            fontSize: isLarge ? "1.125rem" : "0.875rem",
            // placeholder via CSS custom property isn't reliable; use inline hack
          }}
          // data attribute so we can target placeholder via global CSS if needed
          data-search-input="true"
          data-ocid="location.search_input"
          aria-label="Search location"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
              setResults([]);
              setFocusedIndex(-1);
            }}
            style={{ color: "rgba(255,255,255,0.4)" }}
            className="transition-colors"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "rgba(255,255,255,0.7)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "rgba(255,255,255,0.4)";
            }}
          >
            <X size={16} />
          </button>
        )}
        {!query && (
          <Search
            size={isLarge ? 20 : 16}
            style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}
          />
        )}
      </div>

      {/* Placeholder color fix — injected once as a style tag */}
      <style>{`
        [data-search-input="true"]::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
          opacity: 1 !important;
        }
        /* Mobile Safari fix */
        [data-search-input="true"]::-webkit-input-placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
        }
      `}</style>

      {/* 
        CRITICAL POSITIONING FIX:
        - position: absolute (not fixed) — stays with parent, no viewport jump
        - top: 100% — directly below the input wrapper
        - left: 0, width: 100% — same width as parent
        - marginTop: 6px — 6px gap
        - zIndex: 9999 — above all cards/modals
        - maxHeight + overflow-y: auto — scrollable, never bleeds off screen
      */}
      {hasResults && (
        <div
          ref={dropdownRef}
          data-ocid="location.dropdown_menu"
          style={
            portalDropdown
              ? {
                  ...portalStyle,
                  overflowY: "auto",
                  background: "rgba(10,15,30,0.97)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  boxShadow:
                    "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(255,255,255,0.1) transparent",
                }
              : {
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  width: "100%",
                  marginTop: 6,
                  zIndex: 9999,
                  maxHeight: 320,
                  overflowY: "auto",
                  background: "rgba(10,15,30,0.97)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  boxShadow:
                    "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(255,255,255,0.1) transparent",
                }
          }
        >
          {/* Search icon header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 16px 6px",
            }}
          >
            <Search size={13} style={{ color: "rgba(37,99,235,0.7)" }} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              {city ? `${city} Micro-Locations` : "Micro-Locations"}
            </span>
          </div>

          {ZONE_ORDER.filter((z) => grouped[z]).map((zone) => (
            <div key={zone}>
              {/* Zone group header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px 4px",
                  position: "sticky",
                  top: 0,
                  background: "rgba(10,15,30,0.95)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: ZONE_DOT_COLOR[zone] ?? "rgba(255,255,255,0.3)",
                    flexShrink: 0,
                    display: "inline-block",
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: ZONE_LABEL_COLOR[zone] ?? "rgba(255,255,255,0.4)",
                  }}
                >
                  {zone} {city || "Bangalore"}
                </span>
              </div>

              {/* Zone items */}
              {grouped[zone].map((loc) => {
                const globalIdx = flatResults.indexOf(loc);
                const isFocused = globalIdx === focusedIndex;
                const isJustSelected = justSelected === loc.id;
                const pin =
                  getPincodeForLocality(loc.name) || loc.pincode || "";
                const locZone = zoneMap[loc.name.toLowerCase()] ?? "";

                return (
                  <button
                    type="button"
                    key={loc.id}
                    id={`loc-item-${globalIdx}`}
                    data-dropdown-item
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(loc)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 16px",
                      textAlign: "left",
                      border: "none",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      cursor: "pointer",
                      transition: "background 150ms",
                      background: isJustSelected
                        ? "rgba(37,99,235,0.18)"
                        : isFocused
                          ? "rgba(37,99,235,0.15)"
                          : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isJustSelected && !isFocused) {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "rgba(37,99,235,0.12)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isJustSelected && !isFocused) {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "transparent";
                      }
                    }}
                    data-ocid={`location.dropdown_menu.item.${globalIdx + 1}`}
                  >
                    {/* Location icon */}
                    <div
                      style={{
                        flexShrink: 0,
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: isJustSelected
                          ? "rgba(37,99,235,0.2)"
                          : isFocused
                            ? "rgba(37,99,235,0.15)"
                            : "rgba(255,255,255,0.05)",
                      }}
                    >
                      {isJustSelected ? (
                        <Check size={13} style={{ color: "#D4AF37" }} />
                      ) : (
                        <MapPin
                          size={13}
                          style={{
                            color: isFocused
                              ? "#60a5fa"
                              : "rgba(255,255,255,0.35)",
                          }}
                        />
                      )}
                    </div>

                    {/* Text content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            color: "#FFFFFF",
                            fontSize: 14,
                            lineHeight: 1.3,
                          }}
                        >
                          {loc.name}
                        </span>
                        {/* Micro-location badge */}
                        <span
                          style={{
                            fontSize: 9,
                            padding: "1px 6px",
                            borderRadius: 99,
                            fontWeight: 700,
                            background: "rgba(37,99,235,0.15)",
                            border: "1px solid rgba(37,99,235,0.3)",
                            color: "#93c5fd",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          micro
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.4)",
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {locZone ? `${locZone} Bangalore` : loc.district}
                        {pin && (
                          <span style={{ color: "rgba(255,255,255,0.25)" }}>
                            {" "}
                            &bull; {pin}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}

          <div style={{ height: 4 }} />
        </div>
      )}

      {hasEmpty && (
        <div
          style={
            portalDropdown
              ? {
                  ...portalStyle,
                  background: "rgba(10,15,30,0.97)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
                }
              : {
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  width: "100%",
                  marginTop: 6,
                  zIndex: 9999,
                  background: "rgba(10,15,30,0.97)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
                }
          }
          data-ocid="location.dropdown_menu.empty_state"
        >
          <div style={{ padding: "24px 16px", textAlign: "center" }}>
            <Search
              size={20}
              style={{ color: "rgba(255,255,255,0.2)", margin: "0 auto 8px" }}
            />
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
              No locations found for "{query}"
            </p>
            <p
              style={{
                color: "rgba(255,255,255,0.25)",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              Try a different micro-location or pincode
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
