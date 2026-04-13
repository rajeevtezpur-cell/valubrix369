// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  AI MASTER SCORE ENGINE — ValuBrix                                      ║
// ║  Final Master Data Schema + Core AI Calculation Engine                  ║
// ║  ADDITIVE: Does NOT replace any existing engine.                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝

import { BANGALORE_PROJECTS } from "../data/bangaloreProjects";
import { getRawAmenityScore, getRawTechScore } from "./infraEngine";
import { haversineDistance } from "./metroEngine";

// ─── Extended Project Type (superset of BangaloreProject) ─────────────────────

export interface AIMasterProject {
  project_id: string;
  project_name: string;
  builder_name: string;
  property_type: string;
  configuration: string;
  locality: string;
  micro_location: string;
  zone: string;
  market_stage: string;
  rera_number: string;
  status: string;
  launch_year: number;
  completion_year: number;
  possession_date: string;
  price_min: number;
  price_max: number;
  price_per_sqft: number;
  locality_avg_price: number;
  latitude: number;
  longitude: number;
  // Proximity flags
  metro_distance_km: number;
  near_manyata: boolean;
  near_airport_before_toll: boolean;
  near_strr: boolean;
  // Regulatory
  oc_status: boolean;
  approval_authority: "BDA" | "BMRDA" | "BIAPPA" | "DTCP" | "BBMP";
  // Area weights
  growth_weight: number;
  rental_yield: number;
  // Sub-scores (0–100)
  livability_score: number;
  infra_score: number;
  job_access_score: number;
  price_momentum: number;
  inventory_pressure: number;
  liquidity_score: number;
  future_potential: number;
  // Computed scores
  location_score: number;
  price_score: number;
  growth_score: number;
  rental_score: number;
  risk_score: number;
  approval_score: number;
  micro_score: number;
  future_upside_index: number;
  risk_index: number;
  ai_master_score: number;
  // Output
  smart_tags: string[];
  investment_summary: string;
  recommendation_flag: "STRONG BUY" | "BUY" | "HOLD" | "AVOID";
  // Micro area intelligence
  micro_area_tag: string;
  micro_market_tag: string;
  micro_bonus_logic: string;
}

// ─── Key Coordinates ──────────────────────────────────────────────────────────

const MANYATA_TECH_PARK = { lat: 13.046, lng: 77.621 };
const BIAL_AIRPORT = { lat: 13.198, lng: 77.706 }; // before toll ~13.15 lat line

// ─── Locality Average Price Map (₹ per sqft) ──────────────────────────────────

const LOCALITY_AVG_PRICE: Record<string, number> = {
  Bagalur: 8000,
  Devanahalli: 9500,
  Yelahanka: 7500,
  Chikkajala: 10500,
  Bettahalasur: 9500,
  "Navarathna Agrahara": 8500,
  Hebbal: 12500,
  Thanisandra: 11000,
  Jakkur: 12500,
  Rachenahalli: 10500,
  Jalahalli: 12000,
  Vidyaranyapura: 10800,
  "BEL Road": 13000,
  Yeshwanthpur: 16000,
  Malleshwaram: 17000,
  Rajajinagar: 16000,
  Sadashivanagar: 19000,
  "RT Nagar": 11000,
  Koramangala: 14000,
  Indiranagar: 15000,
  Whitefield: 9500,
  "Electronic City": 7500,
  Sarjapur: 8500,
  Marathahalli: 10500,
  Bellandur: 11000,
  Varthur: 9000,
  "KR Puram": 9500,
  "Hennur Road": 9500,
  "Bannerghatta Road": 8500,
  "JP Nagar": 12000,
  Banashankari: 11000,
  Kanakapura: 7500,
  Mysore_Road: 8500,
  Tumkur_Road: 8000,
  Rajankunte: 7000,
  "Hoskote Road": 8000,
  Dasarahalli: 9000,
  Peenya: 9500,
  Doddaballapur: 7000,
  Bagalkuppe: 6500,
  Chikkaballapur: 5500,
};

function getLocalityAvgPrice(locality: string, microLocation: string): number {
  return (
    LOCALITY_AVG_PRICE[microLocation] || LOCALITY_AVG_PRICE[locality] || 9000 // Bangalore-wide fallback
  );
}

// ─── Approval Authority Mapping ───────────────────────────────────────────────

function getApprovalAuthority(
  zone: string,
  lat: number,
): "BDA" | "BMRDA" | "BIAPPA" | "DTCP" | "BBMP" {
  // Airport zone → BIAPPA
  if (lat > 13.15) return "BIAPPA";
  // North peripheral → BMRDA
  if (zone.includes("North") && lat > 13.0) return "BMRDA";
  // South peripheral
  if (zone.includes("South") && lat < 12.85) return "BMRDA";
  // East
  if (zone.includes("East")) return "BMRDA";
  // Inner city
  return "BDA";
}

// ─── Rental Yield Map ─────────────────────────────────────────────────────────

const RENTAL_YIELD_MAP: Record<string, number> = {
  Rachenahalli: 5.2,
  Hebbal: 4.8,
  Jakkur: 4.5,
  Thanisandra: 4.3,
  Jalahalli: 4.0,
  Koramangala: 4.2,
  Indiranagar: 4.0,
  Whitefield: 4.5,
  "Electronic City": 4.3,
  Marathahalli: 4.1,
  Devanahalli: 3.8,
  Yelahanka: 3.5,
  Bagalur: 3.2,
  Chikkajala: 3.4,
  "BEL Road": 3.2,
  Yeshwanthpur: 3.0,
};

function getRentalYield(locality: string): number {
  return RENTAL_YIELD_MAP[locality] ?? 3.5;
}

// ─── Micro Area Intelligence Database ─────────────────────────────────────────

const MICRO_AREA_INTEL: Record<
  string,
  {
    market_tag: string;
    price_band: string;
    ai_tag: string;
    bonus_logic: string;
  }
> = {
  Vidyaranyapura: {
    market_tag: "Low Risk End-User Zone",
    price_band: "10000-11700",
    ai_tag: "Stable Demand",
    bonus_logic: "Low volatility",
  },
  "BEL Road": {
    market_tag: "Premium Mature",
    price_band: "11000+",
    ai_tag: "Luxury Stable",
    bonus_logic: "High livability",
  },
  Jalahalli: {
    market_tag: "Metro Premium Zone",
    price_band: "11000-14000",
    ai_tag: "Metro Boost",
    bonus_logic: "+15% near metro",
  },
  Yeshwanthpur: {
    market_tag: "Luxury High-Rise Zone",
    price_band: "15000+",
    ai_tag: "Luxury Growth",
    bonus_logic: "High-rise premium",
  },
  "Hebbal ORR": {
    market_tag: "Economic Engine",
    price_band: "13000+",
    ai_tag: "Rental Strong",
    bonus_logic: "High floor premium",
  },
  Chikkajala: {
    market_tag: "Mega Township Zone",
    price_band: "9000-12000",
    ai_tag: "Growth Node",
    bonus_logic: "+10% before toll",
  },
  Bettahalasur: {
    market_tag: "Mega Township Zone",
    price_band: "8500-11000",
    ai_tag: "Future Growth",
    bonus_logic: "Airport spillover",
  },
  "Navarathna Agrahara": {
    market_tag: "Airport District",
    price_band: "8000-10000",
    ai_tag: "Early Growth",
    bonus_logic: "Infra trigger",
  },
  Bagalur: {
    market_tag: "High Growth SEZ Zone",
    price_band: "7000-9500",
    ai_tag: "Explosive Growth",
    bonus_logic: "Aerospace boost",
  },
  Chikkaballapur: {
    market_tag: "Second Home Zone",
    price_band: "4000-7000",
    ai_tag: "Farmland Play",
    bonus_logic: "Low liquidity",
  },
  Rachenahalli: {
    market_tag: "Rental Yield Champion",
    price_band: "9000-12000",
    ai_tag: "High Yield",
    bonus_logic: "5% rental",
  },
  Jakkur: {
    market_tag: "Lake Premium Zone",
    price_band: "11000-14000",
    ai_tag: "Luxury Mid",
    bonus_logic: "+25% lake facing",
  },
  Thanisandra: {
    market_tag: "High Demand Corridor",
    price_band: "9000-13000",
    ai_tag: "Hot Market",
    bonus_logic: "High absorption",
  },
};

function getMicroAreaIntel(microLocation: string, locality: string) {
  return (
    MICRO_AREA_INTEL[microLocation] ||
    MICRO_AREA_INTEL[locality] || {
      market_tag: "Growth Corridor",
      price_band: "8000-12000",
      ai_tag: "Emerging",
      bonus_logic: "Infrastructure developing",
    }
  );
}

// ─── Growth Weight Map ────────────────────────────────────────────────────────

const GROWTH_WEIGHT_MAP: Record<string, number> = {
  Bagalur: 9,
  Devanahalli: 8,
  Thanisandra: 7,
  Hebbal: 6,
  Yelahanka: 6.5,
  "STRR Corridor": 9.5,
  Chikkajala: 8.5,
  Bettahalasur: 7.5,
  Jakkur: 6.5,
  Rachenahalli: 6.5,
  Whitefield: 5.5,
  "Electronic City": 5.0,
  Koramangala: 4.5,
  Indiranagar: 4.0,
  Yeshwanthpur: 5.0,
};

function getGrowthWeight(locality: string, zone: string): number {
  if (GROWTH_WEIGHT_MAP[locality]) return GROWTH_WEIGHT_MAP[locality];
  if (zone.includes("North")) return 7.0;
  if (zone.includes("East")) return 5.5;
  if (zone.includes("South")) return 4.5;
  if (zone.includes("West")) return 5.0;
  return 5.0;
}

// ─── 1. LOCATION SCORE ────────────────────────────────────────────────────────

function computeLocationScore(
  _lat: number,
  _lng: number,
  metroDist: number,
  nearManyata: boolean,
  nearAirport: boolean,
  nearSTRR: boolean,
): number {
  let score = 0;
  if (metroDist < 0.8) score += 15;
  else if (metroDist < 3) score += 10;
  else if (metroDist < 6) score += 5;
  if (nearManyata) score += 10;
  if (nearAirport) score += 10;
  if (nearSTRR) score += 12;
  return Math.min(score, 50);
}

// ─── 2. PRICE SCORE ───────────────────────────────────────────────────────────

function computePriceScore(pricePerSqft: number, localityAvg: number): number {
  const diff = pricePerSqft - localityAvg;
  const pct = diff / localityAvg;
  if (pct < -0.05) return 15; // Undervalued
  if (pct <= 0.05) return 5; // At par
  return -10; // Overpriced
}

// ─── 3. GROWTH SCORE ─────────────────────────────────────────────────────────

function computeGrowthScore(locality: string, zone: string): number {
  return getGrowthWeight(locality, zone);
}

// ─── 4. RENTAL SCORE ─────────────────────────────────────────────────────────

function computeRentalScore(
  locality: string,
  nearManyata: boolean,
  rentalYield: number,
): number {
  if (nearManyata) return 15;
  if (locality === "Jakkur") return 10;
  if (locality === "Hebbal") return 8;
  if (locality === "Rachenahalli") return 12;
  if (locality === "Thanisandra") return 10;
  // Fallback to yield-based
  if (rentalYield > 5) return 12;
  if (rentalYield > 4.5) return 10;
  if (rentalYield > 4) return 8;
  if (rentalYield > 3.5) return 6;
  return 4;
}

// ─── 5. RISK SCORE ────────────────────────────────────────────────────────────

function computeRiskScore(status: string, completionYear: number): number {
  const currentYear = 2026;
  if (status === "Ready") return 10; // OC available
  if (completionYear - currentYear <= 1) return 5; // Near completion
  if (status === "Under Construction") return 2;
  if (status === "Pre-Launch") return -5;
  return 0;
}

// ─── 6. APPROVAL SCORE ───────────────────────────────────────────────────────

function computeApprovalScore(
  authority: "BDA" | "BMRDA" | "BIAPPA" | "DTCP" | "BBMP",
): number {
  switch (authority) {
    case "BDA":
      return 20;
    case "BBMP":
      return 18;
    case "BMRDA":
      return 15;
    case "BIAPPA":
      return 10;
    case "DTCP":
      return 5;
  }
}

// ─── MICRO SCORE ─────────────────────────────────────────────────────────────

function computeMicroScore(
  livability: number,
  infra: number,
  jobAccess: number,
  priceMomentum: number,
  liquidity: number,
  futurePotential: number,
): number {
  return (
    0.2 * livability +
    0.25 * infra +
    0.2 * jobAccess +
    0.15 * priceMomentum +
    0.1 * liquidity +
    0.1 * futurePotential
  );
}

// ─── FUTURE UPSIDE INDEX ─────────────────────────────────────────────────────

function computeFutureUpsideIndex(
  nearSTRR: boolean,
  nearAirport: boolean,
  metroDist: number,
  growthWeight: number,
): number {
  let score = growthWeight * 5; // 0–50
  if (nearSTRR) score += 20;
  if (nearAirport) score += 15;
  if (metroDist < 1) score += 15;
  else if (metroDist < 3) score += 8;
  return Math.min(score, 100);
}

// ─── AI MASTER SCORE (Final Formula) ─────────────────────────────────────────

function computeAIMasterScore({
  locationScore,
  priceScore,
  growthScore,
  rentalScore,
  riskScore,
  approvalScore,
  microScore,
  futureUpsideIndex,
}: {
  locationScore: number;
  priceScore: number;
  growthScore: number;
  rentalScore: number;
  riskScore: number;
  approvalScore: number;
  microScore: number;
  futureUpsideIndex: number;
}): number {
  const raw =
    locationScore * 0.2 +
    priceScore * 0.15 +
    growthScore * 0.2 +
    rentalScore * 0.1 +
    riskScore * 0.1 +
    approvalScore * 0.1 +
    microScore * 0.1 +
    futureUpsideIndex * 0.05;

  // Normalize to 0–100
  const maxPossible =
    50 * 0.2 +
    15 * 0.15 +
    9.5 * 0.2 +
    15 * 0.1 +
    10 * 0.1 +
    20 * 0.1 +
    100 * 0.1 +
    100 * 0.05;
  return Math.min(100, Math.round((raw / maxPossible) * 100));
}

// ─── SMART TAG ENGINE ─────────────────────────────────────────────────────────

function generateSmartTags(
  pricePerSqft: number,
  localityAvg: number,
  metroDist: number,
  rentalYield: number,
  growthScore: number,
  ocStatus: boolean,
  locality: string,
  microLocation: string,
  propertyType: string,
  nearManyata: boolean,
): string[] {
  const tags: string[] = [];
  if (pricePerSqft < localityAvg * 0.95) tags.push("Best Value");
  if (pricePerSqft > 15000) tags.push("Luxury");
  if (metroDist < 1) tags.push("Metro Advantage");
  if (rentalYield > 4.5) tags.push("Rental Champion");
  if (growthScore > 8) tags.push("Growth Leader");
  if (ocStatus) tags.push("Low Risk (OC)");
  if (
    microLocation.toLowerCase().includes("lake") ||
    locality.toLowerCase().includes("jakkur")
  )
    tags.push("Lake View Premium");
  if (
    propertyType.toLowerCase().includes("township") ||
    microLocation.toLowerCase().includes("township")
  )
    tags.push("Township Premium");
  if (nearManyata) tags.push("IT Hub Proximity");
  // Micro area tag
  const micro = getMicroAreaIntel(microLocation, locality);
  if (micro.ai_tag && !tags.includes(micro.ai_tag)) tags.push(micro.ai_tag);
  return tags;
}

// ─── INVESTOR INSIGHT GENERATOR (internal — project-level) ──────────────────

function generateProjectInvestorInsight(
  _projectName: string,
  locality: string,
  nearAirport: boolean,
  nearSTRR: boolean,
  nearManyata: boolean,
  priceScore: number,
  ocStatus: boolean,
  growthScore: number,
  microLocation: string,
): string {
  const lines: string[] = [];
  const micro = getMicroAreaIntel(microLocation, locality);

  if (growthScore >= 7) lines.push("Located in high growth corridor");
  if (nearSTRR || nearAirport)
    lines.push(
      `Near major infra (${
        nearSTRR && nearAirport
          ? "STRR + Airport"
          : nearSTRR
            ? "STRR"
            : "Airport"
      })`,
    );
  if (nearManyata) lines.push("Strong rental demand (Manyata Tech Park)");
  if (priceScore >= 15) lines.push("Undervalued compared to locality average");
  if (ocStatus) lines.push("Low risk — OC available, GST exempt");
  if (micro.bonus_logic) lines.push(micro.bonus_logic);

  if (lines.length === 0)
    lines.push("Solid fundamentals with stable appreciation potential");

  const parts = lines.map((l) => `✔ ${l}`).join("\n");
  return `Why this is a good investment:\n${parts}`;
}

// ─── RECOMMENDATION FLAG ─────────────────────────────────────────────────────

function getRecommendationFlag(
  score: number,
): "STRONG BUY" | "BUY" | "HOLD" | "AVOID" {
  if (score >= 78) return "STRONG BUY";
  if (score >= 62) return "BUY";
  if (score >= 45) return "HOLD";
  return "AVOID";
}

// ─── Main Engine: Enrich + Score All Projects ─────────────────────────────────

function enrichProject(p: (typeof BANGALORE_PROJECTS)[0]): AIMasterProject {
  const avgSqft = p.property_type.includes("Villa") ? 2200 : 1100;
  const avgPrice = (p.price_min + p.price_max) / 2;
  const pricePerSqft = Math.round(avgPrice / avgSqft);
  const localityAvg = getLocalityAvgPrice(p.locality, p.micro_location);

  // Proximity flags
  const metroDist = computeNearestMetroDist(p.latitude, p.longitude);
  const nearManyata =
    haversineDistance(
      p.latitude,
      p.longitude,
      MANYATA_TECH_PARK.lat,
      MANYATA_TECH_PARK.lng,
    ) < 3.5;
  const nearAirport =
    haversineDistance(
      p.latitude,
      p.longitude,
      BIAL_AIRPORT.lat,
      BIAL_AIRPORT.lng,
    ) < 10 && p.latitude > 13.1; // before toll
  const nearSTRR = p.latitude > 13.05 && p.latitude < 13.25; // STRR corridor band

  const ocStatus = p.status === "Ready";
  const authority = getApprovalAuthority(p.zone, p.latitude);
  const growthWeight = getGrowthWeight(p.locality, p.zone);
  const rentalYield = getRentalYield(p.locality);

  // Sub-scores from existing engines (normalize 0–100)
  const rawTech = getRawTechScore(p.latitude, p.longitude);
  const rawAmenity = getRawAmenityScore(p.latitude, p.longitude);
  const jobAccessScore = Math.min(100, Math.round(rawTech * 40));
  const livabilityScore = Math.min(100, Math.round(rawAmenity * 35));
  const infraScore = Math.min(
    100,
    Math.round(
      (jobAccessScore * 0.6 + livabilityScore * 0.4) *
        (nearSTRR || nearAirport ? 1.15 : 1),
    ),
  );
  const priceMomentum = Math.min(100, Math.round(growthWeight * 10));
  const liquidityScore = Math.min(
    100,
    Math.round(60 + (nearManyata ? 20 : 0) + (metroDist < 3 ? 15 : 0)),
  );
  const futurePotential = Math.min(
    100,
    Math.round(growthWeight * 8 + (nearSTRR ? 15 : 0) + (nearAirport ? 10 : 0)),
  );

  // Compute all scores
  const locationScore = computeLocationScore(
    p.latitude,
    p.longitude,
    metroDist,
    nearManyata,
    nearAirport,
    nearSTRR,
  );
  const priceScore = computePriceScore(pricePerSqft, localityAvg);
  const growthScore = computeGrowthScore(p.locality, p.zone);
  const rentalScore = computeRentalScore(p.locality, nearManyata, rentalYield);
  const riskScore = computeRiskScore(p.status, p.completion_year);
  const approvalScore = computeApprovalScore(authority);
  const microScore = computeMicroScore(
    livabilityScore,
    infraScore,
    jobAccessScore,
    priceMomentum,
    liquidityScore,
    futurePotential,
  );
  const futureUpsideIndex = computeFutureUpsideIndex(
    nearSTRR,
    nearAirport,
    metroDist,
    growthWeight,
  );
  const riskIndex = Math.max(0, 100 - (riskScore * 10 + approvalScore * 2));

  const aiMasterScore = computeAIMasterScore({
    locationScore,
    priceScore,
    growthScore,
    rentalScore,
    riskScore,
    approvalScore,
    microScore,
    futureUpsideIndex,
  });

  const smartTags = generateSmartTags(
    pricePerSqft,
    localityAvg,
    metroDist,
    rentalYield,
    growthScore,
    ocStatus,
    p.locality,
    p.micro_location,
    p.property_type,
    nearManyata,
  );

  const microIntel = getMicroAreaIntel(p.micro_location, p.locality);
  const investmentSummary = generateProjectInvestorInsight(
    p.name,
    p.locality,
    nearAirport,
    nearSTRR,
    nearManyata,
    priceScore,
    ocStatus,
    growthScore,
    p.micro_location,
  );

  const market_stage = deriveMarketStage(
    p.status,
    p.launch_year,
    p.completion_year,
  );

  return {
    project_id: p.id,
    project_name: p.name,
    builder_name: p.builder,
    property_type: p.property_type,
    configuration: p.configuration,
    locality: p.locality,
    micro_location: p.micro_location,
    zone: p.zone,
    market_stage,
    rera_number: `KA/RERA/${p.id}`,
    status: p.status,
    launch_year: p.launch_year,
    completion_year: p.completion_year,
    possession_date: `Q4 ${p.completion_year}`,
    price_min: p.price_min,
    price_max: p.price_max,
    price_per_sqft: pricePerSqft,
    locality_avg_price: localityAvg,
    latitude: p.latitude,
    longitude: p.longitude,
    metro_distance_km: metroDist,
    near_manyata: nearManyata,
    near_airport_before_toll: nearAirport,
    near_strr: nearSTRR,
    oc_status: ocStatus,
    approval_authority: authority,
    growth_weight: growthWeight,
    rental_yield: rentalYield,
    livability_score: livabilityScore,
    infra_score: infraScore,
    job_access_score: jobAccessScore,
    price_momentum: priceMomentum,
    inventory_pressure: Math.round(50 + growthWeight * 3),
    liquidity_score: liquidityScore,
    future_potential: futurePotential,
    location_score: locationScore,
    price_score: priceScore,
    growth_score: growthScore,
    rental_score: rentalScore,
    risk_score: riskScore,
    approval_score: approvalScore,
    micro_score: Math.round(microScore),
    future_upside_index: futureUpsideIndex,
    risk_index: riskIndex,
    ai_master_score: aiMasterScore,
    smart_tags: smartTags,
    investment_summary: investmentSummary,
    recommendation_flag: getRecommendationFlag(aiMasterScore),
    micro_area_tag: microIntel.ai_tag,
    micro_market_tag: microIntel.market_tag,
    micro_bonus_logic: microIntel.bonus_logic,
  };
}

function deriveMarketStage(
  status: string,
  launchYear: number,
  completionYear: number,
): string {
  if (status === "Ready") return "Completed";
  if (status === "Pre-Launch") return "Pre-Launch";
  const progress =
    ((2026 - launchYear) / Math.max(1, completionYear - launchYear)) * 100;
  if (progress < 30) return "Early Construction";
  if (progress < 70) return "Mid Construction";
  return "Near Completion";
}

// ─── Nearest Metro Distance ───────────────────────────────────────────────────

const METRO_STATIONS_COORDS = [
  { lat: 13.0358, lng: 77.597 }, // MG Road
  { lat: 13.046, lng: 77.597 }, // Cubbon Park
  { lat: 13.003, lng: 77.565 }, // Jayanagar
  { lat: 13.065, lng: 77.555 }, // Yeshwanthpur
  { lat: 13.046, lng: 77.552 }, // Rajajinagar
  { lat: 13.056, lng: 77.548 }, // Vijayanagar
  { lat: 13.018, lng: 77.638 }, // Indiranagar
  { lat: 13.058, lng: 77.644 }, // Baiyyappanahalli
  { lat: 12.97, lng: 77.607 }, // BTM Layout area
  { lat: 13.076, lng: 77.563 }, // Mahalakshmi Layout
  { lat: 13.086, lng: 77.555 }, // Peenya
  { lat: 13.094, lng: 77.549 }, // Peenya Industry
  { lat: 13.04, lng: 77.608 }, // Halasuru
  { lat: 13.04, lng: 77.625 }, // Trinity
  { lat: 13.04, lng: 77.64 }, // Domlur
  { lat: 12.998, lng: 77.568 }, // South End Circle
  { lat: 13.022, lng: 77.567 }, // Lalbagh
  { lat: 12.99, lng: 77.576 }, // Chickpete
  { lat: 13.001, lng: 77.584 }, // City Market
  { lat: 13.073, lng: 77.57 }, // Jalahalli (Green Line)
  { lat: 13.085, lng: 77.578 }, // Yelahanka (approx)
  { lat: 13.095, lng: 77.565 }, // Hesaraghatta Cross
  { lat: 13.04, lng: 77.57 }, // Majestic
];

function computeNearestMetroDist(lat: number, lng: number): number {
  let minDist = Number.POSITIVE_INFINITY;
  for (const m of METRO_STATIONS_COORDS) {
    const d = haversineDistance(lat, lng, m.lat, m.lng);
    if (d < minDist) minDist = d;
  }
  return Math.round(minDist * 10) / 10;
}

// ─── Compute All Projects (memoized) ─────────────────────────────────────────

let _cached: AIMasterProject[] | null = null;

export function getAIMasterProjects(): AIMasterProject[] {
  if (_cached) return _cached;
  _cached = BANGALORE_PROJECTS.map(enrichProject);
  return _cached;
}

// ─── HOTSPOT ENGINE ───────────────────────────────────────────────────────────

export interface AIHotspot {
  rank: number;
  micro_location: string;
  growth_rank: number;
  rental_rank: number;
  infra_rank: number;
  demand_rank: number;
  overall_rank: number;
  avg_ai_score: number;
  project_count: number;
  market_tag: string;
  ai_tag: string;
  reason: string;
}

export function getAIHotspots(): AIHotspot[] {
  const hardcoded: Omit<AIHotspot, "avg_ai_score" | "project_count">[] = [
    {
      rank: 1,
      micro_location: "Bagalur",
      growth_rank: 1,
      rental_rank: 6,
      infra_rank: 2,
      demand_rank: 4,
      overall_rank: 1,
      market_tag: "High Growth SEZ Zone",
      ai_tag: "Explosive Growth",
      reason: "Aerospace SEZ + airport proximity drives future demand",
    },
    {
      rank: 2,
      micro_location: "Devanahalli",
      growth_rank: 2,
      rental_rank: 7,
      infra_rank: 3,
      demand_rank: 5,
      overall_rank: 2,
      market_tag: "Airport District",
      ai_tag: "Long-term Hold",
      reason: "BIAL airport + IT SEZ creates sustained value",
    },
    {
      rank: 3,
      micro_location: "Thanisandra",
      growth_rank: 4,
      rental_rank: 2,
      infra_rank: 5,
      demand_rank: 2,
      overall_rank: 3,
      market_tag: "High Demand Corridor",
      ai_tag: "Hot Market",
      reason: "High absorption rate + metro connectivity",
    },
    {
      rank: 4,
      micro_location: "Hebbal",
      growth_rank: 5,
      rental_rank: 1,
      infra_rank: 4,
      demand_rank: 1,
      overall_rank: 4,
      market_tag: "Economic Engine",
      ai_tag: "Rental Strong",
      reason: "Manyata + ORR junction = premium rental demand",
    },
    {
      rank: 5,
      micro_location: "Jakkur",
      growth_rank: 6,
      rental_rank: 3,
      infra_rank: 6,
      demand_rank: 3,
      overall_rank: 5,
      market_tag: "Lake Premium Zone",
      ai_tag: "Luxury Mid",
      reason: "Lake view premium + strong IT spillover",
    },
    {
      rank: 6,
      micro_location: "Yelahanka",
      growth_rank: 3,
      rental_rank: 5,
      infra_rank: 7,
      demand_rank: 6,
      overall_rank: 6,
      market_tag: "Growth Node",
      ai_tag: "Growth Node",
      reason: "STRR + airport corridor creates mid-term upside",
    },
    {
      rank: 7,
      micro_location: "Chikkajala",
      growth_rank: 7,
      rental_rank: 8,
      infra_rank: 1,
      demand_rank: 7,
      overall_rank: 7,
      market_tag: "Mega Township Zone",
      ai_tag: "Growth Node",
      reason: "Township density + infra momentum",
    },
    {
      rank: 8,
      micro_location: "Rachenahalli",
      growth_rank: 8,
      rental_rank: 4,
      infra_rank: 8,
      demand_rank: 8,
      overall_rank: 8,
      market_tag: "Rental Yield Champion",
      ai_tag: "High Yield",
      reason: "Highest rental yield in North Bangalore",
    },
    {
      rank: 9,
      micro_location: "Bettahalasur",
      growth_rank: 9,
      rental_rank: 9,
      infra_rank: 9,
      demand_rank: 9,
      overall_rank: 9,
      market_tag: "Airport Spillover",
      ai_tag: "Future Growth",
      reason: "Airport expansion benefit + affordable entry",
    },
    {
      rank: 10,
      micro_location: "Jalahalli",
      growth_rank: 10,
      rental_rank: 10,
      infra_rank: 10,
      demand_rank: 10,
      overall_rank: 10,
      market_tag: "Metro Premium Zone",
      ai_tag: "Metro Boost",
      reason: "Metro line boost + BEL Road premium",
    },
  ];

  const projects = getAIMasterProjects();
  return hardcoded.map((h) => {
    const matching = projects.filter(
      (p) =>
        p.micro_location
          .toLowerCase()
          .includes(h.micro_location.toLowerCase()) ||
        p.locality.toLowerCase().includes(h.micro_location.toLowerCase()),
    );
    const avg_ai_score =
      matching.length > 0
        ? Math.round(
            matching.reduce((s, p) => s + p.ai_master_score, 0) /
              matching.length,
          )
        : 60;
    return { ...h, avg_ai_score, project_count: matching.length };
  });
}

// ─── Top Strong Buy Projects ─────────────────────────────────────────────────

export function getStrongBuyProjects(limit = 10): AIMasterProject[] {
  return getAIMasterProjects()
    .filter((p) => p.recommendation_flag === "STRONG BUY")
    .sort((a, b) => b.ai_master_score - a.ai_master_score)
    .slice(0, limit);
}

export function getTopRankedByFlag(
  flag: AIMasterProject["recommendation_flag"],
  limit = 5,
): AIMasterProject[] {
  return getAIMasterProjects()
    .filter((p) => p.recommendation_flag === flag)
    .sort((a, b) => b.ai_master_score - a.ai_master_score)
    .slice(0, limit);
}

// ─── Public Investor Insight Generator (Area Intelligence 2.0) ───────────────
// Accepts area-level signals and returns a bold single-line insight string.
// This is the NEW exported overload used by AreaIntelligencePage components.

export interface InvestorInsightData {
  yieldPct: number;
  techParkDist: number;
  demandScore: number;
  growthScore: number;
  priceTrend1Y: number;
  avgPSF: number;
  classification: string;
}

export function generateInvestorInsight(data: InvestorInsightData): string {
  const {
    yieldPct,
    techParkDist,
    demandScore,
    growthScore,
    priceTrend1Y,
    avgPSF,
    classification,
  } = data;

  if (classification === "Emerging") {
    return "Emerging locality — early-mover advantage";
  }
  if (avgPSF > 12000) {
    return "Premium location — high entry price, stable returns";
  }
  if (priceTrend1Y > 15) {
    return "Strong capital appreciation potential";
  }
  if (growthScore > 70) {
    return "Upcoming infra may boost prices 15–20%";
  }
  if (yieldPct > 4 || techParkDist < 3) {
    return "Best suited for rental investors";
  }
  if (demandScore < 40) {
    return "Low liquidity zone — long-term hold recommended";
  }
  return "Solid fundamentals with steady appreciation potential";
}

// ─── Investment Strategy Generator ───────────────────────────────────────────

export function getInvestmentStrategy(p: AIMasterProject): string {
  if (p.recommendation_flag === "STRONG BUY") {
    const years = p.near_strr || p.near_airport_before_toll ? "5–8" : "4–6";
    return `Buy now → Hold ${years} years`;
  }
  if (p.recommendation_flag === "BUY")
    return "Buy on correction → Hold 3–5 years";
  if (p.recommendation_flag === "HOLD")
    return "Monitor quarterly → Enter at dip";
  return "Avoid for now → Wait for infra trigger";
}
