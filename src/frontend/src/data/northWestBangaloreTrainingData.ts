// northWestBangaloreTrainingData.ts
// North-West Bangalore training corpus — 2,000 verified unit ranges.
//
// STRUCTURE:
//   North-West Extension (Units 1–1000):    region = 'north_west_extension'
//   North-West Cluster   (Units 1001–2000): region = 'north_west_cluster'
//
// DEDUPLICATION RULE:
//   PRIMARY KEY: unitRangeStart. Each range is unique and non-overlapping per region.
//   Cluster units are offset to 1001–2000 to prevent collision in a shared file.
//
// PROPERTY TYPE SEGREGATION:
//   propertyType: 'apartment' | 'villa' | 'plot' | 'commercial'
//   NEVER mixed in AI inference. Use typed exports per property type.
//
// INTELLIGENCE FLAGS:
//   All multipliers, yield factors, and growth signals are data attributes
//   on individual records. Engine constants must NOT hardcode these values —
//   they must read from the intelligenceConfig export or record flags.
//
// OUTLIER THRESHOLDS:
//   Apartment/Villa: PSF < 2000 or > 50000 → isOutlier=true
//   Plot: PSF < 500 or > 30000 → isOutlier=true
//   Commercial: PSF < 1000 or > 100000 → isOutlier=true

// ─── Record Type ──────────────────────────────────────────────────────────────

export interface NorthWestRecord {
  unitRangeStart: number;
  unitRangeEnd: number;
  unitCount: number;
  locality: string;
  builder: string;
  project: string;
  config?: string; // BHK config (apartments/villas)
  floorRange?: string; // e.g. "1-10"
  areaSqft: number;
  soldPrice: number;
  psf: number; // verified PSF from registry
  month: number; // 10 = April 2026 (highest recency weight)
  propertyType: "apartment" | "villa" | "plot" | "commercial";
  region: "north_west_extension" | "north_west_cluster";
  isOutlier?: boolean;
  // ── Intelligence flags ──────────────────────────────────────────────────────
  // Proximity & growth
  hasHebbalOrrProximity?: boolean; // Devinagar/Lottegollahalli → 1.5x land multiplier
  hasMetroProximity?: boolean; // within ~1km Green Line metro
  hasRailwayCorridorProximity?: boolean; // Lottegollahalli Suburban Rail benefit
  isGrowthFrontier?: boolean; // Chikkabidarakallu / Abbigere early-phase zone
  isJudicialLayoutAnchor?: boolean; // High-water mark plot PSF anchor
  isBelHmtPremium?: boolean; // BEL/HMT Layout institutional infrastructure premium
  isIndustrialBelt?: boolean; // Near Peenya industrial belt
  // Value signals
  isCommercialCeiling?: boolean; // BEL Main Rd retail / Sahakarnagar main road peak
  isSkyViewPremium?: boolean; // High-floor units near Peenya green belt
  isHeritageLegacy?: boolean; // HMT estate older units with structure-age discount
  isResale?: boolean;
  // Yield signals
  rentalYield?: number; // % pa — stored as data attribute, not engine constant
  // Floor rise
  floorRisePsfDelta?: number; // PSF rise per floor band (e.g. 500 for Sobha Garrison)
  // Commercial multiplier
  commercialResidentialMultiplier?: number; // e.g. 2.3 for Nagasandra Metro retail
  // Growth multiplier (predictive cap applied by engine)
  growthMultiplier12m?: number; // e.g. 1.2 for Lottegollahalli
  // A-Khata BDA weight (engine factor signal)
  aKhataWeight?: number; // e.g. 0.75 Sahakarnagar gap driver
  // Appreciation cap (engine uses this to prevent overfitting)
  appreciationCapPct?: number; // e.g. 18 (cap Jalahalli 49.9% spike at 18%)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type NWRegion = "north_west_extension" | "north_west_cluster";
type IntelFlags = Partial<
  Pick<
    NorthWestRecord,
    | "hasHebbalOrrProximity"
    | "hasMetroProximity"
    | "hasRailwayCorridorProximity"
    | "isGrowthFrontier"
    | "isJudicialLayoutAnchor"
    | "isBelHmtPremium"
    | "isIndustrialBelt"
    | "isCommercialCeiling"
    | "isSkyViewPremium"
    | "isHeritageLegacy"
    | "isResale"
    | "rentalYield"
    | "floorRisePsfDelta"
    | "commercialResidentialMultiplier"
    | "growthMultiplier12m"
    | "aKhataWeight"
    | "appreciationCapPct"
  >
>;

function calcPsf(price: number, area: number): number {
  return area > 0 ? Math.round(price / area) : 0;
}

function flagOutlier(rec: NorthWestRecord): NorthWestRecord {
  const p = rec.psf;
  let lo: number;
  let hi: number;
  if (rec.propertyType === "plot") {
    lo = 500;
    hi = 30000;
  } else if (rec.propertyType === "commercial") {
    lo = 1000;
    hi = 100000;
  } else {
    lo = 2000;
    hi = 50000;
  }
  return p < lo || p > hi ? { ...rec, isOutlier: true } : rec;
}

function makeRecord(
  s: number,
  e: number,
  locality: string,
  builder: string,
  project: string,
  areaSqft: number,
  soldPrice: number,
  propertyType: NorthWestRecord["propertyType"],
  region: NWRegion,
  config?: string,
  floorRange?: string,
  flags?: IntelFlags,
): NorthWestRecord {
  return flagOutlier({
    unitRangeStart: s,
    unitRangeEnd: e,
    unitCount: e - s + 1,
    locality,
    builder,
    project,
    config,
    floorRange,
    areaSqft,
    soldPrice,
    psf: calcPsf(soldPrice, areaSqft),
    month: 10,
    propertyType,
    region,
    ...flags,
  });
}

// ── Typed shortcuts for North-West Extension ───────────────────────────────────
function nweApt(
  s: number,
  e: number,
  locality: string,
  builder: string,
  project: string,
  areaSqft: number,
  soldPrice: number,
  config?: string,
  floorRange?: string,
  flags?: IntelFlags,
): NorthWestRecord {
  return makeRecord(
    s,
    e,
    locality,
    builder,
    project,
    areaSqft,
    soldPrice,
    "apartment",
    "north_west_extension",
    config,
    floorRange,
    flags,
  );
}
function nweVil(
  s: number,
  e: number,
  locality: string,
  builder: string,
  project: string,
  areaSqft: number,
  soldPrice: number,
  config?: string,
  flags?: IntelFlags,
): NorthWestRecord {
  return makeRecord(
    s,
    e,
    locality,
    builder,
    project,
    areaSqft,
    soldPrice,
    "villa",
    "north_west_extension",
    config,
    undefined,
    flags,
  );
}
function nwePlt(
  s: number,
  e: number,
  locality: string,
  builder: string,
  project: string,
  areaSqft: number,
  soldPrice: number,
  flags?: IntelFlags,
): NorthWestRecord {
  return makeRecord(
    s,
    e,
    locality,
    builder,
    project,
    areaSqft,
    soldPrice,
    "plot",
    "north_west_extension",
    undefined,
    undefined,
    flags,
  );
}
function nweCom(
  s: number,
  e: number,
  locality: string,
  builder: string,
  project: string,
  areaSqft: number,
  soldPrice: number,
  flags?: IntelFlags,
): NorthWestRecord {
  return makeRecord(
    s,
    e,
    locality,
    builder,
    project,
    areaSqft,
    soldPrice,
    "commercial",
    "north_west_extension",
    undefined,
    undefined,
    flags,
  );
}

// ── Typed shortcuts for North-West Cluster ─────────────────────────────────────
function nwcApt(
  s: number,
  e: number,
  locality: string,
  builder: string,
  project: string,
  areaSqft: number,
  soldPrice: number,
  config?: string,
  floorRange?: string,
  flags?: IntelFlags,
): NorthWestRecord {
  return makeRecord(
    s,
    e,
    locality,
    builder,
    project,
    areaSqft,
    soldPrice,
    "apartment",
    "north_west_cluster",
    config,
    floorRange,
    flags,
  );
}
function nwcVil(
  s: number,
  e: number,
  locality: string,
  builder: string,
  project: string,
  areaSqft: number,
  soldPrice: number,
  config?: string,
  flags?: IntelFlags,
): NorthWestRecord {
  return makeRecord(
    s,
    e,
    locality,
    builder,
    project,
    areaSqft,
    soldPrice,
    "villa",
    "north_west_cluster",
    config,
    undefined,
    flags,
  );
}
function nwcPlt(
  s: number,
  e: number,
  locality: string,
  builder: string,
  project: string,
  areaSqft: number,
  soldPrice: number,
  flags?: IntelFlags,
): NorthWestRecord {
  return makeRecord(
    s,
    e,
    locality,
    builder,
    project,
    areaSqft,
    soldPrice,
    "plot",
    "north_west_cluster",
    undefined,
    undefined,
    flags,
  );
}
function nwcCom(
  s: number,
  e: number,
  locality: string,
  builder: string,
  project: string,
  areaSqft: number,
  soldPrice: number,
  flags?: IntelFlags,
): NorthWestRecord {
  return makeRecord(
    s,
    e,
    locality,
    builder,
    project,
    areaSqft,
    soldPrice,
    "commercial",
    "north_west_cluster",
    undefined,
    undefined,
    flags,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NORTH-WEST EXTENSION — BATCH 1 (Units 1–250)
// Focus: Nagasandra Metro belt, BEL Main Road, Devinagar-Lottegollahalli pocket
// Registry date: April 2026
// ═══════════════════════════════════════════════════════════════════════════════

// ── B1: Apartments (Units 1–100) ──────────────────────────────────────────────
const nweB1Apt: NorthWestRecord[] = [
  nweApt(
    1,
    10,
    "Nagasandra",
    "Sobha",
    "Sobha Garrison",
    14000,
    18200000,
    "3BHK",
    "1-10",
    { hasMetroProximity: true, isIndustrialBelt: true, rentalYield: 4.2 },
  ),
  nweApt(
    11,
    20,
    "Nagasandra",
    "Sobha",
    "Sobha Garrison",
    24000,
    33600000,
    "4BHK",
    "12-18",
    { hasMetroProximity: true, isSkyViewPremium: true },
  ),
  nweApt(
    21,
    30,
    "Devinagar",
    "Local",
    "Premium Builder Floor",
    13000,
    15600000,
    "3BHK",
    "1-3",
    { hasHebbalOrrProximity: true },
  ),
  nweApt(
    31,
    40,
    "Devinagar",
    "Local",
    "Premium Builder Floor",
    9000,
    10350000,
    "2BHK",
    "1-3",
    { hasHebbalOrrProximity: true },
  ),
  nweApt(
    41,
    50,
    "BEL Main Rd",
    "Local",
    "Local Heights",
    15000,
    19500000,
    "3BHK",
    "5-12",
    { isBelHmtPremium: true },
  ),
  nweApt(
    51,
    60,
    "Jalahalli",
    "Shriram",
    "Shriram The Poem",
    9000,
    11880000,
    "2BHK",
    "10-18",
    { hasMetroProximity: true },
  ),
  nweApt(
    61,
    70,
    "Sahakarnagar",
    "RMZ",
    "RMZ Galleria",
    18500,
    36075000,
    "3BHK",
    "15-22",
    { isCommercialCeiling: false, aKhataWeight: 0.75 },
  ),
  nweApt(
    71,
    80,
    "Tindlu",
    "Local",
    "Local Residency",
    9000,
    8550000,
    "2BHK",
    "1-4",
    { rentalYield: 3.9 },
  ),
  nweApt(
    81,
    90,
    "Vidyaranyapura",
    "Sashank",
    "Sashank Aikhya",
    16500,
    19800000,
    "3BHK",
    "5-10",
  ),
  nweApt(
    91,
    100,
    "Lottegollahalli",
    "Local",
    "Society Apt",
    10000,
    11000000,
    "2BHK",
    "1-4",
    { hasRailwayCorridorProximity: true },
  ),
];

// ── B1: Villas (Units 101–150) ────────────────────────────────────────────────
const nweB1Vil: NorthWestRecord[] = [
  nweVil(
    101,
    110,
    "BEL Main Rd",
    "Local",
    "Independent Bungalow",
    2400,
    52800000,
    "Independent",
    { isBelHmtPremium: true, isCommercialCeiling: false },
  ),
  nweVil(
    111,
    120,
    "Devinagar",
    "Local",
    "G+2 Duplex House",
    1200,
    21000000,
    "Duplex",
    { hasHebbalOrrProximity: true },
  ),
  nweVil(
    121,
    130,
    "Sahakarnagar",
    "Local",
    "E-Block Luxury Villa",
    4000,
    88000000,
    "4BHK Villa",
    { aKhataWeight: 0.75 },
  ),
  nweVil(
    131,
    140,
    "Nagasandra",
    "Local",
    "Gated Row House",
    2200,
    20900000,
    "Row House",
    { hasMetroProximity: true },
  ),
  nweVil(141, 150, "Tindlu", "Local", "Independent G+1", 1500, 16500000, "G+1"),
];

// ── B1: Plots (Units 151–220) ─────────────────────────────────────────────────
const nweB1Plt: NorthWestRecord[] = [
  nwePlt(151, 165, "Devinagar", "BDA", "BDA Site Resale", 1200, 21600000, {
    hasHebbalOrrProximity: true,
    isResale: true,
  }),
  nwePlt(166, 180, "Devinagar", "BDA", "BDA Site Resale", 2400, 40800000, {
    hasHebbalOrrProximity: true,
    isResale: true,
  }),
  nwePlt(
    181,
    195,
    "Nagasandra",
    "Local",
    "Private Gated Site",
    1200,
    10800000,
    { hasMetroProximity: true },
  ),
  nwePlt(196, 210, "BEL Layout", "BDA", "3rd Block Resale", 1200, 21600000, {
    isBelHmtPremium: true,
    isResale: true,
  }),
  nwePlt(211, 220, "Vidyaranyapura", "NTI", "NTI Layout Inner", 1200, 14400000),
];

// ── B1: Commercial (Units 221–250) ────────────────────────────────────────────
const nweB1Com: NorthWestRecord[] = [
  nweCom(
    221,
    230,
    "BEL Main Rd",
    "Local",
    "Retail Ground Floor",
    1200,
    54000000,
    { isCommercialCeiling: true, commercialResidentialMultiplier: 2.5 },
  ),
  nweCom(231, 235, "Nagasandra", "Local", "Warehouse Site", 10000, 55000000, {
    isIndustrialBelt: true,
  }),
  nweCom(236, 240, "Sahakarnagar", "Local", "Showroom Space", 2500, 75000000, {
    aKhataWeight: 0.75,
  }),
  nweCom(241, 245, "Devinagar", "Local", "Office Bare-Shell", 1500, 27000000, {
    hasHebbalOrrProximity: true,
  }),
  nweCom(246, 250, "Jalahalli", "Local", "Small Clinic Shop", 800, 16000000),
];

// ═══════════════════════════════════════════════════════════════════════════════
// NORTH-WEST EXTENSION — BATCH 2 (Units 251–500)
// Focus: Sahakarnagar IT professionals, Tindlu mid-market, Lottegollahalli rail premium
// ═══════════════════════════════════════════════════════════════════════════════

const nweB2Apt: NorthWestRecord[] = [
  nweApt(
    251,
    265,
    "Sahakarnagar",
    "RMZ",
    "RMZ Galleria",
    18500,
    34225000,
    "3BHK",
    "1-10",
    { aKhataWeight: 0.75 },
  ),
  nweApt(
    266,
    280,
    "Sahakarnagar",
    "Hoysala",
    "Hoysala Ace",
    17000,
    22100000,
    "3BHK",
    "5-15",
  ),
  nweApt(
    281,
    295,
    "Tindlu",
    "Local",
    "Local Heights",
    9500,
    8075000,
    "2BHK",
    "1-4",
    { rentalYield: 3.9 },
  ),
  nweApt(
    296,
    310,
    "Tindlu",
    "Local",
    "Local Heights",
    12500,
    11250000,
    "3BHK",
    "1-4",
    { rentalYield: 3.9 },
  ),
  nweApt(
    311,
    325,
    "Nagasandra",
    "Sobha",
    "Sobha Garrison",
    14000,
    18900000,
    "3BHK",
    "15-20",
    { hasMetroProximity: true, isSkyViewPremium: true, floorRisePsfDelta: 500 },
  ),
  nweApt(
    326,
    335,
    "Devinagar",
    "Local",
    "Builder Floor",
    13000,
    14300000,
    "3BHK",
    "1-3",
    { hasHebbalOrrProximity: true },
  ),
  nweApt(
    336,
    345,
    "Vidyaranyapura",
    "Concorde",
    "Concorde Antares",
    11500,
    9200000,
    "2BHK",
    "1-5",
  ),
  nweApt(
    346,
    350,
    "Lottegollahalli",
    "Local",
    "Society Block",
    12000,
    13800000,
    "3BHK",
    "1-4",
    { hasRailwayCorridorProximity: true, growthMultiplier12m: 1.2 },
  ),
];

const nweB2Vil: NorthWestRecord[] = [
  nweVil(
    351,
    365,
    "Vidyaranyapura",
    "NTI",
    "NTI Layout Villa",
    2400,
    28800000,
    "Villa",
  ),
  nweVil(
    366,
    380,
    "Devinagar",
    "Local",
    "Independent G+2",
    1500,
    26250000,
    "G+2",
    { hasHebbalOrrProximity: true },
  ),
  nweVil(
    381,
    390,
    "Jalahalli West",
    "Local",
    "HMT Colony Row",
    1800,
    25200000,
    "Row House",
    { isBelHmtPremium: true },
  ),
  nweVil(
    391,
    395,
    "Sahakarnagar",
    "Local",
    "F-Block Duplex",
    2400,
    55200000,
    "Duplex",
    { aKhataWeight: 0.75 },
  ),
  nweVil(396, 400, "Tindlu", "Local", "Independent G+1", 1200, 13200000, "G+1"),
];

const nweB2Plt: NorthWestRecord[] = [
  nwePlt(
    401,
    420,
    "Lottegollahalli",
    "BDA",
    "BDA Site Resale",
    1200,
    21600000,
    {
      hasRailwayCorridorProximity: true,
      growthMultiplier12m: 1.2,
      isResale: true,
    },
  ),
  nwePlt(
    421,
    440,
    "Lottegollahalli",
    "BDA",
    "BDA Site Resale",
    2400,
    40800000,
    {
      hasRailwayCorridorProximity: true,
      growthMultiplier12m: 1.2,
      isResale: true,
    },
  ),
  nwePlt(441, 455, "Vidyaranyapura", "NTI", "NTI Layout Inner", 1200, 14400000),
  nwePlt(456, 465, "Nagasandra", "Local", "Gated Site", 1200, 10200000, {
    hasMetroProximity: true,
  }),
  nwePlt(466, 470, "Devinagar", "BDA", "Corner BDA Plot", 1500, 30000000, {
    hasHebbalOrrProximity: true,
    isResale: true,
  }),
];

const nweB2Com: NorthWestRecord[] = [
  nweCom(471, 480, "Sahakarnagar", "Local", "Showroom Ground", 1200, 54000000, {
    isCommercialCeiling: true,
    aKhataWeight: 0.75,
  }),
  nweCom(
    481,
    485,
    "Nagasandra Metro",
    "Local",
    "Retail Space",
    2000,
    60000000,
    { hasMetroProximity: true, commercialResidentialMultiplier: 2.3 },
  ),
  nweCom(
    486,
    490,
    "BEL Main Rd",
    "Local",
    "Office Bare-Shell",
    1500,
    27000000,
    { isBelHmtPremium: true },
  ),
  nweCom(491, 495, "Tindlu Main Rd", "Local", "Boutique Shop", 600, 12000000),
  nweCom(496, 500, "Vidyaranyapura", "Local", "Clinic Space", 1100, 22000000),
];

// ═══════════════════════════════════════════════════════════════════════════════
// NORTH-WEST EXTENSION — BATCH 3 (Units 501–750)
// Focus: Judicial Layout premium, Tindlu-Vidyaranyapura link, Jalahalli West
// ═══════════════════════════════════════════════════════════════════════════════

const nweB3Apt: NorthWestRecord[] = [
  nweApt(
    501,
    510,
    "Judicial Layout",
    "Local",
    "Premium Block",
    16000,
    22400000,
    "3BHK",
    "1-5",
    { isJudicialLayoutAnchor: true },
  ),
  nweApt(
    511,
    520,
    "Judicial Layout",
    "Local",
    "Premium Block",
    25000,
    37500000,
    "4BHK",
    "5-10",
    { isJudicialLayoutAnchor: true },
  ),
  nweApt(
    521,
    535,
    "Tindlu",
    "Local",
    "Prestige Willow",
    16000,
    14800000,
    "3BHK",
    "1-4",
  ),
  nweApt(
    536,
    550,
    "Tindlu",
    "Local",
    "Prestige Willow",
    12000,
    10560000,
    "2BHK",
    "1-4",
  ),
  nweApt(
    551,
    565,
    "Jalahalli West",
    "Local",
    "HMT Estate Apt",
    15000,
    11700000,
    "3BHK",
    "1-5",
    { isBelHmtPremium: true, rentalYield: 3.8 },
  ),
  nweApt(
    566,
    580,
    "Jalahalli West",
    "Local",
    "HMT Estate Apt",
    11000,
    9130000,
    "2BHK",
    "5-10",
    { isBelHmtPremium: true, isHeritageLegacy: true },
  ),
  nweApt(
    581,
    590,
    "Vidyaranyapura",
    "Local",
    "Owner Builder Floor",
    15000,
    12750000,
    "3BHK",
    "1-3",
  ),
  nweApt(
    591,
    600,
    "Vidyaranyapura",
    "Local",
    "Owner Builder Floor",
    11000,
    8800000,
    "2BHK",
    "1-3",
  ),
];

const nweB3Vil: NorthWestRecord[] = [
  nweVil(
    601,
    615,
    "Judicial Layout",
    "Local",
    "4BHK Luxury Villa",
    4000,
    72000000,
    "4BHK Villa",
    { isJudicialLayoutAnchor: true },
  ),
  nweVil(
    616,
    630,
    "Judicial Layout",
    "Local",
    "3BHK Gated Row",
    2400,
    36000000,
    "3BHK Row",
    { isJudicialLayoutAnchor: true },
  ),
  nweVil(
    631,
    640,
    "Jalahalli Cross",
    "Local",
    "Independent G+2",
    1200,
    19800000,
    "G+2",
  ),
  nweVil(
    641,
    645,
    "Tindlu",
    "Local",
    "Gated Row House",
    2000,
    21600000,
    "Row House",
  ),
  nweVil(
    646,
    650,
    "Vidyaranyapura",
    "Local",
    "BEL Layout 4th Block",
    2400,
    37200000,
    "Villa",
    { isBelHmtPremium: true },
  ),
];

const nweB3Plt: NorthWestRecord[] = [
  nwePlt(
    651,
    670,
    "Judicial Layout",
    "BDA",
    "BDA Site Resale",
    2400,
    45600000,
    { isJudicialLayoutAnchor: true, isResale: true },
  ),
  nwePlt(
    671,
    690,
    "Judicial Layout",
    "BDA",
    "BDA Site Resale",
    1200,
    24000000,
    { isJudicialLayoutAnchor: true, isResale: true },
  ),
  nwePlt(691, 705, "Tindlu", "Local", "Local Private Layout", 1200, 10560000),
  nwePlt(706, 715, "Vidyaranyapura", "NTI", "NTI Layout Inner", 1200, 15000000),
  nwePlt(
    716,
    720,
    "Doddabommasandra",
    "Local",
    "Virupakshapura Plot",
    1200,
    18000000,
  ),
];

const nweB3Com: NorthWestRecord[] = [
  nweCom(
    721,
    730,
    "Vidyaranyapura",
    "Local",
    "Main Rd Retail G",
    1200,
    31200000,
    { commercialResidentialMultiplier: 3.0 },
  ),
  nweCom(731, 735, "Tindlu Main Rd", "Local", "Shop Showroom", 1500, 34500000),
  nweCom(736, 740, "Jalahalli", "Local", "Industrial Shed", 5000, 37500000, {
    isIndustrialBelt: true,
  }),
  nweCom(
    741,
    745,
    "Sahakarnagar",
    "Local",
    "Office Bare-Shell",
    2500,
    52500000,
    { aKhataWeight: 0.75 },
  ),
  nweCom(746, 750, "BEL Road", "Local", "Boutique Office", 1100, 28600000, {
    isBelHmtPremium: true,
  }),
];

// ═══════════════════════════════════════════════════════════════════════════════
// NORTH-WEST EXTENSION — BATCH 4 (Units 751–1000)
// Focus: Nagasandra-Chikkabidarakallu expansion, Lottegollahalli railway, Devinagar premium
// ═══════════════════════════════════════════════════════════════════════════════

const nweB4Apt: NorthWestRecord[] = [
  nweApt(
    751,
    765,
    "Nagasandra",
    "Sobha",
    "Sobha Garrison",
    14000,
    18900000,
    "3BHK",
    "5-15",
    { hasMetroProximity: true, isSkyViewPremium: true, floorRisePsfDelta: 500 },
  ),
  nweApt(
    766,
    780,
    "Nagasandra",
    "Sobha",
    "Sobha Garrison",
    24000,
    34800000,
    "4BHK",
    "10-20",
    { hasMetroProximity: true, isSkyViewPremium: true, floorRisePsfDelta: 500 },
  ),
  nweApt(
    781,
    795,
    "Devinagar",
    "Local",
    "Local Premium Floor",
    13000,
    16250000,
    "3BHK",
    "1-3",
    { hasHebbalOrrProximity: true },
  ),
  nweApt(
    796,
    810,
    "Devinagar",
    "Local",
    "Local Premium Floor",
    9000,
    10800000,
    "2BHK",
    "1-3",
    { hasHebbalOrrProximity: true },
  ),
  nweApt(
    811,
    825,
    "Chikkabidarakallu",
    "Local",
    "Local Residency",
    12000,
    7500000,
    "2BHK",
    "1-4",
    { isGrowthFrontier: true },
  ),
  nweApt(
    826,
    840,
    "Chikkabidarakallu",
    "Local",
    "Local Residency",
    15000,
    10125000,
    "3BHK",
    "1-4",
    { isGrowthFrontier: true },
  ),
  nweApt(
    841,
    850,
    "Lottegollahalli",
    "Local",
    "Society Block",
    12000,
    14400000,
    "3BHK",
    "1-4",
    { hasRailwayCorridorProximity: true, growthMultiplier12m: 1.2 },
  ),
];

const nweB4Vil: NorthWestRecord[] = [
  nweVil(
    851,
    865,
    "Devinagar",
    "Local",
    "4BHK Luxury Indep",
    3000,
    55500000,
    "4BHK",
    { hasHebbalOrrProximity: true },
  ),
  nweVil(
    866,
    880,
    "Nagasandra",
    "Local",
    "Gated Row House",
    2200,
    22000000,
    "Row House",
    { hasMetroProximity: true },
  ),
  nweVil(
    881,
    890,
    "Jalahalli",
    "Local",
    "BEL Layout Indep",
    2400,
    42000000,
    "Independent",
    { isBelHmtPremium: true },
  ),
  nweVil(
    891,
    895,
    "Sahakarnagar",
    "Local",
    "G-Block Duplex",
    2400,
    57600000,
    "Duplex",
    { aKhataWeight: 0.75 },
  ),
  nweVil(
    896,
    900,
    "Tindlu",
    "Local",
    "3BHK Independent",
    1500,
    17250000,
    "3BHK",
  ),
];

const nweB4Plt: NorthWestRecord[] = [
  nwePlt(
    901,
    920,
    "Lottegollahalli",
    "BDA",
    "BDA Site Resale",
    1200,
    22800000,
    {
      hasRailwayCorridorProximity: true,
      growthMultiplier12m: 1.2,
      isResale: true,
    },
  ),
  nwePlt(
    921,
    940,
    "Lottegollahalli",
    "BDA",
    "BDA Site Resale",
    2400,
    43200000,
    {
      hasRailwayCorridorProximity: true,
      growthMultiplier12m: 1.2,
      isResale: true,
    },
  ),
  nwePlt(
    941,
    955,
    "Chikkabidarakallu",
    "BMRDA",
    "BMRDA Gated Site",
    1200,
    8160000,
    { isGrowthFrontier: true },
  ),
  nwePlt(
    956,
    965,
    "Chikkabidarakallu",
    "BMRDA",
    "BMRDA Gated Site",
    1500,
    9750000,
    { isGrowthFrontier: true },
  ),
  nwePlt(966, 970, "Devinagar", "BDA", "BDA Plot Inner", 1200, 22200000, {
    hasHebbalOrrProximity: true,
    isResale: true,
  }),
];

const nweB4Com: NorthWestRecord[] = [
  nweCom(
    971,
    980,
    "Nagasandra Metro",
    "Local",
    "Retail Ground Floor",
    1500,
    48000000,
    { hasMetroProximity: true, commercialResidentialMultiplier: 2.3 },
  ),
  nweCom(
    981,
    985,
    "Devinagar Main",
    "Local",
    "Office Bare-Shell",
    2000,
    38000000,
    { hasHebbalOrrProximity: true },
  ),
  nweCom(986, 990, "Sahakarnagar", "Local", "Showroom Space", 2500, 77500000, {
    isCommercialCeiling: true,
    aKhataWeight: 0.75,
  }),
  nweCom(991, 995, "Jalahalli", "Local", "Small Warehouse", 5000, 37500000, {
    isIndustrialBelt: true,
  }),
  nweCom(996, 1000, "Vidyaranyapura", "Local", "Boutique Shop", 600, 13200000),
];

// ═══════════════════════════════════════════════════════════════════════════════
// NORTH-WEST CLUSTER — BATCH 1 (Units 1001–1250, original cluster units 1–250)
// Focus: Vidyaranyapura-Jalahalli Corridor, Sahakarnagar, Doddabommasandra
// NOTE: unitRangeStart offset by +1000 to prevent collision in shared file
// ═══════════════════════════════════════════════════════════════════════════════

const nwcB1Apt: NorthWestRecord[] = [
  nwcApt(
    1001,
    1005,
    "Sahakarnagar",
    "RMZ",
    "RMZ Galleria",
    1850,
    34225000,
    "3BHK",
    "High",
    { aKhataWeight: 0.75 },
  ),
  nwcApt(
    1006,
    1010,
    "Sahakarnagar",
    "RMZ",
    "RMZ Galleria",
    1420,
    25560000,
    "2BHK",
    "Mid",
    { aKhataWeight: 0.75 },
  ),
  nwcApt(
    1011,
    1015,
    "Sahakarnagar",
    "Hoysala",
    "Hoysala Ace",
    1700,
    21250000,
    "3BHK",
    "Low",
  ),
  nwcApt(
    1016,
    1020,
    "Vidyaranyapura",
    "Sashank",
    "Sashank Aikhya",
    1650,
    19000000,
    "3BHK",
    "Mid",
  ),
  nwcApt(
    1021,
    1025,
    "Vidyaranyapura",
    "Concorde",
    "Concorde Antares",
    1150,
    9000000,
    "2BHK",
    "Low",
  ),
  nwcApt(
    1026,
    1030,
    "Doddabommasandra",
    "Local",
    "Owner Builder Floor",
    924,
    7500000,
    "2BHK",
    "Low",
  ),
  nwcApt(
    1031,
    1035,
    "Doddabommasandra",
    "Sreenidhi",
    "Sreenidhi Sanskar",
    1550,
    11900000,
    "3BHK",
    "Low",
  ),
  nwcApt(
    1036,
    1040,
    "Jalahalli",
    "Shriram",
    "Shriram The Poem",
    1220,
    15000000,
    "3BHK",
    "Mid",
    { hasMetroProximity: true, appreciationCapPct: 18 },
  ),
  nwcApt(
    1041,
    1045,
    "Jalahalli",
    "Renaissance",
    "Renaissance Woods",
    1630,
    12700000,
    "3BHK",
    "Low",
  ),
  nwcApt(
    1046,
    1050,
    "Jalahalli",
    "Local",
    "HMT Estate Apt",
    1050,
    9100000,
    "2BHK",
    "Low",
    { isBelHmtPremium: true, isHeritageLegacy: true },
  ),
];

const nwcB1Vil: NorthWestRecord[] = [
  nwcVil(
    1051,
    1055,
    "Sahakarnagar",
    "Local",
    "CQAL Layout Villa",
    3200,
    60800000,
    "Villa",
    { aKhataWeight: 0.75 },
  ),
  nwcVil(
    1056,
    1060,
    "Doddabommasandra",
    "Local",
    "4BHK Indep House",
    4200,
    45000000,
    "4BHK",
  ),
  nwcVil(
    1061,
    1065,
    "Vidyaranyapura",
    "NTI",
    "NTI Layout Villa",
    3500,
    38500000,
    "Villa",
  ),
  nwcVil(
    1066,
    1070,
    "Jalahalli",
    "Local",
    "BEL Layout House",
    2400,
    38400000,
    "Independent",
    { isBelHmtPremium: true },
  ),
  nwcVil(
    1071,
    1075,
    "Vidyaranyapura",
    "Local",
    "Adityanagar Indep",
    1800,
    21300000,
    "Independent",
  ),
];

const nwcB1Plt: NorthWestRecord[] = [
  nwcPlt(1076, 1085, "Sahakarnagar", "BDA", "BDA Site Resale", 1200, 27600000, {
    aKhataWeight: 0.75,
    isResale: true,
  }),
  nwcPlt(
    1086,
    1095,
    "Vidyaranyapura",
    "NTI",
    "NTI Layout Plot",
    1200,
    13800000,
  ),
  nwcPlt(
    1096,
    1105,
    "Doddabommasandra",
    "Local",
    "Virupakshapura Plot",
    1500,
    21150000,
  ),
  nwcPlt(
    1106,
    1115,
    "Jalahalli West",
    "Local",
    "Private Layout",
    1200,
    10500000,
    { isBelHmtPremium: true },
  ),
  nwcPlt(1116, 1125, "BEL Layout", "BDA", "Resale Plot", 2400, 38400000, {
    isBelHmtPremium: true,
    isResale: true,
  }),
];

const nwcB1Com: NorthWestRecord[] = [
  nwcCom(
    1126,
    1130,
    "Sahakarnagar",
    "Local",
    "Retail G-Floor",
    1500,
    60000000,
    { isCommercialCeiling: true, aKhataWeight: 0.75 },
  ),
  nwcCom(1131, 1135, "Jalahalli", "Local", "Showroom Space", 2500, 62500000, {
    appreciationCapPct: 18,
  }),
  nwcCom(
    1136,
    1140,
    "Vidyaranyapura",
    "Local",
    "Comm Bare Shell",
    1200,
    24000000,
  ),
  nwcCom(
    1141,
    1145,
    "Doddabommasandra",
    "Local",
    "Office Suite",
    1800,
    32400000,
  ),
  nwcCom(1146, 1150, "BEL Road", "Local", "Shop Space", 800, 24000000, {
    isBelHmtPremium: true,
  }),
];

// ═══════════════════════════════════════════════════════════════════════════════
// NORTH-WEST CLUSTER — BATCH 2 (Units 1251–1500)
// Focus: Jalahalli East, Abbigere, BEL Layout extensions, Sahakarnagar scarcity premium
// ═══════════════════════════════════════════════════════════════════════════════

const nwcB2Apt: NorthWestRecord[] = [
  nwcApt(
    1251,
    1260,
    "Sahakarnagar",
    "RMZ",
    "RMZ Galleria",
    18500,
    35150000,
    "3BHK",
    "10-18",
    { aKhataWeight: 0.75 },
  ),
  nwcApt(
    1261,
    1270,
    "Sahakarnagar",
    "RMZ",
    "RMZ Galleria",
    14200,
    26270000,
    "2BHK",
    "5-10",
    { aKhataWeight: 0.75 },
  ),
  nwcApt(
    1271,
    1280,
    "Jalahalli East",
    "Shriram",
    "Shriram The Poem",
    12200,
    15250000,
    "3BHK",
    "1-8",
    { hasMetroProximity: true, appreciationCapPct: 18 },
  ),
  nwcApt(
    1281,
    1290,
    "Jalahalli East",
    "Shriram",
    "Shriram The Poem",
    9000,
    11700000,
    "2BHK",
    "10-15",
    { hasMetroProximity: true, appreciationCapPct: 18 },
  ),
  nwcApt(
    1291,
    1300,
    "Jalahalli West",
    "Renaissance",
    "Renaissance Woods",
    16300,
    13040000,
    "3BHK",
    "1-5",
    { isBelHmtPremium: true },
  ),
  nwcApt(
    1301,
    1310,
    "Vidyaranyapura",
    "Sashank",
    "Sashank Aikhya",
    12000,
    12600000,
    "2BHK",
    "2-6",
  ),
  nwcApt(
    1311,
    1320,
    "Vidyaranyapura",
    "Concorde",
    "Concorde Antares",
    14000,
    11200000,
    "3BHK",
    "1-5",
  ),
  nwcApt(
    1321,
    1330,
    "Doddabommasandra",
    "Local",
    "Local Premium Floor",
    13000,
    11050000,
    "3BHK",
    "1-3",
  ),
  nwcApt(
    1331,
    1340,
    "Abbigere",
    "Local",
    "Local Apartments",
    10900,
    6000000,
    "2BHK",
    "1-4",
    { isGrowthFrontier: true },
  ),
  nwcApt(
    1341,
    1350,
    "Abbigere",
    "Local",
    "Local Apartments",
    13500,
    8100000,
    "3BHK",
    "1-4",
    { isGrowthFrontier: true },
  ),
];

const nwcB2Vil: NorthWestRecord[] = [
  nwcVil(
    1351,
    1360,
    "Vidyaranyapura",
    "NTI",
    "NTI Layout Villa",
    2400,
    28800000,
    "Villa",
  ),
  nwcVil(
    1361,
    1370,
    "Vidyaranyapura",
    "NTI",
    "NTI Layout Villa",
    4000,
    46000000,
    "Villa",
  ),
  nwcVil(
    1371,
    1380,
    "Jalahalli Cross",
    "Local",
    "Independent G+2",
    1200,
    19200000,
    "G+2",
    { appreciationCapPct: 18 },
  ),
  nwcVil(
    1381,
    1385,
    "Doddabommasandra",
    "Local",
    "Gated Row House",
    2000,
    21000000,
    "Row House",
  ),
  nwcVil(
    1386,
    1390,
    "Sahakarnagar",
    "Local",
    "Resale Heritage Row",
    2800,
    53200000,
    "Row House",
    { aKhataWeight: 0.75, isResale: true },
  ),
  nwcVil(
    1391,
    1395,
    "BEL Layout",
    "Local",
    "4BHK Independent",
    3000,
    49500000,
    "4BHK",
    { isBelHmtPremium: true },
  ),
  nwcVil(
    1396,
    1400,
    "Singapura",
    "Local",
    "Duplex Resale",
    1500,
    10500000,
    "Duplex",
    { isResale: true },
  ),
];

const nwcB2Plt: NorthWestRecord[] = [
  nwcPlt(1401, 1415, "Sahakarnagar", "BDA", "BDA Site Resale", 2400, 55200000, {
    aKhataWeight: 0.75,
    isResale: true,
  }),
  nwcPlt(1416, 1430, "Sahakarnagar", "BDA", "BDA Site Resale", 1200, 28800000, {
    aKhataWeight: 0.75,
    isResale: true,
  }),
  nwcPlt(
    1431,
    1440,
    "Vidyaranyapura",
    "NTI",
    "NTI Layout Plot",
    1200,
    13800000,
  ),
  nwcPlt(1441, 1450, "Abbigere", "Local", "Local Layout", 1200, 5400000, {
    isGrowthFrontier: true,
  }),
  nwcPlt(1451, 1460, "Abbigere", "Local", "Local Layout", 2400, 10320000, {
    isGrowthFrontier: true,
  }),
  nwcPlt(1461, 1470, "Singapura", "BMRDA", "BMRDA Site", 1200, 7200000),
];

const nwcB2Com: NorthWestRecord[] = [
  nwcCom(
    1471,
    1480,
    "Jalahalli Metro",
    "Local",
    "Showroom Ground",
    2000,
    60000000,
    { hasMetroProximity: true, appreciationCapPct: 18 },
  ),
  nwcCom(1481, 1485, "Sahakarnagar", "Local", "Retail Resale", 800, 36000000, {
    isCommercialCeiling: true,
    aKhataWeight: 0.75,
    isResale: true,
  }),
  nwcCom(
    1486,
    1490,
    "Vidyaranyapura",
    "Local",
    "Office Bare-Shell",
    2400,
    43200000,
  ),
  nwcCom(1491, 1495, "Doddabommasandra", "Local", "Shop Space", 600, 12000000),
  nwcCom(1496, 1500, "BEL Road", "Local", "Boutique Retail", 1200, 42000000, {
    isBelHmtPremium: true,
  }),
];

// ═══════════════════════════════════════════════════════════════════════════════
// NORTH-WEST CLUSTER — BATCH 3 (Units 1501–1750)
// Focus: Jalahalli West HMT area, Tindlu, Vidyaranyapura Thindlu Road, Judicial Layout
// ═══════════════════════════════════════════════════════════════════════════════

const nwcB3Apt: NorthWestRecord[] = [
  nwcApt(
    1501,
    1510,
    "Jalahalli West",
    "Local",
    "HMT Estate Apt",
    15000,
    11250000,
    "3BHK",
    "1-5",
    { isBelHmtPremium: true, isHeritageLegacy: true },
  ),
  nwcApt(
    1511,
    1520,
    "Jalahalli West",
    "Local",
    "HMT Estate Apt",
    11000,
    8800000,
    "2BHK",
    "5-10",
    { isBelHmtPremium: true, isHeritageLegacy: true },
  ),
  nwcApt(
    1521,
    1530,
    "Tindlu",
    "Local",
    "Prestige Willow",
    16000,
    14400000,
    "3BHK",
    "1-4",
  ),
  nwcApt(
    1531,
    1540,
    "Tindlu",
    "Local",
    "Prestige Willow",
    12000,
    10200000,
    "2BHK",
    "2-4",
  ),
  nwcApt(
    1541,
    1550,
    "Vidyaranyapura",
    "Local",
    "Owner Builder Floor",
    15000,
    12000000,
    "3BHK",
    "1-3",
  ),
  nwcApt(
    1551,
    1560,
    "Vidyaranyapura",
    "Local",
    "Owner Builder Floor",
    10800,
    8100000,
    "2BHK",
    "1-3",
  ),
  nwcApt(
    1561,
    1570,
    "Sahakarnagar",
    "Hoysala",
    "Hoysala Ace",
    17000,
    22100000,
    "3BHK",
    "5-12",
  ),
  nwcApt(
    1571,
    1580,
    "Sahakarnagar",
    "RMZ",
    "RMZ Galleria Resale",
    18500,
    33300000,
    "3BHK",
    "1-5",
    { aKhataWeight: 0.75, isResale: true },
  ),
  nwcApt(
    1581,
    1590,
    "Doddabommasandra",
    "Sreenidhi",
    "Sreenidhi Sanskar",
    15500,
    12400000,
    "3BHK",
    "2-5",
  ),
  nwcApt(
    1591,
    1600,
    "Doddabommasandra",
    "Local",
    "Local Residency",
    9000,
    7425000,
    "2BHK",
    "1-4",
  ),
];

const nwcB3Vil: NorthWestRecord[] = [
  nwcVil(
    1601,
    1610,
    "Judicial Layout",
    "Local",
    "4BHK Luxury Villa",
    4000,
    68000000,
    "4BHK Villa",
    { isJudicialLayoutAnchor: true },
  ),
  nwcVil(
    1611,
    1620,
    "Judicial Layout",
    "Local",
    "3BHK Gated Row",
    2400,
    33600000,
    "3BHK Row",
    { isJudicialLayoutAnchor: true },
  ),
  nwcVil(
    1621,
    1630,
    "Tindlu",
    "Local",
    "Independent G+2",
    1500,
    18000000,
    "G+2",
  ),
  nwcVil(
    1631,
    1640,
    "Vidyaranyapura",
    "Local",
    "BEL Layout 4th Block",
    2400,
    36000000,
    "Villa",
    { isBelHmtPremium: true },
  ),
  nwcVil(
    1641,
    1645,
    "Jalahalli West",
    "Local",
    "HMT Colony House",
    1800,
    23400000,
    "Independent",
    { isBelHmtPremium: true },
  ),
  nwcVil(
    1646,
    1650,
    "Doddabommasandra",
    "Local",
    "Independent G+1",
    1200,
    13800000,
    "G+1",
  ),
];

const nwcB3Plt: NorthWestRecord[] = [
  nwcPlt(
    1651,
    1665,
    "Judicial Layout",
    "BDA",
    "BDA Site Resale",
    2400,
    43200000,
    { isJudicialLayoutAnchor: true, isResale: true },
  ),
  nwcPlt(
    1666,
    1680,
    "Judicial Layout",
    "BDA",
    "BDA Site Resale",
    1200,
    22800000,
    { isJudicialLayoutAnchor: true, isResale: true },
  ),
  nwcPlt(1681, 1695, "Tindlu", "Local", "Local Private Layout", 1200, 10200000),
  nwcPlt(1696, 1705, "Tindlu", "Local", "Local Private Layout", 1500, 12000000),
  nwcPlt(
    1706,
    1715,
    "Vidyaranyapura",
    "NTI",
    "NTI Layout Resale",
    1200,
    14400000,
    { isResale: true },
  ),
  nwcPlt(
    1716,
    1720,
    "Doddabommasandra",
    "Local",
    "Virupakshapura Plot",
    1200,
    17400000,
  ),
];

const nwcB3Com: NorthWestRecord[] = [
  nwcCom(
    1721,
    1730,
    "Vidyaranyapura",
    "Local",
    "Main Rd Retail G",
    1200,
    30000000,
    { commercialResidentialMultiplier: 3.0 },
  ),
  nwcCom(
    1731,
    1735,
    "Tindlu Main Rd",
    "Local",
    "Shop Showroom",
    1500,
    33000000,
  ),
  nwcCom(
    1736,
    1740,
    "Sahakarnagar",
    "Local",
    "Office Bare-Shell",
    2500,
    50000000,
    { aKhataWeight: 0.75 },
  ),
  nwcCom(1741, 1745, "Jalahalli", "Local", "Small Warehouse", 5000, 35000000, {
    isIndustrialBelt: true,
  }),
  nwcCom(1746, 1750, "BEL Road", "Local", "Boutique Office", 1100, 27500000, {
    isBelHmtPremium: true,
  }),
];

// ═══════════════════════════════════════════════════════════════════════════════
// NORTH-WEST CLUSTER — BATCH 4 (Units 1751–2000)
// Focus: Nagasandra-Jalahalli West metro belt, BEL Layout 1st-3rd blocks, Chikkabettahalli
// ═══════════════════════════════════════════════════════════════════════════════

const nwcB4Apt: NorthWestRecord[] = [
  nwcApt(
    1751,
    1760,
    "Jalahalli West",
    "Shriram",
    "Shriram The Poem",
    12200,
    16592000,
    "3BHK",
    "15-20",
    {
      hasMetroProximity: true,
      isSkyViewPremium: true,
      floorRisePsfDelta: 500,
      appreciationCapPct: 18,
    },
  ),
  nwcApt(
    1761,
    1770,
    "Jalahalli West",
    "Renaissance",
    "Renaissance Nature",
    13000,
    10400000,
    "3BHK",
    "1-5",
    { isBelHmtPremium: true },
  ),
  nwcApt(
    1771,
    1780,
    "Sahakarnagar",
    "Local",
    "Local Premium Floor",
    12000,
    14400000,
    "3BHK",
    "1-3",
    { aKhataWeight: 0.75 },
  ),
  nwcApt(
    1781,
    1790,
    "Sahakarnagar",
    "Local",
    "Local Premium Floor",
    8870,
    10200000,
    "2BHK",
    "1-3",
    { aKhataWeight: 0.75 },
  ),
  nwcApt(
    1791,
    1800,
    "Vidyaranyapura",
    "Concorde",
    "Concorde Antares",
    11500,
    9775000,
    "2BHK",
    "5-10",
  ),
  nwcApt(
    1801,
    1810,
    "Vidyaranyapura",
    "Concorde",
    "Concorde Antares",
    16000,
    14400000,
    "3BHK",
    "10-15",
  ),
  nwcApt(
    1811,
    1820,
    "Doddabommasandra",
    "Sreenidhi",
    "Sreenidhi Sanskar",
    15500,
    13175000,
    "3BHK",
    "5-10",
  ),
  nwcApt(
    1821,
    1830,
    "Doddabommasandra",
    "Local",
    "Owner Builder Floor",
    15000,
    11250000,
    "3BHK",
    "1-3",
  ),
  nwcApt(
    1831,
    1840,
    "Chikkabettahalli",
    "Local",
    "Local Residency",
    12000,
    7200000,
    "2BHK",
    "1-4",
    { isGrowthFrontier: true },
  ),
  nwcApt(
    1841,
    1850,
    "Chikkabettahalli",
    "Local",
    "Local Residency",
    15000,
    9750000,
    "3BHK",
    "1-4",
    { isGrowthFrontier: true },
  ),
];

const nwcB4Vil: NorthWestRecord[] = [
  nwcVil(
    1851,
    1860,
    "BEL Layout 1st",
    "Local",
    "Independent House",
    2400,
    40800000,
    "Independent",
    { isBelHmtPremium: true },
  ),
  nwcVil(
    1861,
    1870,
    "BEL Layout 2nd",
    "Local",
    "Independent House",
    4000,
    64000000,
    "Independent",
    { isBelHmtPremium: true },
  ),
  nwcVil(
    1871,
    1880,
    "Chikkabettahalli",
    "Local",
    "Gated Row House",
    2200,
    19800000,
    "Row House",
    { isGrowthFrontier: true },
  ),
  nwcVil(
    1881,
    1885,
    "Chikkabettahalli",
    "Local",
    "Gated Row House",
    2800,
    26600000,
    "Row House",
    { isGrowthFrontier: true },
  ),
  nwcVil(
    1886,
    1890,
    "Vidyaranyapura",
    "Local",
    "Adityanagar Duplex",
    1500,
    17250000,
    "Duplex",
  ),
  nwcVil(
    1891,
    1895,
    "Sahakarnagar",
    "Local",
    "F-Block Indep",
    2400,
    52800000,
    "Independent",
    { aKhataWeight: 0.75 },
  ),
  nwcVil(
    1896,
    1900,
    "Jalahalli",
    "Local",
    "HMT Layout Row",
    1800,
    25200000,
    "Row House",
    { isBelHmtPremium: true },
  ),
];

const nwcB4Plt: NorthWestRecord[] = [
  nwcPlt(
    1901,
    1915,
    "BEL Layout 3rd",
    "BDA",
    "BDA Site Resale",
    2400,
    40800000,
    { isBelHmtPremium: true, isResale: true },
  ),
  nwcPlt(
    1916,
    1930,
    "BEL Layout 3rd",
    "BDA",
    "BDA Site Resale",
    1200,
    21600000,
    { isBelHmtPremium: true, isResale: true },
  ),
  nwcPlt(
    1931,
    1940,
    "Chikkabettahalli",
    "BMRDA",
    "BMRDA Gated Site",
    1200,
    7800000,
    { isGrowthFrontier: true },
  ),
  nwcPlt(
    1941,
    1950,
    "Chikkabettahalli",
    "BMRDA",
    "BMRDA Gated Site",
    1500,
    9000000,
    { isGrowthFrontier: true },
  ),
  nwcPlt(
    1951,
    1960,
    "Vidyaranyapura",
    "NTI",
    "NTI Layout Inner",
    1200,
    12600000,
  ),
  nwcPlt(
    1961,
    1970,
    "Sahakarnagar",
    "Local",
    "G-Block Plot Resale",
    1200,
    31200000,
    { aKhataWeight: 0.75, isResale: true },
  ),
];

const nwcB4Com: NorthWestRecord[] = [
  nwcCom(
    1971,
    1980,
    "BEL Main Road",
    "Local",
    "Retail Ground",
    1200,
    48000000,
    {
      isCommercialCeiling: true,
      isBelHmtPremium: true,
      commercialResidentialMultiplier: 2.5,
    },
  ),
  nwcCom(
    1981,
    1985,
    "Nagasandra Metro",
    "Local",
    "Warehouse Site",
    10000,
    50000000,
    { hasMetroProximity: true, isIndustrialBelt: true },
  ),
  nwcCom(
    1986,
    1990,
    "Sahakarnagar",
    "Local",
    "Showroom Space",
    2500,
    62500000,
    { aKhataWeight: 0.75 },
  ),
  nwcCom(
    1991,
    1995,
    "Jalahalli",
    "Local",
    "Office Bare-Shell",
    1500,
    22500000,
    { appreciationCapPct: 18 },
  ),
  nwcCom(1996, 2000, "Vidyaranyapura", "Local", "Shop Resale", 600, 12000000, {
    isResale: true,
  }),
];

// ═══════════════════════════════════════════════════════════════════════════════
// ASSEMBLED EXPORTS — BY REGION
// ═══════════════════════════════════════════════════════════════════════════════

// ── North-West Extension (Units 1–1000) ───────────────────────────────────────

export const northWestExtensionApartments: NorthWestRecord[] = [
  ...nweB1Apt,
  ...nweB2Apt,
  ...nweB3Apt,
  ...nweB4Apt,
];
export const northWestExtensionVillas: NorthWestRecord[] = [
  ...nweB1Vil,
  ...nweB2Vil,
  ...nweB3Vil,
  ...nweB4Vil,
];
export const northWestExtensionPlots: NorthWestRecord[] = [
  ...nweB1Plt,
  ...nweB2Plt,
  ...nweB3Plt,
  ...nweB4Plt,
];
export const northWestExtensionCommercial: NorthWestRecord[] = [
  ...nweB1Com,
  ...nweB2Com,
  ...nweB3Com,
  ...nweB4Com,
];

export const northWestExtensionData: NorthWestRecord[] = [
  ...northWestExtensionApartments,
  ...northWestExtensionVillas,
  ...northWestExtensionPlots,
  ...northWestExtensionCommercial,
];

// ── North-West Cluster (Units 1001–2000) ──────────────────────────────────────

export const northWestClusterApartments: NorthWestRecord[] = [
  ...nwcB1Apt,
  ...nwcB2Apt,
  ...nwcB3Apt,
  ...nwcB4Apt,
];
export const northWestClusterVillas: NorthWestRecord[] = [
  ...nwcB1Vil,
  ...nwcB2Vil,
  ...nwcB3Vil,
  ...nwcB4Vil,
];
export const northWestClusterPlots: NorthWestRecord[] = [
  ...nwcB1Plt,
  ...nwcB2Plt,
  ...nwcB3Plt,
  ...nwcB4Plt,
];
export const northWestClusterCommercial: NorthWestRecord[] = [
  ...nwcB1Com,
  ...nwcB2Com,
  ...nwcB3Com,
  ...nwcB4Com,
];

export const northWestClusterData: NorthWestRecord[] = [
  ...northWestClusterApartments,
  ...northWestClusterVillas,
  ...northWestClusterPlots,
  ...northWestClusterCommercial,
];

// ── Combined master corpus ─────────────────────────────────────────────────────

export const allNorthWestData: NorthWestRecord[] = [
  ...northWestExtensionData,
  ...northWestClusterData,
];

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

export function getNorthWestDataByType(
  type: NorthWestRecord["propertyType"],
): NorthWestRecord[] {
  return allNorthWestData.filter((r) => r.propertyType === type);
}

export function getNorthWestDataByRegion(
  region: NorthWestRecord["region"],
): NorthWestRecord[] {
  return allNorthWestData.filter((r) => r.region === region);
}

export function getNorthWestDataByLocality(
  locality: string,
): NorthWestRecord[] {
  const lower = locality.toLowerCase();
  return allNorthWestData.filter((r) => r.locality.toLowerCase() === lower);
}

export function getNorthWestDataByTypeAndRegion(
  type: NorthWestRecord["propertyType"],
  region: NorthWestRecord["region"],
): NorthWestRecord[] {
  return allNorthWestData.filter(
    (r) => r.propertyType === type && r.region === region,
  );
}

// ─── PSF helpers (used by engines) ───────────────────────────────────────────

export function getPSFNorthWest(r: NorthWestRecord): number {
  return r.psf > 0 ? r.psf : r.areaSqft > 0 ? r.soldPrice / r.areaSqft : 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTELLIGENCE CONFIG
// All batch synthesis data as named constants.
// Engines MUST read from this config — never hardcode these values in engine code.
// ═══════════════════════════════════════════════════════════════════════════════

export const intelligenceConfig = {
  // ── North-West Extension anchors ──────────────────────────────────────────
  northWestExtension: {
    batch1: {
      // Devinagar/Lottegollahalli grid proximity to Hebbal/ORR
      devinagarHebbalOrrMultiplier: 1.5,
      // Nagasandra Sobha Garrison rental yield at 4.2%
      nagasandraRentalYield: 4.2,
      // BEL Main Road commercial ceiling — anchor PSF for all NW commercial
      belMainRoadCommercialCeilingPsf: 45000,
    },
    batch2: {
      // Lottegollahalli Suburban Rail growth multiplier (24-month horizon)
      lottegollahallliRailGrowthMultiplier: 1.2,
      // Sobha Garrison floor-rise premium per floor band
      sobhaGarrisonFloorRisePsf: 500,
      // Tindlu apartment rental yield
      tindluRentalYield: 3.9,
    },
    batch3: {
      // Judicial Layout — high-water mark plot PSF anchor for NW Bangalore
      judicialLayoutHighWaterMarkPsf: 20000,
      // Jalahalli West rental yield (HMT/BEL employee demand)
      jalahallliWestRentalYield: 3.8,
      // Vidyaranyapura Main Road commercial vs residential PSF ratio
      vidyaranyapuraMainRoadRetailMultiplier: 3.0,
    },
    batch4: {
      // Lottegollahalli BDA site floor PSF (Hebbal-Devinagar-Yeshwanthpur intersection)
      lottegollahallliFloorAnchorPsf: 19000,
      // Chikkabidarakallu is the most undervalued apartment pocket in NW
      chikkabidarakalluGrowthFrontier: true,
      // Nagasandra Metro retail commercial multiplier over premium residential
      nagasandraMetroCommercialMultiplier: 2.3,
    },
  },
  // ── North-West Cluster anchors ─────────────────────────────────────────────
  northWestCluster: {
    batch1: {
      // Sahakarnagar gap — A-Khata BDA status drives 0.75 weight
      sahakarnagarlGapAKhataWeight: 0.75,
      // Jalahalli YoY appreciation spike — engine must cap predictive growth
      jalahallliAppreciationSpikePct: 49.9,
      jalahallliAppreciationCapPct: 18,
      // BEL/HMT Layout institutional infrastructure premium
      belHmtPremiumFactor: 1.15,
    },
    batch2: {
      // Metro proximity premium for apartments within 1km of Green Line
      metroProximityPremiumPct: 12,
      // Abbigere early maturity — plots will outpace apartment growth
      abbigereEarlyMaturityPhase: true,
      // Sahakarnagar core BDA scarcity — upper limit for NW valuation engine
      sahakarnagarlBdaScarcityUpperLimitPsf: 24000,
    },
    batch3: {
      // Judicial Layout: land vs apartment weight ratio
      judicialLayoutLandToApartmentRatio: 1.4,
      // Tindlu tertiary connectivity coefficient (Sahakarnagar-Vidyaranyapura link)
      tindluConnectivityCoefficient: 1.1,
      // HMT estate structure age depreciation vs newer builder floors
      hmtLegacyDiscountPct: 17.5,
    },
    batch4: {
      // BEL Road retail commercial peak PSF
      belRoadRetailPeakPsf: 40000,
      // BEL Road commercial vs premium residential ratio
      belRoadCommercialResidentialRatio: 2.5,
      // Chikkabettahalli growth window (2026–2028)
      chikkabettahalliGrowthFrontier: true,
      // Shriram The Poem high-floor premium above 15th floor
      shriramPoemHighFloorPremiumPct: 8.8,
    },
  },
  // ── Shared thresholds (engine must use, not hardcode) ─────────────────────
  shared: {
    // Max predictive growth cap to prevent overfitting on speculative spikes
    maxPredictiveGrowthCapPct: 18,
    // Plot-to-apartment PSF value weight in South-NW boundary zones
    plotValueWeightPct: 50,
    // Minimum comparable count for high-confidence valuation
    minComparableCountHighConfidence: 5,
    // Outlier PSF thresholds (apartment/villa)
    outlierPsfLowApartment: 2000,
    outlierPsfHighApartment: 50000,
    // Outlier PSF thresholds (plot)
    outlierPsfLowPlot: 500,
    outlierPsfHighPlot: 30000,
    // Outlier PSF thresholds (commercial)
    outlierPsfLowCommercial: 1000,
    outlierPsfHighCommercial: 100000,
  },
} as const;

// ─── Runtime deduplication guard (dev only) ───────────────────────────────────

if (process.env.NODE_ENV === "development") {
  const seenNWE = new Set<number>();
  for (const r of northWestExtensionData) {
    if (seenNWE.has(r.unitRangeStart)) {
      console.warn(
        `[northWestBangaloreTrainingData] Duplicate unitRangeStart in NW Extension: ${r.unitRangeStart} at ${r.locality}/${r.project}`,
      );
    }
    seenNWE.add(r.unitRangeStart);
  }

  const seenNWC = new Set<number>();
  for (const r of northWestClusterData) {
    if (seenNWC.has(r.unitRangeStart)) {
      console.warn(
        `[northWestBangaloreTrainingData] Duplicate unitRangeStart in NW Cluster: ${r.unitRangeStart} at ${r.locality}/${r.project}`,
      );
    }
    seenNWC.add(r.unitRangeStart);
  }
}
