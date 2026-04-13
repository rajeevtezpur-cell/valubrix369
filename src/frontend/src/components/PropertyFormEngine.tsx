// PropertyFormEngine.tsx — usePropertyForm hook: orchestrates multi-step form state
// Manages formData, currentStep, errors, isAnalyzing, navigation, and analysis trigger
import { useCallback, useState } from "react";
import { validateStep } from "./ValidationEngine";
import type { FlowMode, PropertyFormData } from "./steps/types";
import { EMPTY_FORM_DATA } from "./steps/types";

const MIN_ANALYSIS_MS = 1500;
const MAX_STEPS = 6;

export interface PropertyFormEngine {
  formData: PropertyFormData;
  currentStep: number;
  errors: Record<string, string>;
  isAnalyzing: boolean;
  goNext: () => boolean;
  goBack: () => void;
  updateForm: (updates: Partial<PropertyFormData>) => void;
  startAnalysis: (onComplete: () => void) => void;
  setStep: (step: number) => void;
  resetForm: () => void;
}

export function usePropertyForm(
  mode: FlowMode,
  initialStep = 1,
  initialData?: Partial<PropertyFormData>,
): PropertyFormEngine {
  const [formData, setFormData] = useState<PropertyFormData>({
    ...EMPTY_FORM_DATA,
    ...initialData,
  });
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  /**
   * Validate current step. If valid, advance to next step.
   * Returns true if navigation succeeded (step was valid).
   */
  const goNext = useCallback((): boolean => {
    const stepErrors = validateStep(currentStep, formData, mode);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return false;
    }
    setErrors({});
    if (currentStep < MAX_STEPS) {
      setCurrentStep((s) => s + 1);
    } else {
      // Last step — trigger analysis
      setIsAnalyzing(true);
    }
    return true;
  }, [currentStep, formData, mode]);

  /**
   * Go back one step (no validation required).
   */
  const goBack = useCallback((): void => {
    setErrors({});
    setCurrentStep((s) => Math.max(1, s - 1));
  }, []);

  /**
   * Merge partial updates into formData.
   * Also clears errors for any updated fields.
   */
  const updateForm = useCallback((updates: Partial<PropertyFormData>): void => {
    setFormData((prev) => ({ ...prev, ...updates }));
    // Clear errors for updated fields
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(updates)) {
        delete next[key];
      }
      return next;
    });
  }, []);

  /**
   * Start the AI analysis overlay.
   * Sets isAnalyzing=true immediately. Calls onComplete after MIN_ANALYSIS_MS.
   * The parent can call onComplete sooner if data is ready — the overlay component
   * itself enforces the minimum display duration.
   */
  const startAnalysis = useCallback((onComplete: () => void): void => {
    setIsAnalyzing(true);
    const timer = setTimeout(() => {
      setIsAnalyzing(false);
      onComplete();
    }, MIN_ANALYSIS_MS);
    // Return cleanup (not directly possible from hook, but timer ref would be needed
    // for strict cleanup — for this MVP pattern, we accept the timer leaking on unmount)
    void timer;
  }, []);

  /**
   * Jump directly to a specific step (e.g., for edit flows).
   */
  const setStep = useCallback((step: number): void => {
    setCurrentStep(Math.max(1, Math.min(MAX_STEPS, step)));
    setErrors({});
  }, []);

  /**
   * Reset the form to initial state.
   */
  const resetForm = useCallback((): void => {
    setFormData({ ...EMPTY_FORM_DATA, ...initialData });
    setCurrentStep(initialStep);
    setErrors({});
    setIsAnalyzing(false);
  }, [initialData, initialStep]);

  return {
    formData,
    currentStep,
    errors,
    isAnalyzing,
    goNext,
    goBack,
    updateForm,
    startAnalysis,
    setStep,
    resetForm,
  };
}

export default usePropertyForm;
