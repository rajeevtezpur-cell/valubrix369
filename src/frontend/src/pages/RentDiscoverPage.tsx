// RentDiscoverPage.tsx — LeaseSmart (Rent) multi-step discover flow
// Fix 2: Pass propertyType and flowMode to BudgetOrAreaStep for monthly INR rent ranges
// Fix 3: Pass hideAreaFields=true to AdditionalFiltersStep (area already in BudgetOrAreaStep)
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Home } from "lucide-react";
import { useState } from "react";
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

const PAGE_TITLE = "LeaseSmart";
const PAGE_SUBTITLE = "Rent";
const ACCENT = "#D8B56A";
const NAVY = "#071A2F";

export default function RentDiscoverPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [flowData, setFlowData] = useState<FlowData>({});

  function handleLocationNext(data: LocationData) {
    setFlowData((prev) => ({ ...prev, location: data }));
    setStep(2);
  }

  function handlePropertyTypeNext(data: PropertyTypeData) {
    setFlowData((prev) => ({ ...prev, propertyType: data }));
    setStep(3);
  }

  function handleBudgetNext(data: BudgetOrAreaData) {
    setFlowData((prev) => ({ ...prev, budgetOrArea: data }));
    setStep(4);
  }

  function handleFiltersNext(data: AdditionalFiltersData) {
    setFlowData((prev) => ({ ...prev, filters: data }));
    setStep(5);
  }

  function handleBack() {
    if (step === 1) {
      void navigate({ to: "/" });
    } else {
      setStep((s) => s - 1);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, #0D2845 50%, #0A2040 100%)`,
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 md:px-8"
        style={{
          background: "rgba(7,26,47,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(216,181,106,0.15)",
        }}
      >
        <button
          type="button"
          onClick={() => void navigate({ to: "/" })}
          className="flex items-center gap-2 transition-opacity duration-200 hover:opacity-70"
          data-ocid="rent_discover.home_link"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <Home size={18} style={{ color: ACCENT }} />
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
            Home
          </span>
        </button>

        <div className="text-center">
          <p
            className="font-bold tracking-wide"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "#F4F7FF",
              fontSize: 17,
            }}
          >
            {PAGE_TITLE}
          </p>
          <p
            style={{
              fontSize: 11,
              color: ACCENT,
              fontWeight: 600,
              letterSpacing: "0.06em",
            }}
          >
            {PAGE_SUBTITLE}
          </p>
        </div>

        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 transition-opacity duration-200 hover:opacity-70"
          data-ocid="rent_discover.back_button"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.5)",
            fontSize: 13,
          }}
        >
          <ArrowLeft size={15} />
          Back
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center px-4 py-6 md:px-8 md:py-10">
        <div className="w-full max-w-xl">
          {/* Step progress */}
          <div
            className="rounded-2xl p-4 mb-6"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <StepProgress currentStep={step} />
          </div>

          {/* Step panel */}
          <div
            className="rounded-3xl p-5 md:p-7"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(216,181,106,0.15)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
            }}
          >
            {step === 1 && (
              <LocationStep
                onNext={handleLocationNext}
                initialData={flowData.location}
              />
            )}
            {step === 2 && (
              <PropertyTypeStep
                onNext={handlePropertyTypeNext}
                onBack={handleBack}
                initialData={flowData.propertyType}
              />
            )}
            {step === 3 && (
              /* Fix 2: Pass propertyType + flowMode="rent" for monthly INR ranges */
              <BudgetOrAreaStep
                mode="budget"
                onNext={handleBudgetNext}
                onBack={handleBack}
                initialData={flowData.budgetOrArea}
                propertyType={flowData.propertyType?.propertyType}
                flowMode="rent"
              />
            )}
            {step === 4 && (
              /* Fix 3: hideAreaFields=true — area type already collected in step 3 */
              <AdditionalFiltersStep
                onNext={handleFiltersNext}
                onBack={handleBack}
                initialData={flowData.filters}
                locality={flowData.location?.locality ?? ""}
                hideAreaFields={true}
                propertyType={flowData.propertyType?.propertyType}
              />
            )}
            {step === 5 && (
              <ResultsStep
                flowData={flowData}
                mode="rent"
                onBack={() => setStep(4)}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
