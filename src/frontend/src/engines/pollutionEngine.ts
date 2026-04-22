// pollutionEngine.ts — Zone-based AQI estimates for Bangalore micro-locations
// Uses locality name + zone to derive realistic AQI, PM2.5, PM10, NO2 estimates.
// All values are estimates based on publicly available Bangalore air quality data.
// Unknown zone fallback: AQI 60 (Moderate) as per AGENTS.md specification.

export interface PollutionData {
  aqi: number;
  pm25: number; // µg/m³ estimate from AQI
  pm10: number; // µg/m³ estimate from AQI
  no2?: number; // µg/m³ estimate (optional)
  category: "Good" | "Moderate" | "Poor" | "Unhealthy" | "Severe";
  color: string; // CSS color for AQI category
  score: number; // 0–100, higher = cleaner air
}

// ─── AQI category thresholds ─────────────────────────────────────────────────

function getAQICategory(
  aqi: number,
): "Good" | "Moderate" | "Poor" | "Unhealthy" | "Severe" {
  if (aqi < 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 200) return "Poor";
  if (aqi <= 300) return "Unhealthy";
  return "Severe";
}

function getAQIColor(
  category: "Good" | "Moderate" | "Poor" | "Unhealthy" | "Severe",
): string {
  switch (category) {
    case "Good":
      return "#10B981"; // green
    case "Moderate":
      return "#F59E0B"; // yellow/amber
    case "Poor":
      return "#F97316"; // orange
    case "Unhealthy":
      return "#EF4444"; // red
    case "Severe":
      return "#7C3AED"; // purple
  }
}

/** Convert AQI to air quality score (0–100, higher = cleaner) */
function aqiToScore(aqi: number): number {
  if (aqi <= 50) return Math.round(100 - (aqi / 50) * 20);
  if (aqi <= 100) return Math.round(80 - ((aqi - 50) / 50) * 20);
  if (aqi <= 200) return Math.round(60 - ((aqi - 100) / 100) * 30);
  if (aqi <= 300) return Math.round(30 - ((aqi - 200) / 100) * 20);
  return Math.max(0, Math.round(10 - ((aqi - 300) / 200) * 10));
}

// ─── Locality → AQI overrides (data-driven from CPCB / IQAir reports) ─────────
// Values are approximate annual averages for Bangalore micro-zones (2024–2025).

const LOCALITY_AQI_OVERRIDES: Record<string, number> = {
  // Industrial corridors — Poor to Unhealthy
  peenya: 175,
  "peenya industrial area": 180,
  "peenya 2nd stage": 170,
  "peenya 4th stage": 172,
  "peenya phase 2": 170,
  "bidadi industrial area": 165,
  bidadi: 160,
  dobaspet: 155,
  "hoskote industrial area": 150,
  "bommasandra industrial area": 145,
  bommasandra: 140,
  "electronic city": 132,
  "electronic city phase 1": 135,
  "electronic city phase 2": 130,

  // Central / MG Road corridor — Poor
  "mg road": 165,
  "brigade road": 155,
  "commercial street": 160,
  "m g road": 165,
  shivajinagar: 150,
  "k g road": 155,
  "kempegowda bus station": 170,
  majestic: 168,
  "city market": 162,
  chickpet: 158,
  "gandhi bazaar": 145,
  basavanagudi: 130,

  // Inner south — Moderate to Poor
  koramangala: 95,
  btm: 100,
  "btm layout": 100,
  "hsr layout": 92,
  jayanagar: 90,
  "jp nagar": 88,
  "j p nagar": 88,
  banashankari: 85,
  "banashankari 2nd stage": 85,
  "banashankari 3rd stage": 83,
  "kanakapura road": 80,
  "kanakapura main road": 82,
  "kanakapura road extension": 75,

  // East corridor — Moderate to Poor (IT traffic)
  whitefield: 125,
  "whitefield main road": 128,
  marathahalli: 120,
  "marathon halli": 120,
  "kundalahalli gate": 118,
  kundanahalli: 115,
  varthur: 110,
  "varthur road": 112,
  sarjapur: 78,
  "sarjapur road": 85,
  "sarjapur main road": 88,

  // North corridor — Moderate
  hebbal: 95,
  yelahanka: 70,
  "yelahanka new town": 68,
  "thanisandra main road": 85,
  thanisandra: 82,
  "manyata tech park": 88,
  "hennur road": 90,
  hennur: 88,
  "jakkur road": 72,
  jakkur: 70,
  "bellary road": 100,
  "devanahalli road": 72,
  devanahalli: 65,
  bagalur: 62,

  // North-West — Moderate
  "bel circle": 95,
  "bel road": 98,
  "jalahalli cross": 98,
  jalahalli: 96,
  rajajinagar: 108,
  vijayanagar: 102,
  nagarbhavi: 88,
  "mysore road": 105,
  "tumkur road": 112,

  // Outer north / periphery — Good to Moderate
  rajakunte: 62,
  "rajakunte circle": 63,
  "rajakunte main road": 64,
  "doddaballapur road": 68,
  doddaballapur: 70,
  "nandi hills": 45,
  "nandi cross": 50,
  chikkajala: 60,
  "bangalore international airport": 60,
  "kempegowda international airport": 60,

  // Outer south / periphery — Good to Moderate
  attibele: 85,
  "attibele industrial area": 90,
  chandapura: 80,
  honnasandra: 72,
  begur: 75,
  "begur road": 78,
  gottigere: 68,
  "gottigere extension": 66,
  harohalli: 72,
  "bannerghatta road": 85,
  "bannerghatta main road": 88,
  "bannerghatta extension": 65,

  // Outer east — Good to Moderate
  "sarjapur extension": 72,
  kasavanahalli: 78,
  budigere: 68,
  "budigere cross": 70,
  "old madras road": 105,
  "kr puram": 112,
  "k r puram": 112,
  hoodi: 95,
  "hoodi junction": 97,
};

// ─── Zone → baseline AQI ranges (used when locality not in override map) ──────

interface ZoneAQIBand {
  base: number;
  variance: number; // added to base based on locality hash for determinism
}

const ZONE_AQI_BANDS: Record<string, ZoneAQIBand> = {
  "north-bangalore": { base: 80, variance: 20 },
  "south-bangalore": { base: 90, variance: 15 },
  "east-bangalore": { base: 110, variance: 25 },
  "west-bangalore": { base: 105, variance: 20 },
  "central-bangalore": { base: 150, variance: 30 },
  "north-west-bangalore": { base: 100, variance: 20 },
  "outer-north": { base: 65, variance: 15 },
  "outer-south": { base: 70, variance: 15 },
  "outer-east": { base: 75, variance: 15 },
  "outer-west": { base: 80, variance: 20 },
  // default / unknown — AGENTS.md: unknown zone fallback = AQI 60 (Moderate)
  unknown: { base: 60, variance: 0 },
};

/** Deterministic hash of a string → 0–1 float (for variance without randomness) */
function deterministicRatio(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  }
  return (Math.abs(h) % 100) / 100;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * getPollutionData — returns AQI estimate and derived pollutant levels for a locality.
 *
 * Lookup priority:
 *   1. Exact locality name match (normalised lowercase)
 *   2. Zone-based band estimate
 *   3. Unknown zone fallback: AQI 60 (Moderate) — per AGENTS.md spec
 *
 * PM2.5 estimate: AQI × 0.5 (rough CPCB approximation)
 * PM10 estimate:  AQI × 0.8
 * NO2 estimate:   AQI × 0.3 (only for central/industrial zones where AQI > 100)
 */
export function getPollutionData(
  locality: string,
  zone: string,
): PollutionData {
  const localityKey = locality.toLowerCase().trim();
  const zoneKey = zone.toLowerCase().trim().replace(/\s+/g, "-");

  // Step 1: Locality override
  const overrideAQI = LOCALITY_AQI_OVERRIDES[localityKey];
  let aqi: number;

  if (overrideAQI !== undefined) {
    aqi = overrideAQI;
  } else {
    // Step 2: Zone-based band with deterministic variance
    const band = ZONE_AQI_BANDS[zoneKey] ?? ZONE_AQI_BANDS.unknown;
    const ratio = deterministicRatio(localityKey);
    aqi = Math.round(band.base + ratio * band.variance);
  }

  // Clamp to valid AQI range
  aqi = Math.max(10, Math.min(400, aqi));

  const category = getAQICategory(aqi);
  const color = getAQIColor(category);
  const score = aqiToScore(aqi);

  // PM2.5 rough estimate from AQI (CPCB approximation)
  const pm25 = Math.round(aqi * 0.5 * 10) / 10;
  // PM10 rough estimate
  const pm10 = Math.round(aqi * 0.8 * 10) / 10;
  // NO2 only meaningful for high-AQI zones
  const no2 = aqi > 100 ? Math.round(aqi * 0.3 * 10) / 10 : undefined;

  return { aqi, pm25, pm10, no2, category, color, score };
}
