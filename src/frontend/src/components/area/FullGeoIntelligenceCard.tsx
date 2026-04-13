/**
 * FullGeoIntelligenceCard.tsx — Premium freemium Geo Intelligence card for Location IQ
 *
 * Free users see blurred preview with "Unlock Complete Location Intelligence" CTA.
 * Clicking the CTA opens a dark glassmorphism payment modal that initiates Stripe checkout.
 *
 * Access levels:
 *   - admin / tester role → full access (bypass)
 *   - ?preview=true query param → full access (QA bypass)
 *   - subscription_status === "premium" → full access
 *   - otherwise → blurred with paywall
 *
 * On return from Stripe (?payment=success):
 *   - calls verifyAndUpgradeFromSession()
 *   - calls refreshSubscriptionStatus()
 *   - shows success toast and removes URL param
 */

import { CheckCircle, Crown, Loader2, Lock, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { getAreaIntelligence } from "../../engines/areaIntelligenceEngine";
import { type InfraItem, getTopTechParks } from "../../engines/infraEngine";
import { type MetroResult, getNearestMetros } from "../../engines/metroEngine";
import { useActor } from "../../hooks/useActor";
import {
  createCheckoutSession,
  verifyAndUpgradeFromSession,
} from "../../services/stripeService";
import { getLocalityRentMetrics } from "../../utils/rentEngine";

const GOLD = "#D8B56A";
const NAVY = "rgba(7,26,47,0.96)";

// ── Premium price display (label only — no hardcoded logic) ──────────────────
const PREMIUM_PRICE_LABEL = "₹999/month";

interface Props {
  locality: string;
  lat: number;
  lng: number;
  propertyType?: string;
  loading?: boolean;
}

type RiskLevel = "Low" | "Medium" | "High";

function RiskBadge({ level }: { level: RiskLevel }) {
  const cfg = {
    Low: {
      color: "#10b981",
      bg: "rgba(16,185,129,0.1)",
      border: "rgba(16,185,129,0.25)",
    },
    Medium: {
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.1)",
      border: "rgba(245,158,11,0.25)",
    },
    High: {
      color: "#ef4444",
      bg: "rgba(239,68,68,0.1)",
      border: "rgba(239,68,68,0.25)",
    },
  };
  const c = cfg[level];
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{
        color: c.color,
        background: c.bg,
        border: `1px solid ${c.border}`,
      }}
    >
      {level}
    </span>
  );
}

function StatChip({
  icon,
  label,
  value,
  color,
}: { icon: string; label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-xl p-3 text-center"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="text-xl mb-1">{icon}</div>
      <p className="text-xs text-white/40 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="font-bold text-sm" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

// ── Payment Modal ────────────────────────────────────────────────────────────

interface PaymentModalProps {
  locality: string;
  onClose: () => void;
  onProceed: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

function PaymentModal({
  locality,
  onClose,
  onProceed,
  loading,
  error,
}: PaymentModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Scroll lock: disable body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const features = [
    { icon: "📊", label: "Micro-market Analysis" },
    { icon: "🏘️", label: "Rental Intelligence & Yield Data" },
    { icon: "🚨", label: "Risk Engine (Oversupply, Liquidity)" },
    { icon: "🏗️", label: "Future Infra Impact Reports" },
    { icon: "💡", label: "Investment Score & ROI Projections" },
    { icon: "📍", label: "Full Geo Intelligence for all areas" },
  ];

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(4px)" }}
      onClick={handleOverlayClick}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      data-ocid="area.premium_payment_modal"
    >
      {/* Modal box — centered by flex parent, content scrollable inside */}
      <div
        className="relative w-full max-w-md rounded-2xl flex flex-col"
        style={{
          background:
            "linear-gradient(135deg, rgba(10,24,48,0.98) 0%, rgba(15,32,64,0.98) 100%)",
          border: `1px solid ${GOLD}35`,
          boxShadow: `0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px ${GOLD}12`,
          maxHeight: "90vh",
        }}
      >
        {/* Scrollable inner content */}
        <div className="overflow-y-auto flex-1">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10 z-10"
            style={{ color: "rgba(255,255,255,0.5)" }}
            data-ocid="area.premium_modal.close_btn"
            aria-label="Close payment modal"
          >
            <X size={16} />
          </button>

          {/* Header gradient strip */}
          <div
            className="px-6 pt-6 pb-4"
            style={{
              borderBottom: `1px solid ${GOLD}18`,
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: `${GOLD}18`,
                  border: `1px solid ${GOLD}35`,
                }}
              >
                <Crown size={22} style={{ color: GOLD }} />
              </div>
              <div>
                <h2
                  className="text-xl font-bold leading-tight"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: GOLD,
                  }}
                >
                  Upgrade to ValuBrix Premium
                </h2>
                <p className="text-white/40 text-xs mt-0.5">
                  Unlock Full Geo Intelligence for {locality}
                </p>
              </div>
            </div>

            {/* Price badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{
                background: `${GOLD}12`,
                border: `1px solid ${GOLD}30`,
              }}
            >
              <span
                className="text-2xl font-bold"
                style={{ fontFamily: "'Playfair Display', serif", color: GOLD }}
              >
                {PREMIUM_PRICE_LABEL}
              </span>
              <span className="text-white/30 text-xs">• Cancel anytime</span>
            </div>
          </div>

          {/* Features list */}
          <div className="px-6 py-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3 font-semibold">
              What's included
            </p>
            <div className="space-y-2.5">
              {features.map((f) => (
                <div key={f.label} className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {f.icon}
                  </div>
                  <span className="text-white/70 text-sm">{f.label}</span>
                  <CheckCircle
                    size={14}
                    className="ml-auto flex-shrink-0"
                    style={{ color: "#10b981" }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div
              className="mx-6 mb-3 px-4 py-2.5 rounded-xl text-sm"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#fca5a5",
              }}
            >
              {error}
            </div>
          )}

          {/* CTA buttons */}
          <div className="px-6 pb-6 space-y-3">
            <button
              type="button"
              onClick={onProceed}
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-black transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              style={{
                background: loading
                  ? "rgba(216,181,106,0.5)"
                  : `linear-gradient(135deg, ${GOLD} 0%, #B78F3B 100%)`,
                boxShadow: loading ? "none" : `0 4px 16px ${GOLD}40`,
              }}
              data-ocid="area.premium_modal.proceed_btn"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Connecting to payment...</span>
                </>
              ) : (
                <>
                  <Crown size={18} />
                  <span>Proceed to Payment</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
              style={{ color: "rgba(255,255,255,0.4)" }}
              data-ocid="area.premium_modal.cancel_btn"
            >
              Cancel
            </button>

            <p className="text-center text-white/20 text-xs">
              Secured by Stripe • 256-bit encryption • Instant access after
              payment
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function FullGeoIntelligenceCard({
  locality,
  lat,
  lng,
  propertyType,
  loading,
}: Props) {
  const { isPremium, refreshSubscriptionStatus, markUserPremium } = useAuth();
  const { actor } = useActor();

  // ?preview=true bypass (admin/QA) OR localStorage role bypass
  const previewBypass = useMemo(() => {
    const isPreviewParam =
      new URLSearchParams(window.location.search).get("preview") === "true";
    const role = localStorage.getItem("userRole") ?? "";
    const isAdminRole = role === "admin" || role === "tester" || role === "dev";
    return isPreviewParam || isAdminRole;
  }, []);

  const hasAccess = isPremium || previewBypass;

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Ref to the inner content — for scrollIntoView after unlock
  const contentRef = useRef<HTMLDivElement>(null);

  // Keep stable refs for the payment-return handler so the effect runs once
  const actorRef = useRef(actor);
  actorRef.current = actor;
  const markUserPremiumRef = useRef(markUserPremium);
  markUserPremiumRef.current = markUserPremium;
  const refreshSubscriptionRef = useRef(refreshSubscriptionStatus);
  refreshSubscriptionRef.current = refreshSubscriptionStatus;

  // ── Handle return from Stripe (?payment=success) ────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "success") return;

    // Remove param from URL immediately
    params.delete("payment");
    const qs = params.toString();
    const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    window.history.replaceState({}, "", newUrl);

    // Verify and upgrade
    (async () => {
      setPaymentLoading(true);
      try {
        const result = await verifyAndUpgradeFromSession(actorRef.current);
        if (result.ok) {
          markUserPremiumRef.current();
          await refreshSubscriptionRef.current();
          toast.success("🎉 Premium activated! Full access unlocked.", {
            duration: 5000,
          });
          // Scroll unlocked content into view
          setTimeout(() => {
            contentRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }, 400);
        } else {
          toast.error(
            result.error || "Payment verification failed. Contact support.",
          );
        }
      } catch {
        toast.error("Could not verify payment. Please contact support.");
      } finally {
        setPaymentLoading(false);
      }
    })();
    // Intentionally runs only once on mount to handle the ?payment=success redirect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Open payment modal ────────────────────────────────────────────────────
  const handleUnlockClick = useCallback(() => {
    setPaymentError(null);
    setShowPaymentModal(true);
  }, []);

  // ── Initiate checkout ─────────────────────────────────────────────────────
  const handleProceedToPayment = useCallback(async () => {
    setPaymentLoading(true);
    setPaymentError(null);

    const origin = window.location.origin;
    const path = window.location.pathname;
    const successUrl = `${origin}${path}?payment=success`;
    const cancelUrl = `${origin}${path}?payment=cancelled`;

    const result = await createCheckoutSession(actor, successUrl, cancelUrl);

    if (result.ok && result.sessionUrl) {
      // Redirect to Stripe checkout
      window.location.href = result.sessionUrl;
    } else {
      setPaymentError(
        result.error || "Unable to start payment. Please try again.",
      );
      setPaymentLoading(false);
    }
  }, [actor]);

  // ── Compute intelligence data ─────────────────────────────────────────────
  const areaData = useMemo(
    () => getAreaIntelligence(locality, lat, lng, propertyType),
    [locality, lat, lng, propertyType],
  );

  const rentMetrics = useMemo(
    () => getLocalityRentMetrics(locality),
    [locality],
  );
  const [techParks, setTechParks] = useState<InfraItem[]>([]);
  const [metros, setMetros] = useState<MetroResult[]>([]);
  useEffect(() => {
    if (!lat || !lng) return;
    getTopTechParks(lat, lng, 1)
      .then(setTechParks)
      .catch(() => setTechParks([]));
    getNearestMetros(lat, lng, 1)
      .then(setMetros)
      .catch(() => setMetros([]));
  }, [lat, lng]);

  const nearestTechKm = techParks[0]?.osrmKm ?? 15;

  const rentalYield = useMemo(() => {
    if (rentMetrics.yieldRange[0] > 0) {
      return (rentMetrics.yieldRange[0] + rentMetrics.yieldRange[1]) / 2;
    }
    return (
      ((((areaData.avgPricePerSqft * 1000 * 0.032) / 12) * 12) /
        (areaData.avgPricePerSqft * 1000)) *
      100
    );
  }, [rentMetrics, areaData]);

  const occupancy =
    areaData.demandScore > 70
      ? "92%"
      : areaData.demandScore >= 50
        ? "82%"
        : "68%";
  const tenantType =
    nearestTechKm < 5 ? "IT Professionals" : "Mixed (Family + IT)";

  const areaAvgPSF = Math.round(
    areaData.premiumPSF ?? areaData.avgPricePerSqft * 0.92,
  );
  const psfDelta = Math.round(
    ((areaData.avgPricePerSqft - areaAvgPSF) / Math.max(areaAvgPSF, 1)) * 100,
  );

  const oversupplyRisk: RiskLevel =
    areaData.investmentScore < 40
      ? "High"
      : areaData.investmentScore < 65
        ? "Medium"
        : "Low";
  const liquidityRisk: RiskLevel =
    areaData.demandScore < 40
      ? "High"
      : areaData.demandScore < 65
        ? "Medium"
        : "Low";
  const builderRisk: RiskLevel = "Medium";

  const riskLevels = [oversupplyRisk, liquidityRisk, builderRisk];
  const overallRisk: RiskLevel = riskLevels.includes("High")
    ? "High"
    : riskLevels.includes("Medium")
      ? "Medium"
      : "Low";

  if (loading) {
    return (
      <div className="rounded-2xl p-6 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 animate-pulse">
        <div className="h-8 w-64 rounded-lg bg-white/10 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-white/8" />
          ))}
        </div>
      </div>
    );
  }

  // ── Inner content (rendered always, blurred if not premium) ───────────────
  const innerContent = (
    <div className="space-y-5">
      {/* Section 1: Micro-market Analysis */}
      <div>
        <p className="text-white/40 text-xs uppercase tracking-wider mb-3 font-semibold flex items-center gap-2">
          <span>📊</span> Micro-market Analysis
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div
            className="rounded-xl p-3"
            style={{
              background: "rgba(216,181,106,0.06)",
              border: `1px solid ${GOLD}20`,
            }}
          >
            <p className="text-white/40 text-xs mb-1 flex items-center gap-1">
              Base Market PSF
              <span
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] cursor-help flex-shrink-0"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.5)",
                }}
                title="PSF = Price per square foot. Base Market PSF is the locality median from verified registry transactions."
              >
                ℹ
              </span>
            </p>
            <p className="font-bold text-base" style={{ color: GOLD }}>
              ₹
              {(areaData.basePSF ?? areaData.avgPricePerSqft).toLocaleString(
                "en-IN",
              )}
              /sqft
            </p>
          </div>
          <div
            className="rounded-xl p-3"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <p className="text-white/40 text-xs mb-1 flex items-center gap-1">
              Premium Range PSF
              <span
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] cursor-help flex-shrink-0"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.5)",
                }}
                title="PSF = Price per square foot. Premium Range reflects projects with builder/amenity premiums (Base × 1.2–1.4)."
              >
                ℹ
              </span>
            </p>
            <p className="font-bold text-base text-white/70">
              ₹{areaAvgPSF.toLocaleString("en-IN")}/sqft
            </p>
          </div>
        </div>

        <div
          className="rounded-xl px-4 py-2.5 flex items-center justify-between"
          style={{
            background:
              psfDelta > 0 ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
            border: `1px solid ${psfDelta > 0 ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
          }}
        >
          <span className="text-sm text-white/60">Premium vs area avg</span>
          <span
            className="font-bold text-sm"
            style={{ color: psfDelta > 0 ? "#10b981" : "#ef4444" }}
          >
            {psfDelta > 0 ? "+" : ""}
            {psfDelta}%
          </span>
        </div>

        <div className="mt-3 space-y-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/40">Demand</span>
              <span className="text-emerald-400 font-semibold">
                {areaData.demandScore}%
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${areaData.demandScore}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/40">Supply Pressure</span>
              <span className="text-amber-400 font-semibold">
                {100 - areaData.demandScore}%
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-700"
                style={{ width: `${100 - areaData.demandScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

      {/* Section 2: Rental Intelligence */}
      <div>
        <p className="text-white/40 text-xs uppercase tracking-wider mb-3 font-semibold flex items-center gap-2">
          <span>🏘️</span> Rental Intelligence
        </p>
        <div className="grid grid-cols-3 gap-3">
          <StatChip
            icon="💹"
            label="Gross Yield"
            value={`${rentalYield.toFixed(1)}%`}
            color={
              rentalYield >= 4
                ? "#10b981"
                : rentalYield >= 2.5
                  ? "#f59e0b"
                  : "#ef4444"
            }
          />
          <StatChip
            icon="🏠"
            label="Occupancy"
            value={occupancy}
            color="#60a5fa"
          />
          <StatChip
            icon="👥"
            label="Tenant Type"
            value={tenantType.split(" ")[0]}
            color={GOLD}
          />
        </div>
        <p className="text-white/30 text-xs mt-2 text-center">
          Primary tenants: <span className="text-white/50">{tenantType}</span>
          {metros[0] &&
            ` · Metro access: ${(metros[0].osrmKm ?? metros[0].aerialKm ?? 0).toFixed(1)} km`}
        </p>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

      {/* Section 3: Risk Meter */}
      <div>
        <p className="text-white/40 text-xs uppercase tracking-wider mb-3 font-semibold flex items-center gap-2">
          <span>🚨</span> Risk Meter
        </p>
        <div className="space-y-2.5 mb-4">
          {[
            { label: "Oversupply Risk", level: oversupplyRisk },
            { label: "Liquidity Risk", level: liquidityRisk },
            { label: "Builder Risk", level: builderRisk },
          ].map((risk) => (
            <div
              key={risk.label}
              className="flex items-center justify-between rounded-xl px-4 py-2.5"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span className="text-white/60 text-sm">{risk.label}</span>
              <RiskBadge level={risk.level} />
            </div>
          ))}
        </div>

        <div
          className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{
            background:
              overallRisk === "Low"
                ? "rgba(16,185,129,0.07)"
                : overallRisk === "Medium"
                  ? "rgba(245,158,11,0.07)"
                  : "rgba(239,68,68,0.07)",
            border: `1px solid ${
              overallRisk === "Low"
                ? "rgba(16,185,129,0.25)"
                : overallRisk === "Medium"
                  ? "rgba(245,158,11,0.25)"
                  : "rgba(239,68,68,0.25)"
            }`,
          }}
        >
          <span className="text-white/60 text-sm font-semibold">
            Overall Risk Profile
          </span>
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{
                background:
                  overallRisk === "Low"
                    ? "#10b981"
                    : overallRisk === "Medium"
                      ? "#f59e0b"
                      : "#ef4444",
              }}
            />
            <span
              className="font-bold text-sm"
              style={{
                color:
                  overallRisk === "Low"
                    ? "#10b981"
                    : overallRisk === "Medium"
                      ? "#f59e0b"
                      : "#ef4444",
              }}
            >
              {overallRisk} Risk
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div
        className="rounded-2xl p-5 md:p-6"
        style={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(16px)",
          border: `1px solid ${GOLD}22`,
          boxShadow: "0 4px 32px rgba(0,0,0,0.4)",
        }}
        data-ocid="area.full_geo_intelligence_card"
      >
        {/* Card header — always visible */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
            style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}35` }}
          >
            {hasAccess ? (
              <Crown size={18} style={{ color: GOLD }} />
            ) : (
              <Lock size={18} style={{ color: GOLD }} />
            )}
          </div>
          <div>
            <h2
              className="text-xl font-bold"
              style={{ fontFamily: "'Playfair Display', serif", color: GOLD }}
            >
              Full Geo Intelligence
            </h2>
            <p className="text-white/40 text-xs">
              Deep-dive area intelligence report
            </p>
          </div>
          {hasAccess && (
            <span
              className="ml-auto text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"
              style={{
                background: `${GOLD}18`,
                color: GOLD,
                border: `1px solid ${GOLD}35`,
              }}
            >
              <Crown size={11} />
              Premium
            </span>
          )}
        </div>

        {/* Content with freemium blur overlay */}
        <div className="relative" ref={contentRef}>
          <div
            style={{
              filter: hasAccess ? "none" : "blur(6px)",
              pointerEvents: hasAccess ? "auto" : "none",
              userSelect: "none",
            }}
          >
            {innerContent}
          </div>

          {/* CTA overlay for free users */}
          {!hasAccess && (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-2xl"
              style={{
                background: "rgba(7,26,47,0.72)",
                backdropFilter: "blur(2px)",
              }}
            >
              <div
                className="mx-4 rounded-2xl p-6 text-center max-w-sm"
                style={{
                  background: NAVY,
                  border: `1px solid ${GOLD}35`,
                  boxShadow: "0 8px 48px rgba(0,0,0,0.5)",
                }}
                data-ocid="area.geo_intelligence.premium_cta"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{
                    background: `${GOLD}18`,
                    border: `1px solid ${GOLD}35`,
                  }}
                >
                  <Lock size={24} style={{ color: GOLD }} />
                </div>

                <h3
                  className="text-xl font-bold mb-1"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: GOLD,
                  }}
                >
                  Full Geo Intelligence
                </h3>

                <p className="text-white/50 text-sm mb-1">
                  Unlock complete location intelligence for {locality}
                </p>
                <p className="text-sm font-bold mb-5" style={{ color: GOLD }}>
                  {PREMIUM_PRICE_LABEL}
                </p>

                <div className="text-left mb-5 space-y-2">
                  {[
                    "Micro-market Analysis",
                    "Rental Intelligence",
                    "Risk Engine",
                    "Future Infra Impact",
                    "Investment Score",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: GOLD }}
                      />
                      <span className="text-white/60 text-sm">{item}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleUnlockClick}
                  className="w-full py-3 rounded-xl font-bold text-black transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${GOLD} 0%, #B78F3B 100%)`,
                  }}
                  data-ocid="area.geo_intelligence.unlock_cta_button"
                >
                  <Crown size={16} />
                  Unlock Complete Location Intelligence
                </button>

                <p className="text-white/30 text-xs mt-3">
                  Join ValuBrix Premium
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          locality={locality}
          onClose={() => {
            if (!paymentLoading) {
              setShowPaymentModal(false);
              setPaymentError(null);
            }
          }}
          onProceed={handleProceedToPayment}
          loading={paymentLoading}
          error={paymentError}
        />
      )}
    </>
  );
}
