import {
  Activity,
  ArrowUp,
  Baby,
  BatteryCharging,
  Bell,
  Cpu,
  Droplets,
  Dumbbell,
  Flame,
  Leaf,
  Monitor,
  ParkingSquare,
  Shield,
  SlidersHorizontal,
  Star,
  Sun,
  Sunset,
  Waves,
  Zap,
} from "lucide-react";
// AdditionalFiltersStep.tsx — Step 4: floor, builder, project, amenities
// Updated to 18 amenities in 3 categories (Basic/Lifestyle/Premium) with icons
// Floor shown only for apartment/builder_floor; hidden for villa/plot/independent_house/commercial/studio
// Plot: shows ONLY plotType, facing (optional), roadWidth (optional) — NO age/floor/amenities
import { useEffect, useMemo, useRef, useState } from "react";
import { BANGALORE_PROJECTS } from "../../data/bangaloreProjects";
import {
  AMENITIES_BY_CATEGORY,
  type AdditionalFiltersData,
  type AmenityDef,
  type FloorPreferenceLegacy,
  type PlotFacing,
  type PlotRoadWidth,
  type PlotType,
  type PropertyAge,
  type PropertyType,
  showAgeFor,
  showAmenitiesFor,
} from "./types";

// Re-export for consumers
export type { AdditionalFiltersData };

interface AdditionalFiltersStepProps {
  onNext: (data: AdditionalFiltersData) => void;
  onBack: () => void;
  initialData?: Partial<AdditionalFiltersData>;
  locality?: string;
  requireExtraFields?: boolean;
  hideAreaFields?: boolean;
  propertyType?: PropertyType | string;
}

const AGE_OPTIONS: PropertyAge[] = ["New", "<5yr", "5-10yr", "10+yr"];

function shouldShowFloor(propertyType?: PropertyType | string): boolean {
  if (!propertyType) return true;
  const normalized = propertyType.toLowerCase().trim();
  return normalized === "apartment" || normalized === "builder_floor";
}

const FLOOR_OPTIONS: {
  value: FloorPreferenceLegacy;
  label: string;
  sub: string;
}[] = [
  { value: "Any", label: "Any Floor", sub: "No preference" },
  { value: "Low", label: "Low Floor", sub: "1–3" },
  { value: "Mid", label: "Mid Floor", sub: "4–8" },
  { value: "High", label: "High Floor", sub: "9–15" },
  { value: "Top", label: "Top Floor", sub: "15+" },
];

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ReactNode> = {
  ArrowUp: <ArrowUp size={16} />,
  ParkingSquare: <ParkingSquare size={16} />,
  Zap: <Zap size={16} />,
  Shield: <Shield size={16} />,
  Droplets: <Droplets size={16} />,
  Flame: <Flame size={16} />,
  Dumbbell: <Dumbbell size={16} />,
  Waves: <Waves size={16} />,
  Star: <Star size={16} />,
  Leaf: <Leaf size={16} />,
  Baby: <Baby size={16} />,
  Activity: <Activity size={16} />,
  Cpu: <Cpu size={16} />,
  BatteryCharging: <BatteryCharging size={16} />,
  Monitor: <Monitor size={16} />,
  Bell: <Bell size={16} />,
  Sun: <Sun size={16} />,
  Sunset: <Sunset size={16} />,
};

// ─── Builder/Project data ─────────────────────────────────────────────────────

const BUILDER_PROJECTS_DATA: Record<string, string[]> = {
  Prestige: [
    "Prestige Lakeside Habitat",
    "Prestige Finsbury Park",
    "Prestige Primrose Hills",
    "Prestige Southern Star",
    "Prestige Serenity Shores",
    "Prestige Song of the South",
    "Prestige Elysian",
    "Prestige Park Grove",
    "Prestige Botanique",
  ],
  Sobha: [
    "Sobha Dream Acres",
    "Sobha City",
    "Sobha Neopolis",
    "Sobha Windsor",
    "Sobha HRC Pristine",
    "Sobha Forest Edge",
    "Sobha Silicon Oasis",
    "Sobha Iris",
  ],
  Brigade: [
    "Brigade Orchards",
    "Brigade El Dorado",
    "Brigade Utopia",
    "Brigade Horizon",
    "Brigade Valencia",
    "Brigade Citadel",
    "Brigade Woods",
    "Brigade Meadows",
  ],
  "Total Environment": [
    "Total Environment In That Quiet Earth",
    "Total Environment Pursuit of a Radical Rhapsody",
    "Total Environment Windmills of Your Mind",
    "Total Environment Down by the Water",
  ],
  Puravankara: [
    "Purva Atmosphere",
    "Purva Zenium",
    "Purva Aspire",
    "Purva Skywood",
    "Purva Palm Beach",
    "Purva Promenade",
  ],
  Godrej: [
    "Godrej Woodscapes",
    "Godrej Splendour",
    "Godrej Reserve",
    "Godrej Aqua",
    "Godrej United",
    "Godrej Air Whitefield",
  ],
  "Birla Estates": [
    "Birla Trimaya",
    "Birla Alokya",
    "Birla Navya",
    "Birla Tisya",
  ],
};

function getBuildersForLocality(locality: string): string[] {
  const locKey = (locality ?? "").toLowerCase().trim();
  const projects = locKey
    ? BANGALORE_PROJECTS.filter(
        (p) =>
          p.locality.toLowerCase().includes(locKey) ||
          locKey.includes(p.locality.toLowerCase()),
      )
    : BANGALORE_PROJECTS;
  return [...new Set(projects.map((p) => p.builder))].sort();
}

function getProjectsForBuilder(builder: string, locality: string): string[] {
  const builderKey = builder.toLowerCase().trim();
  const locKey = (locality ?? "").toLowerCase().trim();
  const staticKey = Object.keys(BUILDER_PROJECTS_DATA).find(
    (k) =>
      k.toLowerCase() === builderKey || k.toLowerCase().includes(builderKey),
  );
  const staticProjects = staticKey ? BUILDER_PROJECTS_DATA[staticKey] : [];
  const dynamicProjects = BANGALORE_PROJECTS.filter((p) => {
    const matchBuilder = p.builder.toLowerCase().includes(builderKey);
    const matchLoc =
      !locKey ||
      p.locality.toLowerCase().includes(locKey) ||
      locKey.includes(p.locality.toLowerCase());
    return matchBuilder && matchLoc;
  });
  const dynamicNames = [...new Set(dynamicProjects.map((p) => p.name))];
  const seen = new Set(staticProjects.map((n) => n.toLowerCase()));
  return [
    ...staticProjects,
    ...dynamicNames.filter((n) => !seen.has(n.toLowerCase())),
  ].sort();
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "rgba(216,181,106,0.8)",
};

const inputWrapStyle: React.CSSProperties = {
  background: "rgba(10, 15, 30, 0.95)",
  border: "1px solid rgba(255,255,255,0.15)",
  backdropFilter: "blur(8px)",
  borderRadius: 14,
  padding: "12px 16px",
  display: "flex",
  alignItems: "center",
};

const errorStyle: React.CSSProperties = {
  color: "#f87171",
  fontSize: 12,
  marginTop: 4,
};

const CATEGORY_LABELS: Record<string, { title: string; color: string }> = {
  basic: { title: "Basic Amenities", color: "rgba(96,165,250,0.8)" },
  lifestyle: { title: "Lifestyle Amenities", color: "rgba(52,211,153,0.8)" },
  premium: { title: "Premium Amenities", color: "rgba(216,181,106,0.9)" },
};

// ─── Custom Dropdown ───────────────────────────────────────────────────────────

interface CustomDropdownProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  "data-ocid"?: string;
  includeOther?: boolean;
  hasError?: boolean;
}

function CustomDropdown({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  "data-ocid": ocid,
  includeOther = true,
  hasError = false,
}: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allOptions = includeOther ? [...options, "__other__"] : options;
  const selectedLabel = value === "__other__" ? "Other (type manually)" : value;

  return (
    <div
      ref={ref}
      style={{ position: "relative", width: "100%" }}
      data-ocid={ocid}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          background: "rgba(10, 15, 30, 0.95)",
          border: hasError
            ? "1px solid #ef4444"
            : "1px solid rgba(255,255,255,0.15)",
          borderRadius: 14,
          padding: "12px 16px",
          color: value ? "#F4F7FF" : "rgba(255,255,255,0.4)",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 14,
          opacity: disabled ? 0.5 : 1,
          backdropFilter: "blur(8px)",
          textAlign: "left",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {selectedLabel || placeholder || "Select…"}
        </span>
        <span
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 11,
            marginLeft: 8,
          }}
        >
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 9999,
            background: "rgba(10,15,30,0.97)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            maxHeight: 240,
            overflowY: "auto",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          {allOptions.map((opt) => {
            const isOther = opt === "__other__";
            const isSelected = opt === value;
            return (
              <button
                type="button"
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  color: isSelected
                    ? "#F59E0B"
                    : isOther
                      ? "rgba(216,181,106,0.7)"
                      : "#F4F7FF",
                  background: isSelected
                    ? "rgba(245,158,11,0.1)"
                    : "transparent",
                  cursor: "pointer",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                  textAlign: "left",
                }}
              >
                {isSelected && (
                  <span style={{ fontSize: 12, color: "#F59E0B" }}>✓</span>
                )}
                {isOther && !isSelected && (
                  <span
                    style={{ fontSize: 12, color: "rgba(216,181,106,0.6)" }}
                  >
                    +
                  </span>
                )}
                {isOther ? "Other (type manually)" : opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AdditionalFiltersStep({
  onNext,
  onBack,
  initialData,
  locality = "",
  requireExtraFields = false,
  propertyType,
}: AdditionalFiltersStepProps) {
  const [age, setAge] = useState<PropertyAge | undefined>(initialData?.age);
  const [floor, setFloor] = useState<FloorPreferenceLegacy | undefined>(() => {
    const f = initialData?.floor;
    if (!f) return "Any";
    // Normalize new lowercase FloorPreference to legacy capitalized
    const capMap: Record<string, FloorPreferenceLegacy> = {
      low: "Low",
      mid: "Mid",
      high: "High",
      top: "Top",
      any: "Any",
    };
    return (
      (capMap[f.toLowerCase()] as FloorPreferenceLegacy | undefined) ??
      (f as FloorPreferenceLegacy)
    );
  });
  const [exactFloor, setExactFloor] = useState<string>(
    initialData?.exactFloor ?? "",
  );
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>(
    initialData?.amenities ?? [],
  );

  // Plot-specific state
  const [plotType, setPlotType] = useState<PlotType | undefined>(
    initialData?.plotType,
  );
  const [plotFacing, setPlotFacing] = useState<PlotFacing | undefined>(
    initialData?.plotFacing,
  );
  const [plotRoadWidth, setPlotRoadWidth] = useState<PlotRoadWidth | undefined>(
    initialData?.plotRoadWidth,
  );

  const [ageError, setAgeError] = useState("");
  const [floorError, setFloorError] = useState("");

  const ageRef = useRef<HTMLDivElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);

  const [builderSelect, setBuilderSelect] = useState<string>(
    initialData?.builder ?? "",
  );
  const [builderManual, setBuilderManual] = useState<string>("");
  const [projectSelect, setProjectSelect] = useState<string>(
    initialData?.project ?? "",
  );
  const [projectManual, setProjectManual] = useState<string>("");

  const [customBuilders, setCustomBuilders] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("vb_custom_builders") || "[]");
    } catch {
      return [];
    }
  });
  const [customProjects, setCustomProjects] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("vb_custom_projects") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("vb_custom_builders", JSON.stringify(customBuilders));
  }, [customBuilders]);

  useEffect(() => {
    localStorage.setItem("vb_custom_projects", JSON.stringify(customProjects));
  }, [customProjects]);

  const builderOptions = useMemo(
    () => getBuildersForLocality(locality),
    [locality],
  );

  const allBuilderOptions = useMemo(() => {
    const known = new Set(builderOptions.map((b) => b.toLowerCase()));
    return [
      ...customBuilders.filter((b) => !known.has(b.toLowerCase())),
      ...builderOptions,
    ];
  }, [builderOptions, customBuilders]);

  const effectiveBuilder =
    builderSelect === "__other__" ? builderManual.trim() : builderSelect;

  const projectOptions = useMemo(
    () =>
      effectiveBuilder
        ? getProjectsForBuilder(effectiveBuilder, locality)
        : (() => {
            const locKey = (locality ?? "").toLowerCase().trim();
            const filtered = locKey
              ? BANGALORE_PROJECTS.filter(
                  (p) =>
                    p.locality.toLowerCase().includes(locKey) ||
                    locKey.includes(p.locality.toLowerCase()),
                )
              : BANGALORE_PROJECTS;
            return [...new Set(filtered.map((p) => p.name))].sort();
          })(),
    [effectiveBuilder, locality],
  );

  const allProjectOptions = useMemo(() => {
    const known = new Set(projectOptions.map((p) => p.toLowerCase()));
    return [
      ...customProjects.filter((p) => !known.has(p.toLowerCase())),
      ...projectOptions,
    ];
  }, [projectOptions, customProjects]);

  const effectiveProject =
    projectSelect === "__other__" ? projectManual.trim() : projectSelect;

  const toggleAmenity = (id: string) => {
    setSelectedAmenityIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Determine which sections to show based on property type
  // Normalize to lowercase for case-insensitive comparison — "Plot" and "plot" are identical
  const normalizedPropertyType = (propertyType ?? "").toLowerCase().trim();
  const isPlot =
    normalizedPropertyType === "plot" || normalizedPropertyType === "land";
  const showAge = showAgeFor(propertyType);
  const showFloor = shouldShowFloor(propertyType);
  const showAmenities = showAmenitiesFor(propertyType);

  const handleNext = () => {
    let hasError = false;

    if (requireExtraFields && !isPlot) {
      if (!age) {
        setAgeError("Age of property is required");
        hasError = true;
      } else {
        setAgeError("");
      }

      if (showFloor && (!floor || floor === "Any")) {
        setFloorError("Floor preference is required");
        hasError = true;
      } else {
        setFloorError("");
      }

      if (hasError) {
        if (!age && ageRef.current) {
          ageRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        } else if (floorRef.current) {
          floorRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
        return;
      }
    }

    if (builderSelect === "__other__" && builderManual.trim()) {
      const name = builderManual.trim();
      if (!customBuilders.includes(name))
        setCustomBuilders((prev) => [name, ...prev].slice(0, 20));
    }
    if (projectSelect === "__other__" && projectManual.trim()) {
      const name = projectManual.trim();
      if (!customProjects.includes(name))
        setCustomProjects((prev) => [name, ...prev].slice(0, 20));
    }

    onNext({
      age: isPlot ? undefined : age,
      floor: isPlot ? undefined : floor,
      exactFloor: isPlot ? undefined : exactFloor.trim() || undefined,
      builder: effectiveBuilder || undefined,
      project: effectiveProject || undefined,
      amenities:
        !isPlot && selectedAmenityIds.length > 0
          ? selectedAmenityIds
          : undefined,
      // Plot-specific fields
      plotType: isPlot ? plotType : undefined,
      plotFacing: isPlot ? plotFacing : undefined,
      plotRoadWidth: isPlot ? plotRoadWidth : undefined,
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Heading */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <SlidersHorizontal size={20} style={{ color: "#D8B56A" }} />
          <h2
            className="text-2xl font-bold"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "#F4F7FF",
            }}
          >
            Refine your search
          </h2>
        </div>
        <p style={{ color: "rgba(185,198,216,0.7)", fontSize: 14 }}>
          {isPlot
            ? "Add plot details for a more accurate valuation"
            : requireExtraFields
              ? "Age and floor preference are required for accurate valuation"
              : "All fields are optional — skip to see results now"}
        </p>
      </div>

      {/* ── PLOT-SPECIFIC FIELDS ─────────────────────────────────────────── */}
      {isPlot && (
        <>
          {/* Plot Type */}
          <div className="space-y-2">
            <p style={labelStyle}>
              Plot Type{" "}
              <span
                style={{
                  color: "rgba(255,255,255,0.3)",
                  fontWeight: 400,
                  textTransform: "none",
                  letterSpacing: 0,
                }}
              >
                (optional)
              </span>
            </p>
            <CustomDropdown
              options={[
                "Residential Plot",
                "Commercial Plot",
                "Agricultural Plot",
                "BDA/BMRDA Approved",
                "Corner Plot",
                "Layout Plot",
              ]}
              value={plotType ?? ""}
              onChange={(v) => setPlotType(v as PlotType)}
              placeholder="Select plot type…"
              data-ocid="filters_step.plot_type_select"
              includeOther={false}
            />
          </div>

          {/* Facing */}
          <div className="space-y-2">
            <p style={labelStyle}>
              Facing{" "}
              <span
                style={{
                  color: "rgba(255,255,255,0.3)",
                  fontWeight: 400,
                  textTransform: "none",
                  letterSpacing: 0,
                }}
              >
                (optional)
              </span>
            </p>
            <CustomDropdown
              options={[
                "East",
                "West",
                "North",
                "South",
                "North-East",
                "North-West",
              ]}
              value={plotFacing ?? ""}
              onChange={(v) => setPlotFacing(v as PlotFacing)}
              placeholder="Select facing direction…"
              data-ocid="filters_step.plot_facing_select"
              includeOther={false}
            />
          </div>

          {/* Road Width */}
          <div className="space-y-2">
            <p style={labelStyle}>
              Road Width{" "}
              <span
                style={{
                  color: "rgba(255,255,255,0.3)",
                  fontWeight: 400,
                  textTransform: "none",
                  letterSpacing: 0,
                }}
              >
                (optional)
              </span>
            </p>
            <CustomDropdown
              options={["10 ft", "20 ft", "30 ft", "40 ft", "60 ft+"]}
              value={plotRoadWidth ?? ""}
              onChange={(v) => setPlotRoadWidth(v as PlotRoadWidth)}
              placeholder="Select road width…"
              data-ocid="filters_step.plot_road_width_select"
              includeOther={false}
            />
          </div>
        </>
      )}

      {/* ── NON-PLOT FIELDS ──────────────────────────────────────────────── */}

      {/* Age of property — hidden for plots */}
      {showAge && (
        <div className="space-y-3" ref={ageRef}>
          <p style={labelStyle}>
            Age of Property
            {requireExtraFields && (
              <span style={{ color: "#f87171", marginLeft: 4 }}>*</span>
            )}
          </p>
          <div
            className="flex flex-wrap gap-2"
            data-ocid="filters_step.age_options"
            style={
              ageError
                ? { outline: "1px solid #ef4444", borderRadius: 12, padding: 4 }
                : {}
            }
          >
            {AGE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  setAge(age === opt ? undefined : opt);
                  setAgeError("");
                }}
                data-ocid={`filters_step.age.${opt}`}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  background:
                    age === opt
                      ? "rgba(216,181,106,0.15)"
                      : "rgba(255,255,255,0.05)",
                  border:
                    age === opt
                      ? "1.5px solid rgba(216,181,106,0.55)"
                      : "1.5px solid rgba(255,255,255,0.09)",
                  color: age === opt ? "#D8B56A" : "rgba(255,255,255,0.55)",
                  cursor: "pointer",
                }}
              >
                {opt}
              </button>
            ))}
          </div>
          {ageError && <p style={errorStyle}>{ageError}</p>}
        </div>
      )}

      {/* Floor preference — only for apartment/builder_floor, never for plot */}
      {showFloor && (
        <div className="space-y-3" ref={floorRef}>
          <p style={labelStyle}>
            Floor Level
            {requireExtraFields && (
              <span style={{ color: "#f87171", marginLeft: 4 }}>*</span>
            )}
          </p>
          <div
            className="flex flex-wrap gap-2"
            data-ocid="filters_step.floor_options"
            style={
              floorError
                ? { outline: "1px solid #ef4444", borderRadius: 12, padding: 4 }
                : {}
            }
          >
            {FLOOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setFloor(opt.value);
                  setFloorError("");
                }}
                data-ocid={`filters_step.floor.${opt.value.toLowerCase()}`}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex flex-col items-center min-w-[80px]"
                style={{
                  background:
                    floor === opt.value
                      ? "rgba(216,181,106,0.15)"
                      : "rgba(255,255,255,0.05)",
                  border:
                    floor === opt.value
                      ? "1.5px solid rgba(216,181,106,0.55)"
                      : "1.5px solid rgba(255,255,255,0.09)",
                  color:
                    floor === opt.value ? "#D8B56A" : "rgba(255,255,255,0.55)",
                  cursor: "pointer",
                }}
              >
                <span className="font-semibold">{opt.label}</span>
                <span
                  style={{
                    fontSize: 10,
                    color:
                      floor === opt.value
                        ? "rgba(216,181,106,0.7)"
                        : "rgba(255,255,255,0.3)",
                    marginTop: 1,
                  }}
                >
                  {opt.sub}
                </span>
              </button>
            ))}
          </div>
          {floorError && <p style={errorStyle}>{floorError}</p>}

          {/* Exact floor input */}
          <div>
            <p style={{ ...labelStyle, marginBottom: 8 }}>
              Exact Floor (Optional)
            </p>
            <div style={inputWrapStyle}>
              <input
                type="number"
                value={exactFloor}
                onChange={(e) => setExactFloor(e.target.value)}
                placeholder="e.g. 7"
                min={1}
                max={60}
                data-ocid="filters_step.exact_floor_input"
                className="flex-1 bg-transparent outline-none"
                style={{
                  color: "#F4F7FF",
                  caretColor: "#F4F7FF",
                  fontSize: 14,
                  background: "transparent",
                  border: "none",
                  width: "100%",
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.35)",
                  marginLeft: 6,
                }}
              >
                floor
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Builder dropdown */}
      <div className="space-y-2">
        <p style={labelStyle}>
          {isPlot ? "Builder / Layout Developer / Owner" : "Builder Name"}{" "}
          <span
            style={{
              color: "rgba(255,255,255,0.3)",
              fontWeight: 400,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            (optional)
          </span>
        </p>
        {allBuilderOptions.length > 0 ? (
          <>
            <CustomDropdown
              options={allBuilderOptions}
              value={builderSelect}
              onChange={(v) => {
                setBuilderSelect(v);
                setProjectSelect("");
                setProjectManual("");
                setBuilderManual("");
              }}
              placeholder={
                locality ? "Select builder in this area" : "Select builder"
              }
              data-ocid="filters_step.builder_select"
              includeOther={true}
            />
            {builderSelect === "__other__" && (
              <div style={inputWrapStyle}>
                <input
                  type="text"
                  value={builderManual}
                  onChange={(e) => setBuilderManual(e.target.value)}
                  placeholder="Type builder name…"
                  data-ocid="filters_step.builder_manual_input"
                  className="flex-1 bg-transparent outline-none"
                  style={{
                    color: "#F4F7FF",
                    caretColor: "#F4F7FF",
                    fontSize: 14,
                    background: "transparent",
                    border: "none",
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <div style={inputWrapStyle}>
            <input
              type="text"
              value={
                builderSelect === "__other__" ? builderManual : builderSelect
              }
              onChange={(e) => setBuilderSelect(e.target.value)}
              placeholder="e.g. Prestige, Brigade, Sobha…"
              data-ocid="filters_step.builder_input"
              className="flex-1 bg-transparent outline-none"
              style={{
                color: "#F4F7FF",
                caretColor: "#F4F7FF",
                fontSize: 14,
                background: "transparent",
                border: "none",
              }}
            />
          </div>
        )}
      </div>

      {/* Project dropdown */}
      <div className="space-y-2">
        <p style={labelStyle}>
          Project Name{" "}
          <span
            style={{
              color: "rgba(255,255,255,0.3)",
              fontWeight: 400,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            (optional)
          </span>
        </p>
        {allProjectOptions.length > 0 ? (
          <>
            <CustomDropdown
              options={allProjectOptions}
              value={projectSelect}
              onChange={setProjectSelect}
              placeholder={
                effectiveBuilder
                  ? "Select project"
                  : locality
                    ? "Select project in this area"
                    : "Select project (optional)"
              }
              data-ocid="filters_step.project_select"
              includeOther={true}
            />
            {projectSelect === "__other__" && (
              <div style={inputWrapStyle}>
                <input
                  type="text"
                  value={projectManual}
                  onChange={(e) => setProjectManual(e.target.value)}
                  placeholder="Type project name…"
                  data-ocid="filters_step.project_manual_input"
                  className="flex-1 bg-transparent outline-none"
                  style={{
                    color: "#F4F7FF",
                    caretColor: "#F4F7FF",
                    fontSize: 14,
                    background: "transparent",
                    border: "none",
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <>
            {effectiveBuilder && (
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                No projects found for{" "}
                <span style={{ color: "#D8B56A" }}>{effectiveBuilder}</span> —
                enter manually below.
              </div>
            )}
            <div style={inputWrapStyle}>
              <input
                type="text"
                value={projectManual}
                onChange={(e) => setProjectManual(e.target.value)}
                placeholder="Can't find your project? Enter manually…"
                data-ocid="filters_step.project_manual_input"
                className="flex-1 bg-transparent outline-none"
                style={{
                  color: "#F4F7FF",
                  caretColor: "#F4F7FF",
                  fontSize: 14,
                  background: "transparent",
                  border: "none",
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Amenities — 18 items in 3 categories — hidden for plots */}
      {showAmenities && (
        <div className="space-y-4">
          <p style={labelStyle}>
            Amenities{" "}
            <span
              style={{
                color: "rgba(255,255,255,0.3)",
                fontWeight: 400,
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              (optional)
            </span>
          </p>

          {(["basic", "lifestyle", "premium"] as const).map((category) => {
            const { title, color } = CATEGORY_LABELS[category];
            const amenities = AMENITIES_BY_CATEGORY[category];
            return (
              <div key={category} className="space-y-2">
                {/* Category header */}
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color,
                  }}
                >
                  {title}
                </p>
                <div
                  className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                  data-ocid={`filters_step.amenities_${category}`}
                >
                  {amenities.map((amenity: AmenityDef) => {
                    const isSelected = selectedAmenityIds.includes(amenity.id);
                    return (
                      <button
                        type="button"
                        key={amenity.id}
                        onClick={() => toggleAmenity(amenity.id)}
                        data-ocid={`filters_step.amenity.${amenity.id}`}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left"
                        style={{
                          background: isSelected
                            ? "rgba(216,181,106,0.12)"
                            : "rgba(255,255,255,0.04)",
                          border: isSelected
                            ? "1.5px solid rgba(216,181,106,0.4)"
                            : "1.5px solid rgba(255,255,255,0.08)",
                          color: isSelected
                            ? "#D8B56A"
                            : "rgba(255,255,255,0.5)",
                          cursor: "pointer",
                        }}
                      >
                        <span
                          style={{
                            color: isSelected
                              ? "#D8B56A"
                              : "rgba(255,255,255,0.35)",
                            flexShrink: 0,
                          }}
                        >
                          {ICON_MAP[amenity.icon] ?? null}
                        </span>
                        <span style={{ fontSize: 12, lineHeight: 1.2 }}>
                          {amenity.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          data-ocid="filters_step.back_button"
          className="px-6 py-4 rounded-2xl font-semibold text-sm transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.6)",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          data-ocid="filters_step.see_results_button"
          className="flex-1 py-4 rounded-2xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg, #D8B56A 0%, #E8C97A 100%)",
            color: "#071A2F",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(216,181,106,0.3)",
          }}
        >
          ✨ See Results
        </button>
      </div>
    </div>
  );
}
