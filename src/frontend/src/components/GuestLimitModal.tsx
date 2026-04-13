import { LogIn, X } from "lucide-react";

interface GuestLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GuestLimitModal({
  isOpen,
  onClose,
}: GuestLimitModalProps) {
  if (!isOpen) return null;
  return (
    <dialog
      open
      data-ocid="guest_limit.modal"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 m-0 w-full h-full max-w-none max-h-none border-0"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="glass-card w-full max-w-md p-8 relative"
        style={{ border: "1px solid rgba(201,168,76,0.2)" }}
      >
        <button
          type="button"
          data-ocid="guest_limit.close_button"
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{
            background: "rgba(201,168,76,0.1)",
            border: "1px solid rgba(201,168,76,0.3)",
          }}
        >
          <LogIn size={24} style={{ color: "#C9A84C" }} />
        </div>
        <h2
          className="text-xl font-bold text-white text-center mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Usage Limit Reached
        </h2>
        <p className="text-white/55 text-center text-sm mb-7">
          You&apos;ve used your 3 free lookups. Please login to continue using
          ValuBrix with unlimited access.
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            data-ocid="guest_limit.primary_button"
            className="w-full py-3 rounded-full font-semibold text-sm transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #C9A84C, #A0832F)",
              color: "#0A0F1E",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 0 20px rgba(201,168,76,0.5)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
            }}
          >
            Login to Continue
          </button>
          <button
            type="button"
            className="w-full py-3 rounded-full font-medium text-sm text-white/40 hover:text-white/70 transition-colors"
            onClick={onClose}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </dialog>
  );
}
