// DynamicFieldRenderer.tsx — Renders property-type-aware fields dynamically
// No hardcoded forms — all rendering conditional based on propertyType
import { useRef } from "react";
import type {
  AreaType,
  BHKOption,
  FloorPreference,
  FlowMode,
  PlotFacing,
  PlotRoadWidth,
  PlotType,
  PropertyFormData,
  PropertyType,
} from "./steps/types";
import { showBHKFor, showFloorFor } from "./steps/types";

interface DynamicFieldRendererProps {
  propertyType: PropertyType | null;
  formData: PropertyFormData;
  onChange: (updates: Partial<PropertyFormData>) => void;
  errors: Record<string, string>;
  mode: FlowMode;
}

const BHK_OPTIONS: BHKOption[] = [
  "1rk",
  "1bhk",
  "2bhk",
  "2.5bhk",
  "3bhk",
  "3.5bhk",
  "4bhk",
  "4+bhk",
];

const FLOOR_OPTIONS: { value: FloorPreference; label: string; sub: string }[] =
  [
    { value: "low", label: "Low Floor", sub: "1–3" },
    { value: "mid", label: "Mid Floor", sub: "4–8" },
    { value: "high", label: "High Floor", sub: "9–15" },
    { value: "top", label: "Top Floor", sub: "15+" },
  ];

const AREA_TYPE_OPTIONS: { value: AreaType; label: string }[] = [
  { value: "carpet", label: "Carpet Area" },
  { value: "buildup", label: "Built-up Area" },
  { value: "superbuildup", label: "Super Built-up (SBA)" },
];

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "rgba(216,181,106,0.8)",
  marginBottom: 8,
  display: "block",
};

const errorStyle: React.CSSProperties = {
  color: "#f87171",
  fontSize: 12,
  marginTop: 4,
};

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

function AreaInput({
  label,
  value,
  onChange,
  error,
  ocid,
  placeholder = "e.g. 1200",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  ocid: string;
  placeholder?: string;
}) {
  return (
    <FieldGroup>
      <p style={labelStyle}>{label}</p>
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{
          background: "rgba(10, 15, 30, 0.9)",
          border: error
            ? "1.5px solid #ef4444"
            : "1px solid rgba(255,255,255,0.15)",
          backdropFilter: "blur(8px)",
        }}
      >
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          data-ocid={ocid}
          className="flex-1 outline-none"
          style={{
            background: "transparent",
            color: "#FFFFFF",
            caretColor: "#D8B56A",
            fontSize: 16,
            fontWeight: 600,
            border: "none",
          }}
          min={100}
        />
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
          sq ft
        </span>
      </div>
      {error && <p style={errorStyle}>⚠ {error}</p>}
    </FieldGroup>
  );
}

export default function DynamicFieldRenderer({
  propertyType,
  formData,
  onChange,
  errors,
}: DynamicFieldRendererProps) {
  const bhkRef = useRef<HTMLDivElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const showBHK = showBHKFor(propertyType);
  const showFloor = showFloorFor(propertyType);
  const isPlot = propertyType === "plot";
  const isVilla = propertyType === "villa";
  const isIndHouse = propertyType === "independent_house";
  const isCommercial = propertyType === "commercial";

  if (!propertyType) {
    return (
      <div
        className="rounded-2xl p-5 text-center"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
          Select a property type to see relevant fields
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* BHK — Apartment, Builder Floor, Studio */}
      {showBHK && (
        <div className="space-y-2" ref={bhkRef}>
          <p style={labelStyle}>BHK Configuration</p>
          <div
            className="flex flex-wrap gap-2"
            data-ocid="dynamic_fields.bhk_options"
            style={
              errors.bhk
                ? { outline: "1px solid #ef4444", borderRadius: 12, padding: 4 }
                : {}
            }
          >
            {BHK_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() =>
                  onChange({ bhk: formData.bhk === opt ? null : opt })
                }
                data-ocid={`dynamic_fields.bhk.${opt}`}
                className="px-3 py-2.5 rounded-xl font-bold transition-all duration-200 text-sm"
                style={{
                  background:
                    formData.bhk === opt
                      ? "rgba(216,181,106,0.18)"
                      : "rgba(255,255,255,0.05)",
                  border:
                    formData.bhk === opt
                      ? "2px solid rgba(216,181,106,0.6)"
                      : "2px solid rgba(255,255,255,0.08)",
                  color:
                    formData.bhk === opt ? "#D8B56A" : "rgba(255,255,255,0.6)",
                  cursor: "pointer",
                }}
              >
                {opt.toUpperCase()}
              </button>
            ))}
          </div>
          {errors.bhk && <p style={errorStyle}>⚠ {errors.bhk}</p>}
        </div>
      )}

      {/* Floor range — Apartment, Builder Floor */}
      {showFloor && (
        <div className="space-y-2" ref={floorRef}>
          <p style={labelStyle}>Floor Level</p>
          <div
            className="flex flex-wrap gap-2"
            data-ocid="dynamic_fields.floor_options"
          >
            {FLOOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onChange({
                    floorRange:
                      formData.floorRange === opt.value ? null : opt.value,
                  })
                }
                data-ocid={`dynamic_fields.floor.${opt.value}`}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex flex-col items-center min-w-[80px]"
                style={{
                  background:
                    formData.floorRange === opt.value
                      ? "rgba(216,181,106,0.15)"
                      : "rgba(255,255,255,0.05)",
                  border:
                    formData.floorRange === opt.value
                      ? "1.5px solid rgba(216,181,106,0.55)"
                      : "1.5px solid rgba(255,255,255,0.09)",
                  color:
                    formData.floorRange === opt.value
                      ? "#D8B56A"
                      : "rgba(255,255,255,0.55)",
                  cursor: "pointer",
                }}
              >
                <span className="font-semibold">{opt.label}</span>
                <span
                  style={{
                    fontSize: 10,
                    color:
                      formData.floorRange === opt.value
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

          {/* Exact floor input */}
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3 mt-2"
            style={{
              background: "rgba(10, 15, 30, 0.9)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(8px)",
            }}
          >
            <input
              type="number"
              value={formData.exactFloor}
              onChange={(e) => onChange({ exactFloor: e.target.value })}
              placeholder="Enter Exact Floor (Optional)"
              data-ocid="dynamic_fields.exact_floor_input"
              className="flex-1 outline-none"
              style={{
                background: "transparent",
                color: "#FFFFFF",
                caretColor: "#D8B56A",
                fontSize: 14,
                border: "none",
              }}
              min={1}
              max={60}
            />
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
              floor
            </span>
          </div>
        </div>
      )}

      {/* Area type + value — varies by property type */}
      {!isPlot && (
        <div className="space-y-2" ref={areaRef}>
          <p style={labelStyle}>
            Area Type <span style={{ color: "#f87171" }}>*</span>
          </p>
          <div
            className="flex flex-wrap gap-2"
            data-ocid="dynamic_fields.area_type_options"
            style={
              errors.areaType
                ? { outline: "1px solid #ef4444", borderRadius: 12, padding: 4 }
                : {}
            }
          >
            {(isCommercial
              ? [AREA_TYPE_OPTIONS[2]] // Commercial: SBA only
              : isVilla || isIndHouse
                ? [AREA_TYPE_OPTIONS[1], AREA_TYPE_OPTIONS[2]] // Villa/IH: buildup + SBA
                : AREA_TYPE_OPTIONS
            ) // All others
              .map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    onChange({
                      areaType:
                        formData.areaType === opt.value ? null : opt.value,
                    })
                  }
                  data-ocid={`dynamic_fields.area_type.${opt.value}`}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{
                    background:
                      formData.areaType === opt.value
                        ? "rgba(96,165,250,0.15)"
                        : "rgba(255,255,255,0.05)",
                    border:
                      formData.areaType === opt.value
                        ? "1.5px solid rgba(96,165,250,0.55)"
                        : errors.areaType
                          ? "1.5px solid #ef4444"
                          : "1.5px solid rgba(255,255,255,0.09)",
                    color:
                      formData.areaType === opt.value
                        ? "#60a5fa"
                        : "rgba(255,255,255,0.55)",
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
          </div>
          {errors.areaType && <p style={errorStyle}>⚠ {errors.areaType}</p>}
        </div>
      )}

      {/* Built-up area value */}
      {!isPlot && (
        <AreaInput
          label={`Area (sq ft)${isVilla || isIndHouse ? " — Built-up" : ""} *`}
          value={formData.areaValue}
          onChange={(v) => onChange({ areaValue: v })}
          error={errors.areaValue}
          ocid="dynamic_fields.area_value_input"
          placeholder="e.g. 1200"
        />
      )}

      {/* Plot: plot size + optional built-up */}
      {isPlot && (
        <>
          <AreaInput
            label="Plot Size (sq ft) *"
            value={formData.areaValue}
            onChange={(v) => onChange({ areaValue: v })}
            error={errors.areaValue}
            ocid="dynamic_fields.plot_size_input"
            placeholder="e.g. 2400"
          />
          <AreaInput
            label="Built-up Area (sq ft) — Optional"
            value={formData.plotArea}
            onChange={(v) => onChange({ plotArea: v })}
            ocid="dynamic_fields.plot_buildup_input"
            placeholder="e.g. 1600"
          />

          {/* Plot Type */}
          <FieldGroup>
            <p style={labelStyle}>
              Plot Type{" "}
              <span
                style={{
                  color: "rgba(255,255,255,0.35)",
                  fontWeight: 400,
                  textTransform: "none",
                  letterSpacing: 0,
                  fontSize: 11,
                }}
              >
                (optional)
              </span>
            </p>
            <div
              className="flex flex-wrap gap-2"
              data-ocid="dynamic_fields.plot_type_options"
            >
              {(
                [
                  "Residential Plot",
                  "Commercial Plot",
                  "Agricultural Plot",
                  "BDA/BMRDA Approved",
                  "Corner Plot",
                  "Layout Plot",
                ] as PlotType[]
              ).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() =>
                    onChange({
                      plotType: formData.plotType === opt ? undefined : opt,
                    })
                  }
                  data-ocid={`dynamic_fields.plot_type.${opt.toLowerCase().replace(/\W+/g, "_")}`}
                  className="px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{
                    background:
                      formData.plotType === opt
                        ? "rgba(216,181,106,0.15)"
                        : "rgba(255,255,255,0.05)",
                    border:
                      formData.plotType === opt
                        ? "1.5px solid rgba(216,181,106,0.55)"
                        : "1.5px solid rgba(255,255,255,0.09)",
                    color:
                      formData.plotType === opt
                        ? "#D8B56A"
                        : "rgba(255,255,255,0.55)",
                    cursor: "pointer",
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </FieldGroup>

          {/* Facing */}
          <FieldGroup>
            <p style={labelStyle}>
              Facing{" "}
              <span
                style={{
                  color: "rgba(255,255,255,0.35)",
                  fontWeight: 400,
                  textTransform: "none",
                  letterSpacing: 0,
                  fontSize: 11,
                }}
              >
                (optional)
              </span>
            </p>
            <div
              className="flex flex-wrap gap-2"
              data-ocid="dynamic_fields.plot_facing_options"
            >
              {(
                [
                  "East",
                  "West",
                  "North",
                  "South",
                  "North-East",
                  "North-West",
                ] as PlotFacing[]
              ).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() =>
                    onChange({
                      plotFacing: formData.plotFacing === opt ? undefined : opt,
                    })
                  }
                  data-ocid={`dynamic_fields.plot_facing.${opt.toLowerCase().replace(/\W+/g, "_")}`}
                  className="px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{
                    background:
                      formData.plotFacing === opt
                        ? "rgba(96,165,250,0.15)"
                        : "rgba(255,255,255,0.05)",
                    border:
                      formData.plotFacing === opt
                        ? "1.5px solid rgba(96,165,250,0.55)"
                        : "1.5px solid rgba(255,255,255,0.09)",
                    color:
                      formData.plotFacing === opt
                        ? "#60a5fa"
                        : "rgba(255,255,255,0.55)",
                    cursor: "pointer",
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </FieldGroup>

          {/* Road Width */}
          <FieldGroup>
            <p style={labelStyle}>
              Road Width{" "}
              <span
                style={{
                  color: "rgba(255,255,255,0.35)",
                  fontWeight: 400,
                  textTransform: "none",
                  letterSpacing: 0,
                  fontSize: 11,
                }}
              >
                (optional)
              </span>
            </p>
            <div
              className="flex flex-wrap gap-2"
              data-ocid="dynamic_fields.plot_road_width_options"
            >
              {(
                [
                  "10 ft",
                  "20 ft",
                  "30 ft",
                  "40 ft",
                  "60 ft+",
                ] as PlotRoadWidth[]
              ).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() =>
                    onChange({
                      plotRoadWidth:
                        formData.plotRoadWidth === opt ? undefined : opt,
                    })
                  }
                  data-ocid={`dynamic_fields.plot_road_width.${opt.replace(/\W+/g, "_")}`}
                  className="px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{
                    background:
                      formData.plotRoadWidth === opt
                        ? "rgba(52,211,153,0.15)"
                        : "rgba(255,255,255,0.05)",
                    border:
                      formData.plotRoadWidth === opt
                        ? "1.5px solid rgba(52,211,153,0.55)"
                        : "1.5px solid rgba(255,255,255,0.09)",
                    color:
                      formData.plotRoadWidth === opt
                        ? "#34d399"
                        : "rgba(255,255,255,0.55)",
                    cursor: "pointer",
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </FieldGroup>
        </>
      )}

      {/* Villa / Independent House: additional plot size */}
      {(isVilla || isIndHouse) && (
        <AreaInput
          label="Plot Size (sq ft) — Optional"
          value={formData.plotArea}
          onChange={(v) => onChange({ plotArea: v })}
          ocid="dynamic_fields.villa_plot_size_input"
          placeholder="e.g. 2400"
        />
      )}
    </div>
  );
}
