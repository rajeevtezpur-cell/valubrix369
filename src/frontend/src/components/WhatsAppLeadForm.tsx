import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

export type ServiceType =
  | "buy"
  | "sell"
  | "rent"
  | "investment"
  | "interior"
  | "general";

interface WhatsAppLeadFormProps {
  isOpen: boolean;
  onClose: () => void;
  serviceType?: ServiceType;
}

const SERVICE_LABELS: Record<ServiceType, string> = {
  buy: "Buy Property",
  sell: "Sell Property",
  rent: "Rent Property",
  investment: "Investment",
  interior: "Interior Design",
  general: "General Enquiry",
};

const WA_NUMBER = "917259416508";

const INPUT_STYLE = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
} as const;

const INPUT_FOCUS = "rgba(212,175,55,0.5)";
const INPUT_BLUR = "rgba(255,255,255,0.08)";
const INPUT_ERROR = "rgba(239,68,68,0.6)";

function saveLead(lead: Record<string, string | boolean>) {
  try {
    const existing = JSON.parse(localStorage.getItem("valubrix_leads") || "[]");
    existing.push({ ...lead, created_at: new Date().toISOString() });
    localStorage.setItem("valubrix_leads", JSON.stringify(existing));
  } catch {
    /* silent */
  }
}

function InputField({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-white/60 mb-1"
      >
        {label}{" "}
        {required ? (
          <span style={{ color: "#D4AF37" }}>*</span>
        ) : (
          <span className="text-white/30 font-normal">(optional)</span>
        )}
      </label>
      {children}
      {error && (
        <p className="text-xs mt-1" style={{ color: "#EF4444" }}>
          {error}
        </p>
      )}
    </div>
  );
}

export default function WhatsAppLeadForm({
  isOpen,
  onClose,
  serviceType = "general",
}: WhatsAppLeadFormProps) {
  const { user } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    location: "",
    email: "",
    budget: "",
    message: "",
    priority_callback: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: user.fullName || prev.name,
        email: user.email || prev.email,
        phone: user.mobile || prev.phone,
      }));
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function validate() {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!form.phone.trim()) next.phone = "Phone is required";
    else if (!/^\d{10}$/.test(form.phone.replace(/\s/g, "")))
      next.phone = "Enter a valid 10-digit mobile number";
    if (!form.location.trim()) next.location = "Location is required";
    return next;
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function setBorderFocus(el: HTMLElement) {
    el.style.borderColor = INPUT_FOCUS;
  }
  function setBorderBlur(el: HTMLElement, hasError: boolean) {
    el.style.borderColor = hasError ? INPUT_ERROR : INPUT_BLUR;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);

    saveLead({
      name: form.name,
      phone: form.phone,
      location: form.location,
      email: form.email,
      budget: form.budget,
      message: form.message,
      service_type: serviceType,
      priority_callback: form.priority_callback,
    });

    const serviceLabel = SERVICE_LABELS[serviceType];
    const lines = [
      `Hi, I'm interested in *${serviceLabel}*`,
      "",
      `Name: ${form.name}`,
      `Location: ${form.location}`,
      `Phone: +91 ${form.phone}`,
      form.email ? `Email: ${form.email}` : null,
      form.budget ? `Budget: ${form.budget}` : null,
      form.message ? `\nMessage: ${form.message}` : null,
      form.priority_callback ? "\n⚡ Priority Callback Requested" : null,
    ].filter(Boolean);

    const encoded = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/${WA_NUMBER}?text=${encoded}`, "_blank");
    setSubmitting(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === "Enter" || e.key === " ")
        )
          onClose();
      }}
    >
      <dialog
        ref={dialogRef}
        open
        aria-modal="true"
        aria-label="Connect via WhatsApp"
        className="relative w-full max-w-md rounded-2xl border overflow-hidden m-0 p-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(17,24,39,0.98) 0%, rgba(15,23,42,0.98) 100%)",
          borderColor: "rgba(212,175,55,0.25)",
          boxShadow:
            "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.08)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(37,211,102,0.15)" }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="#25D366"
                aria-hidden="true"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.106.547 4.084 1.505 5.812L0 24l6.335-1.49A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.844 0-3.569-.497-5.054-1.362l-.362-.213-3.76.885.941-3.658-.235-.375A9.818 9.818 0 012.182 12c0-5.41 4.408-9.818 9.818-9.818 5.41 0 9.818 4.408 9.818 9.818 0 5.41-4.408 9.818-9.818 9.818z" />
              </svg>
            </span>
            <div>
              <p
                className="text-sm font-semibold text-white"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Talk to an Expert
              </p>
              <p className="text-xs" style={{ color: "#6B7280" }}>
                {SERVICE_LABELS[serviceType]}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.06)" }}
            aria-label="Close"
            data-ocid="wa-lead-form.close"
          >
            <X size={14} className="text-white/60" />
          </button>
        </div>

        {/* Form body */}
        <form
          onSubmit={handleSubmit}
          className="px-5 py-5 space-y-3.5"
          noValidate
        >
          <InputField
            id="wa-name"
            label="Full Name"
            required
            error={errors.name}
          >
            <input
              id="wa-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your name"
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-colors"
              style={{
                ...INPUT_STYLE,
                borderColor: errors.name ? INPUT_ERROR : INPUT_BLUR,
              }}
              onFocus={(e) => setBorderFocus(e.currentTarget)}
              onBlur={(e) => setBorderBlur(e.currentTarget, !!errors.name)}
              data-ocid="wa-lead-form.name"
            />
          </InputField>

          <InputField id="wa-phone" label="Phone" required error={errors.phone}>
            <div className="flex gap-2">
              <span
                className="flex items-center px-3 rounded-lg text-sm text-white/50 flex-shrink-0"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                🇮🇳 +91
              </span>
              <input
                id="wa-phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="10-digit mobile"
                inputMode="numeric"
                maxLength={10}
                className="flex-1 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-colors"
                style={{
                  ...INPUT_STYLE,
                  borderColor: errors.phone ? INPUT_ERROR : INPUT_BLUR,
                }}
                onFocus={(e) => setBorderFocus(e.currentTarget)}
                onBlur={(e) => setBorderBlur(e.currentTarget, !!errors.phone)}
                data-ocid="wa-lead-form.phone"
              />
            </div>
          </InputField>

          <InputField
            id="wa-location"
            label="Location"
            required
            error={errors.location}
          >
            <input
              id="wa-location"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Area / city you're interested in"
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-colors"
              style={{
                ...INPUT_STYLE,
                borderColor: errors.location ? INPUT_ERROR : INPUT_BLUR,
              }}
              onFocus={(e) => setBorderFocus(e.currentTarget)}
              onBlur={(e) => setBorderBlur(e.currentTarget, !!errors.location)}
              data-ocid="wa-lead-form.location"
            />
          </InputField>

          <div className="grid grid-cols-2 gap-3">
            <InputField id="wa-email" label="Email">
              <input
                id="wa-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@email.com"
                className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-colors"
                style={{ ...INPUT_STYLE }}
                onFocus={(e) => setBorderFocus(e.currentTarget)}
                onBlur={(e) => setBorderBlur(e.currentTarget, false)}
                data-ocid="wa-lead-form.email"
              />
            </InputField>
            <InputField id="wa-budget" label="Budget">
              <input
                id="wa-budget"
                name="budget"
                value={form.budget}
                onChange={handleChange}
                placeholder="e.g. ₹80L – 1.2 Cr"
                className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-colors"
                style={{ ...INPUT_STYLE }}
                onFocus={(e) => setBorderFocus(e.currentTarget)}
                onBlur={(e) => setBorderBlur(e.currentTarget, false)}
                data-ocid="wa-lead-form.budget"
              />
            </InputField>
          </div>

          {/* Service type display */}
          <div>
            <p className="block text-xs font-medium text-white/60 mb-1">
              Service
            </p>
            <div
              className="w-full rounded-lg px-3 py-2.5 text-sm flex items-center gap-2"
              style={{
                background: "rgba(212,175,55,0.06)",
                border: "1px solid rgba(212,175,55,0.2)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: "#D4AF37" }}
              />
              <span style={{ color: "#D4AF37" }}>
                {SERVICE_LABELS[serviceType]}
              </span>
            </div>
          </div>

          <InputField id="wa-message" label="Message">
            <textarea
              id="wa-message"
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Any specific requirements or questions..."
              rows={2}
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-colors resize-none"
              style={{ ...INPUT_STYLE }}
              onFocus={(e) => setBorderFocus(e.currentTarget)}
              onBlur={(e) => setBorderBlur(e.currentTarget, false)}
              data-ocid="wa-lead-form.message"
            />
          </InputField>

          {/* Priority toggle */}
          <button
            type="button"
            onClick={() =>
              setForm((p) => ({
                ...p,
                priority_callback: !p.priority_callback,
              }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                setForm((p) => ({
                  ...p,
                  priority_callback: !p.priority_callback,
                }));
            }}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors text-left"
            style={{
              background: form.priority_callback
                ? "rgba(212,175,55,0.08)"
                : "rgba(255,255,255,0.03)",
              border: form.priority_callback
                ? "1px solid rgba(212,175,55,0.3)"
                : "1px solid rgba(255,255,255,0.07)",
            }}
            data-ocid="wa-lead-form.priority-toggle"
          >
            <span
              className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors"
              style={{
                background: form.priority_callback ? "#D4AF37" : "transparent",
                borderColor: form.priority_callback
                  ? "#D4AF37"
                  : "rgba(255,255,255,0.25)",
              }}
            >
              {form.priority_callback && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 5l2.5 2.5L8 3"
                    stroke="#0F172A"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span className="text-xs text-white/70">
              ⚡ Request Expert Callback —{" "}
              <span style={{ color: "#D4AF37" }}>mark as priority</span>
            </span>
          </button>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold text-white transition-all duration-200"
            style={{ background: "#25D366", opacity: submitting ? 0.8 : 1 }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "#1DA851";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "#25D366";
            }}
            data-ocid="wa-lead-form.submit"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="white"
              aria-hidden="true"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.106.547 4.084 1.505 5.812L0 24l6.335-1.49A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.844 0-3.569-.497-5.054-1.362l-.362-.213-3.76.885.941-3.658-.235-.375A9.818 9.818 0 012.182 12c0-5.41 4.408-9.818 9.818-9.818 5.41 0 9.818 4.408 9.818 9.818 0 5.41-4.408 9.818-9.818 9.818z" />
            </svg>
            {submitting ? "Sending…" : "Send via WhatsApp"}
          </button>
        </form>
      </dialog>
    </div>
  );
}
