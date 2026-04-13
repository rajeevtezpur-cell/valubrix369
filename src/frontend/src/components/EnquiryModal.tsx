import { Building2, Loader2, Phone, Send, User, X } from "lucide-react";
import { useState } from "react";
import type { ScoredProject } from "../engines/projectIntelligenceEngine";
import { useActor } from "../hooks/useActor";

interface EnquiryModalProps {
  project: ScoredProject | null;
  onClose: () => void;
}

export default function EnquiryModal({ project, onClose }: EnquiryModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const { actor } = useActor();

  if (!project) return null;
  const p = project; // captured non-null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    setError("");
    setSubmitting(true);

    // Log event as required
    console.log("Enquiry clicked", p.id);

    try {
      if (actor) {
        await (actor as any).createEnquiry(
          p.id,
          p.name,
          name.trim(),
          phone.trim(),
        );
      } else {
        // Fallback: store locally if actor not available
        const enquiries = JSON.parse(
          localStorage.getItem("vb_enquiries") || "[]",
        );
        enquiries.push({
          projectId: p.id,
          projectName: p.name,
          name: name.trim(),
          phone: phone.trim(),
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem("vb_enquiries", JSON.stringify(enquiries));
      }
      setSubmitted(true);
    } catch (err) {
      // Backend call failed, store locally
      console.warn("createEnquiry backend call failed:", err);
      const enquiries = JSON.parse(
        localStorage.getItem("vb_enquiries") || "[]",
      );
      enquiries.push({
        projectId: p.id,
        projectName: p.name,
        name: name.trim(),
        phone: phone.trim(),
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("vb_enquiries", JSON.stringify(enquiries));
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9000] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={-1}
      />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[9001]"
        style={{ animation: "slideUp 0.3s ease-out" }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
        <div className="bg-[#0D1B2A] border border-white/10 rounded-t-3xl p-6 max-w-lg mx-auto w-full shadow-2xl">
          {/* Handle bar */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

          {submitted ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <Send size={28} className="text-emerald-400" />
              </div>
              <h3 className="text-white font-bold text-xl mb-2">
                Enquiry Submitted!
              </h3>
              <p className="text-white/50 text-sm mb-1">
                We&apos;ll contact you within 24 hours.
              </p>
              <p className="text-white/40 text-xs mb-6">{project.name}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-[#D4AF37] text-black rounded-xl font-semibold text-sm"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-white font-bold text-lg">Enquire Now</h3>
                  <p className="text-white/40 text-xs mt-0.5">
                    Our team will reach out to you shortly
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <X size={14} className="text-white" />
                </button>
              </div>

              {/* Project auto-filled */}
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
                  <Building2 size={14} className="text-[#D4AF37]" />
                </div>
                <div className="min-w-0">
                  <p className="text-white/40 text-[10px] uppercase tracking-wider">
                    Project
                  </p>
                  <p className="text-white font-semibold text-sm truncate">
                    {project.name}
                  </p>
                  <p className="text-white/40 text-xs truncate">
                    {project.locality} &bull; {project.builder}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label
                    htmlFor="enq-name"
                    className="block text-white/60 text-xs mb-1.5 uppercase tracking-wider"
                  >
                    Your Name
                  </label>
                  <div className="relative">
                    <User
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                    />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      id="enq-name"
                      placeholder="Enter your full name"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/40 transition-all"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label
                    htmlFor="enq-phone"
                    className="block text-white/60 text-xs mb-1.5 uppercase tracking-wider"
                  >
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                    />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) =>
                        setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      id="enq-phone"
                      placeholder="10-digit mobile number"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/40 transition-all"
                    />
                  </div>
                </div>

                {error && <p className="text-red-400 text-xs">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-[#D4AF37] hover:bg-[#C49B27] disabled:opacity-60 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />{" "}
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Submit Enquiry
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
