// projectIntelligenceEngine.ts
// Computes AI scores, tags, recommendations, hotspots, and price insights
// for the 150 Bangalore projects dataset.
// Uses the existing modular engine stack (metroEngine, infraEngine, valuationEngine).

import type { BangaloreProject } from "../data/bangaloreProjects";
import { BANGALORE_PROJECTS } from "../data/bangaloreProjects";
import { getRawAmenityScore, getRawTechScore } from "./infraEngine";
import { METROS, getMetroFactor, haversineDistance } from "./metroEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectScore {
  investmentScore: number; // 0–100
  tag: "Luxury" | "Premium" | "Best Value" | "Budget Pick";
  subScores: {
    location: number; // 0–100
    price: number; // 0–100 (higher = better value)
    growth: number; // 0–100
    builder: number; // 0–100
  };
  avgPrice: number;
}

export interface ScoredProject extends BangaloreProject {
  score: ProjectScore;
}

export interface Recommendation {
  project: ScoredProject;
  finalScore: number;
  reason: string;
}

export interface Hotspot {
  rank: number;
  micro_location: string;
  locality: string;
  zone: string;
  projectCount: number;
  newLaunches: number;
  hotspotScore: number;
  avgInvestmentScore: number;
  reason: string;
}

export interface ZonePriceInsight {
  zone: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  count: number;
}

export interface TypePriceInsight {
  type: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  count: number;
}

export interface BudgetBucket {
  label: string;
  range: string;
  count: number;
  percentage: number;
}

export interface PriceInsights {
  byZone: ZonePriceInsight[];
  byType: TypePriceInsight[];
  budgetBuckets: BudgetBucket[];
}

// ─── Builder Score Map ────────────────────────────────────────────────────────

const BUILDER_SCORES: Record<string, number> = {
  prestige: 95,
  sobha: 94,
  brigade: 92,
  embassy: 93,
  "tata housing": 91,
  "godrej properties": 90,
  "l&t realty": 89,
  "total environment": 88,
  "sattva group": 86,
  "century real estate": 85,
  "assetz group": 84,
  "adarsh developers": 83,
  puravankara: 82,
  "birla estates": 84,
  "bhartiya urban": 80,
  "karle infra": 79,
  "rmz corp": 85,
  "nitesh estates": 78,
  "arvind smartspaces": 78,
  "vaishnavi group": 75,
  "provident housing": 74,
  "shriram properties": 73,
  "tvs emerald": 76,
  "mahaveer group": 68,
  "nr group": 68,
  "snn estates": 70,
  unishire: 67,
  "concorde group": 70,
  "goyal & co": 70,
  "kalyani developers": 72,
  "ramky estates": 70,
  "legacy global": 72,
  "ds-max": 62,
  default: 65,
};

function getBuilderScoreNum(builder: string): number {
  const key = builder.toLowerCase();
  for (const [k, v] of Object.entries(BUILDER_SCORES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return BUILDER_SCORES.default;
}

// ─── Zone Growth Weights ──────────────────────────────────────────────────────

const ZONE_GROWTH: Record<string, number> = {
  "East Bangalore": 0.92,
  "North Bangalore": 0.85,
  "South Bangalore": 0.8,
  "West Bangalore": 0.72,
  "Central Bangalore": 0.95,
};

// ─── Score a Single Project ───────────────────────────────────────────────────

function scoreProject(p: BangaloreProject): ProjectScore {
  const avgPrice = (p.price_min + p.price_max) / 2;

  // 1. Location Score: metro proximity + zone weight
  // getNearestMetros is now async — use haversine sync fallback for scoring
  let minMetroDist = 50;
  for (const m of METROS) {
    const d = haversineDistance(p.latitude, p.longitude, m.lat, m.lng);
    if (d < minMetroDist) minMetroDist = d;
  }
  const metroFactor = getMetroFactor(p.latitude, p.longitude);
  const zoneWeight = ZONE_GROWTH[p.zone] ?? 0.8;
  const locationScore = Math.round(
    ((metroFactor - 0.95) / 0.15) * 60 + zoneWeight * 40,
  );

  // 2. Tech / Demand score
  const techScore = getRawTechScore(p.latitude, p.longitude);
  const amenityScore = getRawAmenityScore(p.latitude, p.longitude);

  // 3. Price Score: inverse of price relative to zone avg (lower price = higher score)
  // Use 1Cr as baseline for budget, 3Cr for mid, 10Cr+ for luxury
  const priceInCr = avgPrice / 10000000;
  const rawPriceScore =
    priceInCr <= 0.8
      ? 95
      : priceInCr <= 1.5
        ? 85
        : priceInCr <= 3
          ? 70
          : priceInCr <= 5
            ? 55
            : 35;

  // 4. Growth Score: tech score + zone growth + launch year (recent = higher potential)
  const launchBonus =
    p.launch_year >= 2024 ? 10 : p.launch_year >= 2022 ? 5 : 0;
  const growthScore = Math.round(
    Math.min(techScore * 60 + zoneWeight * 30 + launchBonus, 100),
  );

  // 5. Builder Score
  const builderScore = getBuilderScoreNum(p.builder);

  // 6. Status Bonus
  const statusBonus =
    p.status === "Ready" ? 10 : p.status === "Pre-Launch" ? -5 : 0;

  // 7. Livability component
  const livabilityScore = Math.round(Math.min(amenityScore * 80 + 20, 100));

  // Investment Score = weighted aggregate
  const raw =
    locationScore * 0.28 +
    growthScore * 0.22 +
    builderScore * 0.2 +
    rawPriceScore * 0.15 +
    livabilityScore * 0.1 +
    statusBonus * 0.05;
  const investmentScore = Math.round(Math.min(Math.max(raw, 20), 98));

  // Tag assignment
  let tag: ProjectScore["tag"];
  if (avgPrice > 30000000) {
    tag = "Luxury";
  } else if (avgPrice > 15000000 && investmentScore >= 65) {
    tag = "Premium";
  } else if (avgPrice <= 8000000) {
    tag = "Budget Pick";
  } else {
    tag = "Best Value";
  }

  return {
    investmentScore,
    tag,
    subScores: {
      location: Math.round(Math.min(Math.max(locationScore, 0), 100)),
      price: rawPriceScore,
      growth: growthScore,
      builder: builderScore,
    },
    avgPrice,
  };
}

// ─── Pre-compute All Scores (called once at module init) ─────────────────────

export const SCORED_PROJECTS: ScoredProject[] = BANGALORE_PROJECTS.map((p) => ({
  ...p,
  score: scoreProject(p),
}));

// ─── Filter Projects ──────────────────────────────────────────────────────────

export interface FilterOptions {
  budgetMin?: number;
  budgetMax?: number;
  propertyType?: string;
  bhk?: string;
  zone?: string;
  locality?: string;
  status?: string;
  searchText?: string;
}

export function filterProjects(opts: FilterOptions): ScoredProject[] {
  return SCORED_PROJECTS.filter((p) => {
    if (opts.budgetMin && p.price_min > opts.budgetMin * 100000) return false;
    if (opts.budgetMax && p.price_max < opts.budgetMax * 100000) return false;
    if (
      opts.propertyType &&
      opts.propertyType !== "All" &&
      !p.property_type.toLowerCase().includes(opts.propertyType.toLowerCase())
    )
      return false;
    if (
      opts.bhk &&
      opts.bhk !== "All" &&
      !p.configuration.toLowerCase().includes(opts.bhk.toLowerCase())
    )
      return false;
    if (opts.zone && opts.zone !== "All" && p.zone !== opts.zone) return false;
    if (
      opts.locality &&
      opts.locality !== "All" &&
      !p.locality.toLowerCase().includes(opts.locality.toLowerCase())
    )
      return false;
    if (opts.status && opts.status !== "All" && p.status !== opts.status)
      return false;
    if (opts.searchText) {
      const q = opts.searchText.toLowerCase();
      if (
        !p.name.toLowerCase().includes(q) &&
        !p.builder.toLowerCase().includes(q) &&
        !p.locality.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });
}

// ─── Recommendation Engine ────────────────────────────────────────────────────
// Final Score = 40% Investment Score + 25% Price Advantage + 20% Location Demand + 15% Status

export function getRecommendations(
  budgetLakhs: number,
  zone?: string,
): Recommendation[] {
  const budgetRs = budgetLakhs * 100000;

  // Filter projects within budget
  const eligible = SCORED_PROJECTS.filter((p) => p.price_min <= budgetRs);

  // Zone avg price for price advantage calc
  const zoneAvgs: Record<string, number> = {};
  const zoneGroups: Record<string, number[]> = {};
  for (const p of SCORED_PROJECTS) {
    if (!zoneGroups[p.zone]) zoneGroups[p.zone] = [];
    zoneGroups[p.zone].push(p.score.avgPrice);
  }
  for (const [z, prices] of Object.entries(zoneGroups)) {
    zoneAvgs[z] = prices.reduce((a, b) => a + b, 0) / prices.length;
  }

  const scored = eligible.map((p) => {
    // Apply zone preference boost
    const zoneMatch = zone && zone !== "All" && p.zone === zone ? 1.15 : 1.0;

    // Price advantage: how far below zone avg
    const zoneAvg = zoneAvgs[p.zone] ?? p.score.avgPrice;
    const priceAdvantage = Math.round(
      Math.min(
        Math.max(((zoneAvg - p.score.avgPrice) / zoneAvg) * 100 + 50, 0),
        100,
      ),
    );

    // Location demand from zone weight
    const locationDemand = Math.round((ZONE_GROWTH[p.zone] ?? 0.8) * 100);

    // Status score
    const statusScore =
      p.status === "Ready" ? 100 : p.status === "Under Construction" ? 60 : 30;

    const finalScore =
      (p.score.investmentScore * 0.4 +
        priceAdvantage * 0.25 +
        locationDemand * 0.2 +
        statusScore * 0.15) *
      zoneMatch;

    // Generate reason
    const reasons: string[] = [];
    if (p.score.investmentScore >= 75) reasons.push("High ROI potential");
    if (priceAdvantage > 55) reasons.push("below market price");
    if (p.score.subScores.location >= 70) reasons.push("premium location");
    if (p.status === "Ready") reasons.push("ready to move");
    if (p.zone === "East Bangalore") reasons.push("near IT hub");
    if (
      p.zone === "North Bangalore" &&
      p.locality.toLowerCase().includes("devanahalli")
    )
      reasons.push("airport corridor growth");
    if (p.score.subScores.builder >= 85) reasons.push("trusted builder");

    const reason =
      reasons.length > 0
        ? reasons
            .slice(0, 2)
            .map((r, i) =>
              i === 0 ? r.charAt(0).toUpperCase() + r.slice(1) : r,
            )
            .join(" + ")
        : "Strong investment with good location";

    return { project: p, finalScore, reason };
  });

  return scored.sort((a, b) => b.finalScore - a.finalScore).slice(0, 5);
}

// ─── Hotspot Analysis ─────────────────────────────────────────────────────────

export function getHotspots(): Hotspot[] {
  // Group by locality
  const groups: Record<string, ScoredProject[]> = {};
  for (const p of SCORED_PROJECTS) {
    const key = p.locality;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }

  const zoneWeightFull: Record<string, number> = {
    "East Bangalore": 1.0,
    "Central Bangalore": 0.95,
    "North Bangalore": 0.9,
    "South Bangalore": 0.85,
    "West Bangalore": 0.75,
  };

  const reasons: Record<string, string> = {
    Whitefield: "Fastest growing IT corridor with massive demand",
    Devanahalli: "Airport proximity + upcoming infra projects",
    "Sarjapur Road": "High supply + strong IT workforce demand",
    Hebbal: "Premium north corridor near CBD",
    Bagalur: "KIADB expansion driving new launches",
    Yelahanka: "Airport connectivity + strong appreciation",
    Thanisandra: "Manyata Tech Park proximity + metro corridor",
    Jakkur: "Growing demand near airport road",
    "Kanakapura Road": "Metro corridor + affordable pricing",
    "Electronic City": "IT hub with affordable pricing",
    Bellandur: "ORR connectivity + tech park cluster",
  };

  const hotspots = Object.entries(groups)
    .filter(([, projects]) => projects.length >= 2)
    .map(([locality, projects]) => {
      const zone = projects[0].zone;
      const newLaunches = projects.filter((p) => p.launch_year >= 2023).length;
      const projectCount = projects.length;
      const avgInvestmentScore = Math.round(
        projects.reduce((s, p) => s + p.score.investmentScore, 0) /
          projects.length,
      );
      const zoneW = zoneWeightFull[zone] ?? 0.8;

      // Hotspot Score = density weight + new launches + zone growth + avg investment score
      const hotspotScore = Math.round(
        (projectCount / 15) * 30 +
          (newLaunches / projectCount) * 25 +
          zoneW * 25 +
          (avgInvestmentScore / 100) * 20,
      );

      return {
        rank: 0,
        micro_location: projects[0].micro_location,
        locality,
        zone,
        projectCount,
        newLaunches,
        hotspotScore: Math.min(hotspotScore, 100),
        avgInvestmentScore,
        reason:
          reasons[locality] ??
          `${projectCount} projects with strong demand signals`,
      };
    })
    .sort((a, b) => b.hotspotScore - a.hotspotScore)
    .slice(0, 10)
    .map((h, i) => ({ ...h, rank: i + 1 }));

  return hotspots;
}

// ─── Price Insights ───────────────────────────────────────────────────────────

export function getPriceInsights(): PriceInsights {
  // By Zone
  const zoneMap: Record<string, number[]> = {};
  for (const p of SCORED_PROJECTS) {
    const key = p.zone;
    if (!zoneMap[key]) zoneMap[key] = [];
    zoneMap[key].push(p.score.avgPrice);
  }
  const byZone: ZonePriceInsight[] = Object.entries(zoneMap)
    .map(([zone, prices]) => ({
      zone,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      count: prices.length,
    }))
    .sort((a, b) => b.avgPrice - a.avgPrice);

  // By Property Type
  const typeMap: Record<string, number[]> = {};
  for (const p of SCORED_PROJECTS) {
    // Normalize type
    const t = p.property_type.includes("Villa")
      ? "Villa"
      : p.property_type.includes("Plot")
        ? "Plots"
        : "Apartment";
    if (!typeMap[t]) typeMap[t] = [];
    typeMap[t].push(p.score.avgPrice);
  }
  const byType: TypePriceInsight[] = Object.entries(typeMap).map(
    ([type, prices]) => ({
      type,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      count: prices.length,
    }),
  );

  // Budget Buckets
  const total = SCORED_PROJECTS.length;
  const under80L = SCORED_PROJECTS.filter((p) => p.price_min < 8000000).length;
  const btw80L15Cr = SCORED_PROJECTS.filter(
    (p) => p.price_min >= 8000000 && p.price_min < 15000000,
  ).length;
  const btw15Cr3Cr = SCORED_PROJECTS.filter(
    (p) => p.price_min >= 15000000 && p.price_min < 30000000,
  ).length;
  const above3Cr = SCORED_PROJECTS.filter(
    (p) => p.price_min >= 30000000,
  ).length;

  const budgetBuckets: BudgetBucket[] = [
    {
      label: "Budget",
      range: "Under ₹80L",
      count: under80L,
      percentage: Math.round((under80L / total) * 100),
    },
    {
      label: "Mid",
      range: "₹80L – ₹1.5Cr",
      count: btw80L15Cr,
      percentage: Math.round((btw80L15Cr / total) * 100),
    },
    {
      label: "Premium",
      range: "₹1.5Cr – ₹3Cr",
      count: btw15Cr3Cr,
      percentage: Math.round((btw15Cr3Cr / total) * 100),
    },
    {
      label: "Luxury",
      range: "₹3Cr+",
      count: above3Cr,
      percentage: Math.round((above3Cr / total) * 100),
    },
  ];

  return { byZone, byType, budgetBuckets };
}

// ─── Unique Filter Values ─────────────────────────────────────────────────────

export const UNIQUE_ZONES = [
  ...new Set(BANGALORE_PROJECTS.map((p) => p.zone)),
].sort();
export const UNIQUE_LOCALITIES = [
  ...new Set(BANGALORE_PROJECTS.map((p) => p.locality)),
].sort();
export const UNIQUE_TYPES = ["All", "Apartment", "Villa", "Plots"];
export const UNIQUE_BHK = ["All", "1BHK", "2BHK", "3BHK", "4BHK", "5BHK"];
export const UNIQUE_STATUS = [
  "All",
  "Ready",
  "Under Construction",
  "Pre-Launch",
];

// Price range across dataset
export const PRICE_RANGE = {
  min: Math.min(...BANGALORE_PROJECTS.map((p) => p.price_min)),
  max: Math.max(...BANGALORE_PROJECTS.map((p) => p.price_max)),
};
