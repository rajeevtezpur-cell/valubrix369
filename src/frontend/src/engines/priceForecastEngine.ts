/**
 * priceForecastEngine.ts — Price Forecast Engine
 *
 * Derives 1/3/5 year PSF price forecasts for any Bangalore locality.
 * All forecasts are data-driven — computed from:
 *   - localityEngine PSF data (canonical base price)
 *   - Zone classification (growth rate priors)
 *   - Demand and infra signals (ValuBrix Score components)
 *   - computeDynamicGrowthRate (demand × infra × PSF position)
 *
 * No hardcoded per-locality growth assumptions.
 *
 * Used by: Area Intelligence → Price Intelligence section
 *          AI Valuation → Price Growth Intelligence section
 *          Investment Intelligence → Capital Appreciation
 */

import {
  type LocalityZone,
  computeDynamicGrowthRate,
  getBaseMicroLocationPSF,
  getLocalityZone,
  getZoneMedianPSF,
} from "../utils/localityEngine";
import {
  type ExponentialForecastResult,
  computeExponentialForecasts,
} from "./predictionEngine";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PriceForecastResult {
  currentPSF: number;
  forecast: {
    oneYear: number; // PSF in 1 year
    threeYear: number; // PSF in 3 years
    fiveYear: number; // PSF in 5 years
  };
  growthRates: {
    oneYear: number; // % 1-year growth
    threeYear: number; // % 3-year cumulative growth
    fiveYear: number; // % 5-year cumulative growth
  };
  growthDrivers: string[];
  confidenceLevel: "High" | "Medium" | "Low";
  priceRange: {
    oneYear: [number, number]; // [lower, upper] PSF
    threeYear: [number, number];
    fiveYear: [number, number];
  };
  marketOutlook: string;
  /** Exponential 6/12/24-month forecasts (additive v3 enhancement) */
  exponentialForecasts?: ExponentialForecastResult;
}

// ─── Locality-specific growth drivers (takes priority over zone-level) ─────────

const LOCALITY_GROWTH_DRIVERS: Record<string, string[]> = {
  rajankunte: [
    "Proximity to Devanahalli tech corridor and upcoming aerospace park",
    "Industrial expansion — electronics manufacturing zones along NH 44",
    "Infrastructure improvements: road widening and NH 44 connectivity upgrades",
    "Proximity to Kempegowda International Airport (~25 km via NH 44)",
    "Rapid urbanization along Doddaballapur Road",
  ],
  devanahalli: [
    "Kempegowda International Airport zone — direct 5 km proximity",
    "IT Investment Region (ITIR) — 12,000+ acres of tech/industrial development",
    "Aerospace Park and KIADB Industrial Area expansion",
    "Foxconn and other large manufacturing investments in the corridor",
    "BMIC Corridor and expressway connectivity",
  ],
  yelahanka: [
    "Bangalore International Airport proximity — 22 km",
    "Manyata Tech Park — 18 km via Hebbal flyover",
    "Metro Phase 2 extension to Nagawara/Yelahanka under development",
    "Air Force Station and associated residential demand",
    "NICE road and Bellary road connectivity improvements",
  ],
  whitefield: [
    "ITPL and Whitefield tech corridor — largest IT employment zone in East Bangalore",
    "Metro Phase 2 Whitefield extension now operational",
    "Multiple SEZs and IT parks (RGA Tech Park, Phoenix, Brigade Tech Garden)",
    "STRR improving east Bangalore city connectivity",
    "Sustained IT workforce demand driving residential prices",
  ],
  "electronic city": [
    "Infosys, Wipro, HCL headquarters — largest IT employment cluster",
    "Elevated Expressway reducing commute time to city centre",
    "Phase 1 and Phase 2 established IT parks with expansion",
    "Hosur Road corridor development",
    "Suburban train connectivity proposals",
  ],
  hebbal: [
    "Manyata Tech Park — North Bangalore's largest employment hub",
    "Outer Ring Road flyover and elevated expressway connectivity",
    "Airport proximity (30 km) making it a gateway zone",
    "Premium commercial real estate development along ORR",
    "Upcoming metro extension improving north–south connectivity",
  ],
  thanisandra: [
    "Manyata Tech Park spillover demand — 4 km from India's largest SEZ",
    "Nagawara metro station improving connectivity",
    "Rapid apartment supply growth meeting IT corridor demand",
    "Proximity to Kempegowda Bus Terminal (north)",
    "Affordable entry relative to Hebbal with same employment access",
  ],
  sarjapur: [
    "Tech corridor between Marathahalli, ORR, and Whitefield",
    "Major IT companies: Wipro, Infosys, Accenture nearby",
    "Bangalore–Hosur Road development and NICE Road access",
    "Startup ecosystem growth in east Bangalore belt",
    "Proposed metro extension to Sarjapur will boost prices significantly",
  ],
  "sarjapur road": [
    "Tech corridor between Marathahalli, ORR, and Whitefield",
    "Major IT companies: Wipro, Infosys, Accenture nearby",
    "Bangalore–Hosur Road development and NICE Road access",
    "Startup ecosystem growth in east Bangalore belt",
    "Proposed metro extension to Sarjapur will boost prices significantly",
  ],
  bagalur: [
    "Aerospace Park Devanahalli — industrial employment hub within 10 km",
    "NH 44 industrial corridor development",
    "KIADB industrial area expansion along Bagalur Road",
    "Proximity to international airport making it a logistics hub",
    "Large land parcels driving plot investment demand",
  ],
  marathahalli: [
    "ORR tech corridor — Manyata to Electronic City employment spine",
    "Metro connectivity — Whitefield line operational",
    "High-density rental demand from IT professionals",
    "Proximity to ITPL and Whitefield IT corridor",
    "Major road infrastructure improvements on ORR",
  ],
  koramangala: [
    "Startup hub — highest density of funded startups in India",
    "Premium social infrastructure (restaurants, malls, co-working)",
    "High-income tenant demand from tech and startup workforce",
    "Scarcity of new supply maintaining strong capital values",
    "Metro connectivity through Central Silk Board corridor",
  ],
  indiranagar: [
    "Premium lifestyle destination — highest PSF in East Bangalore",
    "Metro Purple Line operational — Baiyappanahalli to MG Road",
    "High-income tenant demand from tech and banking workforce",
    "Scarcity of new supply maintaining premium pricing",
    "Active commercial corridor driving residential spillover demand",
  ],
  nagawara: [
    "Manyata Tech Park — 2 km away, driving immediate rental demand",
    "Nagawara metro station improving north Bangalore connectivity",
    "Affordable entry point for Manyata zone with high rental yields",
    "Infrastructure upgrades along Nagawara Lake Road",
    "Growing preference for north Bangalore by IT professionals",
  ],
  "hsr layout": [
    "Startup and tech ecosystem — top co-working and startup presence",
    "Proximity to Electronic City and Bellandur IT belt",
    "Metro Yellow Line under construction (Central Silk Board)",
    "High-income tenant demand — strong rental yields",
    "Excellent social infrastructure and connectivity",
  ],
  bellandur: [
    "ORR tech corridor — embedded in Bangalore's IT spine",
    "Major IT parks including RMZ Ecoworld and Embassy Tech Village",
    "High rental demand from Bellandur lake area redevelopment",
    "Metro Yellow Line improving connectivity",
    "Premium gated communities commanding above-zone pricing",
  ],
};

// ─── Zone-level growth driver templates ──────────────────────────────────────

const ZONE_GROWTH_DRIVERS: Record<LocalityZone, string[]> = {
  "north-inner": [
    "Manyata Tech Park expansion and premium residential demand",
    "Nagavara metro station operational — transit premium",
    "Office space spillover from CBD driving residential uptake",
  ],
  "north-mid": [
    "Thanisandra metro corridor under construction",
    "Proximity to Hebbal IT cluster — rental demand rising",
    "Infrastructure upgrades on Hennur and Thanisandra roads",
  ],
  "north-outer": [
    "Township development attracting end-user buyers",
    "Airport Road widening and new access roads",
    "Strong end-user demand from tech professionals",
  ],
  "airport-corridor": [
    "Kempegowda International Airport T2 terminal operational",
    "Aerospace Park SEZ attracting global companies",
    "KIADB industrial zone expansion driving housing demand",
    "Devanahalli smart city township development",
  ],
  northwest: [
    "Metro connectivity improving accessibility",
    "Redevelopment projects improving neighbourhood quality",
    "Legacy residential demand from established communities",
  ],
  "east-core": [
    "Whitefield–KR Puram metro line transforming connectivity",
    "IT corridor consolidation — Infosys, TCS, Wipro campus expansions",
    "Supply shortage in premium and mid-premium segments",
    "High NRI investment interest in Whitefield projects",
  ],
  "east-mid": [
    "Outer Ring Road (ORR) emerging as Bangalore's growth spine",
    "Bellandur lake restoration boosting premium segment demand",
    "Sarjapur road IT expansion — new office parks announced",
    "High rental demand from tech workers",
  ],
  "east-outer": [
    "Panathur–Varthur corridor premium project launches",
    "Proximity to Whitefield IT belt driving price appreciation",
    "Gated community demand from NRI and HNI buyers",
  ],
  "east-peripheral": [
    "Budigere Cross emerging as affordable alternative to Whitefield",
    "Hoskote industrial growth creating residential demand",
    "Long-term appreciation potential from infrastructure pipeline",
  ],
  central: [
    "Scarcity of new supply in core Bangalore — premium pricing",
    "Metro network connecting all central nodes",
    "Commercial and hospitality demand driving residential values",
  ],
  south: [
    "Electronic City Phase 3 development creating new demand",
    "ORR and Silk Board junction infrastructure improvement",
    "HSR Layout startup ecosystem — high-income tenant demand",
    "Koramangala premium market sustained by tech employment",
  ],
  unknown: [
    "Regional infrastructure development creating new growth pockets",
    "Long-term residential demand from Bangalore expansion",
  ],
};

// ─── Confidence level classifier ─────────────────────────────────────────────

function classifyConfidence(
  locality: string,
  psf: number,
  zone: LocalityZone,
): "High" | "Medium" | "Low" {
  // High confidence: well-known localities with good PSF data in popular zones
  const highConfidenceZones: LocalityZone[] = [
    "east-core",
    "central",
    "east-mid",
    "north-inner",
    "south",
  ];
  const mediumConfidenceZones: LocalityZone[] = [
    "north-mid",
    "east-outer",
    "northwest",
    "airport-corridor",
  ];

  const localityKey = locality.toLowerCase().trim();
  const hasGoodPSFData = psf !== 7000; // 7000 is the fallback — low confidence

  if (highConfidenceZones.includes(zone) && hasGoodPSFData) return "High";
  if (mediumConfidenceZones.includes(zone) && hasGoodPSFData) return "Medium";
  if (zone === "unknown" || !hasGoodPSFData) return "Low";

  // Extra high confidence for well-known localities
  const premiumLocalities = [
    "whitefield",
    "hebbal",
    "koramangala",
    "indiranagar",
    "hsr layout",
    "marathahalli",
    "bellandur",
    "panathur",
    "sarjapur road",
    "brookefield",
  ];
  if (premiumLocalities.some((l) => localityKey.includes(l))) return "High";

  return "Medium";
}

// ─── Market outlook builder ───────────────────────────────────────────────────

function buildMarketOutlook(
  zone: LocalityZone,
  y1Rate: number,
  y5Rate: number,
  psf: number,
): string {
  const zoneLabel =
    zone === "east-core"
      ? "Whitefield corridor"
      : zone === "airport-corridor"
        ? "Airport corridor"
        : zone === "central"
          ? "Central Bangalore"
          : zone === "south"
            ? "South Bangalore"
            : zone === "north-inner"
              ? "North Bangalore inner belt"
              : zone === "north-mid"
                ? "North Bangalore mid zone"
                : "this zone";

  if (y5Rate >= 60 && y1Rate >= 10) {
    return `${zoneLabel} is in a high-growth cycle. Strong infrastructure investments and rising IT employment are creating a multi-year bull market. Early entry positions carry high upside.`;
  }
  if (y5Rate >= 40) {
    return `${zoneLabel} shows steady appreciation momentum driven by improving infrastructure and sustained demand. A reliable medium-term investment with balanced risk.`;
  }
  if (psf > 14000) {
    return `${zoneLabel} is a mature premium market where appreciation growth may moderate. Rental yield and capital preservation are the primary investment thesis here.`;
  }
  return `${zoneLabel} is a developing market with moderate growth expectations. Long-term holders may benefit from infrastructure-driven appreciation.`;
}

// ─── Price range calculator ───────────────────────────────────────────────────
// Adds uncertainty band: ±8% for 1Y, ±15% for 3Y, ±22% for 5Y

function computePriceRange(
  forecastPSF: number,
  horizonYears: 1 | 3 | 5,
): [number, number] {
  const uncertainty =
    horizonYears === 1 ? 0.08 : horizonYears === 3 ? 0.15 : 0.22;
  const lower = Math.round((forecastPSF * (1 - uncertainty)) / 100) * 100;
  const upper = Math.round((forecastPSF * (1 + uncertainty)) / 100) * 100;
  return [lower, upper];
}

// ─── Main exported function ──────────────────────────────────────────────────

/**
 * computePriceForecast — Derives PSF price forecasts for a locality.
 *
 * Uses computeDynamicGrowthRate from localityEngine as the growth model.
 * All values are data-driven from localityEngine PSF maps and zone classifications.
 *
 * @param locality    Locality name (case-insensitive)
 * @param propertyType  Optional property type filter (reserved for future use)
 */
export function computePriceForecast(
  locality: string,
  _propertyType?: string,
): PriceForecastResult {
  const zone = getLocalityZone(locality);
  const currentPSF = getBaseMicroLocationPSF(locality);
  const zonePSF = getZoneMedianPSF(zone);

  // Compute demand and infra proxies from zone priors
  // These mirror the ValuBrix Score demand and infra components
  const ZONE_DEMAND_PROXY: Record<LocalityZone, number> = {
    "north-inner": 78,
    "north-mid": 72,
    "north-outer": 62,
    "airport-corridor": 68,
    northwest: 55,
    "east-core": 82,
    "east-mid": 76,
    "east-outer": 65,
    "east-peripheral": 52,
    central: 80,
    south: 70,
    unknown: 55,
  };
  const ZONE_INFRA_PROXY: Record<LocalityZone, number> = {
    "north-inner": 78,
    "north-mid": 72,
    "north-outer": 58,
    "airport-corridor": 62,
    northwest: 60,
    "east-core": 85,
    "east-mid": 78,
    "east-outer": 68,
    "east-peripheral": 52,
    central: 92,
    south: 72,
    unknown: 50,
  };

  const demandScore = ZONE_DEMAND_PROXY[zone] ?? 55;
  const infraScore = ZONE_INFRA_PROXY[zone] ?? 50;

  const { y1, y3, y5 } = computeDynamicGrowthRate(
    locality,
    demandScore,
    infraScore,
  );

  // Compute forecast PSF values using compound growth
  const psfY1 = Math.round((currentPSF * (1 + y1 / 100)) / 100) * 100;
  const psfY3 = Math.round((currentPSF * (1 + y3 / 100)) / 100) * 100;
  const psfY5 = Math.round((currentPSF * (1 + y5 / 100)) / 100) * 100;

  // PSF position modifier affects near-term trajectory
  const psfRatio = zonePSF > 0 ? currentPSF / zonePSF : 1;
  const isBelowZone = psfRatio < 0.85;
  const isAboveZone = psfRatio > 1.15;

  // Locality-specific drivers take priority; fall back to zone-level drivers
  const localityKey = locality.toLowerCase().trim();
  const baseDrivers =
    LOCALITY_GROWTH_DRIVERS[localityKey] ??
    ZONE_GROWTH_DRIVERS[zone] ??
    ZONE_GROWTH_DRIVERS.unknown;

  // Add PSF-tier specific driver
  const adjustedDrivers = [...baseDrivers];
  if (isBelowZone) {
    adjustedDrivers.unshift(
      "Undervalued vs zone median — price catch-up potential",
    );
  } else if (isAboveZone) {
    adjustedDrivers.unshift("Premium location commanding above-zone pricing");
  }

  const confidenceLevel = classifyConfidence(locality, currentPSF, zone);
  const marketOutlook = buildMarketOutlook(zone, y1, y5, currentPSF);

  // ── Exponential 6/12/24-month forecasts (additive v3 enhancement) ──────────
  // Computed alongside existing 1/3/5 year forecasts — does not replace them.
  let exponentialForecasts: ExponentialForecastResult | undefined;
  try {
    exponentialForecasts = computeExponentialForecasts(locality, currentPSF);
  } catch {
    // Graceful fallback — exponentialForecasts remains undefined
  }

  return {
    currentPSF,
    forecast: {
      oneYear: psfY1,
      threeYear: psfY3,
      fiveYear: psfY5,
    },
    growthRates: {
      oneYear: y1,
      threeYear: y3,
      fiveYear: y5,
    },
    growthDrivers: adjustedDrivers.slice(0, 4),
    confidenceLevel,
    priceRange: {
      oneYear: computePriceRange(psfY1, 1),
      threeYear: computePriceRange(psfY3, 3),
      fiveYear: computePriceRange(psfY5, 5),
    },
    marketOutlook,
    exponentialForecasts,
  };
}
