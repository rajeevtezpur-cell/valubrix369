import { useScrollReveal } from "../hooks/useScrollReveal";

const stages = [
  {
    num: "01",
    title: "Discovery",
    desc: "Users discover true property value before buying. Enter a location, get instant AI insights.",
    active: true,
  },
  {
    num: "02",
    title: "Verification",
    desc: "Cross-verify ownership history, legal status, and registration records automatically.",
    active: false,
  },
  {
    num: "03",
    title: "Decision",
    desc: "Armed with complete data, users negotiate, transact, and invest with total confidence.",
    active: false,
  },
];

export default function StageJourney() {
  const ref = useScrollReveal();
  return (
    <section className="py-20 max-w-5xl mx-auto px-4">
      <div ref={ref as React.RefObject<HTMLDivElement>}>
        <div className="text-center mb-14">
          <p className="text-[#C9A84C] text-sm font-semibold uppercase tracking-widest mb-3">
            How It Works
          </p>
          <h2
            className="text-3xl md:text-4xl font-bold text-white"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Your journey with ValuBrix
          </h2>
        </div>
        <div className="relative">
          <div
            className="absolute left-8 top-0 bottom-0 w-0.5 hidden md:block"
            style={{
              background:
                "linear-gradient(to bottom, #C9A84C, rgba(201,168,76,0.1))",
            }}
          />
          <div className="flex flex-col gap-6">
            {stages.map((stage) => (
              <div key={stage.num} className="flex gap-6 items-start">
                <div
                  className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg z-10"
                  style={{
                    background: stage.active
                      ? "linear-gradient(135deg, #C9A84C, #A0832F)"
                      : "rgba(255,255,255,0.05)",
                    color: stage.active ? "#0A0F1E" : "rgba(255,255,255,0.3)",
                    border: stage.active
                      ? "none"
                      : "1px solid rgba(255,255,255,0.08)",
                    fontFamily: "'Playfair Display', serif",
                  }}
                >
                  {stage.num}
                </div>
                <div
                  className="glass-card flex-1 p-6"
                  style={{
                    border: stage.active
                      ? "1px solid rgba(201,168,76,0.3)"
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <h3 className="font-bold text-white text-lg mb-2">
                    {stage.title}
                  </h3>
                  <p className="text-white/55 text-sm leading-relaxed">
                    {stage.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
