/**
 * Shared project filtering utility — strict AND logic.
 * Used by all builder/project dropdowns globally.
 *
 * FilteredProjects =
 *   projects.filter(p =>
 *     (builder === "" || p.builder === builder) &&
 *     (locality === "" || p.locality.toLowerCase() === locality.toLowerCase())
 *   )
 */

import {
  BANGALORE_PROJECTS,
  type BangaloreProject,
} from "../data/bangaloreProjects";

interface UserSaleRecord {
  locality: string;
  sqft: number;
  propertyType?: string;
  soldPrice: number;
  builder?: string;
  project?: string;
  timestamp: number;
}

/**
 * Returns a merged pool combining seeded projects + user-submitted sold price records.
 * Only includes sold-price records that have a non-empty builder field.
 */
export function getMergedPool(): BangaloreProject[] {
  const base: BangaloreProject[] = [...BANGALORE_PROJECTS];

  try {
    const raw = localStorage.getItem("valubrix_user_sales");
    if (raw) {
      const sales: UserSaleRecord[] = JSON.parse(raw);
      const extras: BangaloreProject[] = sales
        .filter((s) => s.builder && s.builder.trim() !== "")
        .map((s, i) => ({
          id: `sale-${i}`,
          name: s.project || "",
          builder: s.builder as string,
          locality: s.locality,
          property_type: s.propertyType || "Apartment",
          configuration: "",
          micro_location: s.locality,
          zone: "",
          status: "Ready to Move",
          launch_year: new Date(s.timestamp).getFullYear(),
          completion_year: new Date(s.timestamp).getFullYear(),
          price_min: s.soldPrice,
          price_max: s.soldPrice,
          latitude: 0,
          longitude: 0,
          dataType: "user_sale",
        }));
      base.push(...extras);
    }
  } catch {
    // localStorage unavailable or malformed — silently fall back to base
  }

  return base;
}

/**
 * Strict AND filter: returns projects matching builder AND locality.
 * Empty string means "All" for that dimension.
 */
export function filterProjectsByBuilderAndLocality(
  builder: string,
  locality: string,
): BangaloreProject[] {
  return getMergedPool().filter((p) => {
    const builderMatch = !builder || p.builder === builder;
    const localityMatch =
      !locality || p.locality.toLowerCase() === locality.toLowerCase();
    return builderMatch && localityMatch;
  });
}

/**
 * Returns unique builders that have at least one project in the given locality.
 * If locality is empty, returns all builders.
 */
export function filterBuildersByLocality(locality: string): string[] {
  const pool = getMergedPool();
  const filtered = locality
    ? pool.filter((p) => p.locality.toLowerCase() === locality.toLowerCase())
    : pool;
  return Array.from(
    new Set(filtered.map((p) => p.builder).filter(Boolean)),
  ).sort();
}

/**
 * Returns unique localities that have at least one project for the given builder.
 * If builder is empty, returns all localities.
 */
export function filterLocalitiesByBuilder(builder: string): string[] {
  const pool = getMergedPool();
  const filtered = builder ? pool.filter((p) => p.builder === builder) : pool;
  return Array.from(new Set(filtered.map((p) => p.locality))).sort();
}
