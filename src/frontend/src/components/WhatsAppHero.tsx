import { useState } from "react";
import WhatsAppLeadForm, { type ServiceType } from "./WhatsAppLeadForm";

interface WhatsAppHeroProps {
  serviceType?: ServiceType;
}

export default function WhatsAppHero({
  serviceType = "general",
}: WhatsAppHeroProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <section
        aria-label="ValuBrix — Property Intelligence"
        style={{
          background:
            "linear-gradient(160deg, #0B1120 0%, #0F172A 50%, #0B1120 100%)",
          borderBottom: "1px solid rgba(212,175,55,0.12)",
        }}
        className="relative overflow-hidden"
      >
        {/* Subtle radial glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 70%)",
          }}
        />

        {/* Floating particles (decorative) */}
        {["p0", "p1", "p2", "p3", "p4", "p5"].map((pid, i) => (
          <div
            key={pid}
            aria-hidden="true"
            className="pointer-events-none absolute rounded-full"
            style={{
              width: 3 + (i % 3),
              height: 3 + (i % 3),
              left: `${10 + i * 14}%`,
              top: `${20 + (i % 3) * 20}%`,
              background: i % 2 === 0 ? "#D4AF37" : "#3B82F6",
              opacity: 0.12 + i * 0.03,
              animation: `floatY ${5 + i}s ease-in-out infinite`,
              animationDelay: `${i * 0.8}s`,
            }}
          />
        ))}

        <div className="relative z-10 max-w-4xl mx-auto px-4 py-20 md:py-28 flex flex-col items-center text-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 text-xs font-medium"
            style={{
              background: "rgba(212,175,55,0.08)",
              border: "1px solid rgba(212,175,55,0.22)",
              color: "#D4AF37",
              letterSpacing: "0.06em",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "#D4AF37" }}
            />
            India's AI Property Intelligence Platform
          </div>

          {/* Headline */}
          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-5 max-w-3xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Every Property Decision{" "}
            <span
              className="block"
              style={{
                background: "linear-gradient(90deg, #D4AF37, #F0D080)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Starts With the Right Insight
            </span>
          </h1>

          {/* Subtext */}
          <p
            className="text-base md:text-lg mb-10 max-w-xl"
            style={{ color: "#9CA3AF" }}
          >
            Buy&nbsp;•&nbsp;Sell&nbsp;•&nbsp;Rent&nbsp;•&nbsp;Invest&nbsp;•&nbsp;Interior
            Design &nbsp;—&nbsp;all in one place
          </p>

          {/* CTA button */}
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-3 w-full sm:w-auto sm:min-w-[300px] px-8 py-4 rounded-2xl text-white font-semibold text-base transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] shadow-lg"
            style={{
              background: "#25D366",
              boxShadow: "0 8px 32px rgba(37,211,102,0.3)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "#1DA851";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "#25D366";
            }}
            data-ocid="hero.whatsapp-cta"
          >
            {/* WhatsApp icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="white"
              aria-hidden="true"
              className="flex-shrink-0"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.106.547 4.084 1.505 5.812L0 24l6.335-1.49A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.844 0-3.569-.497-5.054-1.362l-.362-.213-3.76.885.941-3.658-.235-.375A9.818 9.818 0 012.182 12c0-5.41 4.408-9.818 9.818-9.818 5.41 0 9.818 4.408 9.818 9.818 0 5.41-4.408 9.818-9.818 9.818z" />
            </svg>
            Connect with an Expert on WhatsApp
          </button>

          {/* Micro-text */}
          <p className="mt-3 text-xs" style={{ color: "#6B7280" }}>
            Instant response&nbsp;•&nbsp;No spam&nbsp;•&nbsp;100% assistance
          </p>

          {/* Trust row */}
          <div className="flex flex-wrap items-center justify-center gap-5 mt-10">
            {[
              { value: "1500+", label: "Verified Transactions" },
              { value: "4 Cities", label: "Bangalore · Pune · Hyd · Delhi" },
              { value: "AI-Powered", label: "Institutional-Grade AVM" },
            ].map((item) => (
              <div key={item.value} className="flex items-center gap-2 text-sm">
                <span
                  className="font-bold"
                  style={{
                    color: "#D4AF37",
                    fontFamily: "'Playfair Display', serif",
                  }}
                >
                  {item.value}
                </span>
                <span style={{ color: "#4B5563" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <WhatsAppLeadForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        serviceType={serviceType}
      />
    </>
  );
}
