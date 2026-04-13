// UnifiedMap.tsx — Legacy re-export shim
// The canonical component is now GlobalMapComponent.tsx
// This file maintains backward compatibility for any imports not yet updated.

export {
  default,
  type GlobalMapMode as UnifiedMapMode,
  type GlobalMapProps as UnifiedMapProps,
  type ProjectPin,
} from "./GlobalMapComponent";
