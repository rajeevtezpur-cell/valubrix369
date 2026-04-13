// BuyerValuationPage.tsx — RealWorth AI (AI Valuation) — Step-based unified flow
// Step 1 uses full-screen map layout (matching Area Intelligence / Sell page)
// Steps 2-5 use BuyerLayout with sidebar

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import BuyerLayout from "../components/BuyerLayout";
import GlobalMapComponent from "../components/GlobalMapComponent";
import Navbar from "../components/Navbar";
import AdditionalFiltersStep from "../components/steps/AdditionalFiltersStep";
import BudgetOrAreaStep from "../components/steps/BudgetOrAreaStep";
import LocationStep from "../components/steps/LocationStep";
import PropertyTypeStep from "../components/steps/PropertyTypeStep";
import ResultsStep from "../components/steps/ResultsStep";
import StepProgress from "../components/steps/StepProgress";
import type {
  AdditionalFiltersData,
  BudgetOrAreaData,
  FlowData,
  LocationData,
  PropertyTypeData,
} from "../components/steps/types";

// ─── Step animation variants ─────────────────────────────────────────────────

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 40 : -40,
    opacity: 0,
  }),
};

const TOTAL_STEPS = 5;

export default function BuyerValuationPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [flowData, setFlowData] = useState<FlowData>({});

  // Map center synced from location selection
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    12.9716, 77.5946,
  ]);
  const cardRef = useRef<HTMLDivElement>(null);

  // Update map center when location is selected
  useEffect(() => {
    if (flowData.location?.lat && flowData.location?.lng) {
      setMapCenter([flowData.location.lat, flowData.location.lng]);
    }
  }, [flowData.location]);

  function goNext(stepNum: number, data: Partial<FlowData>) {
    setFlowData((prev) => ({ ...prev, ...data }));
    setDirection(1);
    setCurrentStep(stepNum + 1);
  }

  function goBack(stepNum: number) {
    setDirection(-1);
    setCurrentStep(stepNum - 1);
  }

  function restart() {
    setDirection(-1);
    setFlowData({});
    setCurrentStep(1);
    setMapCenter([12.9716, 77.5946]);
  }

  const handleLocationNext = (data: LocationData) => {
    goNext(1, { location: data });
  };

  const handlePropertyTypeNext = (data: PropertyTypeData) => {
    goNext(2, { propertyType: data });
  };

  const handleBudgetAreaNext = (data: BudgetOrAreaData) => {
    goNext(3, { budgetOrArea: data });
  };

  const handleFiltersNext = (data: AdditionalFiltersData) => {
    goNext(4, { filters: data });
  };

  // ── Step 1: Full-screen map layout (identical to Area Intelligence / Sell) ──
  if (currentStep === 1) {
    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100vh",
          overflow: "hidden",
          background: "#0A0F1E",
        }}
      >
        {/* Navbar fixed at top */}
        <div
          style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 30 }}
        >
          <Navbar />
        </div>

        {/* Full-screen map — absolute, fills entire viewport below navbar */}
        <div
          style={{
            position: "absolute",
            top: 64,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
          }}
        >
          <GlobalMapComponent
            mode="valuation"
            city={flowData.location?.city ?? "Bangalore"}
            center={mapCenter}
            height="100%"
            showLayerToggle={false}
            onLocationSelect={(lat, lng, _locName) => {
              setMapCenter([lat, lng]);
            }}
          />
        </div>

        {/* Floating form card — absolute overlay */}
        <div
          ref={cardRef}
          style={{
            position: "absolute",
            top: 80,
            left: 24,
            zIndex: 20,
            width: "100%",
            maxWidth: 420,
            maxHeight: "calc(100vh - 120px)",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "rgba(7,26,47,0.94)",
              border: "1px solid rgba(216,181,106,0.22)",
              borderRadius: 24,
              padding: 24,
              backdropFilter: "blur(24px)",
              boxShadow:
                "0 24px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
            {/* Logo + title */}
            <div className="flex items-center gap-3 mb-5">
              <img
                src="/assets/valubrix-logo.png"
                alt="ValuBrix"
                style={{
                  height: 36,
                  width: "auto",
                  objectFit: "contain",
                  flexShrink: 0,
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    "/assets/uploads/5EB5878E-7937-4598-9486-6156F9B2EB9F-3-1.png";
                }}
              />
              <div>
                <h1
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#F4F7FF",
                    lineHeight: 1.2,
                  }}
                >
                  RealWorth AI
                </h1>
                <p style={{ fontSize: 12, color: "rgba(216,181,106,0.7)" }}>
                  AI Valuation
                </p>
              </div>
            </div>

            {/* Step 1: Location (inline map handled inside LocationStep) */}
            <LocationStep
              onNext={handleLocationNext}
              initialData={flowData.location}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Steps 2-5: BuyerLayout with sidebar ─────────────────────────────────────
  return (
    <BuyerLayout>
      <div className="max-w-2xl mx-auto pb-12">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <img
              src="/assets/valubrix-logo.png"
              alt="ValuBrix"
              style={{
                height: 44,
                width: "auto",
                objectFit: "contain",
                flexShrink: 0,
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div>
              <h1
                className="font-bold leading-tight"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 22,
                  color: "#F4F7FF",
                }}
              >
                RealWorth AI{" "}
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "rgba(216,181,106,0.7)",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  (AI Valuation)
                </span>
              </h1>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(185,198,216,0.6)",
                  marginTop: 2,
                }}
              >
                Precision property intelligence powered by 1,500+ verified
                transactions
              </p>
            </div>
          </div>

          {/* Step progress */}
          <div
            className="mt-6 p-4 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px)",
            }}
          >
            <StepProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />
          </div>
        </div>

        {/* Step content */}
        <div
          className="rounded-2xl p-6 md:p-8"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(20px)",
            boxShadow:
              "0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: "easeInOut" }}
            >
              {/* Step 2: Property Type */}
              {currentStep === 2 && (
                <PropertyTypeStep
                  onNext={handlePropertyTypeNext}
                  onBack={() => goBack(2)}
                  initialData={flowData.propertyType}
                />
              )}

              {/* Step 3: Area + BHK + Area Type */}
              {currentStep === 3 && (
                <BudgetOrAreaStep
                  onNext={handleBudgetAreaNext}
                  onBack={() => goBack(3)}
                  mode="area"
                  initialData={flowData.budgetOrArea}
                  flowMode="valuation"
                />
              )}

              {/* Step 4: Additional Filters */}
              {currentStep === 4 && (
                <AdditionalFiltersStep
                  onNext={handleFiltersNext}
                  onBack={() => goBack(4)}
                  initialData={flowData.filters}
                  locality={flowData.location?.locality ?? ""}
                  requireExtraFields={true}
                  hideAreaFields={true}
                  propertyType={flowData.propertyType?.propertyType}
                />
              )}

              {/* Step 5: Results */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <ResultsStep
                    flowData={flowData}
                    mode="valuation"
                    onBack={() => goBack(5)}
                  />
                  <div
                    className="pt-2 border-t"
                    style={{ borderColor: "rgba(255,255,255,0.08)" }}
                  >
                    <button
                      type="button"
                      onClick={restart}
                      data-ocid="buyer.valuation.restart_button"
                      className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2"
                      style={{
                        background: "rgba(216,181,106,0.1)",
                        border: "1px solid rgba(216,181,106,0.25)",
                        color: "#D8B56A",
                        cursor: "pointer",
                      }}
                    >
                      ✦ Value Another Property
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom context bar */}
        {currentStep < 5 && (
          <div
            className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
              Step {currentStep} of {TOTAL_STEPS}
            </span>
            {flowData.location?.locality && (
              <span style={{ fontSize: 12, color: "rgba(216,181,106,0.6)" }}>
                📍 {flowData.location.locality}
                {flowData.location.city ? `, ${flowData.location.city}` : ""}
              </span>
            )}
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}
