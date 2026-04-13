// PropertyTypeStep.tsx — Step 2: Property type selector (7 canonical types)
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
import type { PropertyType, PropertyTypeData } from "./types";

interface PropertyTypeStepProps {
  onNext: (data: PropertyTypeData) => void;
  onBack: () => void;
  initialData?: Partial<PropertyTypeData>;
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
  const [error, setError] = useState<string>("");
  const selectorRef = useRef<HTMLDivElement>(null);

  // Filter cards by allowedTypes if provided
  const visibleCards = allowedTypes
    ? TYPE_CARDS.filter((c) => allowedTypes.includes(c.type))
    : TYPE_CARDS;

  const handleNext = () => {
    if (!selected) {
      setError("This field is required — please select a property type");
      selectorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    setError("");
    onNext({ propertyType: selected });
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
              {/* Icon circle */}
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

              {/* Label */}
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

              {/* Selection indicator */}
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
            border: error ? "2px solid #EF4444" : "none",
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
