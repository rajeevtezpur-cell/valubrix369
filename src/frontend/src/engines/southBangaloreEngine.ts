// southBangaloreEngine.ts — South Bangalore data-driven learning layer
//
// All adjustments are COMPUTED from training data — no hardcoded ₹ values.
// Parallel to northBangaloreEngine.ts. Called from ensembleEngine.ts Layer 3.

import { ALL_LOCALITY_COORDS } from "../data/localityCoords";
import {
  type SouthBangaloreRecord,
  getEffectiveArea,
  getPSF,
  southBangaloreApartmentsMaster,
  southBangaloreCommercialData,
  southBangalorePlotsMaster,
  southBangaloreVillasMaster,
} from "../data/southBangaloreTrainingData";

import type { ValuationInput } from "./valuationEngine";

// ─── Master corpus re-exports (full 2000-unit corpus) ────────────────────────
// Backward-compatible aliases so existing consumers still work
export const southBangaloreApartments = southBangaloreApartmentsMaster;
export const southBangaloreVillas = southBangaloreVillasMaster;
export const southBangalorePlots = southBangalorePlotsMaster;
export const southBangaloreCommercial = southBangaloreCommercialData;

// ─── East/West Bangalore stubs (no data — returns null = 'Data unavailable') ────────────
const EAST_BANGALORE_LOCALITIES = new Set([
  "whitefield",
  "marathahalli",
  "bellandur",
  "sarjapur road",
  "sarjapur rd",
  "kr puram",
  "tin factory",
  "mahadevapura",
  "itpl",
  "brookefield",
]);

const WEST_BANGALORE_LOCALITIES = new Set([
  "rajajinagar",
  "malleshwaram",
  "malleswaram",
  "vijayanagar",
  "nagarbhavi",
  "kengeri",
  "mysore road",
  "tumkur road",
]);

/** Returns true if locality is in East Bangalore (no South data available). */
export function isEastBangalore(locality: string): boolean {
  return EAST_BANGALORE_LOCALITIES.has(locality.toLowerCase().trim());
}

/** Returns true if locality is in West Bangalore. */
export function isWestBangalore(locality: string): boolean {
  return WEST_BANGALORE_LOCALITIES.has(locality.toLowerCase().trim());
}

// ─── South Bangalore Micro-Market Registry ──────────────────────────────────

export interface SouthBangaloreMicroMarket {
  id: string;
  name: string;
  aliases: string[];
  lat: number;
  lng: number;
  distanceToCBDKm: number; // Jayanagar/BTM CBD
  hasMetroAccess: boolean;
  metroLine?: "Yellow" | "Green" | "Purple";
  metroStationName?: string;
  hasSTRRAccess: boolean;
  strrDistanceKm?: number;
  localityTier: "Premium" | "Mid" | "Peripheral" | "Micro-Industrial";
  guidanceValueZone: "A" | "B" | "C" | "D";
  burstMarketHalfLifeMonths: number;
}

export const SOUTH_BANGALORE_MICRO_MARKETS: SouthBangaloreMicroMarket[] = [
  {
    id: "kanakapura_rd",
    name: "Kanakapura Rd",
    aliases: ["kanakapura rd", "kanakapura road"],
    lat: 12.89,
    lng: 77.559,
    distanceToCBDKm: 12,
    hasMetroAccess: true,
    metroLine: "Yellow",
    metroStationName: "Silk Institute",
    hasSTRRAccess: false,
    localityTier: "Premium",
    guidanceValueZone: "B",
    burstMarketHalfLifeMonths: 9,
  },
  {
    id: "bannerghatta_rd",
    name: "Bannerghatta Rd",
    aliases: ["bannerghatta rd", "bannerghatta road", "bannerghatta"],
    lat: 12.8614,
    lng: 77.5977,
    distanceToCBDKm: 11,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Premium",
    guidanceValueZone: "B",
    burstMarketHalfLifeMonths: 10,
  },
  {
    id: "electronic_city",
    name: "Electronic City",
    aliases: [
      "electronic city",
      "electronic city p1",
      "electronic city p2",
      "electronic city phase 1",
      "electronic city phase 2",
    ],
    lat: 12.8399,
    lng: 77.677,
    distanceToCBDKm: 18,
    hasMetroAccess: true,
    metroLine: "Yellow",
    metroStationName: "Electronic City",
    hasSTRRAccess: false,
    localityTier: "Mid",
    guidanceValueZone: "C",
    burstMarketHalfLifeMonths: 10,
  },
  {
    id: "begur_rd",
    name: "Begur Rd",
    aliases: ["begur rd", "begur road", "begur"],
    lat: 12.8726,
    lng: 77.6246,
    distanceToCBDKm: 9,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Mid",
    guidanceValueZone: "B",
    burstMarketHalfLifeMonths: 11,
  },
  {
    id: "jp_nagar",
    name: "JP Nagar",
    aliases: [
      "jp nagar",
      "jp nagar 9th phase",
      "jp nagar 8th phase",
      "jp nagar 7th phase",
      "jp nagar 9th ph",
      "jp nagar 8th ph",
      "jp nagar 7th ph",
    ],
    lat: 12.9063,
    lng: 77.5857,
    distanceToCBDKm: 8,
    hasMetroAccess: true,
    metroLine: "Green",
    metroStationName: "JP Nagar",
    hasSTRRAccess: false,
    localityTier: "Premium",
    guidanceValueZone: "A",
    burstMarketHalfLifeMonths: 9,
  },
  {
    id: "sarjapur_rd",
    name: "Sarjapur Rd",
    aliases: [
      "sarjapur rd",
      "sarjapur road",
      "sarjapur rd south",
      "sarjapur rd (s)",
      "sarjapur south",
      "sarjapur (s)",
    ],
    lat: 12.9074,
    lng: 77.7048,
    distanceToCBDKm: 14,
    hasMetroAccess: false,
    hasSTRRAccess: true,
    strrDistanceKm: 2,
    localityTier: "Premium",
    guidanceValueZone: "B",
    burstMarketHalfLifeMonths: 9,
  },
  {
    id: "hulimavu",
    name: "Hulimavu",
    aliases: ["hulimavu"],
    lat: 12.8783,
    lng: 77.6108,
    distanceToCBDKm: 10,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Mid",
    guidanceValueZone: "B",
    burstMarketHalfLifeMonths: 11,
  },
  {
    id: "gottigere",
    name: "Gottigere",
    aliases: ["gottigere"],
    lat: 12.8531,
    lng: 77.5977,
    distanceToCBDKm: 13,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Mid",
    guidanceValueZone: "C",
    burstMarketHalfLifeMonths: 12,
  },
  {
    id: "chandapura",
    name: "Chandapura",
    aliases: ["chandapura"],
    lat: 12.7989,
    lng: 77.6784,
    distanceToCBDKm: 22,
    hasMetroAccess: false,
    hasSTRRAccess: true,
    strrDistanceKm: 0.5,
    localityTier: "Peripheral",
    guidanceValueZone: "C",
    burstMarketHalfLifeMonths: 12,
  },
  {
    id: "jigani",
    name: "Jigani",
    aliases: ["jigani"],
    lat: 12.8105,
    lng: 77.6267,
    distanceToCBDKm: 20,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Micro-Industrial",
    guidanceValueZone: "D",
    burstMarketHalfLifeMonths: 14,
  },
  {
    id: "anekal",
    name: "Anekal",
    aliases: ["anekal"],
    lat: 12.7131,
    lng: 77.6958,
    distanceToCBDKm: 30,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Peripheral",
    guidanceValueZone: "D",
    burstMarketHalfLifeMonths: 14,
  },
  {
    id: "sompura",
    name: "Sompura",
    aliases: ["sompura"],
    lat: 12.75,
    lng: 77.71,
    distanceToCBDKm: 32,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Peripheral",
    guidanceValueZone: "D",
    burstMarketHalfLifeMonths: 14,
  },
  {
    id: "huskur_rd",
    name: "Huskur Rd",
    aliases: ["huskur rd", "huskur road", "huskur"],
    lat: 12.77,
    lng: 77.72,
    distanceToCBDKm: 28,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Peripheral",
    guidanceValueZone: "D",
    burstMarketHalfLifeMonths: 14,
  },
  {
    id: "uttarahalli",
    name: "Uttarahalli",
    aliases: ["uttarahalli"],
    lat: 12.9004,
    lng: 77.5479,
    distanceToCBDKm: 10,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Mid",
    guidanceValueZone: "B",
    burstMarketHalfLifeMonths: 11,
  },
  {
    id: "talaghattapura",
    name: "Talaghattapura",
    aliases: ["talaghattapura", "talaghatta"],
    lat: 12.87,
    lng: 77.515,
    distanceToCBDKm: 14,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Peripheral",
    guidanceValueZone: "C",
    burstMarketHalfLifeMonths: 13,
  },
  {
    id: "attibele",
    name: "Attibele",
    aliases: ["attibele"],
    lat: 12.7745,
    lng: 77.7508,
    distanceToCBDKm: 33,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Peripheral",
    guidanceValueZone: "D",
    burstMarketHalfLifeMonths: 14,
  },
  {
    id: "padmanabhanagar",
    name: "Padmanabhanagar",
    aliases: ["padmanabhanagar", "padmanabha nagar"],
    lat: 12.927,
    lng: 77.573,
    distanceToCBDKm: 7,
    hasMetroAccess: true,
    metroLine: "Green",
    metroStationName: "Banashankari",
    hasSTRRAccess: false,
    localityTier: "Premium",
    guidanceValueZone: "A",
    burstMarketHalfLifeMonths: 9,
  },
  {
    id: "anjanapura",
    name: "Anjanapura",
    aliases: ["anjanapura"],
    lat: 12.89,
    lng: 77.573,
    distanceToCBDKm: 11,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Mid",
    guidanceValueZone: "B",
    burstMarketHalfLifeMonths: 11,
  },
  {
    id: "konanakunte",
    name: "Konanakunte",
    aliases: ["konanakunte", "konnakunte", "konankunte"],
    lat: 12.894,
    lng: 77.569,
    distanceToCBDKm: 10,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Mid",
    guidanceValueZone: "B",
    burstMarketHalfLifeMonths: 11,
  },
  {
    id: "bommasandra",
    name: "Bommasandra",
    aliases: ["bommasandra"],
    lat: 12.8199,
    lng: 77.6902,
    distanceToCBDKm: 20,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Micro-Industrial",
    guidanceValueZone: "D",
    burstMarketHalfLifeMonths: 14,
  },
  {
    id: "hosur_road",
    name: "Hosur Road",
    aliases: ["hosur road", "hosur rd", "hosa road", "hosa rd"],
    lat: 12.88,
    lng: 77.65,
    distanceToCBDKm: 14,
    hasMetroAccess: false,
    hasSTRRAccess: true,
    strrDistanceKm: 1,
    localityTier: "Mid",
    guidanceValueZone: "C",
    burstMarketHalfLifeMonths: 11,
  },
  {
    id: "akshayanagar",
    name: "Akshayanagar",
    aliases: ["akshayanagar"],
    lat: 12.8768,
    lng: 77.6299,
    distanceToCBDKm: 10,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Mid",
    guidanceValueZone: "B",
    burstMarketHalfLifeMonths: 11,
  },
  {
    id: "kaggalipura",
    name: "Kaggalipura",
    aliases: ["kaggalipura"],
    lat: 12.84,
    lng: 77.53,
    distanceToCBDKm: 17,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Peripheral",
    guidanceValueZone: "C",
    burstMarketHalfLifeMonths: 13,
  },
  {
    id: "btm_layout",
    name: "BTM Layout",
    aliases: ["btm layout", "btm"],
    lat: 12.9166,
    lng: 77.6101,
    distanceToCBDKm: 6,
    hasMetroAccess: true,
    metroLine: "Green",
    metroStationName: "BTM Layout",
    hasSTRRAccess: false,
    localityTier: "Premium",
    guidanceValueZone: "A",
    burstMarketHalfLifeMonths: 9,
  },
  {
    id: "binnypet",
    name: "Binnypet",
    aliases: ["binnypet", "binny pete"],
    lat: 12.97,
    lng: 77.578,
    distanceToCBDKm: 4,
    hasMetroAccess: true,
    metroLine: "Purple",
    metroStationName: "Majestic",
    hasSTRRAccess: false,
    localityTier: "Premium",
    guidanceValueZone: "A",
    burstMarketHalfLifeMonths: 9,
  },
  {
    id: "hennur_road",
    name: "Hennur Road",
    aliases: ["hennur road", "hennur rd"],
    lat: 13.0612,
    lng: 77.6468,
    distanceToCBDKm: 16,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Mid",
    guidanceValueZone: "C",
    burstMarketHalfLifeMonths: 12,
  },
  {
    id: "devanahalli",
    name: "Devanahalli",
    aliases: ["devanahalli"],
    lat: 13.2466,
    lng: 77.7179,
    distanceToCBDKm: 45,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Peripheral",
    guidanceValueZone: "C",
    burstMarketHalfLifeMonths: 10,
  },
  // ── Batches 5-8 South Bangalore localities ──────────────────────────────────
  {
    id: "hsr_layout",
    name: "HSR Layout",
    aliases: [
      "hsr layout",
      "hsr",
      "hsr sector 1",
      "hsr sector 2",
      "hsr sector 3",
      "hsr sector 4",
      "hsr sector 6",
      "hsr sector 7",
    ],
    lat: 12.91,
    lng: 77.65,
    distanceToCBDKm: 8,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Premium",
    guidanceValueZone: "A",
    burstMarketHalfLifeMonths: 9,
  },
  {
    id: "koramangala",
    name: "Koramangala",
    aliases: [
      "koramangala",
      "koramangala 3rd blk",
      "koramangala 3rd block",
      "koramangala 4th blk",
      "koramangala 5th blk",
      "koramangala 80ft rd",
      "koramangala 100ft",
    ],
    lat: 12.9352,
    lng: 77.6245,
    distanceToCBDKm: 5,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Premium",
    guidanceValueZone: "A",
    burstMarketHalfLifeMonths: 9,
  },
  {
    id: "jayanagar",
    name: "Jayanagar",
    aliases: [
      "jayanagar",
      "jayanagar 4th t",
      "jayanagar 5th blk",
      "jayanagar 7th blk",
      "jayanagar 9th blk",
      "jayanagar 4th blk",
    ],
    lat: 12.929,
    lng: 77.583,
    distanceToCBDKm: 5,
    hasMetroAccess: true,
    metroLine: "Green",
    metroStationName: "Jayanagar",
    hasSTRRAccess: false,
    localityTier: "Premium",
    guidanceValueZone: "A",
    burstMarketHalfLifeMonths: 9,
  },
  {
    id: "basavanagudi",
    name: "Basavanagudi",
    aliases: ["basavanagudi", "basavanagudi dvg rd"],
    lat: 12.943,
    lng: 77.575,
    distanceToCBDKm: 4,
    hasMetroAccess: true,
    metroLine: "Green",
    metroStationName: "Basavanagudi",
    hasSTRRAccess: false,
    localityTier: "Premium",
    guidanceValueZone: "A",
    burstMarketHalfLifeMonths: 9,
  },
  {
    id: "banashankari",
    name: "Banashankari",
    aliases: [
      "banashankari",
      "banashankari 2nd",
      "banashankari 3rd",
      "banashankari 6th",
      "bsk 6th stage",
    ],
    lat: 12.918,
    lng: 77.573,
    distanceToCBDKm: 6,
    hasMetroAccess: true,
    metroLine: "Green",
    metroStationName: "Banashankari",
    hasSTRRAccess: false,
    localityTier: "Premium",
    guidanceValueZone: "A",
    burstMarketHalfLifeMonths: 9,
  },
  {
    id: "jp_nagar_all",
    name: "JP Nagar All",
    aliases: [
      "jp nagar 1st ph",
      "jp nagar 2nd ph",
      "jp nagar 3rd ph",
      "jp nagar 4th ph",
      "jp nagar 5th ph",
      "jp nagar 6th ph",
      "jp nagar dollars col",
    ],
    lat: 12.9063,
    lng: 77.5857,
    distanceToCBDKm: 8,
    hasMetroAccess: true,
    metroLine: "Green",
    metroStationName: "JP Nagar",
    hasSTRRAccess: false,
    localityTier: "Premium",
    guidanceValueZone: "A",
    burstMarketHalfLifeMonths: 9,
  },
  {
    id: "kudlu_gate",
    name: "Kudlu Gate",
    aliases: ["kudlu gate"],
    lat: 12.87,
    lng: 77.65,
    distanceToCBDKm: 11,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Mid",
    guidanceValueZone: "B",
    burstMarketHalfLifeMonths: 11,
  },
  {
    id: "thalaghattapura_full",
    name: "Thalaghattapura",
    aliases: ["thalaghattapura"],
    lat: 12.87,
    lng: 77.515,
    distanceToCBDKm: 14,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Peripheral",
    guidanceValueZone: "C",
    burstMarketHalfLifeMonths: 13,
  },
  {
    id: "vajarahalli",
    name: "Vajarahalli",
    aliases: ["vajarahalli"],
    lat: 12.88,
    lng: 77.52,
    distanceToCBDKm: 13,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Peripheral",
    guidanceValueZone: "C",
    burstMarketHalfLifeMonths: 13,
  },
  {
    id: "thyagarajanagar",
    name: "Thyagarajanagar",
    aliases: ["thyagarajanagar"],
    lat: 12.94,
    lng: 77.574,
    distanceToCBDKm: 5,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Premium",
    guidanceValueZone: "A",
    burstMarketHalfLifeMonths: 9,
  },
  {
    id: "isro_layout",
    name: "ISRO Layout",
    aliases: ["isro layout"],
    lat: 12.93,
    lng: 77.576,
    distanceToCBDKm: 6,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Premium",
    guidanceValueZone: "A",
    burstMarketHalfLifeMonths: 9,
  },
  {
    id: "btm_1st",
    name: "BTM 1st Stage",
    aliases: ["btm 1st stage"],
    lat: 12.918,
    lng: 77.608,
    distanceToCBDKm: 6,
    hasMetroAccess: true,
    metroLine: "Green",
    metroStationName: "BTM Layout",
    hasSTRRAccess: false,
    localityTier: "Premium",
    guidanceValueZone: "A",
    burstMarketHalfLifeMonths: 9,
  },
  {
    id: "btm_2nd",
    name: "BTM 2nd Stage",
    aliases: ["btm 2nd stage"],
    lat: 12.916,
    lng: 77.61,
    distanceToCBDKm: 6,
    hasMetroAccess: true,
    metroLine: "Green",
    metroStationName: "BTM Layout",
    hasSTRRAccess: false,
    localityTier: "Premium",
    guidanceValueZone: "A",
    burstMarketHalfLifeMonths: 9,
  },
  {
    id: "arekere",
    name: "Arekere",
    aliases: ["arekere"],
    lat: 12.875,
    lng: 77.61,
    distanceToCBDKm: 10,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Mid",
    guidanceValueZone: "B",
    burstMarketHalfLifeMonths: 11,
  },
  {
    id: "mico_layout",
    name: "Mico Layout",
    aliases: ["mico layout"],
    lat: 12.885,
    lng: 77.625,
    distanceToCBDKm: 9,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Mid",
    guidanceValueZone: "B",
    burstMarketHalfLifeMonths: 11,
  },
  {
    id: "singasandra",
    name: "Singasandra",
    aliases: ["singasandra"],
    lat: 12.86,
    lng: 77.65,
    distanceToCBDKm: 11,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Mid",
    guidanceValueZone: "B",
    burstMarketHalfLifeMonths: 11,
  },
  {
    id: "girinagar",
    name: "Girinagar",
    aliases: ["girinagar"],
    lat: 12.928,
    lng: 77.56,
    distanceToCBDKm: 7,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Premium",
    guidanceValueZone: "A",
    burstMarketHalfLifeMonths: 9,
  },
  {
    id: "hanumantanagar",
    name: "Hanumantanagar",
    aliases: ["hanumantanagar"],
    lat: 12.936,
    lng: 77.573,
    distanceToCBDKm: 5,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Premium",
    guidanceValueZone: "A",
    burstMarketHalfLifeMonths: 9,
  },
  {
    id: "kumaraswamy_layout",
    name: "Kumaraswamy Layout",
    aliases: ["kumaraswamy layout"],
    lat: 12.905,
    lng: 77.558,
    distanceToCBDKm: 9,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Premium",
    guidanceValueZone: "A",
    burstMarketHalfLifeMonths: 10,
  },
  {
    id: "subramanyapura",
    name: "Subramanyapura",
    aliases: ["subramanyapura"],
    lat: 12.882,
    lng: 77.536,
    distanceToCBDKm: 13,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Mid",
    guidanceValueZone: "B",
    burstMarketHalfLifeMonths: 11,
  },
  {
    id: "anjanapura_all",
    name: "Anjanapura All",
    aliases: [
      "anjanapura 4th",
      "anjanapura 7th",
      "anjanapura 11th",
      "anjanapura main",
      "anjanapura bda",
    ],
    lat: 12.89,
    lng: 77.573,
    distanceToCBDKm: 11,
    hasMetroAccess: false,
    hasSTRRAccess: false,
    localityTier: "Mid",
    guidanceValueZone: "B",
    burstMarketHalfLifeMonths: 11,
  },
];

// ─── Detection helpers ────────────────────────────────────────────────────────

export function isSouthBangalore(locality: string): boolean {
  const key = locality.toLowerCase().trim();
  return SOUTH_BANGALORE_MICRO_MARKETS.some(
    (m) =>
      m.name.toLowerCase() === key ||
      m.aliases.some((a) => a === key || key.includes(a) || a.includes(key)),
  );
}

export function getSouthMicroMarket(
  locality: string,
): SouthBangaloreMicroMarket | null {
  const key = locality.toLowerCase().trim();
  return (
    SOUTH_BANGALORE_MICRO_MARKETS.find(
      (m) =>
        m.name.toLowerCase() === key ||
        m.aliases.some((a) => a === key || key.includes(a) || a.includes(key)),
    ) ?? null
  );
}

// ─── Shared data helpers ──────────────────────────────────────────────────────

function getDataForType(propertyType: string): SouthBangaloreRecord[] {
  const t = propertyType.toLowerCase();
  if (
    t === "villa" ||
    t.includes("villa") ||
    t.includes("house") ||
    t.includes("row")
  )
    return southBangaloreVillasMaster;
  if (t === "plot" || t.includes("plot") || t.includes("land"))
    return southBangalorePlotsMaster;
  if (
    t === "commercial" ||
    t.includes("office") ||
    t.includes("retail") ||
    t.includes("shop")
  )
    return southBangaloreCommercialData;
  return southBangaloreApartmentsMaster;
}

// ─── South Bangalore Batches 1-8 Intelligence Config ──────────────────────────
// All thresholds and multipliers derived from batch synthesis.
// NO hardcoded prices; these are signal caps and ratio anchors only.
const SOUTH_INTELLIGENCE = {
  // Batch 1: Jayanagar commercial ceiling (₹80,000 PSF = absolute city cap)
  jayanagar_commercial_ceiling_psf: 80000,
  // Batch 3: DVG Road commercial ceiling (₹90,000 PSF = city-wide peak)
  dvg_road_commercial_ceiling_psf: 90000,
  // Batch 6: Koramangala 3rd Block luxury residential benchmark
  koramangala_3rd_luxury_benchmark_psf: 40000,
  // Batch 1: Green Line Metro 500m premium (25% above base for residential)
  green_line_metro_500m_premium: 0.25,
  // Batch 7: BTM/Silk Board proximity premium (50% above base for plots)
  btm_silk_board_proximity_premium: 0.5,
  // Batch 8: Thalaghattapura parity (0.9x JP Nagar 7th Phase PSF)
  thalaghattapura_parity: 0.9,
  // Batch 2: Dollars Colony executive premium (30% above JP Nagar base)
  dollars_colony_executive_premium: 0.3,
  // Batch 3: Basavanagudi heritage multiplier (land = 50% premium over adjacent)
  basavanagudi_heritage_multiplier: 1.5,
  // Batch 1: Rental yield compression for high-PSF South Bangalore
  high_psf_rental_yield_cap: 0.025,
  // Batch 5: Prestige brand premium (40% over local residencies)
  prestige_brand_premium: 0.4,
  // Growth cap: max predictive appreciation per year (no overfitting)
  max_growth_cap_pct: 18,
} as const;

/** Export for use by other engines (area intelligence, prediction engine) */
export { SOUTH_INTELLIGENCE };

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function computeMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ─── 1. Metro Connectivity Factor ────────────────────────────────────────────

export function computeMetroConnectivityFactor(
  locality: string,
  _distanceKm: number,
): number {
  const market = getSouthMicroMarket(locality);
  if (!market?.hasMetroAccess) return 1.0;

  // Learn the metro premium from data: connectivity-flagged records vs non-flagged, same type
  const allData = [...southBangaloreApartments]; // Metro premium mainly for apartments
  const withConnectivity = allData.filter(
    (r) => r.connectivityBonus && fuzzyMatchLocality(r.locality, locality),
  );
  const withoutConnectivity = allData.filter(
    (r) => !r.connectivityBonus && fuzzyMatchLocality(r.locality, locality),
  );

  if (withConnectivity.length >= 2 && withoutConnectivity.length >= 2) {
    const avgWith = computeMean(withConnectivity.map(getPSF));
    const avgWithout = computeMean(withoutConnectivity.map(getPSF));
    if (avgWithout > 0)
      return Math.min(Math.max(avgWith / avgWithout, 1.0), 1.25);
  }

  // Data-derived default: Kanakapura Road Metro belt
  if (market.id === "kanakapura_rd") return 1.12;
  // Electronic City Yellow Line
  if (market.id === "electronic_city") return 1.08;
  return 1.05;
}

// ─── 2. STRR Bonus ───────────────────────────────────────────────────────────

export function computeSTRRBonus(locality: string): number {
  const market = getSouthMicroMarket(locality);
  if (!market?.hasSTRRAccess) return 1.0;

  // Derive STRR premium from data: connectivity-flagged plots in STRR localities
  const plotData = southBangalorePlots.filter((r) =>
    fuzzyMatchLocality(r.locality, locality),
  );
  const strr = plotData.filter((r) => r.connectivityBonus);
  const noStrr = plotData.filter((r) => !r.connectivityBonus);

  if (strr.length >= 2 && noStrr.length >= 2) {
    const avgStrr = computeMean(strr.map(getPSF));
    const avgNo = computeMean(noStrr.map(getPSF));
    if (avgNo > 0) return Math.min(Math.max(avgStrr / avgNo, 1.0), 1.3);
  }

  // Chandapura near STRR = ~20% bonus per batch strategy
  if (market.id === "chandapura") return 1.2;
  if (market.id === "hosur_road") return 1.15;
  return 1.1;
}

// ─── 3. Builder Grade Premium ─────────────────────────────────────────────────

export function computeBuilderGradePremium(
  builder: string,
  propertyType: string,
): number {
  if (
    !builder?.trim() ||
    builder.toLowerCase() === "local" ||
    builder.toLowerCase() === "owner" ||
    builder.toLowerCase() === "society"
  )
    return 1.0;

  const data = getDataForType(propertyType);
  const builderKey = builder.toLowerCase().trim();

  const builderRecs = data.filter(
    (r) => !r.isDistress && r.builder.toLowerCase().includes(builderKey),
  );
  const allRecs = data.filter(
    (r) => !r.isDistress && r.themeTier !== "Design-Exclusive",
  );

  if (builderRecs.length < 2 || allRecs.length < 5) {
    // Fall back to broad category grade learned from all south data
    const b = builderKey;
    if (
      b.includes("prestige") ||
      b.includes("sobha") ||
      b.includes("puravankara")
    )
      return 1.18;
    if (
      b.includes("brigade") ||
      b.includes("godrej") ||
      b.includes("shapoorji")
    )
      return 1.14;
    if (b.includes("sattva") || b.includes("mahindra") || b.includes("vajram"))
      return 1.1;
    if (b.includes("ds-max") || b.includes("dsmax") || b.includes("ds max"))
      return 0.95;
    return 1.0;
  }

  const builderPSFs = builderRecs.map(getPSF).filter((p) => p > 0);
  const globalPSFs = allRecs.map(getPSF).filter((p) => p > 0);

  const builderMedian = computeMedian(builderPSFs);
  const globalMedian = computeMedian(globalPSFs);

  if (globalMedian === 0) return 1.0;
  const ratio = builderMedian / globalMedian;
  return Math.min(Math.max(ratio, 0.8), 1.4);
}

// ─── 4. Theme Grade Multiplier ────────────────────────────────────────────────

export function computeThemeGradeMultiplier(
  project: string,
  builder: string,
): number {
  const projKey = project.toLowerCase();
  const builderKey = builder.toLowerCase();

  // Check if tagged as Design-Exclusive in training data
  const allData = [
    ...southBangaloreApartments,
    ...southBangaloreVillas,
    ...southBangalorePlots,
  ];
  const designExclusive = allData.filter(
    (r) => r.themeTier === "Design-Exclusive",
  );
  const standardRecs = allData.filter(
    (r) => !r.themeTier || r.themeTier === "Standard",
  );

  const isDesignExclusive = designExclusive.some(
    (r) =>
      r.project.toLowerCase().includes(projKey) ||
      (projKey && r.builder.toLowerCase().includes(builderKey)),
  );

  if (!isDesignExclusive) return 1.0;

  if (designExclusive.length >= 5 && standardRecs.length >= 10) {
    const dePSFs = designExclusive.map(getPSF).filter((p) => p > 0);
    const stdPSFs = standardRecs.map(getPSF).filter((p) => p > 0);
    if (stdPSFs.length > 0) {
      const deMedian = computeMedian(dePSFs);
      const stdMedian = computeMedian(stdPSFs);
      if (stdMedian > 0)
        return Math.min(Math.max(deMedian / stdMedian, 1.2), 1.6);
    }
  }

  // Default Design-Exclusive premium
  if (
    projKey.includes("learning to fly") ||
    projKey.includes("sparkling springs") ||
    projKey.includes("crystal meadows")
  )
    return 1.5;
  if (projKey.includes("napa valley") || projKey.includes("cityville"))
    return 1.45;
  return 1.3;
}

// ─── 5. RTMI Premium ──────────────────────────────────────────────────────────

export function computeRTMIPremium(
  projectMaturityYears: number,
  occupancyRate: number,
): number {
  if (projectMaturityYears < 5 || occupancyRate < 0.9) return 1.0;

  // Derive from resale vs new-launch PSF gap for mature projects
  const resaleRecs = southBangaloreApartments.filter(
    (r) => r.isResale && !r.isDistress,
  );
  const newLaunchRecs = southBangaloreApartments.filter(
    (r) => !r.isResale && !r.isDistress,
  );

  if (resaleRecs.length >= 10 && newLaunchRecs.length >= 10) {
    const resaleMedian = computeMedian(resaleRecs.map(getPSF));
    const newMedian = computeMedian(newLaunchRecs.map(getPSF));
    if (newMedian > 0) {
      const ratio = resaleMedian / newMedian;
      // Mature projects: 10% premium over locality median per batch strategy
      return Math.min(Math.max(ratio * 1.0, 1.05), 1.15);
    }
  }

  return 1.1; // default RTMI premium
}

// ─── 6. Prestige Southern Star Effect ────────────────────────────────────────

export function computePrestigeSouthernStarEffect(
  locality: string,
  builder: string,
): {
  isPrestigeStar: boolean;
  localityBaseline: number;
  gradeThreshold: number;
} {
  const locKey = locality.toLowerCase();
  const builderKey = builder.toLowerCase();
  const isPrestigeStar =
    (locKey.includes("begur") || locKey.includes("akshayanagar")) &&
    builderKey.includes("prestige");

  if (!isPrestigeStar)
    return { isPrestigeStar: false, localityBaseline: 0, gradeThreshold: 0 };

  // Derive baseline from Southern Star records (our anchor)
  const starRecs = southBangaloreApartments.filter(
    (r) =>
      r.builder.toLowerCase().includes("prestige") &&
      r.project.toLowerCase().includes("southern star") &&
      !r.isDistress,
  );

  if (starRecs.length < 3)
    return {
      isPrestigeStar: true,
      localityBaseline: 12200,
      gradeThreshold: 9516,
    };

  const psfs = starRecs.map(getPSF).filter((p) => p > 0);
  const localityBaseline = Math.round(computeMedian(psfs));
  const gradeThreshold = Math.round(localityBaseline * 0.78); // 78% of baseline = Grade-B threshold

  return { isPrestigeStar: true, localityBaseline, gradeThreshold };
}

// ─── 7. Plot Tier Assessment ──────────────────────────────────────────────────

export function computePlotTierAssessment(
  builder: string,
  project: string,
  locality: string,
): string {
  const builderKey = builder.toLowerCase();
  const projKey = project.toLowerCase();
  const locKey = locality.toLowerCase();

  // Prestige King's County in Electronic City = Tier-1
  if (projKey.includes("king's county") && builderKey.includes("prestige"))
    return "Tier-1";
  if (projKey.includes("godrej reserve") && builderKey.includes("godrej"))
    return "Tier-1";
  if (projKey.includes("great acres") && builderKey.includes("prestige"))
    return "Premium";
  if (projKey.includes("suncrest") && builderKey.includes("prestige"))
    return "Premium";
  if (projKey.includes("malhaar") && builderKey.includes("shriram"))
    return "Premium";

  // Grade-A builder gated = Premium
  const gradeABuilders = [
    "prestige",
    "sobha",
    "brigade",
    "godrej",
    "puravankara",
    "sattva",
    "tvs emerald",
  ];
  if (gradeABuilders.some((b) => builderKey.includes(b))) return "Premium";

  // BDA layouts
  if (builderKey.includes("bda")) return "BDA-Approved";

  // STRR frontage in Chandapura/Sarjapur = connectivity-premium standard
  if (
    (locKey.includes("chandapura") || locKey.includes("sarjapur")) &&
    projKey.includes("strr")
  )
    return "Connectivity-Premium";

  // Local gated = Standard
  if (
    projKey.includes("gated") ||
    projKey.includes("layout") ||
    projKey.includes("society")
  )
    return "Standard";

  return "Open-Market";
}

// ─── 8. Guidance Value Calibration ───────────────────────────────────────────

export function applyGuidanceValueCalibration(
  soldPrice: number,
  year: number,
  month: number,
): {
  calibratedPrice: number;
  guidanceValueFlag: boolean;
  taxComponentNote: string;
} {
  // April 2026 onwards: 10–15% guidance value hike already reflected in registry prices
  const isPostHike = year === 2026 && month >= 4;

  return {
    calibratedPrice: soldPrice, // price unchanged — already reflects hike
    guidanceValueFlag: isPostHike,
    taxComponentNote: isPostHike
      ? "Post-April 2026 Guidance Value Hike: Stamp duty & registration components ~10–15% higher"
      : "",
  };
}

// ─── 9. Outlier Threshold ─────────────────────────────────────────────────────

export function computeOutlierThreshold(
  records: SouthBangaloreRecord[],
  project: string,
): number {
  const projKey = project.toLowerCase().trim();
  const now = new Date().getFullYear();

  // Same project, last 12 months
  const projectRecs = records.filter(
    (r) => r.project.toLowerCase().includes(projKey) && r.year >= now - 1,
  );

  if (projectRecs.length >= 3) {
    const psfs = projectRecs.map(getPSF).filter((p) => p > 0);
    const medianPSF = computeMedian(psfs);
    return medianPSF * 0.4; // drop records below 40% of project median
  }

  // Fallback: locality median
  const localityKey = records[0]?.locality?.toLowerCase() ?? "";
  const localityRecs = records.filter(
    (r) => fuzzyMatchLocality(r.locality, localityKey) && r.year >= now - 1,
  );
  if (localityRecs.length >= 3) {
    const psfs = localityRecs.map(getPSF).filter((p) => p > 0);
    const medianPSF = computeMedian(psfs);
    return medianPSF * 0.4;
  }

  return 2000; // Absolute floor per Anekal/Jigani Zonal Floor guidance
}

// ─── 10. Size Inversion Adjustment ───────────────────────────────────────────

export function computeSizeInversionAdjustment(
  areaSqft: number,
  locality: string,
): number {
  const locKey = locality.toLowerCase();
  const isITHub =
    locKey.includes("electronic city") || locKey.includes("kanakapura");

  // Learn size inversion from training data — small units have higher PSF
  const data = southBangaloreApartments.filter(
    (r) => !r.isDistress && !r.isCarpet,
  );

  const smallUnits = data.filter((r) => getEffectiveArea(r) < 800);
  const midUnits = data.filter(
    (r) => getEffectiveArea(r) >= 800 && getEffectiveArea(r) < 1500,
  );

  if (smallUnits.length >= 5 && midUnits.length >= 5) {
    const smallPSF = computeMedian(smallUnits.map(getPSF));
    const midPSF = computeMedian(midUnits.map(getPSF));
    if (midPSF > 0 && areaSqft < 800 && isITHub) {
      const inversionFactor = smallPSF / midPSF;
      return Math.min(Math.max(inversionFactor, 1.05), 1.3);
    }
  }

  // Micro-compact in IT hubs: aggressive premium
  if (isITHub && areaSqft < 600) return 1.25;
  if (isITHub && areaSqft < 800) return 1.15;
  if (areaSqft < 600) return 1.1;

  return 1.0;
}

// ─── 11. Sky Series Amenity Score ─────────────────────────────────────────────

export function computeSkySeriesAmenityScore(projectName: string): number {
  const key = projectName.toLowerCase();
  const isSky =
    key.includes("sky sanman") ||
    key.includes("sky blossom") ||
    key.includes("sky stanza") ||
    key.includes("sky sukruth");
  if (!isSky) return 1.0;

  // Derive from data: Sky series PSF vs other DS-MAX non-Sky projects
  const skyRecs = southBangaloreApartments.filter(
    (r) =>
      r.builder.toLowerCase().includes("ds-max") &&
      r.project.toLowerCase().includes("sky") &&
      !r.isDistress,
  );
  const otherDSMax = southBangaloreApartments.filter(
    (r) =>
      r.builder.toLowerCase().includes("ds-max") &&
      !r.project.toLowerCase().includes("sky") &&
      !r.isDistress,
  );

  if (skyRecs.length >= 5 && otherDSMax.length >= 3) {
    const skyMedian = computeMedian(skyRecs.map(getPSF));
    const otherMedian = computeMedian(otherDSMax.map(getPSF));
    if (otherMedian > 0)
      return Math.min(Math.max(skyMedian / otherMedian, 1.05), 1.25);
  }

  return 1.15; // default Sky series 15% amenity premium per batch strategy
}

// ─── 12. Phase Reset Coefficient ─────────────────────────────────────────────

export function computePhaseResetCoefficient(
  builder: string,
  year: number,
): number {
  if (year < 2026) return 1.0;

  const gradeABuilders = [
    "prestige",
    "sobha",
    "brigade",
    "godrej",
    "puravankara",
    "sattva",
    "shapoorji",
  ];
  const builderKey = builder.toLowerCase();
  const isGradeA = gradeABuilders.some((b) => builderKey.includes(b));
  if (!isGradeA) return 1.0;

  // 2026 Grade-A new phase launches should dominate as locality baseline
  // Derive recency weight multiplier from data
  const data2026 = southBangaloreApartments.filter(
    (r) =>
      r.year === 2026 &&
      !r.isDistress &&
      !r.isResale &&
      gradeABuilders.some((b) => r.builder.toLowerCase().includes(b)),
  );
  const dataPre2026 = southBangaloreApartments.filter(
    (r) => r.year < 2026 && !r.isDistress,
  );

  if (data2026.length >= 5 && dataPre2026.length >= 5) {
    const psf2026 = computeMedian(data2026.map(getPSF));
    const psfPre = computeMedian(dataPre2026.map(getPSF));
    if (psfPre > 0) return Math.min(Math.max(psf2026 / psfPre, 1.0), 1.35);
  }

  return 1.15; // default 2026 Grade-A phase reset
}

// ─── Main Orchestration ───────────────────────────────────────────────────────

export interface SouthAdjustmentResult {
  totalAdjustmentFactor: number;
  metroBonus: number;
  strrBonus: number;
  builderGrade: number;
  themeGrade: number;
  rtmiPremium: number;
  guidanceValueFlag: boolean;
  sizeInversionFactor: number;
  skySeriesFactor: number;
  outlierExclusions: number;
}

export function computeSouthBangaloreAdjustments(
  input: ValuationInput,
): SouthAdjustmentResult {
  const locality = input.locality ?? "";
  const builder = input.builder ?? "";
  const project = input.projectName ?? "";
  const propertyType = input.propertyType ?? "apartment";
  const areaSqft = input.area ?? 1000;

  // Carpet-to-SBA conversion at input boundary
  const effectiveSqft =
    (input as unknown as Record<string, unknown>).areaMeasurement === "carpet"
      ? Math.round(areaSqft * 1.36)
      : areaSqft;
  void effectiveSqft; // used by caller for normalization

  // Compute individual factors
  const metroBonus = computeMetroConnectivityFactor(locality, 0);
  const strrBonus = computeSTRRBonus(locality);
  const builderGrade = computeBuilderGradePremium(builder, propertyType);
  const themeGrade = computeThemeGradeMultiplier(project, builder);
  const rtmiPremium = computeRTMIPremium(0, 0.8); // default — property age not always available
  const sizeInversionFactor = computeSizeInversionAdjustment(
    areaSqft,
    locality,
  );
  const skySeriesFactor = computeSkySeriesAmenityScore(project);
  const phaseReset = computePhaseResetCoefficient(builder, 2026);

  // Guidance value flag
  const { guidanceValueFlag } = applyGuidanceValueCalibration(
    0,
    new Date().getFullYear(),
    new Date().getMonth() + 1,
  );

  // Outlier estimation from current property type pool
  const data = getDataForType(propertyType);
  const threshold = computeOutlierThreshold(data, project || locality);
  const outlierExclusions = data.filter((r) => getPSF(r) < threshold).length;

  // Design-Exclusive: themeGrade overrides standard adjustments — do not stack with builderGrade
  const effectiveBuilderGrade = themeGrade > 1.15 ? 1.0 : builderGrade;

  // Total combined factor (all multiplicative)
  const combined =
    metroBonus *
    strrBonus *
    effectiveBuilderGrade *
    themeGrade *
    rtmiPremium *
    sizeInversionFactor *
    skySeriesFactor *
    phaseReset;
  const totalAdjustmentFactor = Math.min(Math.max(combined, 0.7), 1.6);

  return {
    totalAdjustmentFactor,
    metroBonus,
    strrBonus,
    builderGrade: effectiveBuilderGrade,
    themeGrade,
    rtmiPremium,
    guidanceValueFlag,
    sizeInversionFactor,
    skySeriesFactor,
    outlierExclusions,
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function fuzzyMatchLocality(a: string, b: string): boolean {
  const ak = a.toLowerCase().trim();
  const bk = b.toLowerCase().trim();
  return ak === bk || ak.includes(bk) || bk.includes(ak);
}

// ─── South Bangalore haversine ────────────────────────────────────────────────

function haversineKmSouth(
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

function getSouthLocalityCoords(
  localityName: string,
): { lat: number; lng: number } | null {
  const key = localityName.toLowerCase().trim();
  if (ALL_LOCALITY_COORDS[key]) return ALL_LOCALITY_COORDS[key];
  for (const [k, v] of Object.entries(ALL_LOCALITY_COORDS)) {
    if (k.includes(key) || key.includes(k)) return v;
  }
  const market = getSouthMicroMarket(localityName);
  if (market) return { lat: market.lat, lng: market.lng };
  return null;
}

// ─── South Outlier Removal (±2 stdDev) ───────────────────────────────────────

/**
 * Remove records where PSF is outside mean ± 2*stdDev.
 * Minimum 3 records retained.
 */
export function filterSouthOutliers(
  records: SouthBangaloreRecord[],
): SouthBangaloreRecord[] {
  if (records.length <= 3) return records;
  const psfs = records.map(getPSF).filter((p) => p > 0);
  if (psfs.length < 3) return records;
  const mean = psfs.reduce((s, v) => s + v, 0) / psfs.length;
  const variance = psfs.reduce((s, v) => s + (v - mean) ** 2, 0) / psfs.length;
  const stdDev = Math.sqrt(variance);
  const lo = mean - 2 * stdDev;
  const hi = mean + 2 * stdDev;
  const filtered = records.filter((r) => {
    const p = getPSF(r);
    return p >= lo && p <= hi;
  });
  return filtered.length >= 3 ? filtered : records.slice(0, 3);
}

// ─── South Weighted Median ────────────────────────────────────────────────────

export function weightedMedianSouth(
  values: number[],
  weights: number[],
): number {
  if (values.length === 0) return 0;
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

// ─── South Micro-Zone (5km radius) ───────────────────────────────────────────

/**
 * Filter South Bangalore records within 5km of the target locality.
 * Fallback: expand to 8km → all records.
 */
export function getSouthMicroZoneRecords(
  locality: string,
  propertyType: string,
): SouthBangaloreRecord[] {
  const data = getDataForType(propertyType);

  const targetCoords = getSouthLocalityCoords(locality);
  if (!targetCoords) return data;

  const { lat: tLat, lng: tLng } = targetCoords;

  const withDist = data.map((r) => {
    const rCoords = getSouthLocalityCoords(r.locality);
    const dist = rCoords
      ? haversineKmSouth(rCoords.lat, rCoords.lng, tLat, tLng)
      : 999;
    return { record: r, dist };
  });

  const within5km = withDist.filter((x) => x.dist <= 5).map((x) => x.record);
  if (within5km.length >= 5) return within5km;

  const within8km = withDist.filter((x) => x.dist <= 8).map((x) => x.record);
  if (within8km.length >= 5) return within8km;

  return data;
}

// ─── South Carpet-to-SBA Normalization ───────────────────────────────────────
// South Bangalore carpet-to-SBA ratio = 0.736 (carpet area is 73.6% of SBA)
const SOUTH_CARPET_TO_SBA_RATIO = 0.736;

/**
 * Returns effective SBA area, normalizing carpet measurements.
 */
export function normalizeSouthCarpetArea(record: SouthBangaloreRecord): number {
  if (record.isCarpet) {
    return getEffectiveArea(record) / SOUTH_CARPET_TO_SBA_RATIO;
  }
  return getEffectiveArea(record);
}

/**
 * Get weighted median PSF for South Bangalore locality using micro-zone + outlier removal.
 * Applies Batch 1-8 intelligence flags as data-driven multipliers.
 * Returns null for East/West localities with no South data.
 */
export function getSouthAveragePSF(
  locality: string,
  propertyType: string,
): number | null {
  // East stubs: no South data
  if (isEastBangalore(locality)) return null;

  const microRecords = getSouthMicroZoneRecords(locality, propertyType);
  if (microRecords.length === 0) return null;

  // Apply carpet normalization then outlier removal
  const cleanRecords = filterSouthOutliers(microRecords);
  if (cleanRecords.length === 0) return null;

  const targetCoords = getSouthLocalityCoords(locality);
  const localityKey = locality.toLowerCase().trim();
  const ptKey = propertyType.toLowerCase();

  const values: number[] = [];
  const weights: number[] = [];

  for (const r of cleanRecords) {
    const effectiveArea = normalizeSouthCarpetArea(r);
    let psf = effectiveArea > 0 ? r.soldPrice / effectiveArea : 0;
    if (psf <= 0) continue;

    // Recency weight: 2026 records get highest weight (5.0); 2025 = 2.0; prior = 1.0
    const recencyW = r.year >= 2026 ? 5.0 : r.year >= 2025 ? 2.0 : 1.0;

    // Distance weight
    let distW = 1.0;
    if (targetCoords) {
      const rCoords = getSouthLocalityCoords(r.locality);
      if (rCoords) {
        const dist = haversineKmSouth(
          rCoords.lat,
          rCoords.lng,
          targetCoords.lat,
          targetCoords.lng,
        );
        distW = 1 / (1 + dist ** 2);
      }
    }

    // ── Intelligence flag multipliers (data-driven, from Batch 1-8 synthesis) ──

    // Batch 1: Green Line Metro 500m premium for residential (apartments/villas)
    if (
      r.connectivityBonus &&
      (ptKey === "apartment" || ptKey.includes("apart"))
    ) {
      const market = getSouthMicroMarket(r.locality);
      if (market?.hasMetroAccess && market.metroLine === "Green") {
        psf = Math.round(
          psf * (1 + SOUTH_INTELLIGENCE.green_line_metro_500m_premium),
        );
      }
    }

    // Batch 7: BTM 2nd Stage / Silk Board proximity plot premium
    if (
      (localityKey.includes("btm") || localityKey.includes("btm 2nd")) &&
      (ptKey === "plot" || ptKey.includes("plot"))
    ) {
      psf = Math.round(
        psf * (1 + SOUTH_INTELLIGENCE.btm_silk_board_proximity_premium),
      );
    }

    // Batch 8: Thalaghattapura parity (0.9x JP Nagar 7th phase) — cap the PSF
    if (
      localityKey.includes("thalagha") ||
      localityKey.includes("thalaghatta")
    ) {
      const jpNagar7 = cleanRecords
        .filter((x) => x.locality.toLowerCase().includes("jp nagar 7"))
        .map((x) =>
          getEffectiveArea(x) > 0 ? x.soldPrice / getEffectiveArea(x) : 0,
        )
        .filter((v) => v > 0);
      if (jpNagar7.length > 0) {
        const jpNagarMedian =
          jpNagar7.reduce((a, b) => a + b, 0) / jpNagar7.length;
        const parityPsf = Math.round(
          jpNagarMedian * SOUTH_INTELLIGENCE.thalaghattapura_parity,
        );
        if (parityPsf > 0 && psf > parityPsf) psf = parityPsf;
      }
    }

    // Batch 3: Basavanagudi heritage multiplier (plots/land in this zone are 50% above adj)
    if (
      localityKey.includes("basavanagudi") &&
      (ptKey === "plot" || ptKey.includes("plot"))
    ) {
      psf = Math.round(
        psf * SOUTH_INTELLIGENCE.basavanagudi_heritage_multiplier,
      );
    }

    // Batch 1: Commercial ceiling caps — absolute limits from city data
    if (ptKey === "commercial" || ptKey.includes("commercial")) {
      if (
        localityKey.includes("jayanagar") &&
        psf > SOUTH_INTELLIGENCE.jayanagar_commercial_ceiling_psf
      ) {
        psf = SOUTH_INTELLIGENCE.jayanagar_commercial_ceiling_psf;
      }
      if (localityKey.includes("dvg") || localityKey.includes("basavanagudi")) {
        if (psf > SOUTH_INTELLIGENCE.dvg_road_commercial_ceiling_psf) {
          psf = SOUTH_INTELLIGENCE.dvg_road_commercial_ceiling_psf;
        }
      }
    }

    values.push(psf);
    weights.push(recencyW * distW);
  }

  if (values.length === 0) return null;
  return weightedMedianSouth(values, weights);
}
