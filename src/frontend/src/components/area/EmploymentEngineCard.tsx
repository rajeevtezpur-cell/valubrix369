/**
 * EmploymentEngineCard.tsx — Employment proximity intelligence card for Location IQ
 * Shows top tech parks, upcoming SEZs, and employment demand insight.
 */

import { useEffect, useMemo, useState } from "react";
import { type InfraItem, getTopTechParks } from "../../engines/infraEngine";

const GOLD = "#D8B56A";

interface Props {
  lat: number;
  lng: number;
  locality: string;
  loading?: boolean;
}

function EmploymentSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-44 rounded-lg bg-white/10" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-xl bg-white/8" />
        ))}
      </div>
      <div className="h-8 w-40 rounded-full bg-white/10" />
    </div>
  );
}

// Upcoming SEZs based on North/Devanahalli zone detection
function getUpcomingSEZs(
  locality: string,
  lat: number,
): Array<{ name: string; area: string }> {
  const loc = locality.toLowerCase();
  const isNorthZone =
    lat > 13.05 ||
    loc.includes("devanahalli") ||
    loc.includes("bagalur") ||
    loc.includes("yelahanka") ||
    loc.includes("chikkajala");
  const isWestZone =
    loc.includes("tumkur") ||
    loc.includes("peenya") ||
    loc.includes("dasarahalli");

  if (isNorthZone) {
    return [
      { name: "Aerospace SEZ", area: "Devanahalli" },
      { name: "ITIR Phase 2 Industrial Corridor", area: "Bagalur Road" },
    ];
  }
  if (isWestZone) {
    return [
      { name: "Electronics Manufacturing Cluster", area: "Tumkur Road" },
      { name: "Peenya Industrial Area Extension", area: "Peenya" },
    ];
  }
  return [
    { name: "ORR Phase 3 IT Corridor", area: "Outer Ring Road" },
    { name: "KIADB Electronics Park", area: "Whitefield Extension" },
  ];
}

function computeEmploymentScore(nearestParkKm: number): number {
  if (nearestParkKm < 2) return 90;
  if (nearestParkKm < 5) return 75;
  if (nearestParkKm < 8) return 58;
  if (nearestParkKm < 12) return 42;
  if (nearestParkKm < 20) return 28;
  return 15;
}

export function EmploymentEngineCard({ lat, lng, locality, loading }: Props) {
  const [techParks, setTechParks] = useState<InfraItem[]>([]);
  useEffect(() => {
    if (!lat || !lng) return;
    getTopTechParks(lat, lng, 3)
      .then(setTechParks)
      .catch(() => setTechParks([]));
  }, [lat, lng]);
  const upcomingSEZs = useMemo(
    () => getUpcomingSEZs(locality, lat),
    [locality, lat],
  );

  const nearestKm = techParks[0]?.osrmKm ?? techParks[0]?.distKm ?? 15;
  const score = useMemo(() => computeEmploymentScore(nearestKm), [nearestKm]);
  const scoreColor =
    score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";

  const demandTag =
    nearestKm < 5
      ? {
          label: "⚡ High rental demand zone",
          color: "#10b981",
          bg: "rgba(16,185,129,0.1)",
          border: "rgba(16,185,129,0.25)",
        }
      : nearestKm < 10
        ? {
            label: "📈 Strong employment proximity",
            color: "#f59e0b",
            bg: "rgba(245,158,11,0.1)",
            border: "rgba(245,158,11,0.25)",
          }
        : {
            label: "🏙️ Moderate employment access",
            color: "#94a3b8",
            bg: "rgba(148,163,184,0.08)",
            border: "rgba(148,163,184,0.2)",
          };

  if (loading) {
    return (
      <div className="rounded-2xl p-6 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50">
        <EmploymentSkeleton />
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 md:p-6"
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(216,181,106,0.18)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.35)",
      }}
      data-ocid="area.employment_engine_card"
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
          <span style={{ fontSize: 18 }}>🏢</span>
        </div>
        <h2
          className="text-lg font-bold flex-1"
          style={{ fontFamily: "'Playfair Display', serif", color: GOLD }}
        >
          Employment Engine
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

      {/* Demand bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-white/40">Employment Demand Score</span>
          <span className="font-semibold" style={{ color: scoreColor }}>
            {score}%
          </span>
        </div>
        <div
          className="h-2.5 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${score}%`, backgroundColor: scoreColor }}
          />
        </div>
      </div>

      {/* Nearby Tech Parks */}
      <div className="mb-5">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-3 font-semibold">
          Nearby Tech Parks
        </p>
        <div className="space-y-2">
          {techParks.length > 0 ? (
            techParks.map((park) => (
              <div
                key={park.name}
                className="flex items-center gap-3 rounded-xl p-3"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span className="text-lg flex-shrink-0">🏢</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-sm font-medium truncate">
                    {park.name}
                  </p>
                  <p className="text-white/40 text-xs">
                    {(park.osrmKm ?? park.distKm ?? 0).toFixed(1)} km ·{" "}
                    {park.osrmDurationMins ?? park.travelMins ?? 0} mins
                  </p>
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    color:
                      (park.osrmKm ?? park.distKm ?? 0) < 5
                        ? "#10b981"
                        : (park.osrmKm ?? park.distKm ?? 0) < 10
                          ? "#f59e0b"
                          : "#94a3b8",
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  {(park.osrmKm ?? park.distKm ?? 0).toFixed(1)} km
                </span>
              </div>
            ))
          ) : (
            <div
              className="rounded-xl p-3 text-center"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p className="text-white/40 text-sm">
                Drop a pin to calculate distances
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming SEZs */}
      <div className="mb-5">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-3 font-semibold">
          Upcoming SEZs & Industrial Zones
        </p>
        <div className="space-y-2">
          {upcomingSEZs.map((sez) => (
            <div
              key={sez.name}
              className="flex items-center gap-3 rounded-xl p-3"
              style={{
                background: "rgba(245,158,11,0.05)",
                border: "1px solid rgba(245,158,11,0.15)",
              }}
            >
              <span className="text-lg flex-shrink-0">🔜</span>
              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-sm font-medium truncate">
                  {sez.name}
                </p>
                <p className="text-white/40 text-xs">{sez.area}</p>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  color: "#f59e0b",
                  background: "rgba(245,158,11,0.12)",
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
              >
                Upcoming
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Demand insight tag */}
      <div
        className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold"
        style={{
          color: demandTag.color,
          background: demandTag.bg,
          border: `1px solid ${demandTag.border}`,
        }}
      >
        {demandTag.label}
      </div>
    </div>
  );
}
