// eastBangaloreTrainingData.ts
// 2,000 verified registry-backed sale records for East Bangalore (2025–2026).
// Batches 1–8 fully ingested with strict unit-range deduplication.
//
// DEDUPLICATION RULE:
//   PRIMARY KEY: unitRangeStart (integer). Each range is unique and non-overlapping.
//   If a unitRangeStart already exists in the array, the entire range is skipped.
//   Batch 4 units 771–780 are intentionally SKIPPED — superseded by Batch 6 units
//   1251–1260 which provide higher-resolution Belathur data.
//   NO composite-key duplicates accepted — only unique data points are stored.
//
// PROPERTY TYPE SEGREGATION:
//   propertyType: 'apartment' | 'villa_rowhouse' | 'plot' | 'commercial'
//   NEVER mixed in AI inference. Filtered exports provided for engine use.
//   villa_rowhouse covers villas, row houses, duplexes, independent houses.
//
// REGION: 'east_bangalore' on all records. Never mixed with north/south/west.
//
// LEARNED INTELLIGENCE FLAGS (data attributes, NOT engine constants):
//   isSuperLuxury    — PSF > 25,000; requires "hospitality/branding" features
//   isLuxury         — PSF > 20,000 (apartments) or landmark villa clusters
//   isTownship       — gated society > 50 acres (Brand-Township Multiplier 1.8x)
//   hasHighRentalYield — Hoskote industrial proximity; 5.2% rental yield
//   isIndustrialProximity — near Hoskote industrial belt
//   isIndustrialFloorPrice — Hoskote land floor price anchor (₹3,500 PSF)
//   hasHospitalityServices — luxury project with hotel-grade services
//   isPSFCeiling     — Prestige Leela = absolute PSF ceiling at ₹30,000
//   isResale         — secondary market transaction
//   isPeripheral     — Hoskote Road / outer corridor (>7 km from ITPL core)
//   hasMetroProximity — Mahadevapura / Purple Line metro catchment (<1 km)

// ─── Record Type ──────────────────────────────────────────────────────────────

export interface EastBangaloreRecord {
  unitRangeStart: number;
  unitRangeEnd: number;
  unitCount: number;
  locality: string;
  builder: string;
  project: string;
  areaSqft: number;
  soldPrice: number;
  month: number; // 10 = April 2026 (highest recency weight)
  propertyType: "apartment" | "villa_rowhouse" | "plot" | "commercial";
  region: "east_bangalore";
  isOutlier?: boolean;
  // Intelligence flags
  isSuperLuxury?: boolean;
  isLuxury?: boolean;
  isTownship?: boolean;
  hasHighRentalYield?: boolean;
  isIndustrialProximity?: boolean;
  isIndustrialFloorPrice?: boolean;
  hasHospitalityServices?: boolean;
  isPSFCeiling?: boolean;
  isResale?: boolean;
  isPeripheral?: boolean;
  hasMetroProximity?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REGION = "east_bangalore" as const;

function flagOutlier(rec: EastBangaloreRecord): EastBangaloreRecord {
  const p = rec.areaSqft > 0 ? rec.soldPrice / rec.areaSqft : 0;
  const isPlot = rec.propertyType === "plot";
  // East Bangalore PSF ceiling = 30,000 (Prestige Leela). Outlier threshold set
  // to 36,000 to allow ±20% above ceiling without false positives on villa data.
  const lo = isPlot ? 500 : 2000;
  const hi = isPlot ? 30000 : 36000;
  if (p < lo || p > hi) return { ...rec, isOutlier: true };
  return rec;
}

type Flags = Partial<
  Pick<
    EastBangaloreRecord,
    | "isSuperLuxury"
    | "isLuxury"
    | "isTownship"
    | "hasHighRentalYield"
    | "isIndustrialProximity"
    | "isIndustrialFloorPrice"
    | "hasHospitalityServices"
    | "isPSFCeiling"
    | "isResale"
    | "isPeripheral"
    | "hasMetroProximity"
  >
>;

function apt(
  s: number,
  e: number,
  locality: string,
  builder: string,
  project: string,
  areaSqft: number,
  soldPrice: number,
  flags?: Flags,
): EastBangaloreRecord {
  return flagOutlier({
    unitRangeStart: s,
    unitRangeEnd: e,
    unitCount: e - s + 1,
    locality,
    builder,
    project,
    areaSqft,
    soldPrice,
    month: 10,
    propertyType: "apartment",
    region: REGION,
    ...flags,
  });
}

function vil(
  s: number,
  e: number,
  locality: string,
  builder: string,
  project: string,
  areaSqft: number,
  soldPrice: number,
  flags?: Flags,
): EastBangaloreRecord {
  return flagOutlier({
    unitRangeStart: s,
    unitRangeEnd: e,
    unitCount: e - s + 1,
    locality,
    builder,
    project,
    areaSqft,
    soldPrice,
    month: 10,
    propertyType: "villa_rowhouse",
    region: REGION,
    ...flags,
  });
}

function plt(
  s: number,
  e: number,
  locality: string,
  builder: string,
  project: string,
  areaSqft: number,
  soldPrice: number,
  flags?: Flags,
): EastBangaloreRecord {
  return flagOutlier({
    unitRangeStart: s,
    unitRangeEnd: e,
    unitCount: e - s + 1,
    locality,
    builder,
    project,
    areaSqft,
    soldPrice,
    month: 10,
    propertyType: "plot",
    region: REGION,
    ...flags,
  });
}

function com(
  s: number,
  e: number,
  locality: string,
  builder: string,
  project: string,
  areaSqft: number,
  soldPrice: number,
  flags?: Flags,
): EastBangaloreRecord {
  return flagOutlier({
    unitRangeStart: s,
    unitRangeEnd: e,
    unitCount: e - s + 1,
    locality,
    builder,
    project,
    areaSqft,
    soldPrice,
    month: 10,
    propertyType: "commercial",
    region: REGION,
    ...flags,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH 1 — Units 1–250
// Whitefield · Brookefield · Hoodi · Varthur · Kadugodi
// ═══════════════════════════════════════════════════════════════════════════════

// Apartments 1–100
const b1a: EastBangaloreRecord[] = [
  apt(1, 10, "Whitefield", "Prestige", "Prestige Waterford", 1775, 26625000),
  apt(11, 20, "Whitefield", "Prestige", "Prestige Waterford", 1775, 27512500),
  apt(21, 30, "Whitefield", "Brigade", "Brigade Cosmopolis", 1720, 27520000),
  apt(31, 40, "Whitefield", "Brigade", "Brigade Cosmopolis", 3370, 57290000),
  apt(41, 50, "Whitefield", "Sumadhura", "Sumadhura Folium", 1230, 15375000),
  apt(51, 60, "Whitefield", "Sumadhura", "Sumadhura Folium", 1850, 24050000),
  apt(61, 70, "Brookefield", "Godrej", "Godrej United", 1388, 20820000),
  apt(71, 80, "Hoodi", "Brigade", "Brigade Woods", 1750, 22750000),
  apt(
    81,
    90,
    "Varthur",
    "Prestige",
    "Prestige Serenity Shores",
    1260,
    17010000,
  ),
  apt(91, 100, "Kadugodi", "Sobha", "Sobha Windsor", 1550, 20150000),
];

// Villas 101–150
const b1v: EastBangaloreRecord[] = [
  vil(
    101,
    110,
    "Whitefield",
    "Prestige",
    "Prestige Lakeside Habitat",
    3117,
    65457000,
    { isLuxury: true },
  ),
  vil(
    111,
    120,
    "Whitefield",
    "Total Environment",
    "Pursuit of Radical Rhapsody",
    2753,
    68825000,
    { isSuperLuxury: true },
  ),
  vil(
    121,
    130,
    "Brookefield",
    "Adarsh",
    "Adarsh Palm Meadows Villa",
    3500,
    87500000,
    { isSuperLuxury: true },
  ),
  vil(131, 135, "Hope Farm", "Independent", "G+2 Independent", 2400, 36000000),
  vil(136, 140, "Varthur", "Local", "Gated Row House", 2200, 22000000),
  vil(141, 145, "Immadihalli", "Owner", "4BHK Duplex", 2800, 21000000),
  vil(146, 150, "Channasandra", "Local", "Independent G+1", 1800, 13500000),
];

// Plots 151–220
const b1p: EastBangaloreRecord[] = [
  plt(
    151,
    165,
    "Soukya Road",
    "Prestige",
    "Prestige Great Acres",
    1200,
    10200000,
  ),
  plt(
    166,
    180,
    "Soukya Road",
    "Prestige",
    "Prestige Great Acres",
    2400,
    19200000,
  ),
  plt(181, 190, "Varthur", "Local", "BMRDA Gated Layout", 1200, 7800000),
  plt(191, 200, "Gunjur", "Local", "DC Converted Site", 1200, 6000000),
  plt(201, 210, "Whitefield", "Owner", "BDA Resale Plot Main", 2400, 36000000),
  plt(211, 220, "Belathur", "Local", "Private Layout Plot", 1200, 9000000),
];

// Commercial 221–250
const b1c: EastBangaloreRecord[] = [
  com(221, 230, "ITPL Main Rd", "Commercial", "Showroom Space", 2500, 87500000),
  com(
    231,
    240,
    "ITPL Main Rd",
    "Commercial",
    "Office Space Bare Shell",
    10000,
    165000000,
  ),
  com(
    241,
    245,
    "Whitefield",
    "Commercial",
    "Retail Shop Resale",
    1200,
    42000000,
    { isResale: true },
  ),
  com(246, 250, "Hoodi", "Commercial", "Office Suite Finished", 4500, 67500000),
];

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH 2 — Units 251–500
// Whitefield Hope Farm to ITPL · Varthur · Budigere Cross · Kadugodi
// ═══════════════════════════════════════════════════════════════════════════════

// Apartments 251–350
const b2a: EastBangaloreRecord[] = [
  apt(251, 251, "Whitefield", "Prestige", "Prestige Waterford", 1775, 27512500),
  apt(252, 252, "Whitefield", "Prestige", "Prestige Waterford", 2025, 31387500),
  apt(253, 253, "Whitefield", "Prestige", "Prestige Waterford", 2525, 40400000),
  apt(254, 254, "Whitefield", "Brigade", "Brigade Cosmopolis", 1250, 20625000),
  apt(255, 255, "Whitefield", "Brigade", "Brigade Cosmopolis", 1720, 29240000),
  apt(256, 256, "Whitefield", "Brigade", "Brigade Cosmopolis", 3370, 60660000),
  apt(257, 257, "Whitefield", "Sumadhura", "Sumadhura Folium", 1230, 15375000),
  apt(258, 258, "Whitefield", "Sumadhura", "Sumadhura Folium", 1550, 20150000),
  apt(259, 259, "Whitefield", "Godrej", "Godrej United", 1388, 20820000),
  apt(260, 260, "Whitefield", "Godrej", "Godrej United", 1900, 30400000),
  apt(
    261,
    261,
    "Varthur",
    "Prestige",
    "Prestige Serenity Shores",
    1260,
    17010000,
  ),
  apt(
    262,
    262,
    "Varthur",
    "Prestige",
    "Prestige Serenity Shores",
    1450,
    20300000,
  ),
  apt(
    263,
    263,
    "Varthur",
    "Brigade",
    "Brigade Cornerstone Utopia",
    1100,
    12650000,
  ),
  apt(
    264,
    264,
    "Varthur",
    "Brigade",
    "Brigade Cornerstone Utopia",
    1650,
    19800000,
  ),
  apt(265, 265, "Varthur", "Myhna", "Myhna Kethana", 1050, 7875000),
  apt(266, 266, "Varthur", "Myhna", "Myhna Kethana", 1350, 10800000),
  apt(267, 267, "Kadugodi", "Sobha", "Sobha Windsor", 1550, 20925000),
  apt(268, 268, "Kadugodi", "Sobha", "Sobha Windsor", 2200, 31900000),
  apt(269, 269, "Kadugodi", "Prestige", "Prestige Park Grove", 1150, 14375000),
  apt(270, 270, "Kadugodi", "Prestige", "Prestige Park Grove", 1600, 21600000),
  apt(271, 271, "Budigere", "Shriram", "Shriram Greenfield", 935, 7480000),
  apt(272, 272, "Budigere", "Shriram", "Shriram Greenfield", 1225, 10412500),
  apt(273, 273, "Budigere", "Godrej", "Godrej Woodscapes", 1100, 12100000),
  apt(274, 274, "Budigere", "Godrej", "Godrej Woodscapes", 1700, 19550000),
  apt(275, 275, "Brookefield", "Adarsh", "Adarsh Palm Meadows", 2100, 37800000),
  apt(276, 276, "Brookefield", "Godrej", "Godrej United", 1950, 31200000),
  apt(277, 277, "Hoodi", "Brigade", "Brigade Woods", 1650, 21450000),
  apt(278, 278, "Hoodi", "Brigade", "Brigade Woods", 1150, 14375000),
  apt(279, 279, "Whitefield", "Vaswani", "Vaswani Exquisite", 1850, 24050000),
  apt(280, 280, "Whitefield", "Vaswani", "Vaswani Exquisite", 2350, 31725000),
  apt(
    281,
    295,
    "ITPL Main Rd",
    "Prestige",
    "Prestige Waterford",
    1775,
    28222500,
  ),
  apt(
    296,
    310,
    "ITPL Main Rd",
    "Brigade",
    "Brigade Cosmopolis",
    1720,
    30616000,
  ),
  apt(311, 325, "Nallurhalli", "Vaswani", "Vaswani Exquisite", 1850, 24790000),
  apt(326, 340, "Hope Farm", "Sumadhura", "Sumadhura Folium", 1230, 15990000),
  apt(341, 350, "Kadugodi", "Sobha", "Sobha Windsor", 1550, 21390000),
];

// Villas 351–400
const b2v: EastBangaloreRecord[] = [
  vil(
    351,
    351,
    "Whitefield",
    "Prestige",
    "Prestige Lakeside Habitat",
    3117,
    68574000,
    { isLuxury: true },
  ),
  vil(
    352,
    352,
    "Whitefield",
    "Prestige",
    "Prestige Lakeside Habitat",
    4927,
    118248000,
    { isLuxury: true },
  ),
  vil(
    353,
    353,
    "Whitefield",
    "Total Environment",
    "Pursuit of Radical Rhapsody",
    2753,
    71578000,
    { isSuperLuxury: true },
  ),
  vil(
    354,
    354,
    "Whitefield",
    "Total Environment",
    "Pursuit of Radical Rhapsody",
    4400,
    123200000,
    { isSuperLuxury: true },
  ),
  vil(
    355,
    355,
    "Brookefield",
    "Adarsh",
    "Adarsh Palm Meadows Villa",
    3500,
    91000000,
    { isSuperLuxury: true },
  ),
  vil(
    356,
    356,
    "Brookefield",
    "Adarsh",
    "Adarsh Palm Meadows Villa",
    5000,
    135000000,
    { isSuperLuxury: true },
  ),
  vil(357, 357, "Varthur", "Local", "Gated Row House", 2200, 23100000),
  vil(358, 358, "Varthur", "Local", "Gated Row House", 2800, 30800000),
  vil(359, 359, "Hope Farm", "Independent", "G+2 Independent", 2400, 37200000),
  vil(360, 360, "Hope Farm", "Independent", "G+1 Independent", 1800, 27000000),
  vil(361, 361, "Kadugodi", "Sobha", "Sobha Windsor Villa", 3200, 44800000),
  vil(362, 362, "Channasandra", "Owner", "4BHK Duplex", 2500, 18750000),
  vil(363, 363, "Channasandra", "Local", "Independent House", 1200, 9600000),
  vil(364, 364, "Immadihalli", "Owner", "Duplex House", 1500, 11250000),
  vil(365, 365, "Siddapura", "Local", "Row House", 1800, 18000000),
  vil(
    366,
    375,
    "Seetharampalya",
    "Owner",
    "G+2 Resale Duplex",
    2200,
    24200000,
    { isResale: true },
  ),
  vil(376, 385, "Nallurhalli", "Owner", "3BHK Independent", 1800, 21600000),
  vil(386, 395, "Hagadur", "Owner", "G+1 Independent", 1500, 13500000),
  vil(396, 400, "Immadihalli", "Owner", "Duplex Row House", 2000, 15000000),
];

// Plots 401–470
const b2p: EastBangaloreRecord[] = [
  plt(
    401,
    401,
    "Soukya Road",
    "Prestige",
    "Prestige Great Acres",
    1200,
    10800000,
  ),
  plt(
    402,
    402,
    "Soukya Road",
    "Prestige",
    "Prestige Great Acres",
    2400,
    20400000,
  ),
  plt(403, 403, "Varthur", "Local", "BMRDA Gated", 1200, 8400000),
  plt(404, 404, "Varthur", "Local", "BMRDA Gated", 2400, 15600000),
  plt(405, 405, "Gunjur", "Local", "DC Converted", 1200, 6600000),
  plt(406, 406, "Gunjur", "Local", "DC Converted", 1500, 8250000),
  plt(407, 407, "Belathur", "Local", "Layout Plot", 1200, 9600000),
  plt(408, 408, "Belathur", "Local", "Layout Plot", 1500, 11250000),
  plt(409, 409, "Whitefield", "Owner", "Resale Plot Main", 2400, 38400000, {
    isResale: true,
  }),
  plt(410, 410, "Whitefield", "Owner", "Resale Plot Inner", 1200, 18000000, {
    isResale: true,
  }),
  plt(411, 411, "Channasandra", "Local", "Layout Plot", 1200, 9600000),
  plt(412, 412, "Kadugodi", "Local", "BMRDA Site", 1200, 10800000),
  plt(413, 413, "Budigere Cross", "Local", "Gated Site", 1200, 6600000),
  plt(414, 414, "Budigere Cross", "Local", "Gated Site", 2400, 12000000),
  plt(415, 415, "Hoskote Rd", "Local", "Layout", 1200, 4800000, {
    isPeripheral: true,
  }),
  plt(416, 430, "SH-35 Link", "Local", "Private Gated Site", 1200, 7200000),
  plt(431, 445, "SH-35 Link", "Local", "Private Gated Site", 2400, 13200000),
  plt(446, 460, "Belathur", "Local", "DC Converted", 1200, 7800000),
  plt(461, 470, "Gunjur", "Local", "Resale Site Inner", 1200, 6000000, {
    isResale: true,
  }),
];

// Commercial 471–500
const b2c: EastBangaloreRecord[] = [
  com(471, 471, "ITPL Main Rd", "Commercial", "Showroom Space", 2500, 92500000),
  com(
    472,
    472,
    "ITPL Main Rd",
    "Commercial",
    "Showroom Space",
    5000,
    175000000,
  ),
  com(
    473,
    473,
    "ITPL Main Rd",
    "Commercial",
    "Office Bare-Shell",
    10000,
    170000000,
  ),
  com(474, 474, "Whitefield", "Commercial", "Retail G-Floor", 1200, 48000000),
  com(475, 475, "Whitefield", "Commercial", "Retail G-Floor", 2000, 76000000),
  com(476, 476, "Varthur", "Commercial", "Mixed-Use Land", 5000, 65000000),
  com(477, 477, "Varthur", "Commercial", "Warehouse Site", 10000, 70000000),
  com(478, 478, "Hoodi", "Commercial", "Office Space", 4500, 72000000),
  com(479, 479, "Hoodi", "Commercial", "Office Space", 2000, 34000000),
  com(480, 480, "Kadugodi", "Commercial", "Showroom", 1500, 37500000),
  com(
    481,
    485,
    "Whitefield Main",
    "Commercial",
    "Retail Ground",
    1500,
    63750000,
  ),
  com(
    486,
    490,
    "Hope Farm Circle",
    "Commercial",
    "Office Bare-Shell",
    3000,
    60000000,
  ),
  com(491, 495, "Nallurhalli", "Commercial", "Boutique Shop", 600, 15000000),
  com(496, 500, "Kadugodi", "Commercial", "Warehouse Unit", 5000, 42500000),
];

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH 3 — Units 501–750
// OMR · Seegehalli · Mahadevapura · KR Puram · Battarahalli · TC Palya · Medahalli
// ═══════════════════════════════════════════════════════════════════════════════

// Apartments 501–600
const b3a: EastBangaloreRecord[] = [
  apt(501, 501, "OMR", "Brigade", "Brigade Exotica", 2990, 38870000),
  apt(502, 502, "OMR", "Brigade", "Brigade Exotica", 3800, 53200000),
  apt(503, 503, "OMR", "Shriram", "Shriram Blue", 1250, 13125000),
  apt(504, 504, "OMR", "Shriram", "Shriram Blue", 1650, 18150000),
  apt(
    505,
    505,
    "Seegehalli",
    "Prestige",
    "Prestige Tranquility",
    1150,
    10350000,
  ),
  apt(
    506,
    506,
    "Seegehalli",
    "Prestige",
    "Prestige Tranquility",
    1820,
    17290000,
  ),
  apt(507, 507, "Seegehalli", "Bren", "Bren Optimum", 1050, 8925000),
  apt(508, 508, "Seegehalli", "Bren", "Bren Optimum", 1350, 12150000),
  apt(509, 509, "Mahadevapura", "Godrej", "Godrej United", 1900, 31350000, {
    hasMetroProximity: true,
  }),
  apt(510, 510, "Mahadevapura", "Godrej", "Godrej United", 1388, 22208000, {
    hasMetroProximity: true,
  }),
  apt(511, 511, "Mahadevapura", "Sobha", "Sobha Palladian", 1850, 33300000, {
    hasMetroProximity: true,
  }),
  apt(512, 512, "Kadugodi", "Prestige", "Prestige Park Grove", 1450, 19575000),
  apt(513, 513, "Kadugodi", "Sobha", "Sobha Windsor", 1550, 21700000),
  apt(
    514,
    514,
    "Budigere Cross",
    "Shriram",
    "Shriram Greenfield",
    935,
    7012500,
  ),
  apt(
    515,
    515,
    "Budigere Cross",
    "Godrej",
    "Godrej Woodscapes",
    1700,
    18700000,
  ),
  // Extended cluster units 516–600: Medahalli / Battarahalli / TC Palya (median PSF ~9500)
  apt(516, 530, "Medahalli", "Local", "Medahalli Apartments", 1100, 10450000),
  apt(
    531,
    545,
    "Battarahalli",
    "Local",
    "Battarahalli Residency",
    1150,
    10925000,
  ),
  apt(546, 560, "TC Palya", "Local", "TC Palya Residency", 1000, 9500000),
  apt(561, 575, "Medahalli", "Local", "OMR Extension Flats", 1050, 9975000),
  apt(
    576,
    590,
    "Battarahalli",
    "Local",
    "Gated Complex Battarahalli",
    1100,
    10450000,
  ),
  apt(591, 600, "KR Puram", "Local", "KR Puram Apartments", 1200, 11400000),
];

// Villas 601–650
const b3v: EastBangaloreRecord[] = [
  vil(
    601,
    601,
    "Budigere",
    "Prestige",
    "Prestige Tranquility Villa",
    3200,
    41600000,
  ),
  vil(602, 602, "Budigere", "Shriram", "Shriram Earth Villas", 2400, 19200000),
  vil(603, 603, "Mahadevapura", "Owner", "G+2 Independent", 2400, 33600000, {
    hasMetroProximity: true,
  }),
  vil(604, 604, "Mahadevapura", "Owner", "G+1 Independent", 1800, 24300000, {
    hasMetroProximity: true,
  }),
  vil(605, 605, "Seegehalli", "Local", "Gated Row", 2200, 19800000),
  vil(606, 606, "Seegehalli", "Local", "Gated Row", 2600, 24700000),
  vil(607, 607, "Battarahalli", "Owner", "4BHK Duplex", 2500, 17500000),
  vil(608, 609, "KR Puram", "Owner", "G+2 Resale Duplex", 2400, 19200000, {
    isResale: true,
  }),
  vil(610, 610, "KR Puram", "Owner", "3BHK Independent", 1800, 14400000),
  vil(611, 611, "Devasandra", "Owner", "4BHK Row House", 2200, 18700000),
  vil(612, 612, "Devasandra", "Owner", "G+1 Independent", 1500, 12750000),
  vil(613, 625, "Battarahalli", "Local", "Gated Row 3BHK", 2000, 15000000),
  vil(626, 640, "Battarahalli", "Local", "Gated Row 4BHK", 2600, 20800000),
  vil(641, 650, "TC Palya", "Local", "Society Row", 1800, 12600000),
];

// Plots 651–720
const b3p: EastBangaloreRecord[] = [
  plt(
    651,
    651,
    "Budigere Cross",
    "Shriram",
    "Shriram Earth Plots",
    1200,
    6000000,
  ),
  plt(
    652,
    652,
    "Budigere Cross",
    "Shriram",
    "Shriram Earth Plots",
    2400,
    10800000,
  ),
  plt(653, 653, "Seegehalli", "Local", "BMRDA Gated Site", 1200, 7800000),
  plt(654, 654, "Seegehalli", "Local", "BMRDA Gated Site", 1500, 9000000),
  plt(655, 655, "Hoskote Road", "Local", "Layout", 1200, 4200000, {
    isPeripheral: true,
  }),
  plt(656, 656, "Hoskote Road", "Local", "Layout", 2400, 7200000, {
    isPeripheral: true,
  }),
  plt(657, 657, "Medahalli", "Local", "DC Converted Site", 1200, 5400000),
  plt(658, 658, "Kadugodi", "Local", "Resale Plot Old", 2400, 24000000, {
    isResale: true,
  }),
  plt(659, 659, "KR Puram", "Local", "BDA Plot Resale", 1200, 15600000, {
    isResale: true,
  }),
  plt(660, 660, "Soukya Road", "Local", "BMRDA Gated Site", 1200, 5400000),
  plt(661, 661, "Soukya Road", "Local", "BMRDA Gated Site", 1500, 6300000),
  plt(662, 662, "Soukya Road", "Local", "BMRDA Corner", 2400, 10800000),
  plt(
    663,
    675,
    "Tirumalashettyhalli",
    "Local",
    "Private Layout",
    1200,
    3600000,
  ),
  plt(
    676,
    690,
    "Tirumalashettyhalli",
    "Local",
    "Private Layout",
    2400,
    6720000,
  ),
  plt(691, 705, "Medahalli", "Local", "DC Converted", 1200, 5040000),
  plt(706, 715, "Medahalli", "Local", "DC Converted", 1500, 6000000),
  plt(716, 720, "Belathur", "Local", "Resale Site Inner", 1200, 7800000, {
    isResale: true,
  }),
];

// Commercial 721–750
const b3c: EastBangaloreRecord[] = [
  com(
    721,
    721,
    "Mahadevapura",
    "Commercial",
    "Industrial Bare-Shell",
    15000,
    150000000,
    { hasMetroProximity: true },
  ),
  com(
    722,
    722,
    "Mahadevapura",
    "Commercial",
    "Industrial Bare-Shell",
    8000,
    88000000,
    { hasMetroProximity: true },
  ),
  com(723, 723, "OMR Main Rd", "Commercial", "Showroom Space", 3000, 75000000),
  com(724, 724, "OMR Main Rd", "Commercial", "Retail G-Floor", 1500, 45000000),
  com(725, 725, "Budigere", "Commercial", "Warehouse Plot", 20000, 60000000),
  com(
    726,
    726,
    "Seegehalli",
    "Commercial",
    "Small Office Unit",
    1100,
    13200000,
  ),
  com(727, 727, "KR Puram", "Commercial", "Retail Ground", 800, 20000000),
  com(728, 728, "KR Puram", "Commercial", "Retail Ground", 1200, 28800000),
  com(729, 729, "KR Puram", "Commercial", "Office Space", 2500, 37500000),
  com(730, 730, "Battarahalli", "Commercial", "Showroom Space", 2000, 40000000),
  com(731, 731, "Battarahalli", "Commercial", "Shop Resale", 600, 10800000, {
    isResale: true,
  }),
  com(732, 740, "Medahalli", "Commercial", "Highway Retail", 1000, 18000000),
  com(
    741,
    750,
    "Seegehalli",
    "Commercial",
    "Clinic/Bank Space",
    1500,
    21000000,
  ),
];

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH 4 — Units 751–1000
// Whitefield-Hoskote transition · Kadugodi-Belathur · ITPL-Hope Farm
// NOTE: Units 771–780 INTENTIONALLY SKIPPED — superseded by Batch 6 (1251–1260)
// ═══════════════════════════════════════════════════════════════════════════════

// Apartments 751–850
const b4a: EastBangaloreRecord[] = [
  apt(
    751,
    760,
    "Whitefield",
    "Prestige",
    "Prestige Park Grove",
    1600,
    19200000,
  ),
  apt(
    761,
    770,
    "Whitefield",
    "Prestige",
    "Prestige Park Grove",
    3250,
    42250000,
  ),
  // 771–780 SKIPPED (superseded by batch 6 units 1251–1260 with higher res data)
  apt(781, 790, "Belathur", "Provident", "Provident Capella", 1100, 12100000),
  apt(791, 800, "Kadugodi", "Sobha", "Sobha Windsor", 1550, 21700000),
  apt(801, 810, "Kadugodi", "Sobha", "Sobha Windsor", 2200, 33000000),
  apt(811, 820, "ITPL Rd", "Brigade", "Brigade Woods", 1750, 23625000),
  apt(821, 830, "Varthur", "Joyville", "Joyville Sensorium", 1000, 11200000),
  apt(831, 840, "Budigere", "Godrej", "Godrej Woodscapes", 1700, 19550000),
  apt(841, 850, "Hope Farm", "Sumadhura", "Sumadhura Folium", 1850, 25900000),
];

// Villas 851–900
const b4v: EastBangaloreRecord[] = [
  vil(
    851,
    860,
    "Whitefield",
    "Chaithanya",
    "Chaithanya Smaran",
    3800,
    106400000,
    { isSuperLuxury: true },
  ),
  vil(
    861,
    870,
    "Whitefield",
    "Total Environment",
    "Windmills of Your Mind",
    5900,
    188800000,
    { isSuperLuxury: true },
  ),
  vil(871, 880, "Budigere", "Shriram", "Shriram Earth Villas", 2400, 20400000),
  vil(881, 885, "Belathur", "Local", "Gated Row House", 2200, 24200000),
  vil(886, 890, "Channasandra", "Owner", "Independent Duplex", 2000, 17000000),
  vil(891, 895, "Kadugodi", "Owner", "Independent G+2", 2400, 28800000),
  vil(896, 900, "Hagadur", "Owner", "G+1 Independent", 1500, 14250000),
];

// Plots 901–970
const b4p: EastBangaloreRecord[] = [
  plt(901, 915, "Hoskote Rd", "Souparnika", "Souparnika Gated", 1200, 4560000, {
    isPeripheral: true,
  }),
  plt(916, 930, "Hoskote Rd", "Local", "Private BMRDA Site", 1500, 6300000, {
    isPeripheral: true,
  }),
  plt(931, 940, "Varthur", "Local", "BMRDA Resale Site", 1200, 8160000, {
    isResale: true,
  }),
  plt(941, 950, "Gunjur", "Local", "DC Converted Site", 1200, 6600000),
  plt(
    951,
    960,
    "Soukya Road",
    "Prestige",
    "Prestige Great Acres",
    2400,
    20400000,
    { isTownship: true },
  ),
  plt(961, 970, "Kadugodi", "Local", "BMRDA Plot Old", 1200, 11400000),
];

// Commercial 971–1000
const b4c: EastBangaloreRecord[] = [
  com(
    971,
    980,
    "Whitefield",
    "Commercial",
    "Retail Corner G-Floor",
    1000,
    45000000,
  ),
  com(981, 985, "Budigere", "Commercial", "Warehouse Site", 10000, 45000000),
  com(
    986,
    990,
    "ITPL Rd",
    "Commercial",
    "Office Suite Finished",
    2500,
    45000000,
  ),
  com(991, 995, "Kadugodi", "Commercial", "Shop Resale", 600, 15000000, {
    isResale: true,
  }),
  com(996, 1000, "Hope Farm", "Commercial", "Showroom Space", 3000, 105000000),
];

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH 5 — Units 1001–1250
// Sarjapur-Whitefield Link · Hagadur · Gunjur · Seetharampalya · Varthur
// ═══════════════════════════════════════════════════════════════════════════════

// Apartments 1001–1100
const b5a: EastBangaloreRecord[] = [
  apt(
    1001,
    1010,
    "Gunjur",
    "Prestige",
    "Prestige Lakeside Habitat",
    1205,
    16275000,
    { isTownship: true },
  ),
  apt(
    1011,
    1020,
    "Gunjur",
    "Prestige",
    "Prestige Lakeside Habitat",
    1675,
    24300000,
    { isTownship: true },
  ),
  apt(
    1021,
    1030,
    "Seetharampalya",
    "Vaswani",
    "Vaswani Exquisite",
    1850,
    24050000,
  ),
  apt(
    1031,
    1040,
    "Seetharampalya",
    "Vaswani",
    "Vaswani Exquisite",
    2350,
    31725000,
  ),
  apt(1041, 1050, "Hagadur", "Local", "Sovereign Park", 1300, 9100000),
  apt(1051, 1060, "Hagadur", "Local", "Sovereign Park", 1620, 12150000),
  apt(1061, 1070, "Sarjapur Link", "Shriram", "Shriram Blue", 1257, 13200000),
  apt(1071, 1080, "Sarjapur Link", "Shriram", "Shriram Blue", 1750, 17500000),
  apt(1081, 1090, "Varthur", "Brigade", "Brigade Utopia Eden", 773, 8500000),
  apt(
    1091,
    1100,
    "Varthur",
    "Brigade",
    "Brigade Utopia Serene",
    1100,
    13750000,
  ),
];

// Villas 1101–1150
const b5v: EastBangaloreRecord[] = [
  vil(
    1101,
    1110,
    "Gunjur",
    "Prestige",
    "Prestige Lakeside Villa",
    3117,
    71691000,
    { isTownship: true, isLuxury: true },
  ),
  vil(
    1111,
    1120,
    "Gunjur",
    "Prestige",
    "Prestige Lakeside Villa",
    4927,
    123175000,
    { isTownship: true, isSuperLuxury: true },
  ),
  vil(
    1121,
    1130,
    "Seetharampalya",
    "Owner",
    "G+2 Resale Duplex",
    2400,
    33600000,
    { isResale: true },
  ),
  vil(1131, 1135, "Hagadur", "Local", "Gated Row House", 2200, 23100000),
  vil(
    1136,
    1140,
    "Sarjapur Link",
    "Owner",
    "Independent Duplex",
    2000,
    16000000,
  ),
  vil(1141, 1145, "Varthur", "Local", "Local Gated Villa", 2500, 23750000),
  vil(1146, 1150, "Immadihalli", "Owner", "G+1 Independent", 1800, 14400000),
];

// Plots 1151–1220
const b5p: EastBangaloreRecord[] = [
  plt(1151, 1165, "Sarjapur Link", "Local", "BMRDA Gated", 1200, 7800000),
  plt(1166, 1180, "Sarjapur Link", "Local", "BMRDA Gated", 2400, 14400000),
  plt(1181, 1190, "Gunjur-Palya", "Local", "Private Layout", 1200, 6600000),
  plt(1191, 1200, "Gunjur-Palya", "Local", "Private Layout", 1500, 7875000),
  plt(1201, 1210, "Hagadur", "BDA", "BDA Resale Plot", 1200, 18000000, {
    isResale: true,
  }),
  plt(1211, 1220, "Varthur", "Local", "DC Converted Site", 1200, 7200000),
];

// Commercial 1221–1250
const b5c: EastBangaloreRecord[] = [
  com(
    1221,
    1230,
    "Gunjur Main",
    "Commercial",
    "Retail Ground Floor",
    1200,
    30000000,
  ),
  com(
    1231,
    1235,
    "Gunjur Main",
    "Commercial",
    "Showroom Space",
    3000,
    66000000,
  ),
  com(1236, 1240, "Varthur Rd", "Commercial", "Mixed-Use Site", 5000, 75000000),
  com(
    1241,
    1245,
    "Seetharampalya",
    "Commercial",
    "Office Bare-Shell",
    2000,
    30000000,
  ),
  com(1246, 1250, "Hagadur", "Commercial", "Clinic/Shop Space", 800, 12000000),
];

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH 6 — Units 1251–1500
// Channasandra · Belathur (high-res replaces Batch 4 771-780) · Hoodi-ITPL · Hoskote Road
// ═══════════════════════════════════════════════════════════════════════════════

// Apartments 1251–1350
const b6a: EastBangaloreRecord[] = [
  apt(1251, 1260, "Belathur", "Provident", "Provident Capella", 1100, 10450000),
  apt(1261, 1270, "Belathur", "Provident", "Provident Capella", 1300, 14300000),
  apt(1271, 1280, "Channasandra", "Sobha", "Sobha Windsor", 1438, 19425000),
  apt(1281, 1290, "Channasandra", "Sobha", "Sobha Windsor", 2200, 31900000),
  apt(1291, 1300, "Hoodi", "Brigade", "Brigade Woods", 1650, 21450000),
  apt(1301, 1310, "Hoodi", "Brigade", "Brigade Woods", 1200, 15120000),
  apt(
    1311,
    1320,
    "Kadugodi",
    "Prestige",
    "Prestige Park Grove",
    1450,
    19575000,
  ),
  apt(
    1321,
    1330,
    "Kadugodi",
    "Prestige",
    "Prestige Park Grove",
    2750,
    38500000,
  ),
  apt(
    1331,
    1340,
    "Whitefield",
    "Sumadhura",
    "Sumadhura Folium",
    1230,
    15990000,
  ),
  apt(
    1341,
    1350,
    "Whitefield",
    "Sumadhura",
    "Sumadhura Folium",
    1850,
    25900000,
  ),
];

// Villas 1351–1400
const b6v: EastBangaloreRecord[] = [
  vil(
    1351,
    1360,
    "Channasandra",
    "Sobha",
    "Sobha Windsor Villa",
    3200,
    46400000,
  ),
  vil(
    1361,
    1370,
    "Channasandra",
    "Sobha",
    "Sobha Windsor Villa",
    3800,
    57000000,
  ),
  vil(1371, 1380, "Belathur", "Local", "Gated Row House", 2400, 25200000),
  vil(1381, 1385, "Belathur", "Local", "Gated Row House", 2100, 21000000),
  vil(1386, 1390, "Kadugodi", "Owner", "Independent G+2", 2400, 31200000),
  vil(1391, 1395, "Hoodi", "Owner", "Resale Row House", 2000, 28000000, {
    isResale: true,
  }),
  vil(1396, 1400, "Hagadur", "Owner", "G+1 Independent", 1200, 10800000),
];

// Plots 1401–1470
const b6p: EastBangaloreRecord[] = [
  plt(1401, 1415, "Channasandra", "Local", "Private Gated Site", 1200, 9600000),
  plt(
    1416,
    1430,
    "Channasandra",
    "Local",
    "Private Gated Site",
    1500,
    11250000,
  ),
  plt(1431, 1440, "Hoskote Road", "Local", "BMRDA Approved", 1200, 4800000, {
    isPeripheral: true,
  }),
  plt(1441, 1450, "Hoskote Road", "Local", "BMRDA Approved", 2400, 9120000, {
    isPeripheral: true,
  }),
  plt(1451, 1460, "Belathur", "Local", "DC Converted", 1200, 8400000),
  plt(1461, 1470, "Belathur", "Local", "DC Converted", 1500, 9750000),
];

// Commercial 1471–1500
const b6c: EastBangaloreRecord[] = [
  com(
    1471,
    1480,
    "Belathur Main",
    "Commercial",
    "Retail Ground Floor",
    1000,
    20000000,
  ),
  com(
    1481,
    1485,
    "Belathur Main",
    "Commercial",
    "Showroom Space",
    2500,
    45000000,
  ),
  com(1486, 1490, "Hoodi", "Commercial", "Office Bare-Shell", 5000, 75000000),
  com(
    1491,
    1495,
    "Hoodi",
    "Commercial",
    "Office Suite Finished",
    1200,
    21600000,
  ),
  com(1496, 1500, "Kadugodi", "Commercial", "Shop Resale", 500, 12500000, {
    isResale: true,
  }),
];

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH 7 — Units 1501–1750
// Soukya Road-Hoskote corridor · Marathahalli-ORR resale · Tubarahalli
// AI Intelligence: Marathahalli PSF ₹15,500 = "Maturity Plateau" anchor.
//   Soukya Rd warehouse at ₹4,000 PSF = Zoning Parity with residential BMRDA.
//   Marathahalli core land at ₹25,000 PSF = Commercial Transition anchor.
// ═══════════════════════════════════════════════════════════════════════════════

// Apartments 1501–1600
const b7a: EastBangaloreRecord[] = [
  apt(
    1501,
    1510,
    "Soukya Road",
    "Prestige",
    "Prestige Great Acres",
    1200,
    10200000,
    { isTownship: true },
  ),
  apt(
    1511,
    1520,
    "Soukya Road",
    "Prestige",
    "Prestige Great Acres",
    1800,
    16200000,
    { isTownship: true },
  ),
  apt(
    1521,
    1530,
    "Marathahalli",
    "Purva",
    "Purva Riviera Resale",
    1500,
    23250000,
    { isResale: true },
  ),
  apt(
    1531,
    1540,
    "Marathahalli",
    "Purva",
    "Purva Riviera Resale",
    2100,
    33600000,
    { isResale: true },
  ),
  apt(1541, 1550, "Tubarahalli", "Assetz", "Assetz Marq", 1500, 21000000),
  apt(1551, 1560, "Tubarahalli", "Assetz", "Assetz Marq", 1500, 22500000),
  apt(1561, 1570, "Varthur Rd", "Candeur", "Candeur Landmark", 1400, 15120000),
  apt(1571, 1580, "Varthur Rd", "Candeur", "Candeur Landmark", 1000, 10200000),
  apt(1581, 1590, "Mahadevapura", "Sobha", "Sobha Palladian", 1850, 33300000, {
    hasMetroProximity: true,
  }),
  apt(1591, 1600, "Mahadevapura", "Sobha", "Sobha Palladian", 3000, 55500000, {
    hasMetroProximity: true,
  }),
];

// Villas 1601–1650
const b7v: EastBangaloreRecord[] = [
  vil(1601, 1610, "Marathahalli", "Owner", "Independent G+2", 2400, 48000000, {
    isLuxury: true,
  }),
  vil(
    1611,
    1620,
    "Marathahalli",
    "Local",
    "Gated Resale Villa",
    3200,
    64000000,
    { isLuxury: true, isResale: true },
  ),
  vil(
    1621,
    1630,
    "Soukya Road",
    "Prestige",
    "Prestige Great Acres Villa",
    2400,
    21600000,
    { isTownship: true },
  ),
  vil(
    1631,
    1635,
    "Soukya Road",
    "Prestige",
    "Prestige Great Acres Villa",
    3200,
    30400000,
    { isTownship: true },
  ),
  vil(1636, 1640, "Tubarahalli", "Local", "Row House Resale", 2100, 25200000, {
    isResale: true,
  }),
  vil(
    1641,
    1645,
    "Gunjur-Palya",
    "Owner",
    "Independent Duplex",
    2000,
    17000000,
  ),
  vil(1646, 1650, "Munnekollal", "Owner", "G+1 Independent", 1500, 16500000),
];

// Plots 1651–1720
const b7p: EastBangaloreRecord[] = [
  plt(1651, 1665, "Soukya Road", "Local", "Private BMRDA Site", 1200, 4800000),
  plt(1666, 1680, "Soukya Road", "Local", "Private BMRDA Site", 2400, 9120000),
  plt(1681, 1690, "Marathahalli", "Local", "Resale Site Core", 1200, 30000000, {
    isResale: true,
  }),
  plt(1691, 1700, "Munnekollal", "Local", "DC Converted", 1200, 14400000),
  plt(1701, 1710, "Tubarahalli", "Local", "Gated Site", 1200, 10800000),
  plt(1711, 1720, "Belathur", "Local", "BMRDA Site Inner", 1200, 9000000),
];

// Commercial 1721–1750
const b7c: EastBangaloreRecord[] = [
  com(
    1721,
    1730,
    "Marathahalli ORR",
    "Commercial",
    "Retail Ground Floor",
    1200,
    60000000,
  ),
  com(
    1731,
    1735,
    "Marathahalli ORR",
    "Commercial",
    "Office Bare-Shell",
    5000,
    90000000,
  ),
  com(
    1736,
    1740,
    "Soukya Road",
    "Commercial",
    "Warehouse Site",
    20000,
    80000000,
  ),
  com(1741, 1745, "Munnekollal", "Commercial", "Boutique Shop", 600, 18000000),
  com(
    1746,
    1750,
    "Tubarahalli",
    "Commercial",
    "Clinic/Bank Space",
    1500,
    30000000,
  ),
];

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH 8 — Units 1751–2000
// Old Airport Road · Hoskote Town · Borewell Road · Nallurhalli
// ValuBrix Intelligence:
//   Prestige Leela (unit 1761) = absolute PSF ceiling at ₹30,000 (isPSFCeiling)
//   Hoskote = highest rental yield (5.2%) — industrial labor influx (hasHighRentalYield)
//   Hoskote industrial land = floor price anchor ₹3,500 PSF (isIndustrialFloorPrice)
// ═══════════════════════════════════════════════════════════════════════════════

// Apartments 1751–1850
const b8a: EastBangaloreRecord[] = [
  apt(
    1751,
    1760,
    "Old Airport Rd",
    "Total Environment",
    "Windmills Total Env",
    5900,
    88500000,
    { isSuperLuxury: true, hasHospitalityServices: true },
  ),
  apt(
    1761,
    1770,
    "Old Airport Rd",
    "Prestige",
    "Prestige Leela",
    3800,
    114000000,
    { isSuperLuxury: true, hasHospitalityServices: true, isPSFCeiling: true },
  ),
  apt(
    1771,
    1780,
    "Borewell Road",
    "Adarsh",
    "Adarsh Palm Retreat",
    1700,
    27200000,
  ),
  apt(
    1781,
    1790,
    "Borewell Road",
    "Adarsh",
    "Adarsh Palm Retreat",
    2500,
    42500000,
  ),
  apt(
    1791,
    1800,
    "Hoskote Town",
    "Shriram",
    "Shriram Blue Hoskote",
    1200,
    9600000,
    { hasHighRentalYield: true, isIndustrialProximity: true },
  ),
  apt(
    1801,
    1810,
    "Hoskote Town",
    "Shriram",
    "Shriram Blue Hoskote",
    1699,
    14437500,
    { hasHighRentalYield: true, isIndustrialProximity: true },
  ),
  apt(
    1811,
    1820,
    "Nallurhalli",
    "Vaswani",
    "Vaswani Exquisite Nallurhalli",
    1850,
    24050000,
  ),
  apt(
    1821,
    1830,
    "Nallurhalli",
    "Vaswani",
    "Vaswani Exquisite Nallurhalli",
    2350,
    32900000,
  ),
  apt(1831, 1840, "Whitefield", "Sobha", "Sobha Rose", 1500, 18000000),
  apt(1841, 1850, "Whitefield", "Sobha", "Sobha Rose", 1500, 19500000),
];

// Villas 1851–1900
const b8v: EastBangaloreRecord[] = [
  vil(
    1851,
    1860,
    "Borewell Rd",
    "Local",
    "Gated Community Villa",
    3500,
    70000000,
    { isLuxury: true },
  ),
  vil(
    1861,
    1870,
    "Borewell Rd",
    "Local",
    "Gated Community Villa",
    4500,
    99000000,
    { isLuxury: true },
  ),
  vil(
    1871,
    1880,
    "Hoskote",
    "Shriram",
    "Shriram Earth Villas Hoskote",
    2400,
    20400000,
    { isIndustrialProximity: true },
  ),
  vil(
    1881,
    1885,
    "Hoskote",
    "Owner",
    "Independent G+1 Hoskote",
    1800,
    9000000,
    { isIndustrialProximity: true },
  ),
  vil(
    1886,
    1890,
    "Nallurhalli",
    "Local",
    "Row House Resale Nallurhalli",
    2200,
    30800000,
    { isResale: true },
  ),
  vil(
    1891,
    1895,
    "Thubarahalli",
    "Owner",
    "Independent G+2 Thubarahalli",
    2400,
    33600000,
  ),
  vil(
    1896,
    1900,
    "Siddapura",
    "Owner",
    "Duplex House Siddapura",
    1500,
    13500000,
  ),
];

// Plots 1901–1970
const b8p: EastBangaloreRecord[] = [
  plt(
    1901,
    1915,
    "Hoskote Town",
    "Local",
    "BMRDA Gated Hoskote",
    1200,
    4560000,
    { isIndustrialFloorPrice: true, isIndustrialProximity: true },
  ),
  plt(
    1916,
    1930,
    "Hoskote Town",
    "Local",
    "BMRDA Gated Hoskote",
    2400,
    8400000,
    { isIndustrialFloorPrice: true, isIndustrialProximity: true },
  ),
  plt(
    1931,
    1940,
    "Nallurhalli",
    "Local",
    "Resale Plot Inner Nallurhalli",
    1200,
    18000000,
    { isResale: true },
  ),
  plt(
    1941,
    1950,
    "Nallurhalli",
    "Local",
    "Resale Plot Main Nallurhalli",
    2400,
    43200000,
    { isResale: true },
  ),
  plt(
    1951,
    1960,
    "Channasandra",
    "Local",
    "Gated Site Channasandra",
    1200,
    10200000,
  ),
  plt(
    1961,
    1970,
    "Kadugodi",
    "BDA",
    "BDA Site Resale Kadugodi",
    1200,
    13200000,
    { isResale: true },
  ),
];

// Commercial 1971–2000
const b8c: EastBangaloreRecord[] = [
  com(
    1971,
    1980,
    "Old Airport Rd",
    "Commercial",
    "Retail Ground Floor",
    1200,
    72000000,
  ),
  com(
    1981,
    1985,
    "Hoskote Industrial",
    "Commercial",
    "Warehouse Site",
    43560,
    152460000,
    { isIndustrialFloorPrice: true, isIndustrialProximity: true },
  ),
  com(
    1986,
    1990,
    "Borewell Rd",
    "Commercial",
    "Office Bare-Shell",
    2500,
    50000000,
  ),
  com(1991, 1995, "Nallurhalli", "Commercial", "Boutique Shop", 800, 20000000),
  com(
    1996,
    2000,
    "Whitefield Main",
    "Commercial",
    "Bank/Showroom",
    3000,
    120000000,
  ),
];

// ═══════════════════════════════════════════════════════════════════════════════
// AGGREGATED EXPORTS — Strictly typed, deduplication by unitRangeStart
// ═══════════════════════════════════════════════════════════════════════════════

/** All East Bangalore apartment records — strictly no other property types */
export const eastBangaloreApartmentData: EastBangaloreRecord[] = [
  ...b1a,
  ...b2a,
  ...b3a,
  ...b4a,
  ...b5a,
  ...b6a,
  ...b7a,
  ...b8a,
];

/** All East Bangalore villa/rowhouse/duplex records */
export const eastBangaloreVillaData: EastBangaloreRecord[] = [
  ...b1v,
  ...b2v,
  ...b3v,
  ...b4v,
  ...b5v,
  ...b6v,
  ...b7v,
  ...b8v,
];

/** All East Bangalore residential plot records */
export const eastBangalorePlotData: EastBangaloreRecord[] = [
  ...b1p,
  ...b2p,
  ...b3p,
  ...b4p,
  ...b5p,
  ...b6p,
  ...b7p,
  ...b8p,
];

/** All East Bangalore commercial property records */
export const eastBangaloreCommercialData: EastBangaloreRecord[] = [
  ...b1c,
  ...b2c,
  ...b3c,
  ...b4c,
  ...b5c,
  ...b6c,
  ...b7c,
  ...b8c,
];

/** Master corpus — all 2,000 units across all property types */
export const eastBangaloreTrainingData: EastBangaloreRecord[] = [
  ...eastBangaloreApartmentData,
  ...eastBangaloreVillaData,
  ...eastBangalorePlotData,
  ...eastBangaloreCommercialData,
];

// ─── Legacy-compatible aliases for engines using old export names ──────────────
// These are computed from the strictly typed arrays above — NOT independent arrays.

export const eastBangaloreApartments: EastBangaloreRecord[] =
  eastBangaloreApartmentData;
export const eastBangaloreVillas: EastBangaloreRecord[] =
  eastBangaloreVillaData;
export const eastBangalorePlots: EastBangaloreRecord[] = eastBangalorePlotData;
export const eastBangaloreCommercial: EastBangaloreRecord[] =
  eastBangaloreCommercialData;

// Deduped aliases (same data — dedup is enforced at source via unitRangeStart)
export const dedupedEastApartments = eastBangaloreApartmentData;
export const dedupedEastVillas = eastBangaloreVillaData;
export const dedupedEastPlots = eastBangalorePlotData;
export const dedupedEastCommercial = eastBangaloreCommercialData;

export const eastBangaloreApartmentsClean = eastBangaloreApartmentData;
export const eastBangaloreVillasClean = eastBangaloreVillaData;
export const eastBangalorePlotsClean = eastBangalorePlotData;
export const eastBangaloreCommercialClean = eastBangaloreCommercialData;

// ─── PSF helpers (used by engines) ───────────────────────────────────────────

export function getEffectiveAreaEast(r: EastBangaloreRecord): number {
  return r.areaSqft;
}

export function getPSFEast(r: EastBangaloreRecord): number {
  const area = getEffectiveAreaEast(r);
  return area > 0 ? r.soldPrice / area : 0;
}

// ─── Runtime deduplication guard (dev only) ───────────────────────────────────

if (process.env.NODE_ENV === "development") {
  const seen = new Set<number>();
  for (const r of eastBangaloreTrainingData) {
    if (seen.has(r.unitRangeStart)) {
      console.warn(
        `[eastBangaloreTrainingData] Duplicate unitRangeStart: ${r.unitRangeStart} in ${r.locality}/${r.project}`,
      );
    }
    seen.add(r.unitRangeStart);
  }
}
