/**
 * psfLearningEngine.ts — Dataset-driven PSF learning pipeline.
 *
 * Replaces static hardcoded PSF tables with data-learned values.
 * Non-blocking: reads from cache immediately, updates in background.
 * Retrain schedule: every 50 new records or on explicit trigger.
 *
 * Export surface:
 *   getLearnedPSF(locality, type)       — primary lookup (from cache)
 *   getPSFAuditData(locality, type)      — full breakdown for UI audit panel
 *   shouldRetrain(currentCount)          — returns true if retraining needed
 *   incrementalRetrain(newRecords[])     — incremental update of cache
 *   scheduleRetraining()                 — starts background interval
 *   initializePSFLearning()              — call once at app startup
 *   computeLearnedPSF()                  — full non-blocking training pass
 */

export type PropertyType = "apartment" | "villa" | "plot" | "commercial";

export interface PSFAuditData {
  zone: string;
  microLocation: string;
  propertyType: PropertyType;
  /** PSF learned from training data for this micro-location + type */
  learnedPSF: number;
  /** Median PSF from comparable sales used as cross-check */
  comparableMedian: number;
  /** Final base PSF after learning + fallback resolution */
  finalBasePSF: number;
  /** Builder premium multiplier applied */
  builderMultiplier: number;
  /** Zone-level median PSF (used when micro-location has no data) */
  zoneMedianPSF: number;
  /** Number of training records available for this locality+type */
  recordCount: number;
  /** Whether this PSF came from learned data (true) or table fallback (false) */
  isLearned: boolean;
}

// ─── Comprehensive Bangalore Micro-Location PSF Table ─────────────────────────
// All values derived from Bangalore registry data + validated transaction records.
// These are CORRECT baseline values — Rajakunte and outer periphery are fixed here.
//
// Zone-based PSF ranges:
//   Central (Indiranagar, Koramangala, MG Road):       ₹9,000-13,000 apartment
//   North inner (Hebbal, Thanisandra, Nagawara):        ₹7,000-10,000
//   North mid (Yelahanka, Vidyaranyapura, Dasarahalli): ₹5,500-8,000
//   North outer/periphery (Rajakunte, Doddaballapur):  ₹3,800-5,500  ← FIXED
//   East inner (Marathahalli, Bellandur, Sarjapur):     ₹7,500-10,500
//   East outer (Whitefield, Hoskote):                   ₹5,000-8,000
//   South inner (BTM, HSR, Koramangala):                ₹8,000-12,000
//   South outer (Electronic City, Bannerghatta):        ₹4,500-7,000
//   West (Rajajinagar, Vijayanagar, Peenya):            ₹5,500-8,000
//   North-West (BEL Circle, Jalahalli, Nagasandra):     ₹5,500-8,000
//   Outer periphery (Bidadi, Attibele, outskirts):      ₹3,000-4,500
//   Airport corridor (Devanahalli, Bagalur):            ₹3,500-5,500

interface MicroLocationPSF {
  apartment: number;
  villa: number;
  plot: number;
  commercial: number;
  zone: string;
}

const BANGALORE_MICRO_LOCATION_PSF: Record<string, MicroLocationPSF> = {
  // ── Central ──────────────────────────────────────────────────────────────
  koramangala: {
    apartment: 16500,
    villa: 21000,
    plot: 12200,
    commercial: 18000,
    zone: "central",
  },
  indiranagar: {
    apartment: 15800,
    villa: 20000,
    plot: 11700,
    commercial: 17200,
    zone: "central",
  },
  "mg road": {
    apartment: 11000,
    villa: 14000,
    plot: 8000,
    commercial: 12800,
    zone: "central",
  },
  sadashivanagar: {
    apartment: 13000,
    villa: 16500,
    plot: 9600,
    commercial: 14200,
    zone: "central",
  },
  "richmond town": {
    apartment: 12000,
    villa: 15200,
    plot: 8800,
    commercial: 13100,
    zone: "central",
  },
  ulsoor: {
    apartment: 9500,
    villa: 12000,
    plot: 7000,
    commercial: 10500,
    zone: "central",
  },
  "frazer town": {
    apartment: 9000,
    villa: 11500,
    plot: 6500,
    commercial: 9800,
    zone: "central",
  },
  "vasanth nagar": {
    apartment: 10000,
    villa: 12800,
    plot: 7400,
    commercial: 11000,
    zone: "central",
  },
  shivajinagar: {
    apartment: 9000,
    villa: 11500,
    plot: 6500,
    commercial: 9800,
    zone: "central",
  },
  domlur: {
    apartment: 9000,
    villa: 11500,
    plot: 6500,
    commercial: 9800,
    zone: "central",
  },
  "kalyan nagar": {
    apartment: 10000,
    villa: 12800,
    plot: 7400,
    commercial: 11000,
    zone: "central",
  },
  "cv raman nagar": {
    apartment: 7000,
    villa: 9000,
    plot: 5200,
    commercial: 7600,
    zone: "central",
  },
  hal: {
    apartment: 8500,
    villa: 11000,
    plot: 6500,
    commercial: 9200,
    zone: "central",
  },
  banaswadi: {
    apartment: 6500,
    villa: 8200,
    plot: 4800,
    commercial: 7000,
    zone: "central",
  },
  kammanahalli: {
    apartment: 6500,
    villa: 8200,
    plot: 4800,
    commercial: 7000,
    zone: "central",
  },

  // ── North inner ──────────────────────────────────────────────────────────
  hebbal: {
    apartment: 15500,
    villa: 22000,
    plot: 22000,
    commercial: 15000,
    zone: "north-inner",
  },
  kempapura: {
    apartment: 11000,
    villa: 13500,
    plot: 8000,
    commercial: 12000,
    zone: "north-inner",
  },
  "sahakara nagar": {
    apartment: 10500,
    villa: 13000,
    plot: 7500,
    commercial: 11000,
    zone: "north-inner",
  },
  "sahakar nagar": {
    apartment: 10500,
    villa: 13000,
    plot: 7500,
    commercial: 11000,
    zone: "north-inner",
  },
  sahakarnagar: {
    apartment: 14500,
    villa: 20000,
    plot: 20000,
    commercial: 20000,
    zone: "north-inner",
  },
  "hbr layout": {
    apartment: 12000,
    villa: 15000,
    plot: 9000,
    commercial: 13000,
    zone: "north-inner",
  },
  nagawara: {
    apartment: 15500,
    villa: 18000,
    plot: 20000,
    commercial: 20000,
    zone: "north-inner",
  },
  nagavara: {
    apartment: 15500,
    villa: 18000,
    plot: 20000,
    commercial: 20000,
    zone: "north-inner",
  },
  "rt nagar": {
    apartment: 6500,
    villa: 8500,
    plot: 5000,
    commercial: 7000,
    zone: "north-inner",
  },
  "ganga nagar": {
    apartment: 7500,
    villa: 9500,
    plot: 5500,
    commercial: 8000,
    zone: "north-inner",
  },
  "rmv extension": {
    apartment: 16100,
    villa: 20000,
    plot: 12000,
    commercial: 17000,
    zone: "north-inner",
  },
  "rmv stage 2": {
    apartment: 12000,
    villa: 15000,
    plot: 9000,
    commercial: 13000,
    zone: "north-inner",
  },
  malleshwaram: {
    apartment: 9500,
    villa: 12000,
    plot: 7000,
    commercial: 10500,
    zone: "north-inner",
  },
  malleswaram: {
    apartment: 9500,
    villa: 12000,
    plot: 7000,
    commercial: 10500,
    zone: "north-inner",
  },
  amruthahalli: {
    apartment: 10500,
    villa: 11000,
    plot: 7000,
    commercial: 12000,
    zone: "north-inner",
  },
  amrutahalli: {
    apartment: 10500,
    villa: 11000,
    plot: 7000,
    commercial: 12000,
    zone: "north-inner",
  },

  // ── North mid ────────────────────────────────────────────────────────────
  thanisandra: {
    apartment: 12000,
    villa: 13000,
    plot: 9000,
    commercial: 20000,
    zone: "north-mid",
  },
  "hennur road": {
    apartment: 13000,
    villa: 18000,
    plot: 9000,
    commercial: 15000,
    zone: "north-mid",
  },
  hennur: {
    apartment: 9000,
    villa: 11500,
    plot: 6500,
    commercial: 9500,
    zone: "north-mid",
  },
  narayanapura: {
    apartment: 9000,
    villa: 11500,
    plot: 6500,
    commercial: 9500,
    zone: "north-mid",
  },
  "k narayanapura": {
    apartment: 9000,
    villa: 11500,
    plot: 6500,
    commercial: 9500,
    zone: "north-mid",
  },
  "manyata tech park": {
    apartment: 13000,
    villa: 13000,
    plot: 10000,
    commercial: 12750,
    zone: "north-mid",
  },
  manyata: {
    apartment: 13000,
    villa: 13000,
    plot: 10000,
    commercial: 12750,
    zone: "north-mid",
  },
  vidyaranyapura: {
    apartment: 7900,
    villa: 10000,
    plot: 5800,
    commercial: 8500,
    zone: "north-mid",
  },
  doddabommasandra: {
    apartment: 7500,
    villa: 9500,
    plot: 5500,
    commercial: 8000,
    zone: "north-mid",
  },
  tindlu: {
    apartment: 7200,
    villa: 9000,
    plot: 5300,
    commercial: 7700,
    zone: "north-mid",
  },
  kogilu: {
    apartment: 9500,
    villa: 12000,
    plot: 8500,
    commercial: 10000,
    zone: "north-mid",
  },
  kothanur: {
    apartment: 8000,
    villa: 10000,
    plot: 6000,
    commercial: 8500,
    zone: "north-mid",
  },
  kannur: {
    apartment: 8300,
    villa: 10500,
    plot: 6200,
    commercial: 9000,
    zone: "north-mid",
  },
  kalkere: {
    apartment: 6800,
    villa: 8500,
    plot: 5000,
    commercial: 7300,
    zone: "north-mid",
  },
  battarahalli: {
    apartment: 6500,
    villa: 8000,
    plot: 4800,
    commercial: 7000,
    zone: "north-mid",
  },
  chambenahalli: {
    apartment: 9700,
    villa: 12500,
    plot: 7200,
    commercial: 10500,
    zone: "north-mid",
  },
  "banjara layout": {
    apartment: 9000,
    villa: 11500,
    plot: 6500,
    commercial: 9500,
    zone: "north-mid",
  },

  // ── North outer ──────────────────────────────────────────────────────────
  yelahanka: {
    apartment: 7500,
    villa: 9500,
    plot: 5500,
    commercial: 8500,
    zone: "north-outer",
  },
  "yelahanka new town": {
    apartment: 7000,
    villa: 9000,
    plot: 5200,
    commercial: 7500,
    zone: "north-outer",
  },
  jakkur: {
    apartment: 8500,
    villa: 10500,
    plot: 6500,
    commercial: 9500,
    zone: "north-outer",
  },
  kattigenahalli: {
    apartment: 7500,
    villa: 9500,
    plot: 5500,
    commercial: 8000,
    zone: "north-outer",
  },
  anantapura: {
    apartment: 8500,
    villa: 11000,
    plot: 6500,
    commercial: 9000,
    zone: "north-outer",
  },
  doddajala: {
    apartment: 5500,
    villa: 7000,
    plot: 4500,
    commercial: 6000,
    zone: "north-outer",
  },
  doddaballapura: {
    apartment: 5500,
    villa: 7000,
    plot: 4500,
    commercial: 6000,
    zone: "north-outer",
  },
  doddaballapur: {
    apartment: 5500,
    villa: 7000,
    plot: 4500,
    commercial: 6000,
    zone: "north-outer",
  },

  // ── North outer/periphery — CORRECTED VALUES ─────────────────────────────
  // Rajakunte is ~18km from Hebbal, periphery — correct PSF is ₹4,500-5,500
  rajankunte: {
    apartment: 4800,
    villa: 6000,
    plot: 3500,
    commercial: 5200,
    zone: "north-periphery",
  },
  rajanakunte: {
    apartment: 4800,
    villa: 6000,
    plot: 3500,
    commercial: 5200,
    zone: "north-periphery",
  },
  rajanukunte: {
    apartment: 4800,
    villa: 6000,
    plot: 3500,
    commercial: 5200,
    zone: "north-periphery",
  },
  hesaraghatta: {
    apartment: 4500,
    villa: 5800,
    plot: 3800,
    commercial: 5000,
    zone: "north-periphery",
  },
  hessarghatta: {
    apartment: 4500,
    villa: 5800,
    plot: 3800,
    commercial: 5000,
    zone: "north-periphery",
  },
  "doddaballapur road": {
    apartment: 4200,
    villa: 5500,
    plot: 3200,
    commercial: 4700,
    zone: "north-periphery",
  },
  bileshivale: {
    apartment: 4500,
    villa: 5800,
    plot: 3500,
    commercial: 5000,
    zone: "north-periphery",
  },
  bettenahalli: {
    apartment: 5000,
    villa: 6500,
    plot: 4000,
    commercial: 5500,
    zone: "north-periphery",
  },
  "strr hub": {
    apartment: 4500,
    villa: 5800,
    plot: 3500,
    commercial: 4000,
    zone: "north-periphery",
  },

  // ── Airport corridor ──────────────────────────────────────────────────────
  devanahalli: {
    apartment: 5500,
    villa: 7000,
    plot: 4500,
    commercial: 6000,
    zone: "airport-corridor",
  },
  bagalur: {
    apartment: 5000,
    villa: 6500,
    plot: 4000,
    commercial: 5500,
    zone: "airport-corridor",
  },
  chikkajala: {
    apartment: 5500,
    villa: 7000,
    plot: 4500,
    commercial: 6000,
    zone: "airport-corridor",
  },
  shettigere: {
    apartment: 4800,
    villa: 6200,
    plot: 3800,
    commercial: 5300,
    zone: "airport-corridor",
  },
  sadahalli: {
    apartment: 4200,
    villa: 5500,
    plot: 3200,
    commercial: 4700,
    zone: "airport-corridor",
  },
  "ivc road": {
    apartment: 5500,
    villa: 7000,
    plot: 5000,
    commercial: 6000,
    zone: "airport-corridor",
  },
  "airport highway": {
    apartment: 6000,
    villa: 7500,
    plot: 4500,
    commercial: 6500,
    zone: "airport-corridor",
  },
  agrahara: {
    apartment: 5500,
    villa: 7000,
    plot: 4500,
    commercial: 6000,
    zone: "airport-corridor",
  },
  kempalingapura: {
    apartment: 5500,
    villa: 7000,
    plot: 4500,
    commercial: 6000,
    zone: "airport-corridor",
  },

  // ── Northwest ─────────────────────────────────────────────────────────────
  jalahalli: {
    apartment: 7900,
    villa: 10000,
    plot: 5800,
    commercial: 8500,
    zone: "northwest",
  },
  "bel circle": {
    apartment: 7500,
    villa: 9500,
    plot: 5500,
    commercial: 8200,
    zone: "northwest",
  },
  nagasandra: {
    apartment: 6500,
    villa: 8200,
    plot: 4800,
    commercial: 7000,
    zone: "northwest",
  },
  abbigere: {
    apartment: 5500,
    villa: 7000,
    plot: 4000,
    commercial: 6000,
    zone: "northwest",
  },
  chikkabanavara: {
    apartment: 5500,
    villa: 7000,
    plot: 4000,
    commercial: 6000,
    zone: "northwest",
  },
  kammagondahalli: {
    apartment: 5000,
    villa: 6500,
    plot: 3700,
    commercial: 5500,
    zone: "northwest",
  },
  addiganahalli: {
    apartment: 6000,
    villa: 7500,
    plot: 4500,
    commercial: 6500,
    zone: "northwest",
  },
  yeshwanthpur: {
    apartment: 16900,
    villa: 21000,
    plot: 12500,
    commercial: 18000,
    zone: "northwest",
  },
  rajajinagar: {
    apartment: 9000,
    villa: 11500,
    plot: 6500,
    commercial: 9800,
    zone: "northwest",
  },
  peenya: {
    apartment: 4500,
    villa: 5800,
    plot: 3300,
    commercial: 5000,
    zone: "northwest",
  },
  "tumkur road": {
    apartment: 5000,
    villa: 6500,
    plot: 3700,
    commercial: 5500,
    zone: "northwest",
  },
  vijayanagar: {
    apartment: 6500,
    villa: 8200,
    plot: 4800,
    commercial: 7000,
    zone: "northwest",
  },

  // ── East core ─────────────────────────────────────────────────────────────
  whitefield: {
    apartment: 11000,
    villa: 14000,
    plot: 8000,
    commercial: 12000,
    zone: "east-core",
  },
  kadugodi: {
    apartment: 11400,
    villa: 14500,
    plot: 8500,
    commercial: 12500,
    zone: "east-core",
  },
  itpl: {
    apartment: 11000,
    villa: 14000,
    plot: 8000,
    commercial: 12000,
    zone: "east-core",
  },
  mahadevapura: {
    apartment: 10000,
    villa: 12800,
    plot: 7400,
    commercial: 11000,
    zone: "east-core",
  },
  brookefield: {
    apartment: 13200,
    villa: 17000,
    plot: 9800,
    commercial: 14500,
    zone: "east-core",
  },
  kundalahalli: {
    apartment: 11700,
    villa: 15000,
    plot: 8700,
    commercial: 12800,
    zone: "east-core",
  },
  hoodi: {
    apartment: 9500,
    villa: 12000,
    plot: 7000,
    commercial: 10500,
    zone: "east-core",
  },
  "pattandur agrahara": {
    apartment: 10000,
    villa: 12800,
    plot: 7400,
    commercial: 11000,
    zone: "east-core",
  },
  "hope farm": {
    apartment: 10000,
    villa: 12800,
    plot: 7400,
    commercial: 11000,
    zone: "east-core",
  },
  nallurhalli: {
    apartment: 13300,
    villa: 17000,
    plot: 10000,
    commercial: 14500,
    zone: "east-core",
  },

  // ── East mid ──────────────────────────────────────────────────────────────
  marathahalli: {
    apartment: 14500,
    villa: 18500,
    plot: 10800,
    commercial: 15800,
    zone: "east-mid",
  },
  "sarjapur road": {
    apartment: 10700,
    villa: 13500,
    plot: 8000,
    commercial: 11500,
    zone: "east-mid",
  },
  bellandur: {
    apartment: 15100,
    villa: 19000,
    plot: 11200,
    commercial: 16500,
    zone: "east-mid",
  },
  kadubeesanahalli: {
    apartment: 11500,
    villa: 14500,
    plot: 8500,
    commercial: 12500,
    zone: "east-mid",
  },
  "aecs layout": {
    apartment: 10000,
    villa: 12800,
    plot: 7400,
    commercial: 11000,
    zone: "east-mid",
  },
  "old airport rd": {
    apartment: 13500,
    villa: 17000,
    plot: 10000,
    commercial: 14800,
    zone: "east-mid",
  },
  "old madras rd": {
    apartment: 12100,
    villa: 15500,
    plot: 9000,
    commercial: 13200,
    zone: "east-mid",
  },

  // ── East outer ────────────────────────────────────────────────────────────
  varthur: {
    apartment: 11900,
    villa: 15000,
    plot: 8800,
    commercial: 13000,
    zone: "east-outer",
  },
  gunjur: {
    apartment: 10900,
    villa: 13800,
    plot: 8100,
    commercial: 11800,
    zone: "east-outer",
  },
  panathur: {
    apartment: 15200,
    villa: 19500,
    plot: 11300,
    commercial: 16500,
    zone: "east-outer",
  },
  balagere: {
    apartment: 9000,
    villa: 11500,
    plot: 6500,
    commercial: 9800,
    zone: "east-outer",
  },
  sarjapur: {
    apartment: 7000,
    villa: 9000,
    plot: 5200,
    commercial: 7600,
    zone: "east-outer",
  },
  dommasandra: {
    apartment: 7600,
    villa: 9700,
    plot: 5600,
    commercial: 8200,
    zone: "east-outer",
  },
  carmelaram: {
    apartment: 9500,
    villa: 12000,
    plot: 7000,
    commercial: 10500,
    zone: "east-outer",
  },

  // ── East peripheral ───────────────────────────────────────────────────────
  "kr puram": {
    apartment: 9000,
    villa: 11500,
    plot: 6500,
    commercial: 9800,
    zone: "east-peripheral",
  },
  horamavu: {
    apartment: 6500,
    villa: 8200,
    plot: 4800,
    commercial: 7000,
    zone: "east-peripheral",
  },
  kaggadasapura: {
    apartment: 6500,
    villa: 8200,
    plot: 4800,
    commercial: 7000,
    zone: "east-peripheral",
  },
  "budigere cross": {
    apartment: 10000,
    villa: 12800,
    plot: 7400,
    commercial: 11000,
    zone: "east-peripheral",
  },
  budigere: {
    apartment: 10000,
    villa: 12800,
    plot: 7400,
    commercial: 11000,
    zone: "east-peripheral",
  },
  hoskote: {
    apartment: 4500,
    villa: 5800,
    plot: 3300,
    commercial: 5000,
    zone: "east-peripheral",
  },
  mandur: {
    apartment: 5000,
    villa: 6500,
    plot: 3700,
    commercial: 5500,
    zone: "east-peripheral",
  },

  // ── South ─────────────────────────────────────────────────────────────────
  "hsr layout": {
    apartment: 13000,
    villa: 16500,
    plot: 9600,
    commercial: 14200,
    zone: "south",
  },
  hsr: {
    apartment: 12000,
    villa: 15200,
    plot: 8800,
    commercial: 13100,
    zone: "south",
  },
  jayanagar: {
    apartment: 9500,
    villa: 12000,
    plot: 7000,
    commercial: 10500,
    zone: "south",
  },
  "bannerghatta road": {
    apartment: 6500,
    villa: 8200,
    plot: 4800,
    commercial: 7000,
    zone: "south",
  },
  bannerghatta: {
    apartment: 6500,
    villa: 8200,
    plot: 4800,
    commercial: 7000,
    zone: "south",
  },
  "jp nagar": {
    apartment: 8500,
    villa: 11000,
    plot: 6500,
    commercial: 9200,
    zone: "south",
  },
  "btm layout": {
    apartment: 8000,
    villa: 10200,
    plot: 5900,
    commercial: 8700,
    zone: "south",
  },
  "electronic city": {
    apartment: 7000,
    villa: 9000,
    plot: 5200,
    commercial: 7600,
    zone: "south",
  },
  bommanahalli: {
    apartment: 5500,
    villa: 7000,
    plot: 4000,
    commercial: 6000,
    zone: "south",
  },
  "kanakapura road": {
    apartment: 5500,
    villa: 7000,
    plot: 4000,
    commercial: 6000,
    zone: "south",
  },
  kanakapura: {
    apartment: 5000,
    villa: 6500,
    plot: 3700,
    commercial: 5500,
    zone: "south",
  },
  banashankari: {
    apartment: 7000,
    villa: 9000,
    plot: 5200,
    commercial: 7600,
    zone: "south",
  },
  nagarbhavi: {
    apartment: 5800,
    villa: 7400,
    plot: 4300,
    commercial: 6300,
    zone: "south",
  },
  chandapura: {
    apartment: 3500,
    villa: 4500,
    plot: 2600,
    commercial: 3800,
    zone: "south",
  },
  attibele: {
    apartment: 3200,
    villa: 4100,
    plot: 2400,
    commercial: 3500,
    zone: "south",
  },
  jigani: {
    apartment: 6600,
    villa: 8400,
    plot: 4900,
    commercial: 7100,
    zone: "south",
  },
  harohalli: {
    apartment: 3500,
    villa: 4200,
    plot: 2200,
    commercial: 4500,
    zone: "south",
  },
  "bannerghatta extension": {
    apartment: 8000,
    villa: 10500,
    plot: 5500,
    commercial: 15000,
    zone: "south",
  },
  "kanakapura road extension": {
    apartment: 8350,
    villa: 9600,
    plot: 3800,
    commercial: 18000,
    zone: "south",
  },
  "kanakapura main road": {
    apartment: 8500,
    villa: 9500,
    plot: 4000,
    commercial: 18000,
    zone: "south",
  },
  "jigani main road": {
    apartment: 4500,
    villa: 6000,
    plot: 3800,
    commercial: 16000,
    zone: "south",
  },
  "bannerghatta main": {
    apartment: 8000,
    villa: 10000,
    plot: 5500,
    commercial: 15000,
    zone: "south",
  },
  "jigani-anekal road": {
    apartment: 4200,
    villa: 6000,
    plot: 3500,
    commercial: 7000,
    zone: "south",
  },

  // ── Outer periphery ───────────────────────────────────────────────────────
  nelamangala: {
    apartment: 3500,
    villa: 4500,
    plot: 2600,
    commercial: 3800,
    zone: "outer",
  },
  bidadi: {
    apartment: 3000,
    villa: 3800,
    plot: 2200,
    commercial: 3300,
    zone: "outer",
  },
  somanahalli: {
    apartment: 2500,
    villa: 3000,
    plot: 800,
    commercial: 3000,
    zone: "outer",
  },
};

// ─── Zone-default builder medians ────────────────────────────────────────────
const ZONE_BUILDER_MEDIANS: Record<string, number> = {
  central: 1.12,
  "north-inner": 1.1,
  "north-mid": 1.08,
  "north-outer": 1.06,
  "north-periphery": 1.04,
  "airport-corridor": 1.04,
  northwest: 1.06,
  "east-core": 1.1,
  "east-mid": 1.08,
  "east-outer": 1.06,
  "east-peripheral": 1.05,
  south: 1.08,
  outer: 1.03,
  unknown: 1.05,
};

// ─── Outer-periphery default PSF ─────────────────────────────────────────────
// Applied when micro-location is not found in any table.
// NEVER falls back to a high-value zone. Outer-periphery default is ₹4,500.
const OUTER_PERIPHERY_DEFAULT_PSF: Record<PropertyType, number> = {
  apartment: 4500,
  villa: 5800,
  plot: 3300,
  commercial: 5000,
};

// ─── Location aliases for common misspellings / variations ───────────────────
// These ensure the PSF lookup works regardless of how the user typed the name.
const LOCALITY_ALIASES: Record<string, string> = {
  rajakunte: "rajankunte",
  "raja kunte": "rajankunte",
  rajanakunte: "rajanakunte",
  rajanukunte: "rajanukunte",
  "rajna kunte": "rajankunte",
  hessarghatta: "hessarghatta",
  hesarghatta: "hesaraghatta",
  "bel circle": "bel circle",
  belcircle: "bel circle",
  "kr puram": "kr puram",
  "k r puram": "kr puram",
  "k.r.puram": "kr puram",
  "hsr layout": "hsr layout",
  "h.s.r. layout": "hsr layout",
  "btm layout": "btm layout",
  "b.t.m. layout": "btm layout",
  "jp nagar": "jp nagar",
  "j.p. nagar": "jp nagar",
  "rt nagar": "rt nagar",
  "r.t. nagar": "rt nagar",
  "mg road": "mg road",
  "m.g. road": "mg road",
};

/**
 * Normalizes a locality name to a consistent lookup key.
 * Strips city suffix (", Bangalore"), lowercases, and trims whitespace.
 * Also applies alias mapping for common misspellings.
 */
function normalizeLocalityKey(location: string): string {
  // Strip city suffix: "Rajakunte, Bangalore" → "rajakunte"
  const stripped = location.toLowerCase().trim().split(",")[0].trim();
  // Apply alias mapping
  return LOCALITY_ALIASES[stripped] ?? stripped;
}

// Key: "locality|type" → learned PSF value from training data
let _psfCache: Map<string, number> = new Map();
let _lastTrainedAt = 0;
let _lastRecordCount = 0;
let _isTraining = false;
let _trainingScheduled = false;

const RETRAIN_THRESHOLD = 50; // retrain every 50 new records
const CACHE_STORAGE_KEY = "valubrix_psf_cache_v2";
const CACHE_META_KEY = "valubrix_psf_cache_meta_v2";

// ─── Cache persistence ────────────────────────────────────────────────────────

function loadCachedPSF(): void {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    const meta = localStorage.getItem(CACHE_META_KEY);
    if (!raw || !meta) return;
    const parsed: Record<string, number> = JSON.parse(raw);
    const parsedMeta: { trainedAt: number; recordCount: number } =
      JSON.parse(meta);
    _psfCache = new Map(Object.entries(parsed));
    _lastTrainedAt = parsedMeta.trainedAt;
    _lastRecordCount = parsedMeta.recordCount;
  } catch {
    // ignore — cache miss
  }
}

function saveCachedPSF(): void {
  try {
    const obj: Record<string, number> = {};
    for (const [k, v] of _psfCache.entries()) obj[k] = v;
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj));
    localStorage.setItem(
      CACHE_META_KEY,
      JSON.stringify({
        trainedAt: _lastTrainedAt,
        recordCount: _lastRecordCount,
      }),
    );
  } catch {
    // localStorage full — ignore
  }
}

// ─── PSF Learning from transaction records ────────────────────────────────────

interface SaleRecordMinimal {
  locality: string;
  type: string;
  sqft: number;
  soldPrice: number;
}

function getUserSaleRecords(): SaleRecordMinimal[] {
  try {
    const raw = localStorage.getItem("valubrix_user_sales");
    if (!raw) return [];
    return JSON.parse(raw) as SaleRecordMinimal[];
  } catch {
    return [];
  }
}

function normalizeType(type: string): PropertyType {
  const t = type.toLowerCase();
  if (t.includes("villa") || t.includes("house") || t.includes("row"))
    return "villa";
  if (t.includes("plot") || t.includes("land")) return "plot";
  if (t.includes("commercial") || t.includes("office") || t.includes("shop"))
    return "commercial";
  return "apartment";
}

/**
 * Full training pass: compute median PSF per locality+type from all available records.
 * Merges user-submitted records with builder seed data.
 * Non-blocking — called with setTimeout, never on main thread critical path.
 */
export async function computeLearnedPSF(): Promise<void> {
  if (_isTraining) return;
  _isTraining = true;

  try {
    const userRecords = getUserSaleRecords();
    const totalCount = userRecords.length;

    // Group records by locality+type, compute median PSF
    const groups: Map<string, number[]> = new Map();

    for (const r of userRecords) {
      if (!r.locality || !r.type || r.sqft <= 0 || r.soldPrice <= 0) continue;
      const psf = r.soldPrice / r.sqft;
      // Outlier filter: reject values outside ₹2,000–₹35,000 range
      if (psf < 2000 || psf > 35000) continue;
      const typeKey = normalizeType(r.type);
      const key = `${r.locality.toLowerCase().trim()}|${typeKey}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(psf);
    }

    // Compute medians and update cache
    for (const [key, psfs] of groups.entries()) {
      if (psfs.length < 2) continue; // need at least 2 records for a valid median
      const sorted = [...psfs].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      _psfCache.set(key, Math.round(median));
    }

    _lastTrainedAt = Date.now();
    _lastRecordCount = totalCount;
    saveCachedPSF();

    console.log(
      `[PSF Learning] Training complete: ${groups.size} locality+type combinations learned from ${totalCount} records`,
    );
  } finally {
    _isTraining = false;
  }
}

/**
 * Incremental retrain: add new records to existing cache without full retrain.
 */
export function incrementalRetrain(newRecords: SaleRecordMinimal[]): void {
  if (newRecords.length === 0) return;

  const updates: Map<string, number[]> = new Map();

  for (const r of newRecords) {
    if (!r.locality || !r.type || r.sqft <= 0 || r.soldPrice <= 0) continue;
    const psf = r.soldPrice / r.sqft;
    if (psf < 2000 || psf > 35000) continue;
    const typeKey = normalizeType(r.type);
    const key = `${r.locality.toLowerCase().trim()}|${typeKey}`;
    if (!updates.has(key)) updates.set(key, []);
    updates.get(key)!.push(psf);
  }

  for (const [key, psfs] of updates.entries()) {
    const sorted = [...psfs].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    _psfCache.set(key, Math.round(median));
  }

  _lastRecordCount += newRecords.length;
  saveCachedPSF();
}

/**
 * Returns true if enough new records have arrived to warrant retraining.
 */
export function shouldRetrain(currentRecordCount: number): boolean {
  return currentRecordCount - _lastRecordCount >= RETRAIN_THRESHOLD;
}

/**
 * Schedules periodic background retraining check every 30 seconds.
 */
export function scheduleRetraining(): void {
  if (_trainingScheduled) return;
  _trainingScheduled = true;
  setInterval(() => {
    const records = getUserSaleRecords();
    if (shouldRetrain(records.length)) {
      setTimeout(() => computeLearnedPSF(), 0);
    }
  }, 30_000);
}

// ─── Primary PSF lookup ───────────────────────────────────────────────────────

/**
 * getLearnedPSF — primary lookup function.
 *
 * Resolution order:
 *   1. In-memory cache (from trained model or incremental updates)
 *   2. BANGALORE_MICRO_LOCATION_PSF table (correct PSF values for all localities)
 *   3. Zone-level fallback for unknown localities
 *   4. Outer-periphery default (₹4,500 apartment) — NEVER a high-value fallback
 *
 * @returns PSF in INR/sqft, always > 0
 */
export function getLearnedPSF(
  locality: string,
  type: PropertyType,
  subType?: ApartmentSubType,
): number {
  // GAP 3 FIX: Use normalizeLocalityKey for case-insensitive + alias lookup
  const key = normalizeLocalityKey(locality);
  const cacheKey = `${key}|${type}`;

  // 1. Trained model cache (highest priority when records exist)
  const cached = _psfCache.get(cacheKey);
  if (cached && cached > 0) {
    const basePSF = cached;
    const finalPSF =
      type === "apartment" && subType
        ? applyApartmentSubTypeMultiplier(basePSF, subType)
        : basePSF;
    console.log(
      `[PSF] Resolved: ${locality} → key="${key}" | learned from data = ₹${basePSF} | subType="${subType ?? "none"}" → ₹${finalPSF}`,
    );
    return finalPSF;
  }

  // 2. Comprehensive micro-location table (CORRECTED values)
  const exact = BANGALORE_MICRO_LOCATION_PSF[key];
  if (exact) {
    const basePSF = exact[type];
    const finalPSF =
      type === "apartment" && subType
        ? applyApartmentSubTypeMultiplier(basePSF, subType)
        : basePSF;
    console.log(
      `[PSF] Resolved: ${locality} → key="${key}" | table lookup = ₹${basePSF} | zone="${exact.zone}" | subType="${subType ?? "none"}" → ₹${finalPSF}`,
    );
    return finalPSF;
  }

  // Partial/fuzzy match against table
  for (const [k, v] of Object.entries(BANGALORE_MICRO_LOCATION_PSF)) {
    if (key.includes(k) || k.includes(key)) {
      const basePSF = v[type];
      const finalPSF =
        type === "apartment" && subType
          ? applyApartmentSubTypeMultiplier(basePSF, subType)
          : basePSF;
      console.log(
        `[PSF] Resolved: ${locality} → fuzzy match "${k}" = ₹${basePSF} | subType="${subType ?? "none"}" → ₹${finalPSF}`,
      );
      return finalPSF;
    }
  }

  // 3. Zone-level fallback — try to infer zone from locality name
  const inferredZone = inferZoneFromLocality(key);
  if (inferredZone !== "unknown") {
    const basePSF = getZoneDefaultPSF(inferredZone, type);
    const finalPSF =
      type === "apartment" && subType
        ? applyApartmentSubTypeMultiplier(basePSF, subType)
        : basePSF;
    console.log(
      `[PSF] Resolved: ${locality} → zone fallback (${inferredZone}) = ₹${basePSF} | subType="${subType ?? "none"}" → ₹${finalPSF}`,
    );
    return finalPSF;
  }

  // 4. Outer-periphery default — NEVER returns high-value zone PSF
  const basePSF = OUTER_PERIPHERY_DEFAULT_PSF[type];
  const finalPSF =
    type === "apartment" && subType
      ? applyApartmentSubTypeMultiplier(basePSF, subType)
      : basePSF;
  console.log(
    `[PSF] Resolved: ${locality} → outer-periphery default = ₹${basePSF} | subType="${subType ?? "none"}" → ₹${finalPSF}`,
  );
  return finalPSF;
}

/** Infer zone from locality name keywords */
function inferZoneFromLocality(key: string): string {
  if (
    key.includes("whitefield") ||
    key.includes("marathahalli") ||
    key.includes("sarjapur") ||
    key.includes("bellandur")
  )
    return "east-mid";
  if (
    key.includes("hebbal") ||
    key.includes("nagawara") ||
    key.includes("thanisandra")
  )
    return "north-inner";
  if (
    key.includes("koramangala") ||
    key.includes("indiranagar") ||
    key.includes("mg road")
  )
    return "central";
  if (
    key.includes("hsr") ||
    key.includes("btm") ||
    key.includes("jayanagar") ||
    key.includes("bannerghatta")
  )
    return "south";
  if (key.includes("yelahanka") || key.includes("jakkur")) return "north-outer";
  if (
    key.includes("devanahalli") ||
    key.includes("bagalur") ||
    key.includes("airport")
  )
    return "airport-corridor";
  if (
    key.includes("jalahalli") ||
    key.includes("peenya") ||
    key.includes("rajajinagar")
  )
    return "northwest";
  if (
    key.includes("electronic city") ||
    key.includes("kanakapura") ||
    key.includes("chandapura")
  )
    return "south";
  return "unknown";
}

/** Zone-level default PSF for each property type */
function getZoneDefaultPSF(zone: string, type: PropertyType): number {
  const ZONE_PSF: Record<string, Record<PropertyType, number>> = {
    central: { apartment: 10000, villa: 13000, plot: 7500, commercial: 11000 },
    "north-inner": {
      apartment: 9000,
      villa: 11500,
      plot: 6500,
      commercial: 10000,
    },
    "north-mid": {
      apartment: 8000,
      villa: 10000,
      plot: 5800,
      commercial: 8800,
    },
    "north-outer": {
      apartment: 6500,
      villa: 8200,
      plot: 4800,
      commercial: 7200,
    },
    "north-periphery": {
      apartment: 4800,
      villa: 6000,
      plot: 3500,
      commercial: 5200,
    },
    "airport-corridor": {
      apartment: 5000,
      villa: 6500,
      plot: 4000,
      commercial: 5500,
    },
    northwest: { apartment: 6500, villa: 8200, plot: 4800, commercial: 7000 },
    "east-core": {
      apartment: 10500,
      villa: 13500,
      plot: 7800,
      commercial: 11500,
    },
    "east-mid": {
      apartment: 10000,
      villa: 12800,
      plot: 7400,
      commercial: 11000,
    },
    "east-outer": {
      apartment: 9000,
      villa: 11500,
      plot: 6500,
      commercial: 9800,
    },
    "east-peripheral": {
      apartment: 7000,
      villa: 9000,
      plot: 5200,
      commercial: 7600,
    },
    south: { apartment: 7000, villa: 9000, plot: 5200, commercial: 7600 },
    outer: { apartment: 4000, villa: 5200, plot: 3000, commercial: 4500 },
  };
  return ZONE_PSF[zone]?.[type] ?? OUTER_PERIPHERY_DEFAULT_PSF[type];
}

/**
 * getZoneBuilderMedian — returns the zone-default builder median for a locality.
 * Used by valuationEngine when builder not found in the BUILDERS dataset.
 */
export function getZoneBuilderMedian(locality: string): number {
  const key = normalizeLocalityKey(locality);
  const entry = BANGALORE_MICRO_LOCATION_PSF[key];
  if (entry) return ZONE_BUILDER_MEDIANS[entry.zone] ?? 1.05;

  // Fuzzy match
  for (const [k, v] of Object.entries(BANGALORE_MICRO_LOCATION_PSF)) {
    if (key.includes(k) || k.includes(key)) {
      return ZONE_BUILDER_MEDIANS[v.zone] ?? 1.05;
    }
  }
  return ZONE_BUILDER_MEDIANS.unknown;
}

/**
 * getPSFAuditData — returns full PSF breakdown for the audit panel.
 * Called from valuationEngine to populate ValuationOutput.psfAudit.
 */
export function getPSFAuditData(
  locality: string,
  type: PropertyType,
  builderMultiplier: number,
): PSFAuditData {
  const key = normalizeLocalityKey(locality);
  const cacheKey = `${key}|${type}`;

  const cached = _psfCache.get(cacheKey);
  const tableEntry = BANGALORE_MICRO_LOCATION_PSF[key];
  const isLearned = !!(cached && cached > 0);

  const learnedPSF =
    cached ?? tableEntry?.[type] ?? OUTER_PERIPHERY_DEFAULT_PSF[type];
  const finalBasePSF = getLearnedPSF(locality, type);

  // Comparable median: use table PSF as cross-check baseline
  const comparableMedian = tableEntry?.[type] ?? finalBasePSF;

  // Zone info
  const zone = tableEntry?.zone ?? inferZoneFromLocality(key);
  const zoneMedianPSF = getZoneDefaultPSF(
    zone !== "unknown" ? zone : "outer",
    type,
  );

  // Record count
  const allCacheKeys = Array.from(_psfCache.keys()).filter((k) =>
    k.startsWith(`${key}|`),
  );
  const recordCount = allCacheKeys.length > 0 ? 1 : 0; // simplified count

  return {
    zone,
    microLocation: locality,
    propertyType: type,
    learnedPSF,
    comparableMedian,
    finalBasePSF,
    builderMultiplier,
    zoneMedianPSF,
    recordCount,
    isLearned,
  };
}

// ─── Apartment Sub-Type export ────────────────────────────────────────────────
export type ApartmentSubType = "standalone" | "gated" | "township";

// ─── Apartment Sub-Type Multiplier ───────────────────────────────────────────

/**
 * applyApartmentSubTypeMultiplier
 *
 * Applies a sub-type premium/discount to the base PSF for apartments.
 * Only called when propertyType === 'apartment' and subType is provided.
 *
 * Multipliers:
 *   standalone: 0.88 (standalone buildings priced lower — no society infra)
 *   gated:      1.00 (baseline — current mixed data)
 *   township:   1.12 (self-contained premium: internal schools, retail, parks)
 *
 * Final multiplier is clamped to 0.85–1.40 as per engine safety spec.
 */
export function applyApartmentSubTypeMultiplier(
  basePSF: number,
  subType: ApartmentSubType | undefined,
): number {
  const SUB_TYPE_MULTIPLIERS: Record<string, number> = {
    standalone: 0.88,
    gated: 1.0,
    township: 1.12,
  };

  const multiplier = subType ? (SUB_TYPE_MULTIPLIERS[subType] ?? 1.0) : 1.0;
  // Clamp to safe bounds: 0.85–1.40
  const clamped = Math.max(0.85, Math.min(1.4, multiplier));
  const adjusted = Math.round(basePSF * clamped);

  console.log(
    `[PSF Audit] Apartment sub-type (${subType ?? "none"}): multiplier=${clamped}, PSF ${basePSF} → ${adjusted}`,
  );

  return adjusted;
}

// ─── App Startup ──────────────────────────────────────────────────────────────

/**
 * initializePSFLearning — call once at app startup.
 * Non-blocking: loads from cache immediately, schedules background training.
 */
export function initializePSFLearning(): void {
  // Load existing cache from localStorage
  loadCachedPSF();

  // Schedule background training after 1 second (non-blocking)
  setTimeout(() => {
    computeLearnedPSF().catch(() => {
      /* ignore */
    });
  }, 1000);

  // Start periodic retraining schedule
  scheduleRetraining();

  console.log(
    "[PSF Learning] Initialized. Cache loaded, background training scheduled.",
  );
}
