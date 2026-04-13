// BudgetOrAreaStep.tsx — Step 3: Budget (buy/rent) or Area+BHK (valuation/sell)
// Smart budget ranges by property type
// Rent uses monthly INR ranges; Buy uses Lakhs sliders
// Area mode: area type + area value + BHK (only for applicable types)
import { ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { showBHKFor } from "./types";
import type {
  AreaType,
  BHKOption,
  BudgetOrAreaData,
  PropertyType,
} from "./types";

interface BudgetOrAreaStepProps {
  onNext: (data: BudgetOrAreaData) => void;
  onBack: () => void;
  mode: "budget" | "area";
  initialData?: Partial<BudgetOrAreaData>;
  propertyType?: PropertyType;
  flowMode?: "rent" | "buy" | "valuation" | "sell" | "area";
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

// ─── Buy budget ranges by property type (Lakhs) ───────────────────────────────

const BUY_BUDGET_RANGES: Record<
  string,
  { label: string; min: number; max: number | null }[]
> = {
  apartment: [
    { label: "₹20L–₹40L", min: 20, max: 40 },
    { label: "₹40L–₹60L", min: 40, max: 60 },
    { label: "₹60L–₹80L", min: 60, max: 80 },
    { label: "₹80L–₹1Cr", min: 80, max: 100 },
    { label: "₹1Cr–₹1.5Cr", min: 100, max: 150 },
    { label: "₹1.5Cr–₹2Cr", min: 150, max: 200 },
    { label: "₹2Cr–₹3Cr", min: 200, max: 300 },
    { label: "₹3Cr–₹5Cr", min: 300, max: 500 },
    { label: "₹5Cr+", min: 500, max: null },
  ],
  villa: [
    { label: "₹50L–₹75L", min: 50, max: 75 },
    { label: "₹75L–₹1Cr", min: 75, max: 100 },
    { label: "₹1Cr–₹1.5Cr", min: 100, max: 150 },
    { label: "₹1.5Cr–₹2Cr", min: 150, max: 200 },
    { label: "₹2Cr–₹3Cr", min: 200, max: 300 },
    { label: "₹3Cr–₹5Cr", min: 300, max: 500 },
    { label: "₹5Cr–₹7Cr", min: 500, max: 700 },
    { label: "₹7Cr–₹10Cr", min: 700, max: 1000 },
    { label: "₹10Cr+", min: 1000, max: null },
  ],
  plot: [
    { label: "₹500/sqft", min: 500, max: 999 },
    { label: "₹1000/sqft", min: 1000, max: 1999 },
    { label: "₹2000/sqft", min: 2000, max: 4999 },
    { label: "₹5000+/sqft", min: 5000, max: null },
    { label: "Total: ₹20L–₹40L", min: 20, max: 40 },
    { label: "Total: ₹40L–₹60L", min: 40, max: 60 },
    { label: "Total: ₹60L–₹1Cr", min: 60, max: 100 },
    { label: "Total: ₹1Cr+", min: 100, max: null },
  ],
  studio: [
    { label: "₹15L–₹25L", min: 15, max: 25 },
    { label: "₹25L–₹40L", min: 25, max: 40 },
    { label: "₹40L–₹60L", min: 40, max: 60 },
    { label: "₹60L–₹80L", min: 60, max: 80 },
    { label: "₹80L–₹1Cr", min: 80, max: 100 },
    { label: "₹1Cr+", min: 100, max: null },
  ],
  commercial: [
    { label: "₹30L–₹50L", min: 30, max: 50 },
    { label: "₹50L–₹80L", min: 50, max: 80 },
    { label: "₹80L–₹1.5Cr", min: 80, max: 150 },
    { label: "₹1.5Cr–₹3Cr", min: 150, max: 300 },
    { label: "₹3Cr–₹5Cr", min: 300, max: 500 },
    { label: "₹5Cr–₹10Cr", min: 500, max: 1000 },
    { label: "₹10Cr+", min: 1000, max: null },
  ],
  default: [
    { label: "₹20L–₹40L", min: 20, max: 40 },
    { label: "₹40L–₹60L", min: 40, max: 60 },
    { label: "₹60L–₹1Cr", min: 60, max: 100 },
    { label: "₹1Cr–₹1.5Cr", min: 100, max: 150 },
    { label: "₹1.5Cr–₹2Cr", min: 150, max: 200 },
    { label: "₹2Cr–₹3Cr", min: 200, max: 300 },
    { label: "₹3Cr+", min: 300, max: null },
  ],
};

// ─── Rent budget: monthly INR ranges per property type ────────────────────────

const RENT_RANGES: Record<
  string,
  { label: string; min: number; max: number | null }[]
> = {
  apartment: [
    { label: "₹5K–₹20K", min: 5000, max: 20000 },
    { label: "₹20K–₹40K", min: 20000, max: 40000 },
    { label: "₹40K–₹60K", min: 40000, max: 60000 },
    { label: "₹60K–₹1L", min: 60000, max: 100000 },
    { label: "₹1L+", min: 100000, max: null },
  ],
  villa: [
    { label: "₹25K–₹50K", min: 25000, max: 50000 },
    { label: "₹50K–₹1L", min: 50000, max: 100000 },
    { label: "₹1L–₹2L", min: 100000, max: 200000 },
    { label: "₹2L+", min: 200000, max: null },
  ],
  commercial: [
    { label: "₹20K–₹50K", min: 20000, max: 50000 },
    { label: "₹50K–₹1L", min: 50000, max: 100000 },
    { label: "₹1L–₹3L", min: 100000, max: 300000 },
    { label: "₹3L+", min: 300000, max: null },
  ],
  default: [
    { label: "₹5K–₹20K", min: 5000, max: 20000 },
    { label: "₹20K–₹40K", min: 20000, max: 40000 },
    { label: "₹40K–₹60K", min: 40000, max: 60000 },
    { label: "₹60K–₹1L", min: 60000, max: 100000 },
    { label: "₹1L+", min: 100000, max: null },
  ],
};

function getBuyRanges(propertyType?: PropertyType) {
  if (!propertyType) return BUY_BUDGET_RANGES.default;
  return BUY_BUDGET_RANGES[propertyType] ?? BUY_BUDGET_RANGES.default;
}

function getRentRanges(propertyType?: PropertyType) {
  if (!propertyType) return RENT_RANGES.apartment;
  if (propertyType === "plot") return null;
  return RENT_RANGES[propertyType] ?? RENT_RANGES.default;
}

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
};

export default function BudgetOrAreaStep({
  onNext,
  onBack,
  mode,
  initialData,
  propertyType,
  flowMode,
}: BudgetOrAreaStepProps) {
  const isRentMode = flowMode === "rent";
  const rentRanges = isRentMode ? getRentRanges(propertyType) : null;
  const buyRanges = !isRentMode ? getBuyRanges(propertyType) : null;
  const isPlotRent = isRentMode && propertyType === "plot";
  const showBHK = showBHKFor(propertyType);

  // Rent: selected range index
  const [selectedRentRange, setSelectedRentRange] = useState<number | null>(
    () => {
      if (!isRentMode || !rentRanges) return null;
      if (initialData?.minBudget) {
        const idx = rentRanges.findIndex(
          (r) => r.min === initialData.minBudget,
        );
        return idx >= 0 ? idx : null;
      }
      return null;
    },
  );

  // Buy: selected range index
  const [selectedBuyRange, setSelectedBuyRange] = useState<number | null>(
    () => {
      if (isRentMode || !buyRanges) return null;
      if (initialData?.minBudget) {
        const idx = buyRanges.findIndex((r) => r.min === initialData.minBudget);
        return idx >= 0 ? idx : null;
      }
      return null;
    },
  );

  // Area mode
  const [area, setArea] = useState<string>(
    initialData?.area ? String(initialData.area) : "",
  );
  const [plotArea, setPlotArea] = useState<string>("");
  const [bhk, setBhk] = useState<BHKOption | undefined>(
    (initialData?.bhk as BHKOption | undefined) ?? undefined,
  );
  const [areaType, setAreaType] = useState<AreaType | undefined>(
    (initialData?.areaType as AreaType | undefined) ?? undefined,
  );

  const [areaError, setAreaError] = useState("");
  const [areaTypeError, setAreaTypeError] = useState("");
  const [rentRangeError, setRentRangeError] = useState("");
  const [buyRangeError, setBuyRangeError] = useState("");

  const areaRef = useRef<HTMLDivElement>(null);
  const areaTypeRef = useRef<HTMLDivElement>(null);

  const handleNext = () => {
    if (mode === "budget") {
      if (isRentMode) {
        if (selectedRentRange === null) {
          setRentRangeError("Please select a budget range");
          return;
        }
        const range = rentRanges![selectedRentRange];
        onNext({
          minBudget: range.min,
          maxBudget: range.max ?? range.min * 10,
        });
      } else {
        if (selectedBuyRange === null) {
          setBuyRangeError("Please select a budget range");
          return;
        }
        const range = buyRanges![selectedBuyRange];
        onNext({
          minBudget: range.min,
          maxBudget: range.max ?? range.min * 10,
        });
      }
    } else {
      let hasError = false;
      if (!area || Number(area) <= 0) {
        setAreaError("Please enter the property area (sq ft)");
        hasError = true;
      } else {
        setAreaError("");
      }
      if (!areaType) {
        setAreaTypeError("Please select an area type");
        hasError = true;
      } else {
        setAreaTypeError("");
      }
      if (hasError) {
        if (!area || Number(area) <= 0) {
          areaRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        } else {
          areaTypeRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
        return;
      }
      onNext({ area: area ? Number(area) : undefined, bhk, areaType });
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Heading */}
      <div>
        <h2
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "'Playfair Display', serif", color: "#F4F7FF" }}
        >
          {mode === "budget"
            ? isRentMode
              ? "What's your rent budget?"
              : "What's your budget?"
            : "Property details"}
        </h2>
        <p style={{ color: "rgba(185,198,216,0.7)", fontSize: 14 }}>
          {mode === "budget"
            ? isRentMode
              ? "Select your monthly rental budget"
              : "Choose your price range"
            : "Enter area and configuration for accurate results"}
        </p>
      </div>

      {mode === "budget" ? (
        isPlotRent ? (
          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.25)",
            }}
            data-ocid="budget_step.plot_rent_notice"
          >
            <p style={{ color: "#f87171", fontSize: 14, fontWeight: 600 }}>
              🚫 Plots are typically not rented.
            </p>
            <p
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 13,
                marginTop: 6,
              }}
            >
              Please go back and select a different property type for rental
              search.
            </p>
          </div>
        ) : isRentMode && rentRanges ? (
          /* Rent: monthly range selector */
          <div className="space-y-3">
            <p style={labelStyle}>
              Monthly Rent Budget <span style={{ color: "#f87171" }}>*</span>
            </p>
            <div
              className="grid grid-cols-1 gap-2"
              style={
                rentRangeError
                  ? {
                      outline: "1px solid #ef4444",
                      borderRadius: 12,
                      padding: 4,
                    }
                  : {}
              }
              data-ocid="budget_step.rent_range_options"
            >
              {rentRanges.map((range, idx) => (
                <button
                  key={range.label}
                  type="button"
                  onClick={() => {
                    setSelectedRentRange(idx);
                    setRentRangeError("");
                  }}
                  data-ocid={`budget_step.rent_range.${idx}`}
                  className="px-5 py-3.5 rounded-2xl font-semibold text-left transition-all duration-200"
                  style={{
                    background:
                      selectedRentRange === idx
                        ? "rgba(216,181,106,0.15)"
                        : "rgba(255,255,255,0.05)",
                    border:
                      selectedRentRange === idx
                        ? "2px solid rgba(216,181,106,0.6)"
                        : "2px solid rgba(255,255,255,0.08)",
                    color:
                      selectedRentRange === idx
                        ? "#D8B56A"
                        : "rgba(255,255,255,0.7)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      fontFamily: "'Playfair Display', serif",
                    }}
                  >
                    {range.label}
                  </span>
                  {selectedRentRange === idx && (
                    <span style={{ fontSize: 12, color: "#D8B56A" }}>
                      ✓ Selected
                    </span>
                  )}
                </button>
              ))}
            </div>
            {rentRangeError && (
              <p style={{ fontSize: 12, color: "#f87171" }}>
                ⚠ {rentRangeError}
              </p>
            )}
          </div>
        ) : (
          /* Buy: range selector (property-type aware) */
          <div className="space-y-3">
            <p style={labelStyle}>
              Budget Range <span style={{ color: "#f87171" }}>*</span>
            </p>
            <div
              className="grid grid-cols-1 gap-2"
              style={
                buyRangeError
                  ? {
                      outline: "1px solid #ef4444",
                      borderRadius: 12,
                      padding: 4,
                    }
                  : {}
              }
              data-ocid="budget_step.buy_range_options"
            >
              {(buyRanges ?? []).map((range, idx) => (
                <button
                  key={range.label}
                  type="button"
                  onClick={() => {
                    setSelectedBuyRange(idx);
                    setBuyRangeError("");
                  }}
                  data-ocid={`budget_step.buy_range.${idx}`}
                  className="px-5 py-3.5 rounded-2xl font-semibold text-left transition-all duration-200"
                  style={{
                    background:
                      selectedBuyRange === idx
                        ? "rgba(216,181,106,0.15)"
                        : "rgba(255,255,255,0.05)",
                    border:
                      selectedBuyRange === idx
                        ? "2px solid rgba(216,181,106,0.6)"
                        : "2px solid rgba(255,255,255,0.08)",
                    color:
                      selectedBuyRange === idx
                        ? "#D8B56A"
                        : "rgba(255,255,255,0.7)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      fontFamily: "'Playfair Display', serif",
                    }}
                  >
                    {range.label}
                  </span>
                  {selectedBuyRange === idx && (
                    <span style={{ fontSize: 12, color: "#D8B56A" }}>
                      ✓ Selected
                    </span>
                  )}
                </button>
              ))}
            </div>
            {buyRangeError && (
              <p style={{ fontSize: 12, color: "#f87171" }}>
                ⚠ {buyRangeError}
              </p>
            )}
          </div>
        )
      ) : (
        /* Area mode */
        <div className="space-y-5">
          {/* Area Type */}
          <div className="space-y-2" ref={areaTypeRef}>
            <p style={labelStyle}>
              Area Type <span style={{ color: "#f87171" }}>*</span>
            </p>
            <div
              className="flex flex-wrap gap-2"
              data-ocid="budget_area_step.area_type_options"
              style={
                areaTypeError
                  ? {
                      outline: "1px solid #ef4444",
                      borderRadius: 12,
                      padding: 4,
                    }
                  : {}
              }
            >
              {AREA_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setAreaType(areaType === opt.value ? undefined : opt.value);
                    setAreaTypeError("");
                  }}
                  data-ocid={`budget_area_step.area_type.${opt.value}`}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{
                    background:
                      areaType === opt.value
                        ? "rgba(96,165,250,0.15)"
                        : "rgba(255,255,255,0.05)",
                    border:
                      areaType === opt.value
                        ? "1.5px solid rgba(96,165,250,0.55)"
                        : areaTypeError
                          ? "1.5px solid #ef4444"
                          : "1.5px solid rgba(255,255,255,0.09)",
                    color:
                      areaType === opt.value
                        ? "#60a5fa"
                        : "rgba(255,255,255,0.55)",
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {areaTypeError && (
              <p style={{ fontSize: 12, color: "#f87171" }}>
                ⚠ {areaTypeError}
              </p>
            )}
          </div>

          {/* Area value */}
          <div className="space-y-2" ref={areaRef}>
            <p style={labelStyle}>
              {propertyType === "plot" ? "Plot Size" : "Built-up Area"} (sq ft){" "}
              <span style={{ color: "#f87171" }}>*</span>
            </p>
            <div
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                background: "rgba(10, 15, 30, 0.9)",
                border: areaError
                  ? "1.5px solid #ef4444"
                  : "1px solid rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
              }}
            >
              <input
                type="number"
                value={area}
                onChange={(e) => {
                  setArea(e.target.value);
                  setAreaError("");
                }}
                placeholder="e.g. 1200"
                data-ocid="area_step.area_input"
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
                max={50000}
              />
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                sq ft
              </span>
            </div>
            {areaError && (
              <p
                style={{ fontSize: 12, color: "#f87171" }}
                data-ocid="area_step.area_error"
              >
                ⚠ {areaError}
              </p>
            )}
          </div>

          {/* Plot separate built-up area */}
          {propertyType === "plot" && (
            <div className="space-y-2">
              <p style={labelStyle}>
                Built-up Area (sq ft){" "}
                <span
                  style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400 }}
                >
                  (optional)
                </span>
              </p>
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{
                  background: "rgba(10, 15, 30, 0.9)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <input
                  type="number"
                  value={plotArea}
                  onChange={(e) => setPlotArea(e.target.value)}
                  placeholder="e.g. 800"
                  data-ocid="area_step.plot_buildup_input"
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
            </div>
          )}

          {/* BHK — only for applicable types */}
          {showBHK && (
            <div className="space-y-3">
              <p style={labelStyle}>BHK Configuration</p>
              <div className="flex gap-2 flex-wrap">
                {BHK_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setBhk(opt)}
                    data-ocid={`area_step.bhk.${opt}`}
                    className="px-3 py-2.5 rounded-xl font-bold transition-all duration-200 text-sm"
                    style={{
                      background:
                        bhk === opt
                          ? "rgba(216,181,106,0.18)"
                          : "rgba(255,255,255,0.05)",
                      border:
                        bhk === opt
                          ? "2px solid rgba(216,181,106,0.6)"
                          : "2px solid rgba(255,255,255,0.08)",
                      color: bhk === opt ? "#D8B56A" : "rgba(255,255,255,0.6)",
                      cursor: "pointer",
                    }}
                  >
                    {opt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          data-ocid="budget_area_step.back_button"
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
        {!isPlotRent && (
          <button
            type="button"
            onClick={handleNext}
            data-ocid="budget_area_step.next_button"
            className="flex-1 py-4 rounded-2xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #D8B56A 0%, #E8C97A 100%)",
              color: "#071A2F",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(216,181,106,0.3)",
            }}
          >
            Next: Filters
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
