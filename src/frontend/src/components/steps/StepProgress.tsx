// StepProgress.tsx — Step indicator for all discover flows
import { Check } from "lucide-react";
import { STEP_NAMES, type StepName } from "./types";

interface StepProgressProps {
  currentStep: number; // 1-based
  totalSteps?: number;
}

export default function StepProgress({
  currentStep,
  totalSteps = 5,
}: StepProgressProps) {
  const steps = STEP_NAMES.slice(0, totalSteps);

  return (
    <div className="w-full" data-ocid="step_progress">
      {/* Mobile: compact progress bar */}
      <div className="flex items-center gap-1.5 mb-2 md:hidden">
        {steps.map((name, idx) => {
          const stepNum = idx + 1;
          const isComplete = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          return (
            <div
              key={name}
              className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{
                background: isComplete
                  ? "#D8B56A"
                  : isCurrent
                    ? "rgba(216,181,106,0.5)"
                    : "rgba(255,255,255,0.1)",
              }}
            />
          );
        })}
      </div>

      {/* Mobile: label */}
      <div className="flex justify-between items-center mb-1 md:hidden">
        <span style={{ color: "#D8B56A", fontSize: 12, fontWeight: 700 }}>
          Step {currentStep} of {totalSteps}
        </span>
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
          {steps[currentStep - 1]}
        </span>
      </div>

      {/* Desktop: full step row */}
      <div className="hidden md:flex items-center gap-0">
        {steps.map((name: StepName, idx: number) => {
          const stepNum = idx + 1;
          const isComplete = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          const isLast = idx === steps.length - 1;

          return (
            <div
              key={name}
              className="flex items-center flex-1 min-w-0"
              data-ocid={`step_progress.step.${stepNum}`}
            >
              {/* Step node */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    background: isComplete
                      ? "#D8B56A"
                      : isCurrent
                        ? "rgba(216,181,106,0.15)"
                        : "rgba(255,255,255,0.06)",
                    border: isCurrent
                      ? "2px solid #D8B56A"
                      : isComplete
                        ? "2px solid #D8B56A"
                        : "2px solid rgba(255,255,255,0.12)",
                    boxShadow: isCurrent
                      ? "0 0 14px rgba(216,181,106,0.35)"
                      : "none",
                  }}
                >
                  {isComplete ? (
                    <Check
                      size={14}
                      style={{ color: "#071A2F", strokeWidth: 3 }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: isCurrent ? "#D8B56A" : "rgba(255,255,255,0.3)",
                      }}
                    >
                      {stepNum}
                    </span>
                  )}
                </div>
                <span
                  className="mt-1 text-center whitespace-nowrap"
                  style={{
                    fontSize: 10,
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent
                      ? "#D8B56A"
                      : isComplete
                        ? "rgba(216,181,106,0.6)"
                        : "rgba(255,255,255,0.3)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {name}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className="flex-1 h-px mx-2 transition-all duration-300"
                  style={{
                    background: isComplete
                      ? "linear-gradient(90deg,#D8B56A,rgba(216,181,106,0.3))"
                      : "rgba(255,255,255,0.08)",
                    marginBottom: 18, // align with node center (node + label offset)
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
