/**
 * localityEngine.ts — Single source of truth for locality-level PSF data.
 *
 * ALL engines must import getBaseMicroLocationPSF() from here.
 * Do NOT maintain locality PSF maps in individual engines.
 *
 * Architecture:
 * - localityEngine.ts  ← single source
 *     └── areaIntelligenceEngine.ts (getLocalityBasePrice wraps this)
 *     └── rentEngine.ts (for cold-start yield calculation)
 *     └── Area Intelligence UI
 *
 * ── RETRAINED: April 2026 ──────────────────────────────────────────────────
 * All PSF values recomputed from median of actual sold prices across
 * Batches 1–9 (985+ records, 2020–2026). Where real data exists with
 * ≥3 transactions, median is used directly. For thin-data localities,
 * zone median is used as fallback.
 *
 * ── East/West stubs ────────────────────────────────────────────────────────
 * East Bangalore localities (Whitefield, Marathahalli, etc.) have no South
 * training data — return null from getPSFOrNull() to show 'Data unavailable'.
 * West localities use existing hardcoded estimates or null if absent.
 */

// ─── Per-Type PSF Interface ───────────────────────────────────────────────────
/**
 * LocalityPSF — per-property-type PSF values for a locality.
 * All values are in INR per sq ft (sale price, not rent).
 * baseMedian = weighted median across all property types (used for area-level display).
 *
 * Architecture:
 *   localityEngine.ts (single source of truth)
 *     ├── Area Intelligence → getBaseMedianPSF() (display as "Base Market PSF")
 *     ├── AI Valuation → getBasePSF(locality, propertyType) + adjustments
 *     └── Comparison → same getBasePSF() call
 */
export interface LocalityPSF {
  apartment: number;
  villa: number;
  plot: number;
  commercial: number;
  /** Weighted median across all types — used for area-level display */
  baseMedian: number;
}

// ─── Per-type PSF map (single source of truth) ────────────────────────────────
// All values: INR per sq ft (2025–2026 verified transaction data)
// Property-type multiplier rationale:
//   villa ≈ apartment × 1.2–1.35 (larger land premium + construction)
//   plot  ≈ apartment × 0.7–0.85 (no construction value)
//   commercial ≈ apartment × 1.0–1.15 (higher yield but smaller stock)
const LOCALITY_BASE_PSF_TYPED: Record<string, LocalityPSF> = {
  // ── North Bangalore ── High-demand inner zone ─────────────────────────────
  // Hebbal: updated April 2026 — apartment median ₹15,500, villa ₹22,000, plot ₹22,000
  hebbal: {
    apartment: 15500,
    villa: 22000,
    plot: 22000,
    commercial: 15000,
    baseMedian: 15500,
  },
  kempapura: {
    apartment: 11000,
    villa: 13500,
    plot: 8000,
    commercial: 12000,
    baseMedian: 11000,
  },
  "sahakara nagar": {
    apartment: 10500,
    villa: 13000,
    plot: 7500,
    commercial: 11000,
    baseMedian: 10500,
  },
  "sahakar nagar": {
    apartment: 10500,
    villa: 13000,
    plot: 7500,
    commercial: 11000,
    baseMedian: 10500,
  },
  "hbr layout": {
    apartment: 12000,
    villa: 15000,
    plot: 9000,
    commercial: 13000,
    baseMedian: 12000,
  },
  "hennur road": {
    apartment: 13000,
    villa: 18000,
    plot: 9000,
    commercial: 15000,
    baseMedian: 13000,
  },
  "hennur rd": {
    apartment: 13000,
    villa: 18000,
    plot: 9000,
    commercial: 15000,
    baseMedian: 13000,
  },
  hennur: {
    apartment: 9000,
    villa: 11500,
    plot: 6500,
    commercial: 9500,
    baseMedian: 9000,
  },
  nagawara: {
    apartment: 15500,
    villa: 18000,
    plot: 20000,
    commercial: 20000,
    baseMedian: 15500,
  },
  nagavara: {
    apartment: 15500,
    villa: 18000,
    plot: 20000,
    commercial: 20000,
    baseMedian: 15500,
  },
  "manyata tech park": {
    apartment: 13000,
    villa: 13000,
    plot: 10000,
    commercial: 12750,
    baseMedian: 13000,
  },
  "aerospace park": {
    apartment: 9000,
    villa: 11500,
    plot: 6500,
    commercial: 9500,
    baseMedian: 9000,
  },
  chikkagubbi: {
    apartment: 9500,
    villa: 12000,
    plot: 7000,
    commercial: 10000,
    baseMedian: 9500,
  },
  narayanapura: {
    apartment: 9000,
    villa: 11500,
    plot: 6500,
    commercial: 9500,
    baseMedian: 9000,
  },
  "k narayanapura": {
    apartment: 9000,
    villa: 11500,
    plot: 6500,
    commercial: 9500,
    baseMedian: 9000,
  },
  // Thanisandra: updated April 2026 — apartment median ₹12,000
  thanisandra: {
    apartment: 12000,
    villa: 13000,
    plot: 9000,
    commercial: 20000,
    baseMedian: 12000,
  },
  rajankunte: {
    apartment: 11500,
    villa: 11000,
    plot: 8000,
    commercial: 10000,
    baseMedian: 11500,
  },
  rajanakunte: {
    apartment: 11500,
    villa: 11000,
    plot: 8000,
    commercial: 10000,
    baseMedian: 11500,
  },
  kothanur: {
    apartment: 8000,
    villa: 10000,
    plot: 6000,
    commercial: 8500,
    baseMedian: 8000,
  },
  // Kogilu: updated April 2026 — apartment median ₹9,500
  kogilu: {
    apartment: 9500,
    villa: 12000,
    plot: 8500,
    commercial: 10000,
    baseMedian: 9500,
  },
  "rt nagar": {
    apartment: 6500,
    villa: 8500,
    plot: 5000,
    commercial: 7000,
    baseMedian: 6500,
  },
  "ganga nagar": {
    apartment: 7500,
    villa: 9500,
    plot: 5500,
    commercial: 8000,
    baseMedian: 7500,
  },
  // RMV Extension: 6 records → median ₹16,135/sqft
  "rmv extension": {
    apartment: 16100,
    villa: 20000,
    plot: 12000,
    commercial: 17000,
    baseMedian: 16100,
  },
  "rmv ext.": {
    apartment: 16100,
    villa: 20000,
    plot: 12000,
    commercial: 17000,
    baseMedian: 16100,
  },
  "rmv stage 2": {
    apartment: 12000,
    villa: 15000,
    plot: 9000,
    commercial: 13000,
    baseMedian: 12000,
  },
  malleshwaram: {
    apartment: 9500,
    villa: 12000,
    plot: 7000,
    commercial: 10500,
    baseMedian: 9500,
  },
  malleswaram: {
    apartment: 9500,
    villa: 12000,
    plot: 7000,
    commercial: 10500,
    baseMedian: 9500,
  },
  "banjara layout": {
    apartment: 9000,
    villa: 11500,
    plot: 6500,
    commercial: 9500,
    baseMedian: 9000,
  },
  // Vidyaranyapura: 10 records → median ₹7,870
  vidyaranyapura: {
    apartment: 7900,
    villa: 10000,
    plot: 5800,
    commercial: 8500,
    baseMedian: 7900,
  },
  doddabommasandra: {
    apartment: 7500,
    villa: 9500,
    plot: 5500,
    commercial: 8000,
    baseMedian: 7500,
  },
  tindlu: {
    apartment: 7200,
    villa: 9000,
    plot: 5300,
    commercial: 7700,
    baseMedian: 7200,
  },
  "muthyala nagar": {
    apartment: 7200,
    villa: 9000,
    plot: 5300,
    commercial: 7700,
    baseMedian: 7200,
  },

  // ── North Bangalore ── Mid zone ───────────────────────────────────────────
  // Yelahanka: updated April 2026 — apartment median ₹12,000
  yelahanka: {
    apartment: 12000,
    villa: 14000,
    plot: 9500,
    commercial: 22000,
    baseMedian: 12000,
  },
  "yelahanka new town": {
    apartment: 7000,
    villa: 9000,
    plot: 5200,
    commercial: 7500,
    baseMedian: 7000,
  },
  // Jakkur: updated April 2026 — apartment median ₹13,000
  jakkur: {
    apartment: 13000,
    villa: 14000,
    plot: 13000,
    commercial: 15000,
    baseMedian: 13000,
  },
  kattigenahalli: {
    apartment: 7500,
    villa: 9500,
    plot: 5500,
    commercial: 8000,
    baseMedian: 7500,
  },
  "nehru nagar": {
    apartment: 7000,
    villa: 9000,
    plot: 5200,
    commercial: 7500,
    baseMedian: 7000,
  },
  anantapura: {
    apartment: 8500,
    villa: 11000,
    plot: 6500,
    commercial: 9000,
    baseMedian: 8500,
  },
  nallurhalli: {
    apartment: 13300,
    villa: 17000,
    plot: 10000,
    commercial: 14500,
    baseMedian: 13300,
  },
  chambenahalli: {
    apartment: 9700,
    villa: 12500,
    plot: 7200,
    commercial: 10500,
    baseMedian: 9700,
  },
  // Kannur: 4 records → median ₹8,307
  kannur: {
    apartment: 8300,
    villa: 10500,
    plot: 6200,
    commercial: 9000,
    baseMedian: 8300,
  },
  // Kalkere: 6 records → median ₹6,777
  kalkere: {
    apartment: 6800,
    villa: 8500,
    plot: 5000,
    commercial: 7300,
    baseMedian: 6800,
  },
  // Battarahalli: 4 records → median ₹6,463
  battarahalli: {
    apartment: 6500,
    villa: 8000,
    plot: 4800,
    commercial: 7000,
    baseMedian: 6500,
  },

  // ── North Bangalore ── Outer / Airport corridor ───────────────────────────
  // Bagalur: updated April 2026 — apartment median ₹11,000
  bagalur: {
    apartment: 11000,
    villa: 12000,
    plot: 5500,
    commercial: 8000,
    baseMedian: 11000,
  },
  // Devanahalli: updated April 2026 — apartment median ₹10,000
  devanahalli: {
    apartment: 10000,
    villa: 12000,
    plot: 8500,
    commercial: 8000,
    baseMedian: 10000,
  },
  // Chikkajala: updated April 2026 — apartment median ₹11,000
  chikkajala: {
    apartment: 11000,
    villa: 13000,
    plot: 7500,
    commercial: 10000,
    baseMedian: 11000,
  },
  // Shettigere: 9 records → median ₹8,918
  shettigere: {
    apartment: 8900,
    villa: 11500,
    plot: 6700,
    commercial: 9500,
    baseMedian: 8900,
  },
  // Sadahalli: updated April 2026 — apartment median ₹5,800
  sadahalli: {
    apartment: 5800,
    villa: 7000,
    plot: 4500,
    commercial: 5000,
    baseMedian: 5800,
  },
  "ivc road": {
    apartment: 13000,
    villa: 16000,
    plot: 11500,
    commercial: 15000,
    baseMedian: 13000,
  },
  // Doddaballapur: updated April 2026 — apartment median ₹6,000
  doddaballapur: {
    apartment: 6000,
    villa: 7000,
    plot: 4500,
    commercial: 8000,
    baseMedian: 6000,
  },
  "airport rd": {
    apartment: 22000,
    villa: 20000,
    plot: 14000,
    commercial: 16000,
    baseMedian: 22000,
  },
  "airport road": {
    apartment: 22000,
    villa: 20000,
    plot: 14000,
    commercial: 16000,
    baseMedian: 22000,
  },
  "hoskote rd": {
    apartment: 9200,
    villa: 11500,
    plot: 6800,
    commercial: 9800,
    baseMedian: 9200,
  },

  // ── North Bangalore ── New localities from April 2026 batches ─────────────
  // IVC Road: high-growth airport corridor — plots ₹11,500, apts ₹13,000
  hesaraghatta: {
    apartment: 5650,
    villa: 7000,
    plot: 5500,
    commercial: 5000,
    baseMedian: 5650,
  },
  rachenahalli: {
    apartment: 12000,
    villa: 11000,
    plot: 8000,
    commercial: 12000,
    baseMedian: 12000,
  },
  amrutahalli: {
    apartment: 10500,
    villa: 11000,
    plot: 7000,
    commercial: 12000,
    baseMedian: 10500,
  },
  amruthahalli: {
    apartment: 10500,
    villa: 11000,
    plot: 7000,
    commercial: 12000,
    baseMedian: 10500,
  },
  kodigehalli: {
    apartment: 18500,
    villa: 20000,
    plot: 15000,
    commercial: 20000,
    baseMedian: 18500,
  },
  agrahara: {
    apartment: 11800,
    villa: 12000,
    plot: 8000,
    commercial: 12000,
    baseMedian: 11800,
  },
  bettahalsoor: {
    apartment: 12000,
    villa: 23000,
    plot: 10000,
    commercial: 12000,
    baseMedian: 12000,
  },
  kempalingapura: {
    apartment: 10000,
    villa: 12000,
    plot: 8000,
    commercial: 10000,
    baseMedian: 10000,
  },
  doddajala: {
    apartment: 7000,
    villa: 8000,
    plot: 8300,
    commercial: 7000,
    baseMedian: 7000,
  },
  doddaballapura: {
    apartment: 7000,
    villa: 8000,
    plot: 8300,
    commercial: 7000,
    baseMedian: 7000,
  },
  bileshivale: {
    apartment: 6000,
    villa: 7000,
    plot: 5500,
    commercial: 6000,
    baseMedian: 6000,
  },
  bettenahalli: {
    apartment: 8000,
    villa: 9000,
    plot: 8500,
    commercial: 8000,
    baseMedian: 8000,
  },
  manyata: {
    apartment: 13000,
    villa: 13000,
    plot: 10000,
    commercial: 12750,
    baseMedian: 13000,
  },
  "bellary road": {
    apartment: 12000,
    villa: 13000,
    plot: 10000,
    commercial: 12850,
    baseMedian: 12000,
  },
  "bellary rd": {
    apartment: 12000,
    villa: 13000,
    plot: 10000,
    commercial: 12850,
    baseMedian: 12000,
  },
  "strr hub": {
    apartment: 6000,
    villa: 6500,
    plot: 4500,
    commercial: 4000,
    baseMedian: 6000,
  },
  "airport highway": {
    apartment: 15000,
    villa: 15000,
    plot: 10000,
    commercial: 5000,
    baseMedian: 15000,
  },
  // Rajanukunte: updated April 2026 — apartment ₹11,500, plot ₹8,000
  rajanukunte: {
    apartment: 11500,
    villa: 11000,
    plot: 8000,
    commercial: 10000,
    baseMedian: 11500,
  },
  // Sahakarnagar: updated April 2026 — apartment ₹14,500, plot ₹20,000
  sahakarnagar: {
    apartment: 14500,
    villa: 20000,
    plot: 20000,
    commercial: 20000,
    baseMedian: 14500,
  },

  // ── Northwest Bangalore ───────────────────────────────────────────────────
  // Jalahalli: 10 records → median ₹7,881
  jalahalli: {
    apartment: 7900,
    villa: 10000,
    plot: 5800,
    commercial: 8500,
    baseMedian: 7900,
  },
  abbigere: {
    apartment: 5500,
    villa: 7000,
    plot: 4000,
    commercial: 6000,
    baseMedian: 5500,
  },
  chikkabanavara: {
    apartment: 5500,
    villa: 7000,
    plot: 4000,
    commercial: 6000,
    baseMedian: 5500,
  },
  kammagondahalli: {
    apartment: 5000,
    villa: 6500,
    plot: 3700,
    commercial: 5500,
    baseMedian: 5000,
  },
  // Yeshwanthpur: 4 records → median ₹16,887 (premium area)
  yeshwanthpur: {
    apartment: 16900,
    villa: 21000,
    plot: 12500,
    commercial: 18000,
    baseMedian: 16900,
  },
  rajajinagar: {
    apartment: 9000,
    villa: 11500,
    plot: 6500,
    commercial: 9800,
    baseMedian: 9000,
  },
  peenya: {
    apartment: 4500,
    villa: 5800,
    plot: 3300,
    commercial: 5000,
    baseMedian: 4500,
  },
  "tumkur road": {
    apartment: 5000,
    villa: 6500,
    plot: 3700,
    commercial: 5500,
    baseMedian: 5000,
  },
  addiganahalli: {
    apartment: 6000,
    villa: 7500,
    plot: 4500,
    commercial: 6500,
    baseMedian: 6000,
  },

  // ── East Bangalore ── Core IT hub ─────────────────────────────────────────
  // Whitefield: 96 records → median ₹11,000
  whitefield: {
    apartment: 11000,
    villa: 14000,
    plot: 8000,
    commercial: 12000,
    baseMedian: 11000,
  },
  // Kadugodi: 7 records → median ₹11,440
  kadugodi: {
    apartment: 11400,
    villa: 14500,
    plot: 8500,
    commercial: 12500,
    baseMedian: 11400,
  },
  "pattandur agrahara": {
    apartment: 10000,
    villa: 12800,
    plot: 7400,
    commercial: 11000,
    baseMedian: 10000,
  },
  "hope farm": {
    apartment: 10000,
    villa: 12800,
    plot: 7400,
    commercial: 11000,
    baseMedian: 10000,
  },
  itpl: {
    apartment: 11000,
    villa: 14000,
    plot: 8000,
    commercial: 12000,
    baseMedian: 11000,
  },
  mahadevapura: {
    apartment: 10000,
    villa: 12800,
    plot: 7400,
    commercial: 11000,
    baseMedian: 10000,
  },
  // Brookefield: 5 records → median ₹13,241
  brookefield: {
    apartment: 13200,
    villa: 17000,
    plot: 9800,
    commercial: 14500,
    baseMedian: 13200,
  },
  kundalahalli: {
    apartment: 11700,
    villa: 15000,
    plot: 8700,
    commercial: 12800,
    baseMedian: 11700,
  },
  hoodi: {
    apartment: 9500,
    villa: 12000,
    plot: 7000,
    commercial: 10500,
    baseMedian: 9500,
  },
  omr: {
    apartment: 10700,
    villa: 13500,
    plot: 8000,
    commercial: 11500,
    baseMedian: 10700,
  },
  gedalahalli: {
    apartment: 10000,
    villa: 12800,
    plot: 7400,
    commercial: 11000,
    baseMedian: 10000,
  },
  geddalahalli: {
    apartment: 9500,
    villa: 12000,
    plot: 7000,
    commercial: 10500,
    baseMedian: 9500,
  },

  // ── East Bangalore ── Mid ─────────────────────────────────────────────────
  // Marathahalli: 11 records → median ₹14,486
  marathahalli: {
    apartment: 14500,
    villa: 18500,
    plot: 10800,
    commercial: 15800,
    baseMedian: 14500,
  },
  "aecs layout": {
    apartment: 10000,
    villa: 12800,
    plot: 7400,
    commercial: 11000,
    baseMedian: 10000,
  },
  kadubeesanahalli: {
    apartment: 11500,
    villa: 14500,
    plot: 8500,
    commercial: 12500,
    baseMedian: 11500,
  },
  // Sarjapur Road: 74 records → median ₹10,690
  "sarjapur road": {
    apartment: 10700,
    villa: 13500,
    plot: 8000,
    commercial: 11500,
    baseMedian: 10700,
  },
  "sarjapur rd": {
    apartment: 10700,
    villa: 13500,
    plot: 8000,
    commercial: 11500,
    baseMedian: 10700,
  },
  sarjapur: {
    apartment: 7000,
    villa: 9000,
    plot: 5200,
    commercial: 7600,
    baseMedian: 7000,
  },
  // Bellandur: 6 records → median ₹15,144
  bellandur: {
    apartment: 15100,
    villa: 19000,
    plot: 11200,
    commercial: 16500,
    baseMedian: 15100,
  },
  "old airport rd": {
    apartment: 13500,
    villa: 17000,
    plot: 10000,
    commercial: 14800,
    baseMedian: 13500,
  },
  "old madras rd": {
    apartment: 12100,
    villa: 15500,
    plot: 9000,
    commercial: 13200,
    baseMedian: 12100,
  },
  kodihalli: {
    apartment: 10000,
    villa: 12800,
    plot: 7400,
    commercial: 11000,
    baseMedian: 10000,
  },
  "dooravani nagar": {
    apartment: 7000,
    villa: 9000,
    plot: 5200,
    commercial: 7600,
    baseMedian: 7000,
  },

  // ── East Bangalore ── Outer ───────────────────────────────────────────────
  // Varthur: 31 records → median ₹11,931
  varthur: {
    apartment: 11900,
    villa: 15000,
    plot: 8800,
    commercial: 13000,
    baseMedian: 11900,
  },
  // Gunjur: 5 records → median ₹10,869
  gunjur: {
    apartment: 10900,
    villa: 13800,
    plot: 8100,
    commercial: 11800,
    baseMedian: 10900,
  },
  // Panathur: 24 records → median ₹15,196
  panathur: {
    apartment: 15200,
    villa: 19500,
    plot: 11300,
    commercial: 16500,
    baseMedian: 15200,
  },
  balagere: {
    apartment: 9000,
    villa: 11500,
    plot: 6500,
    commercial: 9800,
    baseMedian: 9000,
  },
  avalahalli: {
    apartment: 7000,
    villa: 9000,
    plot: 5200,
    commercial: 7600,
    baseMedian: 7000,
  },

  // ── East Bangalore ── Peripheral ─────────────────────────────────────────
  // KR Puram: 12 records → median ₹8,992
  "kr puram": {
    apartment: 9000,
    villa: 11500,
    plot: 6500,
    commercial: 9800,
    baseMedian: 9000,
  },
  horamavu: {
    apartment: 6500,
    villa: 8200,
    plot: 4800,
    commercial: 7000,
    baseMedian: 6500,
  },
  kaggadasapura: {
    apartment: 6500,
    villa: 8200,
    plot: 4800,
    commercial: 7000,
    baseMedian: 6500,
  },
  // Budigere Cross: 22 records → median ₹10,000
  "budigere cross": {
    apartment: 10000,
    villa: 12800,
    plot: 7400,
    commercial: 11000,
    baseMedian: 10000,
  },
  budigere: {
    apartment: 10000,
    villa: 12800,
    plot: 7400,
    commercial: 11000,
    baseMedian: 10000,
  },
  mandur: {
    apartment: 5000,
    villa: 6500,
    plot: 3700,
    commercial: 5500,
    baseMedian: 5000,
  },
  // Hoskote: 10 records → median ₹3,100/sqft (affordable outskirt)
  hoskote: {
    apartment: 4500,
    villa: 5800,
    plot: 3300,
    commercial: 5000,
    baseMedian: 4500,
  },
  dommasandra: {
    apartment: 7600,
    villa: 9700,
    plot: 5600,
    commercial: 8200,
    baseMedian: 7600,
  },
  carmelaram: {
    apartment: 9500,
    villa: 12000,
    plot: 7000,
    commercial: 10500,
    baseMedian: 9500,
  },

  // ── South Bangalore ───────────────────────────────────────────────────────
  // HSR Layout: 3 records → median ₹13,000
  "hsr layout": {
    apartment: 13000,
    villa: 16500,
    plot: 9600,
    commercial: 14200,
    baseMedian: 13000,
  },
  hsr: {
    apartment: 12000,
    villa: 15200,
    plot: 8800,
    commercial: 13100,
    baseMedian: 12000,
  },
  // Koramangala: 3 records → median ₹16,500
  koramangala: {
    apartment: 16500,
    villa: 21000,
    plot: 12200,
    commercial: 18000,
    baseMedian: 16500,
  },
  // Indiranagar: 2 records → median ₹15,750
  indiranagar: {
    apartment: 15800,
    villa: 20000,
    plot: 11700,
    commercial: 17200,
    baseMedian: 15800,
  },
  jayanagar: {
    apartment: 9500,
    villa: 12000,
    plot: 7000,
    commercial: 10500,
    baseMedian: 9500,
  },
  "bannerghatta road": {
    apartment: 6500,
    villa: 8200,
    plot: 4800,
    commercial: 7000,
    baseMedian: 6500,
  },
  bannerghatta: {
    apartment: 6500,
    villa: 8200,
    plot: 4800,
    commercial: 7000,
    baseMedian: 6500,
  },
  "jp nagar": {
    apartment: 8500,
    villa: 11000,
    plot: 6500,
    commercial: 9200,
    baseMedian: 8500,
  },
  "btm layout": {
    apartment: 8000,
    villa: 10200,
    plot: 5900,
    commercial: 8700,
    baseMedian: 8000,
  },
  // Electronic City: 4 records → median ₹7,000
  "electronic city": {
    apartment: 7000,
    villa: 9000,
    plot: 5200,
    commercial: 7600,
    baseMedian: 7000,
  },
  bommanahalli: {
    apartment: 5500,
    villa: 7000,
    plot: 4000,
    commercial: 6000,
    baseMedian: 5500,
  },
  "kanakapura road": {
    apartment: 5500,
    villa: 7000,
    plot: 4000,
    commercial: 6000,
    baseMedian: 5500,
  },
  kanakapura: {
    apartment: 5000,
    villa: 6500,
    plot: 3700,
    commercial: 5500,
    baseMedian: 5000,
  },
  banashankari: {
    apartment: 7000,
    villa: 9000,
    plot: 5200,
    commercial: 7600,
    baseMedian: 7000,
  },
  nagarbhavi: {
    apartment: 5800,
    villa: 7400,
    plot: 4300,
    commercial: 6300,
    baseMedian: 5800,
  },
  chandapura: {
    apartment: 3500,
    villa: 4500,
    plot: 2600,
    commercial: 3800,
    baseMedian: 3500,
  },
  attibele: {
    apartment: 3200,
    villa: 4100,
    plot: 2400,
    commercial: 3500,
    baseMedian: 3200,
  },
  "attibele rd": {
    apartment: 6500,
    villa: 8200,
    plot: 4800,
    commercial: 7000,
    baseMedian: 6500,
  },
  nelamangala: {
    apartment: 3500,
    villa: 4500,
    plot: 2600,
    commercial: 3800,
    baseMedian: 3500,
  },
  jigani: {
    apartment: 6600,
    villa: 8400,
    plot: 4900,
    commercial: 7100,
    baseMedian: 6600,
  },

  // ── Central Bangalore ─────────────────────────────────────────────────────
  domlur: {
    apartment: 9000,
    villa: 11500,
    plot: 6500,
    commercial: 9800,
    baseMedian: 9000,
  },
  "mg road": {
    apartment: 11000,
    villa: 14000,
    plot: 8000,
    commercial: 12800,
    baseMedian: 11000,
  },
  sadashivanagar: {
    apartment: 13000,
    villa: 16500,
    plot: 9600,
    commercial: 14200,
    baseMedian: 13000,
  },
  "richmond town": {
    apartment: 12000,
    villa: 15200,
    plot: 8800,
    commercial: 13100,
    baseMedian: 12000,
  },
  ulsoor: {
    apartment: 9500,
    villa: 12000,
    plot: 7000,
    commercial: 10500,
    baseMedian: 9500,
  },
  "frazer town": {
    apartment: 9000,
    villa: 11500,
    plot: 6500,
    commercial: 9800,
    baseMedian: 9000,
  },
  "cv raman nagar": {
    apartment: 7000,
    villa: 9000,
    plot: 5200,
    commercial: 7600,
    baseMedian: 7000,
  },
  "old airport road": {
    apartment: 10000,
    villa: 12800,
    plot: 7400,
    commercial: 11000,
    baseMedian: 10000,
  },
  "vasanth nagar": {
    apartment: 10000,
    villa: 12800,
    plot: 7400,
    commercial: 11000,
    baseMedian: 10000,
  },
  shivajinagar: {
    apartment: 9000,
    villa: 11500,
    plot: 6500,
    commercial: 9800,
    baseMedian: 9000,
  },
  hal: {
    apartment: 8500,
    villa: 11000,
    plot: 6500,
    commercial: 9200,
    baseMedian: 8500,
  },
  "kalyan nagar": {
    apartment: 10000,
    villa: 12800,
    plot: 7400,
    commercial: 11000,
    baseMedian: 10000,
  },
  banaswadi: {
    apartment: 6500,
    villa: 8200,
    plot: 4800,
    commercial: 7000,
    baseMedian: 6500,
  },
  kammanahalli: {
    apartment: 6500,
    villa: 8200,
    plot: 4800,
    commercial: 7000,
    baseMedian: 6500,
  },
  vijayanagar: {
    apartment: 6500,
    villa: 8200,
    plot: 4800,
    commercial: 7000,
    baseMedian: 6500,
  },

  // ── Hessarghatta (batch 5-8 addition) ─────────────────────────────────────
  // 7 records → median ₹20,937 (large plots/villas, premium micro-market)
  hessarghatta: {
    apartment: 20900,
    villa: 26000,
    plot: 15500,
    commercial: 22000,
    baseMedian: 20900,
  },
  seetharampalya: {
    apartment: 9500,
    villa: 12000,
    plot: 7000,
    commercial: 10500,
    baseMedian: 9500,
  },

  // ── Batch 16 — Southern Frontier additions ────────────────────────────────
  // Kanakapura Road Extension: extends core Kanakapura Rd corridor further south
  // Apartments ~₹8350psf median (3BHK 8500 + 2BHK 8200), villas ~₹8000psf, plots ~₹3800psf
  "kanakapura road extension": {
    apartment: 8350,
    villa: 9600,
    plot: 3800,
    commercial: 18000,
    baseMedian: 8350,
  },
  // Harohalli: industrial satellite town, workforce housing floor
  // Apartments: 3850–4000psf; plots: 2000psf (industrial floor); commercial warehouse ~3500psf
  harohalli: {
    apartment: 3925,
    villa: 4000,
    plot: 2000,
    commercial: 6500,
    baseMedian: 3925,
  },
  // Bannerghatta Extension: forest-buffer premium zone, eco-luxury anchor
  // Villas 10500psf; apartments 8000psf; plots 5500psf; commercial 15000psf
  "bannerghatta extension": {
    apartment: 8000,
    villa: 10500,
    plot: 5500,
    commercial: 15000,
    baseMedian: 8000,
  },
  // Jigani-Anekal Road: mid-market industrial-residential corridor
  "jigani-anekal road": {
    apartment: 4200,
    villa: 6000,
    plot: 3500,
    commercial: 7000,
    baseMedian: 4200,
  },
  // Somanahalli: managed farmland zone, speculative land banking
  somanahalli: {
    apartment: 2500,
    villa: 3000,
    plot: 800,
    commercial: 3000,
    baseMedian: 800,
  },
  // Kanakapura Main Road: tourism-yield commercial corridor
  "kanakapura main road": {
    apartment: 8500,
    villa: 9500,
    plot: 4000,
    commercial: 18000,
    baseMedian: 8500,
  },
  // Jigani Main Road: granite/showroom commercial strip
  "jigani main road": {
    apartment: 4500,
    villa: 6000,
    plot: 3800,
    commercial: 16000,
    baseMedian: 4500,
  },
  // Bannerghatta Main: forest-proximity commercial node
  "bannerghatta main": {
    apartment: 8000,
    villa: 10000,
    plot: 5500,
    commercial: 15000,
    baseMedian: 8000,
  },
};

// ─── East Bangalore localities (no training data → null) ─────────────────────
const EAST_BANGALORE_STUB_LOCALITIES = new Set([
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

/**
 * Returns true if locality is in East Bangalore zone (no training data).
 * Callers should show 'Data unavailable' when this returns true.
 */
export function isEastBangaloreStub(locality: string): boolean {
  const key = locality.toLowerCase().trim();
  return EAST_BANGALORE_STUB_LOCALITIES.has(key);
}

// ─── Locality PSF map (derived from typed map above) ────────────────────────
// Backward-compatible flat map: keyed by locality, value = baseMedian PSF.
// Used by getBaseMicroLocationPSF() and all legacy callers.
// DO NOT edit this map directly — edit LOCALITY_BASE_PSF_TYPED above.

const LOCALITY_BASE_PSF: Record<string, number> = Object.fromEntries(
  Object.entries(LOCALITY_BASE_PSF_TYPED).map(([k, v]) => [k, v.baseMedian]),
);

// Merge: LOCALITY_BASE_PSF already built from LOCALITY_BASE_PSF_TYPED above.

/** Returns base sale PSF for a locality (INR per sq ft). */
export function getBaseMicroLocationPSF(locality: string): number {
  const key = locality.trim().toLowerCase();
  // Exact match first
  if (LOCALITY_BASE_PSF[key] !== undefined) return LOCALITY_BASE_PSF[key];
  // Partial match
  for (const [k, v] of Object.entries(LOCALITY_BASE_PSF)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return 7000; // city-level fallback for Bangalore
}

/**
 * Returns base sale PSF or null for localities with no training data.
 * East Bangalore stubs return null (caller should show 'Data unavailable').
 * West localities return their hardcoded estimate if available, otherwise null.
 */
export function getPSFOrNull(locality: string): number | null {
  const key = locality.trim().toLowerCase();

  // East stubs: no training data → Data unavailable
  if (isEastBangaloreStub(key)) return null;

  // Exact match
  if (LOCALITY_BASE_PSF[key] !== undefined) return LOCALITY_BASE_PSF[key];

  // Partial match
  for (const [k, v] of Object.entries(LOCALITY_BASE_PSF)) {
    if (key.includes(k) || k.includes(key)) return v;
  }

  return null; // truly unknown locality
}

// ─── Per-type PSF lookup helpers ─────────────────────────────────────────────

/** Normalize locality key for lookup */
function normLocalityKey(locality: string): string {
  return locality.trim().toLowerCase();
}

/**
 * Lookup the typed PSF entry for a locality.
 * Tries exact match then fuzzy partial match.
 * Returns null if not found in the typed map.
 */
function findTypedEntry(locality: string): LocalityPSF | null {
  const key = normLocalityKey(locality);
  if (LOCALITY_BASE_PSF_TYPED[key]) return LOCALITY_BASE_PSF_TYPED[key];
  for (const [k, v] of Object.entries(LOCALITY_BASE_PSF_TYPED)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

/**
 * Zone-level fallback PSF by property type.
 * Used when a locality has no entry in LOCALITY_BASE_PSF_TYPED.
 */
function getZoneFallbackPSFByType(
  locality: string,
  propertyType: "apartment" | "villa" | "plot" | "commercial",
): number {
  const basePSF = getBaseMicroLocationPSF(locality); // falls back to 7000
  const ZONE_FALLBACK_RATIOS: Record<typeof propertyType, number> = {
    apartment: 1.0,
    villa: 1.28,
    plot: 0.74,
    commercial: 1.09,
  };
  return Math.round(basePSF * ZONE_FALLBACK_RATIOS[propertyType]);
}

/**
 * getBasePSF — Single source of truth for per-type locality PSF.
 *
 * Architecture:
 *   localityEngine.ts → getBasePSF(locality, type)
 *       ├── Area Intelligence (Base Market PSF display)
 *       ├── AI Valuation (starting base before adjustments)
 *       └── Comparison module (consistent baseline)
 *
 * @param locality      Locality name (case-insensitive, fuzzy matched)
 * @param propertyType  Property type — determines which PSF column to use
 * @returns             PSF in INR/sqft. Never returns 0.
 */
export function getBasePSF(
  locality: string,
  propertyType: "apartment" | "villa" | "plot" | "commercial",
): number {
  const entry = findTypedEntry(locality);
  if (entry) return entry[propertyType];
  // Fallback: zone-level derivation from baseMedian
  return getZoneFallbackPSFByType(locality, propertyType);
}

/**
 * getBaseMedianPSF — Returns the weighted median PSF across all property types
 * for a locality. Used by Area Intelligence for the "Base Market PSF" display.
 *
 * This is the canonical single value to show as area-level pricing context.
 * It is NOT the same as getBaseMicroLocationPSF() — the typed map has more
 * accurate per-type values; the median is a weighted blend.
 *
 * @param locality  Locality name (case-insensitive, fuzzy matched)
 * @returns         baseMedian PSF in INR/sqft
 */
export function getBaseMedianPSF(locality: string): number {
  const entry = findTypedEntry(locality);
  if (entry) return entry.baseMedian;
  return getBaseMicroLocationPSF(locality);
}

// ─── Zone classification ─────────────────────────────────────────────────────

export type LocalityZone =
  | "north-inner"
  | "north-mid"
  | "north-outer"
  | "airport-corridor"
  | "northwest"
  | "east-core"
  | "east-mid"
  | "east-outer"
  | "east-peripheral"
  | "south"
  | "central"
  | "unknown";

const LOCALITY_ZONE_MAP: Record<string, LocalityZone> = {
  hebbal: "north-inner",
  kempapura: "north-inner",
  "sahakar nagar": "north-inner",
  "sahakara nagar": "north-inner",
  "rt nagar": "north-inner",
  "ganga nagar": "north-inner",
  amruthahalli: "north-inner",
  "rmv stage 2": "north-inner",
  "rmv extension": "north-inner",
  "rmv ext.": "north-inner",
  malleshwaram: "north-inner",
  malleswaram: "north-inner",
  thanisandra: "north-mid",
  nagavara: "north-mid",
  nagawara: "north-mid",
  hennur: "north-mid",
  "hennur road": "north-mid",
  "hennur rd": "north-mid",
  "k narayanapura": "north-mid",
  narayanapura: "north-mid",
  "manyata tech park": "north-mid",
  "banjara layout": "north-mid",
  vidyaranyapura: "north-mid",
  doddabommasandra: "north-mid",
  tindlu: "north-mid",
  "muthyala nagar": "north-mid",
  "hbr layout": "north-mid",
  chambenahalli: "north-mid",
  kogilu: "north-mid",
  kothanur: "north-mid",
  kannur: "north-mid",
  kalkere: "north-mid",
  battarahalli: "north-mid",
  yelahanka: "north-outer",
  "yelahanka new town": "north-outer",
  jakkur: "north-outer",
  kattigenahalli: "north-outer",
  "nehru nagar": "north-outer",
  anantapura: "north-outer",
  bagalur: "airport-corridor",
  devanahalli: "airport-corridor",
  chikkajala: "airport-corridor",
  shettigere: "airport-corridor",
  sadahalli: "airport-corridor",
  "airport rd": "airport-corridor",
  "airport road": "airport-corridor",
  "ivc road": "airport-corridor",
  jalahalli: "northwest",
  abbigere: "northwest",
  chikkabanavara: "northwest",
  kammagondahalli: "northwest",
  addiganahalli: "northwest",
  rajanakunte: "northwest",
  rajankunte: "northwest",
  rajajinagar: "northwest",
  yeshwanthpur: "northwest",
  whitefield: "east-core",
  kadugodi: "east-core",
  "pattandur agrahara": "east-core",
  "hope farm": "east-core",
  itpl: "east-core",
  mahadevapura: "east-core",
  brookefield: "east-core",
  kundalahalli: "east-core",
  hoodi: "east-core",
  seetharampalya: "east-core",
  nallurhalli: "east-core",
  omr: "east-core",
  marathahalli: "east-mid",
  "aecs layout": "east-mid",
  kadubeesanahalli: "east-mid",
  "sarjapur road": "east-mid",
  "sarjapur rd": "east-mid",
  bellandur: "east-mid",
  "old airport rd": "east-mid",
  "old madras rd": "east-mid",
  varthur: "east-outer",
  gunjur: "east-outer",
  panathur: "east-outer",
  balagere: "east-outer",
  avalahalli: "east-outer",
  "dooravani nagar": "east-outer",
  kodihalli: "east-outer",
  gedalahalli: "east-outer",
  geddalahalli: "east-outer",
  "kr puram": "east-peripheral",
  horamavu: "east-peripheral",
  kaggadasapura: "east-peripheral",
  "budigere cross": "east-peripheral",
  budigere: "east-peripheral",
  mandur: "east-peripheral",
  hoskote: "east-peripheral",
  "hoskote rd": "east-peripheral",
  dommasandra: "east-peripheral",
  carmelaram: "east-peripheral",
  koramangala: "central",
  indiranagar: "central",
  domlur: "central",
  "mg road": "central",
  sadashivanagar: "central",
  "richmond town": "central",
  ulsoor: "central",
  "frazer town": "central",
  "cv raman nagar": "central",
  "old airport road": "central",
  "vasanth nagar": "central",
  shivajinagar: "central",
  hal: "central",
  "kalyan nagar": "central",
  banaswadi: "central",
  kammanahalli: "central",
  "hsr layout": "south",
  hsr: "south",
  jayanagar: "south",
  "bannerghatta road": "south",
  bannerghatta: "south",
  "jp nagar": "south",
  "btm layout": "south",
  "electronic city": "south",
  bommanahalli: "south",
  "kanakapura road": "south",
  kanakapura: "south",
  banashankari: "south",
  nagarbhavi: "south",
  chandapura: "south",
  attibele: "south",
  "attibele rd": "south",
  nelamangala: "south",
  jigani: "south",
  // ── Batch 16 — Southern Frontier zone mappings ─────────────────────────────
  "kanakapura road extension": "south",
  harohalli: "south",
  "bannerghatta extension": "south",
  "jigani-anekal road": "south",
  somanahalli: "south",
  "kanakapura main road": "south",
  "jigani main road": "south",
  "bannerghatta main": "south",
};

/** Returns the zone a locality belongs to (for cluster fallback logic). */
export function getLocalityZone(locality: string): LocalityZone {
  const key = locality.trim().toLowerCase();
  return LOCALITY_ZONE_MAP[key] ?? "unknown";
}

/** Returns median PSF for a zone (used for cluster-level fallback). */
export function getZoneMedianPSF(zone: LocalityZone): number {
  const psfValues = Object.entries(LOCALITY_ZONE_MAP)
    .filter(([, z]) => z === zone)
    .map(([loc]) => LOCALITY_BASE_PSF[loc])
    .filter((v): v is number => v !== undefined);
  if (psfValues.length === 0) return 7000;
  const sorted = [...psfValues].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// ─── Locality Coordinates (single source of truth for lat/lng) ───────────────
// Used by AI Valuation, Area Intelligence, and Distance Engine
// to convert a locality name to real Bangalore coordinates.
const LOCALITY_COORDS_MAP: Record<string, { lat: number; lng: number }> = {
  hebbal: { lat: 13.0358, lng: 77.597 },
  whitefield: { lat: 12.9698, lng: 77.7499 },
  "electronic city": { lat: 12.8452, lng: 77.6602 },
  koramangala: { lat: 12.9352, lng: 77.6245 },
  indiranagar: { lat: 12.9784, lng: 77.6408 },
  jayanagar: { lat: 12.9299, lng: 77.5826 },
  "jp nagar": { lat: 12.9082, lng: 77.5877 },
  "btm layout": { lat: 12.9166, lng: 77.6101 },
  marathahalli: { lat: 12.9591, lng: 77.6971 },
  "hsr layout": { lat: 12.9081, lng: 77.6476 },
  "bannerghatta road": { lat: 12.8974, lng: 77.5972 },
  "sarjapur road": { lat: 12.901, lng: 77.6956 },
  "kr puram": { lat: 13.0089, lng: 77.696 },
  yelahanka: { lat: 13.1005, lng: 77.5963 },
  devanahalli: { lat: 13.2473, lng: 77.7145 },
  rajajinagar: { lat: 12.9904, lng: 77.5556 },
  malleshwaram: { lat: 13.0035, lng: 77.5701 },
  malleswaram: { lat: 13.0035, lng: 77.5701 },
  sadashivanagar: { lat: 13.0149, lng: 77.5812 },
  banaswadi: { lat: 13.021, lng: 77.6491 },
  "frazer town": { lat: 12.993, lng: 77.6224 },
  "rt nagar": { lat: 13.028, lng: 77.5955 },
  nagawara: { lat: 13.053, lng: 77.6237 },
  nagavara: { lat: 13.053, lng: 77.6237 },
  thanisandra: { lat: 13.0686, lng: 77.6218 },
  hennur: { lat: 13.0507, lng: 77.6393 },
  "hennur road": { lat: 13.0507, lng: 77.6393 },
  "kalyan nagar": { lat: 13.0311, lng: 77.6484 },
  horamavu: { lat: 13.0327, lng: 77.6601 },
  "ramamurthy nagar": { lat: 13.0141, lng: 77.6665 },
  bellandur: { lat: 12.9259, lng: 77.6767 },
  kadugodi: { lat: 12.9875, lng: 77.7612 },
  varthur: { lat: 12.9373, lng: 77.7486 },
  domlur: { lat: 12.9611, lng: 77.6391 },
  hal: { lat: 12.9693, lng: 77.6709 },
  yeshwanthpur: { lat: 13.0214, lng: 77.5506 },
  peenya: { lat: 13.0292, lng: 77.5199 },
  "tumkur road": { lat: 13.0487, lng: 77.5159 },
  kengeri: { lat: 12.9113, lng: 77.4834 },
  vijayanagar: { lat: 12.9699, lng: 77.5251 },
  banashankari: { lat: 12.9257, lng: 77.5476 },
  "jp nagar 2nd phase": { lat: 12.9082, lng: 77.5877 },
  "hbr layout": { lat: 13.0311, lng: 77.6484 },
  jakkur: { lat: 13.0789, lng: 77.6006 },
  bagalur: { lat: 13.2157, lng: 77.7927 },
  "sahakar nagar": { lat: 13.0595, lng: 77.588 },
  amruthahalli: { lat: 13.06, lng: 77.6 },
  jalahalli: { lat: 13.0516, lng: 77.5348 },
  "mg road": { lat: 12.9753, lng: 77.6069 },
  "old airport road": { lat: 12.9611, lng: 77.6391 },
  "cv raman nagar": { lat: 12.9841, lng: 77.6558 },
  "sarjapur rd": { lat: 12.901, lng: 77.6956 },
  sarjapur: { lat: 12.8826, lng: 77.6969 },
  gunjur: { lat: 12.9238, lng: 77.7183 },
  panathur: { lat: 12.9439, lng: 77.7053 },
  "budigere cross": { lat: 13.0385, lng: 77.7523 },
  "manyata tech park": { lat: 13.0534, lng: 77.6209 },
  rajankunte: { lat: 13.1547, lng: 77.5977 },
  kogilu: { lat: 13.085, lng: 77.623 },
  kothanur: { lat: 13.0887, lng: 77.5902 },
  kannur: { lat: 13.113, lng: 77.625 },
  kanakapura: { lat: 12.5494, lng: 77.4152 },
  "kanakapura road": { lat: 12.8941, lng: 77.5744 },
  nagarbhavi: { lat: 12.9489, lng: 77.5095 },
  "rr nagar": { lat: 12.9256, lng: 77.5124 },
  "mysore road": { lat: 12.9448, lng: 77.5094 },
  // ── Batch 16 — Southern Frontier coordinates ──────────────────────────────
  "kanakapura road extension": { lat: 12.79, lng: 77.54 },
  harohalli: { lat: 12.65, lng: 77.53 },
  "bannerghatta extension": { lat: 12.81, lng: 77.6 },
  "jigani-anekal road": { lat: 12.77, lng: 77.65 },
  somanahalli: { lat: 12.72, lng: 77.49 },
  "kanakapura main road": { lat: 12.87, lng: 77.55 },
  "jigani main road": { lat: 12.786, lng: 77.638 },
  "bannerghatta main": { lat: 12.86, lng: 77.598 },
};

/**
 * getLocalityCoords — returns {lat, lng} for a given locality name.
 * Case-insensitive, fuzzy partial match.
 * Returns null if no match found.
 */
export function getLocalityCoords(
  locality: string,
): { lat: number; lng: number } | null {
  const key = locality.trim().toLowerCase();
  if (LOCALITY_COORDS_MAP[key]) return LOCALITY_COORDS_MAP[key];
  // Partial match
  for (const [k, v] of Object.entries(LOCALITY_COORDS_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

// ─── PSF Assertion & Consistency Check ──────────────────────────────────────

/**
 * assertPSFConsistency — validates that a computed PSF value matches the
 * canonical localityEngine value within a 3% tolerance.
 *
 * Call this in areaIntelligenceEngine, valuationEngine, rentEngine when they
 * produce a locality PSF value. Logs a warning if drift > 3%.
 *
 * @param locality      Locality name (for lookup)
 * @param computedPSF   PSF computed by the calling module
 * @param callerName    Name of the calling module (for log context)
 * @returns             canonical basePSF from localityEngine
 */
export function assertPSFConsistency(
  locality: string,
  computedPSF: number,
  callerName: string,
): number {
  const canonicalPSF = getBaseMicroLocationPSF(locality);
  if (canonicalPSF > 0 && computedPSF > 0) {
    const drift = Math.abs(computedPSF - canonicalPSF) / canonicalPSF;
    if (drift > 0.03) {
      console.warn(
        `[ValuBrix PSF Drift] ${callerName} computed ₹${Math.round(computedPSF)}/sqft ` +
          `for "${locality}" but localityEngine canonical is ₹${Math.round(canonicalPSF)}/sqft ` +
          `(drift: ${(drift * 100).toFixed(1)}%). Falling back to canonical.`,
      );
    }
  }
  return canonicalPSF;
}

/**
 * validateAIvsAreaBase — runtime consistency check.
 * If AI valuation base PSF != Area Intelligence base PSF (beyond 3% drift),
 * returns the localityEngine canonical value to use as the common base.
 *
 * Use at the output stage of BuyerValuationPage to detect and fix mismatches.
 */
export function validateAIvsAreaBase(
  locality: string,
  aiBasePSF: number,
  areaBasePSF: number,
): { consistent: boolean; resolvedPSF: number } {
  const canonicalPSF = getBaseMicroLocationPSF(locality);
  const aiDrift =
    canonicalPSF > 0 ? Math.abs(aiBasePSF - canonicalPSF) / canonicalPSF : 0;
  const areaDrift =
    canonicalPSF > 0 ? Math.abs(areaBasePSF - canonicalPSF) / canonicalPSF : 0;
  const consistent =
    Math.abs(aiBasePSF - areaBasePSF) / Math.max(aiBasePSF, areaBasePSF, 1) <=
    0.03;

  if (!consistent) {
    console.warn(
      `[ValuBrix Consistency] AI base ₹${Math.round(aiBasePSF)} vs Area base ₹${Math.round(areaBasePSF)} ` +
        `for "${locality}" — mismatch >3%. Falling back to localityEngine canonical ₹${Math.round(canonicalPSF)}.`,
      {
        aiDrift: `${(aiDrift * 100).toFixed(1)}%`,
        areaDrift: `${(areaDrift * 100).toFixed(1)}%`,
      },
    );
  }

  return { consistent, resolvedPSF: canonicalPSF };
}

/**
 * computeDynamicGrowthRate — derives annualised growth rate for a locality
 * from the canonical PSF tier, zone, and demand/infra deltas.
 *
 * Used by PriceForecastPage instead of static y1/y3/y5 constants.
 *
 * @param locality    Locality name
 * @param demandScore 0–100 demand score from demandEngine
 * @param infraScore  0–100 infra score from infraEngine
 * @returns           { y1, y3, y5 } growth rates as percentages
 */
export function computeDynamicGrowthRate(
  locality: string,
  demandScore: number,
  infraScore: number,
): { y1: number; y3: number; y5: number } {
  const zone = getLocalityZone(locality);
  const psf = getBaseMicroLocationPSF(locality);
  const zonePSF = getZoneMedianPSF(zone);

  // Base annual rate from zone
  const ZONE_BASE_RATE: Record<LocalityZone, number> = {
    "north-inner": 7,
    "north-mid": 8,
    "north-outer": 9,
    "airport-corridor": 11,
    northwest: 8,
    "east-core": 8,
    "east-mid": 7,
    "east-outer": 6,
    "east-peripheral": 6,
    central: 5,
    south: 6,
    unknown: 6,
  };

  const baseRate = ZONE_BASE_RATE[zone] ?? 6;

  // PSF position modifier: cheaper localities have higher upside
  const psfRatio = zonePSF > 0 ? psf / zonePSF : 1;
  const psfModifier = psfRatio < 0.8 ? 1.5 : psfRatio > 1.3 ? 0.7 : 1.0;

  // Demand modifier: high demand → higher near-term growth
  const demandMod = 1 + (demandScore - 50) / 200; // ±0.25

  // Infra modifier: high infra score → long-term premium
  const infraMod = 1 + (infraScore - 50) / 400; // ±0.125

  const y1Rate = Math.round(baseRate * psfModifier * demandMod * 0.9);
  const y3Rate = Math.round(
    baseRate * psfModifier * demandMod * infraMod * 2.8,
  );
  const y5Rate = Math.round(baseRate * psfModifier * infraMod * 4.5);

  return {
    y1: Math.max(2, Math.min(20, y1Rate)),
    y3: Math.max(5, Math.min(55, y3Rate)),
    y5: Math.max(8, Math.min(90, y5Rate)),
  };
}
