// northBangaloreEngine.ts — North Bangalore data-driven learning layer
//
// Purpose:
//   Enhance ML training, comparable selection, and adjustment learning
//   specifically for North Bangalore micro-markets. Does NOT change the
//   3-layer AVM architecture, model types, blending logic, or stored flow.
//
// Requirements addressed:
//   1. North Bangalore micro-markets treated independently (no merging)
//   2. distanceToAirport as learned ML feature (no hardcoded ₹/sqft premiums)
//   3. Adaptive recency weighting for burst markets (e.g. Devanahalli)
//   4. Comparable prioritization: same project > same builder within 3km > micro-location
//   5. Learned adjustments: floor, facing, gated community, high-rise, plot corner
//   6. Confidence weighting based on project-level data availability
//   7. DS-MAX Sky series: categorical variable, no hardcoded +15%
//   8. Plot-only model for plot-heavy micro-markets
//
// Training data imported from northBangaloreTrainingData.ts — do NOT embed data here.

import { ALL_LOCALITY_COORDS } from "../data/localityCoords";
import {
  northBangaloreApartments,
  northBangaloreCommercial,
  northBangalorePlots,
  northBangaloreVillas,
} from "../data/northBangaloreTrainingData";
import {
  type NorthWestRecord,
  allNorthWestData,
  getNorthWestDataByLocality,
  getNorthWestDataByType,
  getPSFNorthWest,
  intelligenceConfig,
} from "../data/northWestBangaloreTrainingData";

export type { TrainingRecord } from "../data/northBangaloreTrainingData";
export {
  northBangaloreApartments,
  northBangaloreVillas,
  northBangalorePlots,
  northBangaloreCommercial,
};
export {
  allNorthWestData,
  getNorthWestDataByLocality,
  getNorthWestDataByType,
  getPSFNorthWest,
  intelligenceConfig,
};
export type { NorthWestRecord };

// ─── Type alias for TrainingRecord ─────────────────────────────────────────────────────
import type { TrainingRecord } from "../data/northBangaloreTrainingData";

// ─── North Bangalore Micro-Market Registry ─────────────────────────────────────────────

export interface NorthMicroMarket {
  name: string;
  aliases: string[];
  lat: number;
  lng: number;
  distanceToAirportKm: number;
}

// ─── North-West Bangalore Micro-Markets ────────────────────────────────────────────────
// These localities belong to the North-West corridor (Nagasandra/BEL/Sahakarnagar belt).
// They are covered by allNorthWestData in northWestBangaloreTrainingData.
// isNorthBangalore() is extended to include them so getAveragePSF() routes them correctly.

export const NORTH_WEST_BANGALORE_MICRO_MARKETS: NorthMicroMarket[] = [
  {
    name: "Nagasandra",
    aliases: ["nagasandra"],
    lat: 13.0319,
    lng: 77.5167,
    distanceToAirportKm: 28.5,
  },
  {
    name: "Devinagar",
    aliases: ["devinagar"],
    lat: 13.04,
    lng: 77.544,
    distanceToAirportKm: 27.1,
  },
  {
    name: "Chikkabidarakallu",
    aliases: ["chikkabidarakallu"],
    lat: 13.043,
    lng: 77.503,
    distanceToAirportKm: 29.8,
  },
  {
    name: "Lottegollahalli",
    aliases: ["lottegollahalli"],
    lat: 13.049,
    lng: 77.541,
    distanceToAirportKm: 27.4,
  },
  {
    name: "Judicial Layout",
    aliases: ["judicial layout"],
    lat: 13.028,
    lng: 77.537,
    distanceToAirportKm: 29.2,
  },
  {
    name: "Tindlu",
    aliases: ["tindlu"],
    lat: 13.053,
    lng: 77.559,
    distanceToAirportKm: 26.8,
  },
  {
    name: "Doddabommasandra",
    aliases: ["doddabommasandra", "doddabomma"],
    lat: 13.0645,
    lng: 77.5783,
    distanceToAirportKm: 25.2,
  },
  {
    name: "Chikkabettahalli",
    aliases: ["chikkabettahalli"],
    lat: 13.028,
    lng: 77.506,
    distanceToAirportKm: 29.6,
  },
  {
    name: "Abbigere",
    aliases: ["abbigere"],
    lat: 13.043,
    lng: 77.494,
    distanceToAirportKm: 30.1,
  },
  {
    name: "Singapura",
    aliases: ["singapura"],
    lat: 13.055,
    lng: 77.512,
    distanceToAirportKm: 29.3,
  },
  {
    name: "Sahakarnagar",
    aliases: ["sahakarnagar", "sahakar nagar"],
    lat: 13.0595,
    lng: 77.588,
    distanceToAirportKm: 24.6,
  },
  {
    name: "Jalahalli",
    aliases: [
      "jalahalli",
      "jalahalli east",
      "jalahalli west",
      "jalahalli cross",
    ],
    lat: 13.0516,
    lng: 77.5348,
    distanceToAirportKm: 28.2,
  },
  {
    name: "BEL Road",
    aliases: ["bel road", "bel main road", "bel main rd"],
    lat: 13.04,
    lng: 77.545,
    distanceToAirportKm: 27.0,
  },
  {
    name: "BEL Layout",
    aliases: ["bel layout"],
    lat: 13.038,
    lng: 77.55,
    distanceToAirportKm: 27.3,
  },
  {
    name: "Jalahalli West",
    aliases: ["jalahalli west", "hmt estate"],
    lat: 13.0516,
    lng: 77.52,
    distanceToAirportKm: 28.5,
  },
];

// Combined registry: North Bangalore + North-West Bangalore
export const NORTH_BANGALORE_MICRO_MARKETS: NorthMicroMarket[] = [
  {
    name: "Hebbal",
    aliases: ["hebbal"],
    lat: 13.0488,
    lng: 77.5877,
    distanceToAirportKm: 21.4,
  },
  {
    name: "Jakkur",
    aliases: ["jakkur"],
    lat: 13.0756,
    lng: 77.5845,
    distanceToAirportKm: 18.2,
  },
  {
    name: "Thanisandra",
    aliases: ["thanisandra", "thanisandra main road", "thanisandra road"],
    lat: 13.0601,
    lng: 77.6368,
    distanceToAirportKm: 22.5,
  },
  {
    name: "Hennur",
    aliases: ["hennur", "hennur road", "hennur main road", "hennur cross"],
    lat: 13.0612,
    lng: 77.6468,
    distanceToAirportKm: 23.1,
  },
  {
    name: "Bagalur",
    aliases: ["bagalur", "bagaluru"],
    lat: 13.1342,
    lng: 77.6883,
    distanceToAirportKm: 10.4,
  },
  {
    name: "Yelahanka New Town",
    aliases: ["yelahanka new town", "yelahanka nt", "yelahanka newtown"],
    lat: 13.1008,
    lng: 77.5953,
    distanceToAirportKm: 14.3,
  },
  {
    name: "Yelahanka Satellite Town",
    aliases: [
      "yelahanka satellite town",
      "yelahanka satellite",
      "yelahanka old town",
      "yelahanka",
    ],
    lat: 13.1006,
    lng: 77.5935,
    distanceToAirportKm: 14.5,
  },
  {
    name: "Devanahalli Town",
    aliases: ["devanahalli", "devanahalli town", "devanhalli"],
    lat: 13.2466,
    lng: 77.7179,
    distanceToAirportKm: 3.8,
  },
  {
    name: "Airport Road",
    aliases: [
      "airport road",
      "nh44",
      "nh 44",
      "bellary road",
      "airport corridor",
    ],
    lat: 13.1705,
    lng: 77.6505,
    distanceToAirportKm: 8.5,
  },
  {
    name: "Rajankunte",
    aliases: ["rajankunte", "rajanukunte"],
    lat: 13.1396,
    lng: 77.5944,
    distanceToAirportKm: 13.2,
  },
  {
    name: "Kogilu",
    aliases: ["kogilu", "kogilu cross"],
    lat: 13.0891,
    lng: 77.6076,
    distanceToAirportKm: 16.8,
  },
  {
    name: "Vidyaranyapura",
    aliases: ["vidyaranyapura", "vidyaranyapur"],
    lat: 13.0652,
    lng: 77.5579,
    distanceToAirportKm: 21.9,
  },
  // ── North-West Extension & Cluster localities (Nagasandra/BEL/Sahakarnagar belt) ──
  ...NORTH_WEST_BANGALORE_MICRO_MARKETS,
];

// KIAL coordinates
const AIRPORT_LAT = 13.1979;
const AIRPORT_LNG = 77.7063;

// ─── North Bangalore Detection ──────────────────────────────────────────────────────────

export function isNorthBangalore(locality: string): boolean {
  const key = locality.toLowerCase().trim();
  return NORTH_BANGALORE_MICRO_MARKETS.some(
    (m) =>
      m.name.toLowerCase() === key ||
      m.aliases.some((a) => a === key || key.includes(a) || a.includes(key)),
  );
}

export function getNorthMicroMarket(locality: string): NorthMicroMarket | null {
  const key = locality.toLowerCase().trim();
  return (
    NORTH_BANGALORE_MICRO_MARKETS.find(
      (m) =>
        m.name.toLowerCase() === key ||
        m.aliases.some((a) => a === key || key.includes(a) || a.includes(key)),
    ) ?? null
  );
}

// ─── Airport Distance Features ─────────────────────────────────────────────────────────

export interface AirportDistanceFeatures {
  distanceToAirportKm: number;
  distanceToAirportSq: number;
  logDistanceToAirport: number;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function computeAirportDistanceFeatures(
  lat: number,
  lng: number,
): AirportDistanceFeatures {
  const d = haversineKm(lat, lng, AIRPORT_LAT, AIRPORT_LNG);
  return {
    distanceToAirportKm: d,
    distanceToAirportSq: d * d,
    logDistanceToAirport: Math.log(Math.max(d, 0.1)),
  };
}

export function getAirportDistanceForLocality(
  locality: string,
): AirportDistanceFeatures {
  const market = getNorthMicroMarket(locality);
  if (market) return computeAirportDistanceFeatures(market.lat, market.lng);
  return {
    distanceToAirportKm: 30,
    distanceToAirportSq: 900,
    logDistanceToAirport: Math.log(30),
  };
}

// ─── Adaptive Recency Weighting ─────────────────────────────────────────────────────────
// If locality transaction velocity increases, recency weight increases automatically.
// This is fully data-driven — no hardcoded "burst market" rules.

export interface TransactionVelocityMetrics {
  recentVelocity: number;
  baselineVelocity: number;
  velocityRatio: number;
  isBurstMarket: boolean;
  adaptiveDecayHalfLife: number;
}

export function computeAdaptiveRecencyWeight(
  timestamp: number | undefined,
  velocityMetrics: TransactionVelocityMetrics,
): number {
  if (!timestamp) return Math.exp(-velocityMetrics.adaptiveDecayHalfLife / 12);
  const ageMonths = (Date.now() - timestamp) / (1000 * 60 * 60 * 24 * 30.44);
  return Math.exp(
    -Math.max(ageMonths, 0) / velocityMetrics.adaptiveDecayHalfLife,
  );
}

export function computeTransactionVelocity(
  locality: string,
  allRecords: Array<{ locality: string; timestamp?: number }>,
): TransactionVelocityMetrics {
  const localityKey = locality.toLowerCase().trim();
  const localRecords = allRecords.filter((r) => {
    const rk = r.locality.toLowerCase().trim();
    return (
      rk === localityKey || rk.includes(localityKey) || localityKey.includes(rk)
    );
  });
  const now = Date.now();
  const sixMonthsAgo = now - 6 * 30.44 * 24 * 60 * 60 * 1000;
  const twelveMonthsAgo = now - 12 * 30.44 * 24 * 60 * 60 * 1000;
  const recentCount = localRecords.filter(
    (r) => r.timestamp && r.timestamp >= sixMonthsAgo,
  ).length;
  const baselineCount = localRecords.filter(
    (r) =>
      r.timestamp &&
      r.timestamp >= twelveMonthsAgo &&
      r.timestamp < sixMonthsAgo,
  ).length;
  const recentVelocity = recentCount / 6;
  const baselineVelocity = baselineCount / 6 || recentVelocity || 1;
  const velocityRatio = recentVelocity / baselineVelocity;
  const isBurstMarket = velocityRatio >= 1.5;
  const adaptiveDecayHalfLife = isBurstMarket
    ? Math.max(6, 12 / velocityRatio)
    : 12;
  return {
    recentVelocity,
    baselineVelocity,
    velocityRatio,
    isBurstMarket,
    adaptiveDecayHalfLife,
  };
}

// ─── North Bangalore Comparable Prioritization ─────────────────────────────────────────

export function getNorthBangaloreComparablePriority(
  record: {
    locality: string;
    builder?: string;
    project?: string;
    lat?: number;
    lng?: number;
  },
  targetProject: string | undefined,
  targetBuilder: string | undefined,
  targetLocality: string,
  targetLat: number,
  targetLng: number,
): "same_project" | "same_builder_3km" | "same_micro_location" | "none" {
  const fuzzy = (a: string, b: string) => {
    const ak = a.toLowerCase().trim();
    const bk = b.toLowerCase().trim();
    return ak.includes(bk) || bk.includes(ak);
  };

  if (
    targetProject?.trim() &&
    record.project &&
    fuzzy(record.project, targetProject)
  )
    return "same_project";

  if (
    targetBuilder?.trim() &&
    record.builder &&
    fuzzy(record.builder, targetBuilder)
  ) {
    let dist = 999;
    if (record.lat && record.lng) {
      dist = haversineKm(record.lat, record.lng, targetLat, targetLng);
    } else {
      const market = getNorthMicroMarket(record.locality);
      if (market)
        dist = haversineKm(market.lat, market.lng, targetLat, targetLng);
    }
    if (dist <= 3.0) return "same_builder_3km";
  }

  const recordMicro = getNorthMicroMarket(record.locality);
  const targetMicro = getNorthMicroMarket(targetLocality);
  if (recordMicro && targetMicro && recordMicro.name === targetMicro.name)
    return "same_micro_location";

  return "none";
}

// ─── Learned Adjustments for North Bangalore ───────────────────────────────────────────

interface SaleRecordFull {
  locality: string;
  type: string;
  sqft: number;
  soldPrice: number;
  builder?: string;
  project?: string;
  timestamp?: number;
  facing?: string;
  floorNumber?: number;
  isTopFloor?: boolean;
  totalFloors?: number;
  amenityCount?: number;
  lat?: number;
  lng?: number;
  propertyAge?: number;
  isGatedCommunity?: boolean;
  roadWidth?: number;
  isCornerPlot?: boolean;
}

function getNBRecords(all: SaleRecordFull[]): SaleRecordFull[] {
  return all.filter((r) => isNorthBangalore(r.locality));
}

export function computeNorthBangaloreFloorPremium(
  floor: number | undefined,
  isTopFloor: boolean | undefined,
  _totalFloors: number | undefined,
  locality: string,
  propertyType: string,
  allRecords: SaleRecordFull[],
): number {
  if (floor === undefined && !isTopFloor) return 1.0;
  const typePrefix = propertyType.toLowerCase().substring(0, 4);
  const nbRecs = getNBRecords(allRecords).filter(
    (r) =>
      r.floorNumber !== undefined && r.type.toLowerCase().includes(typePrefix),
  );
  const useRecords =
    nbRecs.length >= 8
      ? nbRecs
      : allRecords.filter((r) => {
          const rk = r.locality.toLowerCase().trim();
          const lk = locality.toLowerCase().trim();
          return (
            (rk === lk || rk.includes(lk) || lk.includes(rk)) &&
            r.floorNumber !== undefined &&
            r.type.toLowerCase().includes(typePrefix)
          );
        });

  const allPSF = useRecords.map((r) => r.soldPrice / r.sqft);
  if (allPSF.length < 4) {
    if (isTopFloor) return 1.03;
    if (floor === undefined) return 1.0;
    if (floor === 0) return 0.95;
    if (floor <= 2) return 0.98;
    if (floor <= 5) return 1.0;
    if (floor <= 10) return 1.02;
    if (floor <= 15) return 1.04;
    return 1.06;
  }
  const sorted = [...allPSF].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  if (median === 0) return 1.0;

  let groupRecs: SaleRecordFull[] = [];
  if (isTopFloor) {
    groupRecs = useRecords.filter((r) => r.isTopFloor === true);
    if (groupRecs.length < 2) return 1.03;
  } else if (floor !== undefined) {
    groupRecs = useRecords.filter((r) => {
      const f = r.floorNumber!;
      if (floor === 0) return f === 0;
      if (floor <= 2) return f >= 1 && f <= 2;
      if (floor <= 5) return f >= 3 && f <= 5;
      if (floor <= 10) return f >= 6 && f <= 10;
      if (floor <= 15) return f >= 11 && f <= 15;
      return f > 15;
    });
    if (groupRecs.length < 2) {
      if (floor === 0) return 0.95;
      if (floor <= 2) return 0.98;
      if (floor <= 5) return 1.0;
      if (floor <= 10) return 1.02;
      if (floor <= 15) return 1.04;
      return 1.06;
    }
  }
  const groupAvg =
    groupRecs.reduce((s, r) => s + r.soldPrice / r.sqft, 0) / groupRecs.length;
  return Math.min(Math.max(groupAvg / median, 0.88), 1.12);
}

export function computeNorthBangaloreFacingPremium(
  facing: string | undefined,
  _locality: string,
  propertyType: string,
  allRecords: SaleRecordFull[],
): number {
  if (!facing) return 1.0;
  const pt = propertyType.toLowerCase();
  if (!pt.includes("apart") && !pt.includes("flat") && !pt.includes("studio"))
    return 1.0;
  const nbRecs = getNBRecords(allRecords).filter(
    (r) => r.facing && r.type.toLowerCase().includes("apart"),
  );
  if (nbRecs.length < 4) {
    const f = facing.toLowerCase();
    if (f.includes("east") || f.includes("north east") || f.includes("north"))
      return 1.04;
    if (f.includes("corner")) return 1.03;
    if (f.includes("south") || f.includes("west")) return 0.98;
    return 1.0;
  }
  const tk = facing.toLowerCase();
  const tgt = nbRecs.filter(
    (r) =>
      r.facing!.toLowerCase().includes(tk) ||
      tk.includes(r.facing!.toLowerCase()),
  );
  const oth = nbRecs.filter(
    (r) =>
      !(
        r.facing!.toLowerCase().includes(tk) ||
        tk.includes(r.facing!.toLowerCase())
      ),
  );
  if (tgt.length < 2 || oth.length < 2) {
    const f = facing.toLowerCase();
    if (f.includes("east") || f.includes("north east") || f.includes("north"))
      return 1.04;
    if (f.includes("corner")) return 1.03;
    if (f.includes("south") || f.includes("west")) return 0.98;
    return 1.0;
  }
  const avgTgt = tgt.reduce((s, r) => s + r.soldPrice / r.sqft, 0) / tgt.length;
  const avgOth = oth.reduce((s, r) => s + r.soldPrice / r.sqft, 0) / oth.length;
  if (avgOth === 0) return 1.0;
  return Math.min(Math.max(avgTgt / avgOth, 0.85), 1.15);
}

export function computeNorthBangaloreGatedPremium(
  isGated: boolean | undefined,
  propertyType: string,
  allRecords: SaleRecordFull[],
): number {
  if (!isGated) return 1.0;
  const pt = propertyType.toLowerCase();
  if (!pt.includes("villa") && !pt.includes("house") && !pt.includes("row"))
    return 1.0;
  const nbVillas = getNBRecords(allRecords).filter(
    (r) =>
      r.type.toLowerCase().includes("villa") ||
      r.type.toLowerCase().includes("house") ||
      r.type.toLowerCase().includes("row"),
  );
  const gated = nbVillas.filter((r) => r.isGatedCommunity === true);
  const nonGated = nbVillas.filter((r) => r.isGatedCommunity === false);
  if (gated.length < 2 || nonGated.length < 2) return 1.08;
  const avgG =
    gated.reduce((s, r) => s + r.soldPrice / r.sqft, 0) / gated.length;
  const avgN =
    nonGated.reduce((s, r) => s + r.soldPrice / r.sqft, 0) / nonGated.length;
  if (avgN === 0) return 1.08;
  return Math.min(Math.max(avgG / avgN, 1.0), 1.2);
}

export function computeNorthBangaloreHighRisePremium(
  floor: number | undefined,
  totalFloors: number | undefined,
  allRecords: SaleRecordFull[],
): number {
  if (!floor || !totalFloors || totalFloors < 20 || floor < 15) return 1.0;
  const nbHR = getNBRecords(allRecords).filter(
    (r) =>
      r.totalFloors !== undefined &&
      r.totalFloors >= 20 &&
      r.floorNumber !== undefined &&
      r.type.toLowerCase().includes("apart"),
  );
  const hi = nbHR.filter((r) => r.floorNumber! >= 15);
  const lo = nbHR.filter((r) => r.floorNumber! < 15);
  if (hi.length < 2 || lo.length < 2) return 1.05;
  const avgHi = hi.reduce((s, r) => s + r.soldPrice / r.sqft, 0) / hi.length;
  const avgLo = lo.reduce((s, r) => s + r.soldPrice / r.sqft, 0) / lo.length;
  if (avgLo === 0) return 1.05;
  return Math.min(Math.max(avgHi / avgLo, 1.0), 1.15);
}

export function computeNorthBangalorePlotCornerPremium(
  isCornerPlot: boolean | undefined,
  _locality: string,
  allRecords: SaleRecordFull[],
): number {
  if (!isCornerPlot) return 1.0;
  const nbPlots = getNBRecords(allRecords).filter(
    (r) =>
      r.type.toLowerCase().includes("plot") ||
      r.type.toLowerCase().includes("land"),
  );
  const corner = nbPlots.filter((r) => r.isCornerPlot === true);
  const nonCorner = nbPlots.filter((r) => r.isCornerPlot === false);
  if (corner.length < 2 || nonCorner.length < 2) return 1.07;
  const avgC =
    corner.reduce((s, r) => s + r.soldPrice / r.sqft, 0) / corner.length;
  const avgN =
    nonCorner.reduce((s, r) => s + r.soldPrice / r.sqft, 0) / nonCorner.length;
  if (avgN === 0) return 1.07;
  return Math.min(Math.max(avgC / avgN, 1.0), 1.2);
}

// ─── Airport Distance Learned Factor ───────────────────────────────────────────────────

export function computeLearnedAirportDistanceFactor(
  distanceFeatures: AirportDistanceFeatures,
  allRecords: SaleRecordFull[],
  propertyType: string,
): number {
  const typePrefix = propertyType.toLowerCase().substring(0, 4);
  const nbRecs = getNBRecords(allRecords).filter((r) =>
    r.type.toLowerCase().includes(typePrefix),
  );
  if (nbRecs.length < 10) return 1.0;
  const enriched = nbRecs
    .map((r) => {
      const m = getNorthMicroMarket(r.locality);
      return m
        ? { dist: m.distanceToAirportKm, psf: r.soldPrice / r.sqft }
        : null;
    })
    .filter((x): x is { dist: number; psf: number } => x !== null);
  if (enriched.length < 8) return 1.0;
  const close = enriched.filter((x) => x.dist < 8);
  const mid = enriched.filter((x) => x.dist >= 8 && x.dist < 16);
  const far = enriched.filter((x) => x.dist >= 16);
  if (close.length < 2 || far.length < 2) return 1.0;
  const avgClose = close.reduce((s, x) => s + x.psf, 0) / close.length;
  const avgFar = far.reduce((s, x) => s + x.psf, 0) / far.length;
  const avgMid =
    mid.length >= 2
      ? mid.reduce((s, x) => s + x.psf, 0) / mid.length
      : (avgClose + avgFar) / 2;
  const d = distanceFeatures.distanceToAirportKm;
  let factor = 1.0;
  if (d < 8) factor = avgFar > 0 ? avgClose / avgFar : 1.0;
  else if (d < 16) factor = avgFar > 0 ? avgMid / avgFar : 1.0;
  return Math.min(Math.max(factor, 0.8), 1.2);
}

// ─── North Bangalore Confidence Weights ────────────────────────────────────────────────

export interface NorthBangaloreWeights {
  w_ml: number;
  w_comp: number;
  w_adj: number;
}

export function getNorthBangaloreWeights(
  locality: string,
  projectCompCount: number,
  compSource: "Project" | "Builder" | "Locality" | "Global",
  compPrice: number | null,
): NorthBangaloreWeights | null {
  if (!isNorthBangalore(locality)) return null;
  if (compPrice && projectCompCount >= 3)
    return { w_ml: 0.15, w_comp: 0.65, w_adj: 0.2 };
  if (compPrice && compSource === "Builder")
    return { w_ml: 0.4, w_comp: 0.4, w_adj: 0.2 };
  if (compPrice && compSource === "Locality")
    return { w_ml: 0.55, w_comp: 0.25, w_adj: 0.2 };
  if (!compPrice) return { w_ml: 0.75, w_comp: 0.0, w_adj: 0.25 };
  return null;
}

// ─── DS-MAX Sky Series Categorical Treatment ───────────────────────────────────────────
// Treats builder+project as categorical variables. No hardcoded premiums.

export function isDSMaxSkySeries(
  builder: string | undefined,
  project: string | undefined,
): boolean {
  if (!builder) return false;
  const b = builder.toLowerCase();
  const p = project?.toLowerCase() ?? "";
  return (
    (b.includes("ds-max") || b.includes("dsmax") || b.includes("ds max")) &&
    p.includes("sky")
  );
}

export function getBuilderProjectCategoryKey(
  builder: string | undefined,
  project: string | undefined,
): string {
  if (!builder) return "unknown";
  const b = builder.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const p = project
    ? project.toLowerCase().replace(/[^a-z0-9]/g, "_")
    : "unknown";
  return `${b}__${p}`;
}

// ─── Plot-Heavy Markets ─────────────────────────────────────────────────────────────────

export const PLOT_HEAVY_NORTH_MARKETS = new Set([
  "devanahalli town",
  "devanahalli",
  "bagalur",
  "bagaluru",
  "hessarghatta",
  "marasandra",
  "rajankunte",
  "airport road",
]);

export function isPlotHeavyNorthMarket(locality: string): boolean {
  return PLOT_HEAVY_NORTH_MARKETS.has(locality.toLowerCase().trim());
}

// ─── Full Adjustment Result ─────────────────────────────────────────────────────────────

export interface NorthBangaloreAdjustmentResult {
  floorFactor: number;
  facingFactor: number;
  gatedFactor: number;
  highRiseFactor: number;
  cornerPlotFactor: number;
  airportDistanceFactor: number;
  combinedFactor: number;
}

export function computeNorthBangaloreAdjustments(
  params: {
    locality: string;
    propertyType: string;
    floorNumber?: number;
    isTopFloor?: boolean;
    totalFloors?: number;
    facing?: string;
    isGatedCommunity?: boolean;
    isCornerPlot?: boolean;
    lat: number;
    lng: number;
  },
  allRecords: SaleRecordFull[],
): NorthBangaloreAdjustmentResult | null {
  if (!isNorthBangalore(params.locality)) return null;
  const airportFeatures = computeAirportDistanceFeatures(
    params.lat,
    params.lng,
  );
  const floorFactor = computeNorthBangaloreFloorPremium(
    params.floorNumber,
    params.isTopFloor,
    params.totalFloors,
    params.locality,
    params.propertyType,
    allRecords,
  );
  const facingFactor = computeNorthBangaloreFacingPremium(
    params.facing,
    params.locality,
    params.propertyType,
    allRecords,
  );
  const gatedFactor = computeNorthBangaloreGatedPremium(
    params.isGatedCommunity,
    params.propertyType,
    allRecords,
  );
  const highRiseFactor = computeNorthBangaloreHighRisePremium(
    params.floorNumber,
    params.totalFloors,
    allRecords,
  );
  const cornerPlotFactor = computeNorthBangalorePlotCornerPremium(
    params.isCornerPlot,
    params.locality,
    allRecords,
  );
  const airportDistanceFactor = computeLearnedAirportDistanceFactor(
    airportFeatures,
    allRecords,
    params.propertyType,
  );
  const pt = params.propertyType.toLowerCase();
  let combinedFactor = 1.0;
  if (pt.includes("plot") || pt.includes("land")) {
    combinedFactor = cornerPlotFactor * airportDistanceFactor;
  } else if (
    pt.includes("villa") ||
    pt.includes("house") ||
    pt.includes("row")
  ) {
    combinedFactor = gatedFactor * airportDistanceFactor;
  } else {
    combinedFactor =
      floorFactor * facingFactor * highRiseFactor * airportDistanceFactor;
  }
  combinedFactor = Math.min(Math.max(combinedFactor, 0.75), 1.25);
  return {
    floorFactor,
    facingFactor,
    gatedFactor,
    highRiseFactor,
    cornerPlotFactor,
    airportDistanceFactor,
    combinedFactor,
  };
}

// ─── AI Training Strategy Multipliers (exported constants, NOT hardcoded prices)
export const AI_TRAINING_FACTORS = {
  /** 15% premium for RTMI / ready-to-move over under-construction */
  rtmiPremiumFactor: 1.15,
  /** ₹150 PSF per floor above the 10th floor */
  floorRiseWeightPerFloor: 150,
  /** Weight multiplier for towers 30+ floors */
  highRiseTowerWeight: 1.4,
  /** Normalise carpet-area PSF → SBA PSF */
  carpetToSBAFactor: 0.71,
  /** BDA plots in Yelahanka NT vs newer layouts */
  matureInfraFactor: 1.4,
  /** Residential within 1 km of Manyata Tech Park */
  techParkProximityWeight: 1.15,
  /** Plots within 500 m of a state highway */
  highwayVisibilityPremium: 1.15,
  /** Grade-A builder = 1.0 baseline */
  gradeABuilderAnchor: 1.0,
  /** Grade-B builder = −20% vs Grade-A */
  gradeBOffset: 0.8,
  /** Commercial PSF = 1.8× residential for BDA-approved commercial sites */
  commercialToResidentialRatio: 1.8,
  /** Retail in tech-park residency zones (Manyata) = 2.1× residential PSF */
  manyataRetailMultiplier: 2.1,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// NEW FEATURE FUNCTIONS — Sale AI Learned Features
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Helper: get locality coords from data file ─────────────────────────────────────────
function getLocalityCoordsForRecord(
  localityName: string,
): { lat: number; lng: number } | null {
  const key = localityName.toLowerCase().trim();
  if (ALL_LOCALITY_COORDS[key]) return ALL_LOCALITY_COORDS[key];
  for (const [k, v] of Object.entries(ALL_LOCALITY_COORDS)) {
    if (k.includes(key) || key.includes(k)) return v;
  }
  const market = getNorthMicroMarket(localityName);
  if (market) return { lat: market.lat, lng: market.lng };
  return null;
}

// ─── A) MICRO-ZONE CALCULATION (3-5km radius) ────────────────────────────────────────────

/**
 * Returns training records within 5km (or 8km fallback) of the target locality.
 * If fewer than 5 records within 3km, expands to 8km, then to all records if still thin.
 */
export function getMicroZoneRecords(
  locality: string,
  propertyType: string,
  allRecords: TrainingRecord[],
  localityCoords: Record<string, { lat: number; lng: number }>,
): TrainingRecord[] {
  const typeKey = propertyType.toLowerCase();
  const relevantRecords = allRecords.filter((r) => {
    const rt = r.propertyType.toLowerCase();
    if (typeKey.includes("plot") || typeKey.includes("land"))
      return rt === "plot";
    if (typeKey.includes("villa") || typeKey.includes("house"))
      return rt === "villa";
    if (typeKey.includes("commercial")) return rt === "commercial";
    return rt === "apartment";
  });

  // Resolve target coords
  const localityKey = locality.toLowerCase().trim();
  let targetCoords: { lat: number; lng: number } | null =
    localityCoords[localityKey] ?? null;
  if (!targetCoords) {
    for (const [k, v] of Object.entries(localityCoords)) {
      if (k.includes(localityKey) || localityKey.includes(k)) {
        targetCoords = v;
        break;
      }
    }
  }
  if (!targetCoords) {
    const market = getNorthMicroMarket(locality);
    if (market) targetCoords = { lat: market.lat, lng: market.lng };
  }

  // No coordinates: return all same-type records
  if (!targetCoords) return relevantRecords;

  const { lat: tLat, lng: tLng } = targetCoords;

  // Compute distance for each record
  const withDist = relevantRecords.map((r) => {
    const rCoords = getLocalityCoordsForRecord(r.locality);
    const dist = rCoords
      ? haversineKm(rCoords.lat, rCoords.lng, tLat, tLng)
      : 999;
    return { record: r, dist };
  });

  // 3km radius
  const within3km = withDist.filter((x) => x.dist <= 3).map((x) => x.record);
  if (within3km.length >= 5) return within3km;

  // 5km radius
  const within5km = withDist.filter((x) => x.dist <= 5).map((x) => x.record);
  if (within5km.length >= 5) return within5km;

  // 8km radius
  const within8km = withDist.filter((x) => x.dist <= 8).map((x) => x.record);
  if (within8km.length >= 5) return within8km;

  // Fallback: all records for this type
  return relevantRecords;
}

// ─── B) DISTANCE-WEIGHTED CALCULATION ────────────────────────────────────────────────────

/**
 * Inverse distance squared weight.
 * Records within 1km get weight ~1.0, records at 5km get weight ~0.038.
 */
export function distanceWeight(distanceKm: number): number {
  return 1 / (1 + distanceKm ** 2);
}

// ─── C) EXPONENTIAL RECENCY WEIGHTING ────────────────────────────────────────────────────

/**
 * Recency weight per month index:
 * month=10 (April 2026) = 5.0 (highest)
 * month=9 = 2.5, month=8 = 1.8, month=7 = 1.3, month <= 6 = 1.0
 */
export function recencyWeight(month: number): number {
  if (month >= 10) return 5.0;
  if (month === 9) return 2.5;
  if (month === 8) return 1.8;
  if (month === 7) return 1.3;
  return 1.0;
}

// ─── D) OUTLIER REMOVAL ────────────────────────────────────────────────────────────────────

/**
 * Remove records where PSF is outside mean ± 2*stdDev.
 * Also removes records with isOutlier=true.
 * Minimum 3 records retained after filtering.
 */
export function filterOutliers(records: TrainingRecord[]): TrainingRecord[] {
  if (records.length <= 3) return records;

  // Remove flagged outliers first
  const unflagged = records.filter((r) => !r.isOutlier);
  if (unflagged.length < 3) return records.slice(0, 3);

  const psfs = unflagged.map((r) =>
    r.areaSqft > 0 ? r.soldPrice / r.areaSqft : 0,
  );
  const mean = psfs.reduce((s, v) => s + v, 0) / psfs.length;
  const variance = psfs.reduce((s, v) => s + (v - mean) ** 2, 0) / psfs.length;
  const stdDev = Math.sqrt(variance);

  const lo = mean - 2 * stdDev;
  const hi = mean + 2 * stdDev;
  const filtered = unflagged.filter((r) => {
    const p = r.areaSqft > 0 ? r.soldPrice / r.areaSqft : 0;
    return p >= lo && p <= hi;
  });

  // Never over-filter — keep at least 3
  return filtered.length >= 3 ? filtered : unflagged.slice(0, 3);
}

// ─── E) WEIGHTED MEDIAN ──────────────────────────────────────────────────────────────────

/**
 * Sort by value, accumulate weights, return value at 50th percentile.
 */
export function weightedMedian(values: number[], weights: number[]): number {
  if (values.length === 0) return 0;
  if (values.length !== weights.length) return 0;

  const pairs = values
    .map((v, i) => ({ value: v, weight: weights[i] }))
    .sort((a, b) => a.value - b.value);

  const totalWeight = pairs.reduce((s, p) => s + p.weight, 0);
  const half = totalWeight / 2;

  let cumulative = 0;
  for (const pair of pairs) {
    cumulative += pair.weight;
    if (cumulative >= half) return Math.round(pair.value);
  }
  return Math.round(pairs[pairs.length - 1].value);
}

// ─── F) UNIT NORMALIZATION ────────────────────────────────────────────────────────────────

export function normalizeToSqft(
  area: number,
  unit: "sqft" | "sqyd" | "gunta" | "acre",
): number {
  switch (unit) {
    case "sqyd":
      return area * 9;
    case "gunta":
      return area * 1089;
    case "acre":
      return area * 43560;
    default:
      return area;
  }
}

// ─── North Bangalore carpet-to-SBA ratio ─────────────────────────────────────────────────
const NORTH_CARPET_TO_SBA_RATIO = 0.75;

/**
 * Normalizes a TrainingRecord's area to SBA basis.
 * If areaType='Carpet' or isCarpet=true, divides by 0.75.
 */
function normalizeCarpetArea(record: TrainingRecord): number {
  if (record.areaType === "Carpet" || record.isCarpet === true) {
    return record.areaSqft / NORTH_CARPET_TO_SBA_RATIO;
  }
  return record.areaSqft;
}

// ─── G1) RTMI PREMIUM ────────────────────────────────────────────────────────────────────

/**
 * Derive RTMI (Ready-To-Move-In) premium from data.
 * Looks for SBA records (proxy for RTMI) vs Carpet records (proxy for UC).
 * Returns observed ratio. Default 1.0 if no signal.
 */
export function getRTMIPremium(
  project: string,
  builder: string,
  records: TrainingRecord[],
): number {
  const projKey = project.toLowerCase().trim();
  const builderKey = builder.toLowerCase().trim();

  // Filter to same project/builder records
  const relevant = records.filter((r) => {
    const rProj = r.project.toLowerCase();
    const rBuild = r.builder.toLowerCase();
    return (
      (projKey && (rProj.includes(projKey) || projKey.includes(rProj))) ||
      (builderKey &&
        (rBuild.includes(builderKey) || builderKey.includes(rBuild)))
    );
  });

  if (relevant.length < 4) return 1.0;

  const sbaRecords = relevant.filter((r) => r.areaType === "SBA");
  const carpetRecords = relevant.filter(
    (r) => r.areaType === "Carpet" || r.isCarpet === true,
  );

  if (sbaRecords.length < 2 || carpetRecords.length < 2) return 1.0;

  const sbaPSFs = sbaRecords.map((r) =>
    r.areaSqft > 0 ? r.soldPrice / r.areaSqft : 0,
  );
  const carpetPSFs = carpetRecords.map((r) =>
    r.areaSqft > 0 ? r.soldPrice / r.areaSqft : 0,
  );

  const sbaMedian = (() => {
    const s = [...sbaPSFs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
  })();
  const carpetMedian = (() => {
    const s = [...carpetPSFs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
  })();

  if (carpetMedian === 0) return 1.0;
  const ratio = sbaMedian / carpetMedian;
  return Math.min(Math.max(ratio, 1.0), 1.3);
}

// ─── G3) SIZE CURVE FOR PLOTS ─────────────────────────────────────────────────────────────

/**
 * Inverse PSF for plots: smaller plots command higher PSF.
 * Factor = min(1.4, max(0.7, 1200 / areaSqft))
 */
export function getSizeCurveFactor(areaSqft: number): number {
  return Math.min(1.4, Math.max(0.7, 1200 / areaSqft));
}

// ─── G4) STRR PROXIMITY FACTOR ───────────────────────────────────────────────────────────

/**
 * STRR (State Ring Road) proximity factor — derived from data comparison.
 * Compute average PSF for STRR-tagged vs non-STRR Doddaballapur plots.
 */
export function getSTRRFactor(
  locality: string,
  project: string,
  allRecords?: TrainingRecord[],
): number {
  const locKey = locality.toLowerCase();
  const projKey = project.toLowerCase();

  const isSTRRFrontage =
    projKey.includes("strr") || projKey.includes("frontage");
  const isDoddaballapur =
    locKey.includes("doddaballapur") || locKey.includes("doddaballapura");

  if (!isDoddaballapur && !isSTRRFrontage) return 1.0;

  // Try to derive ratio from data
  if (allRecords && allRecords.length > 0) {
    const doddaPlots = allRecords.filter(
      (r) =>
        r.propertyType === "plot" &&
        (r.locality.toLowerCase().includes("doddaballapur") ||
          r.locality.toLowerCase().includes("doddaballapura")),
    );

    const strrTagged = doddaPlots.filter(
      (r) =>
        r.project.toLowerCase().includes("strr") ||
        r.project.toLowerCase().includes("highway") ||
        r.project.toLowerCase().includes("frontage"),
    );
    const nonStrr = doddaPlots.filter(
      (r) =>
        !r.project.toLowerCase().includes("strr") &&
        !r.project.toLowerCase().includes("highway") &&
        !r.project.toLowerCase().includes("frontage"),
    );

    if (strrTagged.length >= 2 && nonStrr.length >= 2) {
      const strrPSFs = strrTagged.map((r) =>
        r.areaSqft > 0 ? r.soldPrice / r.areaSqft : 0,
      );
      const nonStrrPSFs = nonStrr.map((r) =>
        r.areaSqft > 0 ? r.soldPrice / r.areaSqft : 0,
      );
      const strrMedian = (() => {
        const s = [...strrPSFs].sort((a, b) => a - b);
        const m = Math.floor(s.length / 2);
        return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
      })();
      const nonMedian = (() => {
        const s = [...nonStrrPSFs].sort((a, b) => a - b);
        const m = Math.floor(s.length / 2);
        return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
      })();

      if (nonMedian > 0) {
        const ratio = strrMedian / nonMedian;
        if (isSTRRFrontage) return Math.min(Math.max(ratio, 1.0), 1.5);
        return Math.min(Math.max(ratio, 1.0), 1.25);
      }
    }
  }

  // Fallback to defined values when no data
  if (isSTRRFrontage) return 1.35;
  if (isDoddaballapur) return 1.15;
  return 1.0;
}

// ─── G5) BLUE LINE METRO DELTA ───────────────────────────────────────────────────────────

/** PSF adder (₹) for localities near Hennur/Jakkur Blue Line Phase 2B stations. */
const BLUE_LINE_METRO_LOCALITIES = new Set([
  "jakkur",
  "hennur",
  "hennur road",
  "hennur rd",
  "kogilu",
  "thanisandra",
]);

const BLUE_LINE_STATIONS: Array<{ name: string; lat: number; lng: number }> = [
  { name: "Jakkur", lat: 13.0756, lng: 77.5845 },
  { name: "Hennur", lat: 13.0612, lng: 77.6468 },
];

/**
 * Returns PSF adder (not multiplier) for Blue Line metro proximity.
 * Returns 0 for non-metro localities.
 */
export function getBlueLineMetroDelta(
  locality: string,
  lat?: number,
  lng?: number,
): number {
  const locKey = locality.toLowerCase().trim();

  // Check named localities
  if (BLUE_LINE_METRO_LOCALITIES.has(locKey)) return 1500;

  // Check by coordinate proximity if coords provided
  if (lat !== undefined && lng !== undefined) {
    for (const station of BLUE_LINE_STATIONS) {
      const dist = haversineKm(lat, lng, station.lat, station.lng);
      if (dist <= 1) return 1500;
    }
  }

  return 0;
}

// ─── G6) HEBBAL MATURITY FACTOR ───────────────────────────────────────────────────────────

const HEBBAL_BRANDED_BUILDERS = new Set([
  "karle",
  "embassy",
  "hiranandani",
  "l&t",
  "lt realty",
  "prestige",
  "sobha",
]);

/**
 * Hebbal branded projects get no age depreciation; unbranded get slight discount.
 */
export function getHebbalMaturityFactor(
  locality: string,
  project: string,
): number {
  const locKey = locality.toLowerCase().trim();
  if (!locKey.includes("hebbal")) return 1.0;

  const projKey = project.toLowerCase();
  const isBranded = [...HEBBAL_BRANDED_BUILDERS].some(
    (b) => projKey.includes(b) || project.toLowerCase().includes(b),
  );
  return isBranded ? 1.0 : 0.95;
}

// ─── G7) SEZ SCARCITY FACTOR ─────────────────────────────────────────────────────────────

/**
 * Scarcity weight for SEZ/ITIR-proximity plots in Devanahalli.
 * Century Seasons + Godrej Woodside: 1.15, other branded Devanahalli plots: 1.08.
 */
export function getSEZScarcityFactor(
  locality: string,
  project: string,
): number {
  const locKey = locality.toLowerCase();
  const projKey = project.toLowerCase();

  if (!locKey.includes("devanahalli")) return 1.0;

  if (
    projKey.includes("century seasons") ||
    projKey.includes("godrej woodside")
  )
    return 1.15;

  const brandedBuilders = [
    "brigade",
    "godrej",
    "prestige",
    "sobha",
    "embassy",
    "tata",
    "birla",
  ];
  const isBranded = brandedBuilders.some((b) => projKey.includes(b));
  if (isBranded) return 1.08;

  return 1.0;
}

// ─── G9) BAGALUR BRANDED FACTOR ──────────────────────────────────────────────────────────

const BAGALUR_BRANDED_BUILDERS = new Set([
  "brigade",
  "godrej",
  "puravankara",
  "prestige",
  "provident",
  "embassy",
  "tata",
]);

const BAGALUR_BRANDED_FLOOR_PSF = 10500;

/**
 * Returns PSF floor override for Bagalur branded high-rise.
 * If computed PSF < 10500 and locality is Bagalur and builder is branded,
 * returns 10500 as PSF floor. Otherwise returns null (no override).
 */
export function getBagalurBrandedFactor(
  locality: string,
  builder: string,
): number | null {
  const locKey = locality.toLowerCase().trim();
  if (!locKey.includes("bagalur") && !locKey.includes("bagaluru")) return null;

  const builderKey = builder.toLowerCase();
  const isBranded = [...BAGALUR_BRANDED_BUILDERS].some((b) =>
    builderKey.includes(b),
  );
  if (!isBranded) return null;

  return BAGALUR_BRANDED_FLOOR_PSF;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API — Enhanced getAveragePSF
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns the deduplicated training dataset for the requested property type.
 * Returns an empty array (never throws) for unrecognized types.
 */
export function getNorthBangaloreData(type: string): TrainingRecord[] {
  switch (type.toLowerCase().trim()) {
    case "apartment":
    case "flat":
      return northBangaloreApartments;
    case "villa":
    case "house":
    case "row house":
      return northBangaloreVillas;
    case "plot":
    case "land":
      return northBangalorePlots;
    case "commercial":
    case "office":
    case "shop":
      return northBangaloreCommercial;
    default:
      return [];
  }
}

// ─── North-West Bangalore Data Access ──────────────────────────────────────────────────
// Converts NorthWestRecord to a shape compatible with the TrainingRecord filtering
// functions (haversine distance, outlier removal, weighted median) already defined above.

/**
 * isNorthWestBangalore — returns true for localities covered by NW training data.
 * These localities will route through getNorthWestPSF() inside getAveragePSF().
 */
export function isNorthWestBangalore(locality: string): boolean {
  const key = locality.toLowerCase().trim();
  return NORTH_WEST_BANGALORE_MICRO_MARKETS.some(
    (m) =>
      m.name.toLowerCase() === key ||
      m.aliases.some((a) => a === key || key.includes(a) || a.includes(key)),
  );
}

/**
 * Compute weighted-median PSF for a North-West locality + property type.
 *
 * Steps:
 * 1. Get type-strict NorthWestRecords matching the locality
 * 2. Apply outlier thresholds from intelligenceConfig.shared
 * 3. Apply intelligence flags as data-driven multipliers (no hardcoding)
 * 4. Return weighted median — or null if no valid records
 */
export function getNorthWestPSF(
  locality: string,
  type: string,
  areaSqft?: number,
): number | null {
  const normalizedType = type.toLowerCase().trim();
  let ptKey: NorthWestRecord["propertyType"];
  if (normalizedType.includes("plot") || normalizedType.includes("land")) {
    ptKey = "plot";
  } else if (
    normalizedType.includes("villa") ||
    normalizedType.includes("house")
  ) {
    ptKey = "villa";
  } else if (normalizedType.includes("commercial")) {
    ptKey = "commercial";
  } else {
    ptKey = "apartment";
  }

  // Step 1: pull records for this locality + type (strict, no cross-type)
  const localityKey = locality.toLowerCase().trim();
  const typeRecords = getNorthWestDataByType(ptKey);
  const localRecords = typeRecords.filter((r) => {
    const rk = r.locality.toLowerCase().trim();
    return (
      rk === localityKey || rk.includes(localityKey) || localityKey.includes(rk)
    );
  });

  // If too few records, try within nearby NW localities (2km radius fallback)
  let candidates = localRecords;
  if (candidates.length < 3) {
    // expand to all NW records of this type for a broader estimate
    candidates = typeRecords;
  }

  if (candidates.length === 0) return null;

  // Step 2: Apply outlier thresholds from intelligenceConfig.shared
  const cfg = intelligenceConfig.shared;
  let lo: number;
  let hi: number;
  if (ptKey === "plot") {
    lo = cfg.outlierPsfLowPlot;
    hi = cfg.outlierPsfHighPlot;
  } else if (ptKey === "commercial") {
    lo = cfg.outlierPsfLowCommercial;
    hi = cfg.outlierPsfHighCommercial;
  } else {
    lo = cfg.outlierPsfLowApartment;
    hi = cfg.outlierPsfHighApartment;
  }

  const cleanRecords = candidates.filter((r) => {
    if (r.isOutlier) return false;
    const p = getPSFNorthWest(r);
    return p >= lo && p <= hi;
  });

  if (cleanRecords.length === 0) return null;

  // Step 3: Compute distance-weighted PSFs with intelligence multipliers
  const targetCoords = ALL_LOCALITY_COORDS[localityKey] ?? null;
  const values: number[] = [];
  const weights: number[] = [];

  for (const r of cleanRecords) {
    let psf = getPSFNorthWest(r);
    if (psf <= 0) continue;

    // Apply recency weight: month=10 (April 2026) = 5.0 weight
    const rw =
      r.month >= 10 ? 5.0 : r.month >= 9 ? 2.5 : r.month >= 8 ? 1.8 : 1.0;

    // Apply distance weight (fallback 1.0 if coords not available)
    let dw = 1.0;
    if (targetCoords) {
      const rCoords =
        ALL_LOCALITY_COORDS[r.locality.toLowerCase().trim()] ?? null;
      if (rCoords) {
        const dist = haversineKm(
          rCoords.lat,
          rCoords.lng,
          targetCoords.lat,
          targetCoords.lng,
        );
        dw = 1 / (1 + dist ** 2);
      }
    }

    // Step 3a: Apply data-driven intelligence flag multipliers
    // Devinagar/Lottegollahalli → Hebbal/ORR proximity multiplier (read from data, not hardcoded)
    if (r.hasHebbalOrrProximity) {
      const multiplier =
        intelligenceConfig.northWestExtension.batch1
          .devinagarHebbalOrrMultiplier;
      if (ptKey === "plot") psf = Math.round(psf * multiplier);
    }

    // Lottegollahalli Suburban Rail growth multiplier
    if (r.hasRailwayCorridorProximity && r.growthMultiplier12m) {
      psf = Math.round(psf * r.growthMultiplier12m);
    }

    // BEL/HMT Premium — institutional infra adds premium
    if (r.isBelHmtPremium && !r.isHeritageLegacy) {
      const belFactor =
        intelligenceConfig.northWestCluster.batch1.belHmtPremiumFactor;
      psf = Math.round(psf * belFactor);
    }

    // HMT Legacy discount (structure age depreciation) — read as % from data
    if (r.isHeritageLegacy) {
      const discountFactor =
        1 -
        intelligenceConfig.northWestCluster.batch3.hmtLegacyDiscountPct / 100;
      psf = Math.round(psf * discountFactor);
    }

    // Metro proximity premium for apartments (only within-1km records tagged)
    if (r.hasMetroProximity && ptKey === "apartment") {
      const metroPremiumFactor =
        1 +
        intelligenceConfig.northWestCluster.batch2.metroProximityPremiumPct /
          100;
      psf = Math.round(psf * metroPremiumFactor);
    }

    // Size curve for plots: smaller plots command higher PSF
    if (ptKey === "plot" && areaSqft && areaSqft > 0) {
      psf = Math.round(psf * getSizeCurveFactor(areaSqft));
    }

    // A-Khata BDA scarcity cap: prevent PSF exceeding sahakarnagar upper limit for plots
    if (ptKey === "plot") {
      const upperLimit =
        intelligenceConfig.northWestCluster.batch2
          .sahakarnagarlBdaScarcityUpperLimitPsf;
      if (psf > upperLimit) psf = upperLimit;
    }

    values.push(psf);
    weights.push(rw * dw);
  }

  if (values.length === 0) return null;
  return weightedMedian(values, weights);
}

/**
 * Enhanced getAveragePSF:
 * 1. Get micro-zone records (3-5km radius)
 * 2. Apply carpet normalization
 * 3. Remove outliers
 * 4. Calculate distance weights + recency weights
 * 5. Apply size curve factor (for plots)
 * 6. Apply STRR/Metro/Hebbal/SEZ/Bagalur feature multipliers/adders
 * 7. Return weighted median PSF
 *
 * Returns null if no data exists (caller should show "Data unavailable").
 */
export function getAveragePSF(
  locality: string,
  type: string,
  builder?: string,
  project?: string,
  areaSqft?: number,
  lat?: number,
  lng?: number,
): number | null {
  // ── North-West localities: route to NW training data engine ──────────────────
  if (isNorthWestBangalore(locality)) {
    return getNorthWestPSF(locality, type, areaSqft);
  }

  const allRecords = getNorthBangaloreData(type);
  if (allRecords.length === 0) return null;

  // Step 1: Get micro-zone records
  const microZoneRecords = getMicroZoneRecords(
    locality,
    type,
    allRecords,
    ALL_LOCALITY_COORDS,
  );
  if (microZoneRecords.length === 0) return null;

  // Step 2: Apply carpet normalization (normalize all records to SBA basis)
  const normalizedRecords = microZoneRecords.map((r) => ({
    ...r,
    areaSqft: normalizeCarpetArea(r),
  }));

  // Step 3: Remove outliers
  const cleanRecords = filterOutliers(normalizedRecords);
  if (cleanRecords.length === 0) return null;

  // Resolve target locality coords
  const localityKey = locality.toLowerCase().trim();
  let targetCoords: { lat: number; lng: number } | null = null;
  if (lat !== undefined && lng !== undefined) {
    targetCoords = { lat, lng };
  } else {
    targetCoords = ALL_LOCALITY_COORDS[localityKey] ?? null;
    if (!targetCoords) {
      for (const [k, v] of Object.entries(ALL_LOCALITY_COORDS)) {
        if (k.includes(localityKey) || localityKey.includes(k)) {
          targetCoords = v;
          break;
        }
      }
    }
    if (!targetCoords) {
      const market = getNorthMicroMarket(locality);
      if (market) targetCoords = { lat: market.lat, lng: market.lng };
    }
  }

  // Step 4: Calculate distance weights + recency weights
  const values: number[] = [];
  const weights: number[] = [];

  for (const r of cleanRecords) {
    const psf = r.areaSqft > 0 ? r.soldPrice / r.areaSqft : 0;
    if (psf <= 0) continue;

    const rw = recencyWeight(r.month ?? 5);

    let dw = 1.0;
    if (targetCoords) {
      const rCoords = getLocalityCoordsForRecord(r.locality);
      if (rCoords) {
        const dist = haversineKm(
          rCoords.lat,
          rCoords.lng,
          targetCoords.lat,
          targetCoords.lng,
        );
        dw = distanceWeight(dist);
      }
    }

    values.push(psf);
    weights.push(rw * dw);
  }

  if (values.length === 0) return null;

  // Step 5: Apply size curve factor for plots
  let basePSF = weightedMedian(values, weights);

  const isPlot =
    type.toLowerCase().includes("plot") || type.toLowerCase().includes("land");
  if (isPlot && areaSqft && areaSqft > 0) {
    const sizeFactor = getSizeCurveFactor(areaSqft);
    basePSF = Math.round(basePSF * sizeFactor);
  }

  // Step 6: Apply feature multipliers
  const projName = project ?? "";
  const builderName = builder ?? "";

  // RTMI premium (data-derived)
  const rtmiMultiplier =
    projName || builderName
      ? getRTMIPremium(projName, builderName, cleanRecords)
      : 1.0;

  // STRR factor
  const strrFactor = getSTRRFactor(locality, projName, allRecords);

  // Hebbal maturity
  const hebbalFactor = getHebbalMaturityFactor(locality, projName);

  // SEZ scarcity
  const sezFactor = getSEZScarcityFactor(locality, projName);

  // Blue Line Metro delta (PSF adder, applied after multipliers)
  const metroDelta = getBlueLineMetroDelta(locality, lat, lng);

  // Bagalur branded PSF floor
  const bagalurFloor = getBagalurBrandedFactor(locality, builderName);

  // Combined multiplicative factor
  const combinedFactor = rtmiMultiplier * strrFactor * hebbalFactor * sezFactor;
  let finalPSF = Math.round(basePSF * combinedFactor + metroDelta);

  // Apply Bagalur branded PSF floor
  if (bagalurFloor !== null && finalPSF < bagalurFloor) {
    finalPSF = bagalurFloor;
  }

  return finalPSF > 0 ? finalPSF : null;
}
