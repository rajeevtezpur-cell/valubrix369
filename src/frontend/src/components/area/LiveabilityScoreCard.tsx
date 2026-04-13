/**
 * LiveabilityScoreCard.tsx — Livability score card for Location IQ
 * Shows schools/hospitals/retail star ratings and overall livability score.
 */

import { useEffect, useMemo, useState } from "react";
import {
  type InfraItem,
  getTopHospitals,
  getTopMalls,
  getTopSchools,
} from "../../engines/infraEngine";

const GOLD = "#D8B56A";

interface Props {
  lat: number;
  lng: number;
  locality: string;
  loading?: boolean;
  /** Pass true while parent OSRM fetch is in flight — prevents race-condition fallback fetch */
  isLoading?: boolean;
  schools?: InfraItem[];
  hospitals?: InfraItem[];
  malls?: InfraItem[];
}

function LiveabilitySkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-40 rounded-lg bg-white/10" />
      <div className="flex justify-center">
        <div className="h-28 w-28 rounded-full bg-white/8" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded-xl bg-white/8" />
        ))}
      </div>
    </div>
  );
}

function getStarCount(itemCount: number): number {
  if (itemCount >= 4) return 4;
  if (itemCount >= 3) return 3;
  if (itemCount >= 2) return 2;
  if (itemCount >= 1) return 1;
  return 0;
}

function StarRating({ count, max = 4 }: { count: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={`star-${i}-of-${max}`}
          style={{
            color: i < count ? "#f59e0b" : "rgba(255,255,255,0.15)",
            fontSize: 14,
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function LiveabilityScoreCard({
  lat,
  lng,
  locality,
  loading,
  isLoading,
  schools: schoolsProp,
  hospitals: hospitalsProp,
  malls: mallsProp,
}: Props) {
  const [schools, setSchools] = useState<InfraItem[]>([]);
  const [hospitals, setHospitals] = useState<InfraItem[]>([]);
  const [malls, setMalls] = useState<InfraItem[]>([]);

  useEffect(() => {
    // Guard: don't fire fallback fetch while parent is still loading pre-fetched arrays
    if (isLoading) return;
    // If pre-fetched arrays are provided and non-empty, use them directly — no re-fetch
    if (schoolsProp && schoolsProp.length > 0) {
      setSchools(schoolsProp);
    } else if (lat && lng) {
      getTopSchools(lat, lng, 5)
        .then(setSchools)
        .catch(() => setSchools([]));
    }
  }, [lat, lng, schoolsProp, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    if (hospitalsProp && hospitalsProp.length > 0) {
      setHospitals(hospitalsProp);
    } else if (lat && lng) {
      getTopHospitals(lat, lng, 5)
        .then(setHospitals)
        .catch(() => setHospitals([]));
    }
  }, [lat, lng, hospitalsProp, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    if (mallsProp && mallsProp.length > 0) {
      setMalls(mallsProp);
    } else if (lat && lng) {
      getTopMalls(lat, lng, 5)
        .then(setMalls)
        .catch(() => setMalls([]));
    }
  }, [lat, lng, mallsProp, isLoading]);

  const schoolStars = getStarCount(schools.length);
  const hospitalStars = getStarCount(hospitals.length);
  const retailStars = getStarCount(malls.length);

  // Weighted score: schools 30%, hospitals 40%, retail 30%
  const score = useMemo(() => {
    const schoolScore = (schoolStars / 4) * 100;
    const hospitalScore = (hospitalStars / 4) * 100;
    const retailScore = (retailStars / 4) * 100;
    return Math.round(
      schoolScore * 0.3 + hospitalScore * 0.4 + retailScore * 0.3,
    );
  }, [schoolStars, hospitalStars, retailStars]);

  const scoreColor =
    score >= 70 ? "#10b981" : score >= 45 ? "#f59e0b" : "#ef4444";
  const scoreTier =
    score >= 75
      ? "Excellent"
      : score >= 55
        ? "Good"
        : score >= 35
          ? "Average"
          : "Developing";

  if (loading || isLoading) {
    return (
      <div className="rounded-2xl p-6 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50">
        <LiveabilitySkeleton />
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 md:p-6"
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(167,139,250,0.2)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.35)",
      }}
      data-ocid="area.livability_score_card"
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
          <span style={{ fontSize: 18 }}>🏠</span>
        </div>
        <h2
          className="text-lg font-bold flex-1"
          style={{ fontFamily: "'Playfair Display', serif", color: GOLD }}
        >
          Livability Score
        </h2>
      </div>

      {/* Big score display */}
      <div className="flex items-center gap-6 mb-6">
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-24 h-24 rounded-full flex flex-col items-center justify-center"
            style={{
              background: `conic-gradient(${scoreColor} ${score * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
              padding: 4,
            }}
          >
            <div
              className="w-full h-full rounded-full flex flex-col items-center justify-center"
              style={{ background: "#0A1628" }}
            >
              <span
                className="text-3xl font-bold"
                style={{
                  color: scoreColor,
                  fontFamily: "'Playfair Display', serif",
                }}
              >
                {score}
              </span>
              <span className="text-white/30 text-[9px]">/100</span>
            </div>
          </div>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              color: scoreColor,
              background: `${scoreColor}15`,
              border: `1px solid ${scoreColor}30`,
            }}
          >
            {scoreTier}
          </span>
        </div>

        <div className="flex-1 space-y-1.5">
          <p className="text-white/50 text-xs uppercase tracking-wide mb-3 font-semibold">
            {locality} livability
          </p>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${score}%`, backgroundColor: scoreColor }}
            />
          </div>
          <p className="text-white/30 text-xs mt-1">
            {score >= 70
              ? "Great place to live"
              : score >= 45
                ? "Livable with good amenities"
                : "Developing livability"}
          </p>
        </div>
      </div>

      {/* Category ratings */}
      <div className="space-y-3">
        {[
          {
            icon: "🏫",
            label: "Schools",
            stars: schoolStars,
            count: schools.length,
            weight: "30% weight",
          },
          {
            icon: "🏥",
            label: "Hospitals",
            stars: hospitalStars,
            count: hospitals.length,
            weight: "40% weight",
          },
          {
            icon: "🛍️",
            label: "Retail / Malls",
            stars: retailStars,
            count: malls.length,
            weight: "30% weight",
          },
        ].map((cat) => (
          <div
            key={cat.label}
            className="flex items-center gap-3 rounded-xl p-3"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span className="text-lg flex-shrink-0">{cat.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-white/80 text-sm font-medium">{cat.label}</p>
                <StarRating count={cat.stars} />
              </div>
              <p className="text-white/35 text-xs">
                {cat.count > 0
                  ? `${cat.count} within reach · `
                  : "None found nearby · "}
                <span style={{ color: "rgba(216,181,106,0.5)" }}>
                  {cat.weight}
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {schools.length > 0 && (
        <div
          className="mt-4 pt-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-white/35 text-xs">
            Nearest school:{" "}
            <span className="text-white/55">{schools[0]?.name}</span>
            {" · "}
            {(schools[0]?.osrmKm ?? 0).toFixed(1)} km
          </p>
        </div>
      )}
    </div>
  );
}
