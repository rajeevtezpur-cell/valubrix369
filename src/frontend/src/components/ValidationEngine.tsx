// ValidationEngine.tsx — useValidation hook for step-by-step form validation
// Returns a map of fieldName → errorMessage. Empty map = step is valid.
import type { FlowMode, PropertyFormData } from "./steps/types";
import { showBHKFor, showFloorFor } from "./steps/types";

export type ValidationErrors = Record<string, string>;

/**
 * Validates a single step of the property form.
 * Returns an empty object when all required fields are satisfied.
 */
export function validateStep(
  step: number,
  formData: PropertyFormData,
  mode: FlowMode,
): ValidationErrors {
  const errors: ValidationErrors = {};

  switch (step) {
    case 1: {
      // Step 1 — Location
      if (!formData.location) {
        errors.location = "Please select a location";
      } else {
        if (!formData.location.city?.trim()) {
          errors.location = "Please select a city";
        } else if (!formData.location.locality?.trim()) {
          errors.location = "Please select a locality";
        }
      }
      break;
    }

    case 2: {
      // Step 2 — Property Type
      if (!formData.propertyType) {
        errors.propertyType = "Please select a property type";
      }
      break;
    }

    case 3: {
      // Step 3 — Property Details / Budget
      const isBudgetMode = mode === "buy" || mode === "rent";

      if (isBudgetMode) {
        // Budget mode: require budget selection
        if (!formData.budget || formData.budget === "") {
          errors.budget = "Please select a budget range";
        }
      } else {
        // Area mode (valuation/sell): require area value
        if (!formData.areaValue || Number(formData.areaValue) <= 0) {
          errors.areaValue = "Please enter the property area";
        }
        // Area type required (unless plot which has its own logic)
        if (formData.propertyType !== "plot" && !formData.areaType) {
          errors.areaType = "Please select an area type";
        }
      }
      break;
    }

    case 4: {
      // Step 4 — Additional Filters (floor for apartments in valuation/sell)
      const isBudgetMode = mode === "buy" || mode === "rent";
      if (!isBudgetMode) {
        // For valuation/sell, validate floor for apartment/builder_floor
        if (showFloorFor(formData.propertyType) && !formData.floorRange) {
          // Floor is strongly recommended for accuracy but not blocking
          // Keep as advisory warning — do not block
        }
      }
      // BHK advisory (not blocking)
      void showBHKFor; // used for display logic elsewhere
      break;
    }

    case 5: {
      // Step 5 — Builder/Project: all optional, always valid
      break;
    }

    default:
      break;
  }

  return errors;
}

/**
 * Returns true if all steps up to and including `maxStep` are valid.
 */
export function isFormValid(
  maxStep: number,
  formData: PropertyFormData,
  mode: FlowMode,
): boolean {
  for (let step = 1; step <= maxStep; step++) {
    const errs = validateStep(step, formData, mode);
    if (Object.keys(errs).length > 0) return false;
  }
  return true;
}

/**
 * useValidation hook — provides validateStep and isFormValid for use in React components.
 */
export function useValidation() {
  return { validateStep, isFormValid };
}

export default useValidation;
