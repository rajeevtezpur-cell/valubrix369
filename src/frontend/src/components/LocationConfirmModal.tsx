/**
 * LocationConfirmModal.tsx
 *
 * Shown after a map pin drop. Displays detected location and lets user
 * confirm or switch to manual entry.
 */
import { Check, MapPin, Navigation, X } from "lucide-react";
import type { ReverseGeocodeResult } from "../utils/localReverseGeocode";

interface LocationConfirmModalProps {
  result: ReverseGeocodeResult;
  onConfirm: (result: ReverseGeocodeResult) => void;
  onChange: () => void;
  onClose: () => void;
}

const hoverBlue = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.opacity = "0.88";
};
const resetOpacity = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.opacity = "1";
};
const hoverGlass = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = "rgba(255,255,255,0.10)";
};
const resetGlass = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
};
const hoverCloseIcon = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.color = "#fff";
};
const resetCloseIcon = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.color = "rgba(255,255,255,0.35)";
};

export default function LocationConfirmModal({
  result,
  onConfirm,
  onChange,
  onClose,
}: LocationConfirmModalProps) {
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: overlay dismiss via keyboard is handled by close button
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      data-ocid="location_confirm.overlay"
      onClick={onClose}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation */}
      <div
        style={{
          background: "rgba(10,15,30,0.98)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 20,
          padding: 28,
          maxWidth: 400,
          width: "100%",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
        data-ocid="location_confirm.modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 8,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{ color: "rgba(255,255,255,0.35)", lineHeight: 1 }}
            onMouseEnter={hoverCloseIcon}
            onMouseLeave={resetCloseIcon}
            data-ocid="location_confirm.close_button"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(212,175,55,0.15)",
                border: "1px solid rgba(212,175,55,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Navigation size={16} style={{ color: "#D4AF37" }} />
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              Detected Location
            </span>
          </div>

          {/* Location display */}
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <MapPin
                size={16}
                style={{ color: "#60a5fa", flexShrink: 0, marginTop: 1 }}
              />
              <div>
                <p
                  style={{
                    color: "#FFFFFF",
                    fontSize: 15,
                    fontWeight: 700,
                    marginBottom: 3,
                  }}
                >
                  {result.locality}
                  {result.isApproximate && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "1px 7px",
                        borderRadius: 99,
                        background: "rgba(251,191,36,0.15)",
                        border: "1px solid rgba(251,191,36,0.35)",
                        color: "#fbbf24",
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.05em",
                      }}
                    >
                      approx
                    </span>
                  )}
                </p>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                  {result.parentArea || result.zone
                    ? `${result.parentArea || result.zone} Bangalore`
                    : "Bangalore"}
                  {result.pincode ? ` \u2022 ${result.pincode}` : ""}
                </p>
                {result.isApproximate && (
                  <p
                    style={{
                      color: "rgba(251,191,36,0.7)",
                      fontSize: 11,
                      marginTop: 4,
                    }}
                  >
                    Pin is near border \u2014 verify before confirming
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Coordinates */}
          <p
            style={{
              color: "rgba(255,255,255,0.25)",
              fontSize: 11,
              marginTop: 8,
            }}
          >
            {result.lat.toFixed(5)}, {result.lng.toFixed(5)}
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => onConfirm(result)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              padding: "12px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%)",
              border: "none",
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={hoverBlue}
            onMouseLeave={resetOpacity}
            data-ocid="location_confirm.confirm_button"
          >
            <Check size={15} />
            Confirm
          </button>

          <button
            type="button"
            onClick={onChange}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              padding: "12px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.8)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={hoverGlass}
            onMouseLeave={resetGlass}
            data-ocid="location_confirm.change_button"
          >
            Change
          </button>
        </div>
      </div>
    </div>
  );
}
