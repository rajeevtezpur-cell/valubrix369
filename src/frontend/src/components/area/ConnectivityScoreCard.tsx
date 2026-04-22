/**
 * ConnectivityScoreCard.tsx — Transport connectivity premium card for Location IQ
 * Shows metro distance, bus density, airport access, and connectivity score bar.
 */

import { useEffect, useMemo, useState } from "react";
import { type MetroResult, getNearestMetros } from "../../engines/metroEngine";

const GOLD = "#D8B56A";

interface Props {
  lat: number;
  lng: number;
  locality: string;
  loading?: boolean;
  metros?: MetroResult[];
  /** OSRM driving km to airport — passed from parent. If null/undefined, shows "Distance unavailable". */
  airportOsrmKm?: number | null;
}

function ConnectivitySkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-48 rounded-lg bg-white/10" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-xl bg-white/8" />
        ))}
      </div>
      <div className="h-3 w-full rounded-full bg-white/10" />
    </div>
  );
}

function getBusDensity(lat: number, lng: number): "High" | "Medium" | "Low" {
  // Core Bangalore urban area — dense BMTC coverage
  if (lat >= 12.85 && lat <= 13.15 && lng >= 77.45 && lng <= 77.75)
    return "High";
  // North Bangalore / Devanahalli corridor — moderate coverage
  if (lat >= 13.0 && lat <= 13.35 && lng >= 77.55 && lng <= 77.75)
    return "Medium";
  return "Low";
}

function computeConnectivityScore(
  nearestMetroKm: number | null,
  airportMins: number | null,
  busDensity: "High" | "Medium" | "Low",
): number {
  let score = 0;
  // Metro weight: 45% — only counted when OSRM data is available
  if (nearestMetroKm !== null) {
    if (nearestMetroKm < 1) score += 45;
    else if (nearestMetroKm < 2) score += 38;
    else if (nearestMetroKm < 5) score += 28;
    else if (nearestMetroKm < 10) score += 15;
    else score += 5;
  }
  // else: 0 contribution from metro — no fake default

  // Airport weight: 25% — only counted when OSRM data is available
  if (airportMins !== null) {
    if (airportMins < 30) score += 25;
    else if (airportMins < 45) score += 18;
    else if (airportMins < 60) score += 12;
    else if (airportMins < 90) score += 7;
    else score += 3;
  }
  // else: 0 contribution from airport

  // Bus density weight: 30%
  if (busDensity === "High") score += 30;
  else if (busDensity === "Medium") score += 20;
  else score += 10;

  return Math.min(100, score);
}

export function ConnectivityScoreCard({
  lat,
  lng,
  locality,
  loading,
  metros: metrosProp,
  airportOsrmKm,
}: Props) {
  const [metros, setMetros] = useState<MetroResult[]>([]);
  useEffect(() => {
    // Guard: do not fetch with zero or missing coordinates
    if (!lat || !lng || lat === 0 || lng === 0) return;
    console.log(`[ConnectivityScore] lat=${lat}, lng=${lng}`);
    // If pre-fetched metros are provided and non-empty, use them directly — no re-fetch
    if (metrosProp && metrosProp.length > 0) {
      setMetros(metrosProp);
    } else {
      getNearestMetros(lat, lng, 1)
        .then(setMetros)
        .catch(() => setMetros([]));
    }
  }, [lat, lng, metrosProp]);
  const nearestMetro = metros[0];

  // FIX: Use null instead of aerialKm fallback — null means "no OSRM data yet".
  // aerialKm is straight-line distance and must NEVER be shown in UI.
  // When OSRM is unavailable, score contribution is 0 (not misleading).
  const metroKm: number | null = nearestMetro?.osrmKm ?? null;

  // FIX: Airport — use OSRM km from parent only. Never use haversine.
  // airportOsrmKm is null/undefined when OSRM hasn't resolved yet → show "Distance unavailable"
  const resolvedAirportKm: number | null = airportOsrmKm ?? null;

  // Estimate airport travel minutes from OSRM driving km (avg 45 km/h city+highway mix)
  const airportMins: number | null =
    resolvedAirportKm !== null
      ? Math.min(120, Math.round((resolvedAirportKm / 45) * 60))
      : null;

  const busDensity = useMemo(() => getBusDensity(lat, lng), [lat, lng]);

  const score = useMemo(
    () => computeConnectivityScore(metroKm, airportMins, busDensity),
    [metroKm, airportMins, busDensity],
  );

  const scoreColor =
    score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";

  // connTag uses metroKm — show neutral label when no data
  const connTag =
    metroKm === null
      ? {
          label: "⚡ Calculating connectivity…",
          color: "#94a3b8",
          bg: "rgba(148,163,184,0.08)",
          border: "rgba(148,163,184,0.2)",
        }
      : metroKm < 2
        ? {
            label: "🚇 Strong future connectivity boost",
            color: "#10b981",
            bg: "rgba(16,185,129,0.1)",
            border: "rgba(16,185,129,0.25)",
          }
        : metroKm < 5
          ? {
              label: "🚇 Good connectivity zone",
              color: "#f59e0b",
              bg: "rgba(245,158,11,0.1)",
              border: "rgba(245,158,11,0.25)",
            }
          : {
              label: "⚡ Peripheral — improving connectivity",
              color: "#94a3b8",
              bg: "rgba(148,163,184,0.08)",
              border: "rgba(148,163,184,0.2)",
            };

  // Guard: if no real coordinates provided, show "select a location" state
  if (!lat || !lng || lat === 0 || lng === 0) {
    return (
      <div className="rounded-2xl p-6 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 text-white/40 text-sm text-center">
        Select a location to view connectivity data
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl p-6 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50">
        <ConnectivitySkeleton />
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 md:p-6"
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(96,165,250,0.2)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.35)",
      }}
      data-ocid="area.connectivity_score_card"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
          style={{
            background: "rgba(216,181,106,0.12)",
            border: `1px solid ${GOLD}30`,
          }}
        >
          <span style={{ fontSize: 18 }}>📍</span>
        </div>
        <h2
          className="text-lg font-bold flex-1"
          style={{ fontFamily: "'Playfair Display', serif", color: GOLD }}
        >
          Connectivity Score
        </h2>
        <span
          className="text-sm font-bold px-2.5 py-1 rounded-full"
          style={{
            color: scoreColor,
            background: `${scoreColor}15`,
            border: `1px solid ${scoreColor}30`,
          }}
        >
          {score}/100
        </span>
      </div>

      {/* Score bar */}
      <div className="mb-5">
        <div
          className="h-2.5 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${score}%`, backgroundColor: scoreColor }}
          />
        </div>
        <p className="text-white/35 text-[10px] mt-1.5 text-right">
          {score >= 70 ? "Excellent" : score >= 40 ? "Good" : "Developing"}{" "}
          connectivity
        </p>
      </div>

      {/* Metrics */}
      <div className="space-y-3 mb-5">
        {/* Metro */}
        <div
          className="flex items-center gap-3 rounded-xl p-3"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span className="text-xl flex-shrink-0">🚇</span>
          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-sm font-medium truncate">
              {nearestMetro?.name ?? "Nearest Metro"}
            </p>
            <p className="text-white/40 text-xs">
              {nearestMetro?.line ? `${nearestMetro.line} Line · ` : ""}
              {metroKm !== null
                ? `${metroKm.toFixed(1)} km driving`
                : "Distance unavailable"}
            </p>
          </div>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              color:
                metroKm === null
                  ? "rgba(255,255,255,0.3)"
                  : metroKm < 2
                    ? "#10b981"
                    : metroKm < 5
                      ? "#f59e0b"
                      : "#ef4444",
              background: "rgba(255,255,255,0.06)",
            }}
          >
            {metroKm !== null ? `${metroKm.toFixed(1)} km` : "N/A"}
          </span>
        </div>

        {/* Bus */}
        <div
          className="flex items-center gap-3 rounded-xl p-3"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span className="text-xl flex-shrink-0">🚌</span>
          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-sm font-medium">Bus Density</p>
            <p className="text-white/40 text-xs">
              BMTC coverage for {locality}
            </p>
          </div>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{
              color:
                busDensity === "High"
                  ? "#10b981"
                  : busDensity === "Medium"
                    ? "#f59e0b"
                    : "#94a3b8",
              background:
                busDensity === "High"
                  ? "rgba(16,185,129,0.1)"
                  : busDensity === "Medium"
                    ? "rgba(245,158,11,0.1)"
                    : "rgba(148,163,184,0.08)",
              border: "1px solid currentColor",
            }}
          >
            {busDensity}
          </span>
        </div>

        {/* Airport — OSRM only, never haversine */}
        <div
          className="flex items-center gap-3 rounded-xl p-3"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span className="text-xl flex-shrink-0">✈️</span>
          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-sm font-medium">Airport Access</p>
            <p className="text-white/40 text-xs">
              Kempegowda International
              {resolvedAirportKm !== null
                ? ` · ${resolvedAirportKm.toFixed(0)} km`
                : ""}
            </p>
          </div>
          <span className="text-xs font-semibold text-white/60 flex-shrink-0">
            {airportMins !== null
              ? `${airportMins} mins ✈️`
              : "Distance unavailable"}
          </span>
        </div>
      </div>

      {/* Smart tag */}
      <div
        className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold"
        style={{
          color: connTag.color,
          background: connTag.bg,
          border: `1px solid ${connTag.border}`,
        }}
      >
        {connTag.label}
      </div>
    </div>
  );
}
