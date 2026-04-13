/**
 * Data validation utility for BANGALORE_PROJECTS dataset.
 * Detects duplicates, spelling variants, and multi-locality conflicts.
 * DOES NOT auto-change any data — only flags for manual review.
 */

import { BANGALORE_PROJECTS } from "../data/bangaloreProjects";

export type ValidationFlag = {
  ids: string[];
  names: string[];
  builders: string[];
  localities: string[];
  reason:
    | "SAME_NAME_MULTIPLE_LOCALITIES"
    | "EXACT_DUPLICATE"
    | "SPELLING_VARIANT";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  suggestion?: string;
};

/** Normalize a name for fuzzy comparison */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/** Check if two normalized names are close (within 2 char edit distance) */
function isSpellingVariant(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 4) return false;
  // Simple substring check for common variant patterns
  if (a.includes(b) || b.includes(a)) return true;
  // Levenshtein distance <= 2
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) =>
      i === 0 ? j : j === 0 ? i : 0,
    ),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length] <= 2;
}

export function getDataValidationReport(): ValidationFlag[] {
  const flags: ValidationFlag[] = [];
  const projects = BANGALORE_PROJECTS;

  // 1. Exact duplicates: same name + builder + locality
  const exactKey = new Map<string, typeof projects>();
  for (const p of projects) {
    const key = `${normalize(p.name)}|${normalize(p.builder)}|${normalize(p.locality)}`;
    if (!exactKey.has(key)) exactKey.set(key, []);
    exactKey.get(key)!.push(p);
  }
  for (const [, group] of exactKey) {
    if (group.length > 1) {
      flags.push({
        ids: group.map((p) => p.id),
        names: group.map((p) => p.name),
        builders: group.map((p) => p.builder),
        localities: group.map((p) => p.locality),
        reason: "EXACT_DUPLICATE",
        confidence: "HIGH",
        suggestion: `Remove duplicate entries for "${group[0].name}" in ${group[0].locality}`,
      });
    }
  }

  // 2. Same project name in multiple localities (not Phase variants)
  const byName = new Map<string, typeof projects>();
  for (const p of projects) {
    const key = normalize(p.name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(p);
  }
  for (const [_normName, group] of byName) {
    const localities = new Set(group.map((p) => p.locality));
    if (localities.size > 1) {
      // Skip if names suggest phases (phase, pt, p2 etc.)
      const hasPhaseVariant = group.some((p) =>
        /phase|pt\s*\d|p\s*\d$|\s+\d+$/.test(p.name.toLowerCase()),
      );
      if (!hasPhaseVariant) {
        flags.push({
          ids: group.map((p) => p.id),
          names: group.map((p) => p.name),
          builders: group.map((p) => p.builder),
          localities: group.map((p) => p.locality),
          reason: "SAME_NAME_MULTIPLE_LOCALITIES",
          confidence: "MEDIUM",
          suggestion: `"${group[0].name}" appears in ${Array.from(localities).join(", ")} — verify correct locality`,
        });
      }
    }
  }

  // 3. Spelling variants within same builder
  const byBuilder = new Map<string, typeof projects>();
  for (const p of projects) {
    if (!byBuilder.has(p.builder)) byBuilder.set(p.builder, []);
    byBuilder.get(p.builder)!.push(p);
  }
  for (const [, group] of byBuilder) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const normA = normalize(group[i].name);
        const normB = normalize(group[j].name);
        if (normA === normB) continue; // already caught by exact dup
        if (
          isSpellingVariant(normA, normB) &&
          group[i].locality !== group[j].locality
        ) {
          // Avoid duplicating flags
          const alreadyFlagged = flags.some(
            (f) => f.ids.includes(group[i].id) && f.ids.includes(group[j].id),
          );
          if (!alreadyFlagged) {
            flags.push({
              ids: [group[i].id, group[j].id],
              names: [group[i].name, group[j].name],
              builders: [group[i].builder, group[j].builder],
              localities: [group[i].locality, group[j].locality],
              reason: "SPELLING_VARIANT",
              confidence: "LOW",
              suggestion: `"${group[i].name}" and "${group[j].name}" may be the same project — verify`,
            });
          }
        }
      }
    }
  }

  return flags;
}
