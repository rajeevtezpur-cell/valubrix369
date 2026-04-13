// types.ts — Shared types for all step components in ValuBrix discover flows

// ─── Canonical 7 Property Types ───────────────────────────────────────────────

export type PropertyType =
  | "apartment"
  | "villa"
  | "plot"
  | "independent_house"
  | "builder_floor"
  | "studio"
  | "commercial";

// ─── BHK (show only for apartment, builder_floor, studio) ────────────────────

export type BHKOption =
  | "1rk"
  | "1bhk"
  | "2bhk"
  | "2.5bhk"
  | "3bhk"
  | "3.5bhk"
  | "4bhk"
  | "4+bhk";

/** Returns true when BHK selector should be shown for the given property type */
export function showBHKFor(type: PropertyType | null | undefined): boolean {
  return type === "apartment" || type === "builder_floor" || type === "studio";
}

// ─── Floor Preference (show only for apartment, builder_floor) ────────────────

export type FloorPreference = "low" | "mid" | "high" | "top";

/** Returns true when floor selector should be shown for the given property type */
export function showFloorFor(type: PropertyType | null | undefined): boolean {
  return type === "apartment" || type === "builder_floor";
}

/** Returns true when amenities section should be shown (NOT for plot) */
export function showAmenitiesFor(
  type: PropertyType | string | null | undefined,
): boolean {
  if (!type) return true;
  return type !== "plot";
}

/** Returns true when age field should be shown (NOT for plot) */
export function showAgeFor(
  type: PropertyType | string | null | undefined,
): boolean {
  if (!type) return true;
  return type !== "plot";
}

// ─── Plot-specific fields ─────────────────────────────────────────────────────

export type PlotType =
  | "Residential Plot"
  | "Commercial Plot"
  | "Agricultural Plot"
  | "BDA/BMRDA Approved"
  | "Corner Plot"
  | "Layout Plot";

export type PlotFacing =
  | "East"
  | "West"
  | "North"
  | "South"
  | "North-East"
  | "North-West";

export type PlotRoadWidth = "10 ft" | "20 ft" | "30 ft" | "40 ft" | "60 ft+";

// ─── Area Type ────────────────────────────────────────────────────────────────

export type AreaType = "carpet" | "buildup" | "superbuildup";

// Keep legacy alias for backward compat with existing usages
export type { AreaType as AreaTypeAlias };

// ─── Property Age ─────────────────────────────────────────────────────────────

export type PropertyAge = "New" | "<5yr" | "5-10yr" | "10+yr";

// ─── Flow Mode ────────────────────────────────────────────────────────────────

export type FlowMode = "buy" | "rent" | "valuation" | "area" | "sell";

// ─── Location ─────────────────────────────────────────────────────────────────

export interface LocationData {
  city: string;
  locality: string;
  lat: number;
  lng: number;
}

// ─── Amenities ────────────────────────────────────────────────────────────────

export type AmenityCategory = "basic" | "lifestyle" | "premium";

export interface AmenityDef {
  id: string;
  label: string;
  icon: string; // lucide icon name
  category: AmenityCategory;
}

export const BASIC_AMENITIES: AmenityDef[] = [
  { id: "lift", label: "Lift", icon: "ArrowUp", category: "basic" },
  { id: "parking", label: "Parking", icon: "ParkingSquare", category: "basic" },
  { id: "power_backup", label: "Power Backup", icon: "Zap", category: "basic" },
  { id: "security", label: "Security", icon: "Shield", category: "basic" },
  {
    id: "water_supply",
    label: "Water Supply",
    icon: "Droplets",
    category: "basic",
  },
  {
    id: "gas_pipeline",
    label: "Gas Pipeline",
    icon: "Flame",
    category: "basic",
  },
];

export const LIFESTYLE_AMENITIES: AmenityDef[] = [
  { id: "gym", label: "Gym", icon: "Dumbbell", category: "lifestyle" },
  {
    id: "swimming_pool",
    label: "Swimming Pool",
    icon: "Waves",
    category: "lifestyle",
  },
  { id: "clubhouse", label: "Clubhouse", icon: "Star", category: "lifestyle" },
  { id: "garden", label: "Garden", icon: "Leaf", category: "lifestyle" },
  {
    id: "kids_play_area",
    label: "Kids Play Area",
    icon: "Baby",
    category: "lifestyle",
  },
  {
    id: "jogging_track",
    label: "Jogging Track",
    icon: "Activity",
    category: "lifestyle",
  },
];

export const PREMIUM_AMENITIES: AmenityDef[] = [
  { id: "smart_home", label: "Smart Home", icon: "Cpu", category: "premium" },
  {
    id: "ev_charging",
    label: "EV Charging",
    icon: "BatteryCharging",
    category: "premium",
  },
  {
    id: "coworking_space",
    label: "Co-working Space",
    icon: "Monitor",
    category: "premium",
  },
  { id: "concierge", label: "Concierge", icon: "Bell", category: "premium" },
  {
    id: "rooftop_amenities",
    label: "Rooftop Amenities",
    icon: "Sun",
    category: "premium",
  },
  {
    id: "private_terrace",
    label: "Private Terrace",
    icon: "Sunset",
    category: "premium",
  },
];

export const ALL_AMENITIES: AmenityDef[] = [
  ...BASIC_AMENITIES,
  ...LIFESTYLE_AMENITIES,
  ...PREMIUM_AMENITIES,
];

export const AMENITIES_BY_CATEGORY: Record<AmenityCategory, AmenityDef[]> = {
  basic: BASIC_AMENITIES,
  lifestyle: LIFESTYLE_AMENITIES,
  premium: PREMIUM_AMENITIES,
};

// ─── Unified Form Data ────────────────────────────────────────────────────────

export interface PropertyFormData {
  location: LocationData | null;
  propertyType: PropertyType | null;
  bhk: BHKOption | null;
  floorRange: FloorPreference | null;
  exactFloor: string;
  areaType: AreaType | null;
  areaValue: string;
  plotArea: string;
  budget: string;
  budgetMax: string;
  amenities: string[]; // array of AmenityDef.id strings
  builder: string;
  project: string;
  isBuilderManual: boolean;
  isProjectManual: boolean;
  // Plot-specific optional fields
  plotType?: PlotType;
  plotFacing?: PlotFacing;
  plotRoadWidth?: PlotRoadWidth;
}

export const EMPTY_FORM_DATA: PropertyFormData = {
  location: null,
  propertyType: null,
  bhk: null,
  floorRange: null,
  exactFloor: "",
  areaType: null,
  areaValue: "",
  plotArea: "",
  budget: "",
  budgetMax: "",
  amenities: [],
  builder: "",
  project: "",
  isBuilderManual: false,
  isProjectManual: false,
};

// ─── Legacy compat (do NOT remove — existing code imports these) ──────────────

/** @deprecated Use AmenityDef — kept for backward compat with AdditionalFiltersStep legacy imports */
export const AMENITIES_LIST = [
  "Lift",
  "Parking",
  "Power Backup",
  "Clubhouse",
  "Swimming Pool",
  "Gym",
  "Gas Pipeline",
  "Gated Community",
  "Security",
] as const;

/** @deprecated Use AmenityDef */
export type Amenity = (typeof AMENITIES_LIST)[number] | string;

/** @deprecated Use PropertyFormData */
export interface AdditionalFiltersData {
  age?: PropertyAge;
  floor?: FloorPreference | FloorPreferenceLegacy | "Any";
  exactFloor?: string;
  builder?: string;
  project?: string;
  areaType?: AreaType;
  areaSqft?: number;
  amenities?: Amenity[] | string[];
  // Plot-specific
  plotType?: PlotType;
  plotFacing?: PlotFacing;
  plotRoadWidth?: PlotRoadWidth;
}

/** @deprecated Use PropertyFormData */
export interface BudgetOrAreaData {
  minBudget?: number;
  maxBudget?: number;
  area?: number;
  bhk?: BHKOption | "1" | "2" | "3" | "4" | "4+";
  areaType?: AreaType;
}

/** @deprecated Use PropertyFormData */
export interface PropertyTypeData {
  propertyType: PropertyType;
}

// Keep legacy floor preference with "Any" for AdditionalFiltersStep
export type FloorPreferenceLegacy = "Any" | "Low" | "Mid" | "High" | "Top";

// ─── Step Config ─────────────────────────────────────────────────────────────

export type StepName =
  | "Location"
  | "Property Type"
  | "Budget / Area"
  | "Filters"
  | "Results";

export const STEP_NAMES: StepName[] = [
  "Location",
  "Property Type",
  "Budget / Area",
  "Filters",
  "Results",
];

// Union of all step data types (legacy)
export type StepData =
  | LocationData
  | PropertyTypeData
  | BudgetOrAreaData
  | AdditionalFiltersData;

export interface FlowData {
  location?: LocationData;
  propertyType?: PropertyTypeData;
  budgetOrArea?: BudgetOrAreaData;
  filters?: AdditionalFiltersData;
}
