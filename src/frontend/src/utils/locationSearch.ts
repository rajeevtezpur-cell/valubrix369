import type { LocationRecord } from "../data/locationData";

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return dp[m][n];
}

function scoreMatch(query: string, record: LocationRecord): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  if (/^\d{6}$/.test(q) && record.pincode === q) return 100;
  if (/^\d{6}$/.test(q) && record.pincode.startsWith(q)) return 80;

  const nameLower = record.name.toLowerCase();
  const cityLower = record.city.toLowerCase();

  if (nameLower === q) return 95;
  if (nameLower.startsWith(q)) return 88;
  if (nameLower.includes(q)) return 75;
  if (cityLower === q) return 70;
  if (cityLower.startsWith(q)) return 65;

  for (const token of record.searchTokens) {
    const t = token.toLowerCase();
    if (t === q) return 90;
    if (t.startsWith(q)) return 82;
    if (t.includes(q)) return 72;
    if (q.length >= 4) {
      const dist = levenshtein(q, t);
      if (dist <= 1) return 78;
      if (dist <= 2) return 62;
    }
  }

  if (q.length >= 4) {
    const dist = levenshtein(q, nameLower);
    if (dist <= 1) return 75;
    if (dist <= 2) return 60;
    if (dist <= 3 && q.length >= 6) return 45;
  }

  return 0;
}

export function searchLocations(
  query: string,
  data: LocationRecord[],
): LocationRecord[] {
  if (!query || query.trim().length < 2) return [];
  const scored = data
    .map((r) => ({ record: r, score: scoreMatch(query, r) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 8).map((x) => x.record);
}

export function getNearbyLocalities(
  locationId: string,
  data: LocationRecord[],
): LocationRecord[] {
  const loc = data.find((r) => r.id === locationId);
  if (!loc || !loc.nearbyIds || loc.nearbyIds.length === 0) {
    return data
      .filter((r) => r.city === loc?.city && r.id !== locationId)
      .slice(0, 8);
  }
  return loc.nearbyIds
    .map((id) => data.find((r) => r.id === id))
    .filter(Boolean) as LocationRecord[];
}

export function getSubLocalities(
  locationId: string,
  data: LocationRecord[],
): LocationRecord[] {
  const loc = data.find((r) => r.id === locationId);
  if (!loc || !loc.subLocalities) return [];
  return loc.subLocalities.map((sub) => ({
    id: sub.id,
    name: sub.name,
    type: sub.type as LocationRecord["type"],
    city: loc.city,
    district: loc.district,
    state: loc.state,
    pincode: loc.pincode,
    searchTokens: [sub.name.toLowerCase()],
  }));
}

export function getLocationById(
  locationId: string,
  data: LocationRecord[],
): LocationRecord | undefined {
  return data.find((r) => r.id === locationId);
}

export function getPriceHistory(
  location: LocationRecord,
): { year: string; price: number }[] {
  const base = location.avgPricePerSqft ?? 8000;
  const growth = (location.priceGrowthYoY ?? 10) / 100;
  const years = ["2022", "2023", "2024", "2025", "2026"];
  return years.map((year, i) => ({
    year,
    price: Math.round(base / (1 + growth) ** (4 - i)),
  }));
}
