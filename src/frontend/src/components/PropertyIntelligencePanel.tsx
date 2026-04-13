import { useAuth } from "../context/AuthContext";
import { useScrollReveal } from "../hooks/useScrollReveal";

const pills = [
  { label: "Scale of Project", value: "Large", color: "#16C784", delay: "0s" },
  {
    label: "Carpet Area Efficiency",
    value: "High",
    color: "#16C784",
    delay: "0.4s",
  },
  {
    label: "Investment Potential",
    value: "Medium",
    color: "#F59E0B",
    delay: "0.8s",
  },
  {
    label: "Clubhouse Size",
    value: "50K Sqft",
    color: "#16C784",
    delay: "1.2s",
  },
  { label: "Vastu Compliance", value: "50%", color: "#F59E0B", delay: "0.2s" },
  {
    label: "Metro Connectivity",
    value: "5 Km",
    color: "#F59E0B",
    delay: "0.6s",
  },
];

function GuestBlur({ children }: { children: React.ReactNode }) {
  const { user, openLoginModal } = useAuth();
  if (user) return <>{children}</>;
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div
        style={{
          filter: "blur(8px)",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => openLoginModal()}
        data-ocid="intelligence.lock.button"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(10,15,30,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          borderRadius: 8,
          color: "white",
          fontSize: 11,
          fontWeight: 600,
          textAlign: "center",
          padding: 4,
          border: "none",
          backdropFilter: "blur(4px)",
        }}
      >
        🔒 Login to unlock
      </button>
    </div>
  );
}

export default function PropertyIntelligencePanel() {
  const ref = useScrollReveal();
  return (
    <section className="py-20 max-w-6xl mx-auto px-4">
      <div ref={ref as React.RefObject<HTMLDivElement>}>
        <div className="text-center mb-12">
          <p className="text-[#C9A84C] text-sm font-semibold uppercase tracking-widest mb-3">
            Intelligence Layer
          </p>
          <h2
            className="text-3xl md:text-4xl font-bold text-white"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Property Intelligence Signals
          </h2>
          <p className="text-white/50 mt-3 max-w-xl mx-auto">
            Real-time AI signals that tell you exactly what a property is worth
            — and why.
          </p>
        </div>
        <div
          className="relative rounded-[24px] overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #0D1628 0%, #0A1020 40%, #081018 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 20px 80px rgba(0,0,0,0.5)",
            minHeight: 320,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 30% 60%, rgba(59,130,246,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 30%, rgba(22,199,132,0.06) 0%, transparent 50%)",
            }}
          />
          <div className="relative z-10 p-8 md:p-12">
            <div className="flex items-center gap-3 mb-8">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  background: "#16C784",
                  boxShadow: "0 0 8px rgba(22,199,132,0.8)",
                  animation: "pulse-ring 2s ease-out infinite",
                }}
              />
              <span className="text-white/50 text-sm">
                Live Analysis Active
              </span>
            </div>
            <div className="flex flex-wrap gap-4">
              {pills.map((pill) => (
                <div
                  key={pill.label}
                  className="flex items-center gap-3 rounded-full px-5 py-3"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    backdropFilter: "blur(12px)",
                    border: `1px solid ${pill.color}30`,
                    animation: `float-pill 4s ease-in-out ${pill.delay} infinite`,
                  }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      background: pill.color,
                      boxShadow: `0 0 6px ${pill.color}`,
                    }}
                  />
                  <span className="text-white/70 text-sm">{pill.label}:</span>
                  <span
                    className="font-semibold text-sm"
                    style={{ color: pill.color }}
                  >
                    {pill.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4">
              {(
                [
                  "Confidence Score",
                  "Data Points Used",
                  "Last Updated",
                ] as const
              ).map((label, i) => (
                <div key={label} className="text-center">
                  <GuestBlur>
                    <div
                      className="text-2xl font-bold"
                      style={{
                        color: "#C9A84C",
                        fontFamily: "'Playfair Display', serif",
                      }}
                    >
                      {i === 0 ? "94%" : i === 1 ? "2,847" : "Now"}
                    </div>
                  </GuestBlur>
                  <div className="text-white/40 text-xs mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
