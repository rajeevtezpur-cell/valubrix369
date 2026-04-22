// mapLayersEngine.ts — Map overlay layers + smart pins data engine
// Provides heatmap data, smart pin POIs, and layer metadata for ValuBrix maps.
// Phase 1: Tech Parks + Metro (HIGH priority)
// Phase 2: Bus Stops + Railway Stations (MEDIUM priority)
// Phase 3: Hospitals + Schools (LOW priority)

import { TECH_PARKS } from "./infraEngine";
import { METROS, haversineDistance } from "./metroEngine";

// ─── Layer Type Definitions ───────────────────────────────────────────────────

export type MapLayerType =
  | "price_heatmap"
  | "rental_yield"
  | "growth_zones"
  | "metro_connectivity"
  | "future_infra"
  | "poi_density";

export type MapLayerScope = "basic" | "full";
// basic = price_heatmap + rental_yield (all modules)
// full  = all 6 layers (Location IQ only)

// ─── Heatmap Point ────────────────────────────────────────────────────────────

export interface HeatmapPoint {
  lat: number;
  lng: number;
  locality: string;
  pricePerSqft: number;
  rentalYieldPct: number;
  growthScore: number;
  infraScore: number;
  poiDensity: number;
  color: string;
  radius: number;
}

// ─── Smart Pin ────────────────────────────────────────────────────────────────

export type SmartPinType =
  | "tech_park"
  | "metro"
  | "bus_stop"
  | "railway"
  | "hospital"
  | "school";

export type SmartPinPriority = "high" | "medium" | "low";

export interface SmartPin {
  id: string;
  type: SmartPinType;
  priority: SmartPinPriority;
  name: string;
  lat: number;
  lng: number;
  emoji: string;
  employees?: number;
  line?: string;
  impactTag: string;
  impactDescription: string;
}

// ─── Locality Heatmap Dataset (30 Bangalore localities) ───────────────────────

const LOCALITY_HEATMAP_DATA: Omit<HeatmapPoint, "color" | "radius">[] = [
  // ─── North Bangalore ───────────────────────────────────────────────────────
  {
    lat: 13.0486,
    lng: 77.62,
    locality: "Nagawara",
    pricePerSqft: 11500,
    rentalYieldPct: 3.8,
    growthScore: 82,
    infraScore: 78,
    poiDensity: 75,
  },
  {
    lat: 13.0358,
    lng: 77.597,
    locality: "Hebbal",
    pricePerSqft: 13500,
    rentalYieldPct: 3.2,
    growthScore: 88,
    infraScore: 90,
    poiDensity: 82,
  },
  {
    lat: 13.1007,
    lng: 77.5963,
    locality: "Yelahanka",
    pricePerSqft: 7200,
    rentalYieldPct: 4.5,
    growthScore: 74,
    infraScore: 68,
    poiDensity: 65,
  },
  {
    lat: 13.2468,
    lng: 77.711,
    locality: "Devanahalli",
    pricePerSqft: 5800,
    rentalYieldPct: 5.2,
    growthScore: 92,
    infraScore: 95,
    poiDensity: 45,
  },
  {
    lat: 13.0681,
    lng: 77.6275,
    locality: "Thanisandra",
    pricePerSqft: 8600,
    rentalYieldPct: 4.2,
    growthScore: 78,
    infraScore: 72,
    poiDensity: 70,
  },
  {
    lat: 13.04,
    lng: 77.64,
    locality: "Hennur Road",
    pricePerSqft: 7800,
    rentalYieldPct: 4.4,
    growthScore: 76,
    infraScore: 70,
    poiDensity: 68,
  },
  {
    lat: 13.022,
    lng: 77.594,
    locality: "RT Nagar",
    pricePerSqft: 9200,
    rentalYieldPct: 3.9,
    growthScore: 70,
    infraScore: 72,
    poiDensity: 78,
  },
  // ─── East Bangalore ────────────────────────────────────────────────────────
  {
    lat: 12.9698,
    lng: 77.7499,
    locality: "Whitefield",
    pricePerSqft: 10500,
    rentalYieldPct: 4.1,
    growthScore: 85,
    infraScore: 88,
    poiDensity: 80,
  },
  {
    lat: 12.9547,
    lng: 77.7019,
    locality: "Marathahalli",
    pricePerSqft: 9800,
    rentalYieldPct: 4.3,
    growthScore: 80,
    infraScore: 82,
    poiDensity: 83,
  },
  {
    lat: 12.9352,
    lng: 77.6958,
    locality: "Bellandur",
    pricePerSqft: 10200,
    rentalYieldPct: 4.0,
    growthScore: 83,
    infraScore: 85,
    poiDensity: 78,
  },
  {
    lat: 12.91,
    lng: 77.687,
    locality: "Sarjapur Road",
    pricePerSqft: 9000,
    rentalYieldPct: 4.6,
    growthScore: 84,
    infraScore: 80,
    poiDensity: 72,
  },
  {
    lat: 12.9784,
    lng: 77.6408,
    locality: "Indiranagar",
    pricePerSqft: 15200,
    rentalYieldPct: 2.8,
    growthScore: 72,
    infraScore: 88,
    poiDensity: 95,
  },
  {
    lat: 12.992,
    lng: 77.716,
    locality: "Hoodi",
    pricePerSqft: 8400,
    rentalYieldPct: 4.5,
    growthScore: 78,
    infraScore: 76,
    poiDensity: 68,
  },
  // ─── South Bangalore ───────────────────────────────────────────────────────
  {
    lat: 12.8399,
    lng: 77.677,
    locality: "Electronic City",
    pricePerSqft: 6200,
    rentalYieldPct: 5.8,
    growthScore: 72,
    infraScore: 80,
    poiDensity: 62,
  },
  {
    lat: 12.9,
    lng: 77.6,
    locality: "Bannerghatta Road",
    pricePerSqft: 8200,
    rentalYieldPct: 4.2,
    growthScore: 70,
    infraScore: 75,
    poiDensity: 72,
  },
  {
    lat: 12.871,
    lng: 77.624,
    locality: "Begur",
    pricePerSqft: 6800,
    rentalYieldPct: 4.8,
    growthScore: 68,
    infraScore: 65,
    poiDensity: 58,
  },
  {
    lat: 12.9,
    lng: 77.58,
    locality: "JP Nagar",
    pricePerSqft: 9500,
    rentalYieldPct: 3.6,
    growthScore: 68,
    infraScore: 72,
    poiDensity: 80,
  },
  {
    lat: 12.929,
    lng: 77.583,
    locality: "Jayanagar",
    pricePerSqft: 14500,
    rentalYieldPct: 2.5,
    growthScore: 60,
    infraScore: 82,
    poiDensity: 88,
  },
  {
    lat: 12.88,
    lng: 77.55,
    locality: "Kanakapura Road",
    pricePerSqft: 7000,
    rentalYieldPct: 4.6,
    growthScore: 76,
    infraScore: 70,
    poiDensity: 60,
  },
  {
    lat: 12.91,
    lng: 77.65,
    locality: "HSR Layout",
    pricePerSqft: 12000,
    rentalYieldPct: 3.4,
    growthScore: 75,
    infraScore: 80,
    poiDensity: 85,
  },
  {
    lat: 12.9166,
    lng: 77.6101,
    locality: "BTM Layout",
    pricePerSqft: 10800,
    rentalYieldPct: 3.8,
    growthScore: 68,
    infraScore: 76,
    poiDensity: 82,
  },
  // ─── Central Bangalore ─────────────────────────────────────────────────────
  {
    lat: 12.9352,
    lng: 77.6245,
    locality: "Koramangala",
    pricePerSqft: 16000,
    rentalYieldPct: 2.6,
    growthScore: 65,
    infraScore: 90,
    poiDensity: 92,
  },
  {
    lat: 12.9756,
    lng: 77.6066,
    locality: "MG Road",
    pricePerSqft: 18000,
    rentalYieldPct: 2.2,
    growthScore: 55,
    infraScore: 95,
    poiDensity: 98,
  },
  // ─── West Bangalore ────────────────────────────────────────────────────────
  {
    lat: 12.971,
    lng: 77.537,
    locality: "Vijayanagar",
    pricePerSqft: 8000,
    rentalYieldPct: 3.8,
    growthScore: 62,
    infraScore: 70,
    poiDensity: 74,
  },
  {
    lat: 12.991,
    lng: 77.555,
    locality: "Rajajinagar",
    pricePerSqft: 10000,
    rentalYieldPct: 3.3,
    growthScore: 65,
    infraScore: 75,
    poiDensity: 80,
  },
  {
    lat: 12.9787,
    lng: 77.553,
    locality: "Yeshwanthpur",
    pricePerSqft: 9500,
    rentalYieldPct: 3.7,
    growthScore: 72,
    infraScore: 78,
    poiDensity: 76,
  },
  // ─── Extended Corridors ────────────────────────────────────────────────────
  {
    lat: 13.15,
    lng: 77.68,
    locality: "Bagalur",
    pricePerSqft: 4200,
    rentalYieldPct: 5.5,
    growthScore: 80,
    infraScore: 72,
    poiDensity: 38,
  },
  {
    lat: 12.82,
    lng: 77.69,
    locality: "Bommasandra",
    pricePerSqft: 4800,
    rentalYieldPct: 5.0,
    growthScore: 66,
    infraScore: 60,
    poiDensity: 42,
  },
  {
    lat: 12.918,
    lng: 77.573,
    locality: "Banashankari",
    pricePerSqft: 9800,
    rentalYieldPct: 3.5,
    growthScore: 66,
    infraScore: 74,
    poiDensity: 78,
  },
  {
    lat: 12.9145,
    lng: 77.504,
    locality: "RR Nagar",
    pricePerSqft: 7500,
    rentalYieldPct: 4.0,
    growthScore: 60,
    infraScore: 65,
    poiDensity: 70,
  },
];

// ─── Color Helpers ─────────────────────────────────────────────────────────────

function priceColor(psf: number): string {
  if (psf >= 12000) return "#ef4444";
  if (psf >= 8000) return "#f97316";
  return "#eab308";
}

function yieldColor(yieldPct: number): string {
  if (yieldPct >= 4.5) return "#22c55e";
  if (yieldPct >= 3.0) return "#eab308";
  return "#3b82f6";
}

function growthColor(score: number): string {
  if (score >= 80) return "#D4AF37";
  if (score >= 65) return "#10b981";
  return "#6b7280";
}

function metroColor(score: number): string {
  if (score >= 80) return "#a855f7";
  if (score >= 60) return "#818cf8";
  return "#c4b5fd";
}

function infraColor(score: number): string {
  if (score >= 80) return "#06b6d4";
  if (score >= 60) return "#22d3ee";
  return "#67e8f9";
}

function poiColor(score: number): string {
  if (score >= 80) return "#14b8a6";
  if (score >= 60) return "#2dd4bf";
  return "#5eead4";
}

function getColor(
  layer: MapLayerType,
  point: Omit<HeatmapPoint, "color" | "radius">,
): string {
  switch (layer) {
    case "price_heatmap":
      return priceColor(point.pricePerSqft);
    case "rental_yield":
      return yieldColor(point.rentalYieldPct);
    case "growth_zones":
      return growthColor(point.growthScore);
    case "metro_connectivity":
      return metroColor(point.growthScore);
    case "future_infra":
      return infraColor(point.infraScore);
    case "poi_density":
      return poiColor(point.poiDensity);
  }
}

function getRadius(
  layer: MapLayerType,
  point: Omit<HeatmapPoint, "color" | "radius">,
): number {
  const base = 900;
  switch (layer) {
    case "price_heatmap": {
      const norm = Math.min(point.pricePerSqft / 18000, 1);
      return Math.round(base + norm * 600);
    }
    case "rental_yield": {
      const norm = Math.min(point.rentalYieldPct / 6, 1);
      return Math.round(base + norm * 400);
    }
    default: {
      const score =
        layer === "growth_zones"
          ? point.growthScore
          : layer === "metro_connectivity"
            ? point.growthScore
            : layer === "future_infra"
              ? point.infraScore
              : point.poiDensity;
      const norm = Math.min(score / 100, 1);
      return Math.round(base + norm * 500);
    }
  }
}

// ─── Engine Functions ─────────────────────────────────────────────────────────

export function getHeatmapPoints(
  layer: MapLayerType,
  lat: number,
  lng: number,
  radiusKm?: number,
): HeatmapPoint[] {
  let data = LOCALITY_HEATMAP_DATA;
  if (radiusKm != null && lat && lng) {
    data = data.filter(
      (p) => haversineDistance(lat, lng, p.lat, p.lng) <= radiusKm,
    );
  }
  return data.map((p) => ({
    ...p,
    color: getColor(layer, p),
    radius: getRadius(layer, p),
  }));
}

// ─── Phase 2: Bus Stops Dataset (Bangalore + North Bangalore expanded) ────────

const BUS_STOPS: Omit<SmartPin, "id" | "priority">[] = [
  {
    type: "bus_stop",
    name: "Majestic Bus Terminal (KBS)",
    lat: 12.977,
    lng: 77.572,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "Central hub — city-wide connectivity",
  },
  {
    type: "bus_stop",
    name: "Shivajinagar Bus Stand",
    lat: 12.985,
    lng: 77.601,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "Major interchange for East Bangalore",
  },
  {
    type: "bus_stop",
    name: "Silk Board Bus Stop",
    lat: 12.917,
    lng: 77.623,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "High-density commuter junction",
  },
  {
    type: "bus_stop",
    name: "Marathahalli Bridge Bus Stop",
    lat: 12.956,
    lng: 77.701,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "IT corridor transit hub",
  },
  {
    type: "bus_stop",
    name: "Hebbal Flyover Bus Stop",
    lat: 13.035,
    lng: 77.595,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "Gateway to North Bangalore",
  },
  {
    type: "bus_stop",
    name: "Electronic City Bus Stop (Toll)",
    lat: 12.843,
    lng: 77.661,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "IT Park feeder route terminal",
  },
  {
    type: "bus_stop",
    name: "Yeshwanthpur Bus Stand",
    lat: 13.025,
    lng: 77.543,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "West Bangalore transit junction",
  },
  {
    type: "bus_stop",
    name: "Bannerghatta Road Bus Depot",
    lat: 12.887,
    lng: 77.598,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "South corridor main depot",
  },
  {
    type: "bus_stop",
    name: "Whitefield Bus Stop",
    lat: 12.969,
    lng: 77.748,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "Far east IT zone access",
  },
  {
    type: "bus_stop",
    name: "Jayanagar Bus Stand",
    lat: 12.924,
    lng: 77.587,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "South Bangalore residential hub",
  },
  // ─── North Bangalore Bus Stops (Phase 2 expansion) ────────────────────────
  {
    type: "bus_stop",
    name: "Thanisandra Main Road Bus Stop",
    lat: 13.068,
    lng: 77.628,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "Thanisandra IT corridor feeder",
  },
  {
    type: "bus_stop",
    name: "Nagawara Junction Bus Stop",
    lat: 13.047,
    lng: 77.621,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "North corridor major bus hub",
  },
  {
    type: "bus_stop",
    name: "Bagalur Cross Bus Stop",
    lat: 13.148,
    lng: 77.676,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "Aerospace park access route",
  },
  {
    type: "bus_stop",
    name: "Yelahanka New Town Bus Stop",
    lat: 13.101,
    lng: 77.596,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "Yelahanka NT BDA sector hub",
  },
  {
    type: "bus_stop",
    name: "Devanahalli Town Bus Stand",
    lat: 13.248,
    lng: 77.711,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "Airport zone inter-city terminal",
  },
  {
    type: "bus_stop",
    name: "Sahakarnagar Bus Depot",
    lat: 13.062,
    lng: 77.579,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "Sahakarnagar residential hub transit",
  },
  {
    type: "bus_stop",
    name: "Jakkur Layout Bus Stop",
    lat: 13.074,
    lng: 77.603,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "Jakkur residential feeder route",
  },
  {
    type: "bus_stop",
    name: "Hennur Road Junction Bus Stop",
    lat: 13.041,
    lng: 77.638,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "Hennur Road main transit point",
  },
  {
    type: "bus_stop",
    name: "Kogilu Cross Bus Stop",
    lat: 13.073,
    lng: 77.612,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "Kogilu area service route",
  },
  {
    type: "bus_stop",
    name: "Manyata Tech Park Gate Bus Stop",
    lat: 13.052,
    lng: 77.624,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "Manyata Tech Park direct feeder",
  },
  {
    type: "bus_stop",
    name: "Rachenahalli Bus Stop",
    lat: 13.056,
    lng: 77.621,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "Manyata residency transit access",
  },
  {
    type: "bus_stop",
    name: "Hosaahalli Bus Stop",
    lat: 13.058,
    lng: 77.582,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "West North Bangalore feeder",
  },
  {
    type: "bus_stop",
    name: "Kalkere Bus Stop",
    lat: 13.036,
    lng: 77.655,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "Kalkere Lake area bus service",
  },
  {
    type: "bus_stop",
    name: "Doddaballapur Road Bus Stop",
    lat: 13.135,
    lng: 77.564,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "Doddaballapur industrial route",
  },
  {
    type: "bus_stop",
    name: "Nagavara Lake Bus Stop",
    lat: 13.039,
    lng: 77.626,
    emoji: "🚌",
    impactTag: "Connectivity boost",
    impactDescription: "Nagavara tech zone transit stop",
  },
];

// ─── Phase 2: Railway Stations Dataset (Bangalore + North Bangalore) ─────────

const RAILWAY_STATIONS: Omit<SmartPin, "id" | "priority">[] = [
  {
    type: "railway",
    name: "KSR Bengaluru City Station",
    lat: 12.9767,
    lng: 77.5713,
    emoji: "🚆",
    impactTag: "Connectivity boost",
    impactDescription: "Main railway terminus — intercity hub",
  },
  {
    type: "railway",
    name: "Yeshwanthpur Junction",
    // Verified: Yeshwanthpur Railway Junction — Google Maps + Indian Railways April 2026
    lat: 13.0249,
    lng: 77.5546,
    emoji: "🚆",
    impactTag: "Connectivity boost",
    impactDescription: "Second major railway hub in Bangalore",
  },
  {
    type: "railway",
    name: "Banaswadi Railway Station",
    lat: 13.0214,
    lng: 77.6499,
    emoji: "🚆",
    impactTag: "Connectivity boost",
    impactDescription: "North-east commuter rail access",
  },
  {
    type: "railway",
    name: "Whitefield Railway Station",
    lat: 12.9698,
    lng: 77.7499,
    emoji: "🚆",
    impactTag: "Connectivity boost",
    impactDescription: "IT corridor direct rail link",
  },
  {
    type: "railway",
    name: "Krishnarajapuram (KJM) Station",
    lat: 13.0079,
    lng: 77.6884,
    emoji: "🚆",
    impactTag: "Connectivity boost",
    impactDescription: "East Bangalore commuter gateway",
  },
  {
    type: "railway",
    name: "Baiyappanahalli Station",
    lat: 12.9887,
    lng: 77.6481,
    emoji: "🚆",
    impactTag: "Connectivity boost",
    impactDescription: "East corridor metro + rail integration",
  },
  {
    type: "railway",
    name: "Bangalore Cantonment Station",
    lat: 12.9985,
    lng: 77.599,
    emoji: "🚆",
    impactTag: "Connectivity boost",
    impactDescription: "Central Bangalore rail point",
  },
  {
    type: "railway",
    name: "Electronic City (Heelalige) Station",
    lat: 12.836,
    lng: 77.672,
    emoji: "🚆",
    impactTag: "Connectivity boost",
    impactDescription: "South Bangalore IT zone rail access",
  },
  // ─── North Bangalore Railway Stations ─────────────────────────────────────
  {
    type: "railway",
    name: "Hebbal Railway Station",
    lat: 13.035,
    lng: 77.596,
    emoji: "🚆",
    impactTag: "Connectivity boost",
    impactDescription: "North Bangalore suburban rail stop",
  },
  {
    type: "railway",
    name: "Yelahanka Junction",
    lat: 13.1009,
    lng: 77.5947,
    emoji: "🚆",
    impactTag: "Connectivity boost",
    impactDescription: "Major north junction — airport rail link",
  },
  {
    type: "railway",
    name: "Devanahalli Railway Station",
    lat: 13.2487,
    lng: 77.7121,
    emoji: "🚆",
    impactTag: "Connectivity boost",
    impactDescription: "Aerotropolis rail gateway",
  },
  {
    type: "railway",
    name: "Lottegollahalli Railway Station",
    lat: 13.0531,
    lng: 77.5272,
    emoji: "🚆",
    impactTag: "Connectivity boost",
    impactDescription: "North-west suburban rail stop",
  },
];

// ─── Phase 3: Hospitals Dataset (Bangalore + North Bangalore) ────────────────

const HOSPITALS: Omit<SmartPin, "id" | "priority">[] = [
  {
    type: "hospital",
    name: "Manipal Hospital (HAL Airport)",
    lat: 12.96,
    lng: 77.648,
    emoji: "🏥",
    impactTag: "Livability boost",
    impactDescription: "Top-rated multi-specialty hospital",
  },
  {
    type: "hospital",
    name: "Fortis Hospital Bannerghatta",
    lat: 12.883,
    lng: 77.601,
    emoji: "🏥",
    impactTag: "Livability boost",
    impactDescription: "Premium healthcare — south zone",
  },
  {
    type: "hospital",
    name: "Narayana Health City",
    lat: 12.847,
    lng: 77.668,
    emoji: "🏥",
    impactTag: "Livability boost",
    impactDescription: "India's largest cardiac centre",
  },
  {
    type: "hospital",
    name: "Apollo Hospital Bannerghatta",
    lat: 12.88,
    lng: 77.598,
    emoji: "🏥",
    impactTag: "Livability boost",
    impactDescription: "Apollo super-specialty care",
  },
  {
    type: "hospital",
    name: "Columbia Asia Hebbal",
    lat: 13.04,
    lng: 77.601,
    emoji: "🏥",
    impactTag: "Livability boost",
    impactDescription: "North Bangalore premium hospital",
  },
  {
    type: "hospital",
    name: "St. John's Medical College Hospital",
    lat: 12.934,
    lng: 77.62,
    emoji: "🏥",
    impactTag: "Livability boost",
    impactDescription: "Premier teaching hospital — south",
  },
  {
    type: "hospital",
    name: "NIMHANS Campus Hospital",
    lat: 12.942,
    lng: 77.598,
    emoji: "🏥",
    impactTag: "Livability boost",
    impactDescription: "National mental health institute",
  },
  {
    type: "hospital",
    name: "Sakra World Hospital",
    lat: 12.951,
    lng: 77.701,
    emoji: "🏥",
    impactTag: "Livability boost",
    impactDescription: "East Bangalore multi-specialty",
  },
  {
    type: "hospital",
    name: "BGS Gleneagles Global Hospital",
    lat: 12.924,
    lng: 77.508,
    emoji: "🏥",
    impactTag: "Livability boost",
    impactDescription: "West Bangalore premium care",
  },
  {
    type: "hospital",
    name: "Aster CMI Hospital",
    lat: 13.059,
    lng: 77.5795,
    emoji: "🏥",
    impactTag: "Livability boost",
    impactDescription: "North corridor super-specialty",
  },
  // ─── North Bangalore Hospitals ─────────────────────────────────────────────
  {
    type: "hospital",
    name: "Manipal Hospital Hebbal",
    lat: 13.0353,
    lng: 77.596,
    emoji: "🏥",
    impactTag: "Livability boost",
    impactDescription: "North Bangalore flagship hospital",
  },
  {
    type: "hospital",
    name: "Fortis Hospital (Nagarbhavi)",
    lat: 13.0089,
    lng: 77.6476,
    emoji: "🏥",
    impactTag: "Livability boost",
    impactDescription: "Multi-specialty care — north east",
  },
  {
    type: "hospital",
    name: "Apollo Spectra Sahakarnagar",
    lat: 13.0254,
    lng: 77.5553,
    emoji: "🏥",
    impactTag: "Livability boost",
    impactDescription: "Day-care surgical hospital",
  },
  {
    type: "hospital",
    name: "Sparsh Hospital Hebbal",
    lat: 13.037,
    lng: 77.597,
    emoji: "🏥",
    impactTag: "Livability boost",
    impactDescription: "Orthopaedics & trauma care north",
  },
  {
    type: "hospital",
    name: "Narayana Multispeciality Yelahanka",
    lat: 13.098,
    lng: 77.594,
    emoji: "🏥",
    impactTag: "Livability boost",
    impactDescription: "Affordable multi-specialty hospital",
  },
  {
    type: "hospital",
    name: "Govt. District Hospital Devanahalli",
    lat: 13.245,
    lng: 77.709,
    emoji: "🏥",
    impactTag: "Livability boost",
    impactDescription: "Primary government healthcare",
  },
];

// ─── Phase 3: Schools Dataset (Bangalore + North Bangalore) ──────────────────

const SCHOOLS: Omit<SmartPin, "id" | "priority">[] = [
  {
    type: "school",
    name: "Bishop Cotton Boys' School",
    lat: 12.982,
    lng: 77.597,
    emoji: "🏫",
    impactTag: "Livability boost",
    impactDescription: "Oldest premier school in Bangalore",
  },
  {
    type: "school",
    name: "Greenwood High International School",
    lat: 13.007,
    lng: 77.65,
    emoji: "🏫",
    impactTag: "Livability boost",
    impactDescription: "Top-rated IB/IGCSE school",
  },
  {
    type: "school",
    name: "Delhi Public School (East)",
    lat: 12.971,
    lng: 77.748,
    emoji: "🏫",
    impactTag: "Livability boost",
    impactDescription: "Premium CBSE school — east zone",
  },
  {
    type: "school",
    name: "National Public School Koramangala",
    lat: 12.936,
    lng: 77.627,
    emoji: "🏫",
    impactTag: "Livability boost",
    impactDescription: "High-ranking CBSE school",
  },
  {
    type: "school",
    name: "Inventure Academy",
    lat: 12.907,
    lng: 77.686,
    emoji: "🏫",
    impactTag: "Livability boost",
    impactDescription: "IB curriculum — Sarjapur corridor",
  },
  {
    type: "school",
    name: "Indus International School",
    lat: 13.098,
    lng: 77.71,
    emoji: "🏫",
    impactTag: "Livability boost",
    impactDescription: "North Bangalore IB school",
  },
  {
    type: "school",
    name: "Canadian International School",
    lat: 13.073,
    lng: 77.616,
    emoji: "🏫",
    impactTag: "Livability boost",
    impactDescription: "International curriculum — north",
  },
  {
    type: "school",
    name: "Vidyashilp Academy",
    lat: 13.07,
    lng: 77.621,
    emoji: "🏫",
    impactTag: "Livability boost",
    impactDescription: "Yelahanka corridor academic hub",
  },
  {
    type: "school",
    name: "Azim Premji University",
    lat: 12.937,
    lng: 77.54,
    emoji: "🏫",
    impactTag: "Livability boost",
    impactDescription: "West Bangalore education anchor",
  },
  {
    type: "school",
    name: "Ryan International School Whitefield",
    lat: 12.975,
    lng: 77.752,
    emoji: "🏫",
    impactTag: "Livability boost",
    impactDescription: "East zone CBSE school",
  },
  // ─── North Bangalore Schools ───────────────────────────────────────────────
  {
    type: "school",
    name: "Ryan International School Yelahanka",
    lat: 13.085,
    lng: 77.595,
    emoji: "🏫",
    impactTag: "Livability boost",
    impactDescription: "CBSE school — Yelahanka corridor",
  },
  {
    type: "school",
    name: "Presidency School Hebbal",
    lat: 13.035,
    lng: 77.596,
    emoji: "🏫",
    impactTag: "Livability boost",
    impactDescription: "Premium CBSE school — Hebbal",
  },
  {
    type: "school",
    name: "Delhi Public School North",
    lat: 13.1,
    lng: 77.59,
    emoji: "🏫",
    impactTag: "Livability boost",
    impactDescription: "DPS Yelahanka — top-ranked north",
  },
  {
    type: "school",
    name: "National Academy Yelahanka",
    lat: 13.094,
    lng: 77.597,
    emoji: "🏫",
    impactTag: "Livability boost",
    impactDescription: "CBSE national curriculum school",
  },
  {
    type: "school",
    name: "Deens Academy Whitefield",
    lat: 12.965,
    lng: 77.746,
    emoji: "🏫",
    impactTag: "Livability boost",
    impactDescription: "IB-PYP international academy east",
  },
  {
    type: "school",
    name: "Orchids The International School Thanisandra",
    lat: 13.067,
    lng: 77.629,
    emoji: "🏫",
    impactTag: "Livability boost",
    impactDescription: "International school — north corridor",
  },
];

// ─── Named exports for external use ──────────────────────────────────────────

export { BUS_STOPS, RAILWAY_STATIONS, HOSPITALS, SCHOOLS };

// ─── Infrastructure Layer Types (new premium panel) ──────────────────────────

export type InfraLayerType =
  | "metro"
  | "railway"
  | "bus_stop"
  | "hospital"
  | "school"
  | "college"
  | "tech_park"
  | "mall"
  | "airport"
  | "highway"
  | "police"
  | "petrol_pump"
  | "pharmacy"
  | "supermarket"
  | "restaurant"
  | "bank"
  | "atm";

export type LevelType = "smart" | "premium" | "growth" | "investment";

// ─── InfraPin type ────────────────────────────────────────────────────────────

export interface InfraPin {
  id: string;
  lat: number;
  lng: number;
  name: string;
  type: InfraLayerType;
  distance?: number;
  status?: "operational" | "upcoming" | "planned";
  emoji: string;
  impactTag: string;
  impactDescription: string;
}

// ─── HeatmapConfig ────────────────────────────────────────────────────────────

export interface HeatmapConfig {
  gradient: Record<number, string>;
  minOpacity: number;
  maxZoom: number;
  radius: number;
}

// ─── College Pins ─────────────────────────────────────────────────────────────

const COLLEGES: Omit<InfraPin, "id">[] = [
  {
    lat: 12.9373,
    lng: 77.6036,
    name: "IIM Bangalore",
    type: "college",
    emoji: "🎓",
    status: "operational",
    impactTag: "Education premium",
    impactDescription:
      "Premier management institution — boosts nearby property demand",
  },
  {
    lat: 12.9204,
    lng: 77.6066,
    name: "Christ University",
    type: "college",
    emoji: "🎓",
    status: "operational",
    impactTag: "Education premium",
    impactDescription:
      "Large autonomous university — high student rental demand",
  },
  {
    lat: 12.9236,
    lng: 77.4986,
    name: "RV College of Engineering",
    type: "college",
    emoji: "🎓",
    status: "operational",
    impactTag: "Education premium",
    impactDescription: "Top engineering college — west corridor anchor",
  },
  {
    lat: 12.9607,
    lng: 77.5764,
    name: "BMS College of Engineering",
    type: "college",
    emoji: "🎓",
    status: "operational",
    impactTag: "Education premium",
    impactDescription: "Central Bangalore engineering hub",
  },
  {
    lat: 12.9132,
    lng: 77.5391,
    name: "PES University",
    type: "college",
    emoji: "🎓",
    status: "operational",
    impactTag: "Education premium",
    impactDescription: "Leading private university — south-west zone",
  },
  {
    lat: 12.9095,
    lng: 77.594,
    name: "Dayananda Sagar University",
    type: "college",
    emoji: "🎓",
    status: "operational",
    impactTag: "Education premium",
    impactDescription: "Multi-campus university — Banashankari corridor",
  },
];

// ─── Mall Pins ────────────────────────────────────────────────────────────────

const MALLS: Omit<InfraPin, "id">[] = [
  {
    lat: 12.996,
    lng: 77.6966,
    name: "Phoenix Marketcity",
    type: "mall",
    emoji: "🛍",
    status: "operational",
    impactTag: "Retail anchor",
    impactDescription: "Largest mall — east Bangalore retail premium",
  },
  {
    lat: 12.9989,
    lng: 77.6516,
    name: "VR Bengaluru",
    type: "mall",
    emoji: "🛍",
    status: "operational",
    impactTag: "Retail anchor",
    impactDescription: "Premium lifestyle mall — Whitefield-ORR junction",
  },
  {
    lat: 13.0067,
    lng: 77.5629,
    name: "Mantri Square",
    type: "mall",
    emoji: "🛍",
    status: "operational",
    impactTag: "Retail anchor",
    impactDescription: "Largest mall north-west — Malleshwaram",
  },
  {
    lat: 12.9726,
    lng: 77.5971,
    name: "UB City",
    type: "mall",
    emoji: "🛍",
    status: "operational",
    impactTag: "Luxury retail",
    impactDescription: "Premium luxury retail — CBD anchor",
  },
  {
    lat: 13.0419,
    lng: 77.6051,
    name: "Elements Mall",
    type: "mall",
    emoji: "🛍",
    status: "operational",
    impactTag: "Retail anchor",
    impactDescription: "North Bangalore major retail hub",
  },
  {
    lat: 12.9806,
    lng: 77.5909,
    name: "GT World Mall",
    type: "mall",
    emoji: "🛍",
    status: "operational",
    impactTag: "Retail anchor",
    impactDescription: "Gandhinagar area retail destination",
  },
  {
    lat: 12.9266,
    lng: 77.6268,
    name: "Forum Mall Koramangala",
    type: "mall",
    emoji: "🛍",
    status: "operational",
    impactTag: "Retail anchor",
    impactDescription: "South-east retail flagship",
  },
  {
    lat: 12.9151,
    lng: 77.6277,
    name: "Forum Value City",
    type: "mall",
    emoji: "🛍",
    status: "operational",
    impactTag: "Retail anchor",
    impactDescription: "Whitefield-Electronic City corridor retail",
  },
];

// ─── Airport Pins ─────────────────────────────────────────────────────────────

const AIRPORTS: Omit<InfraPin, "id">[] = [
  {
    lat: 13.1986,
    lng: 77.7066,
    name: "Kempegowda International Airport (BLR)",
    type: "airport",
    emoji: "✈",
    status: "operational",
    impactTag: "Aerotropolis boost",
    impactDescription: "International airport — drives north corridor premium",
  },
  {
    lat: 12.9573,
    lng: 77.6688,
    name: "HAL Airport (Legacy)",
    type: "airport",
    emoji: "✈",
    status: "operational",
    impactTag: "Defence zone",
    impactDescription: "HAL campus anchor — defence / aerospace premium",
  },
];

// ─── Highway Pins ─────────────────────────────────────────────────────────────

const HIGHWAYS: Omit<InfraPin, "id">[] = [
  {
    lat: 12.9046,
    lng: 77.5123,
    name: "NICE Road Interchange",
    type: "highway",
    emoji: "🛣",
    status: "operational",
    impactTag: "Expressway access",
    impactDescription:
      "Outer ring expressway — south-west connectivity premium",
  },
  {
    lat: 13.0825,
    lng: 77.5296,
    name: "Tumkur Road / NH-48",
    type: "highway",
    emoji: "🛣",
    status: "operational",
    impactTag: "National highway",
    impactDescription:
      "Bangalore-Mumbai highway — north-west industrial corridor",
  },
  {
    lat: 13.0033,
    lng: 77.6993,
    name: "Old Madras Road / NH-75",
    type: "highway",
    emoji: "🛣",
    status: "operational",
    impactTag: "National highway",
    impactDescription: "East corridor highway — Whitefield logistics access",
  },
  {
    lat: 12.8921,
    lng: 77.6422,
    name: "Hosur Road / NH-44",
    type: "highway",
    emoji: "🛣",
    status: "operational",
    impactTag: "National highway",
    impactDescription: "Bangalore-Chennai highway — Electronic City connector",
  },
  {
    lat: 12.8677,
    lng: 77.5823,
    name: "Kanakapura Road",
    type: "highway",
    emoji: "🛣",
    status: "operational",
    impactTag: "Expressway access",
    impactDescription: "South corridor highway — metro under construction",
  },
  {
    lat: 13.1286,
    lng: 77.5946,
    name: "Bellary Road / NH-44 (North)",
    type: "highway",
    emoji: "🛣",
    status: "operational",
    impactTag: "National highway",
    impactDescription: "Airport highway — north corridor premium driver",
  },
];

// ─── Police Stations ─────────────────────────────────────────────────────────

const POLICE_STATIONS: Omit<InfraPin, "id">[] = [
  {
    lat: 13.042,
    lng: 77.567,
    name: "Jalahalli Police Station",
    type: "police",
    emoji: "🚔",
    status: "operational",
    impactTag: "Safety",
    impactDescription: "Local police station — BEL Road area coverage",
  },
  {
    lat: 13.035,
    lng: 77.597,
    name: "Hebbal Police Station",
    type: "police",
    emoji: "🚔",
    status: "operational",
    impactTag: "Safety",
    impactDescription: "Hebbal jurisdiction covering ORR north",
  },
  {
    lat: 12.978,
    lng: 77.608,
    name: "Ulsoor Police Station",
    type: "police",
    emoji: "🚔",
    status: "operational",
    impactTag: "Safety",
    impactDescription: "Central Bangalore jurisdiction",
  },
  {
    lat: 12.933,
    lng: 77.624,
    name: "Koramangala Police Station",
    type: "police",
    emoji: "🚔",
    status: "operational",
    impactTag: "Safety",
    impactDescription: "Koramangala & BTM jurisdiction",
  },
  {
    lat: 13.02,
    lng: 77.694,
    name: "Whitefield Police Station",
    type: "police",
    emoji: "🚔",
    status: "operational",
    impactTag: "Safety",
    impactDescription: "Whitefield tech corridor coverage",
  },
  {
    lat: 12.91,
    lng: 77.544,
    name: "JP Nagar Police Station",
    type: "police",
    emoji: "🚔",
    status: "operational",
    impactTag: "Safety",
    impactDescription: "JP Nagar & Banashankari coverage",
  },
  {
    lat: 12.988,
    lng: 77.56,
    name: "Vijayanagar Police Station",
    type: "police",
    emoji: "🚔",
    status: "operational",
    impactTag: "Safety",
    impactDescription: "Vijayanagar & Rajajinagar coverage",
  },
  {
    lat: 13.069,
    lng: 77.648,
    name: "Thanisandra Police Station",
    type: "police",
    emoji: "🚔",
    status: "operational",
    impactTag: "Safety",
    impactDescription: "Thanisandra & Manyata corridor",
  },
  {
    lat: 12.96,
    lng: 77.641,
    name: "Indiranagar Police Station",
    type: "police",
    emoji: "🚔",
    status: "operational",
    impactTag: "Safety",
    impactDescription: "Indiranagar & Domlur area",
  },
  {
    lat: 12.917,
    lng: 77.602,
    name: "Jayanagar Police Station",
    type: "police",
    emoji: "🚔",
    status: "operational",
    impactTag: "Safety",
    impactDescription: "Jayanagar jurisdiction",
  },
];

// ─── Petrol Pumps ─────────────────────────────────────────────────────────────

const PETROL_PUMPS: Omit<InfraPin, "id">[] = [
  {
    lat: 13.047,
    lng: 77.565,
    name: "HPCL BEL Road",
    type: "petrol_pump",
    emoji: "⛽",
    status: "operational",
    impactTag: "Fuel",
    impactDescription: "24-hour fuel station on BEL Road",
  },
  {
    lat: 13.038,
    lng: 77.595,
    name: "Indian Oil Hebbal Flyover",
    type: "petrol_pump",
    emoji: "⛽",
    status: "operational",
    impactTag: "Fuel",
    impactDescription: "High-traffic fuel point near Hebbal",
  },
  {
    lat: 12.975,
    lng: 77.612,
    name: "BPCL MG Road",
    type: "petrol_pump",
    emoji: "⛽",
    status: "operational",
    impactTag: "Fuel",
    impactDescription: "Central city fuel station",
  },
  {
    lat: 12.935,
    lng: 77.621,
    name: "Indian Oil Koramangala",
    type: "petrol_pump",
    emoji: "⛽",
    status: "operational",
    impactTag: "Fuel",
    impactDescription: "Koramangala 5th Block fuel",
  },
  {
    lat: 13.018,
    lng: 77.695,
    name: "HPCL Whitefield Main",
    type: "petrol_pump",
    emoji: "⛽",
    status: "operational",
    impactTag: "Fuel",
    impactDescription: "Whitefield road fuel station",
  },
  {
    lat: 12.912,
    lng: 77.546,
    name: "BPCL JP Nagar",
    type: "petrol_pump",
    emoji: "⛽",
    status: "operational",
    impactTag: "Fuel",
    impactDescription: "JP Nagar 7th Phase fuel",
  },
  {
    lat: 13.014,
    lng: 77.563,
    name: "Indian Oil Yeshwanthpur",
    type: "petrol_pump",
    emoji: "⛽",
    status: "operational",
    impactTag: "Fuel",
    impactDescription: "Yeshwanthpur junction fuel",
  },
  {
    lat: 12.985,
    lng: 77.561,
    name: "HPCL Rajajinagar",
    type: "petrol_pump",
    emoji: "⛽",
    status: "operational",
    impactTag: "Fuel",
    impactDescription: "Rajajinagar 4th Block fuel point",
  },
  {
    lat: 12.963,
    lng: 77.639,
    name: "BPCL Indiranagar 100ft",
    type: "petrol_pump",
    emoji: "⛽",
    status: "operational",
    impactTag: "Fuel",
    impactDescription: "100 Feet Road Indiranagar",
  },
  {
    lat: 12.918,
    lng: 77.607,
    name: "Indian Oil Jayanagar",
    type: "petrol_pump",
    emoji: "⛽",
    status: "operational",
    impactTag: "Fuel",
    impactDescription: "Jayanagar 4th Block fuel",
  },
];

// ─── Pharmacies ───────────────────────────────────────────────────────────────

const PHARMACIES: Omit<InfraPin, "id">[] = [
  {
    lat: 13.041,
    lng: 77.568,
    name: "Apollo Pharmacy BEL Road",
    type: "pharmacy",
    emoji: "💊",
    status: "operational",
    impactTag: "Healthcare",
    impactDescription: "24-hour Apollo pharmacy",
  },
  {
    lat: 13.037,
    lng: 77.598,
    name: "MedPlus Hebbal",
    type: "pharmacy",
    emoji: "💊",
    status: "operational",
    impactTag: "Healthcare",
    impactDescription: "MedPlus chain — Hebbal main road",
  },
  {
    lat: 12.976,
    lng: 77.61,
    name: "Wellness Forever MG Road",
    type: "pharmacy",
    emoji: "💊",
    status: "operational",
    impactTag: "Healthcare",
    impactDescription: "Central Bangalore pharmacy",
  },
  {
    lat: 12.934,
    lng: 77.623,
    name: "Apollo Pharmacy Koramangala",
    type: "pharmacy",
    emoji: "💊",
    status: "operational",
    impactTag: "Healthcare",
    impactDescription: "Koramangala 6th Block",
  },
  {
    lat: 13.019,
    lng: 77.693,
    name: "MedPlus Whitefield",
    type: "pharmacy",
    emoji: "💊",
    status: "operational",
    impactTag: "Healthcare",
    impactDescription: "ITPL main road pharmacy",
  },
  {
    lat: 12.911,
    lng: 77.545,
    name: "Apollo Pharmacy JP Nagar",
    type: "pharmacy",
    emoji: "💊",
    status: "operational",
    impactTag: "Healthcare",
    impactDescription: "JP Nagar 3rd Phase",
  },
  {
    lat: 12.961,
    lng: 77.64,
    name: "MedPlus Indiranagar",
    type: "pharmacy",
    emoji: "💊",
    status: "operational",
    impactTag: "Healthcare",
    impactDescription: "Indiranagar 12th Main",
  },
  {
    lat: 12.916,
    lng: 77.601,
    name: "Wellness Forever Jayanagar",
    type: "pharmacy",
    emoji: "💊",
    status: "operational",
    impactTag: "Healthcare",
    impactDescription: "Jayanagar Shopping Complex",
  },
  {
    lat: 12.988,
    lng: 77.562,
    name: "Apollo Pharmacy Rajajinagar",
    type: "pharmacy",
    emoji: "💊",
    status: "operational",
    impactTag: "Healthcare",
    impactDescription: "Rajajinagar 1st Block",
  },
  {
    lat: 13.068,
    lng: 77.647,
    name: "MedPlus Thanisandra",
    type: "pharmacy",
    emoji: "💊",
    status: "operational",
    impactTag: "Healthcare",
    impactDescription: "Thanisandra main road",
  },
];

// ─── Supermarkets ─────────────────────────────────────────────────────────────

const SUPERMARKETS: Omit<InfraPin, "id">[] = [
  {
    lat: 13.043,
    lng: 77.566,
    name: "More Supermarket BEL Road",
    type: "supermarket",
    emoji: "🛒",
    status: "operational",
    impactTag: "Essentials",
    impactDescription: "Daily grocery — BEL Road",
  },
  {
    lat: 13.036,
    lng: 77.596,
    name: "Big Bazaar Hebbal",
    type: "supermarket",
    emoji: "🛒",
    status: "operational",
    impactTag: "Essentials",
    impactDescription: "Hebbal Kempapura retail hub",
  },
  {
    lat: 12.977,
    lng: 77.609,
    name: "Reliance Fresh MG Road",
    type: "supermarket",
    emoji: "🛒",
    status: "operational",
    impactTag: "Essentials",
    impactDescription: "Central Bangalore grocery",
  },
  {
    lat: 12.936,
    lng: 77.62,
    name: "Dmart Koramangala",
    type: "supermarket",
    emoji: "🛒",
    status: "operational",
    impactTag: "Essentials",
    impactDescription: "Value retail — Koramangala",
  },
  {
    lat: 13.017,
    lng: 77.692,
    name: "More Supermarket Whitefield",
    type: "supermarket",
    emoji: "🛒",
    status: "operational",
    impactTag: "Essentials",
    impactDescription: "Whitefield ITPL road grocery",
  },
  {
    lat: 12.913,
    lng: 77.547,
    name: "Dmart JP Nagar",
    type: "supermarket",
    emoji: "🛒",
    status: "operational",
    impactTag: "Essentials",
    impactDescription: "JP Nagar 24th Main",
  },
  {
    lat: 12.962,
    lng: 77.638,
    name: "Reliance Fresh Indiranagar",
    type: "supermarket",
    emoji: "🛒",
    status: "operational",
    impactTag: "Essentials",
    impactDescription: "Indiranagar CMH Road",
  },
  {
    lat: 12.919,
    lng: 77.603,
    name: "Big Bazaar Jayanagar",
    type: "supermarket",
    emoji: "🛒",
    status: "operational",
    impactTag: "Essentials",
    impactDescription: "Jayanagar 4th T Block mall",
  },
  {
    lat: 12.987,
    lng: 77.563,
    name: "More Supermarket Vijayanagar",
    type: "supermarket",
    emoji: "🛒",
    status: "operational",
    impactTag: "Essentials",
    impactDescription: "Vijayanagar main road",
  },
  {
    lat: 13.066,
    lng: 77.646,
    name: "Dmart Thanisandra",
    type: "supermarket",
    emoji: "🛒",
    status: "operational",
    impactTag: "Essentials",
    impactDescription: "Thanisandra near Nagavara",
  },
];

// ─── Restaurants ─────────────────────────────────────────────────────────────

const RESTAURANTS: Omit<InfraPin, "id">[] = [
  {
    lat: 13.04,
    lng: 77.569,
    name: "Dialogues Café BEL Road",
    type: "restaurant",
    emoji: "🍽️",
    status: "operational",
    impactTag: "Dining",
    impactDescription: "Popular café near BEL campus",
  },
  {
    lat: 13.034,
    lng: 77.599,
    name: "The Egg Factory Hebbal",
    type: "restaurant",
    emoji: "🍽️",
    status: "operational",
    impactTag: "Dining",
    impactDescription: "Casual dining — Hebbal",
  },
  {
    lat: 12.974,
    lng: 77.614,
    name: "Toit Brewery Indiranagar",
    type: "restaurant",
    emoji: "🍽️",
    status: "operational",
    impactTag: "Dining",
    impactDescription: "Bangalore's famous craft brewery",
  },
  {
    lat: 12.932,
    lng: 77.622,
    name: "Social Koramangala",
    type: "restaurant",
    emoji: "🍽️",
    status: "operational",
    impactTag: "Dining",
    impactDescription: "Popular all-day dining & bar",
  },
  {
    lat: 13.016,
    lng: 77.69,
    name: "Stories Whitefield",
    type: "restaurant",
    emoji: "🍽️",
    status: "operational",
    impactTag: "Dining",
    impactDescription: "Whitefield tech crowd favourite",
  },
  {
    lat: 12.914,
    lng: 77.548,
    name: "Meghana Foods JP Nagar",
    type: "restaurant",
    emoji: "🍽️",
    status: "operational",
    impactTag: "Dining",
    impactDescription: "Biriyani chain — JP Nagar",
  },
  {
    lat: 12.92,
    lng: 77.6,
    name: "Brahmin's Coffee Bar Jayanagar",
    type: "restaurant",
    emoji: "🍽️",
    status: "operational",
    impactTag: "Dining",
    impactDescription: "Iconic Bangalore breakfast spot",
  },
  {
    lat: 12.989,
    lng: 77.559,
    name: "Hotel Sapthagiri Rajajinagar",
    type: "restaurant",
    emoji: "🍽️",
    status: "operational",
    impactTag: "Dining",
    impactDescription: "Vegetarian thali — Rajajinagar",
  },
  {
    lat: 12.964,
    lng: 77.636,
    name: "Shivaji Military Hotel Indiranagar",
    type: "restaurant",
    emoji: "🍽️",
    status: "operational",
    impactTag: "Dining",
    impactDescription: "Naati food institution",
  },
  {
    lat: 13.07,
    lng: 77.645,
    name: "Coastal Bay Thanisandra",
    type: "restaurant",
    emoji: "🍽️",
    status: "operational",
    impactTag: "Dining",
    impactDescription: "Coastal seafood — north Bangalore",
  },
];

// ─── Banks ───────────────────────────────────────────────────────────────────

const BANKS: Omit<InfraPin, "id">[] = [
  {
    lat: 13.044,
    lng: 77.567,
    name: "SBI BEL Road Branch",
    type: "bank",
    emoji: "🏦",
    status: "operational",
    impactTag: "Banking",
    impactDescription: "State Bank of India — BEL Road",
  },
  {
    lat: 13.039,
    lng: 77.596,
    name: "HDFC Hebbal Branch",
    type: "bank",
    emoji: "🏦",
    status: "operational",
    impactTag: "Banking",
    impactDescription: "HDFC main branch — Hebbal",
  },
  {
    lat: 12.979,
    lng: 77.608,
    name: "ICICI MG Road Branch",
    type: "bank",
    emoji: "🏦",
    status: "operational",
    impactTag: "Banking",
    impactDescription: "ICICI Bank — central Bangalore",
  },
  {
    lat: 12.937,
    lng: 77.619,
    name: "Axis Bank Koramangala",
    type: "bank",
    emoji: "🏦",
    status: "operational",
    impactTag: "Banking",
    impactDescription: "Axis Bank — Koramangala 5th Block",
  },
  {
    lat: 13.021,
    lng: 77.691,
    name: "HDFC Whitefield Branch",
    type: "bank",
    emoji: "🏦",
    status: "operational",
    impactTag: "Banking",
    impactDescription: "HDFC Bank — ITPL main road",
  },
  {
    lat: 12.908,
    lng: 77.549,
    name: "Canara Bank JP Nagar",
    type: "bank",
    emoji: "🏦",
    status: "operational",
    impactTag: "Banking",
    impactDescription: "Canara Bank — JP Nagar 9th Phase",
  },
  {
    lat: 12.965,
    lng: 77.637,
    name: "Kotak Indiranagar Branch",
    type: "bank",
    emoji: "🏦",
    status: "operational",
    impactTag: "Banking",
    impactDescription: "Kotak Mahindra — 100 Feet Road",
  },
  {
    lat: 12.921,
    lng: 77.602,
    name: "HDFC Jayanagar Branch",
    type: "bank",
    emoji: "🏦",
    status: "operational",
    impactTag: "Banking",
    impactDescription: "HDFC — Jayanagar 4th Block",
  },
  {
    lat: 12.99,
    lng: 77.558,
    name: "SBI Vijayanagar Branch",
    type: "bank",
    emoji: "🏦",
    status: "operational",
    impactTag: "Banking",
    impactDescription: "SBI main branch — Vijayanagar",
  },
  {
    lat: 13.067,
    lng: 77.649,
    name: "ICICI Thanisandra Branch",
    type: "bank",
    emoji: "🏦",
    status: "operational",
    impactTag: "Banking",
    impactDescription: "ICICI Bank — Thanisandra road",
  },
];

// ─── ATMs ────────────────────────────────────────────────────────────────────

const ATMS: Omit<InfraPin, "id">[] = [
  {
    lat: 13.045,
    lng: 77.566,
    name: "SBI ATM BEL Road",
    type: "atm",
    emoji: "💳",
    status: "operational",
    impactTag: "ATM",
    impactDescription: "24-hr SBI ATM — BEL Road",
  },
  {
    lat: 13.04,
    lng: 77.594,
    name: "HDFC ATM Hebbal",
    type: "atm",
    emoji: "💳",
    status: "operational",
    impactTag: "ATM",
    impactDescription: "HDFC ATM — Hebbal flyover",
  },
  {
    lat: 12.98,
    lng: 77.607,
    name: "ICICI ATM MG Road",
    type: "atm",
    emoji: "💳",
    status: "operational",
    impactTag: "ATM",
    impactDescription: "ICICI ATM — MG Road Metro",
  },
  {
    lat: 12.933,
    lng: 77.625,
    name: "Axis ATM Koramangala",
    type: "atm",
    emoji: "💳",
    status: "operational",
    impactTag: "ATM",
    impactDescription: "Axis Bank ATM — Koramangala",
  },
  {
    lat: 13.022,
    lng: 77.69,
    name: "HDFC ATM Whitefield",
    type: "atm",
    emoji: "💳",
    status: "operational",
    impactTag: "ATM",
    impactDescription: "HDFC ATM — Whitefield ITPL",
  },
  {
    lat: 12.909,
    lng: 77.55,
    name: "Canara ATM JP Nagar",
    type: "atm",
    emoji: "💳",
    status: "operational",
    impactTag: "ATM",
    impactDescription: "Canara Bank ATM — JP Nagar",
  },
  {
    lat: 12.966,
    lng: 77.635,
    name: "Kotak ATM Indiranagar",
    type: "atm",
    emoji: "💳",
    status: "operational",
    impactTag: "ATM",
    impactDescription: "Kotak ATM — 12th Main Indiranagar",
  },
  {
    lat: 12.922,
    lng: 77.6,
    name: "HDFC ATM Jayanagar",
    type: "atm",
    emoji: "💳",
    status: "operational",
    impactTag: "ATM",
    impactDescription: "HDFC ATM — Jayanagar complex",
  },
  {
    lat: 12.991,
    lng: 77.557,
    name: "SBI ATM Vijayanagar",
    type: "atm",
    emoji: "💳",
    status: "operational",
    impactTag: "ATM",
    impactDescription: "SBI ATM — Vijayanagar",
  },
  {
    lat: 13.071,
    lng: 77.644,
    name: "ICICI ATM Thanisandra",
    type: "atm",
    emoji: "💳",
    status: "operational",
    impactTag: "ATM",
    impactDescription: "ICICI ATM — Thanisandra road",
  },
];

// ─── getInfraPins ─────────────────────────────────────────────────────────────

/**
 * Returns pins for infrastructure layer types.
 * For existing types (metro, railway, bus_stop, hospital, school, tech_park),
 * callers should continue using SMART_PINS / getSmartPins for those types.
 * This function provides NEW types: college, mall, airport, highway.
 */
export function getInfraPins(
  layerType: InfraLayerType,
  _locality?: string,
): InfraPin[] {
  let raw: Omit<InfraPin, "id">[] = [];
  switch (layerType) {
    case "college":
      raw = COLLEGES;
      break;
    case "mall":
      raw = MALLS;
      break;
    case "airport":
      raw = AIRPORTS;
      break;
    case "highway":
      raw = HIGHWAYS;
      break;
    // Existing types: callers should use SMART_PINS
    case "metro":
    case "railway":
    case "bus_stop":
    case "hospital":
    case "school":
    case "tech_park":
      return [];
    case "police":
      raw = POLICE_STATIONS;
      break;
    case "petrol_pump":
      raw = PETROL_PUMPS;
      break;
    case "pharmacy":
      raw = PHARMACIES;
      break;
    case "supermarket":
      raw = SUPERMARKETS;
      break;
    case "restaurant":
      raw = RESTAURANTS;
      break;
    case "bank":
      raw = BANKS;
      break;
    case "atm":
      raw = ATMS;
      break;
  }
  return raw.map((p, i) => ({ ...p, id: `${layerType}-${i}` }));
}

// ─── InfraPinResult: unified result for getInfraPinsForLayer ─────────────────

export interface InfraPinResult {
  name: string;
  lat: number;
  lng: number;
  distance: number; // km from reference point
  emoji: string;
}

/**
 * getInfraPinsForLayer — Returns ALL 10 infra types as InfraPinResult[],
 * filtered by distance radius and sorted by distance ascending.
 * Handles metro/railway/bus_stop/hospital/school/tech_park (from SMART_PINS)
 * as well as college/mall/airport/highway (from COLLEGES/MALLS/AIRPORTS/HIGHWAYS).
 */
export function getInfraPinsForLayer(
  layerType: InfraLayerType,
  refLat: number,
  refLng: number,
  radiusKm: number,
): InfraPinResult[] {
  if (!refLat || !refLng) return [];

  const results: InfraPinResult[] = [];

  switch (layerType) {
    case "metro": {
      for (const pin of SMART_PINS.filter((p) => p.type === "metro")) {
        const dist = haversineDistance(refLat, refLng, pin.lat, pin.lng);
        if (dist <= radiusKm)
          results.push({
            name: pin.name,
            lat: pin.lat,
            lng: pin.lng,
            distance: dist,
            emoji: "🚇",
          });
      }
      break;
    }
    case "railway": {
      for (const pin of SMART_PINS.filter((p) => p.type === "railway")) {
        const dist = haversineDistance(refLat, refLng, pin.lat, pin.lng);
        if (dist <= radiusKm)
          results.push({
            name: pin.name,
            lat: pin.lat,
            lng: pin.lng,
            distance: dist,
            emoji: "🚆",
          });
      }
      break;
    }
    case "bus_stop": {
      for (const pin of SMART_PINS.filter((p) => p.type === "bus_stop")) {
        const dist = haversineDistance(refLat, refLng, pin.lat, pin.lng);
        if (dist <= radiusKm)
          results.push({
            name: pin.name,
            lat: pin.lat,
            lng: pin.lng,
            distance: dist,
            emoji: "🚌",
          });
      }
      break;
    }
    case "hospital": {
      for (const pin of SMART_PINS.filter((p) => p.type === "hospital")) {
        const dist = haversineDistance(refLat, refLng, pin.lat, pin.lng);
        if (dist <= radiusKm)
          results.push({
            name: pin.name,
            lat: pin.lat,
            lng: pin.lng,
            distance: dist,
            emoji: "🏥",
          });
      }
      break;
    }
    case "school": {
      for (const pin of SMART_PINS.filter((p) => p.type === "school")) {
        const dist = haversineDistance(refLat, refLng, pin.lat, pin.lng);
        if (dist <= radiusKm)
          results.push({
            name: pin.name,
            lat: pin.lat,
            lng: pin.lng,
            distance: dist,
            emoji: "🏫",
          });
      }
      break;
    }
    case "tech_park": {
      for (const pin of SMART_PINS.filter((p) => p.type === "tech_park")) {
        const dist = haversineDistance(refLat, refLng, pin.lat, pin.lng);
        if (dist <= radiusKm)
          results.push({
            name: pin.name,
            lat: pin.lat,
            lng: pin.lng,
            distance: dist,
            emoji: "💼",
          });
      }
      break;
    }
    case "college": {
      for (const pin of COLLEGES) {
        const dist = haversineDistance(refLat, refLng, pin.lat, pin.lng);
        if (dist <= radiusKm)
          results.push({
            name: pin.name,
            lat: pin.lat,
            lng: pin.lng,
            distance: dist,
            emoji: "🎓",
          });
      }
      break;
    }
    case "mall": {
      for (const pin of MALLS) {
        const dist = haversineDistance(refLat, refLng, pin.lat, pin.lng);
        if (dist <= radiusKm)
          results.push({
            name: pin.name,
            lat: pin.lat,
            lng: pin.lng,
            distance: dist,
            emoji: "🛍️",
          });
      }
      break;
    }
    case "airport": {
      for (const pin of AIRPORTS) {
        const dist = haversineDistance(refLat, refLng, pin.lat, pin.lng);
        if (dist <= radiusKm)
          results.push({
            name: pin.name,
            lat: pin.lat,
            lng: pin.lng,
            distance: dist,
            emoji: "✈️",
          });
      }
      break;
    }
    case "highway": {
      for (const pin of HIGHWAYS) {
        const dist = haversineDistance(refLat, refLng, pin.lat, pin.lng);
        if (dist <= radiusKm)
          results.push({
            name: pin.name,
            lat: pin.lat,
            lng: pin.lng,
            distance: dist,
            emoji: "🛣️",
          });
      }
      break;
    }
    case "police": {
      for (const pin of POLICE_STATIONS) {
        const dist = haversineDistance(refLat, refLng, pin.lat, pin.lng);
        if (dist <= radiusKm)
          results.push({
            name: pin.name,
            lat: pin.lat,
            lng: pin.lng,
            distance: dist,
            emoji: "🚔",
          });
      }
      break;
    }
    case "petrol_pump": {
      for (const pin of PETROL_PUMPS) {
        const dist = haversineDistance(refLat, refLng, pin.lat, pin.lng);
        if (dist <= radiusKm)
          results.push({
            name: pin.name,
            lat: pin.lat,
            lng: pin.lng,
            distance: dist,
            emoji: "⛽",
          });
      }
      break;
    }
    case "pharmacy": {
      for (const pin of PHARMACIES) {
        const dist = haversineDistance(refLat, refLng, pin.lat, pin.lng);
        if (dist <= radiusKm)
          results.push({
            name: pin.name,
            lat: pin.lat,
            lng: pin.lng,
            distance: dist,
            emoji: "💊",
          });
      }
      break;
    }
    case "supermarket": {
      for (const pin of SUPERMARKETS) {
        const dist = haversineDistance(refLat, refLng, pin.lat, pin.lng);
        if (dist <= radiusKm)
          results.push({
            name: pin.name,
            lat: pin.lat,
            lng: pin.lng,
            distance: dist,
            emoji: "🛒",
          });
      }
      break;
    }
    case "restaurant": {
      for (const pin of RESTAURANTS) {
        const dist = haversineDistance(refLat, refLng, pin.lat, pin.lng);
        if (dist <= radiusKm)
          results.push({
            name: pin.name,
            lat: pin.lat,
            lng: pin.lng,
            distance: dist,
            emoji: "🍽️",
          });
      }
      break;
    }
    case "bank": {
      for (const pin of BANKS) {
        const dist = haversineDistance(refLat, refLng, pin.lat, pin.lng);
        if (dist <= radiusKm)
          results.push({
            name: pin.name,
            lat: pin.lat,
            lng: pin.lng,
            distance: dist,
            emoji: "🏦",
          });
      }
      break;
    }
    case "atm": {
      for (const pin of ATMS) {
        const dist = haversineDistance(refLat, refLng, pin.lat, pin.lng);
        if (dist <= radiusKm)
          results.push({
            name: pin.name,
            lat: pin.lat,
            lng: pin.lng,
            distance: dist,
            emoji: "💳",
          });
      }
      break;
    }
  }

  return results.sort((a, b) => a.distance - b.distance);
}

/**
 * Returns dynamic radius in km based on map zoom level.
 * zoom >= 14: 3km, zoom >= 12: 5km, zoom < 12: 10km
 */
export function getInfraRadiusForZoom(zoom: number): number {
  if (zoom >= 14) return 3;
  if (zoom >= 12) return 5;
  return 10;
}

// ─── getHeatmapConfig ─────────────────────────────────────────────────────────

export function getHeatmapConfig(level: LevelType): HeatmapConfig {
  switch (level) {
    case "smart":
      return {
        gradient: { 0.2: "#3B82F6", 0.5: "#6366F1", 1.0: "#8B5CF6" },
        minOpacity: 0.3,
        maxZoom: 18,
        radius: 25,
      };
    case "premium":
      return {
        gradient: { 0.2: "#B45309", 0.5: "#D97706", 1.0: "#D8B56A" },
        minOpacity: 0.3,
        maxZoom: 18,
        radius: 25,
      };
    case "growth":
      return {
        gradient: { 0.2: "#059669", 0.5: "#10B981", 1.0: "#34D399" },
        minOpacity: 0.3,
        maxZoom: 18,
        radius: 25,
      };
    case "investment":
      return {
        gradient: { 0.2: "#7C3AED", 0.5: "#8B5CF6", 1.0: "#A78BFA" },
        minOpacity: 0.3,
        maxZoom: 18,
        radius: 25,
      };
  }
}

// ─── Smart Pins: employee counts for tech parks ───────────────────────────────

const TECH_PARK_EMPLOYEES: Record<string, number> = {
  "Manyata Tech Park": 180000,
  "Embassy Manyata Business Park": 90000,
  ITPL: 120000,
  "Whitefield Tech Corridor": 95000,
  "RMZ Ecoworld": 75000,
  "Embassy Tech Village": 70000,
  "Prestige Tech Park": 65000,
  "Bagmane Tech Park": 55000,
  "Bagmane Constellation": 40000,
  "Electronic City Phase 1": 100000,
  "Electronic City Phase 2": 80000,
  "Infosys Campus": 60000,
  "Wipro Campus": 55000,
  "Outer Ring Road Tech Corridor": 150000,
  "Karle Town Centre": 35000,
  "Kirloskar Tech Park": 42000,
  "RMZ Latitude": 38000,
  "KIADB Aerospace SEZ": 25000,
  "Devanahalli Business Park": 18000,
  "IBC Knowledge Park": 30000,
  "Global Tech Park": 28000,
  "Global Village Tech Park": 22000,
  "Sarjapur Road IT Corridor": 85000,
  "Velankani Tech Park": 32000,
  "Kalyani Magnum Tech Park": 25000,
  "Prestige Tech Cloud": 30000,
  "KIADB Aerospace Park": 20000,
  "Airport IT Corridor": 15000,
  "Shell Technology Centre": 12000,
  "Divyasree Technopolis": 28000,
  "RGA Tech Park": 22000,
  "UB City Business District": 20000,
};

// ─── Build all SMART_PINS with priority ordering ──────────────────────────────

export const SMART_PINS: SmartPin[] = [
  // Phase 1 — HIGH priority (render on top)
  ...TECH_PARKS.map((tp, i) => ({
    id: `techpark-${i}`,
    type: "tech_park" as const,
    priority: "high" as const,
    name: tp.name,
    lat: tp.lat,
    lng: tp.lng,
    emoji: "🏢",
    employees: TECH_PARK_EMPLOYEES[tp.name] ?? Math.round(tp.weight * 25000),
    impactTag: "High rental driver",
    impactDescription: "Drives rental demand ↑",
  })),
  ...METROS.map((m, i) => ({
    id: `metro-${i}`,
    type: "metro" as const,
    priority: "high" as const,
    name: m.name,
    lat: m.lat,
    lng: m.lng,
    emoji: "🚇",
    line: m.line,
    impactTag: "Connectivity boost",
    impactDescription: "Metro access improves property value",
  })),

  // Phase 2 — MEDIUM priority
  ...BUS_STOPS.map((b, i) => ({
    ...b,
    id: `bus-${i}`,
    priority: "medium" as const,
  })),
  ...RAILWAY_STATIONS.map((r, i) => ({
    ...r,
    id: `rail-${i}`,
    priority: "medium" as const,
  })),

  // Phase 3 — LOW priority
  ...HOSPITALS.map((h, i) => ({
    ...h,
    id: `hospital-${i}`,
    priority: "low" as const,
  })),
  ...SCHOOLS.map((s, i) => ({
    ...s,
    id: `school-${i}`,
    priority: "low" as const,
  })),
];

/**
 * Returns smart pins within radiusKm, sorted by priority (HIGH → MEDIUM → LOW).
 */
export function getSmartPins(
  lat: number,
  lng: number,
  radiusKm = 20,
): SmartPin[] {
  const priorityOrder: Record<SmartPinPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  const filtered =
    !lat || !lng
      ? SMART_PINS
      : SMART_PINS.filter(
          (pin) => haversineDistance(lat, lng, pin.lat, pin.lng) <= radiusKm,
        );
  return [...filtered].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  );
}

// ─── Layer Metadata ─────────────────────────────────────────────────────────────

export function getAvailableLayers(scope: MapLayerScope): MapLayerType[] {
  if (scope === "basic") return ["price_heatmap", "rental_yield"];
  return [
    "price_heatmap",
    "rental_yield",
    "growth_zones",
    "metro_connectivity",
    "future_infra",
    "poi_density",
  ];
}

export function getLayerLabel(layer: MapLayerType): string {
  switch (layer) {
    case "price_heatmap":
      return "Price Heatmap";
    case "rental_yield":
      return "Rental Yield";
    case "growth_zones":
      return "Growth Zones";
    case "metro_connectivity":
      return "Metro Connectivity";
    case "future_infra":
      return "Future Infra";
    case "poi_density":
      return "POI Density";
  }
}

export function getLayerIcon(layer: MapLayerType): string {
  switch (layer) {
    case "price_heatmap":
      return "🔥";
    case "rental_yield":
      return "💰";
    case "growth_zones":
      return "📈";
    case "metro_connectivity":
      return "🚇";
    case "future_infra":
      return "🏗️";
    case "poi_density":
      return "📍";
  }
}
