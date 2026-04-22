// PropertyTypeStep.tsx — Step 2: Property type selector (7 canonical types)
// Includes mandatory Apartment Sub-Type selector when propertyType === 'apartment'
import {
  Briefcase,
  Building2,
  ChevronRight,
  Home,
  Layers,
  MapPin,
  Maximize2,
} from "lucide-react";
import { useRef, useState } from "react";
import type { ApartmentSubType, PropertyType, PropertyTypeData } from "./types";
import { showApartmentSubTypeFor } from "./types";

interface PropertyTypeStepProps {
  onNext: (
    data: PropertyTypeData & { apartmentSubType?: ApartmentSubType },
  ) => void;
  onBack: () => void;
  initialData?: Partial<
    PropertyTypeData & { apartmentSubType?: ApartmentSubType }
  >;
  /** If provided, only these property types will be shown */
  allowedTypes?: PropertyType[];
  /** Custom label for the Next button */
  nextLabel?: string;
}

interface TypeCard {
  type: PropertyType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const TYPE_CARDS: TypeCard[] = [
  {
    type: "apartment",
    label: "Apartment / Flat",
    icon: <Building2 size={26} />,
    description: "Flats, high-rise & gated societies",
  },
  {
    type: "villa",
    label: "Villa",
    icon: <Home size={26} />,
    description: "Independent villas & row houses",
  },
  {
    type: "plot",
    label: "Plot / Land",
    icon: <MapPin size={26} />,
    description: "Residential & layout plots",
  },
  {
    type: "independent_house",
    label: "Independent House",
    icon: <Home size={26} />,
    description: "Standalone homes & bungalows",
  },
  {
    type: "builder_floor",
    label: "Builder Floor",
    icon: <Layers size={26} />,
    description: "Low-rise builder floor units",
  },
  {
    type: "studio",
    label: "Studio",
    icon: <Maximize2 size={26} />,
    description: "Compact open-plan studio units",
  },
  {
    type: "commercial",
    label: "Commercial",
    icon: <Briefcase size={26} />,
    description: "Offices, shops & retail spaces",
  },
];

interface SubTypeOption {
  value: ApartmentSubType;
  label: string;
  description: string;
  emoji: string;
}

const APARTMENT_SUB_TYPES: SubTypeOption[] = [
  {
    value: "standalone",
    label: "Standalone Apartment",
    description: "No society, independent building",
    emoji: "🏢",
  },
  {
    value: "gated",
    label: "Gated Community",
    description: "Perimeter wall, security, common amenities",
    emoji: "🏘️",
  },
  {
    value: "township",
    label: "Township",
    description: "Self-contained with schools, retail, parks",
    emoji: "🌆",
  },
];

export default function PropertyTypeStep({
  onNext,
  onBack,
  initialData,
  allowedTypes,
  nextLabel,
}: PropertyTypeStepProps) {
  const [selected, setSelected] = useState<PropertyType | null>(
    initialData?.propertyType ?? null,
  );
  const [selectedSubType, setSelectedSubType] = useState<
    ApartmentSubType | undefined
  >(initialData?.apartmentSubType);
  const [error, setError] = useState<string>("");
  const [subTypeError, setSubTypeError] = useState<string>("");
  const selectorRef = useRef<HTMLDivElement>(null);
  const subTypeRef = useRef<HTMLDivElement>(null);

  const visibleCards = allowedTypes
    ? TYPE_CARDS.filter((c) => allowedTypes.includes(c.type))
    : TYPE_CARDS;

  const showSubType = showApartmentSubTypeFor(selected);

  const handleNext = () => {
    if (!selected) {
      setError("This field is required — please select a property type");
      selectorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    if (showSubType && !selectedSubType) {
      setSubTypeError("Please select the apartment type to proceed");
      subTypeRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    setError("");
    setSubTypeError("");
    onNext({
      propertyType: selected,
      ...(showSubType && selectedSubType
        ? { apartmentSubType: selectedSubType }
        : {}),
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Heading */}
      <div>
        <h2
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "'Playfair Display', serif", color: "#F4F7FF" }}
        >
          What type of property?
        </h2>
        <p style={{ color: "rgba(185,198,216,0.7)", fontSize: 14 }}>
          Select the property type you are interested in
        </p>
      </div>

      {/* Type cards — responsive grid */}
      <div
        ref={selectorRef}
        className="grid grid-cols-2 sm:grid-cols-3 gap-3"
        data-ocid="property_type_step.cards"
        style={
          error
            ? {
                border: "1.5px solid rgba(248,113,113,0.6)",
                borderRadius: 16,
                padding: 8,
              }
            : {}
        }
      >
        {visibleCards.map((card) => {
          const isSelected = selected === card.type;
          return (
            <button
              key={card.type}
              type="button"
              onClick={() => {
                setSelected(card.type);
                setError("");
                // Reset sub-type when switching away from apartment
                if (card.type !== "apartment") setSelectedSubType(undefined);
              }}
              data-ocid={`property_type_step.card.${card.type}`}
              className="flex flex-col items-center gap-2.5 p-4 rounded-2xl transition-all duration-200 text-center"
              style={{
                background: isSelected
                  ? "rgba(216,181,106,0.12)"
                  : "rgba(255,255,255,0.04)",
                border: isSelected
                  ? "2px solid rgba(216,181,106,0.6)"
                  : "2px solid rgba(255,255,255,0.08)",
                boxShadow: isSelected
                  ? "0 0 24px rgba(216,181,106,0.18), inset 0 0 20px rgba(216,181,106,0.04)"
                  : "none",
                transform: isSelected ? "translateY(-2px)" : "none",
                cursor: "pointer",
              }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200"
                style={{
                  background: isSelected
                    ? "rgba(216,181,106,0.2)"
                    : "rgba(255,255,255,0.06)",
                  color: isSelected ? "#D8B56A" : "rgba(255,255,255,0.4)",
                }}
              >
                {card.icon}
              </div>
              <div>
                <p
                  className="font-bold"
                  style={{
                    fontSize: 12,
                    color: isSelected ? "#D8B56A" : "#F4F7FF",
                    fontFamily: "'Playfair Display', serif",
                    lineHeight: 1.3,
                  }}
                >
                  {card.label}
                </p>
                <p
                  className="mt-0.5"
                  style={{
                    fontSize: 10,
                    color: "rgba(185,198,216,0.6)",
                    lineHeight: 1.3,
                  }}
                >
                  {card.description}
                </p>
              </div>
              {isSelected && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "#D8B56A" }}
                >
                  <span
                    style={{ color: "#071A2F", fontSize: 11, fontWeight: 900 }}
                  >
                    ✓
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Validation error */}
      {error && (
        <p
          style={{ fontSize: 13, color: "#f87171", marginTop: -8 }}
          data-ocid="property_type_step.error_message"
        >
          ⚠ {error}
        </p>
      )}

      {/* APARTMENT SUB-TYPE — mandatory when apartment selected */}
      {showSubType && (
        <div ref={subTypeRef} className="space-y-3">
          <div>
            <h3
              className="font-bold mb-0.5"
              style={{
                fontSize: 14,
                color: "#D8B56A",
                fontFamily: "'Playfair Display', serif",
              }}
            >
              Apartment Type
              <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>
            </h3>
            <p style={{ color: "rgba(185,198,216,0.6)", fontSize: 12 }}>
              Required for accurate AI valuation
            </p>
          </div>
          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            data-ocid="apartment_subtype.cards"
            style={
              subTypeError
                ? {
                    border: "1.5px solid rgba(248,113,113,0.6)",
                    borderRadius: 16,
                    padding: 8,
                  }
                : {}
            }
          >
            {APARTMENT_SUB_TYPES.map((opt) => {
              const isSelected = selectedSubType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setSelectedSubType(opt.value);
                    setSubTypeError("");
                  }}
                  data-ocid={`apartment_subtype.card.${opt.value}`}
                  className="flex flex-col items-start gap-2 p-4 rounded-2xl transition-all duration-200 text-left"
                  style={{
                    background: isSelected
                      ? "rgba(216,181,106,0.10)"
                      : "rgba(255,255,255,0.03)",
                    border: isSelected
                      ? "2px solid rgba(216,181,106,0.55)"
                      : "2px solid rgba(255,255,255,0.07)",
                    boxShadow: isSelected
                      ? "0 0 18px rgba(216,181,106,0.14)"
                      : "none",
                    cursor: "pointer",
                  }}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                    <span
                      className="font-bold flex-1"
                      style={{
                        fontSize: 12,
                        color: isSelected ? "#D8B56A" : "#F4F7FF",
                        lineHeight: 1.3,
                      }}
                    >
                      {opt.label}
                    </span>
                    {isSelected && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "#D8B56A" }}
                      >
                        <span
                          style={{
                            color: "#071A2F",
                            fontSize: 11,
                            fontWeight: 900,
                          }}
                        >
                          ✓
                        </span>
                      </div>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 10,
                      color: "rgba(185,198,216,0.55)",
                      lineHeight: 1.4,
                    }}
                  >
                    {opt.description}
                  </p>
                </button>
              );
            })}
          </div>
          {subTypeError && (
            <p
              style={{ fontSize: 13, color: "#f87171" }}
              data-ocid="apartment_subtype.error_message"
            >
              ⚠ {subTypeError}
            </p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          data-ocid="property_type_step.back_button"
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
          data-ocid="property_type_step.next_button"
          className="flex-1 py-4 rounded-2xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2"
          style={{
            background: selected
              ? "linear-gradient(135deg, #D8B56A 0%, #E8C97A 100%)"
              : "rgba(255,255,255,0.08)",
            color: selected ? "#071A2F" : "rgba(255,255,255,0.3)",
            border: error || subTypeError ? "2px solid #EF4444" : "none",
            cursor: "pointer",
            boxShadow: selected ? "0 4px 20px rgba(216,181,106,0.3)" : "none",
          }}
        >
          Next: {nextLabel ?? "Budget / Area"}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
