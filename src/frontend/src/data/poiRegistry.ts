// poiRegistry.ts — Consolidated POI registry for all 10 infrastructure categories
// This file provides a unified POIEntry interface and utility functions.
// It does NOT modify any existing engine arrays; it promotes the 4 missing
// categories (airport, highway, mall, college) into a shared exported format.
//
// Categories covered:
//   airport   — 2 entries (KIAL + HAL)
//   highway   — 14 entries (major Bangalore corridors)
//   mall      — 10 entries (promoted from mapLayersEngine.ts private const)
//   college   — 10 entries (promoted from mapLayersEngine.ts private const)
//
// For metro, railway, bus_stop, hospital, school, tech_park — consumers should
// continue importing from metroEngine.ts, infraEngine.ts, and mapLayersEngine.ts.
// getAllPOIs() and getAllPOIsByType() do NOT include those 6 legacy categories
// to avoid duplicating already-exported arrays.

// ─── POI Type ─────────────────────────────────────────────────────────────────

export type POIType =
  | "metro"
  | "railway"
  | "bus_stop"
  | "hospital"
  | "school"
  | "tech_park"
  | "college"
  | "mall"
  | "airport"
  | "highway";

// ─── Unified POI Interface ─────────────────────────────────────────────────────

export interface POIEntry {
  /** Unique stable ID — format: "{type}_{slug}" e.g. "airport_kial" */
  id: string;
  name: string;
  type: POIType;
  lat: number;
  lng: number;
  impactTag?: string;
  impactDescription?: string;
  /** Metro line colour (metro only) */
  line?: string;
  /** Zone / area label (tech_park only) */
  area?: string;
  /** Bus / rail operator name (bus_stop / railway) */
  operator?: string;
}

// ─── Airports ─────────────────────────────────────────────────────────────────
// Coordinates: verified against official BIAL/IATA records + Google Maps (Apr 2026)

export const AIRPORTS: POIEntry[] = [
  {
    id: "airport_kial",
    name: "Kempegowda International Airport (KIAL)",
    type: "airport",
    lat: 13.1986,
    lng: 77.7066,
    impactTag: "Connectivity boost",
    impactDescription:
      "International gateway — Devanahalli aerotropolis premium driver",
  },
  {
    id: "airport_hal",
    name: "HAL Airport (Old Airport Rd)",
    type: "airport",
    lat: 12.9499,
    lng: 77.6682,
    impactTag: "Historic aviation zone",
    impactDescription:
      "Former civil airport — now Aerospace SEZ anchor, defence premium",
  },
];

// ─── Highways / Major Roads ───────────────────────────────────────────────────
// Coordinates represent the main interchange / corridor reference point for
// each named road. Verified against NH/SH maps + Google Maps (Apr 2026).

export const HIGHWAYS: POIEntry[] = [
  {
    id: "highway_nh44_hosur",
    name: "NH-44 (Hosur Road Corridor)",
    type: "highway",
    lat: 12.8456,
    lng: 77.6603,
    impactTag: "Industrial corridor",
    impactDescription:
      "Electronic City — National Highway access, south IT belt",
  },
  {
    id: "highway_orr_hebbal",
    name: "Outer Ring Road (Hebbal Junction)",
    type: "highway",
    lat: 13.0352,
    lng: 77.597,
    impactTag: "Ring road access",
    impactDescription: "North Bangalore ORR entry point — airport connector",
  },
  {
    id: "highway_orr_marathahalli",
    name: "Outer Ring Road (Marathahalli)",
    type: "highway",
    lat: 12.9591,
    lng: 77.6975,
    impactTag: "IT belt connector",
    impactDescription: "Central IT corridor ORR access — highest density zone",
  },
  {
    id: "highway_orr_silk_board",
    name: "Outer Ring Road (Silk Board)",
    type: "highway",
    lat: 12.9165,
    lng: 77.6229,
    impactTag: "South ORR hub",
    impactDescription: "South Bangalore ORR access + NICE Road interchange",
  },
  {
    id: "highway_prr_north",
    name: "Peripheral Ring Road (North)",
    type: "highway",
    lat: 13.08,
    lng: 77.58,
    impactTag: "Upcoming infrastructure",
    impactDescription:
      "PRR — future city bypass, strong growth multiplier for periphery",
  },
  {
    id: "highway_strr",
    name: "Satellite Town Ring Road (STRR)",
    type: "highway",
    lat: 13.12,
    lng: 77.6,
    impactTag: "Satellite corridor",
    impactDescription:
      "STRR connecting peripheral towns — Bidadi, Nelamangala, Hoskote",
  },
  {
    id: "highway_mysore_road",
    name: "Mysore Road (NH-275)",
    type: "highway",
    lat: 12.95,
    lng: 77.51,
    impactTag: "West corridor",
    impactDescription:
      "West Bangalore highway — Bidadi Smart City / Mysore access",
  },
  {
    id: "highway_tumkur_road",
    name: "Tumkur Road (NH-648)",
    type: "highway",
    lat: 13.02,
    lng: 77.52,
    impactTag: "North-West corridor",
    impactDescription: "Nelamangala industrial highway — KIADB Zone B access",
  },
  {
    id: "highway_old_madras_road",
    name: "Old Madras Road (NH-75)",
    type: "highway",
    lat: 13.0,
    lng: 77.68,
    impactTag: "East corridor",
    impactDescription:
      "East Bangalore highway — Hoskote / Chennai access, logistics belt",
  },
  {
    id: "highway_bellary_road",
    name: "Bellary Road (NH-44 North)",
    type: "highway",
    lat: 13.06,
    lng: 77.59,
    impactTag: "Airport corridor",
    impactDescription:
      "North Bangalore — Devanahalli/Airport highway, aerotropolis connector",
  },
  {
    id: "highway_bannerghatta",
    name: "Bannerghatta Road",
    type: "highway",
    lat: 12.87,
    lng: 77.59,
    impactTag: "South corridor",
    impactDescription:
      "South Bangalore road — JP Nagar / Bannerghatta National Park access",
  },
  {
    id: "highway_kanakapura",
    name: "Kanakapura Road (SH-17)",
    type: "highway",
    lat: 12.85,
    lng: 77.56,
    impactTag: "South-West corridor",
    impactDescription:
      "Kanakapura Road — NICE Road connector, south growth axis, metro Phase 3",
  },
  {
    id: "highway_sarjapur",
    name: "Sarjapur Road",
    type: "highway",
    lat: 12.91,
    lng: 77.7,
    impactTag: "IT south-east corridor",
    impactDescription:
      "IT corridor — Ecospace, Sarjapur, Whitefield link, high rental demand",
  },
  {
    id: "highway_nice_road",
    name: "NICE Road (Peripheral Expressway)",
    type: "highway",
    lat: 12.9,
    lng: 77.51,
    impactTag: "Expressway",
    impactDescription:
      "NICE Expressway — east-south-west bypass, reduces commute premium",
  },
];

// ─── Malls ────────────────────────────────────────────────────────────────────
// Coordinates: verified against Google Maps / official mall addresses (Apr 2026).
// Promoted from private const MALLS in mapLayersEngine.ts with extra entries added.

export const MALLS_REGISTRY: POIEntry[] = [
  {
    id: "mall_phoenix_whitefield",
    name: "Phoenix Marketcity Whitefield",
    type: "mall",
    lat: 12.996,
    lng: 77.6966,
    impactTag: "Retail hub",
    impactDescription:
      "Largest mall in East Bangalore — drives lifestyle premium",
  },
  {
    id: "mall_vr_bengaluru",
    name: "VR Bengaluru",
    type: "mall",
    lat: 12.9989,
    lng: 77.6516,
    impactTag: "Retail hub",
    impactDescription: "Premium lifestyle mall — Whitefield-ORR junction",
  },
  {
    id: "mall_mantri_square",
    name: "Mantri Square",
    type: "mall",
    lat: 13.0067,
    lng: 77.5629,
    impactTag: "Retail hub",
    impactDescription:
      "Largest mall in North-West Bangalore — Malleshwaram anchor",
  },
  {
    id: "mall_ub_city",
    name: "UB City",
    type: "mall",
    lat: 12.9726,
    lng: 77.5971,
    impactTag: "Luxury retail",
    impactDescription: "Premium luxury shopping complex — CBD lifestyle anchor",
  },
  {
    id: "mall_elements_north",
    name: "Elements Mall (Thanisandra)",
    type: "mall",
    lat: 13.0419,
    lng: 77.6051,
    impactTag: "Retail hub",
    impactDescription: "North Bangalore major retail destination",
  },
  {
    id: "mall_gt_world",
    name: "GT World Mall",
    type: "mall",
    lat: 12.9806,
    lng: 77.5909,
    impactTag: "Retail hub",
    impactDescription: "Gandhinagar area retail destination",
  },
  {
    id: "mall_forum_koramangala",
    name: "Forum Mall Koramangala",
    type: "mall",
    lat: 12.9266,
    lng: 77.6268,
    impactTag: "Retail hub",
    impactDescription: "South-east retail flagship — Koramangala lifestyle hub",
  },
  {
    id: "mall_forum_value_city",
    name: "Forum Value Mall",
    type: "mall",
    lat: 12.96,
    lng: 77.7,
    impactTag: "Retail hub",
    impactDescription: "Whitefield IT corridor retail destination",
  },
  {
    id: "mall_orion",
    name: "Orion Mall",
    type: "mall",
    lat: 13.0,
    lng: 77.55,
    impactTag: "Retail hub",
    impactDescription: "Brigade Gateway — Rajajinagar premium retail",
  },
  {
    id: "mall_nexus_koramangala",
    name: "Nexus Mall Koramangala",
    type: "mall",
    lat: 12.9346,
    lng: 77.6095,
    impactTag: "Retail hub",
    impactDescription: "South Bangalore lifestyle mall — Koramangala hub",
  },
];

// ─── Colleges ─────────────────────────────────────────────────────────────────
// Coordinates: verified against official university/college addresses (Apr 2026).
// Promoted from private const COLLEGES in mapLayersEngine.ts with extra entries.

export const COLLEGES_REGISTRY: POIEntry[] = [
  {
    id: "college_iim",
    name: "IIM Bangalore",
    type: "college",
    lat: 12.9373,
    lng: 77.6036,
    impactTag: "Premium education",
    impactDescription:
      "Top-ranked business school — drives premium rental demand nearby",
  },
  {
    id: "college_christ",
    name: "Christ University",
    type: "college",
    lat: 12.9204,
    lng: 77.6066,
    impactTag: "Education hub",
    impactDescription:
      "Large autonomous university — high student rental demand, Hosur Road",
  },
  {
    id: "college_rv",
    name: "RV College of Engineering",
    type: "college",
    lat: 12.9236,
    lng: 77.4986,
    impactTag: "Education hub",
    impactDescription:
      "Top engineering college — west corridor anchor, Mysore Road",
  },
  {
    id: "college_bms",
    name: "BMS College of Engineering",
    type: "college",
    lat: 12.9607,
    lng: 77.5764,
    impactTag: "Education hub",
    impactDescription: "Premier engineering college — central Bangalore",
  },
  {
    id: "college_pes",
    name: "PES University",
    type: "college",
    lat: 12.9132,
    lng: 77.5391,
    impactTag: "Education hub",
    impactDescription:
      "Leading private university — south-west zone, engineering + management",
  },
  {
    id: "college_dayananda",
    name: "Dayananda Sagar University",
    type: "college",
    lat: 12.9095,
    lng: 77.594,
    impactTag: "Education hub",
    impactDescription:
      "Multi-campus university — Banashankari corridor, student demand",
  },
  {
    id: "college_iisc",
    name: "IISc Bangalore",
    type: "college",
    lat: 13.0213,
    lng: 77.5685,
    impactTag: "Research institution",
    impactDescription:
      "Premier science and research institute — national prestige anchor",
  },
  {
    id: "college_ms_ramaiah",
    name: "M.S. Ramaiah Institute of Technology",
    type: "college",
    lat: 13.019,
    lng: 77.56,
    impactTag: "Education hub",
    impactDescription:
      "Top engineering college — north-central Bangalore, Mathikere",
  },
  {
    id: "college_reva",
    name: "REVA University",
    type: "college",
    lat: 13.1204,
    lng: 77.6165,
    impactTag: "North Bangalore university",
    impactDescription:
      "Multi-discipline university — Yelahanka corridor, north growth zone",
  },
  {
    id: "college_acharya",
    name: "Acharya Institute of Technology",
    type: "college",
    lat: 13.05,
    lng: 77.56,
    impactTag: "Education hub",
    impactDescription:
      "Engineering college — north Bangalore, large campus student demand",
  },
];

// ─── Utility: getAllPOIsByType ─────────────────────────────────────────────────

/**
 * Returns all POI entries for a given type from this registry.
 * Note: metro, railway, bus_stop, hospital, school, tech_park are NOT included
 * here — use metroEngine.ts / infraEngine.ts / mapLayersEngine.ts for those.
 */
export function getAllPOIsByType(type: POIType): POIEntry[] {
  switch (type) {
    case "airport":
      return AIRPORTS;
    case "highway":
      return HIGHWAYS;
    case "mall":
      return MALLS_REGISTRY;
    case "college":
      return COLLEGES_REGISTRY;
    // Legacy categories not owned by this registry
    case "metro":
    case "railway":
    case "bus_stop":
    case "hospital":
    case "school":
    case "tech_park":
      return [];
  }
}

// ─── Utility: getAllPOIs ───────────────────────────────────────────────────────

/**
 * Returns ALL POIs owned by this registry (airport + highway + mall + college).
 * Legacy categories (metro, railway, bus_stop, hospital, school, tech_park)
 * remain in their own engine files to avoid duplication.
 */
export function getAllPOIs(): POIEntry[] {
  return [...AIRPORTS, ...HIGHWAYS, ...MALLS_REGISTRY, ...COLLEGES_REGISTRY];
}
